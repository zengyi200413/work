# DocPilot AI

> 一个面向办公文档场景的 AI 协同平台，把“上传、生成、审核、导出”组织成完整工作流。

DocPilot AI 不是简单的聊天工具，而是围绕需求文档、会议纪要、方案材料等日常办公内容设计的协同应用。系统支持文档上传、文本解析、摘要生成、行动项提取、PRD 初稿输出、人工审核与导出记录，适合作为前端 / 全栈求职作品展示。

## 项目定位

- 面向对象：需要处理大量文档、纪要和方案材料的团队
- 核心目标：让办公文档从“复制粘贴”升级成“结构化产出”
- AI 思路：AI 先生成，人再审核，强调结果可用和可控

## 核心亮点

- 办公场景真实，不是泛化 Demo
- AI Native 工作流：上传、解析、生成、审核、导出
- 支持 PDF / TXT 文档自动提取文本
- 输出结构化结果：摘要、行动项、PRD、测试点、风险提示
- 人工审核台保证结果质量

## 功能模块

### 1. 文档中心
- 上传原始文档
- 查看文档状态与更新时间
- 对单个文档触发 AI 生成

### 2. 结果生成
- 自动生成摘要
- 自动提取行动项
- 自动形成 PRD 初稿
- 自动给出测试点与风险提示

### 3. 审核台
- 对 AI 输出进行人工修订
- 支持通过和打回修改
- 记录审核备注

### 4. 导出记录
- 记录摘要、PRD、任务清单和完整报告导出
- 方便作为团队协作成果留档

## 技术栈

- Frontend: Vue 3 + Vite + Vue Router + Element Plus
- Backend: Node.js + Express
- Database: MySQL
- Upload / Parse: Multer + pdf-parse

## 本地运行

1. 执行数据库脚本 [database.sql](E:\work\docpilot-ai\database.sql)
2. 在 [server](E:\work\docpilot-ai\server) 运行：

```powershell
npm install
npm run start
```

3. 在 [client](E:\work\docpilot-ai\client) 运行：

```powershell
npm install
npm run dev
```

4. 打开：

```text
http://127.0.0.1:5180/#/overview
```

## 简历写法

独立设计并实现 DocPilot AI 文档协同平台，围绕办公文档上传、文本解析、摘要生成、行动项提取、PRD 初稿输出、人工审核与结果导出构建完整工作流；采用 Vue 3 + Node.js + MySQL 搭建前后端系统，并加入 PDF 文档自动解析与审核机制，提升团队文档处理效率与结果可控性。
