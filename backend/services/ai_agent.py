import os
import json
from openai import AsyncOpenAI
from sqlalchemy.orm import selectinload, joinedload
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from ..models import Deal, Interaccio, Esdeveniment

# SDK configurat per a OpenRouter
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

    history = sorted(deal.interaccions, key=lambda x: x.data_creacio)
    context_lines = [f"CONTEXT DEL DEAL: {deal.municipi.nom} (Estat: {deal.estat})"]
    for i in history:
        date_str = i.data_creacio.strftime("%Y-%m-%d %H:%M")
        context_lines.append(f"[{date_str}]: {i.tipus} - {i.contingut}")
    
    return "\n".join(context_lines)

async def ask_kimi_k2(session: AsyncSession, deal_id: int, user_query: str):
    """Bucle estricte de Tool Calling per a l'Agent IA (Kimi k2.5)."""
    history_context = await get_deal_history_context(session, deal_id)
    
    system_prompt = (
        "Ets Kimi k2.5, l'agent IA expert del CRM PXX v2. "
        "Tens permís per crear cites al calendari utilitzant la funció 'crear_esdeveniment_calendari'.\n\n"
        f"{history_context}"
    )

    tools = [{
        "type": "function",
        "function": {
            "name": "crear_esdeveniment_calendari",
            "description": "Crea una cita o esdeveniment al calendari del projecte.",
            "parameters": {
                "type": "object",
                "properties": {
                    "titol": {"type": "string", "description": "Títol de la cita"},
                    "data_hora": {"type": "string", "description": "ISO 8601 format (Ex: 2024-05-10T14:00:00)"}
                },
                "required": ["titol", "data_hora"]
            }
        }
    }]

    missatges = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_query}
    ]

    try:
        # 1. Primera crida (Intent d'acció)
        response = await client.chat.completions.create(
            model="moonshotai/kimi-k2.5",
            messages=missatges,
            tools=tools
        )
        message = response.choices[0].message

        # 2. Gestió de Tool Calling
        if message.tool_calls:
            missatges.append(message)
            
            for tool_call in message.tool_calls:
                if tool_call.function.name == "crear_esdeveniment_calendari":
                    args = json.loads(tool_call.function.arguments)
                    
                    # 3. Execució real a la Base de Dades
                    try:
                        data_dt = datetime.fromisoformat(args.get("data_hora").replace("Z", "+00:00"))
                        nou_event = Esdeveniment(
                            deal_id=deal_id,
                            titol=args.get("titol"),
                            data_hora=data_dt,
                            creat_per_ia=True
                        )
                        session.add(nou_event)
                        await session.commit()
                        result_msg = "Esdeveniment creat i guardat a la base de dades correctament."
                    except Exception as db_err:
                        result_msg = f"Error al guardar a DB: {str(db_err)}"
                    
                    # 4. Retorn del resultat a l'Agent
                    missatges.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": result_msg
                    })
            
            # 5. Segona crida (Confirmació final)
            final_response = await client.chat.completions.create(
                model="moonshotai/kimi-k2.5",
                messages=missatges
            )
            return final_response.choices[0].message.content
        
        return message.content
        
    except Exception as e:
        return f"Error Agent IA: {str(e)}"
