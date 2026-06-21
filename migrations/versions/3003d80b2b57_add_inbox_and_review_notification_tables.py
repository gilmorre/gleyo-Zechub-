"""add inbox and review notification tables

Revision ID: 3003d80b2b57
Revises: 9b5e05cf6418
Create Date: 2026-05-30 15:51:13.275871

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3003d80b2b57'
down_revision = '9b5e05cf6418'
branch_labels = None
depends_on = None


def upgrade():
    # 🔹 Inbox Notifications
    op.create_table(
        'inbox_notifications',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('community_id', sa.Integer(), nullable=False),
        sa.Column('unread_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_updated', sa.DateTime(), nullable=True),

        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['community_id'], ['communities.id'], ondelete='CASCADE'),

        sa.UniqueConstraint('user_id', 'community_id', name='uq_user_community_inbox')
    )

    op.create_index('ix_inbox_user_id', 'inbox_notifications', ['user_id'])
    op.create_index('ix_inbox_community_id', 'inbox_notifications', ['community_id'])


    # 🔹 Review Notifications
    op.create_table(
        'review_notifications',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('community_id', sa.Integer(), nullable=False, unique=True),
        sa.Column('pending_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_updated', sa.DateTime(), nullable=True),

        sa.ForeignKeyConstraint(['community_id'], ['communities.id'], ondelete='CASCADE')
    )

    op.create_index('ix_review_community_id', 'review_notifications', ['community_id'])


def downgrade():
    op.drop_index('ix_review_community_id', table_name='review_notifications')
    op.drop_table('review_notifications')

    op.drop_index('ix_inbox_community_id', table_name='inbox_notifications')
    op.drop_index('ix_inbox_user_id', table_name='inbox_notifications')
    op.drop_table('inbox_notifications')