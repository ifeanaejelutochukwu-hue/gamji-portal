# Implementation Tasks
## Gamji College of Nursing Sciences — School Management Portal

---

## Phase 1: Frontend Cleanup (React)

- [x] 1. Fix package.json — remove `next` dependency, add missing React type packages
  - Remove `"next": "^16.0.8"` from dependencies
  - Add `"@types/react": "^19.0.0"` and `"@types/react-dom": "^19.0.0"` to devDependencies
  - Run `npm install` to verify clean install
  - **File:** `package.json`

- [x] 2. Delete dead `LoginForm.tsx` component
  - Delete `/components/LoginForm.tsx` entirely
  - Verify no other file imports from it
  - **File:** `components/LoginForm.tsx`

- [x] 3. Environment-gate the quick-preview login buttons in `AuthPage.tsx`
  - Wrap the "Quick Preview Portals" section with `{import.meta.env.VITE_SHOW_QUICK_LOGIN === 'true' && (...)}`
  - Create `.env.development` with `VITE_SHOW_QUICK_LOGIN=true`
  - Create `.env.production` with `VITE_SHOW_QUICK_LOGIN=false`
  - **File:** `components/AuthPage.tsx`, `.env.development`, `.env.production`

- [x] 4. Fix `VITE_API_URL` wiring in `apiClient.ts`
  - Replace the hardcoded `'http://localhost:8080'` default Go URL with `import.meta.env.VITE_API_URL || 'http://localhost:8080'`
  - Add `VITE_API_URL=http://localhost:8080` to `.env.development`
  - **File:** `services/apiClient.ts`

- [x] 5. Fix broken `api.payments.verify()` call in `AdminDashboard.tsx`
  - Replace `await api.payments.verify(id)` with `await api.payments.verify(id, newStatus as 'paid' | 'pending' | 'overdue')`
  - Remove the `api.payments.updateStatus()` call and replace with `api.payments.verify()`
  - **File:** `components/AdminDashboard.tsx`

- [x] 6. Fix `session.user.user_metadata` references in dashboards
  - In `RegistrarDashboard.tsx`: replace `session.user.user_metadata?.full_name` with `session.user.full_name`
  - In `BursarDashboard.tsx`: replace `session.user.user_metadata?.full_name` with `session.user.full_name`
  - **Files:** `components/RegistrarDashboard.tsx`, `components/BursarDashboard.tsx`

- [x] 7. Verify frontend builds cleanly after all cleanup
  - Run `npm run build` and confirm zero errors
  - Run `npm run dev` and test login for all 6 roles against the mock backend (Go backend toggle OFF)
  - **Verification:** All 6 dashboards load, no console errors, no TypeScript errors

---

## Phase 2: Go Backend — Project Scaffold

- [x] 8. Initialise Go module and project structure
  - Create `/gamji-backend/` directory alongside the React project
  - Run `go mod init gamji-backend`
  - Create the full folder structure: `cmd/server/`, `internal/auth/`, `internal/students/`, `internal/staff/`, `internal/courses/`, `internal/results/`, `internal/payments/`, `internal/admissions/`, `internal/analytics/`, `internal/db/migrations/`, `internal/mailer/`, `internal/config/`
  - **File:** `gamji-backend/go.mod`

- [x] 9. Add all Go dependencies
  - Add `github.com/go-chi/chi/v5 v5.1.0`
  - Add `github.com/jackc/pgx/v5 v5.6.0`
  - Add `github.com/golang-jwt/jwt/v5 v5.2.1`
  - Add `golang.org/x/crypto v0.24.0`
  - Add `github.com/golang-migrate/migrate/v4 v4.17.1`
  - Run `go mod tidy`
  - **File:** `gamji-backend/go.mod`, `gamji-backend/go.sum`

- [x] 10. Implement `config` package — environment variable loading
  - Read and validate: `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRY_HOURS`, `ALLOWED_ORIGINS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `FRONTEND_URL`
  - Fail fast (log + exit 1) if any required variable is missing
  - Create `.env.example` with all variables documented
  - **File:** `internal/config/config.go`, `.env.example`

- [x] 11. Implement `db` package — PostgreSQL connection pool
  - Connect using `pgxpool` with `DATABASE_URL`
  - Implement `Ping()` check on startup, fail fast if DB unreachable
  - Implement `RunMigrations()` using `golang-migrate` pointing to `internal/db/migrations/`
  - **File:** `internal/db/db.go`

- [x] 12. Write all 8 database migration SQL files
  - `001_create_users.sql` — users table with role CHECK constraint
  - `002_create_student_profiles.sql` — student_profiles with FK to users, unique reg_number
  - `003_create_staff_members.sql` — staff_members with FK to users, unique email
  - `004_create_courses.sql` — courses with FK to staff_members, unique code, units CHECK
  - `005_create_results.sql` — results with FK to student_profiles and courses, score CHECK constraints, unique(student_id, course_id)
  - `006_create_payments.sql` — payments with FK to student_profiles, auto-generated reference
  - `007_create_admission_applications.sql` — admission_applications table
  - `008_create_password_reset_tokens.sql` — password_reset_tokens with FK to users
  - Each file must have a corresponding `down` migration
  - **Files:** `internal/db/migrations/001_*.sql` through `008_*.sql`

- [x] 13. Implement `main.go` — server entry point
  - Load config, connect DB, run migrations, set up router, start HTTP server
  - Register graceful shutdown on SIGINT/SIGTERM (drain connections, close DB pool)
  - Log startup message with port number
  - **File:** `cmd/server/main.go`

---

## Phase 3: Go Backend — Middleware

- [x] 14. Implement CORS middleware
  - Allow origins from `ALLOWED_ORIGINS` config (comma-separated list)
  - Set `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
  - Set `Access-Control-Allow-Headers: Content-Type, Authorization`
  - Handle OPTIONS preflight with HTTP 200
  - **File:** `internal/auth/middleware.go`

- [x] 15. Implement JWT authentication middleware (`RequireAuth`)
  - Extract `Authorization: Bearer <token>` header
  - Validate signature using `JWT_SECRET`
  - Check `exp` claim — return HTTP 401 `{"error":"token expired"}` if past
  - Inject claims (`sub`, `email`, `full_name`, `role`) into `context.Context`
  - Return HTTP 401 `{"error":"unauthorized"}` if header missing or signature invalid
  - **File:** `internal/auth/middleware.go`

- [x] 16. Implement RBAC guard middleware factory (`RequireRole`)
  - Accept a variadic list of allowed roles
  - Extract role from request context (set by `RequireAuth`)
  - Return HTTP 403 `{"error":"forbidden"}` if caller role is not in allowed set
  - **File:** `internal/auth/middleware.go`

- [x] 17. Implement panic recovery middleware
  - Recover any panics in handlers
  - Log the stack trace
  - Return HTTP 500 `{"error":"internal server error"}`
  - **File:** `cmd/server/main.go` or `internal/auth/middleware.go`

---

## Phase 4: Go Backend — Auth Module

- [x] 18. Implement Auth service — login
  - Look up user by email in `users` table
  - Compare submitted password against `password_hash` using `bcrypt.CompareHashAndPassword`
  - On match: sign JWT with claims `{sub, email, full_name, role, iat, exp}`
  - Return `Session{Token, User}` struct
  - Return typed errors for "not found" and "wrong password" (both surface as HTTP 401)
  - **File:** `internal/auth/service.go`

- [x] 19. Implement Auth service — forgot password
  - Look up user by email (no error if not found — silent success)
  - Generate 32-byte cryptographically random hex token using `crypto/rand`
  - Insert into `password_reset_tokens` with `expires_at = NOW() + 1 hour`
  - Invoke Mailer to send reset email
  - **File:** `internal/auth/service.go`

- [x] 20. Implement Auth service — reset password
  - Look up token in `password_reset_tokens` where `used = false AND expires_at > NOW()`
  - Validate new password length ≥ 8
  - Hash new password with `bcrypt` cost 12
  - Update `users.password_hash`
  - Mark token as `used = true`
  - **File:** `internal/auth/service.go`

- [x] 21. Implement Auth HTTP handlers
  - `POST /api/auth/login` → calls login service, returns `{token, user}`
  - `POST /api/auth/logout` → returns `{message: "logged out"}` (stateless, client discards token)
  - `POST /api/auth/forgot-password` → calls forgot-password service
  - `POST /api/auth/reset-password` → calls reset-password service
  - `GET /api/health` → returns `{"status":"ok"}`
  - **File:** `internal/auth/handler.go`

- [x] 22. Implement Mailer
  - Connect to SMTP using config values
  - `SendPasswordReset(to, resetLink string)` — sends HTML email with reset link
  - Log on send failure, do not crash the request
  - **File:** `internal/mailer/mailer.go`

---

## Phase 5: Go Backend — Student Module

- [x] 23. Implement Student service — all CRUD operations
  - `List()` — SELECT all from student_profiles
  - `GetByAuthID(authID)` — SELECT by auth_id, return 404 error if not found
  - `Create(input)` — INSERT into users + student_profiles in a transaction; validate status enum; check reg_number uniqueness (return 409 error)
  - `Update(id, input)` — UPDATE student_profiles; validate status enum; return 404 if not found
  - `Delete(id)` — DELETE student_profiles (cascades to users via FK)
  - **File:** `internal/students/service.go`

- [x] 24. Implement Student HTTP handlers
  - `GET /api/students` — requires Admin/Registrar/Lecturer/Provost
  - `GET /api/students/profile?auth_id=` — requires Student (own) or Admin/Registrar
  - `POST /api/students` — requires Admin/Registrar
  - `PUT /api/students/:id` — requires Admin/Registrar
  - `DELETE /api/students/:id` — requires Admin
  - Map service errors to correct HTTP status codes (404, 409, 422)
  - **File:** `internal/students/handler.go`

---

## Phase 6: Go Backend — Staff Module

- [x] 25. Implement Staff service — all CRUD operations
  - `List()` — SELECT all from staff_members
  - `GetByAuthID(authID)` — SELECT by auth_id
  - `Create(input)` — INSERT into users + staff_members in transaction; check email uniqueness (409); validate role enum
  - `Update(id, input)` — UPDATE staff_members; validate status enum
  - `Delete(id)` — DELETE staff_members
  - **File:** `internal/staff/service.go`

- [x] 26. Implement Staff HTTP handlers
  - `GET /api/staff` — requires Admin/Provost
  - `GET /api/staff/profile?auth_id=` — requires any authenticated role
  - `POST /api/staff` — requires Admin
  - `PUT /api/staff/:id` — requires Admin
  - `DELETE /api/staff/:id` — requires Admin
  - **File:** `internal/staff/handler.go`

---

## Phase 7: Go Backend — Courses Module

- [x] 27. Implement Course service — all CRUD operations
  - `List()` — SELECT all courses
  - `ListByLecturer(lecturerID)` — SELECT WHERE lecturer_id = ?
  - `Create(input)` — INSERT; validate units 1–6; check code uniqueness (409); verify lecturer_id exists and has role=Lecturer (422)
  - `Update(id, input)` — UPDATE courses
  - `Delete(id)` — DELETE courses
  - **File:** `internal/courses/service.go`

- [x] 28. Implement Course HTTP handlers
  - `GET /api/courses` — requires any authenticated role; support `?lecturer_id=` query param
  - `POST /api/courses` — requires Admin/Registrar
  - `PUT /api/courses/:id` — requires Admin/Registrar
  - `DELETE /api/courses/:id` — requires Admin
  - **File:** `internal/courses/handler.go`

---

## Phase 8: Go Backend — Results Module

- [x] 29. Implement grade computation function
  - `computeGrade(total float64) (grade string, gradePoint float64)`
  - 70–100 → A, 5.0 | 60–69 → B, 4.0 | 50–59 → C, 3.0 | 45–49 → D, 2.0 | 0–44 → F, 0.0
  - `computeGPA(results []ResultWithCourse) float64` — weighted average rounded to 2dp
  - **File:** `internal/results/service.go`

- [x] 30. Implement Result service — all operations
  - `ListByStudent(studentID)` — JOIN with courses to include code, title, units
  - `ListByCourse(courseID)` — JOIN with student_profiles to include full_name, reg_number
  - `Save(input)` — upsert (INSERT or UPDATE based on presence of id); compute total and grade server-side; validate ca_score 0–30 and exam_score 0–70
  - `Update(id, input)` — recompute total and grade; enforce 403 if status=submitted and caller is not Admin
  - **File:** `internal/results/service.go`

- [x] 31. Implement Result HTTP handlers
  - `GET /api/results` — requires appropriate role; route by `?student_id=` or `?course_id=` query param; enforce ownership for Student and Lecturer
  - `POST /api/results/save` — requires Lecturer/Admin
  - `PUT /api/results/:id` — requires Lecturer/Admin; enforce submitted-result lock
  - **File:** `internal/results/handler.go`

---

## Phase 9: Go Backend — Payments Module

- [x] 32. Implement Payment service
  - `List()` — SELECT all payments JOIN student_profiles for full_name and reg_number
  - `ListByStudent(studentID)` — SELECT WHERE student_id = ?
  - `Verify(id, status)` — UPDATE payments SET status = ?; return 404 if not found; validate status enum
  - Auto-generate unique `reference` on INSERT if not provided
  - **File:** `internal/payments/service.go`

- [x] 33. Implement Payment HTTP handlers
  - `GET /api/payments` — requires Bursar/Admin/Provost; support `?student_id=` param; enforce Student ownership check
  - `PUT /api/payments/:id/verify` — requires Bursar/Admin
  - **File:** `internal/payments/handler.go`

---

## Phase 10: Go Backend — Admissions Module

- [x] 34. Implement Admission service
  - `List()` — SELECT all from admission_applications
  - `UpdateStatus(id, status)` — UPDATE status; validate enum; return 404 if not found
  - **File:** `internal/admissions/service.go`

- [x] 35. Implement Admission HTTP handlers
  - `GET /api/admissions` — requires Registrar/Admin/Provost
  - `PUT /api/admissions/:id/status` — requires Registrar/Admin
  - **File:** `internal/admissions/handler.go`

---

## Phase 11: Go Backend — Analytics Module

- [x] 36. Implement Analytics service
  - Single aggregated DB query (or multiple queries in one function):
    - `COUNT(*) FROM student_profiles WHERE status = 'active'`
    - `COUNT(*) FROM staff_members`
    - `COUNT(*) FROM courses`
    - `COUNT(*) FROM admission_applications WHERE status = 'pending'`
    - `SUM(amount) FROM payments WHERE status = 'paid'`
    - `COUNT(*) FROM results WHERE status = 'submitted'`
  - **File:** `internal/analytics/service.go`

- [x] 37. Implement Analytics HTTP handler
  - `GET /api/analytics/summary` — requires Admin/Provost
  - Returns the summary JSON object defined in design doc
  - **File:** `internal/analytics/handler.go`

---

## Phase 12: Router Wiring

- [x] 38. Wire all routes in `main.go`
  - Register CORS middleware globally
  - Register panic recovery middleware globally
  - Public routes (no auth): `GET /api/health`, `POST /api/auth/login`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
  - Protected routes: all others wrapped with `RequireAuth` then `RequireRole(...)` per the RBAC table in design doc
  - **File:** `cmd/server/main.go`

---

## Phase 13: Go Backend — Seed Data

- [x] 39. Write a seed script for initial Gamji data
  - Create seed file `cmd/seed/main.go`
  - Insert the Gamji staff accounts (Admin, Provost, Registrar, Bursar, Lecturer) with bcrypt-hashed passwords
  - Insert initial courses (GNS 201, GNS 203, GNS 205)
  - Insert one sample student account for testing
  - Script is run once manually: `go run ./cmd/seed/`
  - **File:** `cmd/seed/main.go`

---

## Phase 14: Docker & Deployment

- [x] 40. Write `Dockerfile` for the Go backend
  - Multi-stage build: `golang:1.22-alpine` builder → `alpine:3.19` runtime
  - Copy binary and migrations folder into final image
  - Expose port 8080
  - `CMD ["./server"]`
  - **File:** `gamji-backend/Dockerfile`

- [x] 41. Write `docker-compose.yml` for local full-stack development
  - Service `db`: `postgres:16-alpine`, volume for data persistence, port 5432
  - Service `backend`: build from `./gamji-backend`, depends on `db`, env_file `.env`
  - Service `frontend`: `node:20-alpine`, runs `npm run dev`, port 3000
  - **File:** `docker-compose.yml` (at project root)

- [x] 42. Write deployment README
  - Step-by-step: Neon DB setup → Railway backend deploy → Vercel frontend deploy
  - Environment variable checklist for each platform
  - How to run the seed script against the production DB
  - **File:** `DEPLOYMENT.md`

---

## Phase 15: End-to-End Verification

- [ ] 43. Test all 6 role logins against the live Go backend
  - Toggle Go backend ON in the login panel
  - Point to `http://localhost:8080`
  - Login as Student, Lecturer, Registrar, Bursar, Admin, Provost
  - Verify each dashboard loads real data from PostgreSQL

- [ ] 44. Test RBAC enforcement
  - Confirm a Student cannot access `GET /api/staff`
  - Confirm a Lecturer cannot delete a student
  - Confirm a Student cannot see another student's results

- [ ] 45. Test password reset flow end-to-end
  - Request reset for a known email
  - Check SMTP inbox for the reset email
  - Click link, submit new password
  - Login with the new password

- [ ] 46. Test frontend production build
  - Run `npm run build`
  - Run `npm run preview`
  - Confirm quick-login buttons are NOT visible (VITE_SHOW_QUICK_LOGIN not set)
  - Confirm all dashboards work correctly
