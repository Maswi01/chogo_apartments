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
		`SELECT id, branch_id, full_name, COALESCE(phone,''), COALESCE(email,''), COALESCE(id_number,''), created_at
		 FROM tenants WHERE branch_id = ? ORDER BY full_name ASC`, branchID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	defer rows.Close()
	out := make([]models.Tenant, 0)
	for rows.Next() {
		var t models.Tenant
		if err := rows.Scan(&t.ID, &t.BranchID, &t.FullName, &t.Phone, &t.Email, &t.IDNumber, &t.CreatedAt); err != nil {
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
	// tenants table requires unit_id NOT NULL in old schema; insert a placeholder of 0 isn't ideal.
	// Allow null by relaxing: use a default unit_id of NULL via raw INSERT only of allowed columns when schema was relaxed.
	// To stay compatible with current schema where unit_id is NOT NULL, store it as 0 only if the column allows; otherwise prefer creating tenant only when contract is created.
	// We attempt insert without unit_id; if it fails we fall back to inserting with unit_id = NULL via schema alteration that the user can run.
	res, err := h.db.Exec(
		`INSERT INTO tenants (branch_id, full_name, phone, email, id_number, unit_id, status)
		 VALUES (?,?,?,?,?, NULL, 'active')`,
		in.BranchID, in.FullName, in.Phone, in.Email, in.IDNumber,
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
	BranchID    int     `json:"branch_id"`
	TenantID    int     `json:"tenant_id"`
	RoomID      int     `json:"room_id"`
	BookingCode string  `json:"booking_code"`
	StartDate   string  `json:"start_date"`
	EndDate     string  `json:"end_date"`
	MonthlyRent float64 `json:"monthly_rent"`
	Deposit     float64 `json:"deposit"`
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

	tx, err := h.db.Begin()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	defer tx.Rollback()

	res, err := tx.Exec(
		`INSERT INTO contracts (branch_id, tenant_id, room_id, booking_code, start_date, end_date, monthly_rent, deposit, status)
		 VALUES (?,?,?,?,?,?,?,?,'active')`,
		in.BranchID, in.TenantID, in.RoomID, in.BookingCode, in.StartDate, in.EndDate, in.MonthlyRent, in.Deposit)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	cid, _ := res.LastInsertId()

	if _, err := tx.Exec(`UPDATE rooms SET status='occupied' WHERE id=? AND branch_id=?`, in.RoomID, in.BranchID); err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}

	if err := tx.Commit(); err != nil {
		writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"id": cid})
}

func (h *ApartmentHandler) ListContracts(w http.ResponseWriter, r *http.Request) {
	branchID := branchIDParam(r)
	if branchID == 0 {
		writeErr(w, http.StatusBadRequest, "invalid_input", "branch_id required")
		return
	}
	statusFilter := r.URL.Query().Get("status")
	q := `SELECT c.id, c.branch_id, c.tenant_id, c.room_id, COALESCE(c.booking_code,''),
	             c.start_date, c.end_date, c.monthly_rent, c.deposit, c.status,
	             t.full_name, COALESCE(t.phone,''), r.code,
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
		if err := rows.Scan(&c.ID, &c.BranchID, &c.TenantID, &c.RoomID, &c.BookingCode,
			&sd, &ed, &c.MonthlyRent, &c.Deposit, &c.Status,
			&c.TenantName, &c.TenantPhone, &c.RoomCode,
			&c.InvoiceTotal, &c.PaidTotal, &c.CreatedAt); err != nil {
			writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
			return
		}
		c.StartDate = nullDate(sd)
		c.EndDate = nullDate(ed)
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
		`INSERT INTO payments (branch_id, tenant_id, unit_id, invoice_id, contract_id, amount, payment_date, receipt_number, payment_method, notes)
		 VALUES (?,?,?,?,?,?,?,?,?,?)`,
		in.BranchID, tenantID, roomID, in.InvoiceID, contractID, in.Amount, in.PaymentDate,
		in.ReceiptNumber, in.PaymentMethod, in.Notes,
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
	             t.full_name, COALESCE(r.code,''), p.created_at
	      FROM payments p
	      JOIN tenants t ON t.id = p.tenant_id
	      LEFT JOIN rooms r ON r.id = p.unit_id
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
		var pd sql.NullString
		if err := rows.Scan(&p.ID, &p.BranchID, &p.TenantID, &p.ContractID, &p.InvoiceID,
			&p.Amount, &pd, &p.ReceiptNumber, &p.PaymentMethod, &p.Notes,
			&p.TenantName, &p.RoomCode, &p.CreatedAt); err != nil {
			writeErr(w, http.StatusInternalServerError, "db_error", err.Error())
			return
		}
		p.PaymentDate = nullDate(pd)
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
