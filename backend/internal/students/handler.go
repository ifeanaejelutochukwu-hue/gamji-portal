package students

import (
	"encoding/json"
	"net/http"

	"gamji-backend/internal/auth"

	"github.com/go-chi/chi/v5"
)

// Handler holds the student HTTP handlers.
type Handler struct{ service *Service }

// NewHandler creates a new students Handler.
func NewHandler(service *Service) *Handler { return &Handler{service: service} }

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// List handles GET /api/students
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	profiles, err := h.service.List(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to fetch students"})
		return
	}
	writeJSON(w, http.StatusOK, profiles)
}

// GetProfile handles GET /api/students/profile?auth_id=<uuid>
func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
	authID := r.URL.Query().Get("auth_id")
	if authID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "auth_id is required"})
		return
	}

	// Students can only fetch their own profile
	claims := auth.ClaimsFromContext(r.Context())
	if claims != nil && claims.Role == "Student" && claims.UserID != authID {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
		return
	}

	profile, err := h.service.GetByAuthID(r.Context(), authID)
	if err != nil {
		if err.Error() == "student not found" {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "student not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to fetch profile"})
		return
	}
	writeJSON(w, http.StatusOK, profile)
}

// Create handles POST /api/students
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var input CreateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	profile, err := h.service.Create(r.Context(), input)
	if err != nil {
		switch err.Error() {
		case "registration number already exists":
			writeJSON(w, http.StatusConflict, map[string]string{"error": err.Error()})
		case "email already registered":
			writeJSON(w, http.StatusConflict, map[string]string{"error": err.Error()})
		default:
			if len(err.Error()) > 8 && err.Error()[:8] == "invalid " {
				writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error": err.Error()})
			} else {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create student"})
			}
		}
		return
	}
	writeJSON(w, http.StatusCreated, profile)
}

// Update handles PUT /api/students/:id
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var input UpdateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	profile, err := h.service.Update(r.Context(), id, input)
	if err != nil {
		switch err.Error() {
		case "student not found":
			writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
		case "registration number already exists":
			writeJSON(w, http.StatusConflict, map[string]string{"error": err.Error()})
		default:
			writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error": err.Error()})
		}
		return
	}
	writeJSON(w, http.StatusOK, profile)
}

// Delete handles DELETE /api/students/:id
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.service.Delete(r.Context(), id); err != nil {
		if err.Error() == "student not found" {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to delete student"})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
