<script setup lang="ts">
import { computed } from 'vue';
import { AlertTriangle, Layers, Users, Clock, ChevronRight } from 'lucide-vue-next';
import type { RainGear, ModifyHistory } from '@/types';
import { STATUS_LABELS } from '@/types';
import { formatDateTime } from '@/utils/helpers';

interface Props {
  gapItems: RainGear[];
  duplicateCabinets: string[];
  emptyResponsible: RainGear[];
  recentHistory: ModifyHistory[];
  items: RainGear[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'jumpToItem', id: number): void;
  (e: 'filterByCabinet', cabinetNo: string): void;
  (e: 'filterByResponsible', person: string): void;
}>();

const totalItems = computed(() => props.items.length);

const handleGapClick = (item: RainGear) => {
  emit('jumpToItem', item.id);
};

const handleDuplicateClick = (cabinetNo: string) => {
  emit('filterByCabinet', cabinetNo);
};

const handleEmptyClick = (item: RainGear) => {
  emit('jumpToItem', item.id);
};

const handleHistoryClick = (record: ModifyHistory) => {
  emit('jumpToItem', record.recordId);
};

const getStatusLabel = (status: string) => {
  return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status;
};
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
    <div
      class="bg-gradient-to-br from-red-900/40 to-red-800/20 border border-red-500/30 rounded-xl p-5 cursor-pointer hover:border-red-400/60 transition-all duration-300 group"
      @click="gapItems.length > 0 && handleGapClick(gapItems[0])"
    >
      <div class="flex items-start justify-between">
        <div>
          <div class="flex items-center gap-2 text-red-400 mb-2">
            <AlertTriangle class="w-5 h-5" />
            <span class="text-sm font-medium">缺口条目</span>
          </div>
          <div class="text-3xl font-bold text-white mb-1 transition-transform group-hover:scale-110">
            {{ gapItems.length }}
          </div>
          <div class="text-xs text-red-300/70">
            共 {{ totalItems }} 条记录
          </div>
        </div>
        <ChevronRight class="w-5 h-5 text-red-400/50 group-hover:text-red-400 transition-colors" />
      </div>
      <div v-if="gapItems.length > 0" class="mt-3 pt-3 border-t border-red-500/20">
        <div class="text-xs text-red-300/80 mb-1">最近缺口：</div>
        <div
          v-for="item in gapItems.slice(0, 3)"
          :key="item.id"
          class="text-xs text-red-200/90 py-1 hover:text-red-100 transition-colors flex items-center gap-1"
          @click.stop="handleGapClick(item)"
        >
          <span class="font-mono">[{{ item.cabinetNo || '-' }}]</span>
          <span>{{ item.name || '未命名' }}</span>
          <span class="text-red-400">(缺{{ item.minStock - item.quantity }})</span>
        </div>
      </div>
    </div>

    <div
      class="bg-gradient-to-br from-orange-900/40 to-orange-800/20 border border-orange-500/30 rounded-xl p-5 cursor-pointer hover:border-orange-400/60 transition-all duration-300 group"
      @click="duplicateCabinets.length > 0 && handleDuplicateClick(duplicateCabinets[0])"
    >
      <div class="flex items-start justify-between">
        <div>
          <div class="flex items-center gap-2 text-orange-400 mb-2">
            <Layers class="w-5 h-5" />
            <span class="text-sm font-medium">重复柜位</span>
          </div>
          <div class="text-3xl font-bold text-white mb-1 transition-transform group-hover:scale-110">
            {{ duplicateCabinets.length }}
          </div>
          <div class="text-xs text-orange-300/70">
            个柜位被占用多次
          </div>
        </div>
        <ChevronRight class="w-5 h-5 text-orange-400/50 group-hover:text-orange-400 transition-colors" />
      </div>
      <div v-if="duplicateCabinets.length > 0" class="mt-3 pt-3 border-t border-orange-500/20">
        <div class="text-xs text-orange-300/80 mb-1">冲突柜位：</div>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="cabinet in duplicateCabinets.slice(0, 5)"
            :key="cabinet"
            class="inline-block px-2 py-0.5 bg-orange-500/30 text-orange-200 rounded text-xs font-mono hover:bg-orange-500/50 transition-colors"
            @click.stop="handleDuplicateClick(cabinet)"
          >
            {{ cabinet }}
          </span>
        </div>
      </div>
    </div>

    <div
      class="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border border-yellow-500/30 rounded-xl p-5 cursor-pointer hover:border-yellow-400/60 transition-all duration-300 group"
      @click="emptyResponsible.length > 0 && handleEmptyClick(emptyResponsible[0])"
    >
      <div class="flex items-start justify-between">
        <div>
          <div class="flex items-center gap-2 text-yellow-400 mb-2">
            <Users class="w-5 h-5" />
            <span class="text-sm font-medium">责任人空缺</span>
          </div>
          <div class="text-3xl font-bold text-white mb-1 transition-transform group-hover:scale-110">
            {{ emptyResponsible.length }}
          </div>
          <div class="text-xs text-yellow-300/70">
            条记录未分配责任人
          </div>
        </div>
        <ChevronRight class="w-5 h-5 text-yellow-400/50 group-hover:text-yellow-400 transition-colors" />
      </div>
      <div v-if="emptyResponsible.length > 0" class="mt-3 pt-3 border-t border-yellow-500/20">
        <div class="text-xs text-yellow-300/80 mb-1">待分配：</div>
        <div
          v-for="item in emptyResponsible.slice(0, 3)"
          :key="item.id"
          class="text-xs text-yellow-200/90 py-1 hover:text-yellow-100 transition-colors flex items-center gap-1"
          @click.stop="handleEmptyClick(item)"
        >
          <span class="font-mono">[{{ item.cabinetNo || '-' }}]</span>
          <span>{{ item.name || '未命名' }}</span>
        </div>
      </div>
    </div>

    <div class="bg-gradient-to-br from-sky-900/40 to-sky-800/20 border border-sky-500/30 rounded-xl p-5 transition-all duration-300">
      <div class="flex items-start justify-between">
        <div>
          <div class="flex items-center gap-2 text-sky-400 mb-2">
            <Clock class="w-5 h-5" />
            <span class="text-sm font-medium">最近修改</span>
          </div>
          <div class="text-3xl font-bold text-white mb-1 transition-transform">
            {{ recentHistory.length }}
          </div>
          <div class="text-xs text-sky-300/70">
            条操作记录
          </div>
        </div>
      </div>
      <div v-if="recentHistory.length > 0" class="mt-3 pt-3 border-t border-sky-500/20 max-h-32 overflow-y-auto">
        <div
          v-for="record in recentHistory.slice(0, 5)"
          :key="record.id"
          class="text-xs text-sky-200/90 py-1 hover:text-sky-100 transition-colors cursor-pointer flex items-center justify-between gap-2"
          @click="handleHistoryClick(record)"
        >
          <div class="flex items-center gap-1 min-w-0">
            <span class="text-sky-400 shrink-0">[{{ record.fieldName }}]</span>
            <span class="truncate">
              <span class="text-sky-300/70">{{ record.oldValue || '-' }}</span>
              <span class="text-sky-400 mx-1">→</span>
              <span class="text-sky-200">{{ getStatusLabel(record.newValue) || record.newValue || '-' }}</span>
            </span>
          </div>
          <span class="text-sky-400/60 shrink-0">{{ formatDateTime(record.modifiedAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
