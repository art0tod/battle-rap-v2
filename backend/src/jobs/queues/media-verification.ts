import { Queue } from 'bullmq';
import { createRedisConnection } from '../../lib/redis.js';

export interface MediaVerificationJobData {
  assetId: string;
  storageKey: string;
  expectedSize: number;
}

export const MEDIA_VERIFICATION_QUEUE_NAME = 'media-verification';

let queue: Queue<MediaVerificationJobData> | null = null;

const defaultJobOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential' as const,
    delay: 2000,
  },
  removeOnComplete: 100,
  removeOnFail: 500,
};

const getQueue = () => {
  if (!queue) {
    queue = new Queue<MediaVerificationJobData>(MEDIA_VERIFICATION_QUEUE_NAME, {
      connection: createRedisConnection(),
      defaultJobOptions,
    });
  }
  return queue;
};

export const enqueueMediaVerificationJob = async (data: MediaVerificationJobData) => {
  const q = getQueue();
  await q.add('verify-media', data);
};

export const shutdownMediaVerificationQueue = async () => {
  if (queue) {
    await queue.close();
    queue = null;
  }
};
