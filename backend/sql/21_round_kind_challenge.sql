BEGIN;

ALTER TYPE round_kind ADD VALUE IF NOT EXISTS 'challenge' AFTER 'bracket';

COMMIT;
