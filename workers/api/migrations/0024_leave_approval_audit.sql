-- Leave approvals record who decided and when (spec `approve-leave-request` §4.8).
-- `approved_by_name` is a snapshot: the record must still read correctly after a
-- landlord renames or deletes their account.
ALTER TABLE applications ADD COLUMN approved_at TEXT;
ALTER TABLE applications ADD COLUMN approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE applications ADD COLUMN approved_by_name TEXT;
