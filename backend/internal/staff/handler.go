package staff

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

// Handler holds staff HTTP handlers.
type Handler struct{ service *Service }

// NewHandler creates a new staff Handler.
func NewHandler(service *Service) *Handler { return &Handler{service: service} }

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// List handles GET /api/staff
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	members, err := h.service.List(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to fetch staff"})
		return
	}
	writeJSON(w, http.StatusOK, members)
}

// GetProfile handles GET /api/staff/profile?auth_id=<uuid>
func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
	authID := r.URL.Query().Get("auth_id")
	if authID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "auth_id is required"})
		return
	}
	member, err := h.service.GetByAuthID(r.Context(), authID)
	if err != nil {
		if err.Error() == "staff not found" {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to fetch profile"})
		return
	}
	writeJSON(w, http.StatusOK, member)
}

// Create handles POST /api/staff
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var input CreateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}
	member, err := h.service.Create(r.Context(), input)
	if err != nil {
		switch err.Error() {
		case "email already registered":
			writeJSON(w, http.StatusConflict, map[string]string{"error": err.Error()})
		default:
			writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error": err.Error()})
		}
		return
	}
	writeJSON(w, http.StatusCreated, member)
}

// Update handles PUT /api/staff/:id
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var input UpdateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}
	member, err := h.service.Update(r.Context(), id, input)
	if err != nil {
		if err.Error() == "staff not found" {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, member)
}

// Delete handles DELETE /api/staff/:id
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.service.Delete(r.Context(), id); err != nil {
		if err.Error() == "staff not found" {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to delete staff"})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
