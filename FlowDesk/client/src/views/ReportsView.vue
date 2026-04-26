<script setup>
import { onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import axios from "axios";

const loading = ref(false);
const tickets = ref([]);
const exportLogs = ref([]);
const creating = ref(false);
const form = reactive({
  ticketId: "",
  exportType: "ticket_summary"
});

async function loadPage() {
  loading.value = true;
  try {
    const [{ data: ticketData }, { data: logData }] = await Promise.all([
      axios.get("http://127.0.0.1:3030/api/tickets"),
      axios.get("http://127.0.0.1:3030/api/reports")
    ]);
    tickets.value = ticketData;
    exportLogs.value = logData;
    if (!form.ticketId && ticketData.length) {
      form.ticketId = ticketData[0].id;
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "报表数据加载失败");
  } finally {
    loading.value = false;
  }
}

async function createExport() {
  if (!form.ticketId) {
    ElMessage.warning("先选择一条工单");
    return;
  }
  creating.value = true;
  try {
    await axios.post("http://127.0.0.1:3030/api/reports", form);
    ElMessage.success("报表导出记录已生成");
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
  <div class="flow-stack">
    <section class="panel-card" v-loading="loading">
      <div class="panel-head wrap">
        <div>
          <h2>统计报表</h2>
          <p class="muted-text">沉淀工单摘要、审批历史和交接说明的导出记录。</p>
        </div>
        <div class="upload-inline">
          <el-select v-model="form.ticketId" placeholder="选择工单" style="width: 240px">
            <el-option v-for="item in tickets" :key="item.id" :label="`${item.code} · ${item.title}`" :value="item.id" />
          </el-select>
          <el-select v-model="form.exportType" style="width: 180px">
            <el-option label="工单摘要" value="ticket_summary" />
            <el-option label="审批历史" value="approval_history" />
            <el-option label="交接说明" value="handover_note" />
          </el-select>
          <el-button type="primary" :loading="creating" @click="createExport">新增导出</el-button>
        </div>
      </div>

      <el-table :data="exportLogs" stripe>
        <el-table-column prop="code" label="工单编号" width="140" />
        <el-table-column prop="title" label="标题" min-width="220" />
        <el-table-column prop="export_type_label" label="导出类型" width="140" />
        <el-table-column prop="created_at" label="导出时间" width="180" />
      </el-table>
    </section>
  </div>
</template>
