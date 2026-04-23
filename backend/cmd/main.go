package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"chogo_apartments/pkg/db"
	"chogo_apartments/pkg/handlers"

	"github.com/gorilla/mux"
)

func main() {
	// Load environment variables
	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "root"
	}
	dbPassword := os.Getenv("DB_PASSWORD")
	if dbPassword == "" {
		dbPassword = "root"
	}
	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "localhost"
	}
	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "3306"
	}
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "chogo_apartments"
	}
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-secret-key-change-in-production"
	}

	// Initialize database
	database, err := db.InitDB(dbUser, dbPassword, dbHost, dbPort, dbName)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Initialize handlers with database
	authHandler := handlers.NewAuthHandler(database, jwtSecret)
	branchHandler := handlers.NewBranchHandler(database)
	apartmentHandler := handlers.NewApartmentHandler(database)

	// Setup router
	r := mux.NewRouter()

	// CORS middleware
	r.Use(corsMiddleware)

	// Public routes
	r.HandleFunc("/api/auth/login", authHandler.Login).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/auth/register", authHandler.Register).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/branches", branchHandler.ListPublic).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/branches", branchHandler.Create).Methods("POST", "OPTIONS")

	// Apartment management (allow all access for now per requirement)
	r.HandleFunc("/api/rooms", apartmentHandler.ListRooms).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/rooms", apartmentHandler.CreateRoom).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/tenants", apartmentHandler.ListTenants).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/tenants", apartmentHandler.CreateTenant).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/contracts", apartmentHandler.ListContracts).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/contracts", apartmentHandler.CreateContract).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/invoices", apartmentHandler.ListInvoices).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/invoices", apartmentHandler.CreateInvoice).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/payments", apartmentHandler.ListPayments).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/payments", apartmentHandler.CreatePayment).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/transactions", apartmentHandler.ListTransactions).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/transactions", apartmentHandler.CreateTransaction).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/dashboard/branch", apartmentHandler.BranchDashboard).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/dashboard/admin", apartmentHandler.AdminDashboard).Methods("GET", "OPTIONS")

	// Health check
	r.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"status":"ok"}`)
	}).Methods("GET", "OPTIONS")

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
