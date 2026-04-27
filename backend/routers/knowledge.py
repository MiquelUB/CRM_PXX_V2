from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from database import get_session
from models import GlobalKnowledge, KnowledgeUpdate, GlobalKnowledgeRead

router = APIRouter(prefix="/knowledge", tags=["knowledge"])

@router.get("/{key}", response_model=GlobalKnowledgeRead)
async def get_knowledge(key: str, session: AsyncSession = Depends(get_session)):
    """Recupera un registre de coneixement global per clau."""
    statement = select(GlobalKnowledge).where(GlobalKnowledge.key == key)
    result = await session.execute(statement)
    knowledge = result.scalar_one_or_none()
    
    if not knowledge:
        raise HTTPException(status_code=404, detail=f"Coneixement amb clau '{key}' no trobat")
    
    return knowledge

@router.put("/{key}", response_model=GlobalKnowledgeRead)
async def update_knowledge(key: str, request: KnowledgeUpdate, session: AsyncSession = Depends(get_session)):
    """Actualitza o crea un registre de coneixement global."""
    statement = select(GlobalKnowledge).where(GlobalKnowledge.key == key)
    result = await session.execute(statement)
    knowledge = result.scalar_one_or_none()
    
    if knowledge:
        knowledge.content = request.content
    else:
        knowledge = GlobalKnowledge(key=key, content=request.content)
    
    session.add(knowledge)
    await session.commit()
    await session.refresh(knowledge)
    return knowledge
