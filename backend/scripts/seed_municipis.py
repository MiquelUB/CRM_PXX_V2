import asyncio
import json
import os
from database import get_session_context
from models import Municipi
from sqlmodel import select

async def seed_municipis():
    """Seed de municipis des d'un fitxer JSON o llista estàtica."""
    # En un cas real, podríem descarregar el JSON d'OpenData Catalunya
    # Per ara, definim una mostra representativa de les 4 províncies
    municipis_data = [
        {"codi_ine": "08019", "nom": "Barcelona"},
        {"codi_ine": "17079", "nom": "Girona"},
        {"codi_ine": "25120", "nom": "Lleida"},
        {"codi_ine": "43148", "nom": "Tarragona"},
        {"codi_ine": "08121", "nom": "Mataró"},
        {"codi_ine": "08245", "nom": "Sabadell"},
        {"codi_ine": "08279", "nom": "Terrassa"},
        {"codi_ine": "08015", "nom": "Badalona"},
        {"codi_ine": "08101", "nom": "L'Hospitalet de Llobregat"},
        {"codi_ine": "17066", "nom": "Figueres"},
        {"codi_ine": "25040", "nom": "Balaguer"},
        {"codi_ine": "43123", "nom": "Reus"}
    ]

    print(f"Iniciant seed de {len(municipis_data)} municipis...")

    async with get_session_context() as session:
        for m_data in municipis_data:
            # Comprovem si ja existeix per evitar errors de clau primària
            statement = select(Municipi).where(Municipi.codi_ine == m_data["codi_ine"])
            result = await session.execute(statement)
            existing = result.scalar_one_or_none()
            
            if not existing:
                municipi = Municipi(**m_data)
                session.add(municipi)
                print(f"Afegit: {m_data['nom']}")
            else:
                print(f"Saltat (ja existeix): {m_data['nom']}")
        
        await session.commit()
        print("Seed completat amb èxit.")

if __name__ == "__main__":
    asyncio.run(seed_municipis())
