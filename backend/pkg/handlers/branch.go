package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"chogo_apartments/pkg/models"
)

type BranchHandler struct {
	db *sql.DB
}

func NewBranchHandler(db *sql.DB) *BranchHandler {
	return &BranchHandler{db: db}
}

// ListPublic returns all branches for registration dropdowns.
func (h *BranchHandler) ListPublic(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	rows, err := h.db.Query("SELECT id, name FROM branches ORDER BY name ASC")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "database_error", Message: "Failed to fetch branches"})
		return
	}
	defer rows.Close()

	branches := make([]models.Branch, 0)
	for rows.Next() {
		var branch models.Branch
		if err := rows.Scan(&branch.ID, &branch.Name); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(models.ErrorResponse{Error: "database_error", Message: "Failed to read branch data"})
			return
		}
		branches = append(branches, branch)
	}

	if err := rows.Err(); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "database_error", Message: "Failed to fetch branches"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(branches)
}
