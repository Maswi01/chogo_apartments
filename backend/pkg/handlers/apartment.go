package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"chogo_apartments/pkg/models"
)

type ApartmentHandler struct {
	db *sql.DB
}

func NewApartmentHandler(db *sql.DB) *ApartmentHandler {
	return &ApartmentHandler{db: db}
}

// ---------- helpers ----------

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeErr(w http.ResponseWriter, status int, code, msg string) {
	writeJSON(w, status, models.ErrorResponse{Error: code, Message: msg})
}

func branchIDParam(r *http.Request) int {
	v := r.URL.Query().Get("branch_id")
	id, _ := strconv.Atoi(v)
	return id
}

func nullStr(s sql.NullString) string {
	if s.Valid {
		return s.String
	}
	return ""
}

func nullDate(s sql.NullString) string {
	if s.Valid && len(s.String) >= 10 {
		return s.String[:10]
	}
	return ""
}

// nullableInt returns sql.NullInt64 (NULL when v <= 0) suitable for INSERT bindings
// where the column is nullable and we want NULL instead of 0.
func nullableInt(v int) interface{} {
	if v <= 0 {
		return nil
	}
	return v
}

// ---------- Rooms ----------

func (h *ApartmentHandler) ListRooms(w http.ResponseWriter, r *http.Request) {
	branchID := branchIDParam(r)
	if branchID == 0 {
		writeErr(w, http.StatusBadRequest, "invalid_input", "branch_id required")
		return
	}
	statusFilter := r.URL.Query().Get("status")

	q := `SELECT id, branch_id, code, COALESCE(room_type,''), monthly_rent, status, COALESCE(notes,''), created_at
	      FROM rooms WHERE branch_id = ?`
	args := []any{branchID}
	if statusFilter != "" {
		q += " AND status = ?"
		args = append(args, statusFilter)
	}
	q += " ORDER BY code ASC"

	rows, err := h.db.Query(q, args...)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	defer rows.Close()

	out := make([]models.Room, 0)
	for rows.Next() {
		var rm models.Room
		if err := rows.Scan(&rm.ID, &rm.BranchID, &rm.Code, &rm.RoomType, &rm.MonthlyRent, &rm.Status, &rm.Notes, &rm.CreatedAt); err != nil {
			writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
			return
		}
		out = append(out, rm)
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *ApartmentHandler) CreateRoom(w http.ResponseWriter, r *http.Request) {
	var in models.Room
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_request", "Invalid body")
		return
	}
	in.Code = strings.TrimSpace(in.Code)
	if in.BranchID == 0 || in.Code == "" {
		writeErr(w, http.StatusBadRequest, "invalid_input", "branch_id and code required")
		return
	}
	if in.Status == "" {
		in.Status = "vacant"
	}
	res, err := h.db.Exec(
		`INSERT INTO rooms (branch_id, code, room_type, monthly_rent, status, notes) VALUES (?,?,?,?,?,?)`,
		in.BranchID, in.Code, in.RoomType, in.MonthlyRent, in.Status, in.Notes,
	)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			writeErr(w, http.StatusConflict, "duplicate", "Room code exists in branch")
			return
		}
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	id, _ := res.LastInsertId()
	in.ID = int(id)
	writeJSON(w, http.StatusCreated, in)
}

// ---------- Tenants ----------

func (h *ApartmentHandler) ListTenants(w http.ResponseWriter, r *http.Request) {
	branchID := branchIDParam(r)
	if branchID == 0 {
		writeErr(w, http.StatusBadRequest, "invalid_input", "branch_id required")
		return
	}
	rows, err := h.db.Query(
		`SELECT id, branch_id, full_name, COALESCE(tenant_type,'individual'), COALESCE(organization_name,''), COALESCE(contact_person,''),
		        COALESCE(phone,''), COALESCE(email,''), COALESCE(id_number,''), created_at
		 FROM tenants WHERE branch_id = ? ORDER BY full_name ASC`, branchID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	defer rows.Close()
	out := make([]models.Tenant, 0)
	for rows.Next() {
		var t models.Tenant
		if err := rows.Scan(&t.ID, &t.BranchID, &t.FullName, &t.TenantType, &t.OrganizationName, &t.ContactPerson,
			&t.Phone, &t.Email, &t.IDNumber, &t.CreatedAt); err != nil {
			writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
			return
		}
		out = append(out, t)
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *ApartmentHandler) CreateTenant(w http.ResponseWriter, r *http.Request) {
	var in models.Tenant
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_request", "Invalid body")
		return
	}
	in.FullName = strings.TrimSpace(in.FullName)
	if in.BranchID == 0 || in.FullName == "" {
		writeErr(w, http.StatusBadRequest, "invalid_input", "branch_id and full_name required")
		return
	}
	if in.TenantType == "" {
		in.TenantType = "individual"
	}
	if in.TenantType != "individual" && in.TenantType != "institution" {
		writeErr(w, http.StatusBadRequest, "invalid_input", "tenant_type must be individual or institution")
		return
	}
	if in.TenantType == "institution" && strings.TrimSpace(in.OrganizationName) == "" {
		in.OrganizationName = in.FullName
	}
	res, err := h.db.Exec(
		`INSERT INTO tenants (branch_id, full_name, tenant_type, organization_name, contact_person, phone, email, id_number, unit_id, status)
		 VALUES (?,?,?,?,?,?,?,?, NULL, 'active')`,
		in.BranchID, in.FullName, in.TenantType, in.OrganizationName, in.ContactPerson, in.Phone, in.Email, in.IDNumber,
	)
	if err != nil {
		// Older schema requires NOT NULL unit_id; instruct user.
		writeErr(w, http.StatusInternalServerError, "db_error",
			"tenants.unit_id must allow NULL. Run: ALTER TABLE tenants MODIFY unit_id INT NULL; -- then retry")
		return
	}
	id, _ := res.LastInsertId()
	in.ID = int(id)
	writeJSON(w, http.StatusCreated, in)
}

// ---------- Contracts ----------

type contractIn struct {
	BranchID     int     `json:"branch_id"`
	TenantID     int     `json:"tenant_id"`
	RoomID       int     `json:"room_id"`
	BookingCode  string  `json:"booking_code"`
	StartDate    string  `json:"start_date"`
	EndDate      string  `json:"end_date"`
	MonthlyRent  float64 `json:"monthly_rent"`
	Deposit      float64 `json:"deposit"`
	BillingCycle string  `json:"billing_cycle"`
	CycleAmount  float64 `json:"cycle_amount"`
}

// monthsPerCycle returns how many months a billing cycle covers.
func monthsPerCycle(cycle string) int {
	switch cycle {
	case "quarterly":
		return 3
	case "semi_annual":
		return 6
	case "annual":
		return 12
	default:
		return 1
	}
}

// generateInvoicesForContract creates one invoice per billing period covering
// the entire contract duration. Called inside a transaction.
func generateInvoicesForContract(tx *sql.Tx, branchID int, contractID int64, startDate, endDate string, cycleAmount float64, cycle string) error {
	start, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		return err
	}
	end, err := time.Parse("2006-01-02", endDate)
	if err != nil {
		return err
	}
	step := monthsPerCycle(cycle)
	periodIdx := 0
	for cur := start; !cur.After(end); cur = cur.AddDate(0, step, 0) {
		periodEnd := cur.AddDate(0, step, -1)
		if periodEnd.After(end) {
			periodEnd = end
		}
		dueDate := cur.Format("2006-01-02")
		invNum := "INV-" + strconv.FormatInt(contractID, 10) + "-" + strconv.Itoa(periodIdx+1)
		if _, err := tx.Exec(
			`INSERT INTO invoices (branch_id, contract_id, invoice_number, period_start, period_end, amount_due, due_date, status)
			 VALUES (?,?,?,?,?,?,?,'unpaid')`,
			branchID, contractID, invNum,
			cur.Format("2006-01-02"), periodEnd.Format("2006-01-02"),
			cycleAmount, dueDate); err != nil {
			return err
		}
		periodIdx++
	}
	return nil
}

func (h *ApartmentHandler) CreateContract(w http.ResponseWriter, r *http.Request) {
	var in contractIn
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_request", "Invalid body")
		return
	}
	if in.BranchID == 0 || in.TenantID == 0 || in.RoomID == 0 || in.StartDate == "" || in.EndDate == "" {
		writeErr(w, http.StatusBadRequest, "invalid_input", "branch_id, tenant_id, room_id, start_date, end_date required")
		return
	}
	if in.BillingCycle == "" {
		in.BillingCycle = "monthly"
	}
	switch in.BillingCycle {
	case "monthly", "quarterly", "semi_annual", "annual":
	default:
		writeErr(w, http.StatusBadRequest, "invalid_input", "billing_cycle must be monthly|quarterly|semi_annual|annual")
		return
	}
	if in.CycleAmount <= 0 {
		in.CycleAmount = in.MonthlyRent * float64(monthsPerCycle(in.BillingCycle))
	}

	tx, err := h.db.Begin()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	defer tx.Rollback()

	res, err := tx.Exec(
		`INSERT INTO contracts (branch_id, tenant_id, room_id, booking_code, start_date, end_date,
		                       monthly_rent, deposit, billing_cycle, cycle_amount, status)
		 VALUES (?,?,?,?,?,?,?,?,?,?,'active')`,
		in.BranchID, in.TenantID, in.RoomID, in.BookingCode, in.StartDate, in.EndDate,
		in.MonthlyRent, in.Deposit, in.BillingCycle, in.CycleAmount)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	cid, _ := res.LastInsertId()

	if _, err := tx.Exec(`UPDATE rooms SET status='occupied' WHERE id=? AND branch_id=?`, in.RoomID, in.BranchID); err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}

	if err := generateInvoicesForContract(tx, in.BranchID, cid, in.StartDate, in.EndDate, in.CycleAmount, in.BillingCycle); err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", "invoice generation failed: "+err.Error())
		return
	}

	if err := tx.Commit(); err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"id": cid, "billing_cycle": in.BillingCycle, "cycle_amount": in.CycleAmount})
}

func (h *ApartmentHandler) ListContracts(w http.ResponseWriter, r *http.Request) {
	branchID := branchIDParam(r)
	if branchID == 0 {
		writeErr(w, http.StatusBadRequest, "invalid_input", "branch_id required")
		return
	}
	statusFilter := r.URL.Query().Get("status")
	q := `SELECT c.id, c.branch_id, c.tenant_id, c.room_id, COALESCE(c.booking_code,''),
	             c.start_date, c.end_date, c.monthly_rent, c.deposit,
	             c.billing_cycle, c.cycle_amount, c.parent_contract_id, c.status,
	             t.full_name, COALESCE(t.phone,''), COALESCE(t.tenant_type,'individual'), r.code,
	             COALESCE((SELECT SUM(amount_due) FROM invoices WHERE contract_id=c.id),0) AS inv_total,
	             COALESCE((SELECT SUM(amount_paid) FROM invoices WHERE contract_id=c.id),0) AS paid_total,
	             c.created_at
	      FROM contracts c
	      JOIN tenants t ON t.id = c.tenant_id
	      JOIN rooms r ON r.id = c.room_id
	      WHERE c.branch_id = ?`
	args := []any{branchID}
	if statusFilter != "" {
		q += " AND c.status = ?"
		args = append(args, statusFilter)
	}
	q += " ORDER BY c.end_date ASC"

	rows, err := h.db.Query(q, args...)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	defer rows.Close()

	out := make([]models.Contract, 0)
	now := time.Now()
	for rows.Next() {
		var c models.Contract
		var sd, ed sql.NullString
		var parentID sql.NullInt64
		if err := rows.Scan(&c.ID, &c.BranchID, &c.TenantID, &c.RoomID, &c.BookingCode,
			&sd, &ed, &c.MonthlyRent, &c.Deposit,
			&c.BillingCycle, &c.CycleAmount, &parentID, &c.Status,
			&c.TenantName, &c.TenantPhone, &c.TenantType, &c.RoomCode,
			&c.InvoiceTotal, &c.PaidTotal, &c.CreatedAt); err != nil {
			writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
			return
		}
		c.StartDate = nullDate(sd)
		c.EndDate = nullDate(ed)
		if parentID.Valid {
			v := int(parentID.Int64)
			c.ParentContractID = &v
		}
		c.Balance = c.InvoiceTotal - c.PaidTotal
		if t, err := time.Parse("2006-01-02", c.EndDate); err == nil {
			c.DaysLeft = int(t.Sub(now).Hours() / 24)
		}
		out = append(out, c)
	}
	writeJSON(w, http.StatusOK, out)
}

// ---------- Invoices ----------

type invoiceIn struct {
	BranchID      int     `json:"branch_id"`
	ContractID    int     `json:"contract_id"`
	InvoiceNumber string  `json:"invoice_number"`
	PeriodStart   string  `json:"period_start"`
	PeriodEnd     string  `json:"period_end"`
	AmountDue     float64 `json:"amount_due"`
	DueDate       string  `json:"due_date"`
}

func (h *ApartmentHandler) CreateInvoice(w http.ResponseWriter, r *http.Request) {
	var in invoiceIn
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_request", "Invalid body")
		return
	}
	if in.BranchID == 0 || in.ContractID == 0 || in.PeriodStart == "" || in.PeriodEnd == "" || in.AmountDue <= 0 {
		writeErr(w, http.StatusBadRequest, "invalid_input", "branch_id, contract_id, periods and amount_due required")
		return
	}
	res, err := h.db.Exec(
		`INSERT INTO invoices (branch_id, contract_id, invoice_number, period_start, period_end, amount_due, due_date, status)
		 VALUES (?,?,?,?,?,?,?,?)`,
		in.BranchID, in.ContractID, in.InvoiceNumber, in.PeriodStart, in.PeriodEnd, in.AmountDue,
		sql.NullString{String: in.DueDate, Valid: in.DueDate != ""}, "unpaid")
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	id, _ := res.LastInsertId()
	writeJSON(w, http.StatusCreated, map[string]any{"id": id})
}

func (h *ApartmentHandler) ListInvoices(w http.ResponseWriter, r *http.Request) {
	branchID := branchIDParam(r)
	if branchID == 0 {
		writeErr(w, http.StatusBadRequest, "invalid_input", "branch_id required")
		return
	}
	statusFilter := r.URL.Query().Get("status")
	q := `SELECT i.id, i.branch_id, i.contract_id, COALESCE(i.invoice_number,''),
	             i.period_start, i.period_end, i.amount_due, i.amount_paid,
	             i.due_date, i.status,
	             t.full_name, r.code, i.created_at
	      FROM invoices i
	      JOIN contracts c ON c.id = i.contract_id
	      JOIN tenants t ON t.id = c.tenant_id
	      JOIN rooms r ON r.id = c.room_id
	      WHERE i.branch_id = ?`
	args := []any{branchID}
	if statusFilter != "" {
		q += " AND i.status = ?"
		args = append(args, statusFilter)
	}
	q += " ORDER BY i.due_date ASC, i.id DESC"
	rows, err := h.db.Query(q, args...)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	defer rows.Close()
	out := make([]models.Invoice, 0)
	for rows.Next() {
		var inv models.Invoice
		var ps, pe, dd sql.NullString
		if err := rows.Scan(&inv.ID, &inv.BranchID, &inv.ContractID, &inv.InvoiceNumber,
			&ps, &pe, &inv.AmountDue, &inv.AmountPaid, &dd, &inv.Status,
			&inv.TenantName, &inv.RoomCode, &inv.CreatedAt); err != nil {
			writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
			return
		}
		inv.PeriodStart = nullDate(ps)
		inv.PeriodEnd = nullDate(pe)
		inv.DueDate = nullDate(dd)
		out = append(out, inv)
	}
	writeJSON(w, http.StatusOK, out)
}

// ---------- Payments ----------

type paymentIn struct {
	BranchID      int     `json:"branch_id"`
	InvoiceID     int     `json:"invoice_id"`
	Amount        float64 `json:"amount"`
	PaymentDate   string  `json:"payment_date"`
	ReceiptNumber string  `json:"receipt_number"`
	PaymentMethod string  `json:"payment_method"`
	Notes         string  `json:"notes"`
	RecordedBy    int     `json:"recorded_by"`
}

func (h *ApartmentHandler) CreatePayment(w http.ResponseWriter, r *http.Request) {
	var in paymentIn
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_request", "Invalid body")
		return
	}
	if in.BranchID == 0 || in.InvoiceID == 0 || in.Amount <= 0 {
		writeErr(w, http.StatusBadRequest, "invalid_input", "branch_id, invoice_id, amount required")
		return
	}
	if in.PaymentDate == "" {
		in.PaymentDate = time.Now().Format("2006-01-02")
	}

	tx, err := h.db.Begin()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	defer tx.Rollback()

	var contractID, tenantID, roomID int
	var amountDue, amountPaid float64
	if err := tx.QueryRow(
		`SELECT i.contract_id, c.tenant_id, c.room_id, i.amount_due, i.amount_paid
		 FROM invoices i JOIN contracts c ON c.id = i.contract_id
		 WHERE i.id=? AND i.branch_id=?`, in.InvoiceID, in.BranchID,
	).Scan(&contractID, &tenantID, &roomID, &amountDue, &amountPaid); err != nil {
		writeErr(w, http.StatusBadRequest, "not_found", "Invoice not found")
		return
	}

	if _, err := tx.Exec(
		`INSERT INTO payments (branch_id, tenant_id, unit_id, invoice_id, contract_id, amount, payment_date, receipt_number, payment_method, notes, recorded_by)
		 VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
		in.BranchID, tenantID, roomID, in.InvoiceID, contractID, in.Amount, in.PaymentDate,
		in.ReceiptNumber, in.PaymentMethod, in.Notes, nullableInt(in.RecordedBy),
	); err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}

	newPaid := amountPaid + in.Amount
	status := "partial"
	if newPaid >= amountDue {
		status = "paid"
	}
	if _, err := tx.Exec(`UPDATE invoices SET amount_paid=?, status=? WHERE id=?`, newPaid, status, in.InvoiceID); err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}

	if err := tx.Commit(); err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"ok": true})
}

func (h *ApartmentHandler) ListPayments(w http.ResponseWriter, r *http.Request) {
	branchID := branchIDParam(r)
	if branchID == 0 {
		writeErr(w, http.StatusBadRequest, "invalid_input", "branch_id required")
		return
	}
	tenantID, _ := strconv.Atoi(r.URL.Query().Get("tenant_id"))
	dateFilter := r.URL.Query().Get("date") // YYYY-MM-DD
	q := `SELECT p.id, p.branch_id, p.tenant_id, COALESCE(p.contract_id,0), COALESCE(p.invoice_id,0),
	             p.amount, p.payment_date, COALESCE(p.receipt_number,''), COALESCE(p.payment_method,''), COALESCE(p.notes,''),
	             COALESCE(p.recorded_by,0), COALESCE(u.full_name,''),
	             t.full_name, COALESCE(r.code,''), p.created_at
	      FROM payments p
	      JOIN tenants t ON t.id = p.tenant_id
	      LEFT JOIN rooms r ON r.id = p.unit_id
	      LEFT JOIN users u ON u.id = p.recorded_by
	      WHERE p.branch_id = ?`
	args := []any{branchID}
	if tenantID > 0 {
		q += " AND p.tenant_id = ?"
		args = append(args, tenantID)
	}
	if dateFilter != "" {
		q += " AND p.payment_date = ?"
		args = append(args, dateFilter)
	}
	q += " ORDER BY p.payment_date DESC, p.id DESC"
	rows, err := h.db.Query(q, args...)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	defer rows.Close()
	out := make([]models.Payment, 0)
	for rows.Next() {
		var p models.Payment
		var recordedBy sql.NullInt64
		var pd sql.NullString
		if err := rows.Scan(&p.ID, &p.BranchID, &p.TenantID, &p.ContractID, &p.InvoiceID,
			&p.Amount, &pd, &p.ReceiptNumber, &p.PaymentMethod, &p.Notes,
			&recordedBy, &p.RecordedByName,
			&p.TenantName, &p.RoomCode, &p.CreatedAt); err != nil {
			writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
			return
		}
		p.PaymentDate = nullDate(pd)
		if recordedBy.Valid {
			p.RecordedBy = int(recordedBy.Int64)
		}
		out = append(out, p)
	}
	writeJSON(w, http.StatusOK, out)
}

// ---------- Office Transactions ----------

func (h *ApartmentHandler) ListTransactions(w http.ResponseWriter, r *http.Request) {
	branchID := branchIDParam(r)
	if branchID == 0 {
		writeErr(w, http.StatusBadRequest, "invalid_input", "branch_id required")
		return
	}
	rows, err := h.db.Query(
		`SELECT id, branch_id, txn_type, COALESCE(category,''), amount, txn_date, COALESCE(description,''), created_at
		 FROM office_transactions WHERE branch_id = ? ORDER BY txn_date DESC, id DESC`, branchID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	defer rows.Close()
	out := make([]models.OfficeTransaction, 0)
	for rows.Next() {
		var t models.OfficeTransaction
		var td sql.NullString
		if err := rows.Scan(&t.ID, &t.BranchID, &t.TxnType, &t.Category, &t.Amount, &td, &t.Description, &t.CreatedAt); err != nil {
			writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
			return
		}
		t.TxnDate = nullDate(td)
		out = append(out, t)
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *ApartmentHandler) CreateTransaction(w http.ResponseWriter, r *http.Request) {
	var in models.OfficeTransaction
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_request", "Invalid body")
		return
	}
	if in.BranchID == 0 || in.TxnType == "" || in.Amount <= 0 {
		writeErr(w, http.StatusBadRequest, "invalid_input", "branch_id, txn_type, amount required")
		return
	}
	if in.TxnDate == "" {
		in.TxnDate = time.Now().Format("2006-01-02")
	}
	res, err := h.db.Exec(
		`INSERT INTO office_transactions (branch_id, txn_type, category, amount, txn_date, description) VALUES (?,?,?,?,?,?)`,
		in.BranchID, in.TxnType, in.Category, in.Amount, in.TxnDate, in.Description,
	)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	id, _ := res.LastInsertId()
	in.ID = int(id)
	writeJSON(w, http.StatusCreated, in)
}

// ---------- Dashboards ----------

func (h *ApartmentHandler) BranchDashboard(w http.ResponseWriter, r *http.Request) {
	branchID := branchIDParam(r)
	if branchID == 0 {
		writeErr(w, http.StatusBadRequest, "invalid_input", "branch_id required")
		return
	}

	var dash models.BranchDashboard
	dash.BranchID = branchID
	if err := h.db.QueryRow(`SELECT name FROM branches WHERE id = ?`, branchID).Scan(&dash.BranchName); err != nil {
		writeErr(w, http.StatusNotFound, "not_found", "Branch not found")
		return
	}

	stats := computeBranchStats(h.db, branchID)
	dash.ActiveContracts = stats.ActiveContracts
	dash.Expiring7d = stats.Expiring7d
	dash.Expiring30d = stats.Expiring30d
	dash.ExpiredInProg = stats.ExpiredInProg
	dash.UnpaidActive = stats.UnpaidActive
	dash.PaymentsToday = stats.PaymentsToday

	dash.ExpiringSoon = listContractsByCondition(h.db, branchID,
		`c.status='active' AND c.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)`,
		"c.end_date ASC")
	dash.ExpiredContracts = listContractsByCondition(h.db, branchID,
		`c.end_date < CURDATE() AND c.status IN ('active','expired')`,
		"c.end_date DESC")
	dash.UnpaidContracts = listContractsByCondition(h.db, branchID,
		`c.status='active' AND (COALESCE((SELECT SUM(amount_due) FROM invoices WHERE contract_id=c.id),0) -
		                         COALESCE((SELECT SUM(amount_paid) FROM invoices WHERE contract_id=c.id),0)) > 0`,
		"c.end_date ASC")

	dash.TodayPayments = listTodayPayments(h.db, branchID)
	dash.PaymentsTodayCnt = len(dash.TodayPayments)

	writeJSON(w, http.StatusOK, dash)
}

func (h *ApartmentHandler) AdminDashboard(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(`SELECT id, name FROM branches ORDER BY id ASC`)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	defer rows.Close()

	var dash models.AdminDashboard
	for rows.Next() {
		var id int
		var name string
		if err := rows.Scan(&id, &name); err != nil {
			writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
			return
		}
		s := computeBranchStats(h.db, id)
		s.BranchID = id
		s.BranchName = name
		dash.Branches = append(dash.Branches, s)
		dash.Totals.ActiveContracts += s.ActiveContracts
		dash.Totals.Expiring7d += s.Expiring7d
		dash.Totals.Expiring30d += s.Expiring30d
		dash.Totals.ExpiredInProg += s.ExpiredInProg
		dash.Totals.UnpaidActive += s.UnpaidActive
		dash.Totals.PaymentsToday += s.PaymentsToday
	}
	dash.Totals.BranchName = "ALL BRANCHES"
	writeJSON(w, http.StatusOK, dash)
}

func computeBranchStats(db *sql.DB, branchID int) models.AdminDashboardBranch {
	var s models.AdminDashboardBranch
	_ = db.QueryRow(`SELECT COUNT(*) FROM contracts WHERE branch_id=? AND status='active' AND end_date >= CURDATE()`, branchID).Scan(&s.ActiveContracts)
	_ = db.QueryRow(`SELECT COUNT(*) FROM contracts WHERE branch_id=? AND status='active' AND end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)`, branchID).Scan(&s.Expiring7d)
	_ = db.QueryRow(`SELECT COUNT(*) FROM contracts WHERE branch_id=? AND status='active' AND end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)`, branchID).Scan(&s.Expiring30d)
	_ = db.QueryRow(`SELECT COUNT(*) FROM contracts WHERE branch_id=? AND end_date < CURDATE() AND status IN ('active','expired')`, branchID).Scan(&s.ExpiredInProg)
	_ = db.QueryRow(`SELECT COUNT(*) FROM contracts c WHERE c.branch_id=? AND c.status='active' AND (COALESCE((SELECT SUM(amount_due) FROM invoices WHERE contract_id=c.id),0) - COALESCE((SELECT SUM(amount_paid) FROM invoices WHERE contract_id=c.id),0)) > 0`, branchID).Scan(&s.UnpaidActive)
	_ = db.QueryRow(`SELECT COALESCE(SUM(amount),0) FROM payments WHERE branch_id=? AND payment_date = CURDATE()`, branchID).Scan(&s.PaymentsToday)
	return s
}

func listContractsByCondition(db *sql.DB, branchID int, where, order string) []models.Contract {
	q := `SELECT c.id, c.branch_id, c.tenant_id, c.room_id, COALESCE(c.booking_code,''),
	             c.start_date, c.end_date, c.monthly_rent, c.deposit, c.status,
	             t.full_name, COALESCE(t.phone,''), r.code,
	             COALESCE((SELECT SUM(amount_due) FROM invoices WHERE contract_id=c.id),0),
	             COALESCE((SELECT SUM(amount_paid) FROM invoices WHERE contract_id=c.id),0),
	             c.created_at
	      FROM contracts c
	      JOIN tenants t ON t.id = c.tenant_id
	      JOIN rooms r ON r.id = c.room_id
	      WHERE c.branch_id = ? AND ` + where + ` ORDER BY ` + order + ` LIMIT 50`
	rows, err := db.Query(q, branchID)
	if err != nil {
		return []models.Contract{}
	}
	defer rows.Close()
	out := make([]models.Contract, 0)
	now := time.Now()
	for rows.Next() {
		var c models.Contract
		var sd, ed sql.NullString
		if err := rows.Scan(&c.ID, &c.BranchID, &c.TenantID, &c.RoomID, &c.BookingCode,
			&sd, &ed, &c.MonthlyRent, &c.Deposit, &c.Status,
			&c.TenantName, &c.TenantPhone, &c.RoomCode,
			&c.InvoiceTotal, &c.PaidTotal, &c.CreatedAt); err != nil {
			continue
		}
		c.StartDate = nullDate(sd)
		c.EndDate = nullDate(ed)
		c.Balance = c.InvoiceTotal - c.PaidTotal
		if t, err := time.Parse("2006-01-02", c.EndDate); err == nil {
			c.DaysLeft = int(t.Sub(now).Hours() / 24)
		}
		out = append(out, c)
	}
	return out
}

func listTodayPayments(db *sql.DB, branchID int) []models.Payment {
	rows, err := db.Query(
		`SELECT p.id, p.branch_id, p.tenant_id, COALESCE(p.contract_id,0), COALESCE(p.invoice_id,0),
		        p.amount, p.payment_date, COALESCE(p.receipt_number,''), COALESCE(p.payment_method,''), COALESCE(p.notes,''),
		        t.full_name, COALESCE(r.code,''), p.created_at
		 FROM payments p
		 JOIN tenants t ON t.id = p.tenant_id
		 LEFT JOIN rooms r ON r.id = p.unit_id
		 WHERE p.branch_id = ? AND p.payment_date = CURDATE()
		 ORDER BY p.id DESC`, branchID)
	if err != nil {
		return []models.Payment{}
	}
	defer rows.Close()
	out := make([]models.Payment, 0)
	for rows.Next() {
		var p models.Payment
		var pd sql.NullString
		if err := rows.Scan(&p.ID, &p.BranchID, &p.TenantID, &p.ContractID, &p.InvoiceID,
			&p.Amount, &pd, &p.ReceiptNumber, &p.PaymentMethod, &p.Notes,
			&p.TenantName, &p.RoomCode, &p.CreatedAt); err != nil {
			continue
		}
		p.PaymentDate = nullDate(pd)
		out = append(out, p)
	}
	return out
}

// suppress unused warning helpers
var _ = nullStr

// ---------- Contract Renewal & Upgrade ----------

type renewIn struct {
	EndDate      string  `json:"end_date"`
	MonthlyRent  float64 `json:"monthly_rent"`
	Deposit      float64 `json:"deposit"`
	BillingCycle string  `json:"billing_cycle"`
	CycleAmount  float64 `json:"cycle_amount"`
	BookingCode  string  `json:"booking_code"`
}

type upgradeIn struct {
	NewRoomID     int     `json:"new_room_id"`
	EffectiveDate string  `json:"effective_date"`
	EndDate       string  `json:"end_date"`
	MonthlyRent   float64 `json:"monthly_rent"`
	Deposit       float64 `json:"deposit"`
	BillingCycle  string  `json:"billing_cycle"`
	CycleAmount   float64 `json:"cycle_amount"`
	BookingCode   string  `json:"booking_code"`
}

func parseContractActionID(path, suffix string) int {
	s := strings.TrimPrefix(path, "/api/contracts/")
	s = strings.TrimSuffix(s, "/"+suffix)
	id, _ := strconv.Atoi(s)
	return id
}

func (h *ApartmentHandler) RenewContract(w http.ResponseWriter, r *http.Request) {
	id := parseContractActionID(r.URL.Path, "renew")
	if id == 0 {
		writeErr(w, http.StatusBadRequest, "invalid_input", "contract id required")
		return
	}
	var in renewIn
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_request", "Invalid body")
		return
	}
	if in.EndDate == "" {
		writeErr(w, http.StatusBadRequest, "invalid_input", "end_date required")
		return
	}

	var (
		branchID, tenantID, roomID int
		oldEnd, oldCycle           string
		oldRent, oldDeposit        float64
	)
	if err := h.db.QueryRow(
		`SELECT branch_id, tenant_id, room_id, end_date, monthly_rent, deposit, billing_cycle
		 FROM contracts WHERE id=?`, id).
		Scan(&branchID, &tenantID, &roomID, &oldEnd, &oldRent, &oldDeposit, &oldCycle); err != nil {
		writeErr(w, http.StatusNotFound, "not_found", "contract not found")
		return
	}

	oldEndT, err := time.Parse("2006-01-02", oldEnd)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", "bad existing end_date")
		return
	}
	newStart := oldEndT.AddDate(0, 0, 1).Format("2006-01-02")

	if in.BillingCycle == "" {
		in.BillingCycle = oldCycle
	}
	switch in.BillingCycle {
	case "monthly", "quarterly", "semi_annual", "annual":
	default:
		writeErr(w, http.StatusBadRequest, "invalid_input", "billing_cycle invalid")
		return
	}
	if in.MonthlyRent <= 0 {
		in.MonthlyRent = oldRent
	}
	if in.Deposit <= 0 {
		in.Deposit = oldDeposit
	}
	if in.CycleAmount <= 0 {
		in.CycleAmount = in.MonthlyRent * float64(monthsPerCycle(in.BillingCycle))
	}

	tx, err := h.db.Begin()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	defer tx.Rollback()

	res, err := tx.Exec(
		`INSERT INTO contracts (branch_id, tenant_id, room_id, booking_code, start_date, end_date,
		                       monthly_rent, deposit, billing_cycle, cycle_amount, status, parent_contract_id)
		 VALUES (?,?,?,?,?,?,?,?,?,?,'active',?)`,
		branchID, tenantID, roomID, in.BookingCode, newStart, in.EndDate,
		in.MonthlyRent, in.Deposit, in.BillingCycle, in.CycleAmount, id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	newID, _ := res.LastInsertId()

	if _, err := tx.Exec(`UPDATE contracts SET status='renewed' WHERE id=?`, id); err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}

	if err := generateInvoicesForContract(tx, branchID, newID, newStart, in.EndDate, in.CycleAmount, in.BillingCycle); err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", "invoice generation failed: "+err.Error())
		return
	}

	if err := tx.Commit(); err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"id":            newID,
		"parent":        id,
		"start_date":    newStart,
		"end_date":      in.EndDate,
		"billing_cycle": in.BillingCycle,
		"cycle_amount":  in.CycleAmount,
	})
}

func (h *ApartmentHandler) UpgradeContract(w http.ResponseWriter, r *http.Request) {
	id := parseContractActionID(r.URL.Path, "upgrade")
	if id == 0 {
		writeErr(w, http.StatusBadRequest, "invalid_input", "contract id required")
		return
	}
	var in upgradeIn
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_request", "Invalid body")
		return
	}
	if in.EffectiveDate == "" || in.EndDate == "" || in.NewRoomID == 0 {
		writeErr(w, http.StatusBadRequest, "invalid_input", "new_room_id, effective_date, end_date required")
		return
	}

	var (
		branchID, tenantID, oldRoomID int
		oldRent, oldDeposit           float64
		oldCycle                      string
	)
	if err := h.db.QueryRow(
		`SELECT branch_id, tenant_id, room_id, monthly_rent, deposit, billing_cycle
		 FROM contracts WHERE id=?`, id).
		Scan(&branchID, &tenantID, &oldRoomID, &oldRent, &oldDeposit, &oldCycle); err != nil {
		writeErr(w, http.StatusNotFound, "not_found", "contract not found")
		return
	}

	effT, err := time.Parse("2006-01-02", in.EffectiveDate)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_input", "bad effective_date")
		return
	}
	terminateOn := effT.AddDate(0, 0, -1).Format("2006-01-02")

	if in.BillingCycle == "" {
		in.BillingCycle = oldCycle
	}
	switch in.BillingCycle {
	case "monthly", "quarterly", "semi_annual", "annual":
	default:
		writeErr(w, http.StatusBadRequest, "invalid_input", "billing_cycle invalid")
		return
	}
	if in.MonthlyRent <= 0 {
		in.MonthlyRent = oldRent
	}
	if in.Deposit <= 0 {
		in.Deposit = oldDeposit
	}
	if in.CycleAmount <= 0 {
		in.CycleAmount = in.MonthlyRent * float64(monthsPerCycle(in.BillingCycle))
	}

	tx, err := h.db.Begin()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	defer tx.Rollback()

	if _, err := tx.Exec(
		`UPDATE contracts SET status='upgraded', end_date=? WHERE id=?`,
		terminateOn, id); err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}

	if _, err := tx.Exec(
		`UPDATE invoices SET status='void'
		 WHERE contract_id=? AND status='unpaid' AND period_start >= ?`,
		id, in.EffectiveDate); err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}

	if in.NewRoomID != oldRoomID {
		if _, err := tx.Exec(`UPDATE rooms SET status='vacant' WHERE id=? AND branch_id=?`, oldRoomID, branchID); err != nil {
			writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
			return
		}
		if _, err := tx.Exec(`UPDATE rooms SET status='occupied' WHERE id=? AND branch_id=?`, in.NewRoomID, branchID); err != nil {
			writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
			return
		}
	}

	res, err := tx.Exec(
		`INSERT INTO contracts (branch_id, tenant_id, room_id, booking_code, start_date, end_date,
		                       monthly_rent, deposit, billing_cycle, cycle_amount, status, parent_contract_id)
		 VALUES (?,?,?,?,?,?,?,?,?,?,'active',?)`,
		branchID, tenantID, in.NewRoomID, in.BookingCode, in.EffectiveDate, in.EndDate,
		in.MonthlyRent, in.Deposit, in.BillingCycle, in.CycleAmount, id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	newID, _ := res.LastInsertId()

	if err := generateInvoicesForContract(tx, branchID, newID, in.EffectiveDate, in.EndDate, in.CycleAmount, in.BillingCycle); err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", "invoice generation failed: "+err.Error())
		return
	}

	if err := tx.Commit(); err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"id":             newID,
		"parent":         id,
		"new_room_id":    in.NewRoomID,
		"effective_date": in.EffectiveDate,
		"end_date":       in.EndDate,
		"billing_cycle":  in.BillingCycle,
		"cycle_amount":   in.CycleAmount,
	})
}

type terminateIn struct {
	EndDate string `json:"end_date"`
	Reason  string `json:"reason"`
}

func (h *ApartmentHandler) TerminateContract(w http.ResponseWriter, r *http.Request) {
	id := parseContractActionID(r.URL.Path, "terminate")
	if id == 0 {
		writeErr(w, http.StatusBadRequest, "invalid_input", "contract id required")
		return
	}
	var in terminateIn
	_ = json.NewDecoder(r.Body).Decode(&in)
	if in.EndDate == "" {
		in.EndDate = time.Now().Format("2006-01-02")
	}

	var branchID, roomID int
	if err := h.db.QueryRow(`SELECT branch_id, room_id FROM contracts WHERE id=?`, id).
		Scan(&branchID, &roomID); err != nil {
		writeErr(w, http.StatusNotFound, "not_found", "contract not found")
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	defer tx.Rollback()

	if _, err := tx.Exec(
		`UPDATE contracts SET status='terminated', end_date=? WHERE id=?`,
		in.EndDate, id); err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	if _, err := tx.Exec(
		`UPDATE invoices SET status='void'
 WHERE contract_id=? AND status='unpaid' AND period_start > ?`,
		id, in.EndDate); err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	if _, err := tx.Exec(`UPDATE rooms SET status='vacant' WHERE id=? AND branch_id=?`, roomID, branchID); err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	if err := tx.Commit(); err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"id":       id,
		"end_date": in.EndDate,
		"status":   "terminated",
		"reason":   in.Reason,
	})
}
