"""add user_two_factor

Revision ID: 21fe47d00882
Revises: e77444c57ae7
Create Date: 2026-05-31 14:17:41.091007

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '21fe47d00882'
down_revision = 'e77444c57ae7'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'user_two_factor',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('secret', sa.String(length=32), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), nullable=True),
        sa.Column('backup_codes', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id')
    )


def downgrade():
    op.drop_table('user_two_factor')