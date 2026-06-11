package admissions

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

// Handler holds admission HTTP handlers.
type Handler struct{ service *Service }

// NewHandler creates a new admissions Handler.
func NewHandler(service *Service) *Handler { return &Handler{service: service} }

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// List handles GET /api/admissions
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	apps, err := h.service.List(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to fetch admissions"})
		return
	}
	writeJSON(w, http.StatusOK, apps)
}

// UpdateStatus handles PUT /api/admissions/:id/status
func (h *Handler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	app, err := h.service.UpdateStatus(r.Context(), id, req.Status)
	if err != nil {
		switch err.Error() {
		case "application not found":
			writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
		default:
			writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error": err.Error()})
		}
		return
	}
	writeJSON(w, http.StatusOK, app)
}
