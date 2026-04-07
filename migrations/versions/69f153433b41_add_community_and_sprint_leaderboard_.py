"""Add community and sprint leaderboard tables

Revision ID: 69f153433b41
Revises: c40af277c430
Create Date: 2026-03-09

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = "69f153433b41"
down_revision = "c40af277c430"
branch_labels = None
depends_on = None


def upgrade():

    op.create_table(
        "community_user_xp",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("community_id", sa.Integer(), sa.ForeignKey("communities.id"), nullable=False),
        sa.Column("xp", sa.Integer(), nullable=False, server_default="0"),

        sa.UniqueConstraint(
            "user_id",
            "community_id",
            name="unique_user_community_xp"
        )
    )


    op.create_table(
        "sprint_user_xp",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("community_id", sa.Integer(), sa.ForeignKey("communities.id"), nullable=False),
        sa.Column("sprint_id", sa.Integer(), sa.ForeignKey("sprints.id"), nullable=False),
        sa.Column("xp", sa.Integer(), nullable=False, server_default="0"),

        sa.UniqueConstraint(
            "user_id",
            "sprint_id",
            name="unique_user_sprint_xp"
        )
    )


def downgrade():

    op.drop_table("sprint_user_xp")
    op.drop_table("community_user_xp")