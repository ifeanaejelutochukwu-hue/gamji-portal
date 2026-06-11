// Seed script — run once to populate the DB with initial Gamji data.
// Usage: go run ./cmd/seed/
// Requires DATABASE_URL environment variable to be set.
package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"gamji-backend/internal/auth"
	"gamji-backend/internal/db"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	pool, err := db.Connect(dbURL)
	if err != nil {
		log.Fatalf("DB connection failed: %v", err)
	}
	defer pool.Close()

	ctx := context.Background()

	type seedUser struct {
		email    string
		fullName string
		role     string
		password string
		// staff-only fields
		phone  string
		status string
		// student-only fields
		regNumber   string
		program     string
		yearOfStudy int
		level       int
	}

	users := []seedUser{
		// Staff
		{email: "admin@gamji.edu.ng", fullName: "Suleiman Bello", role: "Admin", password: "GamjiAdmin2024!", phone: "+234 809 111 2222", status: "active"},
		{email: "provost@gamji.edu.ng", fullName: "Prof. Aliyu Muhammad Sokoto", role: "Provost", password: "GamjiProvost2024!", phone: "+234 803 000 1111", status: "active"},
		{email: "registrar@gamji.edu.ng", fullName: "Mallam Kabiru Usman", role: "Registrar", password: "GamjiReg2024!", phone: "+234 806 987 6543", status: "active"},
		{email: "bursar@gamji.edu.ng", fullName: "Mrs. Aisha Aliyu", role: "Bursar", password: "GamjiBursar2024!", phone: "+234 812 345 6789", status: "active"},
		{email: "lecturer@gamji.edu.ng", fullName: "Dr. Ibrahim Abubakar", role: "Lecturer", password: "GamjiLec2024!", phone: "+234 803 123 4567", status: "active"},
		// Student
		{email: "student@gamji.edu.ng", fullName: "Hadiza Bello Shagari", role: "Student", password: "GamjiStudent2024!", regNumber: "GNS/2024/0042", program: "General Nursing", yearOfStudy: 2, level: 200},
	}

	log.Println("Seeding users...")
	var lecturerStaffID string

	for _, u := range users {
		hash, err := auth.HashPassword(u.password)
		if err != nil {
			log.Fatalf("hash password for %s: %v", u.email, err)
		}

		var userID string
		err = pool.QueryRow(ctx,
			`INSERT INTO users (email, full_name, role, password_hash)
			 VALUES ($1, $2, $3, $4)
			 ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
			 RETURNING id`,
			u.email, u.fullName, u.role, hash,
		).Scan(&userID)
		if err != nil {
			log.Fatalf("insert user %s: %v", u.email, err)
		}

		if u.role == "Student" {
			_, err = pool.Exec(ctx,
				`INSERT INTO student_profiles (auth_id, full_name, reg_number, program, year_of_study, level, status, email)
				 VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)
				 ON CONFLICT (reg_number) DO NOTHING`,
				userID, u.fullName, u.regNumber, u.program, u.yearOfStudy, u.level, u.email,
			)
			if err != nil {
				log.Fatalf("insert student profile for %s: %v", u.email, err)
			}
		} else {
			var staffID string
			err = pool.QueryRow(ctx,
				`INSERT INTO staff_members (auth_id, full_name, email, phone, role, status)
				 VALUES ($1, $2, $3, $4, $5, $6)
				 ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
				 RETURNING id`,
				userID, u.fullName, u.email, u.phone, u.role, u.status,
			).Scan(&staffID)
			if err != nil {
				log.Fatalf("insert staff member for %s: %v", u.email, err)
			}
			if u.role == "Lecturer" {
				lecturerStaffID = staffID
			}
		}
		fmt.Printf("  ✓ %s (%s)\n", u.fullName, u.role)
	}

	// Seed courses
	log.Println("Seeding courses...")
	type seedCourse struct {
		code     string
		title    string
		units    int
		level    int
		semester string
	}
	courses := []seedCourse{
		{"GNS 201", "Foundations of Nursing Practice", 3, 200, "1st"},
		{"GNS 203", "Human Anatomy & Physiology II", 4, 200, "1st"},
		{"GNS 205", "Pharmacology in Nursing", 3, 200, "1st"},
		{"GNS 101", "Introduction to Nursing Sciences", 3, 100, "1st"},
		{"GNS 103", "Human Anatomy & Physiology I", 4, 100, "1st"},
		{"GNS 301", "Community Health Nursing", 3, 300, "1st"},
	}
	for _, c := range courses {
		_, err := pool.Exec(ctx,
			`INSERT INTO courses (code, title, units, level, semester, lecturer_id)
			 VALUES ($1, $2, $3, $4, $5, $6)
			 ON CONFLICT (code) DO NOTHING`,
			c.code, c.title, c.units, c.level, c.semester, lecturerStaffID,
		)
		if err != nil {
			log.Fatalf("insert course %s: %v", c.code, err)
		}
		fmt.Printf("  ✓ %s — %s\n", c.code, c.title)
	}

	// Seed sample admission applications
	log.Println("Seeding admission applications...")
	admissions := []struct {
		name, email, phone, program, status string
	}{
		{"Mary Amadi", "mary.amadi@gmail.com", "+234 705 444 3333", "General Nursing", "pending"},
		{"Mustapha Gwadabawa", "musty.g@yahoo.com", "+234 815 666 7777", "Basic Midwifery", "approved"},
		{"Zainab Isa Aliyu", "zainab.isa@outlook.com", "+234 902 333 4444", "Public Health Nursing", "rejected"},
	}
	for _, a := range admissions {
		_, err := pool.Exec(ctx,
			`INSERT INTO admission_applications (full_name, email, phone, program, status)
			 VALUES ($1, $2, $3, $4, $5)
			 ON CONFLICT DO NOTHING`,
			a.name, a.email, a.phone, a.program, a.status,
		)
		if err != nil {
			log.Printf("WARN: insert admission %s: %v", a.name, err)
		} else {
			fmt.Printf("  ✓ %s (%s)\n", a.name, a.status)
		}
	}

	log.Println("\n✅ Seed complete. Default passwords are in cmd/seed/main.go — change them after first login.")
}
