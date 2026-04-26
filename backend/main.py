from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.requests import Request
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload, joinedload
from database import get_session, engine
from models import Deal, Municipi, Interaccio, Contacte, EstatDeal, OnboardingRequest
from typing import List, Optional, Dict, Any
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
    logging.info("Backend arrencat correctament. L'esquema es gestiona via Alembic.")
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
    return {"status": "ok", "version": "2.1.2", "timestamp": datetime.utcnow().isoformat()}

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

# --- DEALS (PROJECTES) ---

@app.get("/deals/kanban")
async def get_kanban_deals(session: AsyncSession = Depends(get_session)):
    """Obté els deals actius estructurats per a les columnes del Kanban."""
    try:
        # Utilitzem selectinload per evitar errors de lazy loading asíncron
        statement = select(Deal).where(Deal.is_active == True).options(
            selectinload(Deal.municipi).selectinload(Municipi.contactes),
            selectinload(Deal.interaccions)
        )
        result = await session.execute(statement)
        deals = result.scalars().all()
        
        # Inicialitzem el board amb els estats de l'Enum
        board = {e.value.lower(): [] for e in EstatDeal}
        
        for d in deals:
            try:
                deal_dict = d.dict(exclude={"municipi", "interaccions"})
                
                estat_clau = d.estat_kanban.value.lower() if d.estat_kanban else "nou"
                
                deal_dict["titol"] = d.municipi.nom if d.municipi else "Projecte sense nom"
                deal_dict["municipi"] = d.municipi.dict(exclude={"deal", "contactes"}) if d.municipi else None
                
                if d.municipi and d.municipi.contactes:
                    deal_dict["municipi"]["contactes"] = [c.dict(exclude={"municipi"}) for c in d.municipi.contactes]
                    
                if estat_clau in board:
                    board[estat_clau].append(deal_dict)
                else:
                    board["nou"].append(deal_dict)
            except Exception as e:
                logging.warning(f"Error processant deal {d.id} per al Kanban: {e}")
                continue
        return board
    except Exception as e:
        logging.error(f"Error crític a /deals/kanban: {str(e)}")
        raise HTTPException(status_code=500, detail="Error intern carregant el Kanban")

@app.get("/deals/{deal_id}")
async def get_deal_full(deal_id: int, session: AsyncSession = Depends(get_session)):
    """Retorna tota la informació d'un deal ( Epicentre )."""
    statement = select(Deal).where(Deal.id == deal_id).options(
        selectinload(Deal.municipi).selectinload(Municipi.contactes),
        selectinload(Deal.interaccions)
    )
    result = await session.execute(statement)
    deal = result.scalar_one_or_none()
    
    if not deal:
        raise HTTPException(status_code=404, detail="Deal no trobat")
    
    res = deal.dict()
    res["titol"] = deal.municipi.nom if deal.municipi else "Projecte sense nom"
    res["municipi"] = deal.municipi.dict() if deal.municipi else None
    if deal.municipi and deal.municipi.contactes:
        res["municipi"]["contactes"] = [c.dict() for c in deal.municipi.contactes]
        
    # Ordenació cronològica de la bitàcorra (Timeline)
    res["interaccions"] = sorted(deal.interaccions, key=lambda x: x.data, reverse=True)
    
    return res

@app.get("/deals")
async def get_deals(session=Depends(get_session)):
    """Llistat de tots els deals amb el seu municipi associat."""
    statement = select(Deal).options(joinedload(Deal.municipi))
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
            nou_contacte = Contacte(**c_data.model_dump(), municipi_id=municipi.id)
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

@app.get("/calendar/events/raw")
async def get_calendar_events_raw(session=Depends(get_session)):
    """Retorna els esdeveniments en format brut (models)."""
    statement = select(Esdeveniment).options(joinedload(Esdeveniment.deal).joinedload(Deal.municipi))
    result = await session.execute(statement)
    return result.scalars().all()

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

# --- CONTACTES ---

@app.get("/contactes")
async def get_contactes(limit: int = 100, offset: int = 0, session=Depends(get_session)):
    """Llistat de contactes amb paginació per evitar OOM."""
    statement = select(Contacte).options(selectinload(Contacte.municipi)).limit(limit).offset(offset)
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

@app.get("/municipis")
async def get_municipis(limit: int = 100, offset: int = 0, session=Depends(get_session)):
    """Llistat de municipis amb deals carregats per evitar LazyLoading Error."""
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

# --- TIMELINE (INTERACCIONS) ---

@app.post("/interaccions")
async def create_interaccio(data: InteraccioCreate, session: AsyncSession = Depends(get_session)):
    """Creació d'interacció amb validació estricta."""
    nou = Interaccio(**data.model_dump())
    session.add(nou)
    await session.commit()
    await session.refresh(nou)
    return nou

@app.get("/emails")
async def get_emails(limit: int = 50, offset: int = 0, session=Depends(get_session)):
    """Llistat d'emails amb paginació."""
    statement = (
        select(Interaccio)
        .where(Interaccio.tipus == "EMAIL")
        .order_by(Interaccio.data.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await session.execute(statement)
    return result.scalars().all()

# --- CALENDARI (ESDEVENIMENTS) ---

@app.get("/calendar/events")
async def get_calendar_events_formatted(session=Depends(get_session)):
    """Retorna els esdeveniments formatats des de la bitàcola centralitzada."""
    statement = (
        select(Interaccio)
        .where(Interaccio.tipus == "calendar")
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
        
    resposta = await ask_kimi_k2(session, deal_id, query)
    return {"response": resposta}

app.include_router(agent_router)
