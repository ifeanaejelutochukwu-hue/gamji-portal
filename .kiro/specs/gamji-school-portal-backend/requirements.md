# Requirements Document

## Introduction

This document specifies the requirements for the Gamji College of Nursing Sciences student management portal backend. The current frontend (React + TypeScript + Vite) runs entirely on localStorage mock data and already implements a complete REST API client with a toggle to switch from mock to a live Go backend. This project delivers the Go REST API server, PostgreSQL database schema and migrations, JWT authentication, role-based access control, password reset via email, and the necessary frontend cleanup (removal of the dead `LoginForm.tsx` / `supabaseClient` reference, the bogus `next` npm dependency, and the quick-preview login buttons) so that Gamji College can deploy and use the portal in production immediately.

The backend is designed for Gamji College specifically, with hooks to support multi-tenancy later.

---

## Glossary

- **API_Server**: The Go HTTP server that handles all REST requests from the React frontend.
- **Auth_Service**: The subsystem responsible for credential validation, JWT issuance, and password reset.
- **JWT**: JSON Web Token — a signed bearer token used to authenticate and authorise requests.
- **RBAC_Guard**: The middleware component that enforces role-based access control on each protected endpoint.
- **Student_Service**: The subsystem that manages `StudentProfile` records.
- **Staff_Service**: The subsystem that manages `StaffMember` records.
- **Course_Service**: The subsystem that manages `Course` records.
- **Result_Service**: The subsystem that manages academic `Result` records.
- **Payment_Service**: The subsystem that manages fee `Payment` records.
- **Admission_Service**: The subsystem that manages `AdmissionApplication` records.
- **DB**: The PostgreSQL relational database that persists all data.
- **Mailer**: The component responsible for sending transactional emails (password reset, notifications).
- **StudentProfile**: `{ id, auth_id, full_name, reg_number, program, year_of_study, level, status, email }`
- **StaffMember**: `{ id, auth_id, full_name, email, phone, role, status }`
- **Course**: `{ id, code, title, units, level, semester, lecturer_id, status }`
- **Result**: `{ id, student_id, course_id, ca_score, exam_score, total, grade, status }`
- **Payment**: `{ id, student_id, amount, purpose, status, created_at, reference }`
- **AdmissionApplication**: `{ id, full_name, email, phone, program, status, submitted_at }`
- **Role**: One of `Student`, `Lecturer`, `Registrar`, `Bursar`, `Admin`, `Provost`
- **GPA**: Grade Point Average for a single semester computed from Results and Course units
- **CGPA**: Cumulative GPA across all semesters
- **Grading_Scale**: The fixed mapping from total score to letter grade and grade point used at Gamji College (e.g. 70–100 → A → 5.0, 60–69 → B → 4.0, 50–59 → C → 3.0, 45–49 → D → 2.0, 0–44 → F → 0.0)
- **Reset_Token**: A cryptographically random single-use token with a 1-hour TTL used in the password reset flow

---

## Requirements

### Requirement 1: Go REST API Server

**User Story:** As Gamji College IT staff, I want a production-ready Go HTTP server, so that the React frontend can connect to real persisted data instead of localStorage mock data.

#### Acceptance Criteria

1. THE API_Server SHALL expose all REST endpoints listed in this document at the path prefix `/api`.
2. WHEN the API_Server receives a `GET /api/health` request, THE API_Server SHALL respond with HTTP 200 and a JSON body `{"status":"ok"}` within 500ms.
3. THE API_Server SHALL accept and return JSON for all request and response bodies.
4. WHEN the API_Server receives a request from an origin listed in the `ALLOWED_ORIGINS` environment variable, THE API_Server SHALL include the appropriate CORS headers (`Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`) in the response.
5. WHEN the API_Server receives an HTTP `OPTIONS` preflight request, THE API_Server SHALL respond with HTTP 200 and the appropriate CORS headers.
6. THE API_Server SHALL read all configuration (database DSN, JWT secret, SMTP credentials, allowed origins, port) from environment variables and SHALL NOT hardcode any secrets.
7. WHEN the API_Server fails to connect to the DB on startup, THE API_Server SHALL log the error and exit with a non-zero status code.
8. THE API_Server SHALL run all pending DB migrations automatically on startup before accepting requests.
9. WHEN an unhandled panic occurs in a request handler, THE API_Server SHALL recover the panic, log the stack trace, and respond with HTTP 500.
10. THE API_Server SHALL respond to all requests with a `Content-Type: application/json` header.

---

### Requirement 2: Authentication

**User Story:** As a portal user (any role), I want to log in with my email and password and receive a session token, so that I can access my role-specific dashboard securely.

#### Acceptance Criteria

1. WHEN a `POST /api/auth/login` request is received with a valid `email` and `password`, THE Auth_Service SHALL validate the credentials against the DB, issue a signed JWT, and return `{"token": "<jwt>", "user": {"id", "email", "full_name", "role"}}` with HTTP 200.
2. WHEN a `POST /api/auth/login` request is received with an unrecognised `email` or incorrect `password`, THE Auth_Service SHALL respond with HTTP 401 and `{"error": "invalid credentials"}`.
3. THE Auth_Service SHALL hash all passwords using bcrypt with a cost factor of at least 12 before storing them in the DB.
4. THE Auth_Service SHALL sign JWTs using the `JWT_SECRET` environment variable with the HS256 algorithm and include `sub` (user ID), `role`, `email`, `full_name`, and `exp` (expiry) claims.
5. THE Auth_Service SHALL set JWT expiry to 24 hours from issuance.
6. WHEN a protected endpoint receives a request without a valid `Authorization: Bearer <token>` header, THE RBAC_Guard SHALL respond with HTTP 401 and `{"error": "unauthorized"}`.
7. WHEN a protected endpoint receives a request with an expired JWT, THE RBAC_Guard SHALL respond with HTTP 401 and `{"error": "token expired"}`.
8. FOR ALL valid user credentials `(email, password)`: hashing the password then verifying it against the stored hash SHALL return true (bcrypt round-trip property).
9. FOR ALL valid JWTs issued by the Auth_Service: parsing the token with the correct secret SHALL return claims equal to those used during signing (JWT round-trip property).
10. FOR ALL JWTs whose `exp` claim is in the past: THE RBAC_Guard SHALL reject the token with HTTP 401 (expiry invariant).

---

### Requirement 3: Password Reset

**User Story:** As a portal user, I want to reset my password via email, so that I can regain access if I forget my credentials.

#### Acceptance Criteria

1. WHEN a `POST /api/auth/forgot-password` request is received with a registered `email`, THE Auth_Service SHALL generate a Reset_Token, persist it in the DB with a 1-hour expiry, and instruct the Mailer to send a password reset email to that address, then respond with HTTP 200 and `{"message": "reset email sent"}`.
2. IF `POST /api/auth/forgot-password` is received with an unregistered `email`, THEN THE Auth_Service SHALL respond with HTTP 200 and `{"message": "reset email sent"}` (to prevent email enumeration).
3. WHEN a `POST /api/auth/reset-password` request is received with a valid, unexpired Reset_Token and a new password of at least 8 characters, THE Auth_Service SHALL update the user's password hash in the DB, invalidate the Reset_Token, and respond with HTTP 200.
4. IF `POST /api/auth/reset-password` is received with an expired or already-used Reset_Token, THEN THE Auth_Service SHALL respond with HTTP 400 and `{"error": "invalid or expired token"}`.
5. IF `POST /api/auth/reset-password` is received with a new password shorter than 8 characters, THEN THE Auth_Service SHALL respond with HTTP 422 and `{"error": "password must be at least 8 characters"}`.
6. FOR ALL Reset_Tokens: a token generated then immediately validated SHALL succeed, and the same token validated a second time SHALL fail (single-use invariant).
7. FOR ALL Reset_Tokens: a token validated after its 1-hour TTL SHALL fail with the expired error (TTL invariant).

---

### Requirement 4: Role-Based Access Control

**User Story:** As a school administrator, I want each role to only access the data and actions appropriate to their responsibilities, so that students cannot tamper with results or bursar records.

#### Acceptance Criteria

1. THE RBAC_Guard SHALL enforce the following access policy for every protected endpoint:

   | Endpoint | Allowed Roles |
   |---|---|
   | GET /api/students | Admin, Registrar, Lecturer, Provost |
   | POST /api/students | Admin, Registrar |
   | PUT /api/students/:id | Admin, Registrar |
   | DELETE /api/students/:id | Admin |
   | GET /api/students/profile | Student (own record only) |
   | GET /api/staff | Admin, Provost |
   | POST /api/staff | Admin |
   | PUT /api/staff/:id | Admin |
   | DELETE /api/staff/:id | Admin |
   | GET /api/courses | All authenticated roles |
   | POST /api/courses | Admin, Registrar |
   | PUT /api/courses/:id | Admin, Registrar |
   | DELETE /api/courses/:id | Admin |
   | GET /api/results | Lecturer (own courses), Student (own results), Admin, Registrar, Provost |
   | POST /api/results/save | Lecturer, Admin |
   | PUT /api/results/:id | Lecturer, Admin |
   | GET /api/payments | Bursar, Admin, Provost |
   | GET /api/payments?student_id | Bursar, Admin, Student (own only) |
   | PUT /api/payments/:id/verify | Bursar, Admin |
   | GET /api/admissions | Registrar, Admin, Provost |
   | PUT /api/admissions/:id/status | Registrar, Admin |

2. WHEN the RBAC_Guard evaluates a request for a role not in the allowed set for that endpoint, THE RBAC_Guard SHALL respond with HTTP 403 and `{"error": "forbidden"}`.
3. WHEN a Student requests `GET /api/results?student_id=X` where X is not their own student ID, THE RBAC_Guard SHALL respond with HTTP 403.
4. WHEN a Student requests `GET /api/payments?student_id=X` where X is not their own student ID, THE RBAC_Guard SHALL respond with HTTP 403.
5. WHEN a Lecturer requests `GET /api/results?course_id=X` for a course not assigned to them, THE RBAC_Guard SHALL respond with HTTP 403.
6. FOR ALL (role, endpoint) combinations not in the allowed set: THE RBAC_Guard SHALL always return HTTP 403, regardless of any other request parameters (RBAC exhaustiveness property).

---

### Requirement 5: Student Management

**User Story:** As an Admin or Registrar, I want to create, read, update, and delete student records, so that the school maintains accurate enrollment data.

#### Acceptance Criteria

1. WHEN a `GET /api/students` request is received by an authorised user, THE Student_Service SHALL return an array of all `StudentProfile` objects with HTTP 200.
2. WHEN a `GET /api/students/profile?auth_id=<id>` request is received by an authorised user, THE Student_Service SHALL return the matching `StudentProfile` with HTTP 200.
3. IF `GET /api/students/profile?auth_id=<id>` is received and no matching student exists, THEN THE Student_Service SHALL respond with HTTP 404 and `{"error": "student not found"}`.
4. WHEN a `POST /api/students` request is received with valid student data, THE Student_Service SHALL create a new `StudentProfile` in the DB and return the created record with HTTP 201.
5. IF `POST /api/students` is received with a `reg_number` that already exists in the DB, THEN THE Student_Service SHALL respond with HTTP 409 and `{"error": "registration number already exists"}`.
6. WHEN a `PUT /api/students/:id` request is received with valid partial student data, THE Student_Service SHALL update the matching record and return the updated `StudentProfile` with HTTP 200.
7. IF `PUT /api/students/:id` is received and no student with that `id` exists, THEN THE Student_Service SHALL respond with HTTP 404.
8. WHEN a `DELETE /api/students/:id` request is received, THE Student_Service SHALL remove the record from the DB and respond with HTTP 204.
9. IF `POST /api/students` is received with a `status` value outside `{active, graduated, suspended, pending}`, THEN THE Student_Service SHALL respond with HTTP 422 and a descriptive validation error.
10. FOR ALL created StudentProfile records: reading the record by its returned ID SHALL return data equal to the data submitted at creation (create-then-read round-trip property).
11. FOR ALL student lists before and after a successful `POST /api/students`: the list length after SHALL equal the length before plus one (count invariant).
12. FOR ALL student lists before and after a successful `DELETE /api/students/:id`: the list SHALL not contain the deleted `id` (deletion invariant).
13. FOR ALL pairs of StudentProfile records in the DB: their `reg_number` values SHALL be distinct (uniqueness invariant).

---

### Requirement 6: Staff Management

**User Story:** As an Admin, I want to create, read, update, and delete staff records, so that lecturer, registrar, bursar, and other accounts are accurately maintained.

#### Acceptance Criteria

1. WHEN a `GET /api/staff` request is received by an authorised user, THE Staff_Service SHALL return an array of all `StaffMember` objects with HTTP 200.
2. WHEN a `POST /api/staff` request is received with valid staff data, THE Staff_Service SHALL create a new `StaffMember` record and a corresponding auth user account in the DB, then return the created record with HTTP 201.
3. IF `POST /api/staff` is received with an `email` already registered in the DB, THEN THE Staff_Service SHALL respond with HTTP 409 and `{"error": "email already registered"}`.
4. IF `POST /api/staff` is received with a `role` value outside `{Admin, Lecturer, Registrar, Bursar, Provost}`, THEN THE Staff_Service SHALL respond with HTTP 422 and a descriptive validation error.
5. WHEN a `PUT /api/staff/:id` request is received with valid partial staff data, THE Staff_Service SHALL update the matching record and return the updated `StaffMember` with HTTP 200.
6. IF `PUT /api/staff/:id` is received and no staff member with that `id` exists, THEN THE Staff_Service SHALL respond with HTTP 404.
7. WHEN a `DELETE /api/staff/:id` request is received, THE Staff_Service SHALL remove the record and respond with HTTP 204.
8. IF `PUT /api/staff/:id` is received with a `status` value outside `{active, leave}`, THEN THE Staff_Service SHALL respond with HTTP 422 and a descriptive validation error.
9. FOR ALL created StaffMember records: reading by returned ID SHALL equal submitted data (create-then-read round-trip property).
10. FOR ALL pairs of StaffMember records in the DB: their `email` values SHALL be distinct (email uniqueness invariant).

---

### Requirement 7: Course Management

**User Story:** As an Admin or Registrar, I want to create, read, update, and delete course records and assign lecturers, so that the academic timetable is correctly represented in the system.

#### Acceptance Criteria

1. WHEN a `GET /api/courses` request is received by an authorised user, THE Course_Service SHALL return all `Course` objects with HTTP 200.
2. WHEN a `GET /api/courses?lecturer_id=<id>` request is received, THE Course_Service SHALL return only the courses assigned to that lecturer with HTTP 200.
3. WHEN a `POST /api/courses` request is received with valid course data, THE Course_Service SHALL create the record in the DB and return it with HTTP 201.
4. IF `POST /api/courses` is received with a `code` that already exists in the DB, THEN THE Course_Service SHALL respond with HTTP 409 and `{"error": "course code already exists"}`.
5. IF `POST /api/courses` is received with a `units` value less than 1 or greater than 6, THEN THE Course_Service SHALL respond with HTTP 422 and a descriptive validation error.
6. IF `POST /api/courses` is received with a `lecturer_id` that does not match any Staff record with role `Lecturer`, THEN THE Course_Service SHALL respond with HTTP 422 and `{"error": "lecturer not found"}`.
7. WHEN a `PUT /api/courses/:id` request is received with valid partial data, THE Course_Service SHALL update the record and return the updated `Course` with HTTP 200.
8. WHEN a `DELETE /api/courses/:id` request is received, THE Course_Service SHALL remove the record and respond with HTTP 204.
9. FOR ALL created Course records: reading by ID SHALL return data equal to data submitted (round-trip property).
10. FOR ALL pairs of Course records: their `code` values SHALL be distinct (course code uniqueness invariant).

---

### Requirement 8: Result Management

**User Story:** As a Lecturer, I want to enter, save as draft, and submit student results for my courses, so that students and administrators can view accurate academic records.

#### Acceptance Criteria

1. WHEN a `GET /api/results?student_id=<id>` request is received by an authorised user, THE Result_Service SHALL return all Result records for that student, each joined with the corresponding course `code`, `title`, and `units`, with HTTP 200.
2. WHEN a `GET /api/results?course_id=<id>` request is received by an authorised Lecturer or Admin, THE Result_Service SHALL return all Result records for that course, each joined with the corresponding student `full_name` and `reg_number`, with HTTP 200.
3. WHEN a `POST /api/results/save` request is received with a payload including `student_id`, `course_id`, `ca_score`, and `exam_score`, THE Result_Service SHALL compute `total = ca_score + exam_score`, derive `grade` from the Grading_Scale, persist the record with the given `status`, and return the saved Result with HTTP 200 or 201.
4. THE Result_Service SHALL derive grades according to the Grading_Scale: 70–100 → A, 60–69 → B, 50–59 → C, 45–49 → D, 0–44 → F.
5. IF `POST /api/results/save` is received with `ca_score` outside `[0, 30]` or `exam_score` outside `[0, 70]`, THEN THE Result_Service SHALL respond with HTTP 422 and a descriptive validation error.
6. WHEN a `PUT /api/results/:id` request is received with updated score or status fields, THE Result_Service SHALL recompute `total` and `grade`, update the record, and return it with HTTP 200.
7. IF `PUT /api/results/:id` is received for a result with `status: submitted` by a non-Admin user, THEN THE Result_Service SHALL respond with HTTP 403 and `{"error": "submitted results cannot be modified"}`.
8. FOR ALL (ca_score, exam_score) pairs where ca_score ∈ [0,30] and exam_score ∈ [0,70]: Result_Service.computeGrade(ca_score + exam_score) SHALL return the grade specified by the Grading_Scale (grade derivation property).
9. FOR ALL result records saved with `status: draft` then updated to `status: submitted`: the final status SHALL be `submitted` (status transition invariant).
10. FOR ALL student result sets: THE Result_Service SHALL compute GPA as `sum(grade_point × units) / sum(units)` rounded to 2 decimal places, and CGPA as the weighted average across all semesters (GPA correctness property).

---

### Requirement 9: Payment Management

**User Story:** As a Bursar or Admin, I want to view all student payment records and mark payments as verified, so that the school accurately tracks fee collection.

#### Acceptance Criteria

1. WHEN a `GET /api/payments` request is received by a Bursar, Admin, or Provost, THE Payment_Service SHALL return all Payment records joined with the corresponding student `full_name` and `reg_number` with HTTP 200.
2. WHEN a `GET /api/payments?student_id=<id>` request is received by an authorised user, THE Payment_Service SHALL return all Payment records for that student with HTTP 200.
3. WHEN a `PUT /api/payments/:id/verify` request is received with a `status` of `paid`, `pending`, or `overdue`, THE Payment_Service SHALL update the payment record and return the updated Payment with HTTP 200.
4. IF `PUT /api/payments/:id/verify` is received and no payment with that `id` exists, THEN THE Payment_Service SHALL respond with HTTP 404.
5. IF `PUT /api/payments/:id/verify` is received with a `status` value outside `{paid, pending, overdue}`, THEN THE Payment_Service SHALL respond with HTTP 422 and a descriptive validation error.
6. THE Payment_Service SHALL ensure each Payment record has a unique `reference` value. WHEN a Payment is created without a `reference`, THE Payment_Service SHALL generate one automatically.
7. FOR ALL payment status updates: reading the payment after update SHALL return a `status` equal to the value submitted in the update (update round-trip property).
8. FOR ALL payment lists filtered by `student_id=X`: every returned record SHALL have `student_id = X` (filter correctness property).
9. FOR ALL pairs of Payment records: their `reference` values SHALL be distinct (reference uniqueness invariant).

---

### Requirement 10: Admissions Management

**User Story:** As a Registrar or Admin, I want to view all admission applications and approve or reject them, so that the school can process new student intake efficiently.

#### Acceptance Criteria

1. WHEN a `GET /api/admissions` request is received by a Registrar, Admin, or Provost, THE Admission_Service SHALL return all AdmissionApplication records with HTTP 200.
2. WHEN a `PUT /api/admissions/:id/status` request is received with a `status` of `approved`, `rejected`, or `pending`, THE Admission_Service SHALL update the application record and return the updated AdmissionApplication with HTTP 200.
3. IF `PUT /api/admissions/:id/status` is received and no application with that `id` exists, THEN THE Admission_Service SHALL respond with HTTP 404.
4. IF `PUT /api/admissions/:id/status` is received with a `status` outside `{pending, approved, rejected}`, THEN THE Admission_Service SHALL respond with HTTP 422 and a descriptive validation error.
5. FOR ALL admission status updates: reading the application after update SHALL return `status` equal to the value submitted (round-trip property).
6. FOR ALL admission lists filtered by `status=approved` then filtered by `status=rejected` then combined: the total count SHALL be less than or equal to the unfiltered total (metamorphic count property).

---

### Requirement 11: Database Schema and Migrations

**User Story:** As a developer deploying the backend, I want the database schema to be managed via version-controlled migration files, so that deployments are repeatable and the DB is always in a consistent state.

#### Acceptance Criteria

1. THE DB SHALL contain the following tables: `users`, `student_profiles`, `staff_members`, `courses`, `results`, `payments`, `admission_applications`, `password_reset_tokens`.
2. THE DB SHALL enforce foreign key constraints between `student_profiles.auth_id → users.id`, `staff_members.auth_id → users.id`, `results.student_id → student_profiles.id`, `results.course_id → courses.id`, `payments.student_id → student_profiles.id`, `courses.lecturer_id → staff_members.id`.
3. THE DB SHALL enforce unique constraints on `student_profiles.reg_number`, `users.email`, `courses.code`, and `payments.reference`.
4. WHEN THE API_Server starts and migrations have not been applied, THE API_Server SHALL apply all pending migrations before serving requests.
5. THE DB SHALL store all timestamps in UTC.
6. THE DB SHALL use UUIDs (version 4) as primary keys for all tables.

---

### Requirement 12: Frontend Cleanup

**User Story:** As a developer preparing the frontend for production, I want dead code and development shortcuts removed, so that the portal is clean, secure, and maintainable.

#### Acceptance Criteria

1. THE frontend build SHALL NOT reference `supabaseClient` or any Supabase SDK. The `LoginForm.tsx` component which imports from `../services/supabaseClient` SHALL be replaced or removed so the project compiles without errors.
2. THE `package.json` SHALL NOT contain `next` as a dependency. The `next: ^16.0.8` entry SHALL be removed so `npm install` does not pull in a conflicting framework.
3. THE `AuthPage.tsx` quick-preview login buttons (the "Quick Preview Portals" section) SHALL be hidden or removed for production builds. WHERE the `VITE_SHOW_QUICK_LOGIN` environment variable is set to `true`, THE frontend SHALL display the quick-preview buttons. WHILE `VITE_SHOW_QUICK_LOGIN` is absent or set to any other value, THE frontend SHALL not render the quick-preview login buttons.
4. THE frontend SHALL continue to compile and function correctly with all three above changes applied.

---

### Requirement 13: Provost Analytics Overview

**User Story:** As the Provost, I want a read-only dashboard with summary statistics, so that I can monitor the college's academic and financial health at a glance.

#### Acceptance Criteria

1. WHEN a `GET /api/analytics/summary` request is received by a Provost or Admin, THE API_Server SHALL return a JSON object containing: total active student count, total staff count, total courses count, count of pending admission applications, total payments received (sum of `paid` payments), and count of results with `status: submitted`.
2. THE API_Server SHALL compute all analytics values from live DB data at query time.
3. IF `GET /api/analytics/summary` is received by any role other than Provost or Admin, THEN THE RBAC_Guard SHALL respond with HTTP 403.
