CREATE TABLE IF NOT EXISTS admission_applications (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name    TEXT NOT NULL,
    email        TEXT NOT NULL,
    phone        TEXT NOT NULL,
    program      TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
