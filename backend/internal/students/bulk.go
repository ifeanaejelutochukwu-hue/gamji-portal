package students

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// BulkImportResult reports success/failure per row.
type BulkImportResult struct {
	Total   int      `json:"total"`
	Success int      `json:"success"`
	Failed  int      `json:"failed"`
	Errors  []string `json:"errors,omitempty"`
}

// BulkImport handles POST /api/students/bulk-import
// Accepts multipart/form-data with a CSV file.
// CSV columns (header row required):
//   full_name, email, reg_number, program, year_of_study, level, status, password
func (h *Handler) BulkImport(w http.ResponseWriter, r *http.Request) {
	// 10 MB max
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "failed to parse form"})
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "file field is required"})
		return
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.TrimLeadingSpace = true

	// Read header
	headers, err := reader.Read()
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "failed to read CSV header"})
		return
	}

	// Build column index map
	colIdx := make(map[string]int)
	for i, h := range headers {
		colIdx[strings.ToLower(strings.TrimSpace(h))] = i
	}

	required := []string{"full_name", "email"}
	for _, col := range required {
		if _, ok := colIdx[col]; !ok {
			writeJSON(w, http.StatusBadRequest, map[string]string{
				"error": fmt.Sprintf("CSV missing required column: %s", col),
			})
			return
		}
	}

	result := BulkImportResult{}
	rowNum := 1

	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: parse error: %v", rowNum, err))
			result.Failed++
			rowNum++
			continue
		}
		result.Total++

		getCol := func(name string) string {
			idx, ok := colIdx[name]
			if !ok || idx >= len(record) {
				return ""
			}
			return strings.TrimSpace(record[idx])
		}

		input := CreateInput{
			FullName:    getCol("full_name"),
			Email:       getCol("email"),
			RegNumber:   getCol("reg_number"),
			Program:     getCol("program"),
			Status:      getCol("status"),
			Password:    getCol("password"),
		}

		if input.Password == "" {
			input.Password = "changeme123"
		}
		if input.Status == "" {
			input.Status = "active"
		}
		if input.Program == "" {
			input.Program = "General Nursing"
		}

		// Parse numeric fields
		if v := getCol("year_of_study"); v != "" {
			fmt.Sscanf(v, "%d", &input.YearOfStudy)
		}
		if v := getCol("level"); v != "" {
			fmt.Sscanf(v, "%d", &input.Level)
		}

		// Auto-generate reg number if missing
		if input.RegNumber == "" {
			year := time.Now().Year()
			input.RegNumber = fmt.Sprintf("GNS/%d/%04d", year, rowNum)
		}

		_, createErr := h.service.Create(r.Context(), input)
		if createErr != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("row %d (%s): %v", rowNum, input.Email, createErr))
			result.Failed++
		} else {
			result.Success++
		}
		rowNum++
	}

	writeJSON(w, http.StatusOK, result)
}

// BulkImportTemplate handles GET /api/students/bulk-import/template
// Returns a CSV template file.
func (h *Handler) BulkImportTemplate(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", `attachment; filename="student_import_template.csv"`)

	writer := csv.NewWriter(w)
	_ = writer.Write([]string{
		"full_name", "email", "reg_number", "program",
		"year_of_study", "level", "status", "password",
	})
	// Sample rows
	_ = writer.Write([]string{
		"Hadiza Bello Shagari", "hadiza@example.com", "GNS/2020/0001",
		"General Nursing", "3", "300", "graduated", "changeme123",
	})
	_ = writer.Write([]string{
		"Aminu Yusuf Sokoto", "aminu@example.com", "GNS/2024/0042",
		"Basic Midwifery", "1", "100", "active", "changeme123",
	})
	writer.Flush()
}

// BulkImportResultsHandler handles POST /api/results/bulk-import
// CSV: student_reg_number, course_code, ca_score, exam_score, status
func (h *Handler) BulkImportResults(w http.ResponseWriter, r *http.Request, resultSvc interface {
	SaveBulk(ctx context.Context, rows []ResultImportRow) BulkImportResult
}) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "failed to parse form"})
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "file field is required"})
		return
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.TrimLeadingSpace = true
	headers, err := reader.Read()
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "failed to read CSV"})
		return
	}
	colIdx := make(map[string]int)
	for i, h := range headers {
		colIdx[strings.ToLower(strings.TrimSpace(h))] = i
	}

	var rows []ResultImportRow
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			continue
		}
		getCol := func(name string) string {
			idx, ok := colIdx[name]
			if !ok || idx >= len(record) {
				return ""
			}
			return strings.TrimSpace(record[idx])
		}
		row := ResultImportRow{
			StudentRegNumber: getCol("student_reg_number"),
			CourseCode:       getCol("course_code"),
			Status:           getCol("status"),
		}
		fmt.Sscanf(getCol("ca_score"), "%f", &row.CAScore)
		fmt.Sscanf(getCol("exam_score"), "%f", &row.ExamScore)
		rows = append(rows, row)
	}

	result := resultSvc.SaveBulk(r.Context(), rows)
	_ = json.NewEncoder(w).Encode(result)
}

// ResultImportRow is one row from a results CSV.
type ResultImportRow struct {
	StudentRegNumber string
	CourseCode       string
	CAScore          float64
	ExamScore        float64
	Status           string
}
