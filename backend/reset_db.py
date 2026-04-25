import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

async def reset_database():
    url = os.getenv("DATABASE_URL")
    if not url:
        print("ERROR: DATABASE_URL no trobada.")
        return
    
    # Correcció de protocol per a asyncpg
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        
    print(f"Connectant a: {url.split('@')[-1]}")
    
    engine = create_async_engine(url)
    try:
        async with engine.begin() as conn:
            print("Netejant esquema public...")
            await conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
        print("OK: Base de dades buidada correctament.")
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(reset_database())
