BEGIN;

CREATE TABLE IF NOT EXISTS auth_session (
  refresh_jti TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_auth_session_user ON auth_session(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_session_fingerprint ON auth_session(fingerprint);
CREATE INDEX IF NOT EXISTS idx_auth_session_expires_at ON auth_session(expires_at);

COMMIT;
