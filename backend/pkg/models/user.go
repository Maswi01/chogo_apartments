package models

import "time"

type User struct {
	ID        int       `json:"id"`
	BranchID  int       `json:"branch_id"`
	Email     string    `json:"email"`
	FullName  string    `json:"full_name"`
	Role      string    `json:"role"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token   string `json:"token"`
	User    User   `json:"user"`
	Message string `json:"message"`
}

type RegisterRequest struct {
	Email      string `json:"email"`
	Password   string `json:"password"`
	FullName   string `json:"full_name"`
	BranchID   int    `json:"branch_id"`
	BranchName string `json:"branch_name"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}
