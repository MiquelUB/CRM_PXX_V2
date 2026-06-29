import asyncio
import os
import sys
from pathlib import Path
from sqlalchemy import text

# Add backend directory to sys.path to find database and models modules
backend_dir = str(Path(__file__).resolve().parents[1] / "backend")
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from database import engine

async def check():
    async with engine.begin() as conn:
        try:
            # Let's see if the table exists and what's in it
            res = await conn.execute(text("SELECT * FROM globalknowledge"))
            rows = res.fetchall()
            print("--- GlobalKnowledge rows ---")
            for r in rows:
                print(f"ID: {r[0]}, Key: {r[1]}, Content length: {len(r[2]) if r[2] else 0}")
                print(f"Content snippet: {r[2][:200]}...")
        except Exception as e:
            print(f"Error querying globalknowledge: {e}")

asyncio.run(check())
