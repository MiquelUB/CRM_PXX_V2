from fastapi import FastAPI, Depends, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.requests import Request
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import text
from sqlalchemy.orm import selectinload, joinedload
from database import get_session, engine, async_session_maker
from models import (
    Deal, Municipi, Interaccio, Contacte, EstatDeal, OnboardingRequest,
    MunicipiRead, DealRead, ContacteRead, InteraccioRead,
    MunicipiReadWithDeals, DealReadWithMunicipi, InteraccioReadWithContext,
    DealKanbanRead, GlobalKnowledge, DealUpdate
)
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from services.ai_agent import ask_kimi_v4, generate_outbound_email
from routers.knowledge import router as knowledge_router
import traceback
import logging
import uuid
import os
from datetime import datetime
from fastapi import APIRouter

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestió segura del cicle de vida de l'aplicació."""
    logging.info("Backend arrencat correctament. L'esquema es gestiona via Alembic.")
    
    # Self-healing de dades (Injecció de context global per defecte)
    async with engine.begin() as conn:
        # Nota: L'esquema ja ha d'estar creat via Alembic
        try:
            from sqlmodel import Session
            async with async_session_maker() as session:
                statement = select(GlobalKnowledge).where(GlobalKnowledge.key == "pxx_general")
                result = await session.execute(statement)
                if not result.scalar_one_or_none():
                    session.add(GlobalKnowledge(key="pxx_general", content="Introduïu el context global aquí."))
                    await session.commit()
                    logging.info("DATA SEED: Context global 'pxx_general' injectat.")
        except Exception as e:
            logging.warning(f"DATA SEED: No s'ha pogut verificar/injectar el context global: {e}")

    yield
    logging.info("Tancant connexions...")

app = FastAPI(
    title="CRM PXX v2 - Expert Refactored API",
    lifespan=lifespan
)

@app.on_event("startup")
async def startup_db_fix():
    """Arregla la base de dades en arrencar si falten columnes (Bypass de migració per a casos crítics)."""
    async with engine.begin() as conn:
        try:
            # Mantenim els patches crítics existents
            await conn.execute(text('ALTER TABLE interaccio ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;'))
            logging.info("DB PATCH: Columna is_completed verificada/afegida.")
        except Exception as e:
            logging.info(f"DB PATCH: Nota: {e}")

# --- CONFIGURACIÓ CORS ---
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MIDDLEWARE D'OBSERVABILITAT ---
@app.middleware("http")
async def add_request_id_and_logging(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    
    # Configurem el logger per a aquesta petició
    logger = logging.getLogger("uvicorn.error")
    
    try:
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
    except Exception as exc:
        logger.error(f"Error [ID:{request_id}] a {request.method} {request.url.path}: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Error intern del servidor",
                "request_id": request_id
            },
            headers={"Access-Control-Allow-Origin": "*"}
        )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logging.warning(f"Error de validació a {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
        headers={"Access-Control-Allow-Origin": "*"}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers={"Access-Control-Allow-Origin": "*"}
        )
    
    logging.error(f"Error crític 500 a {request.method} {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "S'ha produït un error intern al servidor."},
        headers={"Access-Control-Allow-Origin": "*"}
    )

@app.get("/health")
async def health_check(session: AsyncSession = Depends(get_session)):
    """Healthcheck robust per a Easypanel."""
    try:
        await session.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected", "timestamp": datetime.utcnow().isoformat()}
    except Exception as e:
        logging.error(f"Healthcheck failed: {e}")
        return JSONResponse(
            status_code=503,
            content={"status": "error", "database": "disconnected"}
        )

# --- ESQUEMES DE VALIDACIÓ (API) ---

class DealStatusUpdate(BaseModel):
    estat_kanban: EstatDeal

class DealSaaSUpdate(BaseModel):
    pla_saas: Optional[str] = None
    pla_assignat: Optional[str] = None # Mantenim per compatibilitat legacy
    preu_acordat: Optional[float] = None

class ContacteCreate(BaseModel):
    nom: str
    email: str
    telefon: Optional[str] = None
    carrec: Optional[str] = None
    municipi_id: int
    deal_id: Optional[int] = None

class InteraccioCreate(BaseModel):
    deal_id: int
    tipus: str
    contingut: str
    metadata_json: Optional[Dict[str, Any]] = None

class InteraccioUpdate(BaseModel):
    is_completed: bool

class InteraccioFullUpdate(BaseModel):
    contingut: str
    metadata_json: Optional[Dict[str, Any]] = None

class AccioCreate(BaseModel):
    tipus: str
    contingut: str
    data_programada: datetime
    metadata_json: Optional[Dict[str, Any]] = None

# --- DEALS (PROJECTES) ---

@app.get("/deals/kanban", response_model=List[DealKanbanRead])
async def get_kanban_deals(session: AsyncSession = Depends(get_session)):
    """Obté els deals actius per al Kanban."""
    print("Cridant Kanban...")
    statement = select(Deal).where(Deal.is_active == True).options(
        joinedload(Deal.municipi),
        selectinload(Deal.contactes),
        selectinload(Deal.accions)
    )
    result = await session.execute(statement)
    deals = result.scalars().all()
    print(f"Deals trobats: {len(deals)}")
    return deals

@app.get("/deals/{deal_id}", response_model=DealReadWithMunicipi)
async def get_deal_full(deal_id: int, session: AsyncSession = Depends(get_session)):
    """Retorna tota la informació d'un deal ( Epicentre )."""
    statement = select(Deal).where(Deal.id == deal_id).options(
        joinedload(Deal.municipi),
        selectinload(Deal.contactes),
        selectinload(Deal.accions)
    )
    result = await session.execute(statement)
    deal = result.scalar_one_or_none()
    
    if not deal:
        raise HTTPException(status_code=404, detail="Deal no trobat")
    
    return deal

@app.get("/deals", response_model=List[DealKanbanRead])
async def get_deals(limit: int = 50, offset: int = 0, session=Depends(get_session)):
    """Llistat de tots els deals amb paginació."""
    statement = (
        select(Deal)
        .options(
            joinedload(Deal.municipi), 
            selectinload(Deal.contactes),
            selectinload(Deal.accions)
        )
        .limit(limit)
        .offset(offset)
    )
    result = await session.execute(statement)
    return result.scalars().all()

@app.post("/deals/onboarding", response_model=dict)
async def full_onboarding(request: OnboardingRequest, session=Depends(get_session)):
    """
    Endpoint atòmic d'onboarding:
    1. Busca o crea el municipi (idempotència).
    2. Crea el Deal vinculat (si no en té un d'actiu).
    3. Afegeix la llista de contactes.
    4. Registra l'interacció de sistema inicial.
    """
    try:
        # 1. Get or Create Municipi
        statement = select(Municipi).where(Municipi.codi_ine == request.municipi.codi_ine)
        result = await session.execute(statement)
        municipi = result.scalar_one_or_none()
        
        if not municipi:
            municipi = Municipi(**request.municipi.model_dump())
            session.add(municipi)
            await session.flush()

        # 2. Verificar Deal existent (Soft Delete respectat)
        statement_deal = select(Deal).where(Deal.municipi_id == municipi.id, Deal.is_active == True)
        res_deal = await session.execute(statement_deal)
        existing_deal = res_deal.scalar_one_or_none()
        
        if existing_deal:
            raise HTTPException(status_code=409, detail="Aquest municipi ja té un Deal actiu.")

        # 3. Crear Deal
        nou_deal = Deal(
            municipi_id=municipi.id,
            pla_saas=request.pla_assignat,
            pla_assignat=request.pla_assignat,
            estat_kanban=EstatDeal.NOU
        )
        session.add(nou_deal)
        await session.flush()

        # 4. Crear Contactes (Llista)
        for c_data in request.contactes:
            nou_contacte = Contacte(**c_data.model_dump(), municipi_id=municipi.id, deal_id=nou_deal.id)
            session.add(nou_contacte)

        # 5. Interacció de Benvinguda (System Log)
        log_inicial = Interaccio(
            deal_id=nou_deal.id,
            tipus="system_log",
            contingut=f"Onboarding completat. Pla: {request.pla_assignat}",
            metadata_json={"action": "onboarding", "contacts_added": len(request.contactes)}
        )
        session.add(log_inicial)

        await session.commit()
        return {"status": "success", "deal_id": nou_deal.id, "municipi_id": municipi.id}

    except HTTPException as he:
        raise he
    except Exception as e:
        await session.rollback()
        logging.error(f"Error en onboarding: {str(e)}")
        raise HTTPException(status_code=500, detail="Error intern en el procés d'onboarding")

# (Esborrat endpoint /calendar/events/raw per obsolescència i# --- AI AGENT & AUTOMATION ---

@app.get("/agent/deals/{deal_id}/history")
async def get_agent_history(deal_id: int, session: AsyncSession = Depends(get_session)):
    """Retorna l'historial de xat persistent per a un deal."""
    from services.ai_agent import get_chat_history
    history = await get_chat_history(session, deal_id)
    return {"history": history}

@app.post("/agent/deals/{deal_id}/ask")
async def ask_agent(deal_id: int, request: Dict[str, str], session: AsyncSession = Depends(get_session)):
    """Endpoint principal de l'agent Kimi (Persistent)."""
    from services.ai_agent import ask_kimi_v4
    query = request.get("query")
    if not query:
        raise HTTPException(status_code=400, detail="Query is required")
    
    # Utilitzem la versió persistent que guarda a la DB
    response = await ask_kimi_v4(session, deal_id, "chat", query)
    return {"response": response}

@app.patch("/deals/{deal_id}/estat")
async def update_deal_estat(deal_id: int, request: DealStatusUpdate, session: AsyncSession = Depends(get_session)):
    """Actualització segura de l'estat via Pydantic."""
    statement = select(Deal).where(Deal.id == deal_id)
    result = await session.execute(statement)
    deal = result.scalar_one_or_none()
    if not deal: raise HTTPException(status_code=404, detail="No trobat")
    
    deal.estat_kanban = request.estat_kanban
    
    session.add(deal)
    await session.commit()
    return {"status": "ok", "nou_estat": deal.estat_kanban}

@app.patch("/deals/{deal_id}/pla-saas")
async def update_deal_saas(deal_id: int, request: DealSaaSUpdate, session: AsyncSession = Depends(get_session)):
    """Actualització segura del pla SaaS via Pydantic."""
    statement = select(Deal).where(Deal.id == deal_id)
    result = await session.execute(statement)
    deal = result.scalar_one_or_none()
    if not deal: raise HTTPException(status_code=404, detail="No trobat")
    
    update_data = request.model_dump(exclude_unset=True)
    
    # Sincronització de camps legacy i nous
    if "pla_saas" in update_data:
        deal.pla_saas = update_data["pla_saas"]
        deal.pla_assignat = update_data["pla_saas"]
    elif "pla_assignat" in update_data:
        deal.pla_saas = update_data["pla_assignat"]
        deal.pla_assignat = update_data["pla_assignat"]
        
    if "preu_acordat" in update_data:
        # El preu acordat podria anar a un camp específic o a metadades
        pass
    
    session.add(deal)
    await session.commit()
    return {"status": "ok"}

@app.patch("/deals/{deal_id}", response_model=DealRead)
async def update_deal(deal_id: int, request: DealUpdate, session: AsyncSession = Depends(get_session)):
    """Actualització genèrica de Deal (inclou context de municipi)."""
    statement = select(Deal).where(Deal.id == deal_id)
    result = await session.execute(statement)
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal no trobat")
    
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == "pla_saas" or key == "pla_assignat":
            # Sincronització de camps legacy i nous
            deal.pla_saas = value
            deal.pla_assignat = value
        else:
            setattr(deal, key, value)
    
    session.add(deal)
    await session.commit()
    await session.refresh(deal)
    return deal

# --- REGISTRE DE ROUTERS ---
app.include_router(knowledge_router, prefix="/api")

# --- ENDPOINTS EXISTENTS ---

# --- CONTACTES ---

@app.get("/contactes", response_model=List[ContacteRead])
async def get_contactes(limit: int = 50, offset: int = 0, session=Depends(get_session)):
    """Llistat de contactes amb paginació."""
    statement = select(Contacte).limit(limit).offset(offset)
    result = await session.execute(statement)
    return result.scalars().all()

@app.post("/contactes")
async def create_contact(data: ContacteCreate, session=Depends(get_session)):
    """Creació de contacte amb validació estricta."""
    # Verificació de que el deal existeix si s'ha passat
    if data.deal_id:
        deal_check = await session.execute(select(Deal).where(Deal.id == data.deal_id))
        if not deal_check.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Deal no trobat")
            
    nou_contacte = Contacte(**data.model_dump())
    
    # Auto-vincular a Deal actiu si no s'ha passat deal_id però sí municipi_id
    if not nou_contacte.deal_id and nou_contacte.municipi_id:
        stmt = select(Deal).where(Deal.municipi_id == nou_contacte.municipi_id, Deal.is_active == True)
        res = await session.execute(stmt)
        active_deal = res.scalar_one_or_none()
        if active_deal:
            nou_contacte.deal_id = active_deal.id

    session.add(nou_contacte)
    try:
        await session.commit()
        await session.refresh(nou_contacte)
    except Exception as e:
        await session.rollback()
        logging.error(f"Error creant contacte: {e}")
        raise HTTPException(status_code=500, detail="Error de base de dades")
    return nou_contacte

@app.put("/contactes/{contact_id}")
async def update_contacte(contact_id: int, data: ContacteCreate, session=Depends(get_session)):
    """Actualització de contacte amb validació estricta."""
    statement = select(Contacte).where(Contacte.id == contact_id)
    result = await session.execute(statement)
    contacte = result.scalar_one_or_none()
    if not contacte: raise HTTPException(status_code=404, detail="Contacte no trobat")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(contacte, key, value)
            
    session.add(contacte)
    await session.commit()
    return {"status": "ok"}

@app.delete("/contactes/{contact_id}")
async def delete_contacte(contact_id: int, session=Depends(get_session)):
    statement = select(Contacte).where(Contacte.id == contact_id)
    result = await session.execute(statement)
    contacte = result.scalar_one_or_none()
    if not contacte: raise HTTPException(status_code=404, detail="Contacte no trobat")
    
    await session.delete(contacte)
    await session.commit()
    return {"status": "ok"}

# --- MUNICIPIS ---

@app.get("/municipis", response_model=List[MunicipiReadWithDeals])
async def get_municipis(limit: int = 50, offset: int = 0, session=Depends(get_session)):
    """Llistat de municipis amb deals carregats."""
    statement = select(Municipi).options(selectinload(Municipi.deals)).limit(limit).offset(offset)
    result = await session.execute(statement)
    return result.scalars().all()

@app.patch("/municipis/{municipi_id}")
async def update_municipi(municipi_id: int, data: dict, session=Depends(get_session)):
    """Actualitza les dades d'un municipi (Manté dict per flexibilitat parcial, però es recomana esquema)."""
    statement = select(Municipi).where(Municipi.id == municipi_id)
    result = await session.execute(statement)
    m = result.scalar_one_or_none()
    if not m: raise HTTPException(status_code=404, detail="Municipi no trobat")
    
    for key, value in data.items():
        if hasattr(m, key):
            setattr(m, key, value)
            
    session.add(m)
    await session.commit()
    return {"status": "ok"}

@app.post("/municipis")
async def create_municipi(municipi: Municipi, session=Depends(get_session)):
    """Crea el municipi i autogenera el seu Deal associat."""
    session.add(municipi)
    await session.commit()
    await session.refresh(municipi)
    
    # Creació del Deal associat segons la nova arquitectura
    nou_deal = Deal(
        municipi_id=municipi.id,
        pla_saas="Pla de Venda",
        pla_assignat="Pla de Venda",
        estat_kanban=EstatDeal.NOU
    )
    session.add(nou_deal)
    await session.commit()
    
    return municipi

@app.delete("/municipis/{municipi_id}")
async def delete_municipi(municipi_id: int, session=Depends(get_session)):
    """Esborrat total d'un municipi (inclou Deals i Contactes per cascada)."""
    statement = select(Municipi).where(Municipi.id == municipi_id)
    result = await session.execute(statement)
    m = result.scalar_one_or_none()
    if not m: raise HTTPException(status_code=404, detail="Municipi no trobat")
    
    await session.delete(m)
    await session.commit()
    return {"detail": "Municipi esborrat correctament"}

# --- TIMELINE (INTERACCIONS) ---

@app.post("/interaccions")
async def create_interaccio(data: InteraccioCreate, session: AsyncSession = Depends(get_session)):
    """Creació d'interacció amb validació estricta."""
    nou = Interaccio(**data.model_dump())
    session.add(nou)
    await session.commit()
    await session.refresh(nou)
    return nou

@app.patch("/interaccions/{interaccio_id}/status")
async def update_interaccio_status(interaccio_id: int, request: InteraccioUpdate, session: AsyncSession = Depends(get_session)):
    """Canvia l'estat de completat d'una interacció/tasca."""
    stmt = select(Interaccio).where(Interaccio.id == interaccio_id)
    res = await session.execute(stmt)
    interaccio = res.scalar_one_or_none()
    if not interaccio: raise HTTPException(status_code=404, detail="No trobat")
    
    interaccio.is_completed = request.is_completed
    session.add(interaccio)
    await session.commit()
    return {"status": "ok", "is_completed": interaccio.is_completed}

@app.patch("/interaccions/{interaccio_id}")
async def update_interaccio_content(interaccio_id: int, request: InteraccioFullUpdate, session: AsyncSession = Depends(get_session)):
    """Edició completa del contingut d'una interacció o tasca."""
    stmt = select(Interaccio).where(Interaccio.id == interaccio_id)
    res = await session.execute(stmt)
    interaccio = res.scalar_one_or_none()
    if not interaccio: raise HTTPException(status_code=404, detail="No trobat")
    
    interaccio.contingut = request.contingut
    if request.metadata_json is not None:
        interaccio.metadata_json = request.metadata_json
        
    session.add(interaccio)
    await session.commit()
    await session.refresh(interaccio)
    return interaccio

@app.post("/deals/{deal_id}/accions")
async def create_deal_accio(deal_id: int, request: AccioCreate, session: AsyncSession = Depends(get_session)):
    """Programa una nova acció per a un deal."""
    nou = Interaccio(
        deal_id=deal_id,
        tipus=request.tipus,
        contingut=request.contingut,
        is_completed=False,
        data=request.data_programada,
        metadata_json=request.metadata_json or {}
    )
    # Injectem la data al metadata per compatibilitat amb el calendari actual
    if "data_hora" not in nou.metadata_json:
        nou.metadata_json["data_hora"] = request.data_programada.isoformat()
        
    session.add(nou)
    await session.commit()
    await session.refresh(nou)
    return nou

@app.patch("/accions/{accio_id}/completar")
async def completar_accio(accio_id: int, session: AsyncSession = Depends(get_session)):
    """Marca una acció com a completada."""
    stmt = select(Interaccio).where(Interaccio.id == accio_id)
    res = await session.execute(stmt)
    accio = res.scalar_one_or_none()
    if not accio: raise HTTPException(status_code=404, detail="Acció no trobada")
    
    accio.is_completed = True
    session.add(accio)
    await session.commit()
    return {"status": "ok"}

@app.get("/emails", response_model=List[InteraccioReadWithContext])
async def get_emails(limit: int = 50, offset: int = 0, session=Depends(get_session)):
    """Llistat d'emails amb context carregat."""
    statement = (
        select(Interaccio)
        .where(Interaccio.tipus == "EMAIL")
        .options(joinedload(Interaccio.deal).joinedload(Deal.municipi))
        .order_by(Interaccio.data.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await session.execute(statement)
    return result.scalars().all()

# --- CALENDARI (ESDEVENIMENTS) ---

@app.get("/calendar/events", response_model=List[dict])
async def get_calendar_events_formatted(session=Depends(get_session)):
    """Retorna els esdeveniments pendents des de la bitàcola centralitzada."""
    # Tipus que es mostren al calendari
    tipus_calendar = ["calendar", "trucada", "demo", "reunio", "tasca_programada"]
    
    statement = (
        select(Interaccio)
        .where(Interaccio.is_completed == False)
        .options(joinedload(Interaccio.deal).joinedload(Deal.municipi))
    )
    result = await session.execute(statement)
    interaccions = result.scalars().all()
    
    events = []
    for i in interaccions:
        if i.metadata_json and "data_hora" in i.metadata_json:
            events.append({
                "id": i.id,
                "title": f"{i.contingut} ({i.deal.municipi.nom})",
                "start": i.metadata_json["data_hora"],
                "end": i.metadata_json.get("data_hora_fi", i.metadata_json["data_hora"]),
                "resource": {"deal_id": i.deal_id}
            })
    return events

# --- AGENT IA (Kimi k2.5) ---

agent_router = APIRouter(prefix="/agent", tags=["AI Agent"])

class AgentQuery(BaseModel):
    query: str

@agent_router.post("/deals/{deal_id}/ask")
async def ask_agent(deal_id: int, body: AgentQuery, session=Depends(get_session)):
    """Pregunta a l'agent Kimi sobre un deal específic."""
    query = body.query
    # 1. Recuperar dades del deal
    # (Nota: ask_kimi_k2 ja recupera les dades internes si cal, 
    # però fem un check previ de que el deal existeix)
    deal_check = await session.execute(select(Deal).where(Deal.id == deal_id))
    if not deal_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Deal no trobat")
        
    resposta = await ask_kimi_v4(session, deal_id, "general_query", query)
    return {"response": resposta}

app.include_router(agent_router)
