CREATE TABLE IF NOT EXISTS payments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    amount     NUMERIC(12,2) NOT NULL,
    purpose    TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid','pending','overdue')),
    reference  TEXT NOT NULL UNIQUE DEFAULT 'REF-' || upper(substring(gen_random_uuid()::text FROM 1 FOR 8)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
