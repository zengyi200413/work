# CareerPilot AI

> 一个面向求职场景的 AI 协同平台，用来把“看 JD、改简历、写项目、准备面试”组织成完整工作流。

CareerPilot AI 不是单纯的聊天框，而是一个更接近真实产品交付的 AI 应用作品。它围绕岗位理解、简历解析、匹配分析、项目改写、模拟面试和人工审核设计闭环，既能作为作品集项目展示，也能直接辅助个人求职。

## 项目定位

- 面向对象：正在找工作、需要优化投递材料的候选人
- 核心目标：让岗位 JD、简历内容和项目经历形成更有针对性的表达
- 产品思路：AI 先生成，人工再审核，强调结果可用、可控、可导出

## 核心亮点

- 真实场景驱动：围绕求职链路设计，不是泛化 Demo
- AI Native 工作流：岗位录入、简历上传、自动解析、匹配分析、审核导出
- PDF 简历自动读取：上传后自动抽取文本，减少手动复制成本
- 匹配分析更产品化：输出匹配度、优势亮点、差距提醒、项目改写建议、模拟面试题
- 人工审核机制：支持对 AI 输出进行修订与状态管理
- 可投递表达：README、界面和项目说明都更偏作品集展示风格

## 功能地图

### 1. 岗位中心
- 录入目标岗位、公司、城市、岗位摘要
- 保存岗位关键词与核心要求

### 2. 简历录入
- 支持上传 `PDF / DOC / DOCX / TXT`
- 保存候选人姓名、目标方向、简历名称和正文摘要
- PDF 文件支持自动提取文本内容

### 3. 匹配分析
- 生成岗位匹配度
- 输出优势亮点与差距提醒
- 自动给出项目经历改写建议
- 自动生成模拟面试题

### 4. 审核台
- 对 AI 结果做人工修订
- 支持“已通过 / 需修改”状态流转

### 5. 导出记录
- 沉淀匹配报告、项目亮点稿和面试题包
- 方便作为投递材料或演示结果使用

## 页面预览

- 总览页：`/#/dashboard`
- 岗位中心：`/#/jobs`
- 匹配分析：`/#/analysis`
- 审核台：`/#/review`
- 导出记录：`/#/exports`

本地运行后访问：

```text
http://127.0.0.1:5190/#/dashboard
```

## 技术栈

### Frontend
- Vue 3
- Vite
- Vue Router
- Element Plus

### Backend
- Node.js
- Express
- Multer
- pdf-parse

### Database
- MySQL

## 项目结构

```text
careerpilot-ai/
|-- client/
|-- server/
|-- database.sql
`-- README.md
```

## 本地运行

1. 执行数据库脚本 [database.sql](E:\work\careerpilot-ai\database.sql)
2. 在 [server](E:\work\careerpilot-ai\server) 运行：

```powershell
npm install
npm run start
```

3. 在 [client](E:\work\careerpilot-ai\client) 运行：

```powershell
npm install
npm run dev
```

4. 打开：

```text
http://127.0.0.1:5190/#/dashboard
```

## 简历写法

独立设计并实现 CareerPilot AI 求职材料协同平台，围绕岗位 JD 解析、简历文件上传、PDF 自动提取、匹配分析、项目亮点重写与模拟面试题生成构建完整工作流；采用 Vue 3 + Node.js + MySQL 搭建前后端系统，并加入人工审核与导出机制，提升投递材料的针对性和可控性。

## 适合面试时强调的点

- 这不是简单接大模型接口，而是一个完整工作流产品
- 我重点解决的是 AI 输出如何真正服务于真实求职场景
- 我加入了人工审核机制，而不是盲信模型结果
- 我把项目做成了既能展示又能自用的作品，这让产品选择更真实
