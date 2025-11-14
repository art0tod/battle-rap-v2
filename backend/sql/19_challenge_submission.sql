BEGIN;

CREATE TABLE IF NOT EXISTS challenge_submission (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  audio_id     UUID NOT NULL REFERENCES media_asset(id),
  description  TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_challenge_submission UNIQUE (challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_submission_challenge ON challenge_submission(challenge_id);

COMMIT;
