"""Initial V2 Schema

Revision ID: f02c213a3580
Revises: None
Create Date: 2026-04-25 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = 'f02c213a3580'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Crear Enum per a l'estat del Deal de forma idempotent
    op.execute("""
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estatdeal') THEN
                CREATE TYPE estatdeal AS ENUM ('NOU', 'CONTACTAT', 'DEMO', 'PROPOSTA', 'TANCAT');
            END IF;
        END $$;
    """)

    # 2. Taula MUNICIPI
    op.create_table(
        'municipi',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('codi_ine', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('nom', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('adreca_fisica', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('email_general', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('telefon_general', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.create_index(op.f('ix_municipi_codi_ine'), 'municipi', ['codi_ine'], unique=True)

    # 3. Taula CONTACTE
    op.create_table(
        'contacte',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('municipi_id', sa.Integer(), nullable=False),
        sa.Column('nom', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('carrec', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('email', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('telefon', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.ForeignKeyConstraint(['municipi_id'], ['municipi.id'], ),
    )

    # 4. Taula DEAL
    op.create_table(
        'deal',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('municipi_id', sa.Integer(), nullable=False),
        sa.Column('pla_assignat', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('estat_kanban', sa.Enum('NOU', 'CONTACTAT', 'DEMO', 'PROPOSTA', 'TANCAT', name='estatdeal'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.ForeignKeyConstraint(['municipi_id'], ['municipi.id'], ),
    )

    # 5. Taula INTERACCIO
    op.create_table(
        'interaccio',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('deal_id', sa.Integer(), nullable=False),
        sa.Column('tipus', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('contingut', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('data_creacio', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['deal_id'], ['deal.id'], ),
    )


def downgrade() -> None:
    op.drop_table('interaccio')
    op.drop_table('deal')
    op.drop_table('contacte')
    op.drop_table('municipi')
    op.execute("DROP TYPE estatdeal")
