import os
import httpx
from sqlalchemy.orm import selectinload
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import Deal, Interaccio

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

async def get_deal_history_context(session: AsyncSession, deal_id: int) -> str:
    """Recupera tota la cronologia del Deal per construir el context del LLM."""
    statement = (
        select(Deal)
        .where(Deal.id == deal_id)
        .options(selectinload(Deal.interaccions))
    )
    result = await session.execute(statement)
    deal = result.scalar_one_or_none()
    
    if not deal:
        return "No s'ha trobat informació per a aquest Deal."

    history = sorted(deal.interaccions, key=lambda x: x.data)
    context_lines = [f"CONTEXT DEL DEAL: {deal.titol} (Estat: {deal.estat})"]
    for i in history:
        date_str = i.data.strftime("%Y-%m-%d %H:%M")
        context_lines.append(f"[{date_str}] {i.autor or 'Sistema'}: {i.tipus} - {i.contingut}")
    
    return "\n".join(context_lines)

async def ask_kimi_k2(session: AsyncSession, deal_id: int, user_query: str):
    """Intermediari amb OpenRouter utilitzant moonshotai/kimi-k2.5."""
    history_context = await get_deal_history_context(session, deal_id)
    
    system_prompt = (
        "Ets Kimi k2.5, l'agent IA especialitzat del CRM PXX v2. "
        "La teva missió és ajudar a gestionar el Deal basant-te EXCLUSIVAMENT en l'historial proporcionat.\n\n"
        f"{history_context}"
    )

    payload = {
        "model": "moonshotai/kimi-k2.5",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_query}
        ]
    }

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(OPENROUTER_URL, json=payload, headers=headers, timeout=30.0)
            response.raise_for_status()
            return response.json()['choices'][0]['message']['content']
        except Exception as e:
            return f"Error Agent IA: {str(e)}"
