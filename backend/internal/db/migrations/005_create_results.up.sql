CREATE TABLE IF NOT EXISTS results (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    course_id  UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    ca_score   NUMERIC(5,2) NOT NULL CHECK (ca_score >= 0 AND ca_score <= 30),
    exam_score NUMERIC(5,2) NOT NULL CHECK (exam_score >= 0 AND exam_score <= 70),
    total      NUMERIC(5,2) NOT NULL,
    grade      TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_results_student_id ON results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_course_id ON results(course_id);
