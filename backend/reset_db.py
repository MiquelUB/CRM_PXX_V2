import asyncio
import os
import sys
from sqlalchemy import text

# Afegim el directori actual al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, init_db
from sqlmodel import SQLModel
import models 

async def reset():
    print("Iniciant el reset destructiu de la base de dades...")
    async with engine.begin() as conn:
        print("Eliminant taules amb CASCADE (forçant dependències)...")
        # Comandament nuclear per a Postgres: esborra tot ignorant les claus foranes
        await conn.execute(text("DROP TABLE IF EXISTS municipi, deal, contacte, interaccio, esdeveniment CASCADE;"))
        print("Taules eliminades correctament.")
        
    print("Creant nou esquema sincronitzat...")
    await init_db()
    print("Nou esquema creat amb èxit.")

if __name__ == "__main__":
    asyncio.run(reset())
