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
    
    # Configuració IMAP (A treure d'env vars en producció)
    imap_config = {
        'host': os.getenv('IMAP_HOST', 'mail.cdmon.com'),
        'user': os.getenv('IMAP_USER', 'crm@antigravity.cat'),
        'password': os.getenv('IMAP_PASS', 'secret_pass')
    }

    while True:
        try:
            async with get_session_context() as session:
                # Obtenim tots els deals que necessiten seguiment (no tancats)
                statement = select(Deal).where(Deal.estat != "tancat")
                result = await session.execute(statement)
                deals = result.scalars().all()
                
                for deal in deals:
                    logger.info(f"Sincronitzant emails per al Deal {deal.id}...")
                    await run_mail_sync(session, deal.id, imap_config)
            
            # Esperem 10 minuts abans de la següent passada
            logger.info("Passada de sincronització completada. Esperant 10 minuts...")
            await asyncio.sleep(600)
            
        except Exception as e:
            logger.error(f"Error en el bucle del worker: {str(e)}")
            await asyncio.sleep(60) # Espera curta en cas d'error de xarxa/DB

if __name__ == "__main__":
    asyncio.run(worker_loop())
