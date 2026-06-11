package staff

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"gamji-backend/internal/auth"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// StaffMember is the canonical staff data model.
type StaffMember struct {
	ID        string    `json:"id"`
	AuthID    string    `json:"auth_id"`
	FullName  string    `json:"full_name"`
	Email     string    `json:"email"`
	Phone     string    `json:"phone"`
	Role      string    `json:"role"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CreateInput is the request body for creating a staff member.
type CreateInput struct {
	FullName string `json:"full_name"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Role     string `json:"role"`
	Status   string `json:"status"`
	Password string `json:"password"`
}

// UpdateInput is the request body for updating a staff member.
type UpdateInput struct {
	FullName *string `json:"full_name"`
	Email    *string `json:"email"`
	Phone    *string `json:"phone"`
	Role     *string `json:"role"`
	Status   *string `json:"status"`
}

var validRoles = map[string]bool{
	"Admin": true, "Lecturer": true, "Registrar": true, "Bursar": true, "Provost": true,
}
var validStatuses = map[string]bool{"active": true, "leave": true}

// Service handles staff business logic.
type Service struct{ db *pgxpool.Pool }

// NewService creates a new staff Service.
func NewService(db *pgxpool.Pool) *Service { return &Service{db: db} }

// List returns all staff members.
func (s *Service) List(ctx context.Context) ([]StaffMember, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, auth_id, full_name, email, COALESCE(phone,''), role, status, created_at, updated_at
		 FROM staff_members ORDER BY created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("query staff: %w", err)
	}
	defer rows.Close()

	var members []StaffMember
	for rows.Next() {
		var m StaffMember
		if err := rows.Scan(&m.ID, &m.AuthID, &m.FullName, &m.Email, &m.Phone,
			&m.Role, &m.Status, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, err
		}
		members = append(members, m)
	}
	if members == nil {
		members = []StaffMember{}
	}
	return members, nil
}

// GetByAuthID returns the staff member for a given auth user ID.
func (s *Service) GetByAuthID(ctx context.Context, authID string) (*StaffMember, error) {
	var m StaffMember
	err := s.db.QueryRow(ctx,
		`SELECT id, auth_id, full_name, email, COALESCE(phone,''), role, status, created_at, updated_at
		 FROM staff_members WHERE auth_id = $1`, authID,
	).Scan(&m.ID, &m.AuthID, &m.FullName, &m.Email, &m.Phone,
		&m.Role, &m.Status, &m.CreatedAt, &m.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("staff not found")
	}
	return &m, err
}

// Create creates a new auth user and staff profile in a transaction.
func (s *Service) Create(ctx context.Context, input CreateInput) (*StaffMember, error) {
	if !validRoles[input.Role] {
		return nil, fmt.Errorf("invalid role: must be one of %s", strings.Join(roleList(), ", "))
	}
	if input.Status != "" && !validStatuses[input.Status] {
		return nil, errors.New("invalid status: must be active or leave")
	}
	if input.Status == "" {
		input.Status = "active"
	}
	if input.Password == "" {
		input.Password = "changeme123"
	}

	hash, err := auth.HashPassword(input.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var userID string
	err = tx.QueryRow(ctx,
		`INSERT INTO users (email, full_name, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id`,
		input.Email, input.FullName, input.Role, hash,
	).Scan(&userID)
	if err != nil {
		if isDup(err) {
			return nil, errors.New("email already registered")
		}
		return nil, fmt.Errorf("create user: %w", err)
	}

	var m StaffMember
	err = tx.QueryRow(ctx,
		`INSERT INTO staff_members (auth_id, full_name, email, phone, role, status)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, auth_id, full_name, email, COALESCE(phone,''), role, status, created_at, updated_at`,
		userID, input.FullName, input.Email, input.Phone, input.Role, input.Status,
	).Scan(&m.ID, &m.AuthID, &m.FullName, &m.Email, &m.Phone,
		&m.Role, &m.Status, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		if isDup(err) {
			return nil, errors.New("email already registered")
		}
		return nil, fmt.Errorf("create staff: %w", err)
	}

	return &m, tx.Commit(ctx)
}

// Update applies partial updates to a staff member.
func (s *Service) Update(ctx context.Context, id string, input UpdateInput) (*StaffMember, error) {
	if input.Role != nil && !validRoles[*input.Role] {
		return nil, fmt.Errorf("invalid role: must be one of %s", strings.Join(roleList(), ", "))
	}
	if input.Status != nil && !validStatuses[*input.Status] {
		return nil, errors.New("invalid status: must be active or leave")
	}

	var m StaffMember
	err := s.db.QueryRow(ctx,
		`UPDATE staff_members SET
			full_name  = COALESCE($2, full_name),
			email      = COALESCE($3, email),
			phone      = COALESCE($4, phone),
			role       = COALESCE($5, role),
			status     = COALESCE($6, status),
			updated_at = NOW()
		 WHERE id = $1
		 RETURNING id, auth_id, full_name, email, COALESCE(phone,''), role, status, created_at, updated_at`,
		id, input.FullName, input.Email, input.Phone, input.Role, input.Status,
	).Scan(&m.ID, &m.AuthID, &m.FullName, &m.Email, &m.Phone,
		&m.Role, &m.Status, &m.CreatedAt, &m.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("staff not found")
	}
	return &m, err
}

// Delete removes a staff member.
func (s *Service) Delete(ctx context.Context, id string) error {
	result, err := s.db.Exec(ctx, `DELETE FROM staff_members WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return errors.New("staff not found")
	}
	return nil
}

func roleList() []string {
	return []string{"Admin", "Lecturer", "Registrar", "Bursar", "Provost"}
}

func isDup(err error) bool {
	return err != nil && (strings.Contains(err.Error(), "duplicate key") ||
		strings.Contains(err.Error(), "unique constraint"))
}
