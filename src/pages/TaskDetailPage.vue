<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ArrowLeft, ClipboardCheck, CheckCircle2, AlertTriangle, FileText,
  Clock, User, Filter, Copy, X, MessageSquare, ChevronDown
} from 'lucide-vue-next';
import { useTaskStore } from '@/composables/useTaskStore';
import { CHECK_STATUS_LABELS, CHECK_STATUS_COLORS, CHECK_STATUS_TEXT_COLORS } from '@/types';
import type { CheckStatus, TaskCheckRecord, RainGear } from '@/types';
import { formatDateTime } from '@/utils/helpers';

const route = useRoute();
const router = useRouter();
const store = useTaskStore();

const showConclusionDialog = ref(false);
const conclusionText = ref('');
const copySuccess = ref(false);
const activeNoteRecordId = ref<number | null>(null);
const noteInput = ref('');
const activeStatusDropdown = ref<number | null>(null);

const taskId = computed(() => Number(route.params.id));

const {
  currentTask,
  checkRecords,
  gears,
  isLoading,
  statusFilter,
  filteredCheckRecords,
  totalCount,
  confirmedCount,
  needsActionCount,
  uncheckedCount,
  isAllChecked,
  progressPercent,
  recentActionRecords,
  isOverdue,
  loadTaskDetail,
  updateCheckStatus,
  updateActionNote,
  getGearForRecord,
  generateConclusion,
  generateConclusionText,
  setStatusFilter,
  completeTask,
} = store;

const getGear = (record: TaskCheckRecord): RainGear | undefined => {
  return getGearForRecord(record);
};

const isGap = (gear: RainGear): boolean => {
  return gear.quantity < gear.minStock && gear.status !== 'closed';
};

const handleQuickMark = async (recordId: number, status: CheckStatus) => {
  await updateCheckStatus(recordId, status);
  activeStatusDropdown.value = null;
};

const handleOpenNote = (recordId: number) => {
  const record = checkRecords.value.find(r => r.id === recordId);
  if (record) {
    activeNoteRecordId.value = recordId;
    noteInput.value = record.actionNote;
  }
};

const handleSaveNote = async () => {
  if (activeNoteRecordId.value !== null) {
    await updateActionNote(activeNoteRecordId.value, noteInput.value);
    activeNoteRecordId.value = null;
    noteInput.value = '';
  }
};

const handleGenerateConclusion = () => {
  const conclusion = generateConclusion();
  if (!conclusion) return;
  conclusionText.value = generateConclusionText(conclusion);
  showConclusionDialog.value = true;
};

const handleCopyConclusion = async () => {
  try {
    await navigator.clipboard.writeText(conclusionText.value);
    copySuccess.value = true;
    setTimeout(() => { copySuccess.value = false; }, 2000);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = conclusionText.value;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    copySuccess.value = true;
    setTimeout(() => { copySuccess.value = false; }, 2000);
  }
};

const handleCompleteTask = async () => {
  if (!currentTask.value) return;
  await completeTask(currentTask.value.id);
};

const filterTabs: { key: CheckStatus | 'all'; label: string; color: string }[] = [
  { key: 'all', label: '全部', color: 'text-gray-300' },
  { key: 'unchecked', label: '未核对', color: CHECK_STATUS_TEXT_COLORS.unchecked },
  { key: 'confirmed', label: '已确认', color: CHECK_STATUS_TEXT_COLORS.confirmed },
  { key: 'needsAction', label: '需处理', color: CHECK_STATUS_TEXT_COLORS.needsAction },
];

onMounted(() => {
  loadTaskDetail(taskId.value);
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
    <div class="max-w-[1600px] mx-auto px-4 py-6">
      <header class="mb-6">
        <div class="flex items-center gap-3 mb-2">
          <button
            class="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all"
            @click="router.push('/tasks')"
          >
            <ArrowLeft class="w-5 h-5" />
          </button>
          <div class="p-2 bg-violet-500/20 rounded-xl">
            <ClipboardCheck class="w-8 h-8 text-violet-400" />
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-bold text-white">{{ currentTask?.name || '加载中...' }}</h1>
              <span
                v-if="currentTask?.status === 'completed'"
                class="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium"
              >
                <CheckCircle2 class="w-3 h-3" />
                已完成
              </span>
              <span
                v-else-if="currentTask && isOverdue(currentTask)"
                class="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-medium animate-pulse"
              >
                <AlertTriangle class="w-3 h-3" />
                已逾期
              </span>
            </div>
            <p class="text-sm text-gray-400">{{ currentTask?.scope || '' }}</p>
          </div>
          <div v-if="currentTask" class="flex items-center gap-2">
            <button
              v-if="isAllChecked && currentTask.status !== 'completed'"
              class="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-emerald-500/20"
              @click="handleCompleteTask"
            >
              <CheckCircle2 class="w-4 h-4" />
              完成任务
            </button>
            <button
              v-if="isAllChecked"
              class="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-violet-500/20"
              @click="handleGenerateConclusion"
            >
              <FileText class="w-4 h-4" />
              生成盘点结论
            </button>
          </div>
        </div>
      </header>

      <div v-if="currentTask" class="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        <div class="bg-gradient-to-br from-gray-800/60 to-gray-800/30 border border-gray-700/50 rounded-xl p-5">
          <div class="flex items-center gap-2 text-gray-400 mb-2">
            <ClipboardCheck class="w-5 h-5" />
            <span class="text-sm font-medium">总记录数</span>
          </div>
          <div class="text-3xl font-bold text-white">{{ totalCount }}</div>
        </div>

        <div class="bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border border-emerald-500/30 rounded-xl p-5">
          <div class="flex items-center gap-2 text-emerald-400 mb-2">
            <CheckCircle2 class="w-5 h-5" />
            <span class="text-sm font-medium">已确认</span>
          </div>
          <div class="text-3xl font-bold text-white">{{ confirmedCount }}</div>
          <div class="mt-2 w-full bg-gray-700 rounded-full h-1.5">
            <div
              class="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              :style="{ width: `${totalCount > 0 ? (confirmedCount / totalCount * 100) : 0}%` }"
            />
          </div>
        </div>

        <div class="bg-gradient-to-br from-red-900/40 to-red-800/20 border border-red-500/30 rounded-xl p-5">
          <div class="flex items-center gap-2 text-red-400 mb-2">
            <AlertTriangle class="w-5 h-5" />
            <span class="text-sm font-medium">需处理</span>
          </div>
          <div class="text-3xl font-bold text-white">{{ needsActionCount }}</div>
        </div>

        <div class="bg-gradient-to-br from-gray-800/60 to-gray-800/30 border border-gray-700/50 rounded-xl p-5">
          <div class="flex items-center gap-2 text-gray-400 mb-2">
            <span class="text-sm font-medium">核对进度</span>
          </div>
          <div class="text-3xl font-bold text-white">{{ progressPercent }}%</div>
          <div class="mt-2 w-full bg-gray-700 rounded-full h-1.5">
            <div
              class="bg-violet-500 h-1.5 rounded-full transition-all duration-500"
              :style="{ width: `${progressPercent}%` }"
            />
          </div>
        </div>

        <div class="bg-gradient-to-br from-gray-800/60 to-gray-800/30 border border-gray-700/50 rounded-xl p-5">
          <div class="flex items-center gap-2 text-sky-400 mb-2">
            <Clock class="w-5 h-5" />
            <span class="text-sm font-medium">任务信息</span>
          </div>
          <div class="space-y-1 text-xs">
            <div class="flex items-center gap-1 text-gray-400">
              <User class="w-3.5 h-3.5" />
              <span>{{ currentTask.responsiblePerson || '未指定' }}</span>
            </div>
            <div class="flex items-center gap-1 text-gray-400">
              <Clock class="w-3.5 h-3.5" />
              <span>截止 {{ currentTask.plannedCompletionTime.slice(0, 16) }}</span>
            </div>
            <div v-if="currentTask.status !== 'completed' && isOverdue(currentTask)" class="flex items-center gap-1 text-red-400">
              <AlertTriangle class="w-3.5 h-3.5" />
              <span>已逾期</span>
            </div>
          </div>
          <div v-if="recentActionRecords.length > 0" class="mt-2 pt-2 border-t border-gray-700/50">
            <div class="text-xs text-gray-500 mb-1">最近处理：</div>
            <div
              v-for="rec in recentActionRecords.slice(0, 3)"
              :key="rec.id"
              class="text-xs text-gray-400 py-0.5"
            >
              {{ getGear(rec)?.cabinetNo || '-' }} · {{ formatDateTime(rec.checkedAt) }}
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 mb-4">
        <Filter class="w-4 h-4 text-gray-400" />
        <div class="flex items-center gap-1">
          <button
            v-for="tab in filterTabs"
            :key="tab.key"
            class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            :class="statusFilter === tab.key
              ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 border border-transparent'"
            @click="setStatusFilter(tab.key)"
          >
            {{ tab.label }}
            <span
              v-if="tab.key === 'all'"
              class="ml-1 text-xs opacity-70"
            >({{ totalCount }})</span>
            <span v-else-if="tab.key === 'unchecked'" class="ml-1 text-xs opacity-70">({{ uncheckedCount }})</span>
            <span v-else-if="tab.key === 'confirmed'" class="ml-1 text-xs opacity-70">({{ confirmedCount }})</span>
            <span v-else-if="tab.key === 'needsAction'" class="ml-1 text-xs opacity-70">({{ needsActionCount }})</span>
          </button>
        </div>
      </div>

      <div v-if="isLoading" class="text-center py-20 text-gray-400">
        加载中...
      </div>

      <div v-else-if="filteredCheckRecords.length === 0" class="text-center py-16">
        <div class="text-gray-500 mb-2">
          {{ statusFilter === 'all' ? '暂无雨具记录，请先在首页添加记录' : '当前筛选下无记录' }}
        </div>
      </div>

      <div v-else class="bg-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-gray-800/80 border-b border-gray-700/80">
                <th class="px-3 py-3 w-28 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">柜位</th>
                <th class="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">名称</th>
                <th class="px-3 py-3 w-20 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">数量</th>
                <th class="px-3 py-3 w-20 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">最低</th>
                <th class="px-3 py-3 w-24 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">雨具状态</th>
                <th class="px-3 py-3 w-24 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">责任人</th>
                <th class="px-3 py-3 w-36 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">核对结果</th>
                <th class="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">处理备注</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="record in filteredCheckRecords"
                :key="record.id"
                class="border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors"
              >
                <td class="px-3 py-3">
                  <span class="font-mono text-sm text-gray-200">{{ getGear(record)?.cabinetNo || '-' }}</span>
                </td>
                <td class="px-3 py-3">
                  <span class="text-sm text-gray-200">{{ getGear(record)?.name || '未命名' }}</span>
                  <span v-if="getGear(record) && isGap(getGear(record)!)" class="ml-1 text-xs text-red-400">(缺口)</span>
                </td>
                <td class="px-3 py-3 text-center">
                  <span class="text-sm" :class="getGear(record) && isGap(getGear(record)!) ? 'text-red-400' : 'text-gray-300'">
                    {{ getGear(record)?.quantity ?? '-' }}
                  </span>
                </td>
                <td class="px-3 py-3 text-center">
                  <span class="text-sm text-gray-400">{{ getGear(record)?.minStock ?? '-' }}</span>
                </td>
                <td class="px-3 py-3">
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                    :class="{
                      'bg-sky-500/20 text-sky-400': getGear(record)?.status === 'available',
                      'bg-orange-500/20 text-orange-400': getGear(record)?.status === 'needRefill',
                      'bg-blue-500/20 text-blue-400': getGear(record)?.status === 'needClean',
                      'bg-gray-500/20 text-gray-400': getGear(record)?.status === 'closed',
                    }"
                  >
                    {{ getGear(record) ? { available: '可使用', needRefill: '待补充', needClean: '待清洁', closed: '暂不开放' }[getGear(record)!.status] : '-' }}
                  </span>
                </td>
                <td class="px-3 py-3">
                  <span class="text-sm text-gray-300">{{ getGear(record)?.responsiblePerson || '-' }}</span>
                </td>
                <td class="px-3 py-3">
                  <div class="relative flex items-center justify-center">
                    <button
                      class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                      :class="{
                        'bg-gray-700/50 text-gray-400 border-gray-600 hover:border-gray-500': record.checkStatus === 'unchecked',
                        'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:border-emerald-400/50': record.checkStatus === 'confirmed',
                        'bg-red-500/20 text-red-400 border-red-500/30 hover:border-red-400/50': record.checkStatus === 'needsAction',
                      }"
                      @click="activeStatusDropdown = activeStatusDropdown === record.id ? null : record.id"
                    >
                      <span class="w-1.5 h-1.5 rounded-full" :class="CHECK_STATUS_COLORS[record.checkStatus]" />
                      {{ CHECK_STATUS_LABELS[record.checkStatus] }}
                      <ChevronDown class="w-3 h-3 opacity-60" />
                    </button>
                    <div
                      v-if="activeStatusDropdown === record.id"
                      class="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-20 py-1 min-w-[100px]"
                    >
                      <button
                        v-for="s in (['unchecked', 'confirmed', 'needsAction'] as CheckStatus[])"
                        :key="s"
                        class="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 transition-colors flex items-center gap-2"
                        :class="CHECK_STATUS_TEXT_COLORS[s]"
                        @click="handleQuickMark(record.id, s)"
                      >
                        <span class="w-1.5 h-1.5 rounded-full" :class="CHECK_STATUS_COLORS[s]" />
                        {{ CHECK_STATUS_LABELS[s] }}
                      </button>
                    </div>
                  </div>
                </td>
                <td class="px-3 py-3">
                  <div v-if="activeNoteRecordId === record.id" class="flex items-center gap-1">
                    <input
                      v-model="noteInput"
                      type="text"
                      placeholder="填写处理备注..."
                      class="flex-1 px-2 py-1 bg-gray-900/50 border border-gray-600 rounded text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all min-w-[120px]"
                      @keyup.enter="handleSaveNote"
                      @keyup.escape="activeNoteRecordId = null"
                    />
                    <button
                      class="p-1 text-violet-400 hover:text-violet-300 transition-colors"
                      @click="handleSaveNote"
                    >
                      <CheckCircle2 class="w-3.5 h-3.5" />
                    </button>
                    <button
                      class="p-1 text-gray-400 hover:text-gray-200 transition-colors"
                      @click="activeNoteRecordId = null"
                    >
                      <X class="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div v-else class="flex items-center gap-1">
                    <span
                      v-if="record.actionNote"
                      class="text-xs text-gray-300 truncate max-w-[180px] cursor-pointer hover:text-violet-300 transition-colors"
                      @click="handleOpenNote(record.id)"
                    >
                      {{ record.actionNote }}
                    </span>
                    <button
                      v-else
                      class="flex items-center gap-1 text-xs text-gray-500 hover:text-violet-400 transition-colors"
                      @click="handleOpenNote(record.id)"
                    >
                      <MessageSquare class="w-3 h-3" />
                      添加备注
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        v-if="showConclusionDialog"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
        @click.self="showConclusionDialog = false"
      >
        <div class="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-white">盘点结论摘要</h3>
            <button
              class="p-1 text-gray-400 hover:text-gray-200 transition-colors"
              @click="showConclusionDialog = false"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
          <div class="flex-1 overflow-y-auto mb-4">
            <pre class="text-sm text-gray-200 whitespace-pre-wrap bg-gray-900/50 border border-gray-700 rounded-lg p-4 font-sans leading-relaxed">{{ conclusionText }}</pre>
          </div>
          <div class="flex items-center justify-between">
            <span v-if="copySuccess" class="text-sm text-emerald-400">已复制到剪贴板！</span>
            <span v-else />
            <div class="flex gap-3">
              <button
                class="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
                @click="showConclusionDialog = false"
              >
                关闭
              </button>
              <button
                class="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors"
                @click="handleCopyConclusion"
              >
                <Copy class="w-4 h-4" />
                复制内容
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="activeStatusDropdown !== null"
        class="fixed inset-0 z-10"
        @click="activeStatusDropdown = null"
      />

      <footer class="mt-6 text-center text-xs text-gray-500">
        <p>盘点数据基于当前雨具记录生成，核对后可一键生成结论摘要</p>
      </footer>
    </div>
  </div>
</template>
