import os
import json
import httpx
from sqlalchemy.orm import selectinload, joinedload
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from typing import Optional, Dict, List, Any

from models import Deal, Interaccio, GlobalKnowledge

# --- INFRAESTRUCTURA OPENROUTER (STATELESS) ---

async def call_openrouter_stateless(messages: List[Dict[str, str]]) -> Optional[Dict]:
    """
    Comunicació asíncrona amb OpenRouter.
    """
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return {"error": "OPENROUTER_API_KEY no configurada."}

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "moonshotai/kimi-k2.5",
        "messages": messages,
        "temperature": 0.2, # Baixem temperatura per a anàlisi i estructures rígides
        "response_format": {"type": "text"}
    }

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
    """
    statement = (
        select(Deal)
        .where(Deal.id == deal_id)
        .options(
            joinedload(Deal.municipi),
            selectinload(Deal.accions)
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

    # Historial
    history = sorted(deal.accions, key=lambda x: x.data)
    history_lines = [f"[{i.data.strftime('%Y-%m-%d %H:%M')}] {i.tipus}: {i.contingut}" for i in history]
    
    m_name = deal.municipi.nom if deal.municipi else "Municipi desconegut"
    local_info = deal.municipality_context or "Sense context local."

    return f"""MUNICIPI: {m_name}
ESTAT KANBAN: {deal.estat_kanban}
CONTEXT LOCAL: {local_info}
ARGUMENTARI PRODUCTE: {global_content}
HISTORIAL:
{chr(10).join(history_lines)}"""

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
        # Neteja de markdown si l'IA s'ha passat de llesta
        json_fix = raw_content.replace("```json", "").replace("```", "").strip()
        data_analista = json.loads(json_fix)
    except Exception:
        return "ERROR: Fallada en el parseig de dades del Deal (Fase 1)."

    # CONTROL D'ERRORS (MANDAT DE FERRO)
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
Però m’ha saltat l’alarma.
Tota aquesta inversió depèn d’un mapa de Silicon Valley.
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

# --- INTERFÍCIE PER AL FRONTEND ---

async def ask_kimi_v4(session: AsyncSession, deal_id: int, task_type: str, user_query: Optional[str] = None):
    """
    Mantingut per a consultes genèriques o per invocar el pipeline de correus.
    """
    if task_type == 'conversion_email':
        return await generate_outbound_email(session, deal_id, task_type)
    
    # Per a altres consultes, mantenim un flux simple
    context = await build_deal_context_stateless(session, deal_id)
    messages = [
        {"role": "system", "content": f"Ets Kimi, agent IA del CRM PXX. Context:\n{context}"},
        {"role": "user", "content": user_query or "Analitza el deal."}
    ]
    res = await call_openrouter_stateless(messages)
    return res.get("choices", [{}])[0].get("message", {}).get("content", "Error en la consulta.")
