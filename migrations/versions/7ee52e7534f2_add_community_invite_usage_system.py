"""add community invite usage system

Revision ID: 7ee52e7534f2
Revises: 69f153433b41
Create Date: 2026-05-31 01:48:37.786330

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7ee52e7534f2'
down_revision = '69f153433b41'
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


revision = 'e77444c57ae7'
down_revision = '69f153433b41'
branch_labels = None
depends_on = None


def upgrade():

 
    op.create_table(
        "community_invite_usage",

        sa.Column("id", sa.Integer(), primary_key=True),

        sa.Column(
            "community_id",
            sa.Integer(),
            sa.ForeignKey("communities.id"),
            nullable=False
        ),

        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),

        sa.Column(
            "invite_count",
            sa.Integer(),
            nullable=False,
            server_default="0"
        ),

        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=True
        ),

        sa.UniqueConstraint(
            "community_id",
            "year",
            "month",
            name="uq_community_invite_month"
        )
    )

    op.create_index(
        "ix_community_invite_usage_community_id",
        "community_invite_usage",
        ["community_id"]
    )

    op.create_index(
        "ix_community_invite_usage_year",
        "community_invite_usage",
        ["year"]
    )

    op.create_index(
        "ix_community_invite_usage_month",
        "community_invite_usage",
        ["month"]
    )


def downgrade():

    op.drop_index("ix_community_invite_usage_month", table_name="community_invite_usage")
    op.drop_index("ix_community_invite_usage_year", table_name="community_invite_usage")
    op.drop_index("ix_community_invite_usage_community_id", table_name="community_invite_usage")

    op.drop_table("community_invite_usage")

    with op.batch_alter_table("communities") as batch_op:
        batch_op.drop_column("invite_limit_per_month")