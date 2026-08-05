-- Teask content API — database schema
--
-- Run this ONCE against the NEW database you created in cPanel
-- (MySQL® Databases → Create New Database). Do not run it against the
-- database the current live site uses.
--
-- To run it: phpMyAdmin → pick the new database on the left → SQL tab →
-- paste this file → Go.

-- ── articles and news ──────────────────────────────────────────────
-- One row per published item. `kind` is the only thing separating an
-- evergreen article from a dated news entry, which is how the front end
-- already models it, so both live in one table with one editor.
CREATE TABLE IF NOT EXISTS posts (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kind          ENUM('article','news') NOT NULL DEFAULT 'article',
  -- the URL segment: /resources/<slug>. Unique, because it is the address.
  slug          VARCHAR(191) NOT NULL,
  title         VARCHAR(255) NOT NULL,
  description   TEXT NOT NULL,
  category      VARCHAR(100) NOT NULL,
  published_at  DATE NOT NULL,
  read_minutes  SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  -- a path or URL ('/images/...' or 'https://...'), never base64 image data
  cover         VARCHAR(500) NOT NULL DEFAULT '',
  cover_alt     VARCHAR(500) NOT NULL DEFAULT '',
  -- JSON array of strings
  keywords      LONGTEXT NOT NULL,
  -- JSON array of { heading?: string, paragraphs: string[] }
  sections      LONGTEXT NOT NULL,
  status        ENUM('draft','published') NOT NULL DEFAULT 'published',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_posts_slug (slug),
  -- the listing query is always "this kind, published, newest first"
  KEY ix_posts_listing (kind, status, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── who may publish ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(191) NOT NULL,
  -- PHP password_hash(), never the password itself
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(120) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── failed sign-ins ────────────────────────────────────────────────
-- A password is only as good as the number of guesses allowed against it.
-- Every failure is recorded here and the login route refuses an address that
-- has failed too often too recently. Rows older than an hour are swept.
CREATE TABLE IF NOT EXISTS login_attempts (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ip           VARCHAR(45) NOT NULL,
  -- kept for reading the log later, not for rate limiting: locking by email
  -- would let anyone lock the client out by guessing at their address
  email        VARCHAR(191) NOT NULL,
  attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_attempts_ip (ip, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── login sessions ─────────────────────────────────────────────────
-- The browser holds a random token; we store only its SHA-256, so a dump of
-- this table cannot be replayed as a login. Expired rows are swept on login.
CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash CHAR(64) NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (token_hash),
  KEY ix_sessions_user (user_id),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id)
    REFERENCES admin_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
