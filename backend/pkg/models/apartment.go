package models

import "time"

type Room struct {
	ID          int       `json:"id"`
	BranchID    int       `json:"branch_id"`
	Code        string    `json:"code"`
	RoomType    string    `json:"room_type"`
	MonthlyRent float64   `json:"monthly_rent"`
	Status      string    `json:"status"`
	Notes       string    `json:"notes"`
	CreatedAt   time.Time `json:"created_at"`
}

type Tenant struct {
	ID        int       `json:"id"`
	BranchID  int       `json:"branch_id"`
	FullName  string    `json:"full_name"`
	Phone     string    `json:"phone"`
	Email     string    `json:"email"`
	IDNumber  string    `json:"id_number"`
	CreatedAt time.Time `json:"created_at"`
}

type Contract struct {
	ID           int       `json:"id"`
	BranchID     int       `json:"branch_id"`
	TenantID     int       `json:"tenant_id"`
	RoomID       int       `json:"room_id"`
	BookingCode  string    `json:"booking_code"`
	StartDate    string    `json:"start_date"`
	EndDate      string    `json:"end_date"`
	MonthlyRent  float64   `json:"monthly_rent"`
	Deposit      float64   `json:"deposit"`
	Status       string    `json:"status"`
	TenantName   string    `json:"tenant_name,omitempty"`
	TenantPhone  string    `json:"tenant_phone,omitempty"`
	RoomCode     string    `json:"room_code,omitempty"`
	InvoiceTotal float64   `json:"invoice_total,omitempty"`
	PaidTotal    float64   `json:"paid_total,omitempty"`
	Balance      float64   `json:"balance,omitempty"`
	DaysLeft     int       `json:"days_left,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

type Invoice struct {
	ID            int       `json:"id"`
	BranchID      int       `json:"branch_id"`
	ContractID    int       `json:"contract_id"`
	InvoiceNumber string    `json:"invoice_number"`
	PeriodStart   string    `json:"period_start"`
	PeriodEnd     string    `json:"period_end"`
	AmountDue     float64   `json:"amount_due"`
	AmountPaid    float64   `json:"amount_paid"`
	DueDate       string    `json:"due_date"`
	Status        string    `json:"status"`
	TenantName    string    `json:"tenant_name,omitempty"`
	RoomCode      string    `json:"room_code,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

type Payment struct {
	ID            int       `json:"id"`
	BranchID      int       `json:"branch_id"`
	TenantID      int       `json:"tenant_id"`
	ContractID    int       `json:"contract_id"`
	InvoiceID     int       `json:"invoice_id"`
	Amount        float64   `json:"amount"`
	PaymentDate   string    `json:"payment_date"`
	ReceiptNumber string    `json:"receipt_number"`
	PaymentMethod string    `json:"payment_method"`
	Notes         string    `json:"notes"`
	TenantName    string    `json:"tenant_name,omitempty"`
	RoomCode      string    `json:"room_code,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

type OfficeTransaction struct {
	ID          int       `json:"id"`
	BranchID    int       `json:"branch_id"`
	TxnType     string    `json:"txn_type"`
	Category    string    `json:"category"`
	Amount      float64   `json:"amount"`
	TxnDate     string    `json:"txn_date"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

type BranchDashboard struct {
	BranchID         int        `json:"branch_id"`
	BranchName       string     `json:"branch_name"`
	ActiveContracts  int        `json:"active_contracts"`
	Expiring7d       int        `json:"expiring_7d"`
	Expiring30d      int        `json:"expiring_30d"`
	ExpiredInProg    int        `json:"expired_in_progress"`
	UnpaidActive     int        `json:"unpaid_active"`
	PaymentsToday    float64    `json:"payments_today"`
	PaymentsTodayCnt int        `json:"payments_today_count"`
	ExpiringSoon     []Contract `json:"expiring_soon"`
	ExpiredContracts []Contract `json:"expired_contracts"`
	UnpaidContracts  []Contract `json:"unpaid_contracts"`
	TodayPayments    []Payment  `json:"today_payments"`
}

type AdminDashboardBranch struct {
	BranchID        int     `json:"branch_id"`
	BranchName      string  `json:"branch_name"`
	ActiveContracts int     `json:"active_contracts"`
	Expiring7d      int     `json:"expiring_7d"`
	Expiring30d     int     `json:"expiring_30d"`
	ExpiredInProg   int     `json:"expired_in_progress"`
	UnpaidActive    int     `json:"unpaid_active"`
	PaymentsToday   float64 `json:"payments_today"`
}

type AdminDashboard struct {
	Totals   AdminDashboardBranch   `json:"totals"`
	Branches []AdminDashboardBranch `json:"branches"`
}
