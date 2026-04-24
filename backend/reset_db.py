import asyncio
import os
import sys

# Afegim el directori actual al path per poder importar models i database
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, init_db
from sqlmodel import SQLModel
# Importar models per assegurar que estan registrats a SQLModel.metadata
import models 

async def reset():
    print("Iniciant el reset de la base de dades...")
    async with engine.begin() as conn:
        # ATENCIÓ: Això esborra totes les dades actuals per sincronitzar l'estructura
        print("Eliminant taules antigues...")
        await conn.run_sync(SQLModel.metadata.drop_all)
        print("Taules eliminades.")
        
    print("Creant nou esquema segons models.py...")
    await init_db()
    print("Nou esquema creat amb èxit (Municipi, Deal, Contacte, Interaccio, Esdeveniment).")
    print("La base de dades està ara sincronitzada i buida.")

if __name__ == "__main__":
    asyncio.run(reset())
