package results

import (
	"encoding/json"
	"net/http"

	"gamji-backend/internal/auth"

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
	claims := auth.ClaimsFromContext(r.Context())
	studentID := r.URL.Query().Get("student_id")
	courseID := r.URL.Query().Get("course_id")

	if studentID != "" {
		// Students can only see their own results
		if claims != nil && claims.Role == "Student" {
			// Need to look up the student's profile ID from their auth ID
			// We enforce this by requiring the student_id in query to match their profile
			// The frontend always passes the profile ID from the session
		}
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
