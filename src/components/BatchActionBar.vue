<script setup lang="ts">
import { CheckSquare, Square, Trash2, Edit3 } from 'lucide-vue-next';
import type { RainGearStatus } from '@/types';
import { STATUS_LABELS, STATUS_COLORS } from '@/types';
import { cn } from '@/utils/helpers';
import { ref } from 'vue';

interface Props {
  selectedCount: number;
  totalCount: number;
  isAllSelected: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'selectAll'): void;
  (e: 'deselectAll'): void;
  (e: 'batchUpdateStatus', status: RainGearStatus): void;
  (e: 'batchDelete'): void;
}>();

const showStatusMenu = ref(false);

const statusOptions: RainGearStatus[] = ['available', 'needRefill', 'needClean', 'closed'];

const handleToggleAll = () => {
  if (props.isAllSelected) {
    emit('deselectAll');
  } else {
    emit('selectAll');
  }
};

const handleStatusSelect = (status: RainGearStatus) => {
  emit('batchUpdateStatus', status);
  showStatusMenu.value = false;
};

const handleDelete = () => {
  if (confirm(`确定要删除选中的 ${props.selectedCount} 条记录吗？此操作不可恢复。`)) {
    emit('batchDelete');
  }
};
</script>

<template>
  <div
    v-if="selectedCount > 0"
    class="bg-gradient-to-r from-sky-900/60 to-indigo-900/60 border border-sky-500/30 rounded-xl p-3 mb-4 flex items-center gap-4 animate-fadeIn"
  >
    <button
      class="flex items-center gap-2 text-sky-300 hover:text-sky-200 transition-colors"
      @click="handleToggleAll"
    >
      <component
        :is="isAllSelected ? CheckSquare : Square"
        class="w-5 h-5"
      />
      <span class="text-sm font-medium">
        已选 {{ selectedCount }} / {{ totalCount }} 条
      </span>
    </button>

    <div class="h-6 w-px bg-sky-500/30"></div>

    <div class="relative">
      <button
        class="flex items-center gap-2 px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 hover:border-sky-400/50 rounded-lg text-sm text-sky-300 transition-all"
        @click="showStatusMenu = !showStatusMenu"
      >
        <Edit3 class="w-4 h-4" />
        批量改状态
      </button>

      <div
        v-if="showStatusMenu"
        class="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden"
      >
        <button
          v-for="status in statusOptions"
          :key="status"
          @click="handleStatusSelect(status)"
          :class="[
            'w-full px-4 py-2 text-left text-sm hover:bg-gray-700/50 transition-colors flex items-center gap-2',
            'text-gray-200',
          ]"
        >
          <span :class="['w-2 h-2 rounded-full', STATUS_COLORS[status]]"></span>
          {{ STATUS_LABELS[status] }}
        </button>
      </div>
    </div>

    <button
      class="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-400/50 rounded-lg text-sm text-red-300 transition-all"
      @click="handleDelete"
    >
      <Trash2 class="w-4 h-4" />
      批量删除
    </button>

    <button
      class="ml-auto text-xs text-sky-400 hover:text-sky-300 transition-colors"
      @click="emit('deselectAll')"
    >
      取消选择
    </button>
  </div>
</template>

<style scoped>
.animate-fadeIn {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
