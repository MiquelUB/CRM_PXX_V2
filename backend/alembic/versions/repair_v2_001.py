"""repair_schema_v2_final

Revision ID: repair_v2_001
Revises: 
Create Date: 2026-04-28 21:42:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision = 'repair_v2_001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Només afegim el que falta o pot fallar
    # 1. Crear calendari_event (si no existeix)
    # Use try-except style with SQL checks
    op.execute("""
    CREATE TABLE IF NOT EXISTS calendari_event (
        id SERIAL PRIMARY KEY,
        deal_id INTEGER NOT NULL REFERENCES deal(id),
        municipi_id INTEGER REFERENCES municipi(id),
        data_inici TIMESTAMP WITH TIME ZONE NOT NULL,
        data_fi TIMESTAMP WITH TIME ZONE,
        tipus VARCHAR NOT NULL,
        descripcio VARCHAR,
        completat BOOLEAN NOT NULL DEFAULT FALSE,
        es_tasca BOOLEAN NOT NULL DEFAULT FALSE
    );
    """)
    
    # 2. Afegir columnes a deal (ignorar si ja existeixen)
    op.execute("ALTER TABLE deal ADD COLUMN IF NOT EXISTS proper_pas TEXT;")
    op.execute("ALTER TABLE deal ADD COLUMN IF NOT EXISTS data_seguiment TIMESTAMP WITH TIME ZONE;")

def downgrade() -> None:
    pass
