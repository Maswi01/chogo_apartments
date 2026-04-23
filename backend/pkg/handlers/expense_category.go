package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
)

type ExpenseCategoryHandler struct {
	db *sql.DB
}

func NewExpenseCategoryHandler(db *sql.DB) *ExpenseCategoryHandler {
	return &ExpenseCategoryHandler{db: db}
}

type ExpenseCategory struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	IsActive    bool   `json:"is_active"`
	CreatedAt   string `json:"created_at"`
}

func (h *ExpenseCategoryHandler) List(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(`SELECT id, name, COALESCE(description,''), is_active, created_at
		FROM expense_categories ORDER BY name ASC`)
	if err != nil {
		http.Error(w, `{"error":"database_error"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	out := []ExpenseCategory{}
	for rows.Next() {
		var c ExpenseCategory
		if err := rows.Scan(&c.ID, &c.Name, &c.Description, &c.IsActive, &c.CreatedAt); err == nil {
			out = append(out, c)
		}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

func (h *ExpenseCategoryHandler) Create(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid_request"}`, http.StatusBadRequest)
		return
	}
	body.Name = strings.TrimSpace(body.Name)
	if body.Name == "" {
		http.Error(w, `{"error":"invalid_input","message":"Name is required"}`, http.StatusBadRequest)
		return
	}
	res, err := h.db.Exec(`INSERT INTO expense_categories (name, description) VALUES (?, ?)`,
		body.Name, body.Description)
	if err != nil {
		if strings.Contains(err.Error(), "Duplicate") {
			http.Error(w, `{"error":"category_exists","message":"Category already exists"}`, http.StatusConflict)
			return
		}
		http.Error(w, `{"error":"database_error"}`, http.StatusInternalServerError)
		return
	}
	id, _ := res.LastInsertId()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(ExpenseCategory{ID: int(id), Name: body.Name, Description: body.Description, IsActive: true})
}

func (h *ExpenseCategoryHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := mux.Vars(r)["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, `{"error":"invalid_id"}`, http.StatusBadRequest)
		return
	}
	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		IsActive    *bool  `json:"is_active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid_request"}`, http.StatusBadRequest)
		return
	}
	active := true
	if body.IsActive != nil {
		active = *body.IsActive
	}
	if _, err := h.db.Exec(`UPDATE expense_categories SET name=?, description=?, is_active=? WHERE id=?`,
		body.Name, body.Description, active, id); err != nil {
		http.Error(w, `{"error":"database_error"}`, http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *ExpenseCategoryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := mux.Vars(r)["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, `{"error":"invalid_id"}`, http.StatusBadRequest)
		return
	}
	if _, err := h.db.Exec(`DELETE FROM expense_categories WHERE id=?`, id); err != nil {
		http.Error(w, `{"error":"database_error"}`, http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
