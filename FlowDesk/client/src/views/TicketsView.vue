<script setup>
import { onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import axios from "axios";

const loading = ref(false);
const saving = ref(false);
const tickets = ref([]);
const categories = ref([]);
const preview = ref(null);
const form = reactive({
  title: "",
  categoryId: "",
  priority: "medium",
  requesterName: "",
  department: "",
  description: ""
});

const statusMap = {
  pending: { label: "待处理", type: "info" },
  in_review: { label: "审批中", type: "warning" },
  approved: { label: "已审批", type: "success" },
  rejected: { label: "已驳回", type: "danger" },
  done: { label: "已完成", type: "success" }
};

async function loadPage() {
  loading.value = true;
  try {
    const [{ data: ticketData }, { data: categoryData }] = await Promise.all([
      axios.get("http://127.0.0.1:3030/api/tickets"),
      axios.get("http://127.0.0.1:3030/api/categories")
    ]);
    tickets.value = ticketData;
    categories.value = categoryData;
    if (!form.categoryId && categoryData.length) {
      form.categoryId = categoryData[0].id;
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "工单数据加载失败");
  } finally {
    loading.value = false;
  }
}

async function createTicket() {
  saving.value = true;
  try {
    await axios.post("http://127.0.0.1:3030/api/tickets", form);
    Object.keys(form).forEach((key) => {
      form[key] = key === "priority" ? "medium" : "";
    });
    ElMessage.success("工单已创建");
    await loadPage();
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "创建失败");
  } finally {
    saving.value = false;
  }
}

async function openTicket(row) {
  try {
    const { data } = await axios.get(`http://127.0.0.1:3030/api/tickets/${row.id}`);
    preview.value = data;
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "工单详情加载失败");
  }
}

onMounted(loadPage);
</script>

<template>
  <div class="flow-stack">
    <section class="panel-card">
      <div class="panel-head wrap">
        <div>
          <h2>工单中心</h2>
          <p class="muted-text">创建业务工单并进入审批流转。</p>
        </div>
        <el-button type="primary" :loading="saving" @click="createTicket">提交工单</el-button>
      </div>

      <div class="form-grid">
        <div class="review-block">
          <h3>基础信息</h3>
          <el-input v-model="form.title" placeholder="工单标题" />
          <el-select v-model="form.categoryId" placeholder="工单分类">
            <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
          <el-select v-model="form.priority">
            <el-option label="低" value="low" />
            <el-option label="中" value="medium" />
            <el-option label="高" value="high" />
            <el-option label="紧急" value="urgent" />
          </el-select>
        </div>

        <div class="review-block">
          <h3>提交信息</h3>
          <el-input v-model="form.requesterName" placeholder="申请人" />
          <el-input v-model="form.department" placeholder="所属部门" />
          <el-input v-model="form.description" type="textarea" :rows="7" placeholder="描述业务背景、诉求和交付预期" />
        </div>
      </div>
    </section>

    <section class="panel-card">
      <el-table v-loading="loading" :data="tickets" stripe>
        <el-table-column prop="code" label="工单编号" width="140" />
        <el-table-column prop="title" label="标题" min-width="240" />
        <el-table-column prop="category_name" label="分类" width="120" />
        <el-table-column prop="requester_name" label="申请人" width="120" />
        <el-table-column label="状态" width="140">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status]?.type || 'info'">
              {{ statusMap[row.status]?.label || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" width="180" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button link type="primary" @click="openTicket(row)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section v-if="preview" class="panel-card">
      <div class="panel-head">
        <div>
          <h3>{{ preview.ticket.code }} · {{ preview.ticket.title }}</h3>
          <p class="muted-text">{{ preview.ticket.department }} · {{ preview.ticket.requester_name }}</p>
        </div>
        <el-tag>{{ statusMap[preview.ticket.status]?.label || preview.ticket.status }}</el-tag>
      </div>
      <div class="review-grid">
        <article class="review-block">
          <h4>工单描述</h4>
          <p>{{ preview.ticket.description }}</p>
        </article>
        <article class="review-block">
          <h4>审批轨迹</h4>
          <pre class="plain-pre">{{ preview.timeline }}</pre>
        </article>
      </div>
    </section>
  </div>
</template>
