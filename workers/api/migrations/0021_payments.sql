-- Payments: rent ledger with manual (boarder-submits / landlord-verifies) settlement.
-- Spec `payments-feature` §4.1.

-- 1. Link a charge to the tenancy (application) that generated it. Existing rows
--    keep NULL — their schedules are not backfilled (spec D13).
ALTER TABLE payments ADD COLUMN application_id INTEGER;
ALTER TABLE payments ADD COLUMN charge_type TEXT NOT NULL DEFAULT 'rent';
ALTER TABLE payments ADD COLUMN description TEXT;
ALTER TABLE payments ADD COLUMN period_start TEXT;
ALTER TABLE payments ADD COLUMN period_end TEXT;
-- Idempotency key for the billing job / schedule generator, e.g.
-- 'rent:12:2026-11-20', 'deposit:12', 'late_fee:88'.
ALTER TABLE payments ADD COLUMN generation_key TEXT;
-- Second reminder slot: `reminder_sent_at` covers the overdue nudge, this one
-- covers the "due in 3 days" nudge (spec D18).
ALTER TABLE payments ADD COLUMN due_soon_reminded_at TEXT;
ALTER TABLE payments ADD COLUMN created_by INTEGER;
-- Deposit resolution at move-out (refund | forfeit | partial) — spec D11.
ALTER TABLE payments ADD COLUMN deposit_resolution TEXT;
ALTER TABLE payments ADD COLUMN deposit_resolution_amount REAL;
ALTER TABLE payments ADD COLUMN deposit_resolution_reason TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_generation_key
  ON payments(generation_key) WHERE generation_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_application
  ON payments(application_id, status);

-- 2. The advance amount cannot be derived from `properties.advance` (free text
--    like '2 months'), so it is captured explicitly per tenancy (spec F2/D3).
ALTER TABLE applications ADD COLUMN advance_amount REAL NOT NULL DEFAULT 0;

-- 3. Per-property billing policy: flat late fee + grace period (D17/D19/D20),
--    and utility rates so `formatTenancy()`'s hard-coded zeros become real.
ALTER TABLE properties ADD COLUMN late_fee_amount REAL NOT NULL DEFAULT 500;
ALTER TABLE properties ADD COLUMN late_fee_grace_days INTEGER NOT NULL DEFAULT 3;
ALTER TABLE properties ADD COLUMN electricity_cost REAL NOT NULL DEFAULT 0;
ALTER TABLE properties ADD COLUMN water_cost REAL NOT NULL DEFAULT 0;
ALTER TABLE properties ADD COLUMN internet_cost REAL NOT NULL DEFAULT 0;

-- 4. Immutable submission audit trail: one row per boarder submission (or
--    landlord recording), with the verification decision recorded on it.
CREATE TABLE IF NOT EXISTS payment_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id INTEGER NOT NULL,
  submitted_by INTEGER NOT NULL,
  amount REAL NOT NULL,
  payment_method TEXT NOT NULL,
  reference_number TEXT NOT NULL,
  proof_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  verified_by INTEGER,
  verified_at TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_submissions_payment
  ON payment_submissions(payment_id, created_at);

CREATE INDEX IF NOT EXISTS idx_payment_submissions_status
  ON payment_submissions(status, created_at);
