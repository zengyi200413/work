<script setup>
import { computed, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import axios from "axios";

const loading = ref(false);
const saving = ref(false);
const reviews = ref([]);
const currentId = ref(null);
const reviewNotes = ref("");

const current = computed(() => reviews.value.find((item) => item.id === currentId.value) || null);

async function loadReviews() {
  loading.value = true;
  try {
    const { data } = await axios.get("http://127.0.0.1:3010/api/review");
    reviews.value = data;
    if (!currentId.value && data.length) {
      currentId.value = data[0].id;
      reviewNotes.value = data[0].review_notes || "";
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "审核数据加载失败");
  } finally {
    loading.value = false;
  }
}

function selectReview(item) {
  if (!item) return;
  currentId.value = item.id;
  reviewNotes.value = item.review_notes || "";
}

async function submitReview(reviewStatus) {
  if (!current.value) {
    ElMessage.warning("先选择一条审核任务");
    return;
  }

  saving.value = true;
  try {
    await axios.patch(`http://127.0.0.1:3010/api/review/${current.value.id}`, {
      reviewStatus,
      reviewNotes: reviewNotes.value
    });
    ElMessage.success(reviewStatus === "approved" ? "已通过审核" : "已标记为需修改");
    await loadReviews();
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "审核提交失败");
  } finally {
    saving.value = false;
  }
}

onMounted(loadReviews);
</script>

<template>
  <div class="dp-stack">
    <section class="panel-card" v-loading="loading">
      <div class="panel-head">
        <div>
          <h2>审核台</h2>
          <p class="muted-text">AI 负责初稿，人负责把关。</p>
        </div>
        <el-select
          v-if="reviews.length"
          :model-value="currentId"
          placeholder="选择待审核文档"
          style="width: 260px"
          @update:model-value="selectReview(reviews.find((item) => item.id === $event))"
        >
          <el-option v-for="item in reviews" :key="item.id" :label="item.title" :value="item.id" />
        </el-select>
      </div>

      <div v-if="current" class="review-grid">
        <article class="review-block">
          <h3>AI 生成摘要</h3>
          <p>{{ current.summary }}</p>
        </article>
        <article class="review-block">
          <h3>审核意见</h3>
          <el-input v-model="reviewNotes" type="textarea" :rows="8" placeholder="补充需要修改的点，或记录通过理由" />
        </article>
        <article class="review-block">
          <h3>行动项</h3>
          <pre class="plain-pre">{{ current.action_items }}</pre>
        </article>
        <article class="review-block">
          <h3>风险提示</h3>
          <pre class="plain-pre">{{ current.risk_notes }}</pre>
        </article>
      </div>
      <div v-else class="review-block muted-text">当前没有待审核内容，先去文档中心生成一条 AI 结果。</div>

      <div class="action-row">
        <el-button type="warning" :loading="saving" @click="submitReview('needs_revision')">标记需修改</el-button>
        <el-button type="success" :loading="saving" @click="submitReview('approved')">审核通过</el-button>
      </div>
    </section>
  </div>
</template>
