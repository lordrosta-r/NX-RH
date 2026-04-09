-- =============================================================================
-- NanoXplore RH — Database Initialization
-- Engine: MySQL 8+
-- Run once: mysql -u <user> -p <dbname> < database/init.sql
-- =============================================================================

CREATE DATABASE IF NOT EXISTS nanoxplore_rh
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE nanoxplore_rh;

-- -----------------------------------------------------------------------------
-- TABLE: users
-- Stores all system users. Supports a self-referencing manager hierarchy.
-- Roles: admin (HR), manager, employee
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id           INT            AUTO_INCREMENT PRIMARY KEY,
  email        VARCHAR(255)   NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  first_name   VARCHAR(100)   NOT NULL,
  last_name    VARCHAR(100)   NOT NULL,
  role         ENUM('admin', 'manager', 'employee') NOT NULL DEFAULT 'employee',
  manager_id   INT            NULL,                  -- references users(id)
  department   VARCHAR(100)   DEFAULT NULL,
  job_title    VARCHAR(150)   DEFAULT NULL,
  is_active    BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_users_manager
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- TABLE: campaigns
-- A campaign = one performance review cycle (e.g. "H1 2026 Appraisal").
-- Managed by admins; employees/managers participate within a campaign window.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaigns (
  id          INT          AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  description TEXT         DEFAULT NULL,
  status      ENUM('draft', 'active', 'closed', 'archived') NOT NULL DEFAULT 'draft',
  start_date  DATE         NOT NULL,
  end_date    DATE         NOT NULL,
  created_by  INT          NOT NULL,               -- admin who created it
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_campaigns_creator
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- -----------------------------------------------------------------------------
-- TABLE: forms
-- An evaluation template attached to a campaign.
-- `structure` is a JSON array of question blocks, e.g.:
--   [{ "id": "q1", "type": "rating", "label": "Technical skills", "max": 5 }, ...]
-- form_type drives which participant fills the form (self / manager / peer).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forms (
  id          INT          AUTO_INCREMENT PRIMARY KEY,
  campaign_id INT          NOT NULL,
  title       VARCHAR(255) NOT NULL,
  description TEXT         DEFAULT NULL,
  form_type   ENUM('self_evaluation', 'manager_evaluation', '360_feedback') NOT NULL,
  structure   JSON         NOT NULL,               -- question definitions
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_by  INT          NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_forms_campaign
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_forms_creator
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- -----------------------------------------------------------------------------
-- TABLE: evaluations
-- One row = one participant completing one form within one campaign.
-- `answers` is a JSON object: { "q1": 4, "q2": "Great communicator", ... }
-- Status flow: pending → in_progress → submitted → reviewed → validated
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evaluations (
  id               INT            AUTO_INCREMENT PRIMARY KEY,
  campaign_id      INT            NOT NULL,
  form_id          INT            NOT NULL,
  evaluator_id     INT            NOT NULL,        -- who writes the evaluation
  evaluatee_id     INT            NOT NULL,        -- who is being evaluated
  status           ENUM('pending', 'in_progress', 'submitted', 'reviewed', 'validated')
                                  NOT NULL DEFAULT 'pending',
  answers          JSON           DEFAULT NULL,    -- question_id → answer map
  score            DECIMAL(5, 2)  DEFAULT NULL,    -- computed overall score (0–100)
  manager_comment  TEXT           DEFAULT NULL,    -- reviewer's qualitative note
  submitted_at     TIMESTAMP      NULL DEFAULT NULL,
  reviewed_at      TIMESTAMP      NULL DEFAULT NULL,
  created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Prevent duplicate evaluation assignments
  UNIQUE KEY uq_evaluation (campaign_id, form_id, evaluator_id, evaluatee_id),

  CONSTRAINT fk_eval_campaign
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_eval_form
    FOREIGN KEY (form_id)     REFERENCES forms(id),
  CONSTRAINT fk_eval_evaluator
    FOREIGN KEY (evaluator_id) REFERENCES users(id),
  CONSTRAINT fk_eval_evaluatee
    FOREIGN KEY (evaluatee_id) REFERENCES users(id)
);

-- -----------------------------------------------------------------------------
-- SEED: Default admin user  (password: changeme — bcrypt hash placeholder)
-- Replace the hash before going to production.
-- -----------------------------------------------------------------------------
INSERT INTO users (email, password_hash, first_name, last_name, role)
VALUES ('admin@nanoxplore.com', '$2b$12$REPLACE_WITH_REAL_BCRYPT_HASH', 'Admin', 'NanoXplore', 'admin');
