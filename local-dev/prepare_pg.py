import asyncio
import logging

import asyncpg


logging.basicConfig(level=logging.INFO)
LOGGER = logging.getLogger(__name__)


async def create_tables() -> None:
    pg_pool = await asyncpg.create_pool(
        min_size=10,
        max_size=100,
        loop=asyncio.get_running_loop(),
        host='localhost',
        port='5433',
        user='logo_pg_user',
        password='logo_pg_pass',
        database='logodb',
    )

    stmt = '''
    create table if not exists logo 
    (
        id varchar not null primary key,
        created_by varchar,
        is_public  boolean default true not null,
        created_at timestamp default now()
    );
    '''

    async with pg_pool.acquire() as conn:  # type: asyncpg.Connection
        await conn.execute(stmt)

    LOGGER.info('Created tables successfully')


if __name__ == '__main__':
    asyncio.run(create_tables())
