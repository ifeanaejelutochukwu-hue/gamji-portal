package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
)

type contextKey string

const claimsKey contextKey = "claims"

// Claims holds the JWT payload injected into request context.
type Claims struct {
	UserID   string
	Email    string
	FullName string
	Role     string
}

// writeJSON is a small helper used in middleware to write error responses.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// CORS returns middleware that sets CORS headers for the given allowed origins.
func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	originSet := make(map[string]bool, len(allowedOrigins))
	for _, o := range allowedOrigins {
		originSet[o] = true
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if originSet[origin] {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			} else if len(allowedOrigins) > 0 {
				// Fall back to first allowed origin for non-browser clients
				w.Header().Set("Access-Control-Allow-Origin", allowedOrigins[0])
			}
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Allow-Credentials", "true")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusOK)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// RecoverPanic catches panics, logs the error, and returns HTTP 500.
func RecoverPanic(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// RequireAuth validates the JWT in the Authorization header and injects
// the parsed claims into the request context.
func (s *Service) RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
			return
		}
		token := strings.TrimPrefix(header, "Bearer ")
		claims, err := s.ParseToken(token)
		if err != nil {
			if strings.Contains(err.Error(), "expired") {
				writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "token expired"})
				return
			}
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
			return
		}
		ctx := context.WithValue(r.Context(), claimsKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireRole returns middleware that allows only the specified roles.
func RequireRole(roles ...string) func(http.Handler) http.Handler {
	allowed := make(map[string]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := ClaimsFromContext(r.Context())
			if claims == nil || !allowed[claims.Role] {
				writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// ClaimsFromContext extracts JWT claims from a request context.
func ClaimsFromContext(ctx context.Context) *Claims {
	v, _ := ctx.Value(claimsKey).(*Claims)
	return v
}
