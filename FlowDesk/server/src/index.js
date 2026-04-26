import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mysql from "mysql2/promise";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "4mb" }));

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10
});

const statusLabelMap = {
  pending: "待处理",
  in_review: "审批中",
  approved: "已审批",
  rejected: "已驳回",
  done: "已完成"
};

const exportTypeLabelMap = {
  ticket_summary: "工单摘要",
  approval_history: "审批历史",
  handover_note: "交接说明"
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

function buildTimeline(approvals) {
  return approvals.map((item) => `${item.created_at} · ${item.nickname} · ${item.action_label}${item.note ? `\n备注：${item.note}` : ""}`).join("\n\n");
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(50) NOT NULL UNIQUE,
      nickname VARCHAR(50) NOT NULL,
      role ENUM('admin', 'reviewer', 'operator') NOT NULL DEFAULT 'operator',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ticket_categories (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(80) NOT NULL UNIQUE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INT PRIMARY KEY AUTO_INCREMENT,
      code VARCHAR(30) NOT NULL UNIQUE,
      title VARCHAR(180) NOT NULL,
      category_id INT NOT NULL,
      priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
      status ENUM('pending', 'in_review', 'approved', 'rejected', 'done') NOT NULL DEFAULT 'pending',
      requester_name VARCHAR(80) NOT NULL,
      department VARCHAR(80) NOT NULL,
      description LONGTEXT,
      current_owner_id INT DEFAULT NULL,
      created_by INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_tickets_category FOREIGN KEY (category_id) REFERENCES ticket_categories(id),
      CONSTRAINT fk_tickets_owner FOREIGN KEY (current_owner_id) REFERENCES users(id) ON DELETE SET NULL,
      CONSTRAINT fk_tickets_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS approvals (
      id INT PRIMARY KEY AUTO_INCREMENT,
      ticket_id INT NOT NULL,
      reviewer_id INT NOT NULL,
      action ENUM('submitted', 'approved', 'rejected', 'reassigned', 'completed') NOT NULL,
      note LONGTEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_approvals_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
      CONSTRAINT fk_approvals_user FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS export_logs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      ticket_id INT NOT NULL,
      export_type ENUM('ticket_summary', 'approval_history', 'handover_note') NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_export_logs_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    )
  `);
}

async function ensureSeedData() {
  const [[userCount]] = await pool.query("SELECT COUNT(*) AS count FROM users");
  if (!userCount.count) {
    await pool.query(`
      INSERT INTO users (username, nickname, role) VALUES
      ('admin', 'Lena', 'admin'),
      ('reviewer', 'Ryan', 'reviewer'),
      ('operator', 'Mia', 'operator')
    `);
  }

  const [[categoryCount]] = await pool.query("SELECT COUNT(*) AS count FROM ticket_categories");
  if (!categoryCount.count) {
    await pool.query(`
      INSERT INTO ticket_categories (name) VALUES
      ('流程审批'),
      ('系统支持'),
      ('权限申请'),
      ('数据需求')
    `);
  }

  const [[ticketCount]] = await pool.query("SELECT COUNT(*) AS count FROM tickets");
  if (!ticketCount.count) {
    await pool.query(`
      INSERT INTO tickets (code, title, category_id, priority, status, requester_name, department, description, current_owner_id, created_by)
      VALUES
      ('FD-202604-001', '营销活动页面上线审批', 1, 'high', 'in_review', '王珊', '市场部', '需要在月底前完成活动页面上线审批与资源排期确认。', 2, 3),
      ('FD-202604-002', '客服系统账号权限开通', 3, 'medium', 'approved', '周琪', '客服部', '为新入职客服同学申请后台系统访问权限与菜单配置。', 2, 3),
      ('FD-202604-003', '日报导出接口异常排查', 2, 'urgent', 'done', '林峰', '运营部', '运营日报导出接口连续两天超时，需要定位原因并修复。', 1, 3)
    `);

    await pool.query(`
      INSERT INTO approvals (ticket_id, reviewer_id, action, note) VALUES
      (1, 3, 'submitted', '工单已提交，等待审批'),
      (1, 2, 'reassigned', '需补充上线时间与资源说明'),
      (2, 3, 'submitted', '权限申请已提交'),
      (2, 2, 'approved', '权限配置符合要求，同意开通'),
      (3, 3, 'submitted', '故障工单已提交'),
      (3, 1, 'completed', '接口超时问题已修复并完成回归')
    `);

    await pool.query(`
      INSERT INTO export_logs (ticket_id, export_type) VALUES
      (2, 'ticket_summary'),
      (3, 'approval_history')
    `);
  }
}

app.get("/", (_req, res) => {
  res.json({ name: "FlowDesk API", status: "ok", time: new Date().toISOString() });
});

app.get("/api/overview", asyncHandler(async (_req, res) => {
  const [[tickets]] = await pool.query("SELECT COUNT(*) AS count FROM tickets");
  const [[inReview]] = await pool.query("SELECT COUNT(*) AS count FROM tickets WHERE status = 'in_review'");
  const [[approved]] = await pool.query("SELECT COUNT(*) AS count FROM tickets WHERE status = 'approved'");
  const [[done]] = await pool.query("SELECT COUNT(*) AS count FROM tickets WHERE status = 'done'");
  const [recentTickets] = await pool.query(`
    SELECT id, code, title, status, requester_name, department
    FROM tickets
    ORDER BY updated_at DESC
    LIMIT 4
  `);

  res.json({
    tickets: tickets.count,
    inReview: inReview.count,
    approved: approved.count,
    done: done.count,
    recentTickets: recentTickets.map((item) => ({
      ...item,
      status_label: statusLabelMap[item.status] || item.status
    }))
  });
}));

app.get("/api/categories", asyncHandler(async (_req, res) => {
  const [rows] = await pool.query("SELECT id, name FROM ticket_categories ORDER BY id");
  res.json(rows);
}));

app.get("/api/tickets", asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT
      t.id,
      t.code,
      t.title,
      c.name AS category_name,
      t.priority,
      t.status,
      t.requester_name,
      DATE_FORMAT(t.updated_at, '%Y-%m-%d %H:%i') AS updated_at
    FROM tickets t
    INNER JOIN ticket_categories c ON c.id = t.category_id
    ORDER BY t.created_at DESC
  `);
  res.json(rows);
}));

app.post("/api/tickets", asyncHandler(async (req, res) => {
  const { title, categoryId, priority, requesterName, department, description } = req.body;
  if (!title || !categoryId || !requesterName || !department) {
    return res.status(400).json({ message: "请先填写完整的工单信息" });
  }

  const [[countRow]] = await pool.query("SELECT COUNT(*) AS count FROM tickets");
  const code = `FD-202604-${String(countRow.count + 1).padStart(3, "0")}`;

  const [result] = await pool.query(`
    INSERT INTO tickets (code, title, category_id, priority, status, requester_name, department, description, current_owner_id, created_by)
    VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, 2, 3)
  `, [code, title, categoryId, priority, requesterName, department, description]);

  await pool.query(`
    INSERT INTO approvals (ticket_id, reviewer_id, action, note)
    VALUES (?, 3, 'submitted', '新工单已提交，等待审批')
  `, [result.insertId]);

  res.json({ success: true, id: result.insertId });
}));

app.get("/api/tickets/:id", asyncHandler(async (req, res) => {
  const [[ticket]] = await pool.query(`
    SELECT
      t.id,
      t.code,
      t.title,
      t.status,
      t.requester_name,
      t.department,
      t.description
    FROM tickets t
    WHERE t.id = ?
  `, [req.params.id]);

  if (!ticket) {
    return res.status(404).json({ message: "工单不存在" });
  }

  const [approvals] = await pool.query(`
    SELECT
      a.action,
      a.note,
      DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i') AS created_at,
      u.nickname
    FROM approvals a
    INNER JOIN users u ON u.id = a.reviewer_id
    WHERE a.ticket_id = ?
    ORDER BY a.created_at ASC
  `, [req.params.id]);

  const actionLabelMap = {
    submitted: "提交",
    approved: "通过",
    rejected: "驳回",
    reassigned: "转交",
    completed: "完成"
  };

  res.json({
    ticket,
    timeline: buildTimeline(approvals.map((item) => ({
      ...item,
      action_label: actionLabelMap[item.action] || item.action
    })))
  });
}));

app.get("/api/approvals", asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT id, code, title, description
    FROM tickets
    WHERE status IN ('pending', 'in_review', 'approved')
    ORDER BY updated_at DESC
  `);
  res.json(rows);
}));

app.post("/api/tickets/:id/approve", asyncHandler(async (req, res) => {
  const { action, note } = req.body;
  const ticketId = req.params.id;

  const nextStatusMap = {
    approved: "approved",
    rejected: "rejected",
    reassigned: "in_review",
    completed: "done"
  };

  await pool.query(`
    INSERT INTO approvals (ticket_id, reviewer_id, action, note)
    VALUES (?, 2, ?, ?)
  `, [ticketId, action, note]);

  await pool.query(`
    UPDATE tickets
    SET status = ?, current_owner_id = ?
    WHERE id = ?
  `, [
    nextStatusMap[action] || "in_review",
    action === "completed" ? 1 : 2,
    ticketId
  ]);

  res.json({ success: true });
}));

app.get("/api/reports", asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT
      e.id,
      t.code,
      t.title,
      e.export_type,
      DATE_FORMAT(e.created_at, '%Y-%m-%d %H:%i') AS created_at
    FROM export_logs e
    INNER JOIN tickets t ON t.id = e.ticket_id
    ORDER BY e.created_at DESC
  `);

  res.json(rows.map((item) => ({
    ...item,
    export_type_label: exportTypeLabelMap[item.export_type] || item.export_type
  })));
}));

app.post("/api/reports", asyncHandler(async (req, res) => {
  const { ticketId, exportType } = req.body;
  if (!ticketId || !exportType) {
    return res.status(400).json({ message: "缺少导出参数" });
  }

  await pool.query(`
    INSERT INTO export_logs (ticket_id, export_type)
    VALUES (?, ?)
  `, [ticketId, exportType]);

  res.json({ success: true });
}));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: error.message || "Server error" });
});

const port = Number(process.env.PORT || 3030);

async function start() {
  await ensureSchema();
  await ensureSeedData();
  app.listen(port, () => {
    console.log(`FlowDesk API running on http://127.0.0.1:${port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
