import asyncio
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker
from database import engine
from models import Municipi, Contacte, Deal, Interaccio

async def seed_data():
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
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

        # 4. Crear Interaccions (Espai Agentic / Notes)
        i1 = Interaccio(
            deal_id=d1.id, 
            tipus="nota", 
            contingut="Deal inicial creat automàticament",
            metadata_json={"origen": "seed_db"}
        )
        session.add(i1)

        await session.commit()
        print("✅ Dades inserides correctament al nou esquema.")

if __name__ == "__main__":
    asyncio.run(seed_data())
