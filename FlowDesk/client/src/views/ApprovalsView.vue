<script setup>
import { onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import axios from "axios";

const loading = ref(false);
const saving = ref(false);
const approvals = ref([]);
const current = ref(null);
const form = reactive({
  action: "approved",
  note: ""
});

async function loadApprovals() {
  loading.value = true;
  try {
    const { data } = await axios.get("http://127.0.0.1:3030/api/approvals");
    approvals.value = data;
    if (!current.value && data.length) {
      current.value = data[0];
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "审批数据加载失败");
  } finally {
    loading.value = false;
  }
}

function selectItem(item) {
  current.value = item;
  form.action = "approved";
  form.note = "";
}

async function submitApproval() {
  if (!current.value) {
    ElMessage.warning("先选择一条审批任务");
    return;
  }

  saving.value = true;
  try {
    await axios.post(`http://127.0.0.1:3030/api/tickets/${current.value.id}/approve`, form);
    ElMessage.success("审批操作已记录");
    current.value = null;
    form.note = "";
    await loadApprovals();
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "审批失败");
  } finally {
    saving.value = false;
  }
}

onMounted(loadApprovals);
</script>

<template>
  <div class="flow-stack">
    <section class="panel-card" v-loading="loading">
      <div class="panel-head wrap">
        <div>
          <h2>审批台</h2>
          <p class="muted-text">处理待审核工单，记录通过、驳回、转交和完成动作。</p>
        </div>
        <el-select
          v-if="approvals.length"
          :model-value="current?.id"
          placeholder="选择待处理工单"
          style="width: 300px"
          @update:model-value="selectItem(approvals.find((item) => item.id === $event))"
        >
          <el-option v-for="item in approvals" :key="item.id" :label="`${item.code} · ${item.title}`" :value="item.id" />
        </el-select>
      </div>

      <div v-if="current" class="review-grid">
        <article class="review-block">
          <h3>工单摘要</h3>
          <p>{{ current.description }}</p>
        </article>
        <article class="review-block">
          <h3>审批动作</h3>
          <el-select v-model="form.action">
            <el-option label="通过" value="approved" />
            <el-option label="驳回" value="rejected" />
            <el-option label="转交" value="reassigned" />
            <el-option label="完成" value="completed" />
          </el-select>
          <el-input v-model="form.note" type="textarea" :rows="6" placeholder="填写审批备注、打回原因或交接说明" />
        </article>
      </div>
      <div v-else class="review-block muted-text">当前没有待处理的审批任务。</div>

      <div class="action-row">
        <el-button type="primary" :loading="saving" @click="submitApproval">提交审批</el-button>
      </div>
    </section>
  </div>
</template>
