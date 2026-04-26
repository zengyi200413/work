<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import axios from "axios";

const loading = ref(false);
const generating = ref(false);
const jobs = ref([]);
const candidates = ref([]);
const analyses = ref([]);
const detail = ref(null);
const form = reactive({
  jobId: "",
  candidateId: ""
});

const fitLevel = computed(() => {
  if (!detail.value) return "";
  const score = Number(detail.value.analysis.match_score || 0);
  if (score >= 80) return "高匹配";
  if (score >= 60) return "中高匹配";
  if (score >= 45) return "可培养";
  return "需强化";
});

async function loadPage() {
  loading.value = true;
  try {
    const [{ data: jobsData }, { data: candidatesData }, { data: analysesData }] = await Promise.all([
      axios.get("http://127.0.0.1:3020/api/jobs"),
      axios.get("http://127.0.0.1:3020/api/candidates"),
      axios.get("http://127.0.0.1:3020/api/analysis")
    ]);
    jobs.value = jobsData;
    candidates.value = candidatesData;
    analyses.value = analysesData;
    if (!form.jobId && jobsData.length) form.jobId = jobsData[0].id;
    if (!form.candidateId && candidatesData.length) form.candidateId = candidatesData[0].id;
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "分析数据加载失败");
  } finally {
    loading.value = false;
  }
}

async function generateAnalysis() {
  generating.value = true;
  try {
    const { data } = await axios.post("http://127.0.0.1:3020/api/analysis/generate", form);
    detail.value = data;
    ElMessage.success("AI 匹配分析已生成");
    await loadPage();
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "分析生成失败");
  } finally {
    generating.value = false;
  }
}

async function openDetail(item) {
  try {
    const { data } = await axios.get(`http://127.0.0.1:3020/api/analysis/${item.id}`);
    detail.value = data;
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "详情加载失败");
  }
}

onMounted(loadPage);
</script>

<template>
  <div class="career-stack">
    <section class="panel-card analysis-hero">
      <div class="panel-head wrap">
        <div>
          <p class="eyebrow">Match Intelligence</p>
          <h2>把岗位要求翻译成可以落到简历和项目表达上的投递建议。</h2>
          <p class="muted-text">系统会结合岗位 JD、简历正文和上传文件信息，生成匹配度、优势亮点、差距提醒、项目改写建议与模拟面试题。</p>
        </div>
        <div class="upload-inline">
          <el-select v-model="form.jobId" placeholder="选择岗位" style="width: 220px">
            <el-option v-for="job in jobs" :key="job.id" :label="`${job.title} · ${job.company}`" :value="job.id" />
          </el-select>
          <el-select v-model="form.candidateId" placeholder="选择候选人" style="width: 220px">
            <el-option v-for="candidate in candidates" :key="candidate.id" :label="candidate.name" :value="candidate.id" />
          </el-select>
          <el-button type="primary" :loading="generating" @click="generateAnalysis">生成分析</el-button>
        </div>
      </div>
    </section>

    <section class="panel-card">
      <el-table v-loading="loading" :data="analyses" stripe>
        <el-table-column prop="job_title" label="岗位" min-width="240" />
        <el-table-column prop="candidate_name" label="候选人" width="120" />
        <el-table-column prop="match_score" label="匹配度" width="120" />
        <el-table-column prop="review_status_label" label="审核状态" width="140" />
        <el-table-column prop="updated_at" label="更新时间" width="180" />
        <el-table-column label="操作" width="140">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">查看结果</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section v-if="detail" class="career-stack">
      <section class="analysis-overview">
        <article class="analysis-score-card">
          <span class="score-label">Match Score</span>
          <strong>{{ detail.analysis.match_score }}</strong>
          <p>{{ fitLevel }}</p>
        </article>

        <article class="analysis-meta-card">
          <div>
            <span class="meta-label">目标岗位</span>
            <strong>{{ detail.job.title }}</strong>
            <p>{{ detail.job.company }} · {{ detail.job.city }}</p>
          </div>
          <div>
            <span class="meta-label">候选人</span>
            <strong>{{ detail.candidate.name }}</strong>
            <p>{{ detail.candidate.target_role }}</p>
          </div>
          <div v-if="detail.candidate.resume_file_label">
            <span class="meta-label">简历文件</span>
            <strong>{{ detail.candidate.resume_name }}</strong>
            <p>{{ detail.candidate.resume_file_label }}</p>
          </div>
        </article>
      </section>

      <section class="review-grid">
        <article class="review-block">
          <h4>匹配摘要</h4>
          <p>{{ detail.analysis.match_summary }}</p>
        </article>
        <article class="review-block">
          <h4>优势亮点</h4>
          <pre class="plain-pre">{{ detail.analysis.strengths }}</pre>
        </article>
        <article class="review-block">
          <h4>差距提醒</h4>
          <pre class="plain-pre">{{ detail.analysis.gaps }}</pre>
        </article>
        <article class="review-block">
          <h4>项目改写建议</h4>
          <pre class="plain-pre">{{ detail.analysis.rewritten_project }}</pre>
        </article>
        <article class="review-block panel-span">
          <h4>模拟面试题</h4>
          <pre class="plain-pre">{{ detail.analysis.interview_questions }}</pre>
        </article>
      </section>
    </section>
  </div>
</template>
