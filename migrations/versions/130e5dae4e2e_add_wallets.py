from alembic import op
import sqlalchemy as sa


revision = '130e5dae4e2e'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():

    op.create_table(
        "community_wallets",
        sa.Column("id", sa.Integer(), primary_key=True),

        sa.Column(
            "community_id",
            sa.Integer(),
            sa.ForeignKey("communities.id"),
            nullable=False,
            unique=True
        ),

        sa.Column("available_balance", sa.BigInteger(), nullable=True, server_default="0"),
        sa.Column("locked_balance", sa.BigInteger(), nullable=True, server_default="0"),

        sa.Column("currency", sa.String(length=10), nullable=True, server_default="USD"),

        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )


    op.create_table(
        "community_wallet_transactions",
        sa.Column("id", sa.Integer(), primary_key=True),

        sa.Column(
            "wallet_id",
            sa.Integer(),
            sa.ForeignKey("community_wallets.id"),
            nullable=False
        ),

        sa.Column("amount", sa.BigInteger(), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=True),
        sa.Column("reference", sa.String(length=120), nullable=True),

        sa.Column("created_at", sa.DateTime(), nullable=True),
    )


def downgrade():
    op.drop_table("community_wallet_transactions")
    op.drop_table("community_wallets")