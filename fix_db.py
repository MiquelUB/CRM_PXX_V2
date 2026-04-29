import asyncio
import os
from sqlalchemy import text
from database import engine

async def main():
    print("--- INICIANT REPARACIÓ ---")
    print(f"🔗 Variables d'entorn DATABASE_URL: {os.getenv('DATABASE_URL')}")
    print(f"🔗 Motor SQLAlchemy connectat a: {engine.url}")
    
    try:
        async with engine.begin() as conn:
            print("🛠️ Injectant columnes a 'deal'...")
            await conn.execute(text("ALTER TABLE deal ADD COLUMN IF NOT EXISTS proper_pas VARCHAR;"))
            await conn.execute(text("ALTER TABLE deal ADD COLUMN IF NOT EXISTS data_seguiment TIMESTAMP;"))
            
            print("🛠️ Creant taula 'calendari_event'...")
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
        print("✅ DDL Executat i Comitejat correctament.")
    except Exception as e:
        print(f"❌ ERROR CRÍTIC DURANT L'EXECUCIÓ: {e}")

if __name__ == "__main__":
    asyncio.run(main())