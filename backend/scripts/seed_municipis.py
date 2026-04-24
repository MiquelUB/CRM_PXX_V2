import csv
import os
import sys
import asyncio
from sqlalchemy.dialects.postgresql import insert as pg_insert

# Ajustem el path per poder importar els mòduls del projecte
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_session_context
from models import Municipi

CSV_PATH = os.path.join(os.path.dirname(__file__), "dades_municipis.csv")

async def seed_municipis():
    """Seed de municipis massiu i idempotent (Bulk Insert)."""
    if not os.path.exists(CSV_PATH):
        print(f"CRÍTIC: No s'ha trobat el fitxer CSV a {CSV_PATH}")
        sys.exit(1)

    print(f"Iniciant seeding massiu des de {CSV_PATH}...")

    async with get_session_context() as session:
        municipis_data = []
        
        with open(CSV_PATH, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f) # Espera columnes: codi_ine, nom
            for row in reader:
                municipis_data.append({
                    "codi_ine": row['codi_ine'].strip(),
                    "nom": row['nom'].strip()
                })
        
        if municipis_data:
            try:
                # Operació Bulk: Un sol viatge a la BD amb delegació d'idempotència al motor PG
                stmt = pg_insert(Municipi).values(municipis_data)
                stmt = stmt.on_conflict_do_nothing(index_elements=['codi_ine'])
                
                await session.execute(stmt)
                await session.commit()
                print(f"✅ Seeding massiu completat amb èxit. {len(municipis_data)} municipis processats.")
            except Exception as e:
                print(f"❌ Error crític en l'operació massiva: {e}")
                await session.rollback()

if __name__ == "__main__":
    asyncio.run(seed_municipis())
