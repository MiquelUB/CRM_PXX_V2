import asyncio
import os
import logging
from database import get_session_context # Suposem que tenim un context manager per a la sessió
from services.mail import run_mail_sync
from sqlmodel import select
from models import Deal

# Configuració de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MailWorker")

async def worker_loop():
    """Bucle infinit per sincronitzar emails de tots els deals actius."""
    logger.info("Iniciant IMAP Mail Worker (Phase C)...")
    
    # Configuració IMAP (Variables d'entorn obligatòries)
    imap_config = {
        'host': os.getenv('IMAP_SERVER'),
        'user': os.getenv('IMAP_USER'),
        'password': os.getenv('IMAP_PASS')
    }

    if not all(imap_config.values()):
        logger.error("Falten variables d'entorn de configuració IMAP (IMAP_SERVER, IMAP_USER, IMAP_PASS)")
        return

    while True:
        try:
            async with get_session_context() as session:
                # Obtenim tots els deals que necessiten seguiment (no tancats)
                statement = select(Deal).where(Deal.estat != "tancat")
                result = await session.execute(statement)
                deals = result.scalars().all()
                
                for deal in deals:
                    # Logging silenciós per defecte (DEBUG)
                    logger.debug(f"Revisant emails per al Deal {deal.id}...")
                    await run_mail_sync(session, deal.id, imap_config)
            
            # Esperem 2 minuts
            logger.debug("Cicle completat. Esperant 120s...")
            await asyncio.sleep(120)
            
        except Exception as e:
            logger.error(f"Error en el bucle del worker: {str(e)}")
            await asyncio.sleep(60) # Espera curta en cas d'error de xarxa/DB

if __name__ == "__main__":
    asyncio.run(worker_loop())
