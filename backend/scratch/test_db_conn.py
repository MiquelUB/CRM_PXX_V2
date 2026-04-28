import asyncio
import asyncpg
import os
from dotenv import load_dotenv

async def test_conn():
    load_dotenv()
    url = os.getenv("DATABASE_URL")
    if url and url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgresql://", 1)
    print(f"Testing connection to: {url}")
    try:
        conn = await asyncpg.connect(url)
        print("Connected successfully!")
        await conn.close()
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_conn())
