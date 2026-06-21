"""add is_active and disconnected_at to wallets

Revision ID: 9b5e05cf6418
Revises: 0100dffa0f72
Create Date: 2026-05-31 11:04:32.855851

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9b5e05cf6418'
down_revision = '0100dffa0f72'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('wallets', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'))
    op.add_column('wallets', sa.Column('disconnected_at', sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column('wallets', 'disconnected_at')
    op.drop_column('wallets', 'is_active')
