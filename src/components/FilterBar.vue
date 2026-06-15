<script setup lang="ts">
import { Search, X, Filter } from 'lucide-vue-next';
import type { RainGearStatus, FilterOptions } from '@/types';
import { STATUS_LABELS, STATUS_COLORS } from '@/types';
import { cn } from '@/utils/helpers';

interface Props {
  filters: FilterOptions;
  responsiblePersons: string[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:filters', filters: FilterOptions): void;
  (e: 'clearFilters'): void;
}>();

const statusOptions: RainGearStatus[] = ['available', 'needRefill', 'needClean', 'closed'];

const updateFilter = (key: keyof FilterOptions, value: any) => {
  emit('update:filters', {
    ...props.filters,
    [key]: value,
  });
};

const toggleStatus = (status: RainGearStatus) => {
  const currentStatuses = [...props.filters.statuses];
  const index = currentStatuses.indexOf(status);
  if (index === -1) {
    currentStatuses.push(status);
  } else {
    currentStatuses.splice(index, 1);
  }
  updateFilter('statuses', currentStatuses);
};

const hasActiveFilters = () => {
  return (
    props.filters.cabinetNo ||
    props.filters.responsiblePerson ||
    props.filters.statuses.length > 0 ||
    props.filters.showGapOnly
  );
};

const clearFilters = () => {
  emit('clearFilters');
};
</script>

<template>
  <div class="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 mb-4">
    <div class="flex items-center gap-2 mb-3">
      <Filter class="w-4 h-4 text-gray-400" />
      <span class="text-sm font-medium text-gray-300">筛选条件</span>
      <button
        v-if="hasActiveFilters()"
        class="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
        @click="clearFilters"
      >
        <X class="w-3 h-3" />
        清除筛选
      </button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <label class="block text-xs text-gray-400 mb-1.5">柜位搜索</label>
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            :value="filters.cabinetNo"
            @input="updateFilter('cabinetNo', ($event.target as HTMLInputElement).value)"
            type="text"
            placeholder="输入柜位号..."
            class="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-600/50 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 transition-all"
          />
        </div>
      </div>

      <div>
        <label class="block text-xs text-gray-400 mb-1.5">责任人</label>
        <select
          :value="filters.responsiblePerson"
          @change="updateFilter('responsiblePerson', ($event.target as HTMLSelectElement).value)"
          class="w-full px-4 py-2 bg-gray-900/50 border border-gray-600/50 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 transition-all appearance-none cursor-pointer"
        >
          <option value="">全部责任人</option>
          <option v-for="person in responsiblePersons" :key="person" :value="person">
            {{ person }}
          </option>
        </select>
      </div>

      <div>
        <label class="block text-xs text-gray-400 mb-1.5">状态</label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="status in statusOptions"
            :key="status"
            @click="toggleStatus(status)"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
              filters.statuses.includes(status)
                ? cn(STATUS_COLORS[status], 'border-transparent text-white')
                : 'bg-gray-900/50 border-gray-600/50 text-gray-400 hover:border-gray-500/50 hover:text-gray-300',
            ]"
          >
            {{ STATUS_LABELS[status] }}
          </button>
        </div>
      </div>

      <div class="flex items-end">
        <label class="flex items-center gap-2 cursor-pointer group">
          <div class="relative">
            <input
              type="checkbox"
              :checked="filters.showGapOnly"
              @change="updateFilter('showGapOnly', ($event.target as HTMLInputElement).checked)"
              class="sr-only peer"
            />
            <div class="w-10 h-5 bg-gray-700 rounded-full peer-checked:bg-red-500 transition-colors"></div>
            <div class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
          </div>
          <span class="text-sm text-gray-300 group-hover:text-gray-200 transition-colors">
            仅显示缺口
          </span>
        </label>
      </div>
    </div>
  </div>
</template>
