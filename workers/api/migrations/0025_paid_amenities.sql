-- Paid amenities under Payments (spec `paid-amenities` §4).

CREATE TABLE IF NOT EXISTS paid_amenities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'sparkles',
  billing_model TEXT NOT NULL CHECK (billing_model IN ('monthly', 'per_use', 'one_time')),
  price REAL NOT NULL DEFAULT 0,
  unit_label TEXT NOT NULL DEFAULT 'unit',
  is_metered INTEGER NOT NULL DEFAULT 0,
  is_included INTEGER NOT NULL DEFAULT 0,
  max_slots INTEGER,
  allow_boarder_request INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_paid_amenities_property
  ON paid_amenities(property_id, is_active);

CREATE TABLE IF NOT EXISTS tenancy_amenities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paid_amenity_id INTEGER NOT NULL,
  application_id INTEGER NOT NULL,
  property_id INTEGER NOT NULL,
  boarder_id INTEGER NOT NULL,
  room_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_approval', 'active', 'rejected', 'cancelled', 'completed')),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_snapshot REAL NOT NULL,
  billing_model_snapshot TEXT NOT NULL CHECK (billing_model_snapshot IN ('monthly', 'per_use', 'one_time')),
  anchor_day INTEGER,
  next_bill_date TEXT,
  last_billed_date TEXT,
  notes TEXT,
  rejection_reason TEXT,
  requested_by INTEGER,
  approved_by INTEGER,
  approved_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paid_amenity_id) REFERENCES paid_amenities(id) ON DELETE CASCADE,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (boarder_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tenancy_amenities_app_status
  ON tenancy_amenities(application_id, status);
CREATE INDEX IF NOT EXISTS idx_tenancy_amenities_due
  ON tenancy_amenities(status, billing_model_snapshot, next_bill_date);
CREATE INDEX IF NOT EXISTS idx_tenancy_amenities_catalog
  ON tenancy_amenities(paid_amenity_id, status);

CREATE TABLE IF NOT EXISTS amenity_usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paid_amenity_id INTEGER NOT NULL,
  application_id INTEGER NOT NULL,
  property_id INTEGER NOT NULL,
  boarder_id INTEGER NOT NULL,
  payment_id INTEGER,
  status TEXT NOT NULL CHECK (status IN ('pending_approval', 'posted', 'rejected')),
  quantity REAL NOT NULL,
  unit_price_snapshot REAL NOT NULL,
  previous_reading REAL,
  current_reading REAL,
  total_amount REAL NOT NULL,
  usage_date TEXT NOT NULL,
  notes TEXT,
  rejection_reason TEXT,
  logged_by INTEGER NOT NULL,
  reviewed_by INTEGER,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paid_amenity_id) REFERENCES paid_amenities(id) ON DELETE CASCADE,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (boarder_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_amenity_usage_property_status
  ON amenity_usage_logs(property_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_amenity_usage_app
  ON amenity_usage_logs(application_id, created_at);

ALTER TABLE payments ADD COLUMN paid_amenity_id INTEGER;
ALTER TABLE payments ADD COLUMN tenancy_amenity_id INTEGER;
ALTER TABLE payments ADD COLUMN amenity_usage_log_id INTEGER;
