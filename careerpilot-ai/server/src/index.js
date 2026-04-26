import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import multer from "multer";
import mysql from "mysql2/promise";
import pdf from "pdf-parse/lib/pdf-parse.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors());
app.use(express.json({ limit: "4mb" }));
app.use("/uploads", express.static(uploadsDir));

const upload = multer({ dest: uploadsDir });
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10
});

const reviewStatusLabelMap = {
  pending: "待审核",
  approved: "已通过",
  needs_revision: "需修改"
};

const exportTypeLabelMap = {
  match_report: "匹配报告",
  project_pitch: "项目亮点稿",
  interview_pack: "面试题包"
};

function asyncHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

function formatCandidate(candidate) {
  return {
    ...candidate,
    resume_file_label: candidate.resume_file_path
      ? `${candidate.resume_name}${candidate.resume_file_size ? ` · ${(candidate.resume_file_size / 1024).toFixed(1)} KB` : ""}`
      : ""
  };
}

async function extractResumeText(file) {
  if (!file) return "";

  const ext = path.extname(file.originalname || "").toLowerCase();
  if (ext === ".txt") {
    return fs.readFileSync(file.path, "utf8");
  }

  if (ext === ".pdf") {
    const buffer = fs.readFileSync(file.path);
    const parsed = await pdf(buffer);
    return (parsed.text || "").trim();
  }

  return "";
}

function buildAnalysis(job, candidate) {
  const requirements = job.core_requirements || "";
  const resume = candidate.resume_text || "";
  const keywordScore = [
    "ai", "llm", "prompt", "vue", "react", "node", "mysql", "协同", "产品"
  ].reduce((score, word) => {
    const hit = requirements.toLowerCase().includes(word) && resume.toLowerCase().includes(word);
    return score + (hit ? 8 : 0);
  }, 36);
  const matchScore = Math.min(96, keywordScore);

  return {
    matchScore,
    matchSummary: `从岗位要求来看，${candidate.name} 在 ${candidate.target_role} 方向已经具备较好的开发基础，简历里同时覆盖了实践经历、项目经历和工具链使用。当前最值得强化的是把已有项目重新包装成“AI 协同应用 + 产品化交付”的表达方式，让经历和目标岗位更贴近。`,
    strengths: `1. 计算机科班背景完整，课程覆盖数据结构、数据库、网络和算法，基础扎实\n2. 有真实项目与实践经历，能够体现执行力、沟通能力和快速学习能力\n3. 简历中已有博客系统、平台类项目和应用开发经历，具备继续包装成 AI 应用作品的基础\n4. 熟悉 HTML、CSS、JavaScript、Java、Python、MySQL 以及 GitHub、Navicat、Cursor、Codex 等工具，和岗位要求有较强关联`,
    gaps: `1. 当前简历中的 AI 相关经历还不够直接，可以继续补 1 到 2 个 AI 应用项目来提高岗位匹配度\n2. 项目描述偏“做了什么”，可以进一步改成“解决了什么问题、为什么这样设计、带来了什么结果”\n3. 技术表达还可以更聚焦，例如突出工作流设计、Prompt 协同、结果审核机制和产品判断`,
    rewrittenProject: `建议把你的项目经历改写为：\n“独立设计并实现 CareerPilot AI 求职材料协同平台，围绕岗位 JD 解析、简历匹配分析、项目亮点重写与模拟面试题生成构建完整工作流，采用 Vue 3 + Node.js + MySQL 搭建前后端系统，并加入人工审核与导出机制，提升投递材料的针对性和可控性。”\n\n也可以补一条：\n“基于既有博客管理系统经验，进一步扩展前台交互、角色权限、内容管理与 AI 场景化能力，形成可用于作品展示的完整全栈项目。”`,
    interviewQuestions: `1. 你为什么从传统项目继续往 AI 协同应用方向升级？\n2. 你在博客系统和 CareerPilot AI 里，分别是如何做前后端拆分和数据库设计的？\n3. 如果 AI 输出和岗位真实需求不一致，你会怎么做人工审核和修正？\n4. 你如何把实习、助教和全栈项目经验串成一个统一的能力故事？`
  };
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(50) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      nickname VARCHAR(50) NOT NULL,
      role ENUM('admin', 'reviewer') NOT NULL DEFAULT 'reviewer',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(180) NOT NULL,
      company VARCHAR(180) NOT NULL,
      city VARCHAR(80) NOT NULL,
      summary TEXT,
      core_requirements LONGTEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
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
    )
  `);

  const [candidateColumns] = await pool.query("SHOW COLUMNS FROM candidates LIKE 'resume_file_path'");
  if (!candidateColumns.length) {
    await pool.query("ALTER TABLE candidates ADD COLUMN resume_file_path VARCHAR(255) DEFAULT NULL");
  }
  const [candidateSizeColumns] = await pool.query("SHOW COLUMNS FROM candidates LIKE 'resume_file_size'");
  if (!candidateSizeColumns.length) {
    await pool.query("ALTER TABLE candidates ADD COLUMN resume_file_size INT DEFAULT NULL");
  }

  await pool.query(`
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
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS export_logs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      analysis_id INT NOT NULL,
      export_type ENUM('match_report', 'project_pitch', 'interview_pack') NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_export_analysis FOREIGN KEY (analysis_id) REFERENCES analysis_outputs(id) ON DELETE CASCADE
    )
  `);
}

async function ensureSeedData() {
  const [[userCount]] = await pool.query("SELECT COUNT(*) AS count FROM users");
  if (!userCount.count) {
    await pool.query("INSERT INTO users (username, password_hash, nickname, role) VALUES ('reviewer', 'demo_hash', 'Lena', 'admin')");
  }

  const [[jobCount]] = await pool.query("SELECT COUNT(*) AS count FROM jobs");
  if (!jobCount.count) {
    await pool.query(`
      INSERT INTO jobs (title, company, city, summary, core_requirements) VALUES
      ('AI 超级应用开发工程师实习生', '成都主目机器人', '成都', '面向 AI 协同应用与业务流程数字化的实习岗位。', 'AI Native、LLM、Prompt Engineering、低代码、前端工程化、系统逻辑、质量把控'),
      ('AI 产品工程实习生', '未来协同科技', '深圳', '偏向 AI 应用交付与产品化协作。', 'Vue、Node.js、Prompt、产品思维、工作流、交付质量')
    `);
  }

  const [[candidateCount]] = await pool.query("SELECT COUNT(*) AS count FROM candidates");
  if (!candidateCount.count) {
    await pool.query(`
      INSERT INTO candidates (name, target_role, resume_name, resume_text)
      VALUES (
        '曾益',
        'AI 应用开发 / 前端全栈',
        '曾益.pdf',
        '四川师范大学计算机科学与技术本科，2026 届应届生。具备 Android 开发实习、Python/C++ 课程助教经历，完成博客管理系统、校园跑腿平台和安卓 APP 开发项目，熟悉 HTML、CSS、JavaScript、Java、Python、MySQL、Linux 命令，熟练使用 VS Code、Cursor、Codex、Navicat Premium、GitHub。'
      )
    `);
  }

  const [[analysisCount]] = await pool.query("SELECT COUNT(*) AS count FROM analysis_outputs");
  if (!analysisCount.count) {
    const [[job]] = await pool.query("SELECT * FROM jobs ORDER BY id LIMIT 1");
    const [[candidate]] = await pool.query("SELECT * FROM candidates ORDER BY id LIMIT 1");
    const analysis = buildAnalysis(job, candidate);
    const [result] = await pool.query(`
      INSERT INTO analysis_outputs (
        job_id, candidate_id, match_score, match_summary, strengths, gaps, rewritten_project, interview_questions, review_status, review_notes, reviewed_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', '建议再补一条与 AI 输出质量控制相关的经历。', NULL)
    `, [
      job.id,
      candidate.id,
      analysis.matchScore,
      analysis.matchSummary,
      analysis.strengths,
      analysis.gaps,
      analysis.rewrittenProject,
      analysis.interviewQuestions
    ]);

    await pool.query(`
      INSERT INTO export_logs (analysis_id, export_type)
      VALUES (?, 'match_report')
    `, [result.insertId]);
  }
}

app.get("/", (_req, res) => {
  res.json({ name: "CareerPilot AI API", status: "ok", time: new Date().toISOString() });
});

app.get("/api/overview", asyncHandler(async (_req, res) => {
  const [[jobs]] = await pool.query("SELECT COUNT(*) AS count FROM jobs");
  const [[candidates]] = await pool.query("SELECT COUNT(*) AS count FROM candidates");
  const [[analyses]] = await pool.query("SELECT COUNT(*) AS count FROM analysis_outputs");
  const [[approved]] = await pool.query("SELECT COUNT(*) AS count FROM analysis_outputs WHERE review_status = 'approved'");
  const [recentJobs] = await pool.query("SELECT id, title, company, city FROM jobs ORDER BY updated_at DESC LIMIT 3");

  res.json({
    jobs: jobs.count,
    candidates: candidates.count,
    analyses: analyses.count,
    approved: approved.count,
    recentJobs
  });
}));

app.get("/api/jobs", asyncHandler(async (_req, res) => {
  const [rows] = await pool.query("SELECT id, title, company, city, summary FROM jobs ORDER BY updated_at DESC");
  res.json(rows);
}));

app.get("/api/candidates", asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT id, name, target_role, resume_name, resume_file_path, resume_file_size
    FROM candidates
    ORDER BY updated_at DESC
  `);
  res.json(rows.map(formatCandidate));
}));

app.post("/api/materials", upload.single("resumeFile"), asyncHandler(async (req, res) => {
  const { title, company, city, summary, requirements, candidateName, targetRole, resumeName, resumeText } = req.body;
  if (!title || !company || !city || !candidateName || !targetRole || !resumeName) {
    return res.status(400).json({ message: "岗位和候选人基础信息需要填写完整" });
  }

  await pool.query(`
    INSERT INTO jobs (title, company, city, summary, core_requirements)
    VALUES (?, ?, ?, ?, ?)
  `, [title, company, city, summary, requirements]);

  const parsedResumeText = await extractResumeText(req.file);
  await pool.query(`
    INSERT INTO candidates (name, target_role, resume_name, resume_file_path, resume_file_size, resume_text)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    candidateName,
    targetRole,
    resumeName,
    req.file ? `/uploads/${req.file.filename}` : null,
    req.file ? req.file.size : null,
    resumeText || parsedResumeText || `已上传简历文件《${resumeName}》，建议补充项目经历摘要与技能关键词，便于后续 AI 分析更准确。`
  ]);

  res.json({ success: true });
}));

app.get("/api/analysis", asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT
      a.id,
      j.title AS job_title,
      c.name AS candidate_name,
      a.match_score,
      a.review_status,
      DATE_FORMAT(a.updated_at, '%Y-%m-%d %H:%i') AS updated_at
    FROM analysis_outputs a
    INNER JOIN jobs j ON j.id = a.job_id
    INNER JOIN candidates c ON c.id = a.candidate_id
    ORDER BY a.updated_at DESC
  `);

  res.json(rows.map((item) => ({
    ...item,
    review_status_label: reviewStatusLabelMap[item.review_status] || item.review_status
  })));
}));

app.post("/api/analysis/generate", asyncHandler(async (req, res) => {
  const { jobId, candidateId } = req.body;
  const [[job]] = await pool.query("SELECT * FROM jobs WHERE id = ?", [jobId]);
  const [[candidateRow]] = await pool.query("SELECT * FROM candidates WHERE id = ?", [candidateId]);

  if (!job || !candidateRow) {
    return res.status(404).json({ message: "岗位或候选人不存在" });
  }

  const candidate = formatCandidate(candidateRow);
  const analysis = buildAnalysis(job, candidate);
  await pool.query(`
    INSERT INTO analysis_outputs (
      job_id, candidate_id, match_score, match_summary, strengths, gaps, rewritten_project, interview_questions, review_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    ON DUPLICATE KEY UPDATE
      match_score = VALUES(match_score),
      match_summary = VALUES(match_summary),
      strengths = VALUES(strengths),
      gaps = VALUES(gaps),
      rewritten_project = VALUES(rewritten_project),
      interview_questions = VALUES(interview_questions),
      review_status = 'pending'
  `, [
    jobId,
    candidateId,
    analysis.matchScore,
    analysis.matchSummary,
    analysis.strengths,
    analysis.gaps,
    analysis.rewrittenProject,
    analysis.interviewQuestions
  ]);

  const [[row]] = await pool.query("SELECT id FROM analysis_outputs WHERE job_id = ? AND candidate_id = ?", [jobId, candidateId]);
  const [[detail]] = await pool.query("SELECT * FROM analysis_outputs WHERE id = ?", [row.id]);

  res.json({
    job,
    candidate,
    analysis: detail
  });
}));

app.get("/api/analysis/:id", asyncHandler(async (req, res) => {
  const [[analysis]] = await pool.query("SELECT * FROM analysis_outputs WHERE id = ?", [req.params.id]);
  if (!analysis) {
    return res.status(404).json({ message: "分析结果不存在" });
  }
  const [[job]] = await pool.query("SELECT * FROM jobs WHERE id = ?", [analysis.job_id]);
  const [[candidateRow]] = await pool.query("SELECT * FROM candidates WHERE id = ?", [analysis.candidate_id]);

  res.json({
    job,
    candidate: formatCandidate(candidateRow),
    analysis
  });
}));

app.get("/api/review", asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT
      a.id,
      j.title AS job_title,
      c.name AS candidate_name,
      a.match_summary,
      a.rewritten_project,
      a.interview_questions,
      a.review_notes
    FROM analysis_outputs a
    INNER JOIN jobs j ON j.id = a.job_id
    INNER JOIN candidates c ON c.id = a.candidate_id
    ORDER BY a.updated_at DESC
  `);
  res.json(rows);
}));

app.patch("/api/review/:id", asyncHandler(async (req, res) => {
  const { reviewStatus, reviewNotes } = req.body;
  await pool.query(`
    UPDATE analysis_outputs
    SET review_status = ?, review_notes = ?, reviewed_by = 1
    WHERE id = ?
  `, [reviewStatus, reviewNotes, req.params.id]);
  res.json({ success: true });
}));

app.get("/api/exports", asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT
      e.id,
      j.title AS job_title,
      c.name AS candidate_name,
      e.export_type,
      DATE_FORMAT(e.created_at, '%Y-%m-%d %H:%i') AS created_at
    FROM export_logs e
    INNER JOIN analysis_outputs a ON a.id = e.analysis_id
    INNER JOIN jobs j ON j.id = a.job_id
    INNER JOIN candidates c ON c.id = a.candidate_id
    ORDER BY e.created_at DESC
  `);

  res.json(rows.map((item) => ({
    ...item,
    export_type_label: exportTypeLabelMap[item.export_type] || item.export_type
  })));
}));

app.post("/api/exports", asyncHandler(async (req, res) => {
  const { analysisId, exportType } = req.body;
  if (!analysisId || !exportType) {
    return res.status(400).json({ message: "缺少导出参数" });
  }
  await pool.query("INSERT INTO export_logs (analysis_id, export_type) VALUES (?, ?)", [analysisId, exportType]);
  res.json({ success: true });
}));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: error.message || "Server error" });
});

const port = Number(process.env.PORT || 3020);

async function start() {
  await ensureSchema();
  await ensureSeedData();
  app.listen(port, () => {
    console.log(`CareerPilot API running on http://127.0.0.1:${port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
