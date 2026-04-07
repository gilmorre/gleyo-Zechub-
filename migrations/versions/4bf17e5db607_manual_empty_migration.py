"""manual empty migration

Revision ID: 4bf17e5db607
Revises: 130e5dae4e2e
Create Date: 2026-03-04 06:22:58.028429

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4bf17e5db607'
down_revision = '130e5dae4e2e'
branch_labels = None
depends_on = None
 
def upgrade():
    # Create early_access_application table
    op.create_table(
        'early_access_application',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(length=120), nullable=True),
        sa.Column('email', sa.String(length=120), nullable=True),
        sa.Column('community_name', sa.String(length=120), nullable=True),
        sa.Column('community_link', sa.String(length=255), nullable=True),
        sa.Column('community_size', sa.String(length=50), nullable=True),
        sa.Column('problem', sa.Text(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'])
    )

    # Create pro_waitlist table
    op.create_table(
        'pro_waitlist',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('email', sa.String(length=120), nullable=True),
        sa.Column('community_name', sa.String(length=120), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.UniqueConstraint('email')
    )


def downgrade():
    op.drop_table('pro_waitlist')
    op.drop_table('early_access_application')