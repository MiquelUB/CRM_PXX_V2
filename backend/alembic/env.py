import asyncio
import os
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlmodel import SQLModel
from alembic import context
from dotenv import load_dotenv

# Carreguem variables d'entorn (per a consoles que no les tinguin auto-carregades)
load_dotenv()

# Importació de models per al metadata
from models import Municipi, Deal, Contacte, Interaccio, GlobalKnowledge

# Configuració de loggers
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = SQLModel.metadata

def get_url():
    url = os.getenv("DATABASE_URL")
    if not url:
        # Fallback al valor de alembic.ini si no hi ha env var
        url = config.get_main_option("sqlalchemy.url")
    
    # Correcció de protocol per a compatibilitat amb asyncpg
    if url and url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    print(f"--- [ALEMBIC DIAGNOSTIC] ---")
    print(f"Connecting to host: {url.split('@')[-1] if url else 'UNKNOWN'}")
    return url

def run_migrations_offline() -> None:
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

async def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = get_url()
    
    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()

if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())

