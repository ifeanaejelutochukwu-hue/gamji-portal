package analytics

import (
	"encoding/json"
	"net/http"
)

// Handler holds analytics HTTP handlers.
type Handler struct{ service *Service }

// NewHandler creates a new analytics Handler.
func NewHandler(service *Service) *Handler { return &Handler{service: service} }

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// Summary handles GET /api/analytics/summary
func (h *Handler) Summary(w http.ResponseWriter, r *http.Request) {
	summary, err := h.service.GetSummary(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to compute analytics"})
		return
	}
	writeJSON(w, http.StatusOK, summary)
}
