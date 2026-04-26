<script setup>
import { onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import axios from "axios";

const loading = ref(false);
const saving = ref(false);
const reviews = ref([]);
const current = ref(null);
const notes = ref("");

async function loadReviews() {
  loading.value = true;
  try {
    const { data } = await axios.get("http://127.0.0.1:3020/api/review");
    reviews.value = data;
    if (!current.value && data.length) {
      current.value = data[0];
      notes.value = data[0].review_notes || "";
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "审核数据加载失败");
  } finally {
    loading.value = false;
  }
}

function selectItem(item) {
  current.value = item;
  notes.value = item.review_notes || "";
}

async function submit(status) {
  if (!current.value) return;
  saving.value = true;
  try {
    await axios.patch(`http://127.0.0.1:3020/api/review/${current.value.id}`, {
      reviewStatus: status,
      reviewNotes: notes.value
    });
    ElMessage.success(status === "approved" ? "已审核通过" : "已标记为需修改");
    current.value = null;
    notes.value = "";
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
  <div class="career-stack">
    <section class="panel-card" v-loading="loading">
      <div class="panel-head wrap">
        <div>
          <h2>审核台</h2>
          <p class="muted-text">对 AI 生成的匹配分析、项目表达和面试题进行人工修订。</p>
        </div>
        <el-select
          v-if="reviews.length"
          :model-value="current?.id"
          placeholder="选择一条分析结果"
          style="width: 320px"
          @update:model-value="selectItem(reviews.find((item) => item.id === $event))"
        >
          <el-option v-for="item in reviews" :key="item.id" :label="`${item.job_title} × ${item.candidate_name}`" :value="item.id" />
        </el-select>
      </div>

      <div v-if="current" class="review-grid">
        <article class="review-block">
          <h3>匹配摘要</h3>
          <p>{{ current.match_summary }}</p>
        </article>
        <article class="review-block">
          <h3>审核备注</h3>
          <el-input v-model="notes" type="textarea" :rows="8" placeholder="记录需要改进的点，或说明通过原因" />
        </article>
        <article class="review-block">
          <h3>项目改写</h3>
          <pre class="plain-pre">{{ current.rewritten_project }}</pre>
        </article>
        <article class="review-block">
          <h3>模拟面试题</h3>
          <pre class="plain-pre">{{ current.interview_questions }}</pre>
        </article>
      </div>
      <div v-else class="review-block muted-text">还没有待审核结果，先去匹配分析页生成一条。</div>

      <div class="action-row">
        <el-button type="warning" :loading="saving" @click="submit('needs_revision')">标记需修改</el-button>
        <el-button type="success" :loading="saving" @click="submit('approved')">审核通过</el-button>
      </div>
    </section>
  </div>
</template>
