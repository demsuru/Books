"""reset_scores_to_null

Revision ID: bfb93d4dfdfb
Revises: ee298621c363
Create Date: 2026-05-03 21:24:46.695370

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bfb93d4dfdfb'
down_revision: Union[str, Sequence[str], None] = 'ee298621c363'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE user_book_association SET score = NULL")


def downgrade() -> None:
    pass  # data loss is intentional; no rollback
