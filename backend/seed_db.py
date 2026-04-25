import asyncio
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker
from database import engine
from models import Municipi, Contacte, Deal, Interaccio

async def seed_data():
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # PROTECCIÓ D'IDEMPOTÈNCIA: Comprovem si ja hi ha municipis
        existing_count = await session.execute(select(Municipi))
        if existing_count.scalars().first():
            print("⚠️ La base de dades ja té dades. Seed cancel·lat per evitar duplicitats.")
            return

        print("🌱 Iniciant càrrega de dades de prova (Seed)...")

        # 1. Crear Municipi Base
        m1 = Municipi(
            codi_ine="080193", 
            nom="Barcelona", 
            adreca_fisica="Pl. Sant Jaume, 1",
            email_general="info@bcn.cat"
        )
        session.add(m1)
        await session.flush() # Obtenim ID

        # 2. Crear Contactes
        c1 = Contacte(municipi_id=m1.id, nom="Maria Garcia", carrec="IT Manager", email="mgarcia@bcn.cat")
        session.add(c1)

        # 3. Crear Deal Actiu
        d1 = Deal(
            municipi_id=m1.id, 
            pla_assignat="Pla Pro", 
            estat_kanban="Nou"
        )
        session.add(d1)
        await session.flush()

        # 4. Crear Interaccions
        i1 = Interaccio(
            deal_id=d1.id, 
            tipus="nota", 
            contingut="Deal inicial creat automàticament (Seed)",
            metadata_json={"origen": "seed_db"}
        )
        session.add(i1)

        await session.commit()
        print("✅ Dades inserides correctament al nou esquema.")

if __name__ == "__main__":
    asyncio.run(seed_data())
