package results

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"gamji-backend/internal/auth"
	"gamji-backend/internal/students"

	"github.com/go-chi/chi/v5"
)

// Handler holds result HTTP handlers.
type Handler struct{ service *Service }

// NewHandler creates a new results Handler.
func NewHandler(service *Service) *Handler { return &Handler{service: service} }

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// List handles GET /api/results?student_id=<uuid> or ?course_id=<uuid>
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	studentID := r.URL.Query().Get("student_id")
	courseID := r.URL.Query().Get("course_id")

	if studentID != "" {
		results, err := h.service.ListByStudent(r.Context(), studentID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to fetch results"})
			return
		}
		writeJSON(w, http.StatusOK, results)
		return
	}

	if courseID != "" {
		results, err := h.service.ListByCourse(r.Context(), courseID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to fetch results"})
			return
		}
		writeJSON(w, http.StatusOK, results)
		return
	}

	writeJSON(w, http.StatusBadRequest, map[string]string{"error": "student_id or course_id query param is required"})
}

// Save handles POST /api/results/save
func (h *Handler) Save(w http.ResponseWriter, r *http.Request) {
	var input SaveInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}
	result, err := h.service.Save(r.Context(), input)
	if err != nil {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, result)
}

// Update handles PUT /api/results/:id
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	claims := auth.ClaimsFromContext(r.Context())
	callerRole := ""
	if claims != nil {
		callerRole = claims.Role
	}

	var input UpdateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	result, err := h.service.Update(r.Context(), id, input, callerRole)
	if err != nil {
		switch err.Error() {
		case "result not found":
			writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
		case "submitted results cannot be modified":
			writeJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		default:
			writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error": err.Error()})
		}
		return
	}
	writeJSON(w, http.StatusOK, result)
}

// BulkImport handles POST /api/results/bulk-import
// CSV columns: student_reg_number, course_code, ca_score, exam_score, status
func (h *Handler) BulkImport(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "failed to parse form"})
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "file field is required"})
		return
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.TrimLeadingSpace = true
	headers, err := reader.Read()
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "failed to read CSV header"})
		return
	}
	colIdx := make(map[string]int)
	for i, hdr := range headers {
		colIdx[strings.ToLower(strings.TrimSpace(hdr))] = i
	}

	var rows []students.ResultImportRow
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			continue
		}
		getCol := func(name string) string {
			idx, ok := colIdx[name]
			if !ok || idx >= len(record) {
				return ""
			}
			return strings.TrimSpace(record[idx])
		}
		row := students.ResultImportRow{
			StudentRegNumber: getCol("student_reg_number"),
			CourseCode:       getCol("course_code"),
			Status:           getCol("status"),
		}
		fmt.Sscanf(getCol("ca_score"), "%f", &row.CAScore)
		fmt.Sscanf(getCol("exam_score"), "%f", &row.ExamScore)
		rows = append(rows, row)
	}

	importResult := h.service.SaveBulk(r.Context(), rows)
	writeJSON(w, http.StatusOK, importResult)
}

// Transcript handles GET /api/results/transcript/:student_id
// Returns all results with computed GPA for a student.
func (h *Handler) Transcript(w http.ResponseWriter, r *http.Request) {
	studentID := chi.URLParam(r, "student_id")
	results, err := h.service.ListByStudent(r.Context(), studentID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to fetch results"})
		return
	}
	gpa := ComputeGPA(results)
	totalUnits := 0
	for _, res := range results {
		totalUnits += res.Units
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"student_id":  studentID,
		"results":     results,
		"gpa":         gpa,
		"total_units": totalUnits,
	})
}
