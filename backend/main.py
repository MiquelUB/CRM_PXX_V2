from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import select
from sqlalchemy.orm import selectinload, joinedload
from database import get_session, init_db
from models import Deal, Municipi, Interaccio, Contacte
from typing import List

app = FastAPI(title="CRM PXX v2 - Final API")

# Configurar CORS per permetre l'accés des del frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Provem amb * i credentials False per descartar problemes de domini
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    try:
        await init_db()
        print("Base de dades inicialitzada correctament")
    except Exception as e:
        print(f"Error inicialitzant la base de dades: {e}")

@app.get("/health")
async def health_check(session=Depends(get_session)):
    try:
        # Intentem una consulta simple per verificar la connexió
        from sqlalchemy import text
        await session.execute(text("SELECT 1"))
        return {"status": "ok", "db": "connected", "version": "2.0.1"}
    except Exception as e:
        return {"status": "error", "db": str(e), "version": "2.0.1"}

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

@app.get("/municipis")
async def get_municipis(session=Depends(get_session)):
    statement = select(Municipi)
    result = await session.execute(statement)
    return result.scalars().all()

@app.post("/municipis")
async def create_municipi(municipi: Municipi, session=Depends(get_session)):
    session.add(municipi)
    await session.commit()
    await session.refresh(municipi)
    
    # Creem automàticament un Deal associat a aquest municipi (1 municipi = 1 deal en aquesta fase)
    nou_deal = Deal(
        titol=f"Projecte {municipi.nom}",
        municipi_id=municipi.codi_ine,
        estat="prospecte"
    )
    session.add(nou_deal)
    await session.commit()
    
    return municipi

@app.get("/contactes")
async def get_contactes(session=Depends(get_session)):
    # Corregim la càrrega: Contacte -> Deal -> Municipi
    statement = select(Contacte).options(
        joinedload(Contacte.deal).joinedload(Deal.municipi)
    )
    result = await session.execute(statement)
    return result.scalars().all()

@app.post("/contactes")
async def create_contacte(data: dict, session=Depends(get_session)):
    # Busquem el Deal associat al municipi enviat
    codi_ine = data.get("codi_ine_municipi")
    statement = select(Deal).where(Deal.municipi_id == codi_ine)
    result = await session.execute(statement)
    deal = result.scalar_one_or_none()
    
    if not deal:
        raise HTTPException(status_code=400, detail="Aquest municipi no té cap projecte (Deal) actiu.")
    
    nou_contacte = Contacte(
        nom=data.get("nom"),
        email=data.get("email"),
        telefon=data.get("telefon"),
        carrec=data.get("carrec"),
        deal_id=deal.id
    )
    session.add(nou_contacte)
    await session.commit()
    await session.refresh(nou_contacte)
    return nou_contacte
