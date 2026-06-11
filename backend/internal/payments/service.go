package payments

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Payment is the canonical payment data model.
type Payment struct {
	ID          string    `json:"id"`
	StudentID   string    `json:"student_id"`
	Amount      float64   `json:"amount"`
	Purpose     string    `json:"purpose"`
	Status      string    `json:"status"`
	Reference   string    `json:"reference"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	// Joined fields
	StudentName string `json:"student_name,omitempty"`
	RegNumber   string `json:"reg_number,omitempty"`
	Students    *struct {
		FullName  string `json:"full_name"`
		RegNumber string `json:"reg_number"`
	} `json:"students,omitempty"`
}

var validStatuses = map[string]bool{"paid": true, "pending": true, "overdue": true}

// Service handles payments business logic.
type Service struct{ db *pgxpool.Pool }

// NewService creates a new payments Service.
func NewService(db *pgxpool.Pool) *Service { return &Service{db: db} }

// List returns all payments joined with student info.
func (s *Service) List(ctx context.Context) ([]Payment, error) {
	rows, err := s.db.Query(ctx,
		`SELECT p.id, p.student_id, p.amount, p.purpose, p.status, p.reference,
		        p.created_at, p.updated_at,
		        sp.full_name, sp.reg_number
		 FROM payments p
		 JOIN student_profiles sp ON sp.id = p.student_id
		 ORDER BY p.created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("query payments: %w", err)
	}
	defer rows.Close()
	return scanPaymentsWithStudent(rows)
}

// ListByStudent returns payments for a specific student.
func (s *Service) ListByStudent(ctx context.Context, studentID string) ([]Payment, error) {
	rows, err := s.db.Query(ctx,
		`SELECT p.id, p.student_id, p.amount, p.purpose, p.status, p.reference,
		        p.created_at, p.updated_at,
		        sp.full_name, sp.reg_number
		 FROM payments p
		 JOIN student_profiles sp ON sp.id = p.student_id
		 WHERE p.student_id = $1
		 ORDER BY p.created_at DESC`, studentID)
	if err != nil {
		return nil, fmt.Errorf("query payments by student: %w", err)
	}
	defer rows.Close()
	return scanPaymentsWithStudent(rows)
}

// Verify updates a payment's status.
func (s *Service) Verify(ctx context.Context, id, status string) (*Payment, error) {
	if !validStatuses[status] {
		return nil, errors.New("status must be one of: paid, pending, overdue")
	}

	var p Payment
	var fullName, regNumber string
	err := s.db.QueryRow(ctx,
		`UPDATE payments SET status = $2, updated_at = NOW()
		 WHERE id = $1
		 RETURNING id, student_id, amount, purpose, status, reference, created_at, updated_at`,
		id, status,
	).Scan(&p.ID, &p.StudentID, &p.Amount, &p.Purpose, &p.Status,
		&p.Reference, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("payment not found")
	}
	if err != nil {
		return nil, fmt.Errorf("verify payment: %w", err)
	}

	// Fetch student info for response
	_ = s.db.QueryRow(ctx,
		`SELECT full_name, reg_number FROM student_profiles WHERE id = $1`, p.StudentID,
	).Scan(&fullName, &regNumber)
	p.StudentName = fullName
	p.RegNumber = regNumber

	return &p, nil
}

func scanPaymentsWithStudent(rows pgx.Rows) ([]Payment, error) {
	var payments []Payment
	for rows.Next() {
		var p Payment
		var fullName, regNumber string
		if err := rows.Scan(&p.ID, &p.StudentID, &p.Amount, &p.Purpose, &p.Status,
			&p.Reference, &p.CreatedAt, &p.UpdatedAt, &fullName, &regNumber); err != nil {
			return nil, err
		}
		p.StudentName = fullName
		p.RegNumber = regNumber
		p.Students = &struct {
			FullName  string `json:"full_name"`
			RegNumber string `json:"reg_number"`
		}{FullName: fullName, RegNumber: regNumber}
		payments = append(payments, p)
	}
	if payments == nil {
		payments = []Payment{}
	}
	return payments, nil
}
