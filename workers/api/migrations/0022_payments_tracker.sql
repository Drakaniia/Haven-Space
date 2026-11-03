-- Monthly boarder payment tracker (spec `payments-tracker-redesign` §4.1).
--
-- Purely additive: no column is dropped and no row is rewritten, so this is safe
-- on a populated database. The tracker reads `applications.next_due_date` as the
-- single source of truth for when the next rent is due (D3); the property row
-- carries the late-fee policy (R7/R8); and the method label records a custom
-- method name for `payment_method = 'other'` (D12).

-- 1. Per-tenancy billing anchor.
ALTER TABLE applications ADD COLUMN next_due_date TEXT;

CREATE INDEX IF NOT EXISTS idx_applications_next_due ON applications(next_due_date);

-- 2. Late-fee policy. `late_fee_grace_days` (0012) is re-purposed as the single
--    grace period: it governs both the `in_grace` tracker state and the moment a
--    late fee applies, and it exists whether or not fees are enabled (D31).
ALTER TABLE properties ADD COLUMN late_fee_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE properties ADD COLUMN late_fee_type TEXT NOT NULL DEFAULT 'fixed';
ALTER TABLE properties ADD COLUMN late_fee_percent REAL NOT NULL DEFAULT 0;

-- 3. Custom payment method label, on the money row and on its audit row.
ALTER TABLE payments ADD COLUMN payment_method_label TEXT;
ALTER TABLE payment_submissions ADD COLUMN payment_method_label TEXT;

-- 4. One landlord notification per overdue charge (D17). `payments.reminder_sent_at`
--    stays and is re-purposed as the *manual* reminder marker (D14);
--    `due_soon_reminded_at` is no longer written.
ALTER TABLE payments ADD COLUMN overdue_notified_at TEXT;
