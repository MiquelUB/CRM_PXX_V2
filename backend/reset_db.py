import asyncio
import os
from sqlmodel import SQLModel, create_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
from models import Municipi, Contacte, Deal, Interaccio # Importar per registrar-los a metadata
from dotenv import load_dotenv

load_dotenv()

async def reset_database():
    url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./crm_pxx_v2.db")
    
    # Correcció de protocol per a asyncpg
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        
    print(f"Connectant a: {url.split('@')[-1]}")
    
    engine = create_async_engine(url)
    try:
        async with engine.begin() as conn:
            print("Esborrant totes les taules existents...")
            await conn.run_sync(SQLModel.metadata.drop_all)
            print("Recreant totes les taules des de zero...")
            await conn.run_sync(SQLModel.metadata.create_all)
        print("OK: Base de dades reiniciada correctament.")
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(reset_database())
