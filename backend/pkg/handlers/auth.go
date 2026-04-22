package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"chogo_apartments/pkg/auth"
	"chogo_apartments/pkg/models"
)

type AuthHandler struct {
	db        *sql.DB
	jwtSecret string
}

func NewAuthHandler(db *sql.DB, jwtSecret string) *AuthHandler {
	return &AuthHandler{
		db:        db,
		jwtSecret: jwtSecret,
	}
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "invalid_request", Message: "Invalid request body"})
		return
	}

	// Validate input
	if req.Email == "" || req.Password == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "invalid_input", Message: "Email and password are required"})
		return
	}

	// Fetch user from database
	var user models.User
	var passwordHash string
	err := h.db.QueryRow("SELECT id, branch_id, email, full_name, role, is_active FROM users WHERE email = ? LIMIT 1", req.Email).
		Scan(&user.ID, &user.BranchID, &user.Email, &user.FullName, &user.Role, &user.IsActive)

	if err == sql.ErrNoRows {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "invalid_credentials", Message: "Invalid email or password"})
		return
	}

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "database_error", Message: "An error occurred"})
		return
	}

	// Check if user is active
	if !user.IsActive {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "user_inactive", Message: "User account is inactive"})
		return
	}

	// Fetch password hash
	err = h.db.QueryRow("SELECT password_hash FROM users WHERE id = ?", user.ID).Scan(&passwordHash)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "database_error", Message: "An error occurred"})
		return
	}

	// Verify password
	if !auth.VerifyPassword(passwordHash, req.Password) {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "invalid_credentials", Message: "Invalid email or password"})
		return
	}

	// Generate JWT token
	token, err := auth.GenerateToken(user.ID, user.BranchID, user.Email, user.Role, h.jwtSecret)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "token_error", Message: "Failed to generate token"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(models.LoginResponse{
		Token:   token,
		User:    user,
		Message: "Login successful",
	})
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "invalid_request", Message: "Invalid request body"})
		return
	}

	// Validate input
	if req.Email == "" || req.Password == "" || req.FullName == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "invalid_input", Message: "Email, password, and full name are required"})
		return
	}

	// Validate email format
	if !strings.Contains(req.Email, "@") {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "invalid_email", Message: "Invalid email format"})
		return
	}

	// Check if email already exists
	var existingID int
	err := h.db.QueryRow("SELECT id FROM users WHERE email = ?", req.Email).Scan(&existingID)
	if err != sql.ErrNoRows {
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "email_exists", Message: "Email already registered"})
		return
	}

	var branchID int

	// If branch_id provided, use it; otherwise create or find branch by name
	if req.BranchID > 0 {
		err := h.db.QueryRow("SELECT id FROM branches WHERE id = ?", req.BranchID).Scan(&branchID)
		if err == sql.ErrNoRows {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(models.ErrorResponse{Error: "invalid_branch", Message: "Selected branch does not exist"})
			return
		}
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(models.ErrorResponse{Error: "database_error", Message: "An error occurred"})
			return
		}
	} else if strings.TrimSpace(req.BranchName) != "" {
		branchName := strings.TrimSpace(req.BranchName)
		// Try to find branch by name
		err := h.db.QueryRow("SELECT id FROM branches WHERE name = ?", branchName).Scan(&branchID)
		if err == sql.ErrNoRows {
			// Create new branch
			result, err := h.db.Exec("INSERT INTO branches (name) VALUES (?)", branchName)
			if err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(models.ErrorResponse{Error: "branch_error", Message: "Failed to create branch"})
				return
			}
			id, err := result.LastInsertId()
			if err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(models.ErrorResponse{Error: "branch_error", Message: "Failed to create branch"})
				return
			}
			branchID = int(id)
		} else if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(models.ErrorResponse{Error: "database_error", Message: "An error occurred"})
			return
		}
	} else {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "invalid_input", Message: "Branch ID or Branch Name is required"})
		return
	}

	// Hash password
	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "password_error", Message: "Failed to hash password"})
		return
	}

	// Insert user into database
	result, err := h.db.Exec(
		"INSERT INTO users (branch_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)",
		branchID, req.Email, passwordHash, req.FullName, "staff",
	)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "registration_error", Message: "Failed to register user"})
		return
	}

	userID, err := result.LastInsertId()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "registration_error", Message: "Failed to register user"})
		return
	}

	user := models.User{
		ID:       int(userID),
		BranchID: branchID,
		Email:    req.Email,
		FullName: req.FullName,
		Role:     "staff",
		IsActive: true,
	}

	// Generate JWT token
	token, err := auth.GenerateToken(user.ID, user.BranchID, user.Email, user.Role, h.jwtSecret)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(models.ErrorResponse{Error: "token_error", Message: "Failed to generate token"})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(models.LoginResponse{
		Token:   token,
		User:    user,
		Message: "Registration successful",
	})
}
