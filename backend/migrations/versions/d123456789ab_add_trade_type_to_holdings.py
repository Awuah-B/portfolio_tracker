"""Add trade_type to holdings

Revision ID: d123456789ab
Revises: c919bccfadcc
Create Date: 2025-11-26 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'd123456789ab'
down_revision: Union[str, Sequence[str], None] = 'c919bccfadcc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the enum type first if it doesn't exist
    # Note: In PostgreSQL, enums are types. We need to create it.
    # However, SQLAlchemy's Enum type usually handles this if configured correctly.
    # But for raw Alembic, we might need to be explicit or use a VARCHAR fallback.
    # Let's use VARCHAR for simplicity and compatibility, or try to create the type.
    
    # Check if type exists (optional, but good practice)
    # For simplicity in this environment, we'll assume it doesn't exist or use VARCHAR.
    # But wait, the model uses Enum(TradeType).
    
    # Let's try to create the enum type.
    trade_type = postgresql.ENUM('buy', 'sell', name='tradetype')
    try:
        trade_type.create(op.get_bind())
    except Exception:
        pass # Type might already exist

    op.add_column('holdings', sa.Column('trade_type', sa.Enum('buy', 'sell', name='tradetype'), nullable=True))
    
    # Update existing rows to have a default value (optional, but good)
    op.execute("UPDATE holdings SET trade_type = 'buy' WHERE trade_type IS NULL")


def downgrade() -> None:
    op.drop_column('holdings', 'trade_type')
    # We generally don't drop the Enum type in downgrade as other tables might use it,
    # but here only holdings uses it.
    trade_type = postgresql.ENUM('buy', 'sell', name='tradetype')
    trade_type.drop(op.get_bind())
