import logging
from typing import Optional

import asyncpg

from logo_api.models import Logo


LOGGER = logging.getLogger(__name__)


async def insert_logo(conn: asyncpg.Connection, logo: Logo) -> None:
    await conn.execute(f'''
    INSERT INTO
        logo (id, created_by, is_public)
        VALUES ($1, $2, $3)
    ''', logo.id, logo.created_by, logo.is_public)


async def get_logo_ids_by_user(conn: asyncpg.Connection, created_by: str, public: Optional[bool]) -> list[str]:
    raw_stmt = '''SELECT id FROM logo WHERE created_by = $1 '''
    if public is not None:
        raw_stmt += f''' and is_public = {public} '''
    raw_stmt += ' ORDER BY created_at desc'

    prep_stmt = await conn.prepare(raw_stmt)
    records = await prep_stmt.fetch(created_by)
    return [record[0] for record in records]


async def delete_logo(conn: asyncpg.Connection, logo_id: str) -> None:
    stmt = '''DELETE FROM logo WHERE id = $1 '''
    await conn.execute(stmt, logo_id)
