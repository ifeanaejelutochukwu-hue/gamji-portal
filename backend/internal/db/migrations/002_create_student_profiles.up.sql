CREATE TABLE IF NOT EXISTS student_profiles (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name     TEXT NOT NULL,
    reg_number    TEXT NOT NULL UNIQUE,
    program       TEXT NOT NULL,
    year_of_study INT NOT NULL DEFAULT 1,
    level         INT NOT NULL DEFAULT 100,
    status        TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','graduated','suspended','pending')),
    email         TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_profiles_auth_id ON student_profiles(auth_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_reg_number ON student_profiles(reg_number);
