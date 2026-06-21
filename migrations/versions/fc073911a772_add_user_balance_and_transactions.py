"""add user balance and transactions

Revision ID: fc073911a772
Revises: a6c09911d497
Create Date: 2026-05-27 02:01:15.331347

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fc073911a772'
down_revision = 'a6c09911d497'
branch_labels = None
depends_on = None


def upgrade():
    # 🔹 user_balances table
    op.create_table(
        'user_balances',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), nullable=False, unique=True),
        sa.Column('balance', sa.Numeric(18, 6), nullable=True),
        sa.Column('total_earned', sa.Numeric(18, 6), nullable=True),
        sa.Column('total_withdrawn', sa.Numeric(18, 6), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),

        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )

    # 🔹 user_transactions table
    op.create_table(
        'user_transactions',
        sa.Column('id', sa.Integer(), primary_key=True),

        sa.Column('user_id', sa.Integer(), nullable=False),

        sa.Column('type', sa.String(length=10), nullable=True),
        sa.Column('amount', sa.Numeric(18, 6), nullable=False),

        sa.Column('token', sa.String(length=10), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),

        sa.Column('tx_hash', sa.String(length=128), nullable=True),
        sa.Column('block_number', sa.String(length=50), nullable=True),

        sa.Column('from_address', sa.String(length=128), nullable=True),
        sa.Column('to_address', sa.String(length=128), nullable=True),

        sa.Column('remark', sa.String(length=255), nullable=True),

        sa.Column('community_id', sa.Integer(), nullable=True),

        sa.Column('created_at', sa.DateTime(), nullable=True),

        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['community_id'], ['communities.id'], ondelete='SET NULL'),
    )

    # 🔥 Optional but VERY useful indexes
    op.create_index('ix_user_transactions_user_id', 'user_transactions', ['user_id'])
    op.create_index('ix_user_transactions_created_at', 'user_transactions', ['created_at'])


def downgrade():
    op.drop_index('ix_user_transactions_created_at', table_name='user_transactions')
    op.drop_index('ix_user_transactions_user_id', table_name='user_transactions')

    op.drop_table('user_transactions')
    op.drop_table('user_balances')