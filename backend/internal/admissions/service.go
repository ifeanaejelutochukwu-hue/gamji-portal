package admissions

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// AdmissionApplication is the canonical admissions data model.
type AdmissionApplication struct {
	ID          string    `json:"id"`
	FullName    string    `json:"full_name"`
	Email       string    `json:"email"`
	Phone       string    `json:"phone"`
	Program     string    `json:"program"`
	Status      string    `json:"status"`
	SubmittedAt time.Time `json:"submitted_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

var validStatuses = map[string]bool{"pending": true, "approved": true, "rejected": true}

// Service handles admissions business logic.
type Service struct{ db *pgxpool.Pool }

// NewService creates a new admissions Service.
func NewService(db *pgxpool.Pool) *Service { return &Service{db: db} }

// List returns all admission applications.
func (s *Service) List(ctx context.Context) ([]AdmissionApplication, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, full_name, email, phone, program, status, submitted_at, updated_at
		 FROM admission_applications ORDER BY submitted_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("query admissions: %w", err)
	}
	defer rows.Close()

	var apps []AdmissionApplication
	for rows.Next() {
		var a AdmissionApplication
		if err := rows.Scan(&a.ID, &a.FullName, &a.Email, &a.Phone,
			&a.Program, &a.Status, &a.SubmittedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		apps = append(apps, a)
	}
	if apps == nil {
		apps = []AdmissionApplication{}
	}
	return apps, nil
}

// UpdateStatus changes an application's status.
func (s *Service) UpdateStatus(ctx context.Context, id, status string) (*AdmissionApplication, error) {
	if !validStatuses[status] {
		return nil, errors.New("status must be one of: pending, approved, rejected")
	}

	var a AdmissionApplication
	err := s.db.QueryRow(ctx,
		`UPDATE admission_applications SET status = $2, updated_at = NOW()
		 WHERE id = $1
		 RETURNING id, full_name, email, phone, program, status, submitted_at, updated_at`,
		id, status,
	).Scan(&a.ID, &a.FullName, &a.Email, &a.Phone,
		&a.Program, &a.Status, &a.SubmittedAt, &a.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("application not found")
	}
	if err != nil {
		return nil, fmt.Errorf("update admission status: %w", err)
	}
	return &a, nil
}
