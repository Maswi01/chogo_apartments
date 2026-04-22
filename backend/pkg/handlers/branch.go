package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"chogo_apartments/pkg/models"
)

type BranchHandler struct {
	db *sql.DB
}

type createBranchRequest struct {
	Name string `json:"name"`
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

// Create adds a new branch from dashboard administration.
func (h *BranchHandler) Create(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req createBranchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "invalid_request", Message: "Invalid request body"})
		return
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "invalid_input", Message: "Branch name is required"})
		return
	}

	result, err := h.db.Exec("INSERT INTO branches (name) VALUES (?)", name)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			w.WriteHeader(http.StatusConflict)
			json.NewEncoder(w).Encode(models.ErrorResponse{Error: "branch_exists", Message: "Branch already exists"})
			return
		}

		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "database_error", Message: "Failed to create branch"})
		return
	}

	id, err := result.LastInsertId()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "database_error", Message: "Failed to create branch"})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(models.Branch{ID: int(id), Name: name})
}
