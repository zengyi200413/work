<script setup>
import { DataBoard, Document, Finished, Histogram } from "@element-plus/icons-vue";
import { useRoute } from "vue-router";

const route = useRoute();
const navItems = [
  { label: "总览", path: "/dashboard", icon: DataBoard },
  { label: "工单中心", path: "/tickets", icon: Document },
  { label: "审批台", path: "/approvals", icon: Finished },
  { label: "统计报表", path: "/reports", icon: Histogram }
];
</script>

<template>
  <div class="flow-shell">
    <aside class="flow-sidebar">
      <div>
        <div class="flow-brand">
          <span class="flow-brand-mark">F</span>
          <div>
            <strong>FlowDesk</strong>
            <p>Workflow & Approval Workspace</p>
          </div>
        </div>

        <nav class="flow-nav">
          <RouterLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="flow-nav-item"
            :class="{ active: route.path === item.path }"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </RouterLink>
        </nav>
      </div>

      <div class="flow-note">
        <p>围绕提交、审批、流转、完成构建真实业务协同链路。</p>
      </div>
    </aside>

    <main class="flow-main">
      <RouterView />
    </main>
  </div>
</template>
