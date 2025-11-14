import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

const MIGRATIONS_TABLE = 'schema_migrations';
const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../sql'
);

const defaultLogger = logger.child({ scope: 'migrations' });

export interface RunMigrationsOptions {
  /**
   * Provide an existing PG client to reuse (tests).
   * When omitted, the helper will open and close its own connection.
   */
  client?: pg.Client;
  /**
   * Allow suppressing logs in tests.
   */
  silent?: boolean;
}

export async function runMigrations(options: RunMigrationsOptions = {}) {
  const client =
    options.client ??
    new pg.Client({
      connectionString: env.DATABASE_URL,
    });
  const ownsClient = !options.client;
  const log = options.silent ? null : defaultLogger;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await ensureMigrationsTable(client);
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
      .sort();
    const applied = await getAppliedMigrations(client);
    for (const file of files) {
      if (applied.has(file)) {
        log?.debug({ file }, 'Skipping already applied migration');
        continue;
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await applyMigration(client, file, sql, log);
    }
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }
}

async function ensureMigrationsTable(client: pg.Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(client: pg.Client): Promise<Set<string>> {
  const result = await client.query<{ name: string }>(
    `SELECT name FROM ${MIGRATIONS_TABLE}`
  );
  return new Set(result.rows.map((row) => row.name));
}

async function applyMigration(
  client: pg.Client,
  file: string,
  sql: string,
  log: typeof defaultLogger | null
) {
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(`INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES ($1)`, [
      file,
    ]);
    await client.query('COMMIT');
    log?.info({ file }, 'Migration applied');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
