import { randomUUID } from 'node:crypto';
import { CreateBucketCommand, HeadBucketCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { pool } from '../db/pool.js';
import { env } from '../config/env.js';
import { AppError, mapDbError } from '../lib/errors.js';
import { s3 } from '../lib/s3.js';
import { enqueueMediaVerificationJob } from '../jobs/queues/media-verification.js';

let ensureBucketPromise: Promise<void> | null = null;

const ensureBucketExists = async () => {
  if (!ensureBucketPromise) {
    ensureBucketPromise = (async () => {
      try {
        await s3.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
      } catch (error: any) {
        const status = error?.$metadata?.httpStatusCode;
        if (status === 404) {
          await s3.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET }));
          return;
        }
        ensureBucketPromise = null;
        throw new AppError({ status: 500, code: 'bucket_check_failed', message: 'Не удалось проверить бакет для загрузки.' });
      }
    })();
  }
  return ensureBucketPromise;
};

const allowedAudioMimes = new Set(
  env.ALLOWED_AUDIO_MIME.split(',').map((s) => s.trim()).filter(Boolean),
);

export const createPresignedUpload = async (params: { filename: string; mime: string; sizeBytes: number; type: 'audio' | 'image' }) => {
  if (params.type === 'audio') {
    if (params.sizeBytes > env.MAX_AUDIO_SIZE_BYTES) {
      throw new AppError({ status: 400, code: 'audio_too_large', message: 'Audio file exceeds max size.' });
    }
    if (!allowedAudioMimes.has(params.mime)) {
      throw new AppError({ status: 400, code: 'audio_mime_not_allowed', message: 'Audio MIME type not allowed.' });
    }
  }
  await ensureBucketExists();
  const assetId = randomUUID();
  const storageKey = `${assetId}/${encodeURIComponent(params.filename)}`;

  const putCommand = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: storageKey,
    ContentType: params.mime,
    ContentLength: params.sizeBytes,
  });
  // Use a signing client pointed at public CDN host so the browser can reach it
  const signer = new S3Client({
    region: env.S3_REGION,
    endpoint: env.CDN_BASE_URL,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY,
    },
  });
  const url = await getSignedUrl(signer, putCommand, { expiresIn: 900 });

  return {
    assetId,
    storageKey,
    uploadUrl: url,
    headers: {
      'Content-Type': params.mime,
    },
  };
};

export const markUploadComplete = async (params: { assetId: string; storageKey: string; kind: 'audio' | 'image'; mime: string; sizeBytes: number }) => {
  try {
    const { rows } = await pool.query(
      `INSERT INTO media_asset(id, kind, storage_key, mime, size_bytes, status, created_at)
       VALUES ($1,$2,$3,$4,$5,'pending',now())
       ON CONFLICT (id) DO UPDATE
       SET storage_key = EXCLUDED.storage_key,
           mime = EXCLUDED.mime,
           size_bytes = EXCLUDED.size_bytes,
           status = 'pending'
       RETURNING id, status`,
      [params.assetId, params.kind, params.storageKey, params.mime, params.sizeBytes]
    );
    const asset = rows[0];
    await enqueueMediaVerificationJob({
      assetId: asset.id,
      storageKey: params.storageKey,
      expectedSize: params.sizeBytes,
    });
    await tryImmediateVerification(asset.id, params.storageKey);
    return getMediaAssetStatus(asset.id);
  } catch (err) {
    throw mapDbError(err);
  }
};

const tryImmediateVerification = async (assetId: string, storageKey: string) => {
  try {
    await s3.send(
      new HeadObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: storageKey,
      })
    );
    await pool.query('UPDATE media_asset SET status = $2 WHERE id = $1', [assetId, 'ready']);
    return true;
  } catch {
    return false;
  }
};

export const resolveCdnUrl = (storageKey: string) => `${env.CDN_BASE_URL}/${storageKey}`;
export const getMediaAssetStatus = async (assetId: string) => {
  try {
    const { rows } = await pool.query<{ id: string; status: string }>('SELECT id, status FROM media_asset WHERE id = $1', [assetId]);
    if (!rows[0]) {
      throw new AppError({ status: 404, code: 'media_not_found', message: 'Media asset not found.' });
    }
    return rows[0];
  } catch (err) {
    throw mapDbError(err);
  }
};
