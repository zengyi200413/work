import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      component: () => import("../layouts/AppLayout.vue"),
      children: [
        { path: "", redirect: "/dashboard" },
        { path: "dashboard", component: () => import("../views/DashboardView.vue") },
        { path: "jobs", component: () => import("../views/JobsView.vue") },
        { path: "analysis", component: () => import("../views/AnalysisView.vue") },
        { path: "review", component: () => import("../views/ReviewView.vue") },
        { path: "exports", component: () => import("../views/ExportsView.vue") }
      ]
    }
  ]
});

export default router;
