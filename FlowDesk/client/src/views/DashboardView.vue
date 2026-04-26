<script setup>
import { computed, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import axios from "axios";

const loading = ref(true);
const overview = ref({
  tickets: 0,
  inReview: 0,
  approved: 0,
  done: 0,
  recentTickets: []
});

const stats = computed(() => [
  { label: "工单总量", value: overview.value.tickets, hint: "已进入系统的业务工单" },
  { label: "审批处理中", value: overview.value.inReview, hint: "当前处于审核流转中的工单" },
  { label: "已审批", value: overview.value.approved, hint: "已完成审核的工单数量" },
  { label: "已完成", value: overview.value.done, hint: "流转闭环完成的工单数量" }
]);

async function loadOverview() {
  loading.value = true;
  try {
    const { data } = await axios.get("http://127.0.0.1:3030/api/overview");
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
  <div class="flow-stack">
    <section v-loading="loading" class="hero-card">
      <p class="eyebrow">Business Workflow System</p>
      <h1>把工单提交、审批流转、责任交接和结果留痕，收进一个更像公司内部系统的协同平台。</h1>
      <p class="hero-copy">FlowDesk 面向真实业务流程场景，帮助团队把零散请求组织成可跟踪、可审批、可追责、可导出的标准化系统。</p>
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
          <h3>项目体现的能力</h3>
        </div>
        <div class="list-stack">
          <div class="list-item">工单状态流转设计</div>
          <div class="list-item">角色分工与审批链路</div>
          <div class="list-item">操作留痕与日志追踪</div>
          <div class="list-item">前后端分离与业务建模</div>
        </div>
      </article>

      <article class="panel-card">
        <div class="panel-head">
          <h3>面试时可以怎么讲</h3>
        </div>
        <p class="muted-text">这个项目重点不是页面数量，而是业务流程是否成立。我把提交、审核、打回、转交、完成这些动作做成了可追踪的状态流转，并保留审批记录和导出结果，更接近公司里的真实业务系统。</p>
      </article>

      <article class="panel-card panel-span">
        <div class="panel-head">
          <h3>最近工单</h3>
          <span class="muted-text">方便展示真实业务流</span>
        </div>
        <div class="list-stack">
          <div v-for="ticket in overview.recentTickets" :key="ticket.id" class="list-item list-row">
            <div>
              <strong>{{ ticket.code }} · {{ ticket.title }}</strong>
              <p class="muted-text">{{ ticket.department }} · {{ ticket.requester_name }}</p>
            </div>
            <el-tag :type="ticket.status === 'done' ? 'success' : ticket.status === 'approved' ? 'warning' : 'info'">
              {{ ticket.status_label }}
            </el-tag>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>
