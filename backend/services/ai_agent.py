import os
import json
import httpx
from sqlalchemy.orm import selectinload, joinedload
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from typing import Optional, Dict, List

from models import Deal, Interaccio, GlobalKnowledge

# --- CONFIGURACIÓ OPENROUTER (STATELESS) ---

async def call_openrouter_stateless(messages: List[Dict[str, str]], tools: Optional[List] = None) -> Optional[Dict]:
    """
    Execució asíncrona utilitzant httpx directament per a OpenRouter.
    Arquitectura Stateless: l'array de missatges s'instancia i es destrueix a la crida.
    """
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return {"error": "OPENROUTER_API_KEY no configurada."}

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "https://crm-pxx-v2.com", # Opcional per a OpenRouter
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "moonshotai/kimi-k2.5",
        "messages": messages,
        "temperature": 0.3
    }
    
    if tools:
        payload["tools"] = tools

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"error": f"Error de connexió OpenRouter: {str(e)}"}

# --- GESTIÓ DE CONTEXT (RECONSTRUCCIÓ A CADA CRIDA) ---

async def build_deal_context_stateless(session: AsyncSession, deal_id: int) -> str:
    """
    Reconstrueix tota la realitat del Deal des de la DB.
    Prohibit l'ús de fitxers temporals (.md).
    """
    # 1. Recuperar dades mestres i historial
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
    
    if not deal:
        return "ERROR: Deal no trobat."

    # 2. Recuperar Argumentari Global
    global_stmt = select(GlobalKnowledge).where(GlobalKnowledge.key == "pxx_general")
    global_res = await session.execute(global_stmt)
    global_obj = global_res.scalar_one_or_none()
    global_content = global_obj.content if global_obj else "Sense argumentari global."

    # 3. Processar Historial (Interaccions)
    history = sorted(deal.accions, key=lambda x: x.data)
    history_lines = []
    for i in history:
        date_str = i.data.strftime("%Y-%m-%d %H:%M")
        history_lines.append(f"[{date_str}] {i.tipus}: {i.contingut}")
    
    history_str = "\n".join(history_lines) if history_lines else "Sense historial previ."
    m_name = deal.municipi.nom if deal.municipi else "Municipi desconegut"
    local_info = deal.municipality_context or "Sense context local."

    return f"""MUNICIPI: {m_name}
ESTAT KANBAN: {deal.estat_kanban}

--- ARGUMENTARI GLOBAL ---
{global_content}

--- CONTEXT LOCAL (MUNICIPALITY_CONTEXT) ---
{local_info}

--- CRONOLOGIA D'INTERACCIONS (MEMÒRIA DB) ---
{history_str}"""

# --- PROMPT ROUTER V4 ---

async def ask_kimi_v4(session: AsyncSession, deal_id: int, task_type: str, user_query: Optional[str] = None):
    """
    Router d'instruccions Mañez-Atòmic amb arquitectura Stateless.
    """
    # 1. Reconstruir context (L'única realitat)
    deal_context = await build_deal_context_stateless(session, deal_id)
    
    # 2. Definició de Core System Prompt
    core_system = f"""Ets Kimi, agent estratègic de vendes B2G. REGLES: 
1. L'única realitat és l'etiqueta <CONTEXT_DEL_DEAL>. Prohibit creuar dades. 
2. Mai inventis dates, dades o notícies. Si et falta informació a l'historial, respon: 'ERROR: Necessito més informació'. 
3. To analític per ús intern, estil estricte per sortida al client. 

<CONTEXT_DEL_DEAL>
{deal_context} 
</CONTEXT_DEL_DEAL>"""

    # 3. Diccionari de Tasques V4
    tasks = {
        'conversion_email': (
            "TASCA: Redacta email per a Demo de 10 min. "
            "CONDICIÓ: Cerca notícia recent al context, si no n'hi ha, atura't. "
            "DIRECTIVA MAÑEZ-ATÒMIC: Salutació informal. Cada frase un punt i a part (zero paràgrafs junts). "
            "Màxim 10 paraules/frase. Zero emojis. Prohibit: 'plataforma', 'solució'. "
            "Obligatori: 'Mira', 'Error', 'Control', 'Soberania'. "
            "ESTRUCTURA: Ganxo -> Ferida (Control Silicon Valley) -> Canvi -> CTA explícit a Demo de 10 min."
        ),
        'trust_email': (
            "TASCA: Redacta correu d'empatia territorial. OBJECTIU: Confiança comentant última notícia. ZERO VENDA. "
            "APLICA MAÑEZ-ATÒMIC: Màxim 10 paraules/frase, cada frase en línia nova, zero emojis. "
            "ESTRUCTURA: Obertura amb la notícia -> Valoració empàtica -> Comiat proper."
        ),
        'call_script': (
            "TASCA: Guió de trucada cold-calling B2G. FORMAT: Telegràfic. "
            "ESTRUCTURA: 1. Trencagel (sobre última interacció). 2. Pregunta validació (sobirania dades). "
            "3. Objeccions (les 2 més probables amb resposta de 2 línies). 4. Tancament (agendar demo)."
        ),
        'general_query': user_query or "Analitza el context i resumeix l'estat del deal."
    }

    if task_type not in tasks:
        return f"ERROR: Tipus de tasca '{task_type}' no reconegut."

    # 4. Instanciació local de missatges (Isolation)
    prompt_tasca = tasks[task_type]
    messages = [
        {"role": "system", "content": core_system},
        {"role": "user", "content": f"{prompt_tasca}\n\nREQUERIMENT ADDICIONAL: {user_query}" if user_query and task_type != 'general_query' else prompt_tasca}
    ]

    # 5. Execució
    response_data = await call_openrouter_stateless(messages)
    
    if "error" in response_data:
        return response_data["error"]
        
    try:
        return response_data["choices"][0]["message"]["content"]
    except (KeyError, IndexError):
        return "ERROR: Resposta inesperada d'OpenRouter."

# --- LEGACY WRAPPER (Per compatibilitat mentre es refactoritza el frontend) ---

async def ask_kimi_k2(session: AsyncSession, deal_id: int, user_query: str):
    """Wrapper per redirigir crides genèriques al nou router V4."""
    return await ask_kimi_v4(session, deal_id, 'general_query', user_query)
