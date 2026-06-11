package results

import (
	"context"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Result is the canonical result data model.
type Result struct {
	ID          string    `json:"id"`
	StudentID   string    `json:"student_id"`
	CourseID    string    `json:"course_id"`
	CAScore     float64   `json:"ca_score"`
	ExamScore   float64   `json:"exam_score"`
	Total       float64   `json:"total"`
	Grade       string    `json:"grade"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	// Joined fields
	CourseCode  string `json:"course_code,omitempty"`
	CourseTitle string `json:"course_title,omitempty"`
	Units       int    `json:"units,omitempty"`
	StudentName string `json:"student_name,omitempty"`
	RegNumber   string `json:"reg_number,omitempty"`
}

// SaveInput is used by both create and update in POST /api/results/save
type SaveInput struct {
	ID        *string `json:"id"`
	StudentID string  `json:"student_id"`
	CourseID  string  `json:"course_id"`
	CAScore   float64 `json:"ca_score"`
	ExamScore float64 `json:"exam_score"`
	Status    string  `json:"status"`
}

// UpdateInput is for PUT /api/results/:id
type UpdateInput struct {
	CAScore   *float64 `json:"ca_score"`
	ExamScore *float64 `json:"exam_score"`
	Status    *string  `json:"status"`
}

// Service handles results business logic.
type Service struct{ db *pgxpool.Pool }

// NewService creates a new results Service.
func NewService(db *pgxpool.Pool) *Service { return &Service{db: db} }

// ComputeGrade derives the letter grade and grade point from a total score.
func ComputeGrade(total float64) (grade string, gradePoint float64) {
	switch {
	case total >= 70:
		return "A", 5.0
	case total >= 60:
		return "B", 4.0
	case total >= 50:
		return "C", 3.0
	case total >= 45:
		return "D", 2.0
	default:
		return "F", 0.0
	}
}

// ComputeGPA computes the weighted GPA from results with course units attached.
func ComputeGPA(results []Result) float64 {
	totalPoints := 0.0
	totalUnits := 0
	for _, r := range results {
		_, gp := ComputeGrade(r.Total)
		totalPoints += gp * float64(r.Units)
		totalUnits += r.Units
	}
	if totalUnits == 0 {
		return 0
	}
	return math.Round((totalPoints/float64(totalUnits))*100) / 100
}

// ListByStudent returns all results for a student with course info joined.
func (s *Service) ListByStudent(ctx context.Context, studentID string) ([]Result, error) {
	rows, err := s.db.Query(ctx,
		`SELECT r.id, r.student_id, r.course_id, r.ca_score, r.exam_score, r.total,
		        r.grade, r.status, r.created_at, r.updated_at,
		        c.code, c.title, c.units
		 FROM results r
		 JOIN courses c ON c.id = r.course_id
		 WHERE r.student_id = $1
		 ORDER BY c.code`, studentID,
	)
	if err != nil {
		return nil, fmt.Errorf("query results by student: %w", err)
	}
	defer rows.Close()
	return scanResultsWithCourse(rows)
}

// ListByCourse returns all results for a course with student info joined.
func (s *Service) ListByCourse(ctx context.Context, courseID string) ([]Result, error) {
	rows, err := s.db.Query(ctx,
		`SELECT r.id, r.student_id, r.course_id, r.ca_score, r.exam_score, r.total,
		        r.grade, r.status, r.created_at, r.updated_at,
		        sp.full_name, sp.reg_number
		 FROM results r
		 JOIN student_profiles sp ON sp.id = r.student_id
		 WHERE r.course_id = $1
		 ORDER BY sp.full_name`, courseID,
	)
	if err != nil {
		return nil, fmt.Errorf("query results by course: %w", err)
	}
	defer rows.Close()
	return scanResultsWithStudent(rows)
}

// Save creates or updates a result (upsert by student_id + course_id).
func (s *Service) Save(ctx context.Context, input SaveInput) (*Result, error) {
	if input.CAScore < 0 || input.CAScore > 30 {
		return nil, errors.New("ca_score must be between 0 and 30")
	}
	if input.ExamScore < 0 || input.ExamScore > 70 {
		return nil, errors.New("exam_score must be between 0 and 70")
	}
	if input.Status == "" {
		input.Status = "draft"
	}
	if input.Status != "draft" && input.Status != "submitted" {
		return nil, errors.New("status must be draft or submitted")
	}

	total := input.CAScore + input.ExamScore
	grade, _ := ComputeGrade(total)

	var r Result
	err := s.db.QueryRow(ctx,
		`INSERT INTO results (student_id, course_id, ca_score, exam_score, total, grade, status)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 ON CONFLICT (student_id, course_id) DO UPDATE SET
		   ca_score   = EXCLUDED.ca_score,
		   exam_score = EXCLUDED.exam_score,
		   total      = EXCLUDED.total,
		   grade      = EXCLUDED.grade,
		   status     = EXCLUDED.status,
		   updated_at = NOW()
		 RETURNING id, student_id, course_id, ca_score, exam_score, total, grade, status, created_at, updated_at`,
		input.StudentID, input.CourseID, input.CAScore, input.ExamScore, total, grade, input.Status,
	).Scan(&r.ID, &r.StudentID, &r.CourseID, &r.CAScore, &r.ExamScore,
		&r.Total, &r.Grade, &r.Status, &r.CreatedAt, &r.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("save result: %w", err)
	}
	return &r, nil
}

// Update applies partial score/status updates to a result.
func (s *Service) Update(ctx context.Context, id string, input UpdateInput, callerRole string) (*Result, error) {
	// Fetch current record to enforce submitted lock
	var currentStatus string
	err := s.db.QueryRow(ctx, `SELECT status FROM results WHERE id = $1`, id).Scan(&currentStatus)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("result not found")
	}
	if err != nil {
		return nil, err
	}

	if currentStatus == "submitted" && callerRole != "Admin" {
		return nil, errors.New("submitted results cannot be modified")
	}

	if input.CAScore != nil && (*input.CAScore < 0 || *input.CAScore > 30) {
		return nil, errors.New("ca_score must be between 0 and 30")
	}
	if input.ExamScore != nil && (*input.ExamScore < 0 || *input.ExamScore > 70) {
		return nil, errors.New("exam_score must be between 0 and 70")
	}

	var r Result
	err = s.db.QueryRow(ctx,
		`UPDATE results SET
			ca_score   = COALESCE($2, ca_score),
			exam_score = COALESCE($3, exam_score),
			total      = COALESCE($2, ca_score) + COALESCE($3, exam_score),
			grade      = CASE
			               WHEN COALESCE($2, ca_score) + COALESCE($3, exam_score) >= 70 THEN 'A'
			               WHEN COALESCE($2, ca_score) + COALESCE($3, exam_score) >= 60 THEN 'B'
			               WHEN COALESCE($2, ca_score) + COALESCE($3, exam_score) >= 50 THEN 'C'
			               WHEN COALESCE($2, ca_score) + COALESCE($3, exam_score) >= 45 THEN 'D'
			               ELSE 'F'
			             END,
			status     = COALESCE($4, status),
			updated_at = NOW()
		 WHERE id = $1
		 RETURNING id, student_id, course_id, ca_score, exam_score, total, grade, status, created_at, updated_at`,
		id, input.CAScore, input.ExamScore, input.Status,
	).Scan(&r.ID, &r.StudentID, &r.CourseID, &r.CAScore, &r.ExamScore,
		&r.Total, &r.Grade, &r.Status, &r.CreatedAt, &r.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("result not found")
	}
	return &r, err
}

// --- scan helpers ---

func scanResultsWithCourse(rows pgx.Rows) ([]Result, error) {
	var results []Result
	for rows.Next() {
		var r Result
		if err := rows.Scan(&r.ID, &r.StudentID, &r.CourseID, &r.CAScore, &r.ExamScore, &r.Total,
			&r.Grade, &r.Status, &r.CreatedAt, &r.UpdatedAt,
			&r.CourseCode, &r.CourseTitle, &r.Units); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	if results == nil {
		results = []Result{}
	}
	return results, nil
}

func scanResultsWithStudent(rows pgx.Rows) ([]Result, error) {
	var results []Result
	for rows.Next() {
		var r Result
		if err := rows.Scan(&r.ID, &r.StudentID, &r.CourseID, &r.CAScore, &r.ExamScore, &r.Total,
			&r.Grade, &r.Status, &r.CreatedAt, &r.UpdatedAt,
			&r.StudentName, &r.RegNumber); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	if results == nil {
		results = []Result{}
	}
	return results, nil
}
