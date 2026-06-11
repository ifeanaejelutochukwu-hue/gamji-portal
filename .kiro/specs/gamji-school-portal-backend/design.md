# Technical Design Document
## Gamji College of Nursing Sciences — School Management Portal

---

## 1. Overview

This document covers the complete technical design for making the Gamji portal production-ready. It describes the Go backend architecture, PostgreSQL database schema, every API endpoint contract, the JWT auth flow, email/password-reset flow, and the frontend cleanup tasks.

The system has two independently deployable parts:
- **Frontend** — existing React 19 + Vite app (with cleanup applied)
- **Backend** — new Go REST API server with PostgreSQL

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                             │
└────────────────┬────────────────────────────────────────────┘
                 │
     ┌───────────▼────────────┐
     │   Frontend (Vercel)     │
     │   React 19 + Vite       │
     │   Port: 443 (HTTPS)     │
     └───────────┬────────────┘
                 │ HTTPS REST (JSON)
                 │ Authorization: Bearer <JWT>
     ┌───────────▼────────────┐
     │   Go API Server         │
     │   (Railway / Render)    │
     │   Port: 8080             │
     │                         │
     │  ┌─────────────────┐   │
     │  │  HTTP Router    │   │
     │  │  (chi / stdlib) │   │
     │  └────────┬────────┘   │
     │           │             │
     │  ┌────────▼────────┐   │
     │  │  JWT Middleware  │   │
     │  │  RBAC Guard      │   │
     │  └────────┬────────┘   │
     │           │             │
     │  ┌────────▼────────┐   │
     │  │   Handlers      │   │
     │  │  (auth/students │   │
     │  │  staff/courses  │   │
     │  │  results/pay-   │   │
     │  │  ments/admiss.) │   │
     │  └────────┬────────┘   │
     │           │             │
     │  ┌────────▼────────┐   │
     │  │  DB Layer        │   │
     │  │  (pgx / sqlc)   │   │
     │  └────────┬────────┘   │
     └───────────┼────────────┘
                 │ TCP (TLS)
     ┌───────────▼────────────┐
     │   PostgreSQL 16         │
     │   (Railway / Neon)      │
     └────────────────────────┘
                 │
     ┌───────────▼────────────┐
     │   SMTP (Gmail / Resend) │
     │   Password reset emails │
     └────────────────────────┘
```

---

## 3. Go Backend Project Structure

```
gamji-backend/
├── cmd/
│   └── server/
│       └── main.go              # Entry point: env, DB, migrations, HTTP server
├── internal/
│   ├── auth/
│   │   ├── handler.go           # POST /api/auth/login, /forgot-password, /reset-password
│   │   ├── service.go           # Business logic: bcrypt, JWT sign/verify, reset tokens
│   │   └── middleware.go        # JWT validation middleware, RBAC guard factory
│   ├── students/
│   │   ├── handler.go           # HTTP handlers for /api/students
│   │   └── service.go           # CRUD logic, validation
│   ├── staff/
│   │   ├── handler.go           # HTTP handlers for /api/staff
│   │   └── service.go           # CRUD logic, validation
│   ├── courses/
│   │   ├── handler.go           # HTTP handlers for /api/courses
│   │   └── service.go           # CRUD logic, validation
│   ├── results/
│   │   ├── handler.go           # HTTP handlers for /api/results
│   │   └── service.go           # Grade computation, score validation
│   ├── payments/
│   │   ├── handler.go           # HTTP handlers for /api/payments
│   │   └── service.go           # Payment verification, reference generation
│   ├── admissions/
│   │   ├── handler.go           # HTTP handlers for /api/admissions
│   │   └── service.go           # Status transitions
│   ├── analytics/
│   │   ├── handler.go           # GET /api/analytics/summary
│   │   └── service.go           # Aggregate DB queries
│   ├── db/
│   │   ├── db.go                # pgxpool connection setup
│   │   └── migrations/
│   │       ├── 001_create_users.sql
│   │       ├── 002_create_student_profiles.sql
│   │       ├── 003_create_staff_members.sql
│   │       ├── 004_create_courses.sql
│   │       ├── 005_create_results.sql
│   │       ├── 006_create_payments.sql
│   │       ├── 007_create_admissions.sql
│   │       └── 008_create_password_reset_tokens.sql
│   ├── mailer/
│   │   └── mailer.go            # SMTP email sender (password reset)
│   └── config/
│       └── config.go            # Reads all env vars, fails fast if missing
├── go.mod
├── go.sum
├── Dockerfile
└── .env.example
```

---

## 4. Environment Variables

```env
# Server
PORT=8080
ALLOWED_ORIGINS=https://gamji.edu.ng,http://localhost:3000

# Database
DATABASE_URL=postgres://user:pass@host:5432/gamji_portal?sslmode=require

# Auth
JWT_SECRET=<minimum-32-char-random-string>
JWT_EXPIRY_HOURS=24

# Email (password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@gamji.edu.ng
SMTP_PASS=<app-password>
SMTP_FROM=Gamji Portal <noreply@gamji.edu.ng>

# Frontend base URL (used in reset email link)
FRONTEND_URL=https://gamji.edu.ng
```

---

## 5. Database Schema

All tables use UUID v4 primary keys and UTC timestamps.

### 5.1 `users` table
```sql
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT NOT NULL UNIQUE,
    full_name   TEXT NOT NULL,
    role        TEXT NOT NULL CHECK (role IN ('Student','Lecturer','Registrar','Bursar','Admin','Provost')),
    password_hash TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 5.2 `student_profiles` table
```sql
CREATE TABLE student_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name       TEXT NOT NULL,
    reg_number      TEXT NOT NULL UNIQUE,
    program         TEXT NOT NULL,
    year_of_study   INT NOT NULL DEFAULT 1,
    level           INT NOT NULL DEFAULT 100,
    status          TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','graduated','suspended','pending')),
    email           TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 5.3 `staff_members` table
```sql
CREATE TABLE staff_members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name   TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    phone       TEXT,
    role        TEXT NOT NULL CHECK (role IN ('Admin','Lecturer','Registrar','Bursar','Provost')),
    status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','leave')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 5.4 `courses` table
```sql
CREATE TABLE courses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        TEXT NOT NULL UNIQUE,
    title       TEXT NOT NULL,
    units       INT NOT NULL CHECK (units >= 1 AND units <= 6),
    level       INT NOT NULL,
    semester    TEXT NOT NULL,
    lecturer_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
    status      TEXT NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 5.5 `results` table
```sql
CREATE TABLE results (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    ca_score    NUMERIC(5,2) NOT NULL CHECK (ca_score >= 0 AND ca_score <= 30),
    exam_score  NUMERIC(5,2) NOT NULL CHECK (exam_score >= 0 AND exam_score <= 70),
    total       NUMERIC(5,2) NOT NULL,
    grade       TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, course_id)
);
```

### 5.6 `payments` table
```sql
CREATE TABLE payments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    amount      NUMERIC(12,2) NOT NULL,
    purpose     TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid','pending','overdue')),
    reference   TEXT NOT NULL UNIQUE DEFAULT 'REF-' || upper(substring(gen_random_uuid()::text, 1, 8)),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 5.7 `admission_applications` table
```sql
CREATE TABLE admission_applications (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name    TEXT NOT NULL,
    email        TEXT NOT NULL,
    phone        TEXT NOT NULL,
    program      TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 5.8 `password_reset_tokens` table
```sql
CREATE TABLE password_reset_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 6. API Endpoint Contracts

All endpoints are prefixed with `/api`. All request/response bodies are JSON.  
Protected endpoints require `Authorization: Bearer <jwt>`.

### 6.1 Auth

#### `POST /api/auth/login`
**Public**
```json
// Request
{ "email": "student@gamji.edu.ng", "password": "mypassword" }

// 200 Response
{
  "token": "<jwt>",
  "user": {
    "id": "uuid",
    "email": "student@gamji.edu.ng",
    "full_name": "Hadiza Bello Shagari",
    "role": "Student"
  }
}

// 401 Response
{ "error": "invalid credentials" }
```

#### `POST /api/auth/logout`
**Protected (any role)**
```json
// 200 Response
{ "message": "logged out" }
```

#### `POST /api/auth/forgot-password`
**Public**
```json
// Request
{ "email": "student@gamji.edu.ng" }

// 200 Response (always, even if email not found)
{ "message": "reset email sent" }
```

#### `POST /api/auth/reset-password`
**Public**
```json
// Request
{ "token": "<reset-token>", "password": "newpassword123" }

// 200 Response
{ "message": "password updated" }

// 400 Response
{ "error": "invalid or expired token" }

// 422 Response
{ "error": "password must be at least 8 characters" }
```

#### `GET /api/health`
**Public**
```json
// 200 Response
{ "status": "ok" }
```

---

### 6.2 Students

#### `GET /api/students`
**Roles: Admin, Registrar, Lecturer, Provost**
```json
// 200 Response
[
  {
    "id": "uuid",
    "auth_id": "uuid",
    "full_name": "Hadiza Bello Shagari",
    "reg_number": "GNS/2024/0042",
    "program": "General Nursing",
    "year_of_study": 2,
    "level": 200,
    "status": "active",
    "email": "student@gamji.edu.ng"
  }
]
```

#### `GET /api/students/profile?auth_id=<uuid>`
**Roles: Student (own only), Admin, Registrar**
```json
// 200 Response — single StudentProfile object (same shape as above)
// 404 Response
{ "error": "student not found" }
```

#### `POST /api/students`
**Roles: Admin, Registrar**
```json
// Request
{
  "full_name": "Aminu Yusuf",
  "reg_number": "GNS/2025/0001",
  "program": "General Nursing",
  "year_of_study": 1,
  "level": 100,
  "status": "active",
  "email": "aminu@gamji.edu.ng",
  "password": "temppass123"   // used to create the auth user account
}

// 201 Response — full StudentProfile
// 409 Response
{ "error": "registration number already exists" }
```

#### `PUT /api/students/:id`
**Roles: Admin, Registrar**
```json
// Request (all fields optional)
{ "status": "graduated", "year_of_study": 3 }

// 200 Response — updated StudentProfile
// 404 Response
{ "error": "student not found" }
```

#### `DELETE /api/students/:id`
**Roles: Admin**
```json
// 204 No Content
```

---

### 6.3 Staff

#### `GET /api/staff`
**Roles: Admin, Provost**
```json
// 200 Response
[
  {
    "id": "uuid",
    "auth_id": "uuid",
    "full_name": "Dr. Ibrahim Abubakar",
    "email": "lecturer@gamji.edu.ng",
    "phone": "+234 803 123 4567",
    "role": "Lecturer",
    "status": "active"
  }
]
```

#### `GET /api/staff/profile?auth_id=<uuid>`
**Roles: Any authenticated (own record)**
```json
// 200 Response — single StaffMember
// 404 Response
{ "error": "staff not found" }
```

#### `POST /api/staff`
**Roles: Admin**
```json
// Request
{
  "full_name": "Dr. Fatima Garba",
  "email": "fgarba@gamji.edu.ng",
  "phone": "+234 800 000 0000",
  "role": "Lecturer",
  "status": "active",
  "password": "temppass123"
}

// 201 Response — full StaffMember
// 409 Response
{ "error": "email already registered" }
```

#### `PUT /api/staff/:id`
**Roles: Admin**
```json
// Request (all fields optional)
{ "status": "leave" }

// 200 Response — updated StaffMember
```

#### `DELETE /api/staff/:id`
**Roles: Admin**
```json
// 204 No Content
```

---

### 6.4 Courses

#### `GET /api/courses`
**Roles: All authenticated**
```json
// 200 Response
[
  {
    "id": "uuid",
    "code": "GNS 201",
    "title": "Foundations of Nursing Practice",
    "units": 3,
    "level": 200,
    "semester": "1st",
    "lecturer_id": "uuid",
    "status": "active"
  }
]
```

#### `GET /api/courses?lecturer_id=<uuid>`
**Roles: All authenticated**
```json
// 200 Response — filtered array of Course objects
```

#### `POST /api/courses`
**Roles: Admin, Registrar**
```json
// Request
{
  "code": "GNS 301",
  "title": "Community Health Nursing",
  "units": 3,
  "level": 300,
  "semester": "2nd",
  "lecturer_id": "uuid"
}

// 201 Response — full Course
// 409 Response
{ "error": "course code already exists" }
```

#### `PUT /api/courses/:id`
**Roles: Admin, Registrar**
```json
// Request (partial)
{ "lecturer_id": "uuid", "status": "completed" }

// 200 Response — updated Course
```

#### `DELETE /api/courses/:id`
**Roles: Admin**
```json
// 204 No Content
```

---

### 6.5 Results

#### `GET /api/results?student_id=<uuid>`
**Roles: Student (own), Lecturer, Admin, Registrar, Provost**
```json
// 200 Response
[
  {
    "id": "uuid",
    "student_id": "uuid",
    "course_id": "uuid",
    "ca_score": 24,
    "exam_score": 52,
    "total": 76,
    "grade": "A",
    "status": "submitted",
    "course_code": "GNS 201",
    "course_title": "Foundations of Nursing Practice",
    "units": 3
  }
]
```

#### `GET /api/results?course_id=<uuid>`
**Roles: Lecturer (own courses), Admin, Registrar, Provost**
```json
// 200 Response
[
  {
    "id": "uuid",
    "student_id": "uuid",
    "course_id": "uuid",
    "ca_score": 24,
    "exam_score": 52,
    "total": 76,
    "grade": "A",
    "status": "submitted",
    "student_name": "Hadiza Bello Shagari",
    "reg_number": "GNS/2024/0042"
  }
]
```

#### `POST /api/results/save`
**Roles: Lecturer, Admin**
```json
// Request (id optional — omit to create, include to update)
{
  "id": "uuid",
  "student_id": "uuid",
  "course_id": "uuid",
  "ca_score": 24,
  "exam_score": 52,
  "status": "draft"
}

// 200/201 Response — full Result (total and grade computed server-side)

// 422 Response
{ "error": "ca_score must be between 0 and 30" }
```

#### `PUT /api/results/:id`
**Roles: Lecturer (draft only), Admin**
```json
// Request (partial)
{ "ca_score": 26, "exam_score": 55, "status": "submitted" }

// 200 Response — updated Result
// 403 Response (if non-Admin tries to edit submitted result)
{ "error": "submitted results cannot be modified" }
```

---

### 6.6 Payments

#### `GET /api/payments`
**Roles: Bursar, Admin, Provost**
```json
// 200 Response
[
  {
    "id": "uuid",
    "student_id": "uuid",
    "amount": 120000,
    "purpose": "Tuition Fees (2024/2025)",
    "status": "paid",
    "reference": "REF-A1B2C3D4",
    "created_at": "2026-05-15T10:00:00Z",
    "students": {
      "full_name": "Hadiza Bello Shagari",
      "reg_number": "GNS/2024/0042"
    }
  }
]
```

#### `GET /api/payments?student_id=<uuid>`
**Roles: Bursar, Admin, Student (own only)**
```json
// 200 Response — filtered Payment array (same shape, students field omitted for student role)
```

#### `PUT /api/payments/:id/verify`
**Roles: Bursar, Admin**
```json
// Request
{ "status": "paid" }

// 200 Response — updated Payment
// 404 Response
{ "error": "payment not found" }
```

---

### 6.7 Admissions

#### `GET /api/admissions`
**Roles: Registrar, Admin, Provost**
```json
// 200 Response
[
  {
    "id": "uuid",
    "full_name": "Mary Amadi",
    "email": "mary.amadi@gmail.com",
    "phone": "+234 705 444 3333",
    "program": "General Nursing",
    "status": "pending",
    "submitted_at": "2026-06-01T11:00:00Z"
  }
]
```

#### `PUT /api/admissions/:id/status`
**Roles: Registrar, Admin**
```json
// Request
{ "status": "approved" }

// 200 Response — updated AdmissionApplication
```

---

### 6.8 Analytics

#### `GET /api/analytics/summary`
**Roles: Admin, Provost**
```json
// 200 Response
{
  "total_active_students": 142,
  "total_staff": 18,
  "total_courses": 24,
  "pending_admissions": 7,
  "total_revenue_paid": 16850000,
  "submitted_results": 284
}
```

---

## 7. JWT Token Design

```
Header:  { "alg": "HS256", "typ": "JWT" }

Payload: {
  "sub":       "uuid",          // users.id
  "email":     "...",
  "full_name": "...",
  "role":      "Student",
  "iat":       1234567890,      // issued at (unix)
  "exp":       1234654290       // expires at (iat + 24h)
}

Signature: HMAC-SHA256(base64(header) + "." + base64(payload), JWT_SECRET)
```

The JWT is stored in the frontend's `localStorage` (already implemented in `apiClient.ts` as `gamji_portal_session`). No cookie-based auth is needed.

---

## 8. Authentication Flow

```
User enters email + password
        │
        ▼
POST /api/auth/login
        │
        ▼
Look up users.email in DB
        │
    Not found ──────────────► HTTP 401 { "error": "invalid credentials" }
        │
    Found
        │
        ▼
bcrypt.CompareHashAndPassword(stored_hash, submitted_password)
        │
    Mismatch ───────────────► HTTP 401 { "error": "invalid credentials" }
        │
    Match
        │
        ▼
Sign JWT with claims { sub, email, full_name, role, iat, exp }
        │
        ▼
HTTP 200 { token, user }
        │
        ▼
Frontend stores session in localStorage ("gamji_portal_session")
Frontend includes "Authorization: Bearer <token>" on every subsequent request
```

---

## 9. Password Reset Flow

```
User clicks "Forgot password?" → enters email
        │
        ▼
POST /api/auth/forgot-password { email }
        │
        ▼
Look up email in DB
    (always respond HTTP 200 to prevent email enumeration)
        │
    Found
        │
        ▼
Generate cryptographically random 32-byte hex token
Store in password_reset_tokens (user_id, token, expires_at = NOW()+1h, used=false)
        │
        ▼
Send email via SMTP:
  Subject: "Reset your Gamji Portal password"
  Body: "Click here to reset: {FRONTEND_URL}/reset-password?token={token}"
        │
        ▼
User clicks link → frontend shows new password form
        │
        ▼
POST /api/auth/reset-password { token, password }
        │
        ▼
Look up token in DB → check used=false AND expires_at > NOW()
        │
    Invalid/expired ─────────► HTTP 400 { "error": "invalid or expired token" }
        │
    Valid
        │
        ▼
Validate password length ≥ 8
        │
        ▼
bcrypt.GenerateFromPassword(new_password, cost=12)
UPDATE users SET password_hash = <new_hash>
UPDATE password_reset_tokens SET used = true
        │
        ▼
HTTP 200 { "message": "password updated" }
```

---

## 10. RBAC Middleware Design

The RBAC Guard is implemented as a Go middleware that wraps route handlers:

```go
// Usage in router setup
r.With(RequireAuth, RequireRole("Admin", "Registrar")).Get("/api/students", students.ListHandler)
r.With(RequireAuth, RequireRole("Admin")).Delete("/api/students/{id}", students.DeleteHandler)

// RequireAuth: validates JWT, injects claims into request context
// RequireRole: checks context claims against allowed roles, returns 403 if not in set
```

For ownership checks (student can only see own results/payments):

```go
// In results handler:
if callerRole == "Student" && callerStudentID != requestedStudentID {
    http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
    return
}
```

---

## 11. Grade Computation Logic

```go
func computeGrade(total float64) (string, float64) {
    switch {
    case total >= 70: return "A", 5.0
    case total >= 60: return "B", 4.0
    case total >= 50: return "C", 3.0
    case total >= 45: return "D", 2.0
    default:          return "F", 0.0
    }
}

func computeGPA(results []Result) float64 {
    totalPoints, totalUnits := 0.0, 0
    for _, r := range results {
        _, gp := computeGrade(r.Total)
        totalPoints += gp * float64(r.Course.Units)
        totalUnits  += r.Course.Units
    }
    if totalUnits == 0 { return 0 }
    return math.Round((totalPoints/float64(totalUnits))*100) / 100
}
```

---

## 12. Frontend Cleanup Tasks

Three changes to the existing React codebase before production:

### 12.1 Remove `LoginForm.tsx` and dead `supabaseClient` import
- Delete `/components/LoginForm.tsx` entirely (unused, references non-existent `supabaseClient`)
- The `AuthPage.tsx` already handles login — nothing else needs to change

### 12.2 Remove bogus `next` dependency
```json
// package.json — remove this line:
"next": "^16.0.8"

// Also add missing type packages:
"@types/react": "^19.0.0",
"@types/react-dom": "^19.0.0"
```

### 12.3 Environment-gate the quick-preview login buttons
```tsx
// In AuthPage.tsx, wrap the "Quick Preview Portals" section:
{import.meta.env.VITE_SHOW_QUICK_LOGIN === 'true' && (
  <div className="pt-6 border-t border-slate-100 space-y-3">
    {/* ... quick login buttons ... */}
  </div>
)}
```
In `.env.production`, this variable is absent (or `false`) so buttons are hidden.  
In `.env.development`, set `VITE_SHOW_QUICK_LOGIN=true` for testing.

### 12.4 Fix `api.payments.verify()` call in `AdminDashboard.tsx`
The current code calls `api.payments.verify(id)` without the required `status` argument:
```tsx
// Current (broken):
await api.payments.verify(id);

// Fixed:
await api.payments.verify(id, newStatus as 'paid' | 'pending' | 'overdue');
```
Also remove the `api.payments.updateStatus()` call — this method doesn't exist. Use `api.payments.verify(id, status)` for all payment status changes.

### 12.5 Fix `session.user.user_metadata` references
`RegistrarDashboard.tsx` and `BursarDashboard.tsx` reference `session.user.user_metadata?.full_name` which doesn't exist on the `User` interface. Use `session.user.full_name` directly.

---

## 13. Deployment Plan

### Backend (Railway — recommended for Go)
1. Push `gamji-backend/` to GitHub
2. Connect repo to Railway, set all env vars in Railway dashboard
3. Railway auto-detects Go via `go.mod`, builds with `go build ./cmd/server`
4. Set `PORT=8080` — Railway exposes as HTTPS automatically
5. Point a custom domain: `api.gamji.edu.ng`

### Frontend (Vercel)
1. Push the React project to GitHub
2. Connect to Vercel, set env vars:
   ```
   VITE_API_URL=https://api.gamji.edu.ng
   VITE_SHOW_QUICK_LOGIN=false
   ```
3. In `apiClient.ts`, replace hardcoded `http://localhost:8080` default with:
   ```ts
   const url = localStorage.getItem(STORAGE_PREFIX + 'go_url') || import.meta.env.VITE_API_URL || 'http://localhost:8080';
   ```
4. Point domain: `gamji.edu.ng`

### Database (Neon — recommended serverless PostgreSQL)
1. Create a Neon project, get the `DATABASE_URL`
2. Migrations run automatically on Go server startup

---

## 14. Multi-School Customization Strategy

When adapting this for another school later, the changes are isolated to:

| What to change | Where |
|---|---|
| School name, logo | `Logo.tsx`, `AuthPage.tsx` hero text |
| Color palette | `tailwind.config` — swap `nursing-*` tokens |
| Programs list | Seed data / admin panel |
| Grading scale | `results/service.go → computeGrade()` |
| Email sender name/domain | `SMTP_FROM` env var |
| Registration number format | Validation in `students/service.go` |
| Fee structure | Payments seed data |
| Domain | Vercel + Railway settings |

No core backend logic or database schema needs to change between schools.

---

## 15. Go Dependencies

```go
// go.mod
module gamji-backend

go 1.22

require (
    github.com/go-chi/chi/v5        v5.1.0   // HTTP router
    github.com/jackc/pgx/v5         v5.6.0   // PostgreSQL driver
    github.com/golang-jwt/jwt/v5    v5.2.1   // JWT
    golang.org/x/crypto             v0.24.0  // bcrypt
    github.com/golang-migrate/migrate/v4 v4.17.1 // DB migrations
)
```
