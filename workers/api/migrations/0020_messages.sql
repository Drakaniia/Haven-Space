-- In-app messaging between a landlord and a boarder (spec `messages-feature-review` §4.1/R1-R13).
--
-- One thread per (landlord_id, boarder_id) pair, enforced by the unique index: opening the same
-- pair twice returns the existing thread rather than creating a second one (R1, D3). The thread
-- remembers the listing that started it as display-only origin context (D6/D21), while each
-- message carries its own `property_id` chip.
--
-- `read_at` is the only unread signal: a message is unread for whoever is not its sender (R8).
-- Per-side soft delete (`landlord_deleted_at` / `boarder_deleted_at`) hides a conversation from
-- one participant only; the next inbound message nulls that column again (R11, D11).
CREATE TABLE IF NOT EXISTS message_threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  landlord_id INTEGER NOT NULL,
  boarder_id INTEGER NOT NULL,
  property_id INTEGER,
  created_by INTEGER NOT NULL,
  last_message_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  landlord_deleted_at TEXT,
  boarder_deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (boarder_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_threads_pair
  ON message_threads(landlord_id, boarder_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_landlord
  ON message_threads(landlord_id, last_message_at);
-- Also the index the boarder's 5-new-threads-per-day cap counts against (D13).
CREATE INDEX IF NOT EXISTS idx_message_threads_boarder
  ON message_threads(boarder_id, last_message_at);
CREATE INDEX IF NOT EXISTS idx_message_threads_boarder_created
  ON message_threads(boarder_id, created_at);

-- Named `thread_messages`, not `messages`: migration 0011 already created a `messages` table for
-- the (write-only) leave-request notice, and this pair-thread model has its own shape.
-- Bodies are capped at 2,000 characters in the route *and* here (D13/R4), so a bug in one layer
-- cannot write an unbounded row. An empty body is legal when attachments exist (R3).
CREATE TABLE IF NOT EXISTS thread_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  body TEXT NOT NULL DEFAULT '' CHECK (length(body) <= 2000),
  property_id INTEGER,
  read_at TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (thread_id) REFERENCES message_threads(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_thread_messages_thread
  ON thread_messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_thread_messages_unread
  ON thread_messages(thread_id, read_at);

-- Images only, up to 4 per message (D7/D28). `file_key` is the UploadThing key so a message can
-- be cleaned up later without re-parsing the URL; `display_order` keeps the grid stable.
CREATE TABLE IF NOT EXISTS message_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  file_key TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES thread_messages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message
  ON message_attachments(message_id, display_order);

-- Blocking is messaging-only, both directions and reversible (D18): while a row with
-- `removed_at IS NULL` exists, neither side can send. The unique index keeps unblock → block
-- cycles from stacking duplicate active rows.
CREATE TABLE IF NOT EXISTS message_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL,
  blocked_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_at TEXT,
  FOREIGN KEY (thread_id) REFERENCES message_threads(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_blocks_active
  ON message_blocks(thread_id, blocked_by, removed_at);

-- Metadata-only reports (D9/D26): admins never read bodies or images; triage happens through the
-- existing admin audit-log surface. One open report per reporter per thread (R7).
CREATE TABLE IF NOT EXISTS message_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL,
  reported_by INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (
    reason IN ('spam', 'harassment', 'off_platform_payment', 'other')
  ),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT,
  reviewed_by INTEGER,
  FOREIGN KEY (thread_id) REFERENCES message_threads(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_message_reports_thread
  ON message_reports(thread_id, status);

-- One open report per reporter per thread: reporting twice while a report is pending is a no-op.
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_reports_open
  ON message_reports(thread_id, reported_by)
  WHERE status = 'open';
