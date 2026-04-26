<script setup>
import { computed, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import axios from "axios";

const loading = ref(true);
const overview = ref({
  documents: 0,
  generated: 0,
  reviewed: 0,
  exports: 0,
  pendingReview: 0,
  recentDocuments: []
});

const stats = computed(() => [
  { label: "文档输入", value: `${overview.value.documents}`, hint: "已接入的文档总量" },
  { label: "AI 生成", value: `${overview.value.generated}`, hint: "完成摘要与结构化输出" },
  { label: "人工审核", value: `${overview.value.reviewed}`, hint: "审核通过的结果数量" },
  { label: "导出交付", value: `${overview.value.exports}`, hint: "已形成可交付成果" }
]);

async function loadOverview() {
  loading.value = true;
  try {
    const { data } = await axios.get("http://127.0.0.1:3010/api/overview");
    overview.value = data;
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "概览数据加载失败");
  } finally {
    loading.value = false;
  }
}

onMounted(loadOverview);
</script>

<template>
  <div class="dp-stack">
    <section v-loading="loading" class="hero-card">
      <p class="eyebrow">AI Native Workflow</p>
      <h1>把文档处理从“复制粘贴”升级成“上传、生成、审核、导出”的完整 AI 协同流程。</h1>
      <p class="hero-copy">DocPilot AI 面向需求文档、会议纪要、方案材料等办公内容，帮助团队把零散信息整理成可读、可审、可交付的结构化成果。</p>
    </section>

    <section class="stats-grid">
      <article v-for="item in stats" :key="item.label" class="stat-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <p>{{ item.hint }}</p>
      </article>
    </section>

    <section class="panel-grid">
      <article class="panel-card">
        <div class="panel-head">
          <h3>适合展示的能力</h3>
        </div>
        <div class="list-stack">
          <div class="list-item">文件上传与结构化处理</div>
          <div class="list-item">AI 结果生成与工作流编排</div>
          <div class="list-item">人工审核与质量兜底</div>
          <div class="list-item">前后端分离与产品化交付</div>
        </div>
      </article>

      <article class="panel-card">
        <div class="panel-head">
          <h3>推荐面试表达</h3>
        </div>
        <p class="muted-text">这个项目不是简单接一个聊天接口，而是把“文档上传、AI 生成、人工审核、结果导出”设计成完整工作流，重点解决 AI 输出是否可用、是否可控的问题。</p>
        <div class="overview-note">
          <span>待审核任务</span>
          <strong>{{ overview.pendingReview }}</strong>
        </div>
      </article>

      <article class="panel-card panel-span">
        <div class="panel-head">
          <h3>最近文档</h3>
          <span class="muted-text">方便演示真实工作流</span>
        </div>
        <div class="list-stack">
          <div v-for="doc in overview.recentDocuments" :key="doc.id" class="list-item list-row">
            <div>
              <strong>{{ doc.title }}</strong>
              <p class="muted-text">{{ doc.source_name }} · {{ doc.owner }}</p>
            </div>
            <el-tag :type="doc.status === 'reviewed' ? 'success' : doc.status === 'generated' ? 'warning' : 'info'">
              {{ doc.status_label }}
            </el-tag>
          </div>
          <div v-if="overview.recentDocuments.length === 0" class="list-item muted-text">还没有文档，先去文档中心上传一份。</div>
        </div>
      </article>
    </section>
  </div>
</template>
