CREATE DATABASE IF NOT EXISTS careerpilot_ai DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE careerpilot_ai;

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  role ENUM('admin', 'reviewer') NOT NULL DEFAULT 'reviewer',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(180) NOT NULL,
  company VARCHAR(180) NOT NULL,
  city VARCHAR(80) NOT NULL,
  summary TEXT,
  core_requirements LONGTEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS candidates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  target_role VARCHAR(180) NOT NULL,
  resume_name VARCHAR(180) NOT NULL,
  resume_file_path VARCHAR(255) DEFAULT NULL,
  resume_file_size INT DEFAULT NULL,
  resume_text LONGTEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analysis_outputs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  job_id INT NOT NULL,
  candidate_id INT NOT NULL,
  match_score INT NOT NULL DEFAULT 0,
  match_summary LONGTEXT,
  strengths LONGTEXT,
  gaps LONGTEXT,
  rewritten_project LONGTEXT,
  interview_questions LONGTEXT,
  review_status ENUM('pending', 'approved', 'needs_revision') NOT NULL DEFAULT 'pending',
  review_notes LONGTEXT,
  reviewed_by INT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_analysis_pair (job_id, candidate_id),
  CONSTRAINT fk_analysis_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_analysis_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  CONSTRAINT fk_analysis_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS export_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  analysis_id INT NOT NULL,
  export_type ENUM('match_report', 'project_pitch', 'interview_pack') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_export_analysis FOREIGN KEY (analysis_id) REFERENCES analysis_outputs(id) ON DELETE CASCADE
);
