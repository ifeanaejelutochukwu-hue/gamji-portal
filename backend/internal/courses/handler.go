package courses

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

// Handler holds course HTTP handlers.
type Handler struct{ service *Service }

// NewHandler creates a new courses Handler.
func NewHandler(service *Service) *Handler { return &Handler{service: service} }

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// List handles GET /api/courses and GET /api/courses?lecturer_id=<uuid>
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	lecturerID := r.URL.Query().Get("lecturer_id")
	courses, err := h.service.List(r.Context(), lecturerID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to fetch courses"})
		return
	}
	writeJSON(w, http.StatusOK, courses)
}

// Create handles POST /api/courses
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var input CreateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}
	course, err := h.service.Create(r.Context(), input)
	if err != nil {
		switch err.Error() {
		case "course code already exists":
			writeJSON(w, http.StatusConflict, map[string]string{"error": err.Error()})
		case "lecturer not found":
			writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error": err.Error()})
		default:
			writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error": err.Error()})
		}
		return
	}
	writeJSON(w, http.StatusCreated, course)
}

// Update handles PUT /api/courses/:id
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var input UpdateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}
	course, err := h.service.Update(r.Context(), id, input)
	if err != nil {
		if err.Error() == "course not found" {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, course)
}

// Delete handles DELETE /api/courses/:id
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.service.Delete(r.Context(), id); err != nil {
		if err.Error() == "course not found" {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to delete course"})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
