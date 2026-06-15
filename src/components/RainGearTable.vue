<script setup lang="ts">
import { computed } from 'vue';
import { CheckSquare, Square, Loader2 } from 'lucide-vue-next';
import RainGearRow from './RainGearRow.vue';
import type { RainGear } from '@/types';

interface Props {
  items: RainGear[];
  selectedIds: Set<number>;
  highlightId: number | null;
  isLoading: boolean;
  isAllSelected: boolean;
  duplicateCabinets: string[];
  responsiblePersons: string[];
  isGap: (item: RainGear) => boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'toggleSelect', id: number): void;
  (e: 'selectAll'): void;
  (e: 'deselectAll'): void;
  (e: 'update', id: number, updates: Partial<RainGear>): void;
  (e: 'delete', id: number): void;
}>();

const isCabinetDuplicate = (cabinetNo: string): boolean => {
  return props.duplicateCabinets.includes(cabinetNo);
};

const handleToggleAll = () => {
  if (props.isAllSelected) {
    emit('deselectAll');
  } else {
    emit('selectAll');
  }
};

const totalQuantity = computed(() => {
  return props.items.reduce((sum, item) => sum + item.quantity, 0);
});
</script>

<template>
  <div class="bg-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full border-collapse">
        <thead>
          <tr class="bg-gray-800/80 border-b border-gray-700/80">
            <th class="px-3 py-3 w-12 text-left">
              <button
                v-if="items.length > 0"
                class="text-gray-400 hover:text-sky-400 transition-colors"
                @click="handleToggleAll"
              >
                <component :is="isAllSelected ? CheckSquare : Square" class="w-5 h-5" />
              </button>
            </th>
            <th class="px-3 py-3 w-28 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
              柜位
            </th>
            <th class="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
              名称
            </th>
            <th class="px-3 py-3 w-24 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
              数量
              <span class="block text-[10px] text-gray-500">共 {{ totalQuantity }}</span>
            </th>
            <th class="px-3 py-3 w-24 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
              最低保留
            </th>
            <th class="px-3 py-3 w-28 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
              状态选择
            </th>
            <th class="px-3 py-3 w-28 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
              当前状态
            </th>
            <th class="px-3 py-3 w-28 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
              责任人
            </th>
            <th class="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
              临时备注
            </th>
            <th class="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
              补充说明
            </th>
            <th class="px-3 py-3 w-16"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="11" class="px-4 py-16 text-center">
              <div class="flex items-center justify-center gap-2 text-gray-400">
                <Loader2 class="w-5 h-5 animate-spin" />
                <span>加载中...</span>
              </div>
            </td>
          </tr>
          <tr v-else-if="items.length === 0">
            <td colspan="11" class="px-4 py-16 text-center text-gray-500">
              <div class="text-lg mb-2">暂无记录</div>
              <div class="text-sm text-gray-600">
                点击"新增记录"或使用"快速补齐柜位"来添加雨具记录
              </div>
            </td>
          </tr>
          <RainGearRow
            v-else
            v-for="item in items"
            :key="item.id"
            :item="item"
            :is-selected="selectedIds.has(item.id)"
            :is-highlighted="highlightId === item.id"
            :is-gap="isGap(item)"
            :is-duplicate-cabinet="isCabinetDuplicate(item.cabinetNo)"
            :responsible-persons="responsiblePersons"
            @toggle-select="emit('toggleSelect', $event)"
            @update="(id: number, updates: Partial<RainGear>) => emit('update', id, updates)"
            @delete="emit('delete', $event)"
          />
        </tbody>
      </table>
    </div>
  </div>
</template>
