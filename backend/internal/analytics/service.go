package analytics

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Summary holds all aggregated analytics values.
type Summary struct {
	TotalActiveStudents int     `json:"total_active_students"`
	TotalStaff          int     `json:"total_staff"`
	TotalCourses        int     `json:"total_courses"`
	PendingAdmissions   int     `json:"pending_admissions"`
	TotalRevenuePaid    float64 `json:"total_revenue_paid"`
	SubmittedResults    int     `json:"submitted_results"`
}

// Service handles analytics business logic.
type Service struct{ db *pgxpool.Pool }

// NewService creates a new analytics Service.
func NewService(db *pgxpool.Pool) *Service { return &Service{db: db} }

// GetSummary computes live aggregate statistics from the database.
func (s *Service) GetSummary(ctx context.Context) (*Summary, error) {
	var sum Summary

	err := s.db.QueryRow(ctx, `
		SELECT
			(SELECT COUNT(*) FROM student_profiles WHERE status = 'active'),
			(SELECT COUNT(*) FROM staff_members),
			(SELECT COUNT(*) FROM courses),
			(SELECT COUNT(*) FROM admission_applications WHERE status = 'pending'),
			(SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'paid'),
			(SELECT COUNT(*) FROM results WHERE status = 'submitted')
	`).Scan(
		&sum.TotalActiveStudents,
		&sum.TotalStaff,
		&sum.TotalCourses,
		&sum.PendingAdmissions,
		&sum.TotalRevenuePaid,
		&sum.SubmittedResults,
	)
	if err != nil {
		return nil, fmt.Errorf("analytics query: %w", err)
	}
	return &sum, nil
}
