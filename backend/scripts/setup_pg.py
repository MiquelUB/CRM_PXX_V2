import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

async def create_db_if_not_exists():
    # Connect to 'postgres' to create 'crm_pxx_v2'
    url = os.getenv("DATABASE_URL")
    base_url = url.rsplit('/', 1)[0] + '/postgres'
    
    print(f"Connecting to: {base_url}")
    engine = create_async_engine(base_url, isolation_level="AUTOCOMMIT")
    try:
        async with engine.connect() as conn:
            await conn.execute(text("CREATE DATABASE crm_pxx_v2"))
            print("Database 'crm_pxx_v2' created.")
    except Exception as e:
        print(f"Note: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_db_if_not_exists())
