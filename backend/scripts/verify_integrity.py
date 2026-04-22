import asyncio
import logging
from sqlmodel import select, func
from sqlalchemy.orm import selectinload
from backend.database import async_session_maker
from backend.models import Municipi, Deal, Interaccio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("IntegrityCheck")

async def check_duplicates():
    async with async_session_maker() as session:
        subq = select(Municipi.codi_ine).group_by(Municipi.codi_ine).having(func.count() > 1)
        result = await session.execute(subq)
        if result.all():
            logger.error("🚨 Duplicats detectats!")
            return False
        logger.info("✅ Municipis OK.")
        return True

async def main():
    logger.info("Verificant integritat del CRM...")
    await check_duplicates()

if __name__ == "__main__":
    asyncio.run(main())
