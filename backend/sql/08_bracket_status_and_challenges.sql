BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'match_participant_result') THEN
    CREATE TYPE match_participant_result AS ENUM ('active','winner','eliminated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'challenge_status') THEN
    CREATE TYPE challenge_status AS ENUM ('initiated','in_progress','completed','cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'challenge_vote_side') THEN
    CREATE TYPE challenge_vote_side AS ENUM ('initiator','opponent');
  END IF;
END$$;

ALTER TABLE match_participant
  ADD COLUMN IF NOT EXISTS result_status match_participant_result NOT NULL DEFAULT 'active';

CREATE TABLE IF NOT EXISTS challenge (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  description    TEXT,
  initiator_id   UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  opponent_id    UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  status         challenge_status NOT NULL DEFAULT 'initiated',
  audience_goal  INT CHECK (audience_goal IS NULL OR audience_goal >= 0),
  accepted_at    TIMESTAMPTZ,
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  cancelled_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_distinct_participants CHECK (initiator_id <> opponent_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_status ON challenge(status);
CREATE INDEX IF NOT EXISTS idx_challenge_updated_at ON challenge(updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_challenge_pair_active
  ON challenge(LEAST(initiator_id, opponent_id), GREATEST(initiator_id, opponent_id))
  WHERE status IN ('initiated','in_progress');

CREATE TABLE IF NOT EXISTS challenge_vote (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id  UUID NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,
  voter_id      UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  side          challenge_vote_side NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_challenge_vote UNIQUE (challenge_id, voter_id)
);

COMMIT;
