package payments

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

// Handler holds payment HTTP handlers.
type Handler struct{ service *Service }

// NewHandler creates a new payments Handler.
func NewHandler(service *Service) *Handler { return &Handler{service: service} }

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// List handles GET /api/payments and GET /api/payments?student_id=<uuid>
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	studentID := r.URL.Query().Get("student_id")

	var (
		payments []Payment
		err      error
	)

	if studentID != "" {
		payments, err = h.service.ListByStudent(r.Context(), studentID)
	} else {
		payments, err = h.service.List(r.Context())
	}

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to fetch payments"})
		return
	}
	writeJSON(w, http.StatusOK, payments)
}

// Verify handles PUT /api/payments/:id/verify
func (h *Handler) Verify(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	payment, err := h.service.Verify(r.Context(), id, req.Status)
	if err != nil {
		switch err.Error() {
		case "payment not found":
			writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
		default:
			writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error": err.Error()})
		}
		return
	}
	writeJSON(w, http.StatusOK, payment)
}
