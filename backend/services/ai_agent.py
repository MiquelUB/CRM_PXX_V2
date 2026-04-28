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
            "name": "actualitzar_deal_i_calendari",
            "description": (
                "Utilitza aquesta eina SEMPRE que l'usuari vulgui programar, agendar, "
                "recordar, o planificar qualsevol acció futura relacionada amb el deal. "
                "Actualitza el proper pas del deal i, opcionalment, crea un esdeveniment formal al calendari."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "proper_pas": {
                        "type": "string",
                        "description": "L'acció concreta a realitzar (ex: 'Trucar per confirmar pressupost')"
                    },
                    "data_seguiment": {
                        "type": "string",
                        "format": "date-time",
                        "description": (
                            "Data i hora en format ISO 8601 estricte (ex: '2026-05-06T10:00:00Z'). "
                            "Calcula la data relativa a la data actual que se t'ha proporcionat al context."
                        )
                    },
                    "crear_esdeveniment": {
                        "type": "boolean",
                        "description": "True si cal agendar-ho formalment al calendari"
                    },
                    "tipus_esdeveniment": {
                        "type": "string",
                        "enum": ["seguiment", "demo", "reunio", "renovacio", "general"],
                        "description": "Obligatori si crear_esdeveniment és True"
                    }
                },
                "required": ["proper_pas", "data_seguiment", "crear_esdeveniment"]
            }
        }
    }
]

# --- INFRAESTRUCTURA OPENROUTER (STATELESS) ---

async def call_openrouter_stateless(
    messages: List[Dict[str, Any]],
    tools: Optional[List[Dict]] = None
) -> Optional[Dict]:
    """
    Comunicació asíncrona amb OpenRouter.
    Si s'especifiquen tools, el LLM pot retornar un tool_call en lloc de text.
    """
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return {"error": "OPENROUTER_API_KEY no configurada."}

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload: Dict[str, Any] = {
        "model": "moonshotai/kimi-k2.5",
        "messages": messages,
        "temperature": 0.2,
    }

    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = "auto"  # El LLM decideix si usar la tool o respondre en text
    else:
        payload["response_format"] = {"type": "text"}

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"error": f"Error de connexió OpenRouter: {str(e)}"}

# --- CONTEXT RECONSTRUCTION ---

async def build_deal_context_stateless(session: AsyncSession, deal_id: int) -> str:
    """
    Reconstrueix la realitat del Deal des de la DB.
    Inclou el calendari existent per evitar que l'agent programi reunions duplicades.
    """
    statement = (
        select(Deal)
        .where(Deal.id == deal_id)
        .options(
            joinedload(Deal.municipi),
            selectinload(Deal.accions),
            selectinload(Deal.calendari_events)
        )
    )
    result = await session.execute(statement)
    deal = result.scalar_one_or_none()

    if not deal: return "ERROR: Deal no trobat."

    # Argumentari Global
    global_stmt = select(GlobalKnowledge).where(GlobalKnowledge.key == "pxx_general")
    global_res = await session.execute(global_stmt)
    global_obj = global_res.scalar_one_or_none()
    global_content = global_obj.content if global_obj else ""

    # Historial d'interaccions (excloem kimi_chat per no contaminar el context)
    history = sorted(
        [a for a in deal.accions if a.tipus != "kimi_chat"],
        key=lambda x: x.data
    )
    history_lines = [f"[{i.data.strftime('%Y-%m-%d %H:%M')}] {i.tipus}: {i.contingut}" for i in history]

    # Calendari existent (per evitar duplicats)
    calendar_lines = []
    for ev in deal.calendari_events:
        if not ev.completat:
            calendar_lines.append(
                f"[{ev.data_inici.strftime('%Y-%m-%d %H:%M')}] {ev.tipus}: {ev.descripcio}"
            )

    m_name = deal.municipi.nom if deal.municipi else "Municipi desconegut"
    local_info = deal.municipality_context or "Sense context local."
    proper_pas_actual = deal.proper_pas or "Sense definir"
    data_seg = deal.data_seguiment.strftime('%Y-%m-%d') if deal.data_seguiment else "Sense data"

    # Injecció de data/hora actual del servidor per al càlcul de dates relatives
    now_iso = datetime.now(timezone.utc).isoformat()

    return f"""DATA I HORA ACTUAL DEL SERVIDOR: {now_iso}
MUNICIPI: {m_name}
ESTAT KANBAN: {deal.estat_kanban}
PROPER PAS ACTUAL: {proper_pas_actual} (data límit: {data_seg})
CONTEXT LOCAL: {local_info}
ARGUMENTARI PRODUCTE: {global_content}
HISTORIAL D'INTERACCIONS:
{chr(10).join(history_lines) if history_lines else "(Sense historial)"}
CALENDARI D'EVENTS ACTIUS:
{chr(10).join(calendar_lines) if calendar_lines else "(Cap event al calendari)"}"""

# --- CONTROLADOR DEL TOOL CALL (ACID) ---

async def processar_tool_call_agent(
    session: AsyncSession,
    deal_id: int,
    tool_args: dict
) -> Dict[str, Any]:
    """
    Processa els arguments del tool_call de l'agent:
    1. Valida i parseja data_seguiment (protecció contra alucinacions del LLM).
    2. Actualitza Deal.proper_pas i Deal.data_seguiment.
    3. Crea CalendariEvent si s'ha sol·licitat.
    Tot en una transacció ACID: rollback complet si qualsevol pas falla.
    """
    # 1. Validació i parseig segur de la data (protecció contra LLM hallucinations)
    data_seguiment_parsed: Optional[datetime] = None
    data_seguiment_raw = tool_args.get("data_seguiment")

    if data_seguiment_raw:
        formats_a_provar = [
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%dT%H:%M:%S%z",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d",
        ]
        for fmt in formats_a_provar:
            try:
                parsed = datetime.strptime(data_seguiment_raw.replace("+00:00", "Z"), fmt)
                # Assegurem que té timezone UTC
                if parsed.tzinfo is None:
                    parsed = parsed.replace(tzinfo=timezone.utc)
                data_seguiment_parsed = parsed
                break
            except (ValueError, AttributeError):
                continue

        if not data_seguiment_parsed:
            # Fallback segur: demà a les 10:00
            data_seguiment_parsed = datetime.now(timezone.utc).replace(
                hour=10, minute=0, second=0, microsecond=0
            ) + timedelta(days=1)

    proper_pas = tool_args.get("proper_pas", "Seguiment pendent")
    crear_esdeveniment = tool_args.get("crear_esdeveniment", False)
    tipus_esdeveniment = tool_args.get("tipus_esdeveniment", "seguiment")

    # 2. Transacció ACID
    try:
        # Obtenir el Deal
        stmt = select(Deal).where(Deal.id == deal_id)
        res = await session.execute(stmt)
        deal = res.scalar_one_or_none()
        if not deal:
            return {"status": "error", "message": f"Deal {deal_id} no trobat."}

        # UPDATE Deal
        deal.proper_pas = proper_pas
        deal.data_seguiment = data_seguiment_parsed
        session.add(deal)

        # INSERT CalendariEvent si es demana
        event_creat = False
        if crear_esdeveniment and data_seguiment_parsed:
            # data_fi = data_inici + 30 minuts per defecte
            data_fi = data_seguiment_parsed + timedelta(minutes=30)

            nou_event = CalendariEvent(
                deal_id=deal.id,
                municipi_id=deal.municipi_id,
                data_inici=data_seguiment_parsed,
                data_fi=data_fi,
                tipus=tipus_esdeveniment,
                descripcio=proper_pas,
                completat=False
            )
            session.add(nou_event)
            event_creat = True

        # Commit transaccional (ambdós o cap)
        await session.commit()
        await session.refresh(deal)

        missatge = f"Proper pas actualitzat: '{proper_pas}'"
        if event_creat:
            missatge += f" | Event de {tipus_esdeveniment} creat per al {data_seguiment_parsed.strftime('%d/%m/%Y %H:%M')}."

        return {"status": "success", "message": missatge, "event_creat": event_creat}

    except Exception as e:
        await session.rollback()
        return {"status": "error", "message": f"Error ACID durant la persistència: {str(e)}"}

# --- MULTI-AGENT PIPELINE (V4) ---

async def generate_outbound_email(session: AsyncSession, deal_id: int, task_type: str = "conversion_email"):
    """
    Pipeline Multi-Agent Supervisor-Worker per a redacció de correus B2G.
    """
    # 1. Reconstrucció de Context
    deal_context = await build_deal_context_stateless(session, deal_id)
    if deal_context.startswith("ERROR"): return deal_context

    # --- FASE 1: ORQUESTRADOR / ANALISTA ---
    messages_fase1 = [
        {
            "role": "system",
            "content": "Ets un analista de dades B2G. Llegeix l'historial i extreu els fets. Retorna EXCLUSIVAMENT un objecte JSON vàlid sense markdown extra."
        },
        {
            "role": "user",
            "content": f"<CONTEXT_DEL_DEAL>\n {deal_context} \n</CONTEXT_DEL_DEAL>\n\n TASCA: Extreu: 1. 'nom_contacte', 2. 'ganxo_noticia_recent' (Si no hi ha cap nota d'actualitat a l'historial, posa null), 3. 'accio_solicitada' ('Demo de 10 minuts')."
        }
    ]

    res1 = await call_openrouter_stateless(messages_fase1)
    if "error" in res1: return res1["error"]

    try:
        raw_content = res1["choices"][0]["message"]["content"]
        json_fix = raw_content.replace("```json", "").replace("```", "").strip()
        data_analista = json.loads(json_fix)
    except Exception:
        return "ERROR: Fallada en el parseig de dades del Deal (Fase 1)."

    if not data_analista.get("ganxo_noticia_recent"):
        return "ERROR: No puc redactar l'email. Falta afegir una nota amb una notícia recent del municipi a l'historial."

    # --- FASE 2: WORKER / COPYWRITER (THE HUNTER) ---
    copywriter_system = """Ets un copywriter B2G radical. Converteix les dades JSON en un email d'impacte aplicant aquestes regles ESTRICTES:
1. LLEI DEL BUIDE: Cada frase en una línia nova. Zero paràgrafs.
2. LLEI DE L'ÀTOM: Màxim 10 paraules per línia.
3. CENSURA: Prohibit usar 'plataforma', 'digitalització', 'app', 'solució'.
4. TUTEJA: Tracta de 'tu', zero formalitats.
5. FORMAT: Acaba sempre amb 'Fem una demo de 10 minuts i t'ho ensenyo?' i 'Una abraçada,'."""

    copywriter_user = f"""DADES: {json.dumps(data_analista)}

EXEMPLE DE FORMAT A IMITAR:
Hola Mireia,
Mira.
Vaig estar fa uns dies a Àger.
Però avui llegia al Segre que esteu movent els fons PSTD.
Enhorabona.
Però m'ha saltat l'alarma.
Tota aquesta inversió depèn d'un mapa de Silicon Valley.
Si Google no carrega, el vostre relat no existeix.
ERROR.
Esteu pagant per perdre el control.
He pensat una manera perquè la Col·legiata sigui realment vostra.
Al mòbil. Sense dependre de cobertura.
Fem una demo de 10 minuts i t'ho ensenyo?
Una abraçada,

Ara redacta el teu seguint EXACTAMENT aquest format visual i estructura."""

    messages_fase2 = [
        {"role": "system", "content": copywriter_system},
        {"role": "user", "content": copywriter_user}
    ]

    res2 = await call_openrouter_stateless(messages_fase2)
    if "error" in res2: return res2["error"]

    try:
        return res2["choices"][0]["message"]["content"]
    except (KeyError, IndexError):
        return "ERROR: L'agent de redacció ha fallat."

# --- PERSISTÈNCIA I HISTORIAL ---

async def get_chat_history(session: AsyncSession, deal_id: int, limit: int = 20) -> List[Dict[str, str]]:
    """
    Recupera l'historial de xat persistent exclusiu per a aquest deal.
    """
    statement = (
        select(Interaccio)
        .where(Interaccio.deal_id == deal_id, Interaccio.tipus == "kimi_chat")
        .order_by(Interaccio.data.asc())
    )
    result = await session.execute(statement)
    interactions = result.scalars().all()

    messages = []
    for i in interactions:
        role = i.metadata_json.get("role", "assistant") if i.metadata_json else "assistant"
        messages.append({"role": role, "content": i.contingut})

    return messages[-limit:]

async def save_kimi_interaction(session: AsyncSession, deal_id: int, role: str, content: str):
    """
    Guarda un missatge del xat a la taula d'interaccions.
    """
    interaccio = Interaccio(
        deal_id=deal_id,
        tipus="kimi_chat",
        contingut=content,
        metadata_json={"role": role, "creat_per": "Kimi Agent" if role == "assistant" else "Usuari"},
        is_completed=True
    )
    session.add(interaccio)
    await session.commit()

# --- INTERFÍCIE PER AL FRONTEND (PERSISTENT + FUNCTION CALLING) ---

async def interact_with_kimi_persistent(
    session: AsyncSession,
    deal_id: int,
    user_query: str
) -> Dict[str, Any]:
    """
    Flux principal de xat persistent amb suport de Function Calling.
    1. Recupera context complet del deal (incl. calendari i data actual).
    2. Recupera historial de xat.
    3. Envia missatge al LLM amb les tools disponibles.
    4. Si el LLM retorna un tool_call → executa processar_tool_call_agent (ACID).
    5. Guarda interacció i retorna resposta estructurada al frontend.
    """
    # Context base del Deal (inclou data actual del servidor)
    context = await build_deal_context_stateless(session, deal_id)
    if context.startswith("ERROR"):
        return {"response": context, "tool_action": None}

    # Historial de xat previ
    chat_history = await get_chat_history(session, deal_id)

    # System Prompt amb instruccions de Function Calling
    system_prompt = (
        "Ets Kimi, l'assistent estratègic B2G de PXX. "
        "El teu objectiu és ajudar a tancar aquest deal amb èxit. "
        "Sigues directe, analític i segueix la Directiva Mañez-Atòmic: frases curtes, sense paraules buides. "
        "IMPORTANT: Quan l'usuari vulgui programar o agendar qualsevol acció futura, "
        "SEMPRE utilitza l'eina 'actualitzar_deal_i_calendari'. No descriguis l'acció en text: executa-la. "
        f"\nCONTEXT ACTUAL DEL DEAL:\n{context}"
    )

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(chat_history)
    messages.append({"role": "user", "content": user_query})

    # Trucada a OpenRouter amb tools habilitades
    res = await call_openrouter_stateless(messages, tools=AGENT_TOOLS)
    if "error" in res:
        return {"response": res["error"], "tool_action": None}

    choice = res.get("choices", [{}])[0]
    message = choice.get("message", {})
    finish_reason = choice.get("finish_reason", "stop")

    # --- DETECCIÓ I EXECUCIÓ DEL TOOL CALL ---
    if finish_reason == "tool_calls" or message.get("tool_calls"):
        tool_calls = message.get("tool_calls", [])
        tool_results = []

        for tc in tool_calls:
            if tc.get("function", {}).get("name") == "actualitzar_deal_i_calendari":
                try:
                    tool_args = json.loads(tc["function"]["arguments"])
                except json.JSONDecodeError:
                    tool_args = {}

                result = await processar_tool_call_agent(session, deal_id, tool_args)
                tool_results.append(result)

        # Construïm resposta llegible per a l'usuari
        if tool_results and tool_results[0].get("status") == "success":
            kimi_response = f"✅ {tool_results[0]['message']}"
            tool_action = "agenda_created"
        else:
            err_msg = tool_results[0].get("message", "Error desconegut") if tool_results else "Cap tool executada"
            kimi_response = f"⚠️ No he pogut persistir l'acció: {err_msg}"
            tool_action = "agenda_error"

        # Persistim la interacció del tool_call
        await save_kimi_interaction(session, deal_id, "user", user_query)
        await save_kimi_interaction(session, deal_id, "assistant", kimi_response)

        return {"response": kimi_response, "tool_action": tool_action}

    # --- RESPOSTA DE TEXT NORMAL ---
    kimi_response = message.get("content", "Error en la resposta de Kimi.")

    await save_kimi_interaction(session, deal_id, "user", user_query)
    await save_kimi_interaction(session, deal_id, "assistant", kimi_response)

    return {"response": kimi_response, "tool_action": None}


async def ask_kimi_v4(session: AsyncSession, deal_id: int, task_type: str, user_query: Optional[str] = None):
    """
    Router mantenit per compatibilitat.
    """
    if task_type == 'conversion_email':
        return await generate_outbound_email(session, deal_id, task_type)

    return await interact_with_kimi_persistent(session, deal_id, user_query or "Analitza el deal.")
