<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import axios from "axios";

const loading = ref(false);
const uploading = ref(false);
const generatingId = ref(null);
const preview = ref(null);
const fileList = ref([]);
const form = reactive({
  title: ""
});
const documents = ref([]);

const statusMap = {
  uploaded: { label: "已上传", type: "info" },
  generated: { label: "已生成", type: "warning" },
  reviewed: { label: "已审核", type: "success" }
};

const uploadHint = computed(() => {
  if (!fileList.value.length) {
    return "支持上传 PDF / TXT 文档。上传后可以生成摘要、行动项、PRD 初稿和测试点。";
  }
  const file = fileList.value[0];
  return `已选择：${file.name}`;
});

async function loadDocuments() {
  loading.value = true;
  try {
    const { data } = await axios.get("http://127.0.0.1:3010/api/documents");
    documents.value = data;
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "文档加载失败");
  } finally {
    loading.value = false;
  }
}

function handleFileChange(_file, files) {
  fileList.value = files.slice(-1);
}

async function submitUpload() {
  if (!fileList.value.length) {
    ElMessage.warning("先选择一个文档文件");
    return;
  }

  uploading.value = true;
  try {
    const body = new FormData();
    body.append("file", fileList.value[0].raw);
    body.append("title", form.title);
    await axios.post("http://127.0.0.1:3010/api/documents/upload", body);
    form.title = "";
    fileList.value = [];
    ElMessage.success("文档上传成功");
    await loadDocuments();
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "上传失败");
  } finally {
    uploading.value = false;
  }
}

async function generateOutput(row) {
  generatingId.value = row.id;
  try {
    await axios.post(`http://127.0.0.1:3010/api/documents/${row.id}/generate`);
    ElMessage.success("AI 结果已生成");
    await loadDocuments();
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "生成失败");
  } finally {
    generatingId.value = null;
  }
}

async function openPreview(row) {
  try {
    const { data } = await axios.get(`http://127.0.0.1:3010/api/documents/${row.id}`);
    preview.value = data;
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "结果加载失败");
  }
}

onMounted(loadDocuments);
</script>

<template>
  <div class="dp-stack">
    <section class="panel-card">
      <div class="panel-head wrap">
        <div>
          <h2>文档中心</h2>
          <p class="muted-text">上传原始文档，统一进入 AI 处理链路。</p>
        </div>
        <div class="upload-inline">
          <el-input v-model="form.title" placeholder="可选：自定义文档标题" class="upload-title" />
          <el-upload
            :auto-upload="false"
            :show-file-list="true"
            :limit="1"
            :on-change="handleFileChange"
            :file-list="fileList"
          >
            <el-button>选择文件</el-button>
          </el-upload>
          <el-button type="primary" :loading="uploading" @click="submitUpload">上传文档</el-button>
        </div>
        <div class="upload-note">{{ uploadHint }}</div>
      </div>

      <el-table v-loading="loading" :data="documents" stripe>
        <el-table-column prop="title" label="文档名称" min-width="260" />
        <el-table-column label="状态" width="140">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status]?.type || 'info'">
              {{ statusMap[row.status]?.label || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="owner" label="上传人" width="140" />
        <el-table-column prop="updated_at" label="更新时间" width="180" />
        <el-table-column label="操作" width="220">
          <template #default="{ row }">
            <el-button link type="primary" @click="openPreview(row)">查看结果</el-button>
            <el-button link :loading="generatingId === row.id" @click="generateOutput(row)">生成内容</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section v-if="preview" class="panel-card">
      <div class="panel-head">
        <div>
          <h3>{{ preview.document.title }}</h3>
          <p class="muted-text">{{ preview.document.source_name }} · {{ preview.document.updated_at }}</p>
        </div>
        <el-tag>{{ statusMap[preview.document.status]?.label || preview.document.status }}</el-tag>
      </div>
      <div class="review-grid">
        <article class="review-block">
          <h4>摘要</h4>
          <p>{{ preview.output?.summary || "还没有生成结果" }}</p>
        </article>
        <article class="review-block">
          <h4>行动项</h4>
          <pre class="plain-pre">{{ preview.output?.action_items || "还没有生成结果" }}</pre>
        </article>
        <article class="review-block">
          <h4>PRD 初稿</h4>
          <pre class="plain-pre">{{ preview.output?.prd_draft || "还没有生成结果" }}</pre>
        </article>
        <article class="review-block">
          <h4>测试点</h4>
          <pre class="plain-pre">{{ preview.output?.test_points || "还没有生成结果" }}</pre>
        </article>
      </div>
    </section>
  </div>
</template>
