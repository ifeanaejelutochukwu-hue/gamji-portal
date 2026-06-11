package db

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect creates a PostgreSQL connection pool and verifies the connection.
func Connect(databaseURL string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %w", err)
	}

	if err := pool.Ping(context.Background()); err != nil {
		pool.Close()
		return nil, fmt.Errorf("unable to reach database: %w", err)
	}

	log.Println("✓ Database connected")
	return pool, nil
}

// RunMigrations applies all pending up migrations.
// It searches for the migrations folder relative to the working directory
// or next to the binary, so it works in Docker, Railway, and local dev.
func RunMigrations(databaseURL string) error {
	migrationsDir := findMigrationsDir()

	m, err := migrate.New(fmt.Sprintf("file://%s", migrationsDir), databaseURL)
	if err != nil {
		return fmt.Errorf("failed to initialise migrations: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("migration failed: %w", err)
	}

	log.Println("✓ Database migrations applied")
	return nil
}

// findMigrationsDir locates the migrations directory by checking several
// candidate paths so it works in Docker, Railway, and local development.
func findMigrationsDir() string {
	candidates := []string{
		// Local dev: run `go run ./cmd/server` from backend/
		"internal/db/migrations",
		// Docker / Railway: binary runs in /app, migrations copied there
		filepath.Join(filepath.Dir(os.Args[0]), "internal/db/migrations"),
		// Absolute fallback
		"/app/internal/db/migrations",
	}

	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			return c
		}
	}

	// Return first candidate and let migrate produce a clear error if not found
	return candidates[0]
}
