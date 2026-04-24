import os
import json
from openai import AsyncOpenAI
from sqlalchemy.orm import selectinload, joinedload
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from ..models import Deal, Interaccio, Esdeveniment

# Configuració d'OpenRouter via SDK d'OpenAI
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY
)

async def get_deal_history_context(session: AsyncSession, deal_id: int) -> str:
    """Recupera tota la cronologia del Deal per construir el context del LLM."""
    statement = (
        select(Deal)
        .where(Deal.id == deal_id)
        .options(
            joinedload(Deal.municipi),
            selectinload(Deal.interaccions)
        )
    )
    result = await session.execute(statement)
    deal = result.scalar_one_or_none()
    
    if not deal:
        return "No s'ha trobat informació per a aquest Deal."

    # Ordenar per la nova data_creacio
    history = sorted(deal.interaccions, key=lambda x: x.data_creacio)
    # Ara el títol real és el nom del municipi
    context_lines = [f"CONTEXT DEL DEAL: {deal.municipi.nom} (Estat: {deal.estat})"]
    for i in history:
        date_str = i.data_creacio.strftime("%Y-%m-%d %H:%M")
        context_lines.append(f"[{date_str}]: {i.tipus} - {i.contingut}")
    
    return "\n".join(context_lines)

async def crear_esdeveniment_calendari(session: AsyncSession, deal_id: int, titol: str, data_hora: str):
    """Inserta un esdeveniment real a la base de dades."""
    try:
        data_dt = datetime.fromisoformat(data_hora.replace("Z", "+00:00"))
        nou_event = Esdeveniment(
            deal_id=deal_id,
            titol=titol,
            data_hora=data_dt,
            creat_per_ia=True
        )
        session.add(nou_event)
        await session.commit()
        return f"Fet! Esdeveniment '{titol}' creat per al {data_hora}."
    except Exception as e:
        return f"Error al crear esdeveniment: {str(e)}"

async def ask_kimi_k2(session: AsyncSession, deal_id: int, user_query: str):
    """Kimi k2.5 actiu: Capaç de realitzar accions al calendari."""
    history_context = await get_deal_history_context(session, deal_id)
    
    system_prompt = (
        "Ets Kimi k2.5, l'agent IA expert del CRM PXX v2. "
        "Tens accés al calendari per crear cites.\n\n"
        f"{history_context}"
    )

    tools = [
        {
            "type": "function",
            "function": {
                "name": "crear_esdeveniment_calendari",
                "description": "Crea una cita o esdeveniment al calendari del projecte.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "titol": {"type": "string", "description": "Títol de la cita"},
                        "data_hora": {"type": "string", "description": "Data i hora en format ISO 8601 (Ex: 2024-05-10T14:00:00)"}
                    },
                    "required": ["titol", "data_hora"]
                }
            }
        }
    ]

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_query}
    ]

    try:
        # Crida inicial
        response = await client.chat.completions.create(
            model="moonshotai/kimi-k2.5",
            messages=messages,
            tools=tools,
            tool_choice="auto"
        )
        
        message = response.choices[0].message
        
        # Gestió del Loop de Tool Calling
        if message.tool_calls:
            for tool_call in message.tool_calls:
                if tool_call.function.name == "crear_esdeveniment_calendari":
                    args = json.loads(tool_call.function.arguments)
                    # Executem l'acció real
                    result_msg = await crear_esdeveniment_calendari(
                        session, 
                        deal_id, 
                        args.get("titol"), 
                        args.get("data_hora")
                    )
                    
                    # Retornem el resultat a l'agent perquè tanqui el cicle
                    messages.append(message)
                    messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": "crear_esdeveniment_calendari",
                        "content": result_msg
                    })
            
            # Segona crida per obtenir la resposta final de confirmació
            final_response = await client.chat.completions.create(
                model="moonshotai/kimi-k2.5",
                messages=messages
            )
            return final_response.choices[0].message.content
        
        return message.content
        
    except Exception as e:
        return f"Error Agent IA (SDK): {str(e)}"
