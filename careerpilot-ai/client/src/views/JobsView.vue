<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import axios from "axios";

const loading = ref(false);
const saving = ref(false);
const jobs = ref([]);
const candidates = ref([]);
const resumeFiles = ref([]);
const form = reactive({
  title: "",
  company: "",
  city: "",
  summary: "",
  requirements: "",
  candidateName: "",
  targetRole: "",
  resumeName: "",
  resumeText: ""
});

const uploadTip = computed(() => {
  if (!resumeFiles.value.length) {
    return "支持上传 PDF / DOC / DOCX / TXT，建议同时补充简历正文摘要，便于分析更准确。";
  }
  const file = resumeFiles.value[0];
  const size = `${(file.size / 1024).toFixed(1)} KB`;
  return `已选择：${file.name} · ${size}`;
});

async function loadPage() {
  loading.value = true;
  try {
    const [{ data: jobsData }, { data: candidatesData }] = await Promise.all([
      axios.get("http://127.0.0.1:3020/api/jobs"),
      axios.get("http://127.0.0.1:3020/api/candidates")
    ]);
    jobs.value = jobsData;
    candidates.value = candidatesData;
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "数据加载失败");
  } finally {
    loading.value = false;
  }
}

function handleResumeChange(_file, files) {
  resumeFiles.value = files.slice(-1).map((item) => item.raw).filter(Boolean);
  if (!form.resumeName && resumeFiles.value.length) {
    form.resumeName = resumeFiles.value[0].name;
  }
}

async function saveMaterial() {
  saving.value = true;
  try {
    const body = new FormData();
    body.append("title", form.title);
    body.append("company", form.company);
    body.append("city", form.city);
    body.append("summary", form.summary);
    body.append("requirements", form.requirements);
    body.append("candidateName", form.candidateName);
    body.append("targetRole", form.targetRole);
    body.append("resumeName", form.resumeName);
    body.append("resumeText", form.resumeText);
    if (resumeFiles.value.length) {
      body.append("resumeFile", resumeFiles.value[0]);
    }

    await axios.post("http://127.0.0.1:3020/api/materials", body, {
      headers: { "Content-Type": "multipart/form-data" }
    });

    Object.keys(form).forEach((key) => {
      form[key] = "";
    });
    resumeFiles.value = [];
    ElMessage.success("岗位和候选材料已录入");
    await loadPage();
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "录入失败");
  } finally {
    saving.value = false;
  }
}

onMounted(loadPage);
</script>

<template>
  <div class="career-stack">
    <section class="panel-card">
      <div class="panel-head wrap">
        <div>
          <h2>岗位与简历录入</h2>
          <p class="muted-text">把目标岗位和候选材料沉淀成后续 AI 分析的基础输入。</p>
        </div>
        <el-button type="primary" :loading="saving" @click="saveMaterial">保存材料</el-button>
      </div>

      <div class="form-grid">
        <div class="review-block">
          <h3>岗位 JD</h3>
          <el-input v-model="form.title" placeholder="岗位名称" />
          <el-input v-model="form.company" placeholder="公司名称" />
          <el-input v-model="form.city" placeholder="城市" />
          <el-input v-model="form.summary" type="textarea" :rows="3" placeholder="岗位概述" />
          <el-input v-model="form.requirements" type="textarea" :rows="7" placeholder="核心要求 / 技术栈 / 关键词" />
        </div>

        <div class="review-block">
          <h3>候选人简历</h3>
          <el-input v-model="form.candidateName" placeholder="姓名" />
          <el-input v-model="form.targetRole" placeholder="目标岗位方向" />
          <el-input v-model="form.resumeName" placeholder="简历名称" />
          <el-upload
            :auto-upload="false"
            :limit="1"
            :show-file-list="false"
            :on-change="handleResumeChange"
          >
            <el-button>上传简历文件</el-button>
          </el-upload>
          <div class="upload-hint">{{ uploadTip }}</div>
          <el-input
            v-model="form.resumeText"
            type="textarea"
            :rows="8"
            placeholder="可粘贴简历正文、项目经历或技能摘要，让 AI 分析更准确"
          />
        </div>
      </div>
    </section>

    <section class="panel-grid">
      <article class="panel-card" v-loading="loading">
        <div class="panel-head">
          <h3>岗位中心</h3>
        </div>
        <div class="list-stack">
          <div v-for="job in jobs" :key="job.id" class="list-item">
            <strong>{{ job.title }}</strong>
            <p class="muted-text">{{ job.company }} · {{ job.city }}</p>
            <p>{{ job.summary }}</p>
          </div>
        </div>
      </article>

      <article class="panel-card" v-loading="loading">
        <div class="panel-head">
          <h3>候选材料</h3>
        </div>
        <div class="list-stack">
          <div v-for="candidate in candidates" :key="candidate.id" class="list-item">
            <div class="list-row">
              <strong>{{ candidate.name }}</strong>
              <el-tag v-if="candidate.resume_file_path" type="success">已上传文件</el-tag>
            </div>
            <p class="muted-text">{{ candidate.target_role }} · {{ candidate.resume_name }}</p>
            <p v-if="candidate.resume_file_path" class="muted-text">文件：{{ candidate.resume_file_label }}</p>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>
