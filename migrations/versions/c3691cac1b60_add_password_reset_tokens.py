"""add password reset tokens

Revision ID: c3691cac1b60
Revises: 21fe47d00882
Create Date: 2026-03-20 17:49:01.766889

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c3691cac1b60'
down_revision = '21fe47d00882'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', sa.Integer(), primary_key=True),

        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),

        sa.Column('token', sa.String(length=120), nullable=False, unique=True),

        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),

        sa.Column('used', sa.Boolean(), nullable=False, server_default=sa.false())
    )

    # optional index (recommended)
    op.create_index('ix_password_reset_token', 'password_reset_tokens', ['token'], unique=True)


def downgrade():
    op.drop_index('ix_password_reset_token', table_name='password_reset_tokens')
    op.drop_table('password_reset_tokens')