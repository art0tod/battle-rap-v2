BEGIN;

CREATE TABLE IF NOT EXISTS challenge_match (
  challenge_id UUID PRIMARY KEY REFERENCES challenge(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES round(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES match(id) ON DELETE CASCADE,
  initiator_participant_id UUID NOT NULL REFERENCES tournament_participant(id) ON DELETE CASCADE,
  opponent_participant_id UUID NOT NULL REFERENCES tournament_participant(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenge_match_match ON challenge_match(match_id);

COMMIT;
