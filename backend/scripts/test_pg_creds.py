import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def test_conn(user, pwd):
    url = f"postgresql+asyncpg://{user}:{pwd}@localhost:5432/postgres"
    print(f"Testing {user}...")
    engine = create_async_engine(url)
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            print(f"SUCCESS with {user}:{pwd}")
            return True
    except Exception as e:
        print(f"Failed {user}: {e}")
        return False
    finally:
        await engine.dispose()

async def main():
    creds = [
        ("postgres", "postgres"),
        ("user", "password"),
        ("postgres", ""),
    ]
    for u, p in creds:
        if await test_conn(u, p):
            break

if __name__ == "__main__":
    asyncio.run(main())
