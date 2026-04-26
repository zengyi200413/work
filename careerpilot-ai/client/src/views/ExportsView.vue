<script setup>
import { onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import axios from "axios";

const loading = ref(false);
const analyses = ref([]);
const exportsLog = ref([]);
const creating = ref(false);
const form = reactive({
  analysisId: "",
  exportType: "match_report"
});

async function loadPage() {
  loading.value = true;
  try {
    const [{ data: analysesData }, { data: exportsData }] = await Promise.all([
      axios.get("http://127.0.0.1:3020/api/analysis"),
      axios.get("http://127.0.0.1:3020/api/exports")
    ]);
    analyses.value = analysesData;
    exportsLog.value = exportsData;
    if (!form.analysisId && analysesData.length) {
      form.analysisId = analysesData[0].id;
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "导出数据加载失败");
  } finally {
    loading.value = false;
  }
}

async function createExport() {
  if (!form.analysisId) {
    ElMessage.warning("先选择一条分析结果");
    return;
  }
  creating.value = true;
  try {
    await axios.post("http://127.0.0.1:3020/api/exports", form);
    ElMessage.success("导出记录已创建");
    await loadPage();
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "导出失败");
  } finally {
    creating.value = false;
  }
}

onMounted(loadPage);
</script>

<template>
  <div class="career-stack">
    <section class="panel-card" v-loading="loading">
      <div class="panel-head wrap">
        <div>
          <h2>导出记录</h2>
          <p class="muted-text">把可用的匹配分析、项目亮点稿和面试题包整理成投递材料。</p>
        </div>
        <div class="upload-inline">
          <el-select v-model="form.analysisId" placeholder="选择分析结果" style="width: 240px">
            <el-option
              v-for="item in analyses"
              :key="item.id"
              :label="`${item.job_title} × ${item.candidate_name}`"
              :value="item.id"
            />
          </el-select>
          <el-select v-model="form.exportType" style="width: 180px">
            <el-option label="匹配报告" value="match_report" />
            <el-option label="项目亮点稿" value="project_pitch" />
            <el-option label="面试题包" value="interview_pack" />
          </el-select>
          <el-button type="primary" :loading="creating" @click="createExport">新增导出</el-button>
        </div>
      </div>

      <el-table :data="exportsLog" stripe>
        <el-table-column prop="job_title" label="岗位" min-width="220" />
        <el-table-column prop="candidate_name" label="候选人" width="140" />
        <el-table-column prop="export_type_label" label="导出类型" width="140" />
        <el-table-column prop="created_at" label="导出时间" width="180" />
      </el-table>
    </section>
  </div>
</template>
