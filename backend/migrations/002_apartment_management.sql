-- Apartment management schema (rooms, contracts, invoices, transactions)
-- Safe to re-run: uses CREATE TABLE IF NOT EXISTS and ALTER...ADD COLUMN IF NOT EXISTS where supported.

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
    status ENUM('active','expired','terminated') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    INDEX idx_contracts_branch (branch_id),
    INDEX idx_contracts_tenant (tenant_id),
    INDEX idx_contracts_room (room_id),
    INDEX idx_contracts_dates (end_date, status)
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

-- Link payments to invoices/contracts (existing payments table).
-- MySQL 8.0+: use ADD COLUMN IF NOT EXISTS; for older versions, ignore duplicate column errors.
ALTER TABLE payments ADD COLUMN invoice_id INT NULL AFTER unit_id;
ALTER TABLE payments ADD COLUMN contract_id INT NULL AFTER invoice_id;
ALTER TABLE payments ADD INDEX idx_payments_invoice (invoice_id);
ALTER TABLE payments ADD INDEX idx_payments_contract (contract_id);
