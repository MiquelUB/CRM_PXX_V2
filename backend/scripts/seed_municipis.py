import csv
import os
import sys
import asyncio
from sqlmodel import select

# Ajustem el path per poder importar els mòduls del projecte
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_session_context
from models import Municipi

CSV_PATH = os.path.join(os.path.dirname(__file__), "dades_municipis.csv")

async def seed_municipis():
    """Seed de municipis des d'un fitxer CSV oficial de forma idempotent."""
    if not os.path.exists(CSV_PATH):
        print(f"CRÍTIC: No s'ha trobat el fitxer CSV a {CSV_PATH}")
        sys.exit(1)

    print(f"Iniciant seeding des de {CSV_PATH}...")

    async with get_session_context() as session:
        nous = 0
        saltats = 0
        errors = 0
        
        with open(CSV_PATH, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f) # Espera columnes: codi_ine, nom
            for row in reader:
                try:
                    codi = row['codi_ine'].strip()
                    nom = row['nom'].strip()
                    
                    # Comprovació d'idempotència estricta
                    statement = select(Municipi).where(Municipi.codi_ine == codi)
                    result = await session.execute(statement)
                    existing = result.scalar_one_or_none()
                    
                    if not existing:
                        municipi = Municipi(codi_ine=codi, nom=nom)
                        session.add(municipi)
                        nous += 1
                        if nous % 100 == 0:
                            print(f"Processats {nous} municipis nous...")
                    else:
                        saltats += 1
                except Exception as e:
                    print(f"Error processant {row.get('nom', 'desconegut')}: {e}")
                    errors += 1
        
        await session.commit()
        print(f"\n--- Resultat del Seeding ---")
        print(f"Nous municipis afegits: {nous}")
        print(f"Municipis ja existents (saltats): {saltats}")
        print(f"Errors trobats: {errors}")
        print(f"---------------------------\n")

if __name__ == "__main__":
    asyncio.run(seed_municipis())
