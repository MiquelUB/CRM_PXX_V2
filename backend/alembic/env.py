import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlmodel import SQLModel

# Importació obligatòria de models per registrar-los al metadata
from models import Municipi, Deal, Contacte, Interaccio

from alembic import context

# Configuració de loggers des de alembic.ini
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# La font de veritat única: el metadata de SQLModel
target_metadata = SQLModel.metadata

def run_migrations_offline() -> None:
    """Mode offline: genera el SQL sense connectar-se a la BD."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection):
    """Execució de les migracions dins d'una connexió síncrona."""
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

async def run_migrations_online() -> None:
    """Mode online (asíncron): configurat per a PostgreSQL + asyncpg."""
    configuration = config.get_section(config.config_ini_section)
    
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
