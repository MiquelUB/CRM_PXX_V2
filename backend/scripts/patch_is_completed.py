import asyncio
import os
import sys
from sqlalchemy import text
from sqlmodel.ext.asyncio.session import AsyncSession

# Afegim el directori pare al path per poder importar database i models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
# Carreguem .env explícitament
load_dotenv()

from database import engine

async def patch_db():
    print("--- [DB PATCH] Iniciant pedaç de base de dades ---")
    async with AsyncSession(engine) as session:
        try:
            # Intentem afegir la columna is_completed
            print("Executant: ALTER TABLE interaccio ADD COLUMN is_completed BOOLEAN DEFAULT FALSE;")
            await session.execute(text("ALTER TABLE interaccio ADD COLUMN is_completed BOOLEAN DEFAULT FALSE;"))
            await session.commit()
            print("--- [DB PATCH] Columna afegida correctament ---")
        except Exception as e:
            await session.rollback()
            if "already exists" in str(e).lower():
                print("--- [DB PATCH] La columna ja existeix. No cal fer res. ---")
            else:
                print(f"--- [DB PATCH] ERROR en executar el pedaç: {e}")
                raise e

if __name__ == "__main__":
    asyncio.run(patch_db())
