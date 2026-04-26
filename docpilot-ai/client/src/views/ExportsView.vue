<script setup>
import { onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import axios from "axios";

const loading = ref(false);
const documents = ref([]);
const exportsLog = ref([]);
const creating = ref(false);
const form = reactive({
  documentId: "",
  exportType: "full_report"
});

const exportTypeOptions = [
  { label: "摘要", value: "summary" },
  { label: "PRD", value: "prd" },
  { label: "任务清单", value: "tasks" },
  { label: "完整报告", value: "full_report" }
];

async function loadPage() {
  loading.value = true;
  try {
    const [{ data: docs }, { data: exportsData }] = await Promise.all([
      axios.get("http://127.0.0.1:3010/api/documents"),
      axios.get("http://127.0.0.1:3010/api/exports")
    ]);
    documents.value = docs;
    exportsLog.value = exportsData;
    if (!form.documentId && docs.length) {
      form.documentId = docs[0].id;
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "导出记录加载失败");
  } finally {
    loading.value = false;
  }
}

async function createExport() {
  if (!form.documentId) {
    ElMessage.warning("先选择一个文档");
    return;
  }

  creating.value = true;
  try {
    await axios.post("http://127.0.0.1:3010/api/exports", form);
    ElMessage.success("已生成导出记录");
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
  <div class="dp-stack">
    <section class="panel-card" v-loading="loading">
      <div class="panel-head wrap">
        <div>
          <h2>导出记录</h2>
          <p class="muted-text">记录每次面向团队交付的结构化成果。</p>
        </div>
        <div class="upload-inline">
          <el-select v-model="form.documentId" placeholder="选择文档" style="width: 220px">
            <el-option v-for="item in documents" :key="item.id" :label="item.title" :value="item.id" />
          </el-select>
          <el-select v-model="form.exportType" style="width: 160px">
            <el-option v-for="item in exportTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-button type="primary" :loading="creating" @click="createExport">新增导出</el-button>
        </div>
      </div>
      <el-table :data="exportsLog" stripe>
        <el-table-column prop="name" label="文档" min-width="260" />
        <el-table-column prop="export_type_label" label="导出类型" width="180" />
        <el-table-column prop="created_at" label="导出时间" width="180" />
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button link type="primary">下载 {{ row.export_type_label }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>
  </div>
</template>
