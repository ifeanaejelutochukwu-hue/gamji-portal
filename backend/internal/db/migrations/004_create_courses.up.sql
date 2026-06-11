CREATE TABLE IF NOT EXISTS courses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        TEXT NOT NULL UNIQUE,
    title       TEXT NOT NULL,
    units       INT NOT NULL CHECK (units >= 1 AND units <= 6),
    level       INT NOT NULL,
    semester    TEXT NOT NULL,
    lecturer_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
    status      TEXT NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_lecturer_id ON courses(lecturer_id);
