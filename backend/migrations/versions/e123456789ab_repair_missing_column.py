"""Repair missing trade_type column

Revision ID: e123456789ab
Revises: d123456789ab
Create Date: 2025-11-26 23:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = 'e123456789ab'
down_revision: Union[str, Sequence[str], None] = 'd123456789ab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns('holdings')]
    
    if 'trade_type' not in columns:
        # Create enum if not exists
        trade_type = postgresql.ENUM('buy', 'sell', name='tradetype')
        try:
            trade_type.create(bind)
        except Exception:
            pass # Type might already exist

        op.add_column('holdings', sa.Column('trade_type', sa.Enum('buy', 'sell', name='tradetype'), nullable=True))
        
        # Update existing rows to have a default value
        op.execute("UPDATE holdings SET trade_type = 'buy' WHERE trade_type IS NULL")


def downgrade() -> None:
    # This is a repair script, so downgrade does nothing to avoid conflict with the previous migration
    pass
