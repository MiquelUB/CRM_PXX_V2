from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.requests import Request
from sqlmodel import select
from sqlalchemy.orm import selectinload, joinedload
from database import get_session, init_db
from models import Deal, Municipi, Interaccio, Contacte, Esdeveniment
from typing import List
from pydantic import BaseModel
from services.ai_agent import ask_kimi_k2
import traceback
import logging
from datetime import datetime
from fastapi import APIRouter

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestió segura del cicle de vida de l'aplicació."""
    try:
        logging.info("Iniciant connexions i inicialitzant DB...")
        await init_db()
        logging.info("DB inicialitzada correctament.")
    except Exception as e:
        # Si la DB falla, no matem el servidor (per evitar 502 Bad Gateway en boot).
        # Així el servidor HTTP aixeca i podem veure els logs o respondre 503.
        logging.critical(f"ERROR CRÍTIC a l'arrencada (DB): {e}")
        logging.error(traceback.format_exc())
    yield
    logging.info("Tancant connexions...")

app = FastAPI(
    title="CRM PXX v2 - Expert Refactored API",
    lifespan=lifespan
)

# --- CONFIGURACIÓ CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Bypass per a excepcions HTTP controlades
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers={"Access-Control-Allow-Origin": "*"}
        )
    
    # Logging exhaustiu només per a caigudes reals
    logging.error(f"Error crític 500 a {request.method} {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "S'ha produït un error intern al servidor."},
        headers={"Access-Control-Allow-Origin": "*"}
    )

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "2.1.1", "timestamp": datetime.utcnow().isoformat()}

# --- DEALS (PROJECTES) ---

@app.get("/deals/kanban")
async def get_kanban_deals(session=Depends(get_session)):
    """Retorna el board amb el municipi i els seus contactes precarregats."""
    statement = select(Deal).options(
        joinedload(Deal.municipi).selectinload(Municipi.contactes) 
    )
    result = await session.execute(statement)
    deals = result.scalars().all()
    
    board = {"prospecte": [], "contactat": [], "reunio": [], "tancat": []}
    for d in deals:
        deal_dict = d.dict()
        deal_dict["titol"] = d.municipi.nom if d.municipi else "Projecte sense nom"
        deal_dict["municipi"] = d.municipi.dict() if d.municipi else None
        
        # Injectem els contactes explícitament al diccionari si existeixen
        if d.municipi and d.municipi.contactes:
            deal_dict["municipi"]["contactes"] = [c.dict() for c in d.municipi.contactes]
            
        if d.estat in board:
            board[d.estat].append(deal_dict)
    return board

@app.get("/deals/{deal_id}/full")
async def get_deal_full(deal_id: int, session=Depends(get_session)):
    """Endpoint unificat 360º: Deal + Municipi + Contactes + Timeline + Events."""
    statement = (
        select(Deal)
        .where(Deal.id == deal_id)
        .options(
            # Correcte en V2: Els contactes es carreguen a través del municipi
            joinedload(Deal.municipi).selectinload(Municipi.contactes),
            selectinload(Deal.interaccions).joinedload(Interaccio.contacte),
            selectinload(Deal.esdeveniments)
        )
    )
    result = await session.execute(statement)
    deal = result.scalar_one_or_none()
    
    if not deal:
        raise HTTPException(status_code=404, detail="Deal no trobat")
    
    # Preparem la resposta amb títol virtual i ordenació de timeline
    res = deal.dict()
    res["titol"] = deal.municipi.nom if deal.municipi else "Projecte sense nom"
    res["municipi"] = deal.municipi.dict() if deal.municipi else None
    if deal.municipi and deal.municipi.contactes:
        res["municipi"]["contactes"] = [c.dict() for c in deal.municipi.contactes]
        
    # Ordenació cronològica de la bitàcorra (Timeline)
    res["interaccions"] = sorted(deal.interaccions, key=lambda x: x.data_creacio, reverse=True)
    res["esdeveniments"] = deal.esdeveniments
    
    return res

@app.get("/deals")
async def get_deals(session=Depends(get_session)):
    """Llistat de tots els deals amb el seu municipi associat."""
    statement = select(Deal).options(joinedload(Deal.municipi))
    result = await session.execute(statement)
    return result.scalars().all()

@app.post("/deals")
async def create_deal(data: dict, session=Depends(get_session)):
    nou_deal = Deal(
        municipi_id=data.get("municipi_id"),
        estat=data.get("estat", "prospecte"),
        pla_tipus=data.get("pla_tipus"),
        preu_acordat=data.get("preu_acordat")
    )
    session.add(nou_deal)
    await session.commit()
    await session.refresh(nou_deal)
    return nou_deal

@app.get("/calendar/events")
async def get_calendar_events(session=Depends(get_session)):
    """Retorna els esdeveniments per al calendari del Dashboard."""
    statement = select(Esdeveniment).options(joinedload(Esdeveniment.deal).joinedload(Deal.municipi))
    result = await session.execute(statement)
    return result.scalars().all()

@app.patch("/deals/{deal_id}/estat")
async def update_deal_estat(deal_id: int, data: dict, session=Depends(get_session)):
    statement = select(Deal).where(Deal.id == deal_id)
    result = await session.execute(statement)
    deal = result.scalar_one_or_none()
    if not deal: raise HTTPException(status_code=404, detail="No trobat")
    
    if "estat" in data: deal.estat = data["estat"]
    session.add(deal)
    await session.commit()
    return {"status": "ok"}

# --- CONTACTES ---

@app.get("/contactes")
async def get_contactes(session=Depends(get_session)):
    statement = select(Contacte).options(joinedload(Contacte.municipi))
    result = await session.execute(statement)
    return result.scalars().all()

@app.post("/contactes")
async def create_contacte(data: dict, session=Depends(get_session)):
    mid = data.get("municipi_id")
    if not mid:
        raise HTTPException(status_code=400, detail="El municipi_id és obligatori")
    
    nou_contacte = Contacte(
        nom=data.get("nom"),
        email=data.get("email"),
        telefon=data.get("telefon"),
        carrec=data.get("carrec"),
        municipi_id=mid
    )
    session.add(nou_contacte)
    await session.commit()
    await session.refresh(nou_contacte)
    return nou_contacte

# --- MUNICIPIS ---

@app.get("/municipis")
async def get_municipis(session=Depends(get_session)):
    statement = select(Municipi)
    result = await session.execute(statement)
    return result.scalars().all()

@app.post("/municipis")
async def create_municipi(municipi: Municipi, session=Depends(get_session)):
    """Crea el municipi i autogenera el seu Deal 1:1 associat."""
    session.add(municipi)
    await session.commit()
    await session.refresh(municipi)
    
    # Creació del Deal associat segons la nova arquitectura
    nou_deal = Deal(
        municipi_id=municipi.codi_ine,
        estat="prospecte"
        # pla_tipus i preu_acordat queden a None inicialment
    )
    session.add(nou_deal)
    await session.commit()
    
    return municipi

# --- TIMELINE (INTERACCIONS) ---

@app.post("/interaccions")
async def create_interaccio(data: dict, session=Depends(get_session)):
    nou = Interaccio(
        deal_id=data.get("deal_id"),
        contacte_id=data.get("contacte_id"),
        tipus=data.get("tipus", "NOTA_MANUAL"),
        contingut=data.get("contingut", ""),
        data_creacio=datetime.utcnow()
    )
    session.add(nou)
    await session.commit()
    await session.refresh(nou)
    return nou

@app.get("/emails")
async def get_emails(session=Depends(get_session)):
    statement = (
        select(Interaccio)
        .where(Interaccio.tipus == "EMAIL")
        .order_by(Interaccio.data_creacio.desc())
    )
    result = await session.execute(statement)
    return result.scalars().all()

# --- CALENDARI (ESDEVENIMENTS) ---

@app.get("/calendar/events")
async def get_calendar_events(session=Depends(get_session)):
    statement = select(Esdeveniment).options(joinedload(Esdeveniment.deal).joinedload(Deal.municipi))
    result = await session.execute(statement)
    events = result.scalars().all()
    return [{
        "id": e.id,
        "title": f"{e.titol} ({e.deal.municipi.nom})",
        "start": e.data_hora,
        "resource": {"deal_id": e.deal_id}
    } for e in events]

# --- AGENT IA (Kimi k2.5) ---

agent_router = APIRouter(prefix="/agent", tags=["AI Agent"])

class AgentRequest(BaseModel):
    query: str

@agent_router.post("/deals/{deal_id}/ask")
async def chat_amb_agent(deal_id: int, payload: AgentRequest, session=Depends(get_session)):
    """Integra l'agent al Deal Drawer."""
    resposta = await ask_kimi_k2(session, deal_id, payload.query)
    return {"response": resposta}

@app.get("/sys/force-reset-db")
async def force_reset_database():
    """ATENCIÓ: Endpoint d'emergència per sincronitzar l'esquema V2 a producció."""
    import logging
    from sqlalchemy import text
    try:
        logging.info("Iniciant purga de la base de dades...")
        # 1. Esborra absolutament totes les taules existents (V1)
        async with engine.begin() as conn:
            # Per a PostgreSQL, hem d'assegurar-nos de fer un DROP en cascada si hi ha conflictes
            await conn.run_sync(SQLModel.metadata.drop_all)
            # 2. Crea les taules de zero basant-se en el models.py actual (V2)
            await conn.run_sync(SQLModel.metadata.create_all)
        
        return {
            "status": "success", 
            "message": "Esquema V2 recreat correctament. La base de dades està neta i sincronitzada amb el codi."
        }
    except Exception as e:
        logging.error(f"Fallada en recrear la DB: {str(e)}")
        return {"status": "error", "detail": str(e)}

app.include_router(agent_router)
