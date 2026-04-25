import asyncio
from sqlmodel import Session, select
from database import engine, init_db, async_session_maker
from models import Municipi, Deal

async def seed():
    await init_db()
    async with async_session_maker() as session:
        # Check if already seeded
        statement = select(Municipi)
        result = await session.execute(statement)
        if result.first():
            print("Database already seeded.")
            return

        print("Seeding database...")
        m1 = Municipi(codi_ine="08019", nom="Barcelona")
        m2 = Municipi(codi_ine="17079", nom="Girona")
        
        session.add(m1)
        session.add(m2)
        await session.commit()
        await session.refresh(m1)
        await session.refresh(m2)
        
        d1 = Deal(municipi_id=m1.id, estat_kanban="Contactat", pla_assignat="Pla Pro")
        session.add(d1)
        await session.commit()
        
        print("Seeding complete.")

if __name__ == "__main__":
    asyncio.run(seed())
