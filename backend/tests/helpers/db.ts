import { pool } from '../../src/db/pool.js';
import { ensureRedis, redis } from '../../src/lib/redis.js';

export async function resetDatabase() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name <> 'schema_migrations'
      ORDER BY table_name
    `);

    if (rows.length > 0) {
      const tableList = rows.map((row) => `"${row.table_name}"`).join(', ');
      await client.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
    }

    await client
      .query(`SELECT refresh_public_views()`)
      .catch(() => undefined);
  } finally {
    client.release();
  }
}

export async function resetRedis() {
  await ensureRedis();
  await redis.flushall();
}
