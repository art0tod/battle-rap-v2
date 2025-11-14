import { runMigrations } from '../src/db/migrations.js';
import { logger } from '../src/lib/logger.js';

async function main() {
  logger.info('Running migrations');
  await runMigrations();
  logger.info('Migrations complete');
}

main().catch((err) => {
  logger.error({ err }, 'Migration failed');
  process.exitCode = 1;
});
