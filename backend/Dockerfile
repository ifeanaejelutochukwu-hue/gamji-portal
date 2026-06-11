# ── Stage 1: Build ────────────────────────────────────────
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server ./cmd/server

# ── Stage 2: Runtime ──────────────────────────────────────
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Copy binary and migrations
COPY --from=builder /app/server .
COPY --from=builder /app/internal/db/migrations ./internal/db/migrations

EXPOSE 8080

CMD ["./server"]
