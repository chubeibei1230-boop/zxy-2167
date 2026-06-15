<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { CheckSquare, Square, Trash2, AlertCircle } from 'lucide-vue-next';
import type { RainGear, RainGearStatus } from '@/types';
import { STATUS_LABELS, STATUS_COLORS, STATUS_TEXT_COLORS } from '@/types';
import { cn } from '@/utils/helpers';

interface Props {
  item: RainGear;
  isSelected: boolean;
  isHighlighted: boolean;
  isGap: boolean;
  isDuplicateCabinet: boolean;
  responsiblePersons: string[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'toggleSelect', id: number): void;
  (e: 'update', id: number, updates: Partial<RainGear>): void;
  (e: 'delete', id: number): void;
}>();

const localItem = ref({ ...props.item });

const statusOptions: RainGearStatus[] = ['available', 'needRefill', 'needClean', 'closed'];

watch(
  () => props.item,
  (newVal) => {
    localItem.value = { ...newVal };
  },
  { deep: true }
);

const gapAmount = computed(() => {
  return Math.max(0, localItem.value.minStock - localItem.value.quantity);
});

const handleInput = (field: keyof RainGear, value: any) => {
  const oldValue = localItem.value[field];
  const parsedValue = field === 'quantity' || field === 'minStock'
    ? parseInt(value, 10) || 0
    : value;

  (localItem.value as any)[field] = parsedValue;

  if (String(oldValue) !== String(parsedValue)) {
    emit('update', props.item.id, { [field]: parsedValue });
  }
};

const handleDelete = () => {
  if (confirm(`确定要删除柜位 [${localItem.value.cabinetNo}] 的记录吗？`)) {
    emit('delete', props.item.id);
  }
};

const rowClasses = computed(() => {
  return cn(
    'group transition-all duration-300 border-b border-gray-700/50',
    props.isGap && 'bg-red-900/20 hover:bg-red-900/30',
    props.isHighlighted && 'bg-sky-900/30 animate-pulse',
    !props.isGap && !props.isHighlighted && 'hover:bg-gray-800/50',
    props.isSelected && 'bg-sky-900/20'
  );
});
</script>

<template>
  <tr
    :id="`gear-row-${item.id}`"
    :class="rowClasses"
    class="transition-all duration-300"
  >
    <td class="px-3 py-3 w-12">
      <button
        class="text-gray-400 hover:text-sky-400 transition-colors"
        @click="emit('toggleSelect', item.id)"
      >
        <component :is="isSelected ? CheckSquare : Square" class="w-5 h-5" />
      </button>
    </td>

    <td class="px-3 py-3 w-28">
      <div class="relative">
        <input
          :value="localItem.cabinetNo"
          @input="handleInput('cabinetNo', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="柜位号"
          :class="[
            'w-full px-2 py-1.5 bg-gray-900/50 border rounded-lg text-sm font-mono focus:outline-none focus:ring-1 transition-all',
            isDuplicateCabinet
              ? 'border-orange-500/50 text-orange-300 focus:border-orange-400 focus:ring-orange-500/30'
              : 'border-gray-600/50 text-gray-200 focus:border-sky-500/50 focus:ring-sky-500/30',
          ]"
        />
        <div
          v-if="isDuplicateCabinet"
          class="absolute -top-1 -right-1"
        >
          <AlertCircle class="w-4 h-4 text-orange-500" />
        </div>
      </div>
    </td>

    <td class="px-3 py-3">
      <input
        :value="localItem.name"
        @input="handleInput('name', ($event.target as HTMLInputElement).value)"
        type="text"
        placeholder="雨具名称"
        class="w-full px-2 py-1.5 bg-gray-900/50 border border-gray-600/50 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 transition-all"
      />
    </td>

    <td class="px-3 py-3 w-24">
      <div class="relative">
        <input
          :value="localItem.quantity"
          @input="handleInput('quantity', ($event.target as HTMLInputElement).value)"
          type="number"
          min="0"
          :class="[
            'w-full px-2 py-1.5 bg-gray-900/50 border rounded-lg text-sm font-mono focus:outline-none focus:ring-1 transition-all text-center',
            isGap
              ? 'border-red-500/50 text-red-300 focus:border-red-400 focus:ring-red-500/30'
              : 'border-gray-600/50 text-gray-200 focus:border-sky-500/50 focus:ring-sky-500/30',
          ]"
        />
        <div
          v-if="isGap"
          class="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1 rounded font-bold"
        >
          -{{ gapAmount }}
        </div>
      </div>
    </td>

    <td class="px-3 py-3 w-24">
      <input
        :value="localItem.minStock"
        @input="handleInput('minStock', ($event.target as HTMLInputElement).value)"
        type="number"
        min="0"
        class="w-full px-2 py-1.5 bg-gray-900/50 border border-gray-600/50 rounded-lg text-sm font-mono text-gray-200 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 transition-all text-center"
      />
    </td>

    <td class="px-3 py-3 w-28">
      <select
        :value="localItem.status"
        @change="handleInput('status', ($event.target as HTMLSelectElement).value as RainGearStatus)"
        :class="[
          'w-full px-2 py-1.5 bg-gray-900/50 border rounded-lg text-sm font-medium focus:outline-none focus:ring-1 transition-all appearance-none cursor-pointer',
          STATUS_TEXT_COLORS[localItem.status],
          'border-gray-600/50 focus:border-sky-500/50 focus:ring-sky-500/30',
        ]"
      >
        <option v-for="status in statusOptions" :key="status" :value="status">
          {{ STATUS_LABELS[status] }}
        </option>
      </select>
    </td>

    <td class="px-3 py-3 w-28">
      <div class="flex items-center gap-1.5">
        <span :class="['w-2 h-2 rounded-full shrink-0', STATUS_COLORS[localItem.status]]"></span>
        <span :class="['text-xs font-medium', STATUS_TEXT_COLORS[localItem.status]]">
          {{ STATUS_LABELS[localItem.status] }}
        </span>
      </div>
    </td>

    <td class="px-3 py-3 w-28">
      <input
        :value="localItem.responsiblePerson"
        @input="handleInput('responsiblePerson', ($event.target as HTMLInputElement).value)"
        type="text"
        list="responsible-list"
        placeholder="责任人"
        :class="[
          'w-full px-2 py-1.5 bg-gray-900/50 border rounded-lg text-sm focus:outline-none focus:ring-1 transition-all',
          !localItem.responsiblePerson.trim()
            ? 'border-yellow-500/50 text-yellow-300 focus:border-yellow-400 focus:ring-yellow-500/30 placeholder-yellow-500/50'
            : 'border-gray-600/50 text-gray-200 focus:border-sky-500/50 focus:ring-sky-500/30 placeholder-gray-500',
        ]"
      />
      <datalist id="responsible-list">
        <option v-for="person in responsiblePersons" :key="person" :value="person" />
      </datalist>
    </td>

    <td class="px-3 py-3">
      <input
        :value="localItem.tempNote"
        @input="handleInput('tempNote', ($event.target as HTMLInputElement).value)"
        type="text"
        placeholder="临时备注"
        class="w-full px-2 py-1.5 bg-gray-900/50 border border-gray-600/50 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 transition-all"
      />
    </td>

    <td class="px-3 py-3">
      <input
        :value="localItem.description"
        @input="handleInput('description', ($event.target as HTMLInputElement).value)"
        type="text"
        placeholder="补充说明"
        class="w-full px-2 py-1.5 bg-gray-900/50 border border-gray-600/50 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 transition-all"
      />
    </td>

    <td class="px-3 py-3 w-16">
      <button
        class="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
        @click="handleDelete"
      >
        <Trash2 class="w-4 h-4" />
      </button>
    </td>
  </tr>
</template>
