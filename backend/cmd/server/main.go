package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"gamji-backend/internal/admissions"
	"gamji-backend/internal/analytics"
	"gamji-backend/internal/auth"
	"gamji-backend/internal/config"
	"gamji-backend/internal/courses"
	"gamji-backend/internal/db"
	"gamji-backend/internal/mailer"
	"gamji-backend/internal/payments"
	"gamji-backend/internal/results"
	"gamji-backend/internal/staff"
	"gamji-backend/internal/students"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
)

func main() {
	// 1. Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("FATAL: configuration error: %v", err)
	}

	// 2. Connect to database
	pool, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("FATAL: database connection failed: %v", err)
	}
	defer pool.Close()

	// 3. Run migrations
	if err := db.RunMigrations(cfg.DatabaseURL); err != nil {
		log.Fatalf("FATAL: database migration failed: %v", err)
	}

	// 4. Initialise services
	authSvc := auth.NewService(pool, cfg.JWTSecret, cfg.JWTExpiryHours, cfg.FrontendURL)
	mailerSvc := mailer.New(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPass, cfg.SMTPFrom)

	studentSvc := students.NewService(pool)
	staffSvc := staff.NewService(pool)
	courseSvc := courses.NewService(pool)
	resultSvc := results.NewService(pool)
	paymentSvc := payments.NewService(pool)
	admissionSvc := admissions.NewService(pool)
	analyticsSvc := analytics.NewService(pool)

	// 5. Initialise handlers
	authHandler := auth.NewHandler(authSvc, mailerSvc)
	studentHandler := students.NewHandler(studentSvc)
	staffHandler := staff.NewHandler(staffSvc)
	courseHandler := courses.NewHandler(courseSvc)
	resultHandler := results.NewHandler(resultSvc)
	paymentHandler := payments.NewHandler(paymentSvc)
	admissionHandler := admissions.NewHandler(admissionSvc)
	analyticsHandler := analytics.NewHandler(analyticsSvc)

	// 6. Build router
	r := chi.NewRouter()

	// Global middleware
	r.Use(auth.CORS(cfg.AllowedOrigins))
	r.Use(auth.RecoverPanic)
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Timeout(30 * time.Second))

	// Public routes
	r.Get("/api/health", auth.Health)
	r.Post("/api/auth/login", authHandler.Login)
	r.Post("/api/auth/logout", authHandler.Logout)
	r.Post("/api/auth/forgot-password", authHandler.ForgotPassword)
	r.Post("/api/auth/reset-password", authHandler.ResetPassword)
	r.Post("/api/students/register", studentHandler.Register) // public self-registration

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(authSvc.RequireAuth)

		// Students
		r.With(auth.RequireRole("Admin", "Registrar", "Lecturer", "Provost")).
			Get("/api/students", studentHandler.List)
		r.With(auth.RequireRole("Student", "Admin", "Registrar")).
			Get("/api/students/profile", studentHandler.GetProfile)
		r.With(auth.RequireRole("Admin", "Registrar")).
			Post("/api/students", studentHandler.Create)
		r.With(auth.RequireRole("Admin", "Registrar")).
			Put("/api/students/{id}", studentHandler.Update)
		r.With(auth.RequireRole("Admin")).
			Delete("/api/students/{id}", studentHandler.Delete)
		r.With(auth.RequireRole("Admin", "Registrar")).
			Post("/api/students/bulk-import", studentHandler.BulkImport)
		r.With(auth.RequireRole("Admin", "Registrar")).
			Get("/api/students/bulk-import/template", studentHandler.BulkImportTemplate)

		// Staff
		r.With(auth.RequireRole("Admin", "Provost")).
			Get("/api/staff", staffHandler.List)
		r.With(auth.RequireRole("Admin", "Lecturer", "Registrar", "Bursar", "Provost", "Student")).
			Get("/api/staff/profile", staffHandler.GetProfile)
		r.With(auth.RequireRole("Admin")).
			Post("/api/staff", staffHandler.Create)
		r.With(auth.RequireRole("Admin")).
			Put("/api/staff/{id}", staffHandler.Update)
		r.With(auth.RequireRole("Admin")).
			Delete("/api/staff/{id}", staffHandler.Delete)

		// Courses
		r.With(auth.RequireRole("Admin", "Registrar", "Lecturer", "Bursar", "Provost", "Student")).
			Get("/api/courses", courseHandler.List)
		r.With(auth.RequireRole("Admin", "Registrar")).
			Post("/api/courses", courseHandler.Create)
		r.With(auth.RequireRole("Admin", "Registrar")).
			Put("/api/courses/{id}", courseHandler.Update)
		r.With(auth.RequireRole("Admin")).
			Delete("/api/courses/{id}", courseHandler.Delete)

		// Results
		r.With(auth.RequireRole("Student", "Lecturer", "Admin", "Registrar", "Provost")).
			Get("/api/results", resultHandler.List)
		r.With(auth.RequireRole("Lecturer", "Admin")).
			Post("/api/results/save", resultHandler.Save)
		r.With(auth.RequireRole("Lecturer", "Admin")).
			Put("/api/results/{id}", resultHandler.Update)
		r.With(auth.RequireRole("Admin", "Registrar", "Lecturer")).
			Post("/api/results/bulk-import", resultHandler.BulkImport)
		r.With(auth.RequireRole("Student", "Admin", "Registrar", "Provost")).
			Get("/api/results/transcript/{student_id}", resultHandler.Transcript)

		// Payments
		r.With(auth.RequireRole("Bursar", "Admin", "Provost", "Student")).
			Get("/api/payments", paymentHandler.List)
		r.With(auth.RequireRole("Bursar", "Admin")).
			Post("/api/payments", paymentHandler.Create)
		r.With(auth.RequireRole("Bursar", "Admin")).
			Put("/api/payments/{id}/verify", paymentHandler.Verify)

		// Admissions
		r.With(auth.RequireRole("Registrar", "Admin", "Provost")).
			Get("/api/admissions", admissionHandler.List)
		r.With(auth.RequireRole("Registrar", "Admin")).
			Put("/api/admissions/{id}/status", admissionHandler.UpdateStatus)

		// Analytics
		r.With(auth.RequireRole("Admin", "Provost")).
			Get("/api/analytics/summary", analyticsHandler.Summary)
	})

	// 7. Start server with graceful shutdown
	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("🚀 Gamji Portal API running on port %s", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("FATAL: server error: %v", err)
		}
	}()

	<-quit
	log.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Printf("ERROR: server shutdown error: %v", err)
	}
	log.Println("Server stopped.")
}
