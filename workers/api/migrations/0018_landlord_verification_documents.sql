-- Landlord verification documents.
--
-- Landlords upload four fixed slots (government ID, proof of property ownership,
-- business permit, selfie holding the ID). Files live in UploadThing; D1 stores the
-- returned CDN URL plus enough metadata for the admin review modal to describe them.
--
-- One live row per slot per landlord: re-uploading soft-deletes the previous row and
-- inserts a fresh one, so the admin always reviews the latest submission.
CREATE TABLE IF NOT EXISTS landlord_verification_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_key TEXT,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_landlord_verification_documents_slot
  ON landlord_verification_documents(user_id, document_type)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_landlord_verification_documents_user
  ON landlord_verification_documents(user_id, deleted_at);

-- `landlord_profiles.verification_status` already exists (0016, default 'pending').
-- Extend it to pending | submitted | approved | rejected and record who reviewed the
-- submission, when, and why it was rejected or what documents were asked for.
ALTER TABLE landlord_profiles ADD COLUMN verification_reviewed_at TEXT;
ALTER TABLE landlord_profiles ADD COLUMN verification_reviewed_by INTEGER;
ALTER TABLE landlord_profiles ADD COLUMN verification_note TEXT;
