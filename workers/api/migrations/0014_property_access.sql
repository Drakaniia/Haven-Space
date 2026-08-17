CREATE TABLE IF NOT EXISTS property_invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  invitee_id INTEGER NOT NULL,
  invited_by INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'revoked')),
  accepted_at TEXT,
  rejected_at TEXT,
  revoked_at TEXT,
  revoked_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (invitee_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE SET NULL
);

-- One pending invitation per (property, invitee)
CREATE UNIQUE INDEX IF NOT EXISTS ux_property_invitations_pending
  ON property_invitations(property_id, invitee_id)
  WHERE status = 'pending' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_property_invitations_invitee
  ON property_invitations(invitee_id, status, deleted_at);

CREATE INDEX IF NOT EXISTS idx_property_invitations_property
  ON property_invitations(property_id, status, deleted_at);

CREATE TABLE IF NOT EXISTS property_access (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  landlord_id INTEGER NOT NULL,
  granted_by INTEGER NOT NULL,
  invitation_id INTEGER,
  granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_at TEXT,
  removed_by INTEGER,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (removed_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (invitation_id) REFERENCES property_invitations(id) ON DELETE SET NULL
);

-- One active access row per (property, landlord)
CREATE UNIQUE INDEX IF NOT EXISTS ux_property_access_active
  ON property_access(property_id, landlord_id)
  WHERE removed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_property_access_landlord
  ON property_access(landlord_id, removed_at);

CREATE INDEX IF NOT EXISTS idx_property_access_property
  ON property_access(property_id, removed_at);
