"""add ondelete set null to sprint_id

Revision ID: a6c09911d497
Revises: afa7f4327bbb
Create Date: 2026-05-30 12:16:44.306735

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a6c09911d497'
down_revision = 'afa7f4327bbb'
branch_labels = None
depends_on = None


from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'a6c09911d497'
down_revision = 'afa7f4327bbb'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('subquest', recreate='always') as batch_op:
        batch_op.create_foreign_key(
            'fk_subquest_sprint_id_new',  
            'sprints',
            ['sprint_id'],
            ['id'],
            ondelete='SET NULL'
        )


def downgrade():
    with op.batch_alter_table('subquest', recreate='always') as batch_op:
        batch_op.create_foreign_key(
            'fk_subquest_sprint_id_old',
            'sprints',
            ['sprint_id'],
            ['id']
        )