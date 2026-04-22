from fastapi import FastAPI, Depends, HTTPException
from sqlmodel import select
from sqlalchemy.orm import selectinload, joinedload
from database import get_session
from models import Deal, Municipi, Interaccio, Contacte
from typing import List

app = FastAPI(title="CRM PXX v2 - Final API")

@app.get("/deals/{deal_id}/full")
async def get_deal_full(deal_id: int, session=Depends(get_session)):
    statement = (
        select(Deal)
        .where(Deal.id == deal_id)
        .options(
            joinedload(Deal.municipi),
            selectinload(Deal.contactes),
            selectinload(Deal.interaccions)
        )
    )
    result = await session.execute(statement)
    deal = result.scalar_one_or_none()
    if not deal: raise HTTPException(status_code=404, detail="No trobat")
    return deal

@app.get("/calendar/events")
async def get_calendar_events(session=Depends(get_session)):
    """Calendari natiu alimentat per la font de veritat única (interaccions)."""
    statement = (
        select(Interaccio)
        .options(joinedload(Interaccio.deal))
        .where(Interaccio.tipus.in_(["trucada", "reunio", "visita", "tasca"]))
    )
    result = await session.execute(statement)
    interaccions = result.scalars().all()
    
    return [{
        "id": i.id,
        "title": f"[{i.tipus.upper()}] {i.deal.titol if i.deal else 'N/A'}",
        "start": i.data,
        "end": i.data_fi or i.data,
        "resource": {"deal_id": i.deal_id}
    } for i in interaccions]

@app.get("/deals/kanban")
async def get_kanban_board(session=Depends(get_session)):
    statement = select(Deal).options(joinedload(Deal.municipi))
    result = await session.execute(statement)
    deals = result.scalars().all()
    board = {"prospecte": [], "contactat": [], "reunio": [], "tancat": []}
    for d in deals:
        if d.estat in board: board[d.estat].append(d)
    return board
