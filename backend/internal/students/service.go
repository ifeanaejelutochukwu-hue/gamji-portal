package students

import (
	"context"
	"errors"
	"fmt"
	"time"

	"gamji-backend/internal/auth"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// StudentProfile is the canonical student data model.
type StudentProfile struct {
	ID          string    `json:"id"`
	AuthID      string    `json:"auth_id"`
	FullName    string    `json:"full_name"`
	RegNumber   string    `json:"reg_number"`
	Program     string    `json:"program"`
	YearOfStudy int       `json:"year_of_study"`
	Level       int       `json:"level"`
	Status      string    `json:"status"`
	Email       string    `json:"email"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// CreateInput is the request body for creating a student.
type CreateInput struct {
	FullName    string `json:"full_name"`
	RegNumber   string `json:"reg_number"`
	Program     string `json:"program"`
	YearOfStudy int    `json:"year_of_study"`
	Level       int    `json:"level"`
	Status      string `json:"status"`
	Email       string `json:"email"`
	Password    string `json:"password"`
}

// UpdateInput is the request body for updating a student.
type UpdateInput struct {
	FullName    *string `json:"full_name"`
	RegNumber   *string `json:"reg_number"`
	Program     *string `json:"program"`
	YearOfStudy *int    `json:"year_of_study"`
	Level       *int    `json:"level"`
	Status      *string `json:"status"`
	Email       *string `json:"email"`
}

var validStatuses = map[string]bool{
	"active": true, "graduated": true, "suspended": true, "pending": true,
}

// validPrograms are the two programs Gamji College offers.
var validPrograms = map[string]bool{
	"General Nursing": true,
	"Basic Midwifery": true,
}

// SelfRegisterInput is used for student self-registration from the login page.
type SelfRegisterInput struct {
	FullName string `json:"full_name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Program  string `json:"program"`
}

// SelfRegister creates a pending student account with an auto-generated reg number.
func (s *Service) SelfRegister(ctx context.Context, input SelfRegisterInput) (*StudentProfile, error) {
	if !validPrograms[input.Program] {
		return nil, errors.New("program must be General Nursing or Basic Midwifery")
	}
	if len(input.Password) < 8 {
		return nil, errors.New("password must be at least 8 characters")
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
		`INSERT INTO users (email, full_name, role, password_hash)
		 VALUES ($1, $2, 'Student', $3) RETURNING id`,
		input.Email, input.FullName, hash,
	).Scan(&userID)
	if err != nil {
		if isDuplicateError(err, "users_email_key") {
			return nil, errors.New("email already registered")
		}
		return nil, fmt.Errorf("create user: %w", err)
	}

	// Auto-generate reg number: GNS/YYYY/XXXX
	year := time.Now().Year()
	var lastSeq int
	_ = tx.QueryRow(ctx,
		`SELECT COALESCE(MAX(CAST(SPLIT_PART(reg_number, '/', 3) AS INTEGER)), 0)
		 FROM student_profiles WHERE reg_number LIKE $1`,
		fmt.Sprintf("GNS/%d/%%", year),
	).Scan(&lastSeq)
	regNumber := fmt.Sprintf("GNS/%d/%04d", year, lastSeq+1)

	var p StudentProfile
	err = tx.QueryRow(ctx,
		`INSERT INTO student_profiles (auth_id, full_name, reg_number, program, year_of_study, level, status, email)
		 VALUES ($1, $2, $3, $4, 1, 100, 'pending', $5)
		 RETURNING id, auth_id, full_name, reg_number, program, year_of_study, level, status, email, created_at, updated_at`,
		userID, input.FullName, regNumber, input.Program, input.Email,
	).Scan(&p.ID, &p.AuthID, &p.FullName, &p.RegNumber, &p.Program,
		&p.YearOfStudy, &p.Level, &p.Status, &p.Email, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create student profile: %w", err)
	}

	return &p, tx.Commit(ctx)
}

// Service handles student business logic.
type Service struct{ db *pgxpool.Pool }

// NewService creates a new students Service.
func NewService(db *pgxpool.Pool) *Service { return &Service{db: db} }

// List returns all student profiles.
func (s *Service) List(ctx context.Context) ([]StudentProfile, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, auth_id, full_name, reg_number, program, year_of_study, level, status, email, created_at, updated_at
		 FROM student_profiles ORDER BY created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("query students: %w", err)
	}
	defer rows.Close()

	var profiles []StudentProfile
	for rows.Next() {
		var p StudentProfile
		if err := rows.Scan(&p.ID, &p.AuthID, &p.FullName, &p.RegNumber, &p.Program,
			&p.YearOfStudy, &p.Level, &p.Status, &p.Email, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		profiles = append(profiles, p)
	}
	if profiles == nil {
		profiles = []StudentProfile{}
	}
	return profiles, nil
}

// GetByAuthID returns the student profile for a given auth user ID.
func (s *Service) GetByAuthID(ctx context.Context, authID string) (*StudentProfile, error) {
	var p StudentProfile
	err := s.db.QueryRow(ctx,
		`SELECT id, auth_id, full_name, reg_number, program, year_of_study, level, status, email, created_at, updated_at
		 FROM student_profiles WHERE auth_id = $1`, authID,
	).Scan(&p.ID, &p.AuthID, &p.FullName, &p.RegNumber, &p.Program,
		&p.YearOfStudy, &p.Level, &p.Status, &p.Email, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("student not found")
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

// GetByID returns the student profile for a given student ID.
func (s *Service) GetByID(ctx context.Context, id string) (*StudentProfile, error) {
	var p StudentProfile
	err := s.db.QueryRow(ctx,
		`SELECT id, auth_id, full_name, reg_number, program, year_of_study, level, status, email, created_at, updated_at
		 FROM student_profiles WHERE id = $1`, id,
	).Scan(&p.ID, &p.AuthID, &p.FullName, &p.RegNumber, &p.Program,
		&p.YearOfStudy, &p.Level, &p.Status, &p.Email, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("student not found")
	}
	return &p, err
}

// Create creates a new user account and student profile in a transaction.
func (s *Service) Create(ctx context.Context, input CreateInput) (*StudentProfile, error) {
	if input.Status != "" && !validStatuses[input.Status] {
		return nil, errors.New("invalid status: must be one of active, graduated, suspended, pending")
	}
	if input.Status == "" {
		input.Status = "active"
	}
	if input.YearOfStudy == 0 {
		input.YearOfStudy = 1
	}
	if input.Level == 0 {
		input.Level = 100
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
		`INSERT INTO users (email, full_name, role, password_hash)
		 VALUES ($1, $2, 'Student', $3) RETURNING id`,
		input.Email, input.FullName, hash,
	).Scan(&userID)
	if err != nil {
		if isDuplicateError(err, "users_email_key") {
			return nil, errors.New("email already registered")
		}
		return nil, fmt.Errorf("create user: %w", err)
	}

	var p StudentProfile
	err = tx.QueryRow(ctx,
		`INSERT INTO student_profiles (auth_id, full_name, reg_number, program, year_of_study, level, status, email)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, auth_id, full_name, reg_number, program, year_of_study, level, status, email, created_at, updated_at`,
		userID, input.FullName, input.RegNumber, input.Program,
		input.YearOfStudy, input.Level, input.Status, input.Email,
	).Scan(&p.ID, &p.AuthID, &p.FullName, &p.RegNumber, &p.Program,
		&p.YearOfStudy, &p.Level, &p.Status, &p.Email, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if isDuplicateError(err, "student_profiles_reg_number_key") {
			return nil, errors.New("registration number already exists")
		}
		return nil, fmt.Errorf("create student profile: %w", err)
	}

	return &p, tx.Commit(ctx)
}

// Update applies partial updates to a student profile.
func (s *Service) Update(ctx context.Context, id string, input UpdateInput) (*StudentProfile, error) {
	if input.Status != nil && !validStatuses[*input.Status] {
		return nil, errors.New("invalid status: must be one of active, graduated, suspended, pending")
	}

	var p StudentProfile
	err := s.db.QueryRow(ctx,
		`UPDATE student_profiles SET
			full_name     = COALESCE($2, full_name),
			reg_number    = COALESCE($3, reg_number),
			program       = COALESCE($4, program),
			year_of_study = COALESCE($5, year_of_study),
			level         = COALESCE($6, level),
			status        = COALESCE($7, status),
			email         = COALESCE($8, email),
			updated_at    = NOW()
		 WHERE id = $1
		 RETURNING id, auth_id, full_name, reg_number, program, year_of_study, level, status, email, created_at, updated_at`,
		id, input.FullName, input.RegNumber, input.Program,
		input.YearOfStudy, input.Level, input.Status, input.Email,
	).Scan(&p.ID, &p.AuthID, &p.FullName, &p.RegNumber, &p.Program,
		&p.YearOfStudy, &p.Level, &p.Status, &p.Email, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("student not found")
	}
	if err != nil {
		if isDuplicateError(err, "student_profiles_reg_number_key") {
			return nil, errors.New("registration number already exists")
		}
		return nil, err
	}
	return &p, nil
}

// Delete removes a student profile (cascade deletes the auth user).
func (s *Service) Delete(ctx context.Context, id string) error {
	result, err := s.db.Exec(ctx,
		`DELETE FROM student_profiles WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return errors.New("student not found")
	}
	return nil
}

func isDuplicateError(err error, constraint string) bool {
	return err != nil && (contains(err.Error(), constraint) || contains(err.Error(), "duplicate key"))
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsStr(s, substr))
}

func containsStr(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
