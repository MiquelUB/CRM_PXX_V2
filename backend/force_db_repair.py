import asyncio
from sqlalchemy import text
# Ajusta la importació segons on tinguis l'engine (pot ser a database.py o main.py)
from database import engine 

async def force_schema():
    print("Connectant a la DB de l'aplicacio...")
    async with engine.begin() as conn:
        print("Creant columna proper_pas...")
        try:
            await conn.execute(text("ALTER TABLE deal ADD COLUMN IF NOT EXISTS proper_pas VARCHAR;"))
        except Exception as e:
            print(f"Error creant proper_pas: {e}")
            
        print("Creant columna data_seguiment...")
        try:
            await conn.execute(text("ALTER TABLE deal ADD COLUMN IF NOT EXISTS data_seguiment TIMESTAMP;"))
        except Exception as e:
            print(f"Error creant data_seguiment: {e}")
        
        print("Creant taula calendari_event...")
        await conn.execute(text("""
        CREATE TABLE IF NOT EXISTS calendari_event (
            id SERIAL PRIMARY KEY,
            deal_id INTEGER REFERENCES deal(id),
            municipi_id INTEGER,
            data_inici TIMESTAMP,
            data_fi TIMESTAMP,
            tipus VARCHAR,
            descripcio TEXT,
            completat BOOLEAN DEFAULT FALSE,
            es_tasca BOOLEAN DEFAULT FALSE
        );
        """))
        print("Reparacio fisica completada amb la connexio nativa!")

if __name__ == "__main__":
    asyncio.run(force_schema())
