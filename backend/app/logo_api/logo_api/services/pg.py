import logging
from typing import Optional

import asyncpg

from logo_api.models import Logo


LOGGER = logging.getLogger(__name__)


async def insert_logo(conn: asyncpg.Connection, logo: Logo) -> None:
    await conn.execute(f'''INSERT INTO logo (id, created_by, is_public) VALUES ('{logo.id}', '{logo.created_by}', {logo.is_public})''')


async def get_logo_ids_by_user(conn: asyncpg.Connection, created_by: str, public: Optional[bool]) -> list[str]:
    stmt = f'''SELECT id FROM logo WHERE created_by = '{created_by}' '''
    if public is not None:
        stmt += f''' and is_public = {public} '''
    # stmt += ' ORDER BY created_at desc'
    records = await conn.fetch(stmt)
    return [record[0] for record in records]


async def delete_logo(conn: asyncpg.Connection, logo_id: str) -> None:
    stmt = f'''DELETE FROM logo WHERE id = '{logo_id}' '''
    await conn.execute(stmt)
