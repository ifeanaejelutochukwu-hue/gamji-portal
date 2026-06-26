package results

import (
	"context"
	"fmt"

	"gamji-backend/internal/students"
)

// SaveBulk imports results from parsed CSV rows.
// Looks up student by reg_number and course by code.
func (s *Service) SaveBulk(ctx context.Context, rows []students.ResultImportRow) students.BulkImportResult {
	result := students.BulkImportResult{Total: len(rows)}

	for i, row := range rows {
		if row.StudentRegNumber == "" || row.CourseCode == "" {
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: student_reg_number and course_code are required", i+1))
			result.Failed++
			continue
		}

		// Look up student by reg number
		var studentID string
		err := s.db.QueryRow(ctx,
			`SELECT id FROM student_profiles WHERE reg_number = $1`, row.StudentRegNumber,
		).Scan(&studentID)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: student not found: %s", i+1, row.StudentRegNumber))
			result.Failed++
			continue
		}

		// Look up course by code
		var courseID string
		err = s.db.QueryRow(ctx,
			`SELECT id FROM courses WHERE code = $1`, row.CourseCode,
		).Scan(&courseID)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: course not found: %s", i+1, row.CourseCode))
			result.Failed++
			continue
		}

		status := row.Status
		if status == "" {
			status = "submitted"
		}

		input := SaveInput{
			StudentID: studentID,
			CourseID:  courseID,
			CAScore:   row.CAScore,
			ExamScore: row.ExamScore,
			Status:    status,
		}

		if _, err := s.Save(ctx, input); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: save error: %v", i+1, err))
			result.Failed++
			continue
		}
		result.Success++
	}
	return result
}
