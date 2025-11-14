import { createHash } from 'node:crypto';
import type { FastifyRequest } from 'fastify';

const HEADER_KEYS = ['user-agent', 'accept-language'] as const;

const extractHeaderValue = (value: string | string[] | undefined): string => {
  if (!value) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return value;
};

export function buildRequestFingerprint(request: FastifyRequest): string {
  const components = HEADER_KEYS.map((key) => extractHeaderValue(request.headers[key]));
  const payload = components.join('|') || 'unknown';
  const hash = createHash('sha256');
  hash.update(payload);
  return hash.digest('hex');
}
