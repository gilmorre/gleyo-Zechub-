"""allow emoji image_path null

Revision ID: 1a6bbca10b49
Revises: c3691cac1b60
Create Date: 2026-03-20 23:49:30.121437

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1a6bbca10b49'
down_revision = 'c3691cac1b60'
branch_labels = None
depends_on = None



def upgrade():
    with op.batch_alter_table('community_emojis', schema=None) as batch_op:
        batch_op.alter_column(
            'image_path',
            existing_type=sa.String(length=255),
            nullable=True
        )

def downgrade():
    with op.batch_alter_table('community_emojis', schema=None) as batch_op:
        batch_op.alter_column(
            'image_path',
            existing_type=sa.String(length=255),
            nullable=False
        )