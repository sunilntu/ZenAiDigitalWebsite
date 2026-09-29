PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS verified_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  company TEXT,
  role TEXT,
  country TEXT,
  marketing_consent INTEGER NOT NULL DEFAULT 0 CHECK (marketing_consent IN (0, 1)),
  first_verified_at TEXT NOT NULL,
  last_verified_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS verified_enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id INTEGER NOT NULL,
  verification_id TEXT NOT NULL UNIQUE,
  interest TEXT NOT NULL,
  message TEXT NOT NULL,
  source_page TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  consent_at TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_id) REFERENCES verified_contacts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_verified_enquiries_contact_id
  ON verified_enquiries(contact_id);

CREATE INDEX IF NOT EXISTS idx_verified_enquiries_verified_at
  ON verified_enquiries(verified_at);
