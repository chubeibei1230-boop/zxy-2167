<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import {
  Package,
  ArrowLeft,
  RefreshCw,
  Plus,
  Copy,
  Check,
  AlertTriangle,
  Trash2,
  Play,
  CheckCircle2,
  Search,
  X,
  ChevronRight,
  Clock,
  TrendingUp,
} from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { useRestockStore } from '@/composables/useRestockStore';
import {
  RESTOCK_STATUS_LABELS,
  RESTOCK_STATUS_COLORS,
  RESTOCK_STATUS_TEXT_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
} from '@/types';
import type { RestockStatus, RainGearStatus } from '@/types';
import { formatDateTime } from '@/utils/helpers';
import Empty from '@/components/Empty.vue';

const router = useRouter();
const store = useRestockStore();

const {
  restockRecords,
  gears,
  isLoading,
  selectedIds,
  filters,
  gapGears,
  pendingCount,
  processingCount,
  completedCount,
  overdueCount,
  totalPlannedQuantity,
  progressPercent,
  recentRecords,
  overdueRecords,
  filteredRecords,
  recordsWithGearInfo,
  allResponsiblePersons,
  isOverdue,
  getGear,
  loadData,
  addRecord,
  generateFromGaps,
  updateRecord,
  updateStatus,
  removeRecord,
  toggleSelect,
  selectAll,
  deselectAll,
  isAllSelected,
  batchUpdateStatus,
  batchRemove,
  setFilter,
  toggleStatusFilter,
  toggleGearStatusFilter,
  generateSummaryText,
} = store;

const editingId = ref<number | null>(null);
const copied = ref(false);
const showGapPicker = ref(false);

const editingForm = ref({
  plannedQuantity: 0,
  handler: '',
  note: '',
  estimatedCompletionTime: '',
});

const handleGenerateFromGaps = async () => {
  if (gapGears.value.length === 0) {
    alert('当前没有库存缺口项');
    return;
  }
  const count = await generateFromGaps();
  if (count > 0) {
    alert(`已生成 ${count} 条补货记录`);
  } else {
    alert('所有缺口项已有待处理/处理中的补货记录');
  }
};

const handleCopySummary = async () => {
  const text = generateSummaryText();
  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (e) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  }
};

const startEdit = (record: any) => {
  editingId.value = record.id;
  editingForm.value = {
    plannedQuantity: record.plannedQuantity,
    handler: record.handler,
    note: record.note,
    estimatedCompletionTime: record.estimatedCompletionTime
      ? record.estimatedCompletionTime.slice(0, 16)
      : '',
  };
};

const cancelEdit = () => {
  editingId.value = null;
};

const saveEdit = async (id: number) => {
  const updates: any = {
    plannedQuantity: editingForm.value.plannedQuantity,
    handler: editingForm.value.handler.trim(),
    note: editingForm.value.note.trim(),
    estimatedCompletionTime: editingForm.value.estimatedCompletionTime
      ? new Date(editingForm.value.estimatedCompletionTime).toISOString()
      : '',
  };
  await updateRecord(id, updates);
  editingId.value = null;
};

const handleStatusChange = async (id: number, status: RestockStatus) => {
  const statusText = RESTOCK_STATUS_LABELS[status];
  if (status === 'completed') {
    if (!confirm(`确认标记为"已完成"？将同步更新对应雨具的库存数量。`)) {
      return;
    }
  }
  await updateStatus(id, status);
};

const handleAddFromGap = async (gearId: number) => {
  await addRecord(gearId);
  showGapPicker.value = false;
};

const handleBatchStatus = async (status: RestockStatus) => {
  if (status === 'completed' && selectedIds.value.size > 0) {
    if (!window.confirm(`确认将选中的 ${selectedIds.value.size} 条记录标记为"已完成"？将同步更新对应雨具的库存数量。`)) {
      return;
    }
  }
  await batchUpdateStatus(status);
};

const handleBatchDelete = async () => {
  if (!window.confirm(`确认删除选中的 ${selectedIds.value.size} 条记录？`)) {
    return;
  }
  await batchRemove();
};

const handleDeleteRecord = async (id: number) => {
  if (window.confirm('确认删除此补货记录？')) {
    await removeRecord(id);
  }
};

const handleClearFilters = () => {
  setFilter('responsiblePerson', '');
  setFilter('cabinetNo', '');
  setFilter('statuses', []);
  setFilter('gearStatuses', []);
  setFilter('showOverdueOnly', false);
};

const formatDate = (iso: string) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('zh-CN');
};

const formatDateShort = (iso: string) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('zh-CN');
};

const availableGapGears = computed(() => {
  const existingGearIds = new Set(
    restockRecords.value.filter(r => r.status !== 'completed').map(r => r.gearId)
  );
  return gapGears.value.filter(g => !existingGearIds.has(g.id));
});

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
    <div class="max-w-[1600px] mx-auto px-4 py-6">
      <header class="mb-6">
        <div class="flex items-center gap-3 mb-2">
          <button
            class="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all"
            @click="router.push('/')"
          >
            <ArrowLeft class="w-5 h-5" />
          </button>
          <div class="p-2 bg-emerald-500/20 rounded-xl">
            <Package class="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-white">缺口补货闭环</h1>
            <p class="text-sm text-gray-400">从发现缺口到完成补货的完整闭环管理</p>
          </div>
          <div class="flex-1"></div>
          <button
            class="flex items-center gap-2 px-4 py-2 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 rounded-lg text-sm font-medium transition-all border border-sky-500/30 hover:border-sky-400/50"
            @click="handleGenerateFromGaps"
          >
            <RefreshCw class="w-4 h-4" />
            从缺口生成
          </button>
          <button
            class="relative flex items-center gap-2 px-4 py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 rounded-lg text-sm font-medium transition-all border border-violet-500/30 hover:border-violet-400/50"
            @click="showGapPicker = !showGapPicker"
          >
            <Plus class="w-4 h-4" />
            新增补货
            <div
              v-if="showGapPicker && availableGapGears.length > 0"
              class="absolute right-0 top-full mt-2 w-72 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              <div class="p-3 border-b border-gray-700">
                <div class="text-sm font-medium text-white mb-2">选择缺口项添加</div>
                <div class="text-xs text-gray-400">共 {{ availableGapGears.length }} 项可添加</div>
              </div>
              <div class="max-h-64 overflow-y-auto">
                <div
                  v-for="gear in availableGapGears"
                  :key="gear.id"
                  class="px-3 py-2 hover:bg-gray-700/50 cursor-pointer border-b border-gray-700/50 last:border-0 flex items-center justify-between gap-2"
                  @click="handleAddFromGap(gear.id)"
                >
                  <div class="min-w-0">
                    <div class="text-sm text-white flex items-center gap-2">
                      <span class="font-mono text-violet-300">[{{ gear.cabinetNo || '-' }}]</span>
                      <span class="truncate">{{ gear.name || '未命名' }}</span>
                    </div>
                    <div class="text-xs text-gray-400 mt-0.5">
                      当前 {{ gear.quantity }} / 最低 {{ gear.minStock }}，缺 {{ gear.minStock - gear.quantity }}
                    </div>
                  </div>
                  <Plus class="w-4 h-4 text-violet-400 shrink-0" />
                </div>
              </div>
              <div
                v-if="availableGapGears.length === 0"
                class="p-4 text-center text-gray-400 text-sm"
              >
                暂无可添加的缺口项
              </div>
            </div>
          </button>
          <button
            class="flex items-center gap-2 px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded-lg text-sm font-medium transition-all border border-amber-500/30 hover:border-amber-400/50"
            @click="handleCopySummary"
          >
            <component :is="copied ? Check : Copy" class="w-4 h-4" />
            {{ copied ? '已复制' : '复制汇总' }}
          </button>
        </div>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        <div
          class="bg-gradient-to-br from-orange-900/40 to-orange-800/20 border border-orange-500/30 rounded-xl p-5 cursor-pointer hover:border-orange-400/60 transition-all duration-300 group"
          :class="{ 'ring-2 ring-orange-500/50': filters.statuses.includes('pending') }"
          @click="toggleStatusFilter('pending')"
        >
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2 text-orange-400 mb-2">
                <Clock class="w-5 h-5" />
                <span class="text-sm font-medium">待处理</span>
              </div>
              <div class="text-3xl font-bold text-white mb-1 transition-transform group-hover:scale-110">
                {{ pendingCount }}
              </div>
              <div class="text-xs text-orange-300/70">
                条补货记录
              </div>
            </div>
            <ChevronRight class="w-5 h-5 text-orange-400/50 group-hover:text-orange-400 transition-colors" />
          </div>
        </div>

        <div
          class="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-500/30 rounded-xl p-5 cursor-pointer hover:border-blue-400/60 transition-all duration-300 group"
          :class="{ 'ring-2 ring-blue-500/50': filters.statuses.includes('processing') }"
          @click="toggleStatusFilter('processing')"
        >
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2 text-blue-400 mb-2">
                <Play class="w-5 h-5" />
                <span class="text-sm font-medium">处理中</span>
              </div>
              <div class="text-3xl font-bold text-white mb-1 transition-transform group-hover:scale-110">
                {{ processingCount }}
              </div>
              <div class="text-xs text-blue-300/70">
                条补货记录
              </div>
            </div>
            <ChevronRight class="w-5 h-5 text-blue-400/50 group-hover:text-blue-400 transition-colors" />
          </div>
        </div>

        <div
          class="bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border border-emerald-500/30 rounded-xl p-5 cursor-pointer hover:border-emerald-400/60 transition-all duration-300 group"
          :class="{ 'ring-2 ring-emerald-500/50': filters.statuses.includes('completed') }"
          @click="toggleStatusFilter('completed')"
        >
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2 text-emerald-400 mb-2">
                <CheckCircle2 class="w-5 h-5" />
                <span class="text-sm font-medium">已完成</span>
              </div>
              <div class="text-3xl font-bold text-white mb-1 transition-transform group-hover:scale-110">
                {{ completedCount }}
              </div>
              <div class="text-xs text-emerald-300/70">
                条补货记录
              </div>
            </div>
            <ChevronRight class="w-5 h-5 text-emerald-400/50 group-hover:text-emerald-400 transition-colors" />
          </div>
        </div>

        <div
          class="bg-gradient-to-br from-red-900/40 to-red-800/20 border border-red-500/30 rounded-xl p-5 cursor-pointer hover:border-red-400/60 transition-all duration-300 group"
          :class="{ 'ring-2 ring-red-500/50': filters.showOverdueOnly }"
          @click="setFilter('showOverdueOnly', !filters.showOverdueOnly)"
        >
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2 text-red-400 mb-2">
                <AlertTriangle class="w-5 h-5" />
                <span class="text-sm font-medium">逾期提醒</span>
              </div>
              <div class="text-3xl font-bold text-white mb-1 transition-transform group-hover:scale-110">
                {{ overdueCount }}
              </div>
              <div class="text-xs text-red-300/70">
                条已逾期
              </div>
            </div>
            <ChevronRight class="w-5 h-5 text-red-400/50 group-hover:text-red-400 transition-colors" />
          </div>
        </div>

        <div class="bg-gradient-to-br from-violet-900/40 to-violet-800/20 border border-violet-500/30 rounded-xl p-5 transition-all duration-300">
          <div class="flex items-start justify-between mb-3">
            <div>
              <div class="flex items-center gap-2 text-violet-400 mb-2">
                <TrendingUp class="w-5 h-5" />
                <span class="text-sm font-medium">补货进度</span>
              </div>
              <div class="text-3xl font-bold text-white mb-1">
                {{ progressPercent }}%
              </div>
              <div class="text-xs text-violet-300/70">
                计划补充 {{ totalPlannedQuantity }} 件
              </div>
            </div>
          </div>
          <div class="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
            <div
              class="bg-gradient-to-r from-violet-500 to-violet-400 h-full rounded-full transition-all duration-500"
              :style="{ width: `${progressPercent}%` }"
            ></div>
          </div>
        </div>
      </div>

      <div v-if="overdueRecords.length > 0 && !filters.showOverdueOnly" class="mb-6">
        <div class="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
          <div class="flex items-center gap-2 mb-3">
            <AlertTriangle class="w-5 h-5 text-red-400" />
            <span class="text-sm font-medium text-red-300">以下补货记录已逾期，请及时处理：</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="item in overdueRecords.slice(0, 8)"
              :key="item.id"
              class="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/40 rounded-lg text-sm"
            >
              <span class="font-mono text-red-300">[{{ getGear(item.gearId)?.cabinetNo || '-' }}]</span>
              <span class="text-red-200">{{ getGear(item.gearId)?.name || '未命名' }}</span>
              <span class="text-red-400 text-xs">
                逾期 {{ Math.ceil((Date.now() - new Date(item.estimatedCompletionTime).getTime()) / 86400000) }} 天
              </span>
            </div>
            <div
              v-if="overdueRecords.length > 8"
              class="inline-flex items-center px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400"
            >
              还有 {{ overdueRecords.length - 8 }} 项...
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div class="lg:col-span-3 space-y-4">
          <div class="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <div class="flex flex-wrap items-center gap-3">
              <div class="relative">
                <Search class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="搜索柜位..."
                  :value="filters.cabinetNo"
                  @input="(e: any) => setFilter('cabinetNo', e.target.value)"
                  class="w-40 pl-9 pr-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50"
                />
              </div>

              <select
                :value="filters.responsiblePerson"
                @change="(e: any) => setFilter('responsiblePerson', e.target.value)"
                class="px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50"
              >
                <option value="">全部责任人</option>
                <option v-for="p in allResponsiblePersons" :key="p" :value="p">{{ p }}</option>
              </select>

              <div class="flex items-center gap-1">
                <span class="text-xs text-gray-400 mr-1">补货状态:</span>
                <button
                  v-for="status in (['pending', 'processing', 'completed'] as RestockStatus[])"
                  :key="status"
                  class="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  :class="[
                    filters.statuses.includes(status)
                      ? `${RESTOCK_STATUS_COLORS[status]} text-white`
                      : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
                  ]"
                  @click="toggleStatusFilter(status)"
                >
                  {{ RESTOCK_STATUS_LABELS[status] }}
                </button>
              </div>

              <div class="flex items-center gap-1">
                <span class="text-xs text-gray-400 mr-1">雨具状态:</span>
                <button
                  v-for="status in (['available', 'needRefill', 'needClean', 'closed'] as RainGearStatus[])"
                  :key="status"
                  class="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  :class="[
                    filters.gearStatuses.includes(status)
                      ? `${STATUS_COLORS[status]} text-white`
                      : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
                  ]"
                  @click="toggleGearStatusFilter(status)"
                >
                  {{ STATUS_LABELS[status] }}
                </button>
              </div>

              <div class="flex-1"></div>

              <button
                v-if="filters.cabinetNo || filters.responsiblePerson || filters.statuses.length > 0 || filters.gearStatuses.length > 0 || filters.showOverdueOnly"
                class="px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg text-sm transition-all flex items-center gap-1"
                @click="handleClearFilters"
              >
                <X class="w-4 h-4" />
                清除筛选
              </button>
            </div>
          </div>

          <div
            v-if="selectedIds.size > 0"
            class="bg-violet-900/30 border border-violet-500/40 rounded-xl p-4"
          >
            <div class="flex flex-wrap items-center gap-3">
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  @change="isAllSelected ? deselectAll() : selectAll()"
                  class="w-4 h-4 rounded border-gray-500 bg-gray-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-gray-800"
                />
                <span class="text-sm text-violet-200">
                  已选 {{ selectedIds.size }} / {{ filteredRecords.length }} 项
                </span>
              </div>
              <div class="h-5 w-px bg-violet-500/30"></div>
              <button
                class="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 rounded-lg text-sm transition-all flex items-center gap-1 border border-orange-500/30"
                @click="handleBatchStatus('pending')"
              >
                <Clock class="w-3.5 h-3.5" />
                标记待处理
              </button>
              <button
                class="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg text-sm transition-all flex items-center gap-1 border border-blue-500/30"
                @click="handleBatchStatus('processing')"
              >
                <Play class="w-3.5 h-3.5" />
                标记处理中
              </button>
              <button
                class="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-sm transition-all flex items-center gap-1 border border-emerald-500/30"
                @click="handleBatchStatus('completed')"
              >
                <CheckCircle2 class="w-3.5 h-3.5" />
                标记已完成
              </button>
              <div class="flex-1"></div>
              <button
                class="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm transition-all flex items-center gap-1 border border-red-500/30"
                @click="handleBatchDelete"
              >
                <Trash2 class="w-3.5 h-3.5" />
                批量删除
              </button>
            </div>
          </div>

          <div class="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
            <div
              v-if="isLoading"
              class="p-12 text-center text-gray-400"
            >
              <RefreshCw class="w-8 h-8 mx-auto mb-3 animate-spin text-sky-400" />
              <p>加载中...</p>
            </div>

            <Empty
              v-else-if="recordsWithGearInfo.length === 0"
              title="暂无补货记录"
              description="点击上方「从缺口生成」或「新增补货」开始创建补货任务"
              icon="Package"
            />

            <div v-else class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-gray-700/50 bg-gray-800/30">
                    <th class="px-4 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        :checked="isAllSelected"
                        @change="isAllSelected ? deselectAll() : selectAll()"
                        class="w-4 h-4 rounded border-gray-500 bg-gray-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-gray-800"
                      />
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">柜位</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">名称</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">缺口/计划</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">当前库存</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">责任人</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">状态</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">预计完成</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-700/30">
                  <template v-for="{ record, gear, isOverdue: overdue } in recordsWithGearInfo" :key="record.id">
                    <tr
                      v-if="editingId !== record.id"
                      class="hover:bg-gray-700/30 transition-colors"
                      :class="{ 'bg-red-900/10': overdue }"
                    >
                      <td class="px-4 py-3">
                        <input
                          type="checkbox"
                          :checked="selectedIds.has(record.id)"
                          @change="toggleSelect(record.id)"
                          class="w-4 h-4 rounded border-gray-500 bg-gray-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-gray-800"
                        />
                      </td>
                      <td class="px-4 py-3">
                        <span class="font-mono text-sm text-sky-300">[{{ gear?.cabinetNo || '-' }}]</span>
                      </td>
                      <td class="px-4 py-3">
                        <div class="text-sm text-white">{{ gear?.name || '未命名' }}</div>
                        <div class="flex items-center gap-1.5 mt-1">
                          <span
                            class="inline-flex items-center px-1.5 py-0.5 rounded text-xs"
                            :class="[STATUS_COLORS[gear?.status || 'available'], 'text-white/90']"
                          >
                            {{ STATUS_LABELS[gear?.status || 'available'] }}
                          </span>
                          <span v-if="overdue" class="inline-flex items-center px-1.5 py-0.5 rounded bg-red-500 text-xs text-white">
                            已逾期
                          </span>
                        </div>
                      </td>
                      <td class="px-4 py-3">
                        <div class="text-sm">
                          <span class="text-red-400">缺{{ record.gapQuantity }}</span>
                          <span class="text-gray-500 mx-1">/</span>
                          <span class="text-violet-300">补{{ record.plannedQuantity }}</span>
                        </div>
                      </td>
                      <td class="px-4 py-3">
                        <div class="text-sm text-white">{{ gear?.quantity ?? 0 }}</div>
                        <div class="text-xs text-gray-500">最低 {{ gear?.minStock ?? 0 }}</div>
                      </td>
                      <td class="px-4 py-3">
                        <div class="text-sm text-gray-200">{{ record.handler || '未指定' }}</div>
                        <div v-if="record.note" class="text-xs text-gray-400 mt-0.5 max-w-[160px] truncate" :title="record.note">
                          {{ record.note }}
                        </div>
                      </td>
                      <td class="px-4 py-3">
                        <span
                          class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium"
                          :class="[RESTOCK_STATUS_COLORS[record.status], 'text-white']"
                        >
                          {{ RESTOCK_STATUS_LABELS[record.status] }}
                        </span>
                      </td>
                      <td class="px-4 py-3">
                        <div class="text-sm" :class="overdue ? 'text-red-400' : 'text-gray-300'">
                          {{ formatDateShort(record.estimatedCompletionTime) }}
                        </div>
                        <div v-if="record.status === 'completed'" class="text-xs text-emerald-400 mt-0.5">
                          完成: {{ formatDateShort(record.actualCompletionTime) }}
                        </div>
                      </td>
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-1">
                          <button
                            v-if="record.status !== 'processing' && record.status !== 'completed'"
                            class="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded transition-all"
                            title="标记处理中"
                            @click="handleStatusChange(record.id, 'processing')"
                          >
                            <Play class="w-4 h-4" />
                          </button>
                          <button
                            v-if="record.status !== 'completed'"
                            class="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 rounded transition-all"
                            title="标记已完成"
                            @click="handleStatusChange(record.id, 'completed')"
                          >
                            <CheckCircle2 class="w-4 h-4" />
                          </button>
                          <button
                            v-if="record.status !== 'pending'"
                            class="p-1.5 text-orange-400 hover:text-orange-300 hover:bg-orange-500/20 rounded transition-all"
                            title="标记待处理"
                            @click="handleStatusChange(record.id, 'pending')"
                          >
                            <Clock class="w-4 h-4" />
                          </button>
                          <button
                            class="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-500/20 rounded transition-all"
                            title="编辑"
                            @click="startEdit(record)"
                          >
                            <RefreshCw class="w-4 h-4" />
                          </button>
                          <button
                            class="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-all"
                            title="删除"
                            @click="handleDeleteRecord(record.id)"
                          >
                            <Trash2 class="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr v-else class="bg-violet-900/20">
                      <td class="px-4 py-3" colspan="9">
                        <div class="flex flex-wrap items-center gap-4">
                          <div class="flex items-center gap-2">
                            <span class="font-mono text-sm text-sky-300">[{{ gear?.cabinetNo || '-' }}]</span>
                            <span class="text-sm text-white">{{ gear?.name || '未命名' }}</span>
                            <span class="text-xs text-gray-400">缺口 {{ record.gapQuantity }} 件</span>
                          </div>
                          <div class="flex items-center gap-2">
                            <label class="text-xs text-gray-400">计划补充:</label>
                            <input
                              type="number"
                              min="0"
                              v-model.number="editingForm.plannedQuantity"
                              class="w-20 px-2 py-1.5 bg-gray-900 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-sky-500"
                            />
                            <label class="text-xs text-gray-400 ml-2">责任人:</label>
                            <input
                              type="text"
                              v-model="editingForm.handler"
                              placeholder="填写责任人"
                              class="w-32 px-2 py-1.5 bg-gray-900 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500"
                            />
                            <label class="text-xs text-gray-400 ml-2">预计完成:</label>
                            <input
                              type="datetime-local"
                              v-model="editingForm.estimatedCompletionTime"
                              class="px-2 py-1.5 bg-gray-900 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-sky-500"
                            />
                          </div>
                          <div class="flex items-center gap-2 flex-1 min-w-[200px]">
                            <label class="text-xs text-gray-400 shrink-0">处理说明:</label>
                            <input
                              type="text"
                              v-model="editingForm.note"
                              placeholder="填写处理说明..."
                              class="flex-1 px-2 py-1.5 bg-gray-900 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500"
                            />
                          </div>
                          <div class="flex items-center gap-2">
                            <button
                              class="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-sm transition-all flex items-center gap-1"
                              @click="saveEdit(record.id)"
                            >
                              <Check class="w-4 h-4" />
                              保存
                            </button>
                            <button
                              class="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm transition-all flex items-center gap-1"
                              @click="cancelEdit"
                            >
                              <X class="w-4 h-4" />
                              取消
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div class="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <div class="flex items-center gap-2 mb-4">
              <CheckCircle2 class="w-5 h-5 text-emerald-400" />
              <span class="text-sm font-medium text-white">最近完成记录</span>
            </div>
            <div v-if="recentRecords.length === 0" class="py-6 text-center text-gray-500 text-sm">
              暂无完成记录
            </div>
            <div v-else class="space-y-2 max-h-80 overflow-y-auto">
              <div
                v-for="record in recentRecords"
                :key="record.id"
                class="p-3 bg-gray-900/40 rounded-lg border border-gray-700/30"
              >
                <div class="flex items-center justify-between gap-2 mb-1">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="font-mono text-xs text-sky-300 shrink-0">[{{ getGear(record.gearId)?.cabinetNo || '-' }}]</span>
                    <span class="text-sm text-white truncate">{{ getGear(record.gearId)?.name || '未命名' }}</span>
                  </div>
                  <span class="text-xs text-emerald-400 shrink-0">+{{ record.plannedQuantity }}</span>
                </div>
                <div class="text-xs text-gray-500 flex items-center justify-between">
                  <span>{{ record.handler || '未指定责任人' }}</span>
                  <span>{{ formatDateTime(record.actualCompletionTime || record.updatedAt) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <div class="flex items-center gap-2 mb-4">
              <Package class="w-5 h-5 text-violet-400" />
              <span class="text-sm font-medium text-white">当前库存缺口</span>
            </div>
            <div v-if="gapGears.length === 0" class="py-6 text-center">
              <CheckCircle2 class="w-8 h-8 mx-auto mb-2 text-emerald-400" />
              <div class="text-sm text-emerald-300">所有柜位库存充足</div>
            </div>
            <div v-else class="space-y-2 max-h-80 overflow-y-auto">
              <div
                v-for="gear in gapGears.slice(0, 10)"
                :key="gear.id"
                class="p-3 bg-red-900/20 rounded-lg border border-red-500/20"
              >
                <div class="flex items-center justify-between gap-2 mb-1">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="font-mono text-xs text-red-300 shrink-0">[{{ gear.cabinetNo || '-' }}]</span>
                    <span class="text-sm text-white truncate">{{ gear.name || '未命名' }}</span>
                  </div>
                  <span class="text-xs text-red-400 shrink-0">缺{{ gear.minStock - gear.quantity }}</span>
                </div>
                <div class="text-xs text-gray-400 flex items-center justify-between">
                  <span>{{ gear.responsiblePerson || '未指定责任人' }}</span>
                  <span>{{ gear.quantity }}/{{ gear.minStock }}</span>
                </div>
              </div>
              <div
                v-if="gapGears.length > 10"
                class="text-center text-xs text-gray-500 py-2"
              >
                还有 {{ gapGears.length - 10 }} 项缺口...
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer class="mt-6 text-center text-xs text-gray-500">
        <p>数据存储于浏览器本地 IndexedDB，请定期导出备份</p>
      </footer>
    </div>
  </div>
</template>
