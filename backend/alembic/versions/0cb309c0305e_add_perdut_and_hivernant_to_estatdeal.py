"""Add Perdut and Hivernant to EstatDeal

Revision ID: 0cb309c0305e
Revises: da32a1c8cd7e
Create Date: 2026-07-16 11:23:59.582628

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = '0cb309c0305e'
down_revision = 'da32a1c8cd7e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 0% Risk data loss native append-only Enum modification
    # Commit connection is required to ALTER TYPE in Postgres
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE estatdeal ADD VALUE IF NOT EXISTS 'Perdut'")
        op.execute("ALTER TYPE estatdeal ADD VALUE IF NOT EXISTS 'Hivernant'")

def downgrade() -> None:
    pass
