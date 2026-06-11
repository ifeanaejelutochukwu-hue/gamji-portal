package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

// Service handles authentication business logic.
type Service struct {
	db         *pgxpool.Pool
	jwtSecret  []byte
	jwtExpiry  time.Duration
	frontendURL string
}

// NewService creates a new Auth Service.
func NewService(db *pgxpool.Pool, jwtSecret string, jwtExpiryHours int, frontendURL string) *Service {
	return &Service{
		db:          db,
		jwtSecret:   []byte(jwtSecret),
		jwtExpiry:   time.Duration(jwtExpiryHours) * time.Hour,
		frontendURL: frontendURL,
	}
}

// --- Types ---

// SessionUser is the user object returned in login responses.
type SessionUser struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	FullName string `json:"full_name"`
	Role     string `json:"role"`
}

// SessionResponse is the full login response body.
type SessionResponse struct {
	Token string      `json:"token"`
	User  SessionUser `json:"user"`
}

// --- Login ---

// Login validates credentials and returns a signed JWT session.
func (s *Service) Login(ctx context.Context, email, password string) (*SessionResponse, error) {
	var userID, fullName, role, passwordHash string
	err := s.db.QueryRow(ctx,
		`SELECT id, full_name, role, password_hash FROM users WHERE email = $1`,
		email,
	).Scan(&userID, &fullName, &role, &passwordHash)
	if err != nil {
		// Don't distinguish "not found" from "wrong password" to prevent enumeration
		return nil, errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	token, err := s.signToken(userID, email, fullName, role)
	if err != nil {
		return nil, fmt.Errorf("failed to sign token: %w", err)
	}

	return &SessionResponse{
		Token: token,
		User: SessionUser{
			ID:       userID,
			Email:    email,
			FullName: fullName,
			Role:     role,
		},
	}, nil
}

// --- Token ---

func (s *Service) signToken(userID, email, fullName, role string) (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"sub":       userID,
		"email":     email,
		"full_name": fullName,
		"role":      role,
		"iat":       now.Unix(),
		"exp":       now.Add(s.jwtExpiry).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

// ParseToken validates a JWT and returns its claims.
func (s *Service) ParseToken(tokenStr string) (*Claims, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}

	mapClaims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	return &Claims{
		UserID:   fmt.Sprint(mapClaims["sub"]),
		Email:    fmt.Sprint(mapClaims["email"]),
		FullName: fmt.Sprint(mapClaims["full_name"]),
		Role:     fmt.Sprint(mapClaims["role"]),
	}, nil
}

// --- Password Reset ---

// ForgotPassword generates a reset token and returns it (caller sends the email).
// Always returns nil error even if email not found (prevents enumeration).
func (s *Service) ForgotPassword(ctx context.Context, email string) (userEmail string, resetLink string, shouldSend bool, err error) {
	var userID string
	dbErr := s.db.QueryRow(ctx,
		`SELECT id FROM users WHERE email = $1`, email,
	).Scan(&userID)
	if dbErr != nil {
		// Silent success — don't reveal whether email exists
		return "", "", false, nil
	}

	// Generate 32-byte hex token
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", "", false, fmt.Errorf("failed to generate reset token: %w", err)
	}
	token := hex.EncodeToString(tokenBytes)
	expiresAt := time.Now().Add(time.Hour)

	_, dbErr = s.db.Exec(ctx,
		`INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
		userID, token, expiresAt,
	)
	if dbErr != nil {
		return "", "", false, fmt.Errorf("failed to store reset token: %w", dbErr)
	}

	link := fmt.Sprintf("%s/reset-password?token=%s", s.frontendURL, token)
	return email, link, true, nil
}

// ResetPassword validates a reset token and updates the user's password.
func (s *Service) ResetPassword(ctx context.Context, token, newPassword string) error {
	if len(newPassword) < 8 {
		return errors.New("password must be at least 8 characters")
	}

	var userID string
	err := s.db.QueryRow(ctx,
		`SELECT user_id FROM password_reset_tokens
		 WHERE token = $1 AND used = false AND expires_at > NOW()`,
		token,
	).Scan(&userID)
	if err != nil {
		return errors.New("invalid or expired token")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), 12)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Update password and invalidate token in a transaction
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("transaction error: %w", err)
	}
	defer tx.Rollback(ctx)

	if _, err = tx.Exec(ctx,
		`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
		string(hash), userID,
	); err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	if _, err = tx.Exec(ctx,
		`UPDATE password_reset_tokens SET used = true WHERE token = $1`, token,
	); err != nil {
		return fmt.Errorf("failed to invalidate token: %w", err)
	}

	return tx.Commit(ctx)
}

// HashPassword hashes a plaintext password with bcrypt cost 12.
func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}
