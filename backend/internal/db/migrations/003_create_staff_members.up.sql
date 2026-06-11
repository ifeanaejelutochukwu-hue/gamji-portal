CREATE TABLE IF NOT EXISTS staff_members (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name  TEXT NOT NULL,
    email      TEXT NOT NULL UNIQUE,
    phone      TEXT,
    role       TEXT NOT NULL CHECK (role IN ('Admin','Lecturer','Registrar','Bursar','Provost')),
    status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','leave')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_members_auth_id ON staff_members(auth_id);
