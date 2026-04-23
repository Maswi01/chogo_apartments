package db

import (
	"database/sql"
	"fmt"
	"strings"

	_ "github.com/go-sql-driver/mysql"
)

func InitDB(user, password, host, port, dbname string) (*sql.DB, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true", user, password, host, port, dbname)
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, err
	}

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, err
	}

	// Create tables if they don't exist
	if err := createTables(db); err != nil {
		return nil, err
	}

	// Seed initial branch records for first-time setups.
	if err := seedDefaultBranches(db); err != nil {
		return nil, err
	}

	if err := seedDefaultExpenseCategories(db); err != nil {
		return nil, err
	}

	return db, nil
}

func createTables(db *sql.DB) error {
	schema := `
	CREATE TABLE IF NOT EXISTS branches (
		id INT PRIMARY KEY AUTO_INCREMENT,
		name VARCHAR(255) NOT NULL UNIQUE,
		location VARCHAR(255),
		manager_email VARCHAR(255),
		phone VARCHAR(20),
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS users (
		id INT PRIMARY KEY AUTO_INCREMENT,
		branch_id INT NOT NULL,
		email VARCHAR(255) NOT NULL UNIQUE,
		password_hash VARCHAR(255) NOT NULL,
		full_name VARCHAR(255) NOT NULL,
		role ENUM('hq_admin', 'branch_manager', 'staff') DEFAULT 'staff',
		is_active BOOLEAN DEFAULT TRUE,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
		INDEX idx_branch_id (branch_id),
		INDEX idx_email (email)
	);

	CREATE TABLE IF NOT EXISTS properties (
		id INT PRIMARY KEY AUTO_INCREMENT,
		branch_id INT NOT NULL,
		name VARCHAR(255) NOT NULL,
		address VARCHAR(255),
		total_units INT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
		INDEX idx_branch_id (branch_id)
	);

	CREATE TABLE IF NOT EXISTS units (
		id INT PRIMARY KEY AUTO_INCREMENT,
		branch_id INT NOT NULL,
		property_id INT NOT NULL,
		unit_number VARCHAR(50) NOT NULL,
		unit_type VARCHAR(50),
		rent_amount DECIMAL(10, 2),
		status ENUM('vacant', 'occupied', 'reserved', 'maintenance') DEFAULT 'vacant',
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
		FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
		INDEX idx_branch_id (branch_id),
		INDEX idx_property_id (property_id)
	);

	CREATE TABLE IF NOT EXISTS tenants (
		id INT PRIMARY KEY AUTO_INCREMENT,
		branch_id INT NOT NULL,
		full_name VARCHAR(255) NOT NULL,
		tenant_type ENUM('individual','institution') NOT NULL DEFAULT 'individual',
		organization_name VARCHAR(255),
		contact_person VARCHAR(255),
		email VARCHAR(255),
		phone VARCHAR(20),
		id_number VARCHAR(50),
		unit_id INT NULL,
		move_in_date DATE,
		lease_end_date DATE,
		status ENUM('active', 'inactive', 'evicted') DEFAULT 'active',
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
		FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
		INDEX idx_branch_id (branch_id),
		INDEX idx_unit_id (unit_id)
	);

	CREATE TABLE IF NOT EXISTS payments (
		id INT PRIMARY KEY AUTO_INCREMENT,
		branch_id INT NOT NULL,
		tenant_id INT NOT NULL,
		unit_id INT NULL,
		invoice_id INT NULL,
		contract_id INT NULL,
		amount DECIMAL(10, 2) NOT NULL,
		payment_date DATE NOT NULL,
		receipt_number VARCHAR(50),
		payment_method VARCHAR(50),
		notes TEXT,
		recorded_by INT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
		FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
		FOREIGN KEY (recorded_by) REFERENCES users(id),
		INDEX idx_branch_id (branch_id),
		INDEX idx_tenant_id (tenant_id),
		INDEX idx_payment_date (payment_date),
		INDEX idx_payments_invoice (invoice_id),
		INDEX idx_payments_contract (contract_id)
	);

	CREATE TABLE IF NOT EXISTS expenses (
		id INT PRIMARY KEY AUTO_INCREMENT,
		branch_id INT NOT NULL,
		category VARCHAR(50),
		description TEXT,
		amount DECIMAL(10, 2) NOT NULL,
		expense_date DATE NOT NULL,
		recorded_by INT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
		FOREIGN KEY (recorded_by) REFERENCES users(id),
		INDEX idx_branch_id (branch_id),
		INDEX idx_expense_date (expense_date)
	);

	CREATE TABLE IF NOT EXISTS maintenance_requests (
		id INT PRIMARY KEY AUTO_INCREMENT,
		branch_id INT NOT NULL,
		unit_id INT NOT NULL,
		description TEXT NOT NULL,
		status ENUM('open', 'in_progress', 'completed', 'cancelled') DEFAULT 'open',
		priority VARCHAR(20),
		reported_date DATE,
		completed_date DATE,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
		FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
		INDEX idx_branch_id (branch_id)
	);

	CREATE TABLE IF NOT EXISTS rooms (
		id INT PRIMARY KEY AUTO_INCREMENT,
		branch_id INT NOT NULL,
		code VARCHAR(50) NOT NULL,
		room_type VARCHAR(50),
		monthly_rent DECIMAL(12,2) NOT NULL DEFAULT 0,
		status ENUM('vacant','occupied','reserved','maintenance') DEFAULT 'vacant',
		notes VARCHAR(255),
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		UNIQUE KEY uk_branch_code (branch_id, code),
		FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
		INDEX idx_rooms_branch (branch_id)
	);

	CREATE TABLE IF NOT EXISTS contracts (
		id INT PRIMARY KEY AUTO_INCREMENT,
		branch_id INT NOT NULL,
		tenant_id INT NOT NULL,
		room_id INT NOT NULL,
		booking_code VARCHAR(50),
		start_date DATE NOT NULL,
		end_date DATE NOT NULL,
		monthly_rent DECIMAL(12,2) NOT NULL DEFAULT 0,
		deposit DECIMAL(12,2) NOT NULL DEFAULT 0,
		billing_cycle ENUM('monthly','quarterly','semi_annual','annual') NOT NULL DEFAULT 'monthly',
		cycle_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
		parent_contract_id INT NULL,
		status ENUM('active','expired','terminated','renewed','upgraded') DEFAULT 'active',
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
		INDEX idx_contracts_branch (branch_id),
		INDEX idx_contracts_tenant (tenant_id),
		INDEX idx_contracts_room (room_id),
		INDEX idx_contracts_dates (end_date, status),
		INDEX idx_contracts_parent (parent_contract_id)
	);

	CREATE TABLE IF NOT EXISTS invoices (
		id INT PRIMARY KEY AUTO_INCREMENT,
		branch_id INT NOT NULL,
		contract_id INT NOT NULL,
		invoice_number VARCHAR(50),
		period_start DATE NOT NULL,
		period_end DATE NOT NULL,
		amount_due DECIMAL(12,2) NOT NULL DEFAULT 0,
		amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
		due_date DATE,
		status ENUM('unpaid','partial','paid','void') DEFAULT 'unpaid',
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
		FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
		INDEX idx_invoices_branch (branch_id),
		INDEX idx_invoices_contract (contract_id),
		INDEX idx_invoices_status (status)
	);

	CREATE TABLE IF NOT EXISTS expense_categories (
		id INT PRIMARY KEY AUTO_INCREMENT,
		name VARCHAR(80) NOT NULL UNIQUE,
		description VARCHAR(255),
		is_active BOOLEAN DEFAULT TRUE,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS office_transactions (
		id INT PRIMARY KEY AUTO_INCREMENT,
		branch_id INT NOT NULL,
		txn_type ENUM('income','expense') NOT NULL,
		category VARCHAR(80),
		amount DECIMAL(12,2) NOT NULL,
		txn_date DATE NOT NULL,
		description VARCHAR(255),
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
		INDEX idx_txn_branch_date (branch_id, txn_date)
	);

	CREATE TABLE IF NOT EXISTS audit_logs (
		id INT PRIMARY KEY AUTO_INCREMENT,
		branch_id INT,
		user_id INT,
		action VARCHAR(255),
		resource_type VARCHAR(100),
		resource_id INT,
		changes JSON,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
		INDEX idx_branch_id (branch_id),
		INDEX idx_created_at (created_at)
	);
	`

	statements := strings.Split(schema, ";")
	for _, stmt := range statements {
		query := strings.TrimSpace(stmt)
		if query == "" {
			continue
		}

		if _, err := db.Exec(query); err != nil {
			return fmt.Errorf("failed to execute schema statement: %w", err)
		}
	}

	// Idempotent migrations for older deployments missing new columns.
	runMigration(db, "ALTER TABLE contracts ADD COLUMN billing_cycle ENUM('monthly','quarterly','semi_annual','annual') NOT NULL DEFAULT 'monthly'")
	runMigration(db, "ALTER TABLE contracts ADD COLUMN cycle_amount DECIMAL(12,2) NOT NULL DEFAULT 0")
	runMigration(db, "ALTER TABLE contracts ADD COLUMN parent_contract_id INT NULL")
	runMigration(db, "ALTER TABLE contracts MODIFY COLUMN status ENUM('active','expired','terminated','renewed','upgraded') DEFAULT 'active'")
	runMigration(db, "ALTER TABLE contracts ADD INDEX idx_contracts_parent (parent_contract_id)")
	runMigration(db, "ALTER TABLE tenants ADD COLUMN tenant_type ENUM('individual','institution') NOT NULL DEFAULT 'individual'")
	runMigration(db, "ALTER TABLE tenants ADD COLUMN organization_name VARCHAR(255)")
	runMigration(db, "ALTER TABLE tenants ADD COLUMN contact_person VARCHAR(255)")

	return nil
}

// runMigration executes a DDL statement and ignores errors for idempotency
// (e.g. duplicate column / duplicate key when migration already ran).
func runMigration(db *sql.DB, stmt string) {
	if _, err := db.Exec(stmt); err != nil {
		msg := err.Error()
		if strings.Contains(msg, "Duplicate") || strings.Contains(msg, "check that column") {
			return
		}
		fmt.Printf("migration warning: %v\n", err)
	}
}

func seedDefaultBranches(db *sql.DB) error {
	defaultBranches := []string{
		"Administration",
	}

	for _, name := range defaultBranches {
		if _, err := db.Exec("INSERT IGNORE INTO branches (name) VALUES (?)", name); err != nil {
			return fmt.Errorf("failed to seed branch %q: %w", name, err)
		}
	}

	return nil
}

func seedDefaultExpenseCategories(db *sql.DB) error {
	defaults := []string{
		"Utilities",
		"Repairs & Maintenance",
		"Salaries",
		"Security",
		"Cleaning",
		"Office Supplies",
		"Marketing",
		"Taxes & Licenses",
		"Miscellaneous",
	}
	for _, name := range defaults {
		if _, err := db.Exec("INSERT IGNORE INTO expense_categories (name) VALUES (?)", name); err != nil {
			return fmt.Errorf("failed to seed expense category %q: %w", name, err)
		}
	}
	return nil
}
