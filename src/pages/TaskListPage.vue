<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ClipboardList, Plus, ArrowLeft, Clock, User, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-vue-next';
import { useTaskStore } from '@/composables/useTaskStore';
import { formatDateTime } from '@/utils/helpers';

const router = useRouter();
const store = useTaskStore();

const showCreateDialog = ref(false);
const form = ref({
  name: '',
  scope: '',
  plannedCompletionTime: '',
  responsiblePerson: '',
});

const {
  tasks,
  isLoading,
  isOverdue,
  loadTasks,
  createTask,
  removeTask,
} = store;

const handleCreate = async () => {
  if (!form.value.name.trim() || !form.value.plannedCompletionTime) return;
  const taskId = await createTask(form.value);
  showCreateDialog.value = false;
  form.value = { name: '', scope: '', plannedCompletionTime: '', responsiblePerson: '' };
  router.push(`/tasks/${taskId}`);
};

const handleDelete = async (taskId: number) => {
  await removeTask(taskId);
};

const openCreateDialog = () => {
  const now = new Date();
  now.setDate(now.getDate() + 7);
  form.value.plannedCompletionTime = now.toISOString().slice(0, 16);
  showCreateDialog.value = true;
};

onMounted(() => {
  loadTasks();
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
    <div class="max-w-[1200px] mx-auto px-4 py-6">
      <header class="mb-6">
        <div class="flex items-center gap-3 mb-2">
          <button
            class="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all"
            @click="router.push('/')"
          >
            <ArrowLeft class="w-5 h-5" />
          </button>
          <div class="p-2 bg-violet-500/20 rounded-xl">
            <ClipboardList class="w-8 h-8 text-violet-400" />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-white">盘点任务闭环</h1>
            <p class="text-sm text-gray-400">创建盘点任务，跟踪核对进度，生成盘点结论</p>
          </div>
        </div>
      </header>

      <div class="flex items-center gap-3 mb-6">
        <button
          class="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30"
          @click="openCreateDialog"
        >
          <Plus class="w-4 h-4" />
          创建盘点任务
        </button>
      </div>

      <div v-if="isLoading" class="text-center py-20 text-gray-400">
        加载中...
      </div>

      <div v-else-if="tasks.length === 0" class="text-center py-20">
        <ClipboardList class="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <div class="text-lg text-gray-400 mb-2">暂无盘点任务</div>
        <div class="text-sm text-gray-500">点击"创建盘点任务"开始一次新的盘点</div>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="task in tasks"
          :key="task.id"
          class="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5 hover:border-violet-500/40 transition-all duration-300 cursor-pointer group"
          @click="router.push(`/tasks/${task.id}`)"
        >
          <div class="flex items-start justify-between mb-3">
            <h3 class="text-lg font-semibold text-white group-hover:text-violet-300 transition-colors">
              {{ task.name }}
            </h3>
            <div class="flex items-center gap-1">
              <span
                v-if="task.status === 'completed'"
                class="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium"
              >
                <CheckCircle2 class="w-3 h-3" />
                已完成
              </span>
              <span
                v-else-if="isOverdue(task)"
                class="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-medium"
              >
                <AlertTriangle class="w-3 h-3" />
                已逾期
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-500/20 text-sky-400 rounded text-xs font-medium"
              >
                进行中
              </span>
            </div>
          </div>

          <div v-if="task.scope" class="text-sm text-gray-400 mb-3 line-clamp-2">
            {{ task.scope }}
          </div>

          <div class="flex items-center gap-4 text-xs text-gray-500">
            <div class="flex items-center gap-1">
              <Clock class="w-3.5 h-3.5" />
              <span>{{ task.plannedCompletionTime.slice(0, 10) }}</span>
            </div>
            <div class="flex items-center gap-1">
              <User class="w-3.5 h-3.5" />
              <span>{{ task.responsiblePerson || '未指定' }}</span>
            </div>
          </div>

          <div class="mt-3 pt-3 border-t border-gray-700/50 flex items-center justify-between">
            <span class="text-xs text-gray-500">
              创建于 {{ formatDateTime(task.createdAt) }}
            </span>
            <button
              class="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
              @click.stop="handleDelete(task.id)"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="showCreateDialog"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
        @click.self="showCreateDialog = false"
      >
        <div class="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-lg shadow-2xl">
          <h3 class="text-lg font-semibold text-white mb-4">创建盘点任务</h3>

          <div class="space-y-4">
            <div>
              <label class="block text-sm text-gray-300 mb-1">任务名称 <span class="text-red-400">*</span></label>
              <input
                v-model="form.name"
                type="text"
                placeholder="例：6月份雨具柜盘点"
                class="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
              />
            </div>

            <div>
              <label class="block text-sm text-gray-300 mb-1">盘点范围说明</label>
              <textarea
                v-model="form.scope"
                placeholder="例：全区域所有雨具柜"
                rows="2"
                class="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all resize-none"
              />
            </div>

            <div>
              <label class="block text-sm text-gray-300 mb-1">计划完成时间 <span class="text-red-400">*</span></label>
              <input
                v-model="form.plannedCompletionTime"
                type="datetime-local"
                class="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
              />
            </div>

            <div>
              <label class="block text-sm text-gray-300 mb-1">负责人</label>
              <input
                v-model="form.responsiblePerson"
                type="text"
                placeholder="负责人姓名"
                class="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
              />
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button
              class="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
              @click="showCreateDialog = false"
            >
              取消
            </button>
            <button
              class="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!form.name.trim() || !form.plannedCompletionTime"
              @click="handleCreate"
            >
              创建并进入
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
