import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      component: () => import("../layouts/AppLayout.vue"),
      children: [
        { path: "", redirect: "/overview" },
        { path: "overview", component: () => import("../views/OverviewView.vue") },
        { path: "documents", component: () => import("../views/DocumentsView.vue") },
        { path: "review", component: () => import("../views/ReviewView.vue") },
        { path: "exports", component: () => import("../views/ExportsView.vue") }
      ]
    }
  ]
});

export default router;
