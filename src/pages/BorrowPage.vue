<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  Copy,
  Check,
  AlertTriangle,
  Trash2,
  Search,
  X,
  ChevronRight,
  Clock,
  Umbrella,
  User,
  Phone,
  FileText,
  CalendarClock,
  Undo2,
  ShieldAlert,
} from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { useBorrowStore } from '@/composables/useBorrowStore';
import {
  BORROW_STATUS_LABELS,
  BORROW_STATUS_COLORS,
  BORROW_STATUS_TEXT_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
} from '@/types';
import type { BorrowStatus } from '@/types';
import { formatDateTime } from '@/utils/helpers';
import Empty from '@/components/Empty.vue';

const router = useRouter();
const store = useBorrowStore();

const {
  borrowRecords,
  gears,
  isLoading,
  selectedIds,
  filters,
  availableGears,
  allBorrowers,
  pendingReturnCount,
  overdueCount,
  todayReturnCount,
  completedCount,
  lostCount,
  damagedCount,
  anomalyCount,
  overdueRecords,
  anomalyRecords,
  filteredRecords,
  recordsWithGearInfo,
  recentCompletedRecords,
  isOverdue,
  getGear,
  loadData,
  addRecord,
  returnRecord,
  markOverdue,
  removeRecord,
  toggleSelect,
  selectAll,
  deselectAll,
  isAllSelected,
  batchRemove,
  setFilter,
  toggleStatusFilter,
  generateSummaryText,
} = store;

const showBorrowForm = ref(false);
const showReturnForm = ref<number | null>(null);
const copied = ref(false);

const borrowForm = ref({
  gearId: 0,
  borrowQuantity: 1,
  borrower: '',
  contactInfo: '',
  purpose: '',
  expectedReturnTime: '',
});

const returnForm = ref({
  actualReturnQuantity: 0,
  damageNote: '',
  newStatus: 'returned' as BorrowStatus,
});

const resetBorrowForm = () => {
  borrowForm.value = {
    gearId: 0,
    borrowQuantity: 1,
    borrower: '',
    contactInfo: '',
    purpose: '',
    expectedReturnTime: '',
  };
};

const openBorrowForm = () => {
  resetBorrowForm();
  if (availableGears.value.length > 0) {
    borrowForm.value.gearId = availableGears.value[0].id;
  }
  showBorrowForm.value = true;
};

const handleBorrow = async () => {
  if (!borrowForm.value.gearId) {
    alert('请选择雨具');
    return;
  }
  if (!borrowForm.value.borrower.trim()) {
    alert('请填写借用人');
    return;
  }
  if (borrowForm.value.borrowQuantity < 1) {
    alert('借出数量至少为1');
    return;
  }
  const gear = getGear(borrowForm.value.gearId);
  if (gear && borrowForm.value.borrowQuantity > gear.quantity) {
    alert(`借出数量不能超过当前库存（${gear.quantity}件）`);
    return;
  }

  await addRecord(borrowForm.value.gearId, {
    borrowQuantity: borrowForm.value.borrowQuantity,
    borrower: borrowForm.value.borrower.trim(),
    contactInfo: borrowForm.value.contactInfo.trim(),
    purpose: borrowForm.value.purpose.trim(),
    expectedReturnTime: borrowForm.value.expectedReturnTime
      ? new Date(borrowForm.value.expectedReturnTime).toISOString()
      : '',
  });

  showBorrowForm.value = false;
  resetBorrowForm();
};

const openReturnForm = (recordId: number) => {
  const record = borrowRecords.value.find(r => r.id === recordId);
  if (!record) return;
  returnForm.value = {
    actualReturnQuantity: record.borrowQuantity,
    damageNote: '',
    newStatus: 'returned',
  };
  showReturnForm.value = recordId;
};

const handleReturn = async () => {
  if (showReturnForm.value === null) return;
  if (returnForm.value.actualReturnQuantity < 0) {
    alert('归还数量不能为负');
    return;
  }

  await returnRecord(showReturnForm.value, {
    actualReturnQuantity: returnForm.value.actualReturnQuantity,
    damageNote: returnForm.value.damageNote.trim(),
    newStatus: returnForm.value.newStatus,
  });

  showReturnForm.value = null;
};

const handleDeleteRecord = async (id: number) => {
  if (window.confirm('确认删除此借用记录？')) {
    await removeRecord(id);
  }
};

const handleBatchDelete = async () => {
  if (!window.confirm(`确认删除选中的 ${selectedIds.value.size} 条记录？`)) {
    return;
  }
  await batchRemove();
};

const handleCopySummary = async () => {
  const text = generateSummaryText();
  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  } catch (e) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  }
};

const handleClearFilters = () => {
  setFilter('cabinetNo', '');
  setFilter('borrower', '');
  setFilter('statuses', []);
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

const getOverdueDays = (record: any) => {
  if (!record.expectedReturnTime) return 0;
  return Math.ceil((Date.now() - new Date(record.expectedReturnTime).getTime()) / 86400000);
};

onMounted(async () => {
  await loadData();
  await markOverdue();
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
          <div class="p-2 bg-amber-500/20 rounded-xl">
            <Umbrella class="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-white">雨具借用归还闭环</h1>
            <p class="text-sm text-gray-400">借出登记、归还确认、异常追踪完整管理</p>
          </div>
          <div class="flex-1"></div>
          <button
            class="flex items-center gap-2 px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded-lg text-sm font-medium transition-all border border-amber-500/30 hover:border-amber-400/50"
            @click="openBorrowForm"
          >
            <Plus class="w-4 h-4" />
            登记借出
          </button>
          <button
            class="flex items-center gap-2 px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded-lg text-sm font-medium transition-all border border-amber-500/30 hover:border-amber-400/50"
            @click="markOverdue"
          >
            <Clock class="w-4 h-4" />
            刷新逾期
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

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div
          class="bg-gradient-to-br from-amber-900/40 to-amber-800/20 border border-amber-500/30 rounded-xl p-5 cursor-pointer hover:border-amber-400/60 transition-all duration-300 group"
          :class="{ 'ring-2 ring-amber-500/50': filters.statuses.includes('borrowed') }"
          @click="toggleStatusFilter('borrowed')"
        >
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2 text-amber-400 mb-2">
                <Undo2 class="w-5 h-5" />
                <span class="text-sm font-medium">待归还</span>
              </div>
              <div class="text-3xl font-bold text-white mb-1 transition-transform group-hover:scale-110">
                {{ pendingReturnCount }}
              </div>
              <div class="text-xs text-amber-300/70">条借出记录</div>
            </div>
            <ChevronRight class="w-5 h-5 text-amber-400/50 group-hover:text-amber-400 transition-colors" />
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
                <span class="text-sm font-medium">已逾期</span>
              </div>
              <div class="text-3xl font-bold text-white mb-1 transition-transform group-hover:scale-110">
                {{ overdueCount }}
              </div>
              <div class="text-xs text-red-300/70">条逾期未还</div>
            </div>
            <ChevronRight class="w-5 h-5 text-red-400/50 group-hover:text-red-400 transition-colors" />
          </div>
        </div>

        <div
          class="bg-gradient-to-br from-sky-900/40 to-sky-800/20 border border-sky-500/30 rounded-xl p-5 transition-all duration-300 group"
        >
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2 text-sky-400 mb-2">
                <CalendarClock class="w-5 h-5" />
                <span class="text-sm font-medium">今日归还</span>
              </div>
              <div class="text-3xl font-bold text-white mb-1 transition-transform group-hover:scale-110">
                {{ todayReturnCount }}
              </div>
              <div class="text-xs text-sky-300/70">条预计今日</div>
            </div>
          </div>
        </div>

        <div
          class="bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border border-emerald-500/30 rounded-xl p-5 cursor-pointer hover:border-emerald-400/60 transition-all duration-300 group"
          :class="{ 'ring-2 ring-emerald-500/50': filters.statuses.includes('returned') }"
          @click="toggleStatusFilter('returned')"
        >
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2 text-emerald-400 mb-2">
                <Check class="w-5 h-5" />
                <span class="text-sm font-medium">已完成</span>
              </div>
              <div class="text-3xl font-bold text-white mb-1 transition-transform group-hover:scale-110">
                {{ completedCount }}
              </div>
              <div class="text-xs text-emerald-300/70">条已归还</div>
            </div>
            <ChevronRight class="w-5 h-5 text-emerald-400/50 group-hover:text-emerald-400 transition-colors" />
          </div>
        </div>

        <div
          class="bg-gradient-to-br from-orange-900/40 to-orange-800/20 border border-orange-500/30 rounded-xl p-5 cursor-pointer hover:border-orange-400/60 transition-all duration-300 group"
          :class="{ 'ring-2 ring-orange-500/50': filters.statuses.includes('lost') || filters.statuses.includes('damaged') }"
          @click="filters.statuses.includes('lost') || filters.statuses.includes('damaged') ? handleClearFilters() : (toggleStatusFilter('lost'), toggleStatusFilter('damaged'))"
        >
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2 text-orange-400 mb-2">
                <ShieldAlert class="w-5 h-5" />
                <span class="text-sm font-medium">异常记录</span>
              </div>
              <div class="text-3xl font-bold text-white mb-1 transition-transform group-hover:scale-110">
                {{ anomalyCount }}
              </div>
              <div class="text-xs text-orange-300/70">丢失 {{ lostCount }} / 损坏 {{ damagedCount }}</div>
            </div>
            <ChevronRight class="w-5 h-5 text-orange-400/50 group-hover:text-orange-400 transition-colors" />
          </div>
        </div>
      </div>

      <div v-if="overdueRecords.length > 0 && !filters.showOverdueOnly" class="mb-6">
        <div class="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
          <div class="flex items-center gap-2 mb-3">
            <AlertTriangle class="w-5 h-5 text-red-400" />
            <span class="text-sm font-medium text-red-300">以下借用记录已逾期，请及时催还：</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="item in overdueRecords.slice(0, 8)"
              :key="item.id"
              class="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/40 rounded-lg text-sm"
            >
              <span class="font-mono text-red-300">[{{ getGear(item.gearId)?.cabinetNo || '-' }}]</span>
              <span class="text-red-200">{{ item.borrower }}</span>
              <span class="text-red-400 text-xs">
                逾期 {{ getOverdueDays(item) }} 天
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

      <div v-if="anomalyRecords.length > 0 && !filters.statuses.includes('lost') && !filters.statuses.includes('damaged')" class="mb-6">
        <div class="bg-orange-900/20 border border-orange-500/30 rounded-xl p-4">
          <div class="flex items-center gap-2 mb-3">
            <ShieldAlert class="w-5 h-5 text-orange-400" />
            <span class="text-sm font-medium text-orange-300">借用异常提醒：</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="item in anomalyRecords.slice(0, 6)"
              :key="item.id"
              class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border"
              :class="item.status === 'lost' ? 'bg-gray-500/20 border-gray-500/40 text-gray-200' : 'bg-orange-500/20 border-orange-500/40 text-orange-200'"
            >
              <span class="font-mono text-xs" :class="item.status === 'lost' ? 'text-gray-300' : 'text-orange-300'">[{{ getGear(item.gearId)?.cabinetNo || '-' }}]</span>
              <span>{{ item.borrower }}</span>
              <span class="text-xs" :class="item.status === 'lost' ? 'text-gray-400' : 'text-orange-400'">
                {{ item.status === 'lost' ? '丢失' : '损坏' }} {{ item.borrowQuantity - item.actualReturnQuantity }}件
              </span>
              <span v-if="item.damageNote" class="text-xs text-gray-400">（{{ item.damageNote }}）</span>
            </div>
            <div
              v-if="anomalyRecords.length > 6"
              class="inline-flex items-center px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-lg text-sm text-orange-400"
            >
              还有 {{ anomalyRecords.length - 6 }} 项...
            </div>
          </div>
        </div>
      </div>

      <div v-if="showBorrowForm" class="mb-6">
        <div class="bg-gray-800/80 border border-amber-500/40 rounded-xl p-6">
          <div class="flex items-center gap-2 mb-4">
            <Umbrella class="w-5 h-5 text-amber-400" />
            <span class="text-lg font-medium text-white">登记借出</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs text-gray-400 mb-1.5">
                <Umbrella class="w-3.5 h-3.5 inline mr-1" />选择柜位雨具 *
              </label>
              <select
                v-model="borrowForm.gearId"
                class="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
              >
                <option :value="0" disabled>请选择雨具</option>
                <option v-for="gear in availableGears" :key="gear.id" :value="gear.id">
                  [{{ gear.cabinetNo }}] {{ gear.name }}（库存: {{ gear.quantity }}）
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1.5">
                借出数量 *
              </label>
              <input
                type="number"
                min="1"
                v-model.number="borrowForm.borrowQuantity"
                class="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
              />
              <div v-if="borrowForm.gearId" class="text-xs text-gray-500 mt-1">
                当前库存: {{ getGear(borrowForm.gearId)?.quantity || 0 }} 件
              </div>
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1.5">
                <User class="w-3.5 h-3.5 inline mr-1" />借用人 *
              </label>
              <input
                type="text"
                v-model="borrowForm.borrower"
                placeholder="请填写借用人姓名"
                class="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1.5">
                <Phone class="w-3.5 h-3.5 inline mr-1" />联系方式
              </label>
              <input
                type="text"
                v-model="borrowForm.contactInfo"
                placeholder="手机号或其他联系方式"
                class="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1.5">
                <CalendarClock class="w-3.5 h-3.5 inline mr-1" />预计归还时间
              </label>
              <input
                type="datetime-local"
                v-model="borrowForm.expectedReturnTime"
                class="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1.5">
                <FileText class="w-3.5 h-3.5 inline mr-1" />用途说明
              </label>
              <input
                type="text"
                v-model="borrowForm.purpose"
                placeholder="借用用途说明"
                class="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
              />
            </div>
          </div>
          <div class="flex items-center gap-3 mt-5">
            <button
              class="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-1.5"
              @click="handleBorrow"
            >
              <Check class="w-4 h-4" />
              确认借出
            </button>
            <button
              class="px-5 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm transition-all flex items-center gap-1.5"
              @click="showBorrowForm = false"
            >
              <X class="w-4 h-4" />
              取消
            </button>
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
                  class="w-40 pl-9 pr-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                />
              </div>

              <div class="relative">
                <Search class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="搜索借用人..."
                  :value="filters.borrower"
                  @input="(e: any) => setFilter('borrower', e.target.value)"
                  class="w-40 pl-9 pr-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                />
              </div>

              <div class="flex items-center gap-1">
                <span class="text-xs text-gray-400 mr-1">状态:</span>
                <button
                  v-for="status in (['borrowed', 'returned', 'overdue', 'lost', 'damaged'] as BorrowStatus[])"
                  :key="status"
                  class="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  :class="[
                    filters.statuses.includes(status)
                      ? `${BORROW_STATUS_COLORS[status]} text-white`
                      : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
                  ]"
                  @click="toggleStatusFilter(status)"
                >
                  {{ BORROW_STATUS_LABELS[status] }}
                </button>
              </div>

              <div class="flex-1"></div>

              <button
                v-if="filters.cabinetNo || filters.borrower || filters.statuses.length > 0 || filters.showOverdueOnly"
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
            class="bg-amber-900/30 border border-amber-500/40 rounded-xl p-4"
          >
            <div class="flex flex-wrap items-center gap-3">
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  @change="isAllSelected ? deselectAll() : selectAll()"
                  class="w-4 h-4 rounded border-gray-500 bg-gray-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-gray-800"
                />
                <span class="text-sm text-amber-200">
                  已选 {{ selectedIds.size }} / {{ filteredRecords.length }} 项
                </span>
              </div>
              <div class="h-5 w-px bg-amber-500/30"></div>
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
              <RefreshCw class="w-8 h-8 mx-auto mb-3 animate-spin text-amber-400" />
              <p>加载中...</p>
            </div>

            <Empty
              v-else-if="recordsWithGearInfo.length === 0"
              title="暂无借用记录"
              description="点击上方「登记借出」开始记录雨具借用"
              icon="Umbrella"
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
                        class="w-4 h-4 rounded border-gray-500 bg-gray-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-gray-800"
                      />
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">柜位</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">名称</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">借出/库存</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">借用人</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">状态</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">预计归还</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-700/30">
                  <template v-for="{ record, gear, isOverdue: overdue } in recordsWithGearInfo" :key="record.id">
                    <tr
                      class="hover:bg-gray-700/30 transition-colors"
                      :class="{ 'bg-red-900/10': overdue }"
                    >
                      <td class="px-4 py-3">
                        <input
                          type="checkbox"
                          :checked="selectedIds.has(record.id)"
                          @change="toggleSelect(record.id)"
                          class="w-4 h-4 rounded border-gray-500 bg-gray-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-gray-800"
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
                          <span class="text-amber-400">借{{ record.borrowQuantity }}</span>
                          <span class="text-gray-500 mx-1">/</span>
                          <span class="text-gray-300">存{{ gear?.quantity ?? 0 }}</span>
                        </div>
                      </td>
                      <td class="px-4 py-3">
                        <div class="text-sm text-gray-200">{{ record.borrower }}</div>
                        <div v-if="record.contactInfo" class="text-xs text-gray-400 mt-0.5">{{ record.contactInfo }}</div>
                        <div v-if="record.purpose" class="text-xs text-gray-500 mt-0.5 max-w-[160px] truncate" :title="record.purpose">
                          {{ record.purpose }}
                        </div>
                      </td>
                      <td class="px-4 py-3">
                        <span
                          class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium"
                          :class="[BORROW_STATUS_COLORS[record.status], 'text-white']"
                        >
                          {{ BORROW_STATUS_LABELS[record.status] }}
                        </span>
                      </td>
                      <td class="px-4 py-3">
                        <div class="text-sm" :class="overdue ? 'text-red-400' : 'text-gray-300'">
                          {{ formatDateShort(record.expectedReturnTime) }}
                        </div>
                        <div v-if="overdue" class="text-xs text-red-400 mt-0.5">
                          逾期 {{ getOverdueDays(record) }} 天
                        </div>
                        <div v-if="record.status === 'returned'" class="text-xs text-emerald-400 mt-0.5">
                          归还: {{ formatDateShort(record.actualReturnTime) }}
                        </div>
                      </td>
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-1">
                          <button
                            v-if="record.status === 'borrowed' || record.status === 'overdue'"
                            class="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 rounded transition-all"
                            title="登记归还"
                            @click="openReturnForm(record.id)"
                          >
                            <Undo2 class="w-4 h-4" />
                          </button>
                          <button
                            v-if="record.status === 'borrowed' || record.status === 'overdue'"
                            class="p-1.5 text-orange-400 hover:text-orange-300 hover:bg-orange-500/20 rounded transition-all"
                            title="标记丢失"
                            @click="returnRecord(record.id, { actualReturnQuantity: 0, damageNote: '雨具丢失', newStatus: 'lost' })"
                          >
                            <ShieldAlert class="w-4 h-4" />
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
                    <tr v-if="showReturnForm === record.id" class="bg-emerald-900/20">
                      <td class="px-4 py-4" colspan="8">
                        <div class="flex flex-wrap items-end gap-4">
                          <div>
                            <label class="block text-xs text-gray-400 mb-1.5">实际归还数量</label>
                            <input
                              type="number"
                              min="0"
                              :max="record.borrowQuantity"
                              v-model.number="returnForm.actualReturnQuantity"
                              class="w-28 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                            />
                            <div class="text-xs text-gray-500 mt-1">借出 {{ record.borrowQuantity }} 件</div>
                          </div>
                          <div>
                            <label class="block text-xs text-gray-400 mb-1.5">归还状态</label>
                            <select
                              v-model="returnForm.newStatus"
                              class="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                            >
                              <option value="returned">正常归还</option>
                              <option value="damaged">归还损坏</option>
                              <option value="lost">确认丢失</option>
                            </select>
                          </div>
                          <div class="flex-1 min-w-[200px]">
                            <label class="block text-xs text-gray-400 mb-1.5">损坏/丢失说明</label>
                            <input
                              type="text"
                              v-model="returnForm.damageNote"
                              placeholder="描述损坏情况或丢失原因..."
                              class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div class="flex items-center gap-2">
                            <button
                              class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm transition-all flex items-center gap-1.5"
                              @click="handleReturn"
                            >
                              <Check class="w-4 h-4" />
                              确认归还
                            </button>
                            <button
                              class="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm transition-all flex items-center gap-1.5"
                              @click="showReturnForm = null"
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
              <Check class="w-5 h-5 text-emerald-400" />
              <span class="text-sm font-medium text-white">最近归还记录</span>
            </div>
            <div v-if="recentCompletedRecords.length === 0" class="py-6 text-center text-gray-500 text-sm">
              暂无归还记录
            </div>
            <div v-else class="space-y-2 max-h-80 overflow-y-auto">
              <div
                v-for="record in recentCompletedRecords"
                :key="record.id"
                class="p-3 bg-gray-900/40 rounded-lg border border-gray-700/30"
              >
                <div class="flex items-center justify-between gap-2 mb-1">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="font-mono text-xs text-sky-300 shrink-0">[{{ getGear(record.gearId)?.cabinetNo || '-' }}]</span>
                    <span class="text-sm text-white truncate">{{ getGear(record.gearId)?.name || '未命名' }}</span>
                  </div>
                  <span class="text-xs text-emerald-400 shrink-0">还{{ record.actualReturnQuantity }}/{{ record.borrowQuantity }}件</span>
                </div>
                <div class="text-xs text-gray-500 flex items-center justify-between">
                  <span>{{ record.borrower }}</span>
                  <span>{{ formatDateTime(record.actualReturnTime || record.updatedAt) }}</span>
                </div>
                <div v-if="record.damageNote" class="text-xs text-orange-400 mt-1">
                  {{ record.damageNote }}
                </div>
              </div>
            </div>
          </div>

          <div class="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <div class="flex items-center gap-2 mb-4">
              <Umbrella class="w-5 h-5 text-amber-400" />
              <span class="text-sm font-medium text-white">可借雨具</span>
            </div>
            <div v-if="availableGears.length === 0" class="py-6 text-center text-gray-500 text-sm">
              暂无可借雨具
            </div>
            <div v-else class="space-y-2 max-h-80 overflow-y-auto">
              <div
                v-for="gear in availableGears.slice(0, 10)"
                :key="gear.id"
                class="p-3 bg-gray-900/40 rounded-lg border border-gray-700/30"
              >
                <div class="flex items-center justify-between gap-2 mb-1">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="font-mono text-xs text-sky-300 shrink-0">[{{ gear.cabinetNo }}]</span>
                    <span class="text-sm text-white truncate">{{ gear.name }}</span>
                  </div>
                  <span class="text-xs text-amber-400 shrink-0">库存 {{ gear.quantity }}</span>
                </div>
                <div class="text-xs text-gray-400">
                  {{ gear.responsiblePerson || '未指定责任人' }}
                </div>
              </div>
              <div
                v-if="availableGears.length > 10"
                class="text-center text-xs text-gray-500 py-2"
              >
                还有 {{ availableGears.length - 10 }} 项...
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
