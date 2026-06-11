package auth

import (
	"encoding/json"
	"net/http"

	"gamji-backend/internal/mailer"
)

// Handler holds the auth HTTP handlers.
type Handler struct {
	service *Service
	mailer  *mailer.Mailer
}

// NewHandler creates a new auth Handler.
func NewHandler(service *Service, m *mailer.Mailer) *Handler {
	return &Handler{service: service, mailer: m}
}

// Login handles POST /api/auth/login
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	session, err := h.service.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, session)
}

// Logout handles POST /api/auth/logout — stateless, just confirms sign-out.
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"message": "logged out"})
}

// ForgotPassword handles POST /api/auth/forgot-password
func (h *Handler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	email, resetLink, shouldSend, err := h.service.ForgotPassword(r.Context(), req.Email)
	if err != nil {
		// Log internally but always return 200 to the client
		writeJSON(w, http.StatusOK, map[string]string{"message": "reset email sent"})
		return
	}

	if shouldSend {
		// Send async so the HTTP response is not blocked by SMTP latency
		go h.mailer.SendPasswordReset(email, resetLink)
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "reset email sent"})
}

// ResetPassword handles POST /api/auth/reset-password
func (h *Handler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	err := h.service.ResetPassword(r.Context(), req.Token, req.Password)
	if err != nil {
		switch err.Error() {
		case "password must be at least 8 characters":
			writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error": err.Error()})
		default:
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "password updated"})
}

// Health handles GET /api/health
func Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
