import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import pdf from "pdf-parse";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10
});

const upload = multer({ dest: uploadsDir });
const statusLabels = {
  uploaded: "已上传",
  generated: "已生成",
  reviewed: "已审核"
};
const exportTypeLabels = {
  summary: "摘要",
  prd: "PRD",
  tasks: "任务清单",
  full_report: "完整报告"
};

function normalizeFilename(filename = "") {
  try {
    const decoded = Buffer.from(filename, "latin1").toString("utf8");
    if (decoded.includes("�")) {
      return filename;
    }
    return decoded;
  } catch {
    return filename;
  }
}

function buildGeneratedContent(title, rawText) {
  const sourceSnippet = (rawText || "原始文档信息较少，建议补充业务目标与角色说明。").slice(0, 120);

  return {
    summary: `${title} 的核心目标已经被整理为结构化输出，当前文档主要围绕业务目标、参与角色、交付节奏和风险边界展开。系统从原始文本中提取了重点信息，并生成适合协同评审的摘要。`,
    actionItems: `1. 明确目标人群与业务边界\n2. 补充关键时间节点与负责人\n3. 对外依赖项单独列出并跟踪\n4. 将上线验收标准沉淀为检查清单`,
    prdDraft: `一、项目目标\n围绕《${title}》完成核心需求梳理与交付规划。\n\n二、用户与场景\n根据现有资料，重点覆盖内部协同、评审流转与结果导出场景。\n\n三、范围说明\n本期优先交付摘要生成、行动项提取、审核记录和导出能力。\n\n四、验收标准\n输出结果需可读、可改、可审，并能回溯原始文档来源。`,
    testPoints: `1. 上传 PDF / TXT 是否成功\n2. 生成内容后状态是否更新为已生成\n3. 审核通过与打回修改是否能正确记录\n4. 导出记录是否能按文档和类型追踪`,
    riskNotes: `风险提示：${sourceSnippet}\n建议在正式交付前补充更明确的业务背景、时间约束和审批链路，以降低 AI 输出偏差。`
  };
}

async function extractTextFromFile(file) {
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

function asyncHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
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
    )
  `);

  await pool.query(`
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
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS export_logs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      document_id INT NOT NULL,
      export_type ENUM('summary', 'prd', 'tasks', 'full_report') NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_exports_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    )
  `);
}

async function ensureSeedData() {
  const [[userCount]] = await pool.query("SELECT COUNT(*) AS count FROM users");
  if (!userCount.count) {
    await pool.query(`
      INSERT INTO users (username, password_hash, nickname, role)
      VALUES ('demo_admin', 'demo_not_for_login', 'Mia', 'admin')
    `);
  }

  const [[docCount]] = await pool.query("SELECT COUNT(*) AS count FROM documents");
  if (!docCount.count) {
    const demoDocs = [
      {
        title: "Q2 产品需求评审纪要",
        sourceName: "q2-review-minutes.pdf",
        rawText: "会议聚焦支付体验优化、审批流梳理、客服反馈归类和版本节奏协调，需要形成可执行的行动项与 PRD 草稿。",
        status: "generated"
      },
      {
        title: "支付体验优化方案",
        sourceName: "payment-upgrade.docx",
        rawText: "文档包含用户痛点、支付失败排查路径、异常兜底和关键指标提升目标，适合生成 PRD 与测试点。",
        status: "reviewed"
      },
      {
        title: "客服反馈周报整理",
        sourceName: "support-feedback.txt",
        rawText: "本周集中反馈在登录异常、订单状态不同步、帮助中心检索能力不足三个方向，需要输出行动项。",
        status: "uploaded"
      }
    ];

    for (const doc of demoDocs) {
      const [result] = await pool.query(`
        INSERT INTO documents (title, source_name, raw_text, status, created_by)
        VALUES (?, ?, ?, ?, 1)
      `, [doc.title, doc.sourceName, doc.rawText, doc.status]);

      if (doc.status !== "uploaded") {
        const content = buildGeneratedContent(doc.title, doc.rawText);
        await pool.query(`
          INSERT INTO ai_outputs (document_id, summary, action_items, prd_draft, test_points, risk_notes, review_status, review_notes, reviewed_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          result.insertId,
          content.summary,
          content.actionItems,
          content.prdDraft,
          content.testPoints,
          content.riskNotes,
          doc.status === "reviewed" ? "approved" : "pending",
          doc.status === "reviewed" ? "已完成业务口径确认，可进入导出阶段。" : "建议补充更多角色与时间约束。",
          doc.status === "reviewed" ? 1 : null
        ]);
      }
    }

    await pool.query(`
      INSERT INTO export_logs (document_id, export_type)
      VALUES (2, 'prd'), (2, 'full_report'), (1, 'summary')
    `);
  }
}

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use("/uploads", express.static(uploadsDir));

app.get("/", (_req, res) => {
  res.json({
    name: "DocPilot AI API",
    status: "ok",
    time: new Date().toISOString()
  });
});

app.get("/api/overview", asyncHandler(async (_req, res) => {
  const [[documents]] = await pool.query("SELECT COUNT(*) AS count FROM documents");
  const [[generated]] = await pool.query("SELECT COUNT(*) AS count FROM documents WHERE status IN ('generated', 'reviewed')");
  const [[reviewed]] = await pool.query("SELECT COUNT(*) AS count FROM ai_outputs WHERE review_status = 'approved'");
  const [[exports]] = await pool.query("SELECT COUNT(*) AS count FROM export_logs");
  const [[pendingReview]] = await pool.query("SELECT COUNT(*) AS count FROM ai_outputs WHERE review_status = 'pending'");
  const [recentDocuments] = await pool.query(`
    SELECT d.id, d.title, d.source_name, d.status, u.nickname AS owner
    FROM documents d
    INNER JOIN users u ON u.id = d.created_by
    ORDER BY d.updated_at DESC
    LIMIT 4
  `);

  res.json({
    documents: documents.count,
    generated: generated.count,
    reviewed: reviewed.count,
    exports: exports.count,
    pendingReview: pendingReview.count,
    recentDocuments: recentDocuments.map((item) => ({
      ...item,
      title: normalizeFilename(item.title),
      source_name: normalizeFilename(item.source_name),
      status_label: statusLabels[item.status] || item.status
    }))
  });
}));

app.get("/api/documents", asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT d.id, d.title, d.source_name, d.status, DATE_FORMAT(d.updated_at, '%Y-%m-%d %H:%i') AS updated_at, u.nickname AS owner
    FROM documents d
    INNER JOIN users u ON u.id = d.created_by
    ORDER BY d.created_at DESC
  `);
  res.json(rows.map((item) => ({
    ...item,
    title: normalizeFilename(item.title),
    source_name: normalizeFilename(item.source_name)
  })));
}));

app.get("/api/documents/:id", asyncHandler(async (req, res) => {
  const [[document]] = await pool.query(`
    SELECT id, title, source_name, status, DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i') AS updated_at
    FROM documents
    WHERE id = ?
  `, [req.params.id]);

  if (!document) {
    return res.status(404).json({ message: "文档不存在" });
  }

  const [[output]] = await pool.query(`
    SELECT summary, action_items, prd_draft, test_points, risk_notes, review_status, review_notes
    FROM ai_outputs
    WHERE document_id = ?
  `, [req.params.id]);

  res.json({
    document: {
      ...document,
      title: normalizeFilename(document.title),
      source_name: normalizeFilename(document.source_name)
    },
    output: output || null
  });
}));

app.post("/api/documents/upload", upload.single("file"), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "请先选择文件" });
  }

  const sourceName = normalizeFilename(req.file.originalname);
  const title = req.body.title || sourceName;
  const parsedText = await extractTextFromFile(req.file);
  const [result] = await pool.query(`
    INSERT INTO documents (title, source_name, file_path, raw_text, status, created_by)
    VALUES (?, ?, ?, ?, 'uploaded', 1)
  `, [
    title,
    sourceName,
    `/uploads/${req.file.filename}`,
    parsedText || "暂未能自动解析正文，建议补充更清晰的 PDF 或使用 TXT 文档上传。"
  ]);

  res.json({ id: result.insertId });
}));

app.post("/api/documents/:id/generate", asyncHandler(async (req, res) => {
  const [[document]] = await pool.query("SELECT id, title, raw_text FROM documents WHERE id = ?", [req.params.id]);
  if (!document) {
    return res.status(404).json({ message: "文档不存在" });
  }

  const content = buildGeneratedContent(document.title, document.raw_text);
  await pool.query("UPDATE documents SET status = 'generated' WHERE id = ?", [req.params.id]);
  await pool.query(`
    INSERT INTO ai_outputs (document_id, summary, action_items, prd_draft, test_points, risk_notes, review_status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
    ON DUPLICATE KEY UPDATE
      summary = VALUES(summary),
      action_items = VALUES(action_items),
      prd_draft = VALUES(prd_draft),
      test_points = VALUES(test_points),
      risk_notes = VALUES(risk_notes),
      review_status = 'pending'
  `, [
    req.params.id,
    content.summary,
    content.actionItems,
    content.prdDraft,
    content.testPoints,
    content.riskNotes
  ]);
  res.json({ success: true });
}));

app.get("/api/review", asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT d.id, d.title, ao.summary, ao.action_items, ao.risk_notes, ao.review_status, ao.review_notes
    FROM documents d
    INNER JOIN ai_outputs ao ON ao.document_id = d.id
    ORDER BY ao.generated_at DESC
  `);
  res.json(rows);
}));

app.patch("/api/review/:id", asyncHandler(async (req, res) => {
  const { reviewStatus, reviewNotes } = req.body;
  await pool.query(`
    UPDATE ai_outputs
    SET review_status = ?, review_notes = ?, reviewed_by = 1
    WHERE document_id = ?
  `, [reviewStatus, reviewNotes, req.params.id]);
  await pool.query("UPDATE documents SET status = ? WHERE id = ?", [reviewStatus === "approved" ? "reviewed" : "generated", req.params.id]);
  res.json({ success: true });
}));

app.get("/api/exports", asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT e.id, d.title AS name, e.export_type, DATE_FORMAT(e.created_at, '%Y-%m-%d %H:%i') AS created_at
    FROM export_logs e
    INNER JOIN documents d ON d.id = e.document_id
    ORDER BY e.created_at DESC
  `);
  res.json(rows.map((item) => ({
    ...item,
    name: normalizeFilename(item.name),
    export_type_label: exportTypeLabels[item.export_type] || item.export_type
  })));
}));

app.post("/api/exports", asyncHandler(async (req, res) => {
  const { documentId, exportType } = req.body;
  if (!documentId || !exportType) {
    return res.status(400).json({ message: "缺少导出参数" });
  }

  await pool.query(`
    INSERT INTO export_logs (document_id, export_type)
    VALUES (?, ?)
  `, [documentId, exportType]);

  res.json({ success: true });
}));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: error.message || "Server error" });
});

const port = Number(process.env.PORT || 3010);

async function start() {
  await ensureSchema();
  await ensureSeedData();
  app.listen(port, () => {
    console.log(`DocPilot API running on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
