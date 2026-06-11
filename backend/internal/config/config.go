package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	Port           string
	DatabaseURL    string
	JWTSecret      string
	JWTExpiryHours int
	AllowedOrigins []string
	SMTPHost       string
	SMTPPort       int
	SMTPUser       string
	SMTPPass       string
	SMTPFrom       string
	FrontendURL    string
}

// Load reads all required environment variables and returns a Config.
// It exits with a descriptive error if any required variable is missing.
func Load() (*Config, error) {
	cfg := &Config{}

	cfg.Port = getEnvOrDefault("PORT", "8080")
	cfg.FrontendURL = getEnvOrDefault("FRONTEND_URL", "http://localhost:3000")

	// Required variables
	var missing []string

	cfg.DatabaseURL = os.Getenv("DATABASE_URL")
	if cfg.DatabaseURL == "" {
		missing = append(missing, "DATABASE_URL")
	}

	cfg.JWTSecret = os.Getenv("JWT_SECRET")
	if cfg.JWTSecret == "" {
		missing = append(missing, "JWT_SECRET")
	}

	cfg.SMTPHost = os.Getenv("SMTP_HOST")
	if cfg.SMTPHost == "" {
		missing = append(missing, "SMTP_HOST")
	}

	cfg.SMTPUser = os.Getenv("SMTP_USER")
	if cfg.SMTPUser == "" {
		missing = append(missing, "SMTP_USER")
	}

	cfg.SMTPPass = os.Getenv("SMTP_PASS")
	if cfg.SMTPPass == "" {
		missing = append(missing, "SMTP_PASS")
	}

	cfg.SMTPFrom = getEnvOrDefault("SMTP_FROM", "Gamji Portal <noreply@gamji.edu.ng>")

	if len(missing) > 0 {
		return nil, fmt.Errorf("missing required environment variables: %s", strings.Join(missing, ", "))
	}

	// JWT expiry (optional, defaults to 24h)
	expiryStr := getEnvOrDefault("JWT_EXPIRY_HOURS", "24")
	expiry, err := strconv.Atoi(expiryStr)
	if err != nil {
		return nil, fmt.Errorf("invalid JWT_EXPIRY_HOURS value: %s", expiryStr)
	}
	cfg.JWTExpiryHours = expiry

	// SMTP port (optional, defaults to 587)
	smtpPortStr := getEnvOrDefault("SMTP_PORT", "587")
	smtpPort, err := strconv.Atoi(smtpPortStr)
	if err != nil {
		return nil, fmt.Errorf("invalid SMTP_PORT value: %s", smtpPortStr)
	}
	cfg.SMTPPort = smtpPort

	// Allowed CORS origins
	originsStr := getEnvOrDefault("ALLOWED_ORIGINS", "http://localhost:3000")
	for _, o := range strings.Split(originsStr, ",") {
		if trimmed := strings.TrimSpace(o); trimmed != "" {
			cfg.AllowedOrigins = append(cfg.AllowedOrigins, trimmed)
		}
	}

	return cfg, nil
}

func getEnvOrDefault(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}
