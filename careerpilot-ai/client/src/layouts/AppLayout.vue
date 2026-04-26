<script setup>
import { Briefcase, DataBoard, Finished, Position, Tickets } from "@element-plus/icons-vue";
import { useRoute } from "vue-router";

const route = useRoute();
const navItems = [
  { label: "总览", path: "/dashboard", icon: DataBoard },
  { label: "岗位中心", path: "/jobs", icon: Briefcase },
  { label: "匹配分析", path: "/analysis", icon: Position },
  { label: "审核台", path: "/review", icon: Finished },
  { label: "导出记录", path: "/exports", icon: Tickets }
];
</script>

<template>
  <div class="career-shell">
    <aside class="career-sidebar">
      <div>
        <div class="career-brand">
          <span class="career-brand-mark">C</span>
          <div>
            <strong>CareerPilot AI</strong>
            <p>AI Job Application Workspace</p>
          </div>
        </div>

        <nav class="career-nav">
          <RouterLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="career-nav-item"
            :class="{ active: route.path === item.path }"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </RouterLink>
        </nav>
      </div>

      <div class="career-note">
        <p>围绕岗位 JD、简历匹配、项目改写与面试准备构建完整投递工作流。</p>
      </div>
    </aside>

    <main class="career-main">
      <RouterView />
    </main>
  </div>
</template>
