"""Add unique constraint to EarlyAccessApplication email"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'c40af277c430'
down_revision = '4bf17e5db607'
branch_labels = None
depends_on = None


def upgrade():
    # Make email non-nullable first (if needed)
    with op.batch_alter_table('early_access_application') as batch_op:
        batch_op.alter_column(
            'email',
            existing_type=sa.String(length=120),
            nullable=False
        )

        # Add named unique constraint
        batch_op.create_unique_constraint(
            'uq_early_access_email',
            ['email']
        )


def downgrade():
    with op.batch_alter_table('early_access_application') as batch_op:
        batch_op.drop_constraint(
            'uq_early_access_email',
            type_='unique'
        )

        batch_op.alter_column(
            'email',
            existing_type=sa.String(length=120),
            nullable=True
        )