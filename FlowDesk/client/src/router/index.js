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
        { path: "tickets", component: () => import("../views/TicketsView.vue") },
        { path: "approvals", component: () => import("../views/ApprovalsView.vue") },
        { path: "reports", component: () => import("../views/ReportsView.vue") }
      ]
    }
  ]
});

export default router;
