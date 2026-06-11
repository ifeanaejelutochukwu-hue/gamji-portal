package mailer

import (
	"fmt"
	"log"
	"net/smtp"
	"strings"
)

// Mailer sends transactional emails via SMTP.
type Mailer struct {
	host string
	port int
	user string
	pass string
	from string
}

// New creates a new Mailer instance.
func New(host string, port int, user, pass, from string) *Mailer {
	return &Mailer{host: host, port: port, user: user, pass: pass, from: from}
}

// SendPasswordReset sends a password reset email to the given address.
func (m *Mailer) SendPasswordReset(to, resetLink string) {
	subject := "Reset your Gamji Portal password"
	body := fmt.Sprintf(`<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1e40af;">Gamji College of Nursing Sciences</h2>
  <p>You requested a password reset for your portal account.</p>
  <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
  <a href="%s" style="display:inline-block;padding:12px 24px;background:#1e40af;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;margin:16px 0;">
    Reset My Password
  </a>
  <p style="color:#6b7280;font-size:14px;">If you did not request this, you can safely ignore this email.</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
  <p style="color:#9ca3af;font-size:12px;">Gamji College of Nursing Sciences Portal</p>
</body>
</html>`, resetLink)

	msg := buildMessage(m.from, to, subject, body)
	addr := fmt.Sprintf("%s:%d", m.host, m.port)
	auth := smtp.PlainAuth("", m.user, m.pass, m.host)

	if err := smtp.SendMail(addr, auth, m.user, []string{to}, []byte(msg)); err != nil {
		// Log but don't crash — reset request already succeeded on server side
		log.Printf("WARN: failed to send password reset email to %s: %v", to, err)
		return
	}
	log.Printf("INFO: password reset email sent to %s", to)
}

func buildMessage(from, to, subject, htmlBody string) string {
	headers := []string{
		"MIME-Version: 1.0",
		"Content-Type: text/html; charset=UTF-8",
		fmt.Sprintf("From: %s", from),
		fmt.Sprintf("To: %s", to),
		fmt.Sprintf("Subject: %s", subject),
	}
	return strings.Join(headers, "\r\n") + "\r\n\r\n" + htmlBody
}
