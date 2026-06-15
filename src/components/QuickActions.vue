<script setup lang="ts">
import { ref } from 'vue';
import { Plus, Copy, Grid3X3, Download, Upload } from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'addItem'): void;
  (e: 'copyLast'): void;
  (e: 'fillCabinets', range: string): void;
  (e: 'export'): void;
  (e: 'import', jsonStr: string): void;
}>();

const showFillDialog = ref(false);
const cabinetRange = ref('A1-A10');
const fileInput = ref<HTMLInputElement | null>(null);

const handleFill = () => {
  if (cabinetRange.value.trim()) {
    emit('fillCabinets', cabinetRange.value.trim());
    showFillDialog.value = false;
  }
};

const handleExport = () => {
  emit('export');
};

const handleImportClick = () => {
  fileInput.value?.click();
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      emit('import', content);
    };
    reader.readAsText(file);
  }
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};
</script>

<template>
  <div class="flex items-center gap-2 mb-4">
    <button
      class="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30"
      @click="emit('addItem')"
    >
      <Plus class="w-4 h-4" />
      新增记录
    </button>

    <button
      class="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm font-medium transition-all border border-gray-600 hover:border-gray-500"
      @click="emit('copyLast')"
    >
      <Copy class="w-4 h-4" />
      复制上一条
    </button>

    <button
      class="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm font-medium transition-all border border-gray-600 hover:border-gray-500"
      @click="showFillDialog = true"
    >
      <Grid3X3 class="w-4 h-4" />
      快速补齐柜位
    </button>

    <div class="flex-1"></div>

    <button
      class="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm font-medium transition-all border border-gray-600 hover:border-gray-500"
      @click="handleExport"
    >
      <Download class="w-4 h-4" />
      导出
    </button>

    <button
      class="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm font-medium transition-all border border-gray-600 hover:border-gray-500"
      @click="handleImportClick"
    >
      <Upload class="w-4 h-4" />
      导入
    </button>
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      class="hidden"
      @change="handleFileChange"
    />

    <div
      v-if="showFillDialog"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      @click.self="showFillDialog = false"
    >
      <div class="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h3 class="text-lg font-semibold text-white mb-4">快速补齐连续柜位</h3>
        <p class="text-sm text-gray-400 mb-4">
          输入柜位范围，如 <code class="bg-gray-700 px-1.5 py-0.5 rounded text-sky-400">A1-A10</code>，将自动创建不存在的柜位记录。
        </p>
        <input
          v-model="cabinetRange"
          type="text"
          placeholder="A1-A10"
          class="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 transition-all mb-4 font-mono"
          @keyup.enter="handleFill"
        />
        <div class="flex justify-end gap-3">
          <button
            class="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
            @click="showFillDialog = false"
          >
            取消
          </button>
          <button
            class="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors"
            @click="handleFill"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
