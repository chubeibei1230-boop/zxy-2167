<script setup lang="ts">
import { onMounted } from 'vue';
import { Umbrella, ClipboardList, Package } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { useRainGearStore } from '@/composables/useRainGearStore';
import SummaryPanel from '@/components/SummaryPanel.vue';
import FilterBar from '@/components/FilterBar.vue';
import BatchActionBar from '@/components/BatchActionBar.vue';
import QuickActions from '@/components/QuickActions.vue';
import RainGearTable from '@/components/RainGearTable.vue';
import type { FilterOptions, RainGearStatus } from '@/types';

const store = useRainGearStore();
const router = useRouter();

const {
  items,
  history,
  selectedIds,
  isLoading,
  highlightId,
  filters,
  filteredItems,
  allResponsiblePersons,
  duplicateCabinets,
  gapItems,
  emptyResponsible,
  isGap,
  loadData,
  addItem,
  copyLastItem,
  fillContinuousCabinets,
  updateItem,
  removeItem,
  toggleSelect,
  selectAll,
  deselectAll,
  isAllSelected,
  batchUpdateStatus,
  batchRemove,
  scrollToItem,
  setFilter,
  exportJson,
  importJson,
} = store;

const handleFiltersUpdate = (newFilters: FilterOptions) => {
  setFilter('cabinetNo', newFilters.cabinetNo);
  setFilter('responsiblePerson', newFilters.responsiblePerson);
  setFilter('statuses', newFilters.statuses);
  setFilter('showGapOnly', newFilters.showGapOnly);
};

const handleClearFilters = () => {
  setFilter('cabinetNo', '');
  setFilter('responsiblePerson', '');
  setFilter('statuses', []);
  setFilter('showGapOnly', false);
};

const handleFilterByCabinet = (cabinetNo: string) => {
  setFilter('cabinetNo', cabinetNo);
};

const handleExport = async () => {
  const json = await exportJson();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rain-gear-data-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const handleImport = async (jsonStr: string) => {
  try {
    const result = await importJson(jsonStr);
    alert(`导入成功：${result.success} 条，失败：${result.failed} 条`);
  } catch (e) {
    alert('导入失败：文件格式错误');
  }
};

const handleJumpToItem = (id: number) => {
  handleClearFilters();
  setTimeout(() => {
    scrollToItem(id);
  }, 100);
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
    <div class="max-w-[1600px] mx-auto px-4 py-6">
      <header class="mb-6">
        <div class="flex items-center gap-3 mb-2">
          <div class="p-2 bg-sky-500/20 rounded-xl">
            <Umbrella class="w-8 h-8 text-sky-400" />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-white">雨具柜清点管理</h1>
            <p class="text-sm text-gray-400">实时监控库存缺口，明确管理责任</p>
          </div>
          <div class="flex-1"></div>
          <button
            class="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg text-sm font-medium transition-all border border-emerald-500/30 hover:border-emerald-400/50"
            @click="router.push('/restock')"
          >
            <Package class="w-4 h-4" />
            缺口补货闭环
          </button>
          <button
            class="flex items-center gap-2 px-4 py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 rounded-lg text-sm font-medium transition-all border border-violet-500/30 hover:border-violet-400/50"
            @click="router.push('/tasks')"
          >
            <ClipboardList class="w-4 h-4" />
            盘点任务闭环
          </button>
        </div>
      </header>

      <SummaryPanel
        :gap-items="gapItems"
        :duplicate-cabinets="duplicateCabinets"
        :empty-responsible="emptyResponsible"
        :recent-history="history"
        :items="items"
        @jump-to-item="handleJumpToItem"
        @filter-by-cabinet="handleFilterByCabinet"
      />

      <QuickActions
        @add-item="addItem()"
        @copy-last="copyLastItem()"
        @fill-cabinets="fillContinuousCabinets($event)"
        @export="handleExport"
        @import="handleImport($event)"
      />

      <FilterBar
        :filters="filters"
        :responsible-persons="allResponsiblePersons"
        @update:filters="handleFiltersUpdate"
        @clear-filters="handleClearFilters"
      />

      <BatchActionBar
        :selected-count="selectedIds.size"
        :total-count="filteredItems.length"
        :is-all-selected="isAllSelected"
        @select-all="selectAll"
        @deselect-all="deselectAll"
        @batch-update-status="batchUpdateStatus($event as RainGearStatus)"
        @batch-delete="batchRemove"
      />

      <RainGearTable
        :items="filteredItems"
        :selected-ids="selectedIds"
        :highlight-id="highlightId"
        :is-loading="isLoading"
        :is-all-selected="isAllSelected"
        :duplicate-cabinets="duplicateCabinets"
        :responsible-persons="allResponsiblePersons"
        :is-gap="isGap"
        @toggle-select="toggleSelect"
        @select-all="selectAll"
        @deselect-all="deselectAll"
        @update="updateItem"
        @delete="removeItem"
      />

      <footer class="mt-6 text-center text-xs text-gray-500">
        <p>数据存储于浏览器本地 IndexedDB，请定期导出备份</p>
      </footer>
    </div>
  </div>
</template>
