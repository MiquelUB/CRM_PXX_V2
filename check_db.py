from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv("d:\\ProjectXX\\CRM_PXX_V2\\backend\\.env")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/crm_pxx_v2")
sync_url = DATABASE_URL.replace("postgresql+asyncpg", "postgresql")

try:
    engine = create_engine(sync_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    res_m = db.execute(text("SELECT count(*) FROM municipi")).scalar()
    res_d = db.execute(text("SELECT count(*) FROM deal")).scalar()
    res_c = db.execute(text("SELECT count(*) FROM contacte")).scalar()
    res_i = db.execute(text("SELECT count(*) FROM interaccio")).scalar()
    
    print(f"Municipis: {res_m}")
    print(f"Deals: {res_d}")
    print(f"Contactes: {res_c}")
    print(f"Interaccions: {res_i}")

except Exception as e:
    print(f"Database connection or query failed: {e}")
