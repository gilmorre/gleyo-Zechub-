"""add nonce_created_at to wallets

Revision ID: 0100dffa0f72
Revises: fc073911a772
Create Date: 2026-05-31 10:25:19.380001

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0100dffa0f72'
down_revision = 'fc073911a772'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('wallets', sa.Column('nonce_created_at', sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column('wallets', 'nonce_created_at')