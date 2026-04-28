import os
import json
import httpx
from sqlalchemy.orm import selectinload, joinedload
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, List, Any

from models import Deal, Interaccio, GlobalKnowledge, CalendariEvent

# --- DEFINICIÓ DE TOOLS PER AL LLM (Function Calling) ---

AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "gestionar_agenda",
            "description": (
                "Utilitza aquesta eina SEMPRE que l'usuari vulgui programar, agendar, "
                "recordar, o planificar qualsevol acció futura relacionada amb el deal. "
                "Crea una tasca al checklist o un esdeveniment al calendari."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "titol": {
                        "type": "string",
                        "description": "L'acció concreta (ex: 'Trucar per confirmar pressupost')"
                    },
                    "data_inici": {
                        "type": "string",
                        "format": "date-time",
                        "description": "ISO 8601 (ex: '2026-05-06T10:00:00+02:00'). Usa offset +02:00."
                    },
                    "es_tasca": {
                        "type": "boolean",
                        "description": "True per a Checklist, False per a Calendari (reunions)."
                    },
                    "tipus": {
                        "type": "string",
                        "enum": ["seguiment", "demo", "reunio", "renovacio", "general"],
                        "description": "Categoria de l'esdeveniment."
                    }
                },
                "required": ["titol", "data_inici", "es_tasca", "tipus"]
            }
        }
    }
]

# --- INFRAESTRUCTURA OPENROUTER ---

async def call_openrouter_stateless(messages: List[Dict[str, Any]], tools: Optional[List[Dict]] = None) -> Optional[Dict]:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key: return {"error": "OPENROUTER_API_KEY no configurada."}

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": "moonshotai/kimi-k2.5",
        "messages": messages,
        "temperature": 0.2,
        "tools": tools,
        "tool_choice": "auto" if tools else None
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"error": str(e)}

# --- LOGICA DE NEGOCI (CONTEXT + TOOLS) ---

async def build_deal_context_stateless(session: AsyncSession, deal_id: int) -> str:
    # TTL: Només agafem l'agenda dels pròxims 60 dies per no saturar el context
    limit_date = datetime.now(timezone.utc) + timedelta(days=60)
    
    stmt = select(Deal).where(Deal.id == deal_id).options(
        joinedload(Deal.municipi),
        selectinload(Deal.accions),
        selectinload(Deal.calendari_events).where(CalendariEvent.data_inici <= limit_date)
    )
    res = await session.execute(stmt)
    deal = res.scalar_one_or_none()
    if not deal: return "Deal no trobat."

    # Historial i Agenda
    history = sorted([a for a in deal.accions if a.tipus != "kimi_chat"], key=lambda x: x.data)
    history_lines = [f"[{i.data.strftime('%d/%m %H:%M')}] {i.tipus}: {i.contingut[:100]}" for i in history[-10:]]
    
    calendar_lines = [
        f"- {'TASCA' if ev.es_tasca else 'EVENT'}: {ev.descripcio} ({ev.data_inici.strftime('%d/%m %H:%M')})"
        for ev in deal.calendari_events if not ev.completat
    ]

    context = f"REALITAT DEL DEAL (ID: {deal.id} - {deal.municipi.nom if deal.municipi else 'Desconegut'}):\n"
    context += f"- Proper pas actual: {deal.proper_pas or 'Cap'}\n"
    context += "AGENDA PENDENT (PRÒXIMS 60 DIES):\n" + ("\n".join(calendar_lines) if calendar_lines else "Cap.") + "\n\n"
    context += "HISTÒRIAL RECENT:\n" + ("\n".join(history_lines) if history_lines else "Cap.") + "\n\n"
    
    # Timezone Injection: Ajudem l'IA a entendre que som a Espanya (CEST/CET)
    now_local = datetime.now(timezone.utc) + timedelta(hours=2) # Simplificació per a CEST
    context += f"DATA ACTUAL LOCAL (Europe/Madrid): {now_local.strftime('%Y-%m-%dT%H:%M:%S+02:00')}"
    return context

async def processar_tool_call_agent(session: AsyncSession, deal_id: int, args: Dict[str, Any]) -> Dict[str, Any]:
    try:
        titol = args.get("titol")
        data_str = args.get("data_inici")
        es_tasca = args.get("es_tasca", False)
        tipus = args.get("tipus", "seguiment")
        
        # Parseig segur amb timezone awareness
        dt = datetime.fromisoformat(data_str.replace("Z", "+00:00"))

        # IDEMPOTÈNCIA ROBUSTA (Time Window matching):
        # Ignorem el títol (que pot variar segons l'IA) i mirem deal_id + tipus + finestra de +/- 1h
        f_inici = dt - timedelta(hours=1)
        f_fi = dt + timedelta(hours=1)
        
        dup_stmt = select(CalendariEvent).where(
            CalendariEvent.deal_id == deal_id,
            CalendariEvent.tipus == tipus,
            CalendariEvent.data_inici >= f_inici,
            CalendariEvent.data_inici <= f_fi,
            CalendariEvent.completat == False
        )
        if (await session.execute(dup_stmt)).scalar_one_or_none():
            print(f"[TOOL_CALL] Idempotency HIT for Deal {deal_id}, Type {tipus}")
            return {"status": "success", "message": "Aquesta acció ja està agendada per a aquesta hora (idempotència)."}

        # Actualitzem Deal (ACID)
        res = await session.execute(select(Deal).where(Deal.id == deal_id))
        deal = res.scalar_one_or_none()
        deal.proper_pas = titol
        deal.data_seguiment = dt
        
        # Creem Event
        nou = CalendariEvent(
            deal_id=deal_id, municipi_id=deal.municipi_id,
            tipus=tipus, descripcio=titol, data_inici=dt,
            data_fi=dt + timedelta(minutes=30), es_tasca=es_tasca, completat=False
        )
        session.add(nou)
        await session.commit()
        print(f"[TOOL_CALL] Success: Deal {deal_id}, Task: {titol}, Start: {dt}")
        return {"status": "success", "message": f"Agendat correctament: {titol} ({dt.strftime('%d/%m %H:%M')})"}
    except Exception as e:
        await session.rollback()
        print(f"[TOOL_CALL] ERROR: {str(e)}")
        return {"status": "error", "message": str(e)}

# --- INTERACT PERSISTENT ---

async def interact_with_kimi_persistent(session: AsyncSession, deal_id: int, user_query: str) -> Dict[str, Any]:
    context = await build_deal_context_stateless(session, deal_id)
    chat_history = await get_chat_history(session, deal_id)

    system_prompt = (
        "Ets Kimi, assistent B2G de PXX. "
        "Usa SEMPRE 'gestionar_agenda' per a accions futures. "
        "IMPORTANT: Estem a Espanya (Europe/Madrid). Si l'usuari diu 'demà', calcula la data "
        "respecte a la DATA ACTUAL LOCAL proporcionada. Retorna dates amb offset +02:00. "
        f"\nCONTEXT:\n{context}"
    )

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(chat_history)
    messages.append({"role": "user", "content": user_query})

    res = await call_openrouter_stateless(messages, tools=AGENT_TOOLS)
    if "error" in res: return {"response": res["error"], "tool_action": None}

    choice = res["choices"][0]
    message = choice["message"]
    
    if choice.get("finish_reason") == "tool_calls" or message.get("tool_calls"):
        tool_results = []
        for tc in message.get("tool_calls", []):
            if tc["function"]["name"] == "gestionar_agenda":
                args = json.loads(tc["function"]["arguments"])
                result = await processar_tool_call_agent(session, deal_id, args)
                tool_results.append(result)
        
        # Feedback loop d'errors: Si el tool falla, informem a Kimi
        if tool_results and tool_results[0].get("status") == "error":
            kimi_res = f"⚠️ Ho sento, he tingut un error al guardar l'agenda: {tool_results[0]['message']}"
            tool_action = "agenda_error"
        else:
            kimi_res = f"✅ {tool_results[0]['message']}" if tool_results else "⚠️ No s'ha pogut processar."
            tool_action = "agenda_created"

        await save_kimi_interaction(session, deal_id, "user", user_query)
        await save_kimi_interaction(session, deal_id, "assistant", kimi_res)
        return {"response": kimi_res, "tool_action": tool_action}

    kimi_res = message.get("content", "Error en la comunicació.")
    await save_kimi_interaction(session, deal_id, "user", user_query)
    await save_kimi_interaction(session, deal_id, "assistant", kimi_res)
    return {"response": kimi_res, "tool_action": None}

async def get_chat_history(session: AsyncSession, deal_id: int) -> List[Dict]:
    stmt = select(Interaccio).where(Interaccio.deal_id == deal_id, Interaccio.tipus == "kimi_chat").order_by(Interaccio.data.asc())
    res = await session.execute(stmt)
    return [{"role": i.metadata_json.get("role", "assistant"), "content": i.contingut} for i in res.scalars().all()]

async def save_kimi_interaction(session: AsyncSession, deal_id: int, role: str, content: str):
    session.add(Interaccio(deal_id=deal_id, tipus="kimi_chat", contingut=content, metadata_json={"role": role}, data=datetime.now(timezone.utc)))
    await session.commit()
