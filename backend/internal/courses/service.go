package courses

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Course is the canonical course data model.
type Course struct {
	ID         string    `json:"id"`
	Code       string    `json:"code"`
	Title      string    `json:"title"`
	Units      int       `json:"units"`
	Level      int       `json:"level"`
	Semester   string    `json:"semester"`
	LecturerID *string   `json:"lecturer_id"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// CreateInput is the request body for creating a course.
type CreateInput struct {
	Code       string  `json:"code"`
	Title      string  `json:"title"`
	Units      int     `json:"units"`
	Level      int     `json:"level"`
	Semester   string  `json:"semester"`
	LecturerID *string `json:"lecturer_id"`
}

// UpdateInput is the request body for updating a course.
type UpdateInput struct {
	Code       *string `json:"code"`
	Title      *string `json:"title"`
	Units      *int    `json:"units"`
	Level      *int    `json:"level"`
	Semester   *string `json:"semester"`
	LecturerID *string `json:"lecturer_id"`
	Status     *string `json:"status"`
}

// Service handles course business logic.
type Service struct{ db *pgxpool.Pool }

// NewService creates a new courses Service.
func NewService(db *pgxpool.Pool) *Service { return &Service{db: db} }

// List returns all courses, optionally filtered by lecturer_id.
func (s *Service) List(ctx context.Context, lecturerID string) ([]Course, error) {
	var query string
	var args []any

	if lecturerID != "" {
		query = `SELECT id, code, title, units, level, semester, lecturer_id, status, created_at, updated_at
				 FROM courses WHERE lecturer_id = $1 ORDER BY code`
		args = []any{lecturerID}
	} else {
		query = `SELECT id, code, title, units, level, semester, lecturer_id, status, created_at, updated_at
				 FROM courses ORDER BY code`
	}

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query courses: %w", err)
	}
	defer rows.Close()

	var courses []Course
	for rows.Next() {
		var c Course
		if err := rows.Scan(&c.ID, &c.Code, &c.Title, &c.Units, &c.Level,
			&c.Semester, &c.LecturerID, &c.Status, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		courses = append(courses, c)
	}
	if courses == nil {
		courses = []Course{}
	}
	return courses, nil
}

// Create inserts a new course record.
func (s *Service) Create(ctx context.Context, input CreateInput) (*Course, error) {
	if input.Units < 1 || input.Units > 6 {
		return nil, errors.New("units must be between 1 and 6")
	}

	// Validate lecturer exists and has role Lecturer
	if input.LecturerID != nil && *input.LecturerID != "" {
		var role string
		err := s.db.QueryRow(ctx,
			`SELECT role FROM staff_members WHERE id = $1`, *input.LecturerID,
		).Scan(&role)
		if errors.Is(err, pgx.ErrNoRows) || role != "Lecturer" {
			return nil, errors.New("lecturer not found")
		}
		if err != nil {
			return nil, fmt.Errorf("validate lecturer: %w", err)
		}
	}

	var c Course
	err := s.db.QueryRow(ctx,
		`INSERT INTO courses (code, title, units, level, semester, lecturer_id)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, code, title, units, level, semester, lecturer_id, status, created_at, updated_at`,
		input.Code, input.Title, input.Units, input.Level, input.Semester, input.LecturerID,
	).Scan(&c.ID, &c.Code, &c.Title, &c.Units, &c.Level,
		&c.Semester, &c.LecturerID, &c.Status, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			return nil, errors.New("course code already exists")
		}
		return nil, fmt.Errorf("create course: %w", err)
	}
	return &c, nil
}

// Update applies partial updates to a course.
func (s *Service) Update(ctx context.Context, id string, input UpdateInput) (*Course, error) {
	if input.Units != nil && (*input.Units < 1 || *input.Units > 6) {
		return nil, errors.New("units must be between 1 and 6")
	}

	var c Course
	err := s.db.QueryRow(ctx,
		`UPDATE courses SET
			code        = COALESCE($2, code),
			title       = COALESCE($3, title),
			units       = COALESCE($4, units),
			level       = COALESCE($5, level),
			semester    = COALESCE($6, semester),
			lecturer_id = COALESCE($7, lecturer_id),
			status      = COALESCE($8, status),
			updated_at  = NOW()
		 WHERE id = $1
		 RETURNING id, code, title, units, level, semester, lecturer_id, status, created_at, updated_at`,
		id, input.Code, input.Title, input.Units, input.Level,
		input.Semester, input.LecturerID, input.Status,
	).Scan(&c.ID, &c.Code, &c.Title, &c.Units, &c.Level,
		&c.Semester, &c.LecturerID, &c.Status, &c.CreatedAt, &c.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("course not found")
	}
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			return nil, errors.New("course code already exists")
		}
		return nil, err
	}
	return &c, nil
}

// Delete removes a course.
func (s *Service) Delete(ctx context.Context, id string) error {
	result, err := s.db.Exec(ctx, `DELETE FROM courses WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return errors.New("course not found")
	}
	return nil
}
