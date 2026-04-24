import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
from models import Municipi, Deal, Contacte, Interaccio, Esdeveniment

# DATABASE_URL hauria de venir de les variables d'entorn d'EasyPanel
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@localhost/crm_pxx_v2")

# Creació del motor asíncron per a PostgreSQL
engine = create_async_engine(DATABASE_URL, echo=True, future=True)

# Configuració del factory de sessions asíncrones
async_session_maker = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def init_db():
    """Inicialitza la base de dades (creació de taules si no existeixen)."""
    async with engine.begin() as conn:
        # Nota: En producció utilitzarem Alembic, però per al Fresh Start 
        # permetem la creació inicial de l'esquema.
        await conn.run_sync(SQLModel.metadata.create_all)

async def get_session() -> AsyncSession:
    """Dependency per obtenir la sessió de la base de dades en els endpoints."""
    async with async_session_maker() as session:
        yield session

from contextlib import asynccontextmanager

@asynccontextmanager
async def get_session_context():
    """Context manager per a scripts externs (com el Worker de Mail)."""
    async with async_session_maker() as session:
        yield session
