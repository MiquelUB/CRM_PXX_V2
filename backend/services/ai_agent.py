import os
import json
import httpx
from sqlalchemy.orm import selectinload, joinedload
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, List, Any

from models import Deal, Interaccio, GlobalKnowledge, CalendariEvent, EstatDeal

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

def get_system_prompt_template() -> str:
    """Carrega el contingut del prompt original a partir dels fitxers disponibles."""
    path_relative = os.path.join(os.path.dirname(os.path.dirname(__file__)), "KIMI_K2_SYSTEM_PROMPT.md")
    path_root = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "KIMI_K2_SYSTEM_PROMPT.md")
    
    for path in [path_relative, path_root]:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
                
    raise FileNotFoundError("No s'ha trobat el fitxer KIMI_K2_SYSTEM_PROMPT.md en cap dels camins possibles.")

async def build_deal_context_stateless(session: AsyncSession, deal_id: int) -> str:
    # TTL: Només agafem l'agenda dels pròxims 60 dies per no saturar el context
    limit_date = datetime.now(timezone.utc) + timedelta(days=60)
    
    # TTL Context: Només interaccions dels últims 90 dies i límit de 20
    tres_mesos_enrere = datetime.now(timezone.utc) - timedelta(days=90)
    
    stmt = select(Deal).where(Deal.id == deal_id).options(
        joinedload(Deal.municipi),
        selectinload(Deal.contactes),
        selectinload(Deal.accions.and_(Interaccio.data >= tres_mesos_enrere)),
        selectinload(Deal.calendari_events.and_(CalendariEvent.data_inici <= limit_date))
    )
    res = await session.execute(stmt)
    deal = res.scalar_one_or_none()
    if not deal: return "Deal no trobat."

    # Variables individuals
    nom = deal.municipi.nom if deal.municipi else "Desconegut"
    poblacio = str(deal.municipi.poblacio) if (deal.municipi and deal.municipi.poblacio is not None) else "Desconeguda"
    etapa_actual = deal.estat_kanban.value if deal.estat_kanban else "Nou"
    
    # Heurística de temperatura basada en l'etapa Kanban
    if deal.estat_kanban == EstatDeal.NOU:
        temperatura = "Baixa"
    elif deal.estat_kanban in (EstatDeal.CONTACTAT, EstatDeal.DEMO):
        temperatura = "Mitjana"
    elif deal.estat_kanban == EstatDeal.PROPOSTA:
        temperatura = "Alta"
    elif deal.estat_kanban == EstatDeal.TANCAT:
        temperatura = "Tancat"
    else:
        temperatura = "Mitjana"
        
    angle_personalitzacio = deal.municipality_context or "Cap angle especificat."
    
    # Format d'Actors OSINT (Contactes)
    actors_list = []
    for contact in deal.contactes:
        carrec_str = f" ({contact.carrec})" if contact.carrec else ""
        tel_str = f", Tel: {contact.telefon}" if contact.telefon else ""
        actors_list.append(f"{contact.nom}{carrec_str}, Email: {contact.email}{tel_str}")
    actors = "\n  ".join(actors_list) if actors_list else "Cap contacte registrat."
    
    # --- DIARI D'ABORD: Historial complet i estructurat ---
    all_actions = sorted(
        [a for a in deal.accions if a.tipus != "kimi_chat"],
        key=lambda x: x.data
    )[-50:]  # Últimes 50 interaccions (augmentat des de 20)

    # Categoritzem per tipus
    notes_operador = []
    correus = []
    logs_sistema = []

    for i in all_actions:
        meta = i.metadata_json or {}
        autor = meta.get("autor", "Sistema")
        data_str = i.data.strftime('%d/%m/%Y %H:%M')
        tipus_lower = (i.tipus or "").lower()

        if tipus_lower in ("nota_manual", "nota"):
            # Notes manuals: contingut COMPLET, sense truncar
            notes_operador.append(f"[{data_str}] ({autor}): {i.contingut}")
        elif tipus_lower in ("email", "email_in", "email_out"):
            # Correus: contingut COMPLET
            direccio = "REBUT" if tipus_lower == "email_in" else "ENVIAT" if tipus_lower == "email_out" else "EMAIL"
            assumpte = meta.get("assumpte", meta.get("subject", ""))
            prefix = f"{direccio}" + (f" — {assumpte}" if assumpte else "")
            correus.append(f"[{data_str}] {prefix}: {i.contingut}")
        else:
            # Logs de sistema i altres: resum breu acceptable
            logs_sistema.append(f"[{data_str}] {i.tipus}: {i.contingut[:250]}")

    # Construïm el bloc estructurat
    diari_lines = []
    if notes_operador:
        diari_lines.append("  --- Notes de l'Operador ---")
        diari_lines.extend(f"  {n}" for n in notes_operador)
    if correus:
        diari_lines.append("  --- Correus ---")
        diari_lines.extend(f"  {c}" for c in correus)
    if logs_sistema:
        diari_lines.append("  --- Accions del Sistema ---")
        diari_lines.extend(f"  {l}" for l in logs_sistema)

    diari_abord = "\n".join(diari_lines) if diari_lines else "  Cap interacció registrada al Diari d'Abord."

    # Deal actiu amb l'agenda i data actual
    now_local = datetime.now(timezone.utc) + timedelta(hours=2) # CEST local simplificat
    calendar_lines = [
        f"{'TASCA' if ev.es_tasca else 'EVENT'}: {ev.descripcio} ({ev.data_inici.strftime('%d/%m %H:%M')})"
        for ev in deal.calendari_events if not ev.completat
    ]
    agenda_pendent = ", ".join(calendar_lines) if calendar_lines else "Cap."
    
    deal_str = (
        f"ID: {deal.id}, Pla SaaS: {deal.pla_saas}, "
        f"Data Creació: {deal.data_creacio.strftime('%d/%m/%Y')}, "
        f"Proper pas: {deal.proper_pas or 'Cap'}, "
        f"Agenda pendent: {agenda_pendent}, "
        f"DATA ACTUAL LOCAL (Europe/Madrid): {now_local.strftime('%Y-%m-%dT%H:%M:%S+02:00')}"
    )

    context = (
        f"<CONTEXT_MUNICIPAL>\n"
        f"  Municipi: {nom}\n"
        f"  Població: {poblacio}\n"
        f"  Etapa Funnel: {etapa_actual}\n"
        f"  Temperatura: {temperatura}\n"
        f"  Angle Personalització: {angle_personalitzacio}\n"
        f"  Actors OSINT: {actors}\n"
        f"  Deal actiu: {deal_str}\n"
        f"</CONTEXT_MUNICIPAL>\n\n"
        f"<DIARI_ABORD>\n"
        f"{diari_abord}\n"
        f"</DIARI_ABORD>"
    )
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
    try:
        template = get_system_prompt_template()
    except FileNotFoundError as e:
        return {"response": f"⚠️ Error de configuració de l'agent: {str(e)}", "tool_action": None}

    # Neteja de les barres d'escapament de markdown del template (p. ex: \<CONTEXT\_MUNICIPAL\> -> <CONTEXT_MUNICIPAL>)
    clean_template = template.replace("\\<", "<").replace("\\>", ">").replace("\\_", "_")

    # Obtenir el coneixement global (pxx_general) de la base de dades i injectar-lo
    global_knowledge_block = ""
    try:
        stmt = select(GlobalKnowledge).where(GlobalKnowledge.key == "pxx_general")
        res = await session.execute(stmt)
        gk = res.scalar_one_or_none()
        if gk and gk.content:
            global_knowledge_block = (
                f"\n\n# **BLOC 0B — Argumentari de Vendes i Coneixement Global (pxx_general)**\n\n"
                f"<CONEIXEMENT_GLOBAL>\n"
                f"{gk.content.strip()}\n"
                f"</CONEIXEMENT_GLOBAL>\n"
            )
    except Exception as e:
        print(f"[AI_AGENT] Error loading global knowledge: {e}")

    if global_knowledge_block:
        if "# **BLOC 1" in clean_template:
            parts = clean_template.split("# **BLOC 1", 1)
            clean_template = parts[0] + global_knowledge_block + "# **BLOC 1" + parts[1]
        else:
            clean_template = clean_template + "\n" + global_knowledge_block

    # Generació del context municipal actualitzat
    context_block = await build_deal_context_stateless(session, deal_id)
    if context_block.startswith("Deal no trobat"):
        return {"response": "⚠️ Deal no trobat.", "tool_action": None}

    # Reemplaçament del bloc del context al prompt del sistema, preservant el final
    if "<CONTEXT_MUNICIPAL>" in clean_template and "</CONTEXT_MUNICIPAL>" in clean_template:
        parts_prefix = clean_template.split("<CONTEXT_MUNICIPAL>", 1)
        prefix = parts_prefix[0]
        suffix = parts_prefix[1].split("</CONTEXT_MUNICIPAL>", 1)[1]
        system_prompt = prefix + context_block + suffix
    elif "<CONTEXT_MUNICIPAL>" in clean_template:
        system_prompt = clean_template.split("<CONTEXT_MUNICIPAL>")[0] + context_block
    else:
        system_prompt = clean_template + "\n\n" + context_block

    chat_history = await get_chat_history(session, deal_id)

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
