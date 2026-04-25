from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.requests import Request
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload, joinedload
from database import get_session, init_db, engine
from models import Deal, Municipi, Interaccio, Contacte, EstatDeal, OnboardingRequest
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
    return {"status": "ok", "version": "2.1.1", "timestamp": datetime.utcnow().isoformat()}

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
    res["interaccions"] = sorted(deal.interaccions, key=lambda x: x.data_creacio, reverse=True)
    
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
async def update_deal_estat(deal_id: int, data: dict, session=Depends(get_session)):
    statement = select(Deal).where(Deal.id == deal_id)
    result = await session.execute(statement)
    deal = result.scalar_one_or_none()
    if not deal: raise HTTPException(status_code=404, detail="No trobat")
    
    if "estat" in data: 
        deal.estat_kanban = EstatDeal(data["estat"])
    session.add(deal)
    await session.commit()
    return {"status": "ok"}

@app.patch("/deals/{deal_id}/pla-saas")
async def update_deal_saas(deal_id: int, data: dict, session=Depends(get_session)):
    """Actualitza el pla SaaS del Deal."""
    statement = select(Deal).where(Deal.id == deal_id)
    result = await session.execute(statement)
    deal = result.scalar_one_or_none()
    if not deal: raise HTTPException(status_code=404, detail="No trobat")
    
    if "pla_assignat" in data: deal.pla_assignat = data["pla_assignat"]
    
    session.add(deal)
    await session.commit()
    return {"status": "ok"}

# --- CONTACTES ---

@app.get("/contactes")
async def get_contactes(session=Depends(get_session)):
    statement = select(Contacte).options(selectinload(Contacte.municipi))
    result = await session.execute(statement)
    return result.scalars().all()

@app.post("/contactes")
async def create_contact(data: dict, session=Depends(get_session)):
    mid = data.get("municipi_id")
    if not mid:
        raise HTTPException(status_code=400, detail="El municipi_id és obligatori")
        
    nou_contacte = Contacte(
        municipi_id=mid,
        nom=data.get("nom"),
        carrec=data.get("carrec"),
        email=data.get("email"),
        telefon=data.get("telefon")
    )
    session.add(nou_contacte)
    try:
        await session.commit()
        await session.refresh(nou_contacte)
    except Exception as e:
        await session.rollback()
        logging.error(f"Error creant contacte: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    return nou_contacte

@app.put("/contactes/{contact_id}")
async def update_contacte(contact_id: int, data: dict, session=Depends(get_session)):
    statement = select(Contacte).where(Contacte.id == contact_id)
    result = await session.execute(statement)
    contacte = result.scalar_one_or_none()
    if not contacte: raise HTTPException(status_code=404, detail="Contacte no trobat")
    
    for key, value in data.items():
        if hasattr(contacte, key):
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
async def get_municipis(session=Depends(get_session)):
    statement = select(Municipi)
    result = await session.execute(statement)
    return result.scalars().all()

@app.patch("/municipis/{municipi_id}")
async def update_municipi(municipi_id: int, data: dict, session=Depends(get_session)):
    """Actualitza les dades d'un municipi."""
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
