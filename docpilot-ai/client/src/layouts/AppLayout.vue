<script setup>
import { DataBoard, Document, Download, Finished } from "@element-plus/icons-vue";
import { useRoute } from "vue-router";

const route = useRoute();
const items = [
  { label: "概览", path: "/overview", icon: DataBoard },
  { label: "文档中心", path: "/documents", icon: Document },
  { label: "审核台", path: "/review", icon: Finished },
  { label: "导出记录", path: "/exports", icon: Download }
];
</script>

<template>
  <div class="dp-shell">
    <aside class="dp-sidebar">
      <div>
        <div class="dp-brand">
          <span class="dp-brand-mark">D</span>
          <div>
            <strong>DocPilot AI</strong>
            <p>AI Document Workspace</p>
          </div>
        </div>

        <nav class="dp-nav">
          <RouterLink
            v-for="item in items"
            :key="item.path"
            :to="item.path"
            class="dp-nav-item"
            :class="{ active: route.path === item.path }"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </RouterLink>
        </nav>
      </div>

      <div class="dp-note">
        <p>围绕上传、生成、审核、导出的 AI 协同工作流。</p>
      </div>
    </aside>

    <main class="dp-main">
      <RouterView />
    </main>
  </div>
</template>
