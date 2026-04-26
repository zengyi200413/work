CREATE DATABASE IF NOT EXISTS docpilot_ai DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE docpilot_ai;

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  role ENUM('admin', 'reviewer') NOT NULL DEFAULT 'reviewer',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(180) NOT NULL,
  source_name VARCHAR(180) NOT NULL,
  file_path VARCHAR(255) DEFAULT NULL,
  raw_text LONGTEXT,
  status ENUM('uploaded', 'processing', 'generated', 'reviewed') NOT NULL DEFAULT 'uploaded',
  created_by INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_documents_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_outputs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  document_id INT NOT NULL,
  summary LONGTEXT,
  action_items LONGTEXT,
  prd_draft LONGTEXT,
  test_points LONGTEXT,
  risk_notes LONGTEXT,
  generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by INT DEFAULT NULL,
  review_status ENUM('pending', 'approved', 'needs_revision') NOT NULL DEFAULT 'pending',
  review_notes LONGTEXT,
  UNIQUE KEY uk_outputs_document (document_id),
  CONSTRAINT fk_outputs_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  CONSTRAINT fk_outputs_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS export_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  document_id INT NOT NULL,
  export_type ENUM('summary', 'prd', 'tasks', 'full_report') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_exports_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);
