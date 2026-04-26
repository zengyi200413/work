<script setup>
import { computed, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import axios from "axios";

const loading = ref(true);
const overview = ref({
  jobs: 0,
  candidates: 0,
  analyses: 0,
  approved: 0,
  recentJobs: []
});

const statCards = computed(() => [
  { label: "目标岗位", value: overview.value.jobs, hint: "已录入的 JD 数量" },
  { label: "候选材料", value: overview.value.candidates, hint: "已导入的简历档案" },
  { label: "AI 分析", value: overview.value.analyses, hint: "生成的匹配分析与项目改写" },
  { label: "审核通过", value: overview.value.approved, hint: "可直接用于投递的材料包" }
]);

async function loadOverview() {
  loading.value = true;
  try {
    const { data } = await axios.get("http://127.0.0.1:3020/api/overview");
    overview.value = data;
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "总览加载失败");
  } finally {
    loading.value = false;
  }
}

onMounted(loadOverview);
</script>

<template>
  <div class="career-stack">
    <section v-loading="loading" class="hero-card">
      <p class="eyebrow">AI Job Copilot</p>
      <h1>把岗位理解、简历优化、项目表达和面试准备收进一个真正可投递的协同平台。</h1>
      <p class="hero-copy">CareerPilot AI 面向求职阶段的高频动作，把“看 JD、改简历、写项目、准备面试”串成一条完整工作流，更适合作为你投递时展示的 AI 应用作品。</p>
    </section>

    <section class="stats-grid">
      <article v-for="card in statCards" :key="card.label" class="stat-card">
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
        <p>{{ card.hint }}</p>
      </article>
    </section>

    <section class="panel-grid">
      <article class="panel-card">
        <div class="panel-head">
          <h3>这类项目最能体现什么</h3>
        </div>
        <div class="list-stack">
          <div class="list-item">把岗位需求抽象成结构化标签与能力画像</div>
          <div class="list-item">基于简历内容生成匹配分析、优势与风险点</div>
          <div class="list-item">把项目经历改写成更贴近 JD 的表达</div>
          <div class="list-item">对 AI 输出做人工审核，强调结果可控</div>
        </div>
      </article>

      <article class="panel-card">
        <div class="panel-head">
          <h3>面试时可以怎么讲</h3>
        </div>
        <p class="muted-text">这个项目不是单纯的聊天框，而是围绕岗位 JD 和简历材料设计的 AI 协同应用。它把岗位理解、候选人画像、项目经历重写、模拟面试和人工审核组织成闭环，更接近真实的产品化交付。</p>
      </article>

      <article class="panel-card panel-span">
        <div class="panel-head">
          <h3>最近岗位</h3>
          <span class="muted-text">用于演示实际投递场景</span>
        </div>
        <div class="list-stack">
          <div v-for="job in overview.recentJobs" :key="job.id" class="list-item list-row">
            <div>
              <strong>{{ job.title }}</strong>
              <p class="muted-text">{{ job.company }} · {{ job.city }}</p>
            </div>
            <el-tag>{{ job.company }}</el-tag>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>
