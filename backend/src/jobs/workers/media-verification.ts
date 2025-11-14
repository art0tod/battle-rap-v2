import { Worker } from 'bullmq';
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { MEDIA_VERIFICATION_QUEUE_NAME, MediaVerificationJobData } from '../queues/media-verification.js';
import { createRedisConnection } from '../../lib/redis.js';
import { s3 } from '../../lib/s3.js';
import { env } from '../../config/env.js';
import { pool, closePool } from '../../db/pool.js';
import { logger } from '../../lib/logger.js';

const concurrency = Number(process.env.MEDIA_WORKER_CONCURRENCY ?? '3');

const worker = new Worker<MediaVerificationJobData>(
  MEDIA_VERIFICATION_QUEUE_NAME,
  async (job) => {
    const { assetId } = job.data;
    const { rows } = await pool.query<{ id: string; storage_key: string; size_bytes: string }>(
      'SELECT id, storage_key, size_bytes FROM media_asset WHERE id = $1',
      [assetId]
    );
    const asset = rows[0];
    if (!asset) {
      job.log(`Asset ${assetId} not found, skipping.`);
      return;
    }

    const expectedSize = Number(asset.size_bytes);
    const storageKey = asset.storage_key;
    const head = await s3.send(
      new HeadObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: storageKey,
      })
    );
    if (typeof head.ContentLength !== 'number') {
      throw new Error(`Unable to determine remote size for asset ${assetId}`);
    }
    if (!Number.isNaN(expectedSize) && expectedSize !== head.ContentLength) {
      throw new Error(`Size mismatch for asset ${assetId}: expected ${expectedSize}, got ${head.ContentLength}`);
    }

    await pool.query('UPDATE media_asset SET status = $2 WHERE id = $1', [assetId, 'ready']);
    job.log(`Asset ${assetId} marked as ready.`);
    return { assetId, status: 'ready' };
  },
  {
    connection: createRedisConnection(),
    concurrency,
  }
);

worker.on('failed', (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      assetId: job?.data.assetId,
      err,
    },
    'Media verification job failed'
  );
});

worker.on('completed', (job) => {
  logger.debug({ jobId: job.id, assetId: job.data.assetId }, 'Media verification completed');
});

const shutdown = async () => {
  logger.info('Shutting down media verification worker');
  await worker.close();
  await closePool();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
