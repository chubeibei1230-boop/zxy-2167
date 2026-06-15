import { ref, computed, reactive } from 'vue';
import type { InventoryTask, TaskCheckRecord, CheckStatus, RainGear, TaskConclusion } from '@/types';
import { useIndexedDB } from './useIndexedDB';

export function useTaskStore() {
  const {
    getAllTasks,
    addTask,
    updateTask,
    deleteTask,
    getCheckRecordsByTask,
    addCheckRecord,
    updateCheckRecord,
    bulkAddCheckRecords,
    deleteCheckRecordsByTask,
    getAllGears,
  } = useIndexedDB();

  const tasks = ref<InventoryTask[]>([]);
  const currentTask = ref<InventoryTask | null>(null);
  const checkRecords = ref<TaskCheckRecord[]>([]);
  const gears = ref<RainGear[]>([]);
  const isLoading = ref(false);
  const statusFilter = ref<CheckStatus | 'all'>('all');

  const isOverdue = (task: InventoryTask): boolean => {
    if (task.status === 'completed') return false;
    return new Date(task.plannedCompletionTime) < new Date();
  };

  const filteredCheckRecords = computed(() => {
    if (statusFilter.value === 'all') return checkRecords.value;
    return checkRecords.value.filter(r => r.checkStatus === statusFilter.value);
  });

  const totalCount = computed(() => checkRecords.value.length);
  const confirmedCount = computed(() => checkRecords.value.filter(r => r.checkStatus === 'confirmed').length);
  const needsActionCount = computed(() => checkRecords.value.filter(r => r.checkStatus === 'needsAction').length);
  const uncheckedCount = computed(() => checkRecords.value.filter(r => r.checkStatus === 'unchecked').length);

  const isAllChecked = computed(() => {
    return checkRecords.value.length > 0 && checkRecords.value.every(r => r.checkStatus !== 'unchecked');
  });

  const progressPercent = computed(() => {
    if (totalCount.value === 0) return 0;
    return Math.round(((confirmedCount.value + needsActionCount.value) / totalCount.value) * 100);
  });

  const recentActionRecords = computed(() => {
    return checkRecords.value
      .filter(r => r.checkStatus === 'needsAction' && r.checkedAt)
      .sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime())
      .slice(0, 5);
  });

  const loadTasks = async () => {
    isLoading.value = true;
    try {
      const allTasks = await getAllTasks();
      tasks.value = allTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } finally {
      isLoading.value = false;
    }
  };

  const loadTaskDetail = async (taskId: number) => {
    isLoading.value = true;
    try {
      const allTasks = await getAllTasks();
      const task = allTasks.find(t => t.id === taskId);
      if (!task) return;
      currentTask.value = task;

      const [records, allGears] = await Promise.all([
        getCheckRecordsByTask(taskId),
        getAllGears(),
      ]);
      checkRecords.value = records;
      gears.value = allGears.sort((a, b) => a.cabinetNo.localeCompare(b.cabinetNo));
    } finally {
      isLoading.value = false;
    }
  };

  const createTask = async (data: {
    name: string;
    scope: string;
    plannedCompletionTime: string;
    responsiblePerson: string;
  }) => {
    const now = new Date().toISOString();
    const taskData: Omit<InventoryTask, 'id'> = {
      name: data.name,
      scope: data.scope,
      plannedCompletionTime: data.plannedCompletionTime,
      responsiblePerson: data.responsiblePerson,
      status: 'in_progress',
      createdAt: now,
      updatedAt: now,
    };
    const taskId = await addTask(taskData);

    const allGears = await getAllGears();
    const checkRecordData: Omit<TaskCheckRecord, 'id'>[] = allGears.map(gear => ({
      taskId,
      gearId: gear.id,
      checkStatus: 'unchecked' as CheckStatus,
      actionNote: '',
      checkedAt: '',
    }));
    await bulkAddCheckRecords(checkRecordData);

    await loadTasks();
    return taskId;
  };

  const removeTask = async (taskId: number) => {
    await deleteCheckRecordsByTask(taskId);
    await deleteTask(taskId);
    tasks.value = tasks.value.filter(t => t.id !== taskId);
    if (currentTask.value?.id === taskId) {
      currentTask.value = null;
      checkRecords.value = [];
    }
  };

  const completeTask = async (taskId: number) => {
    const task = tasks.value.find(t => t.id === taskId);
    if (!task) return;
    const updated = { ...task, status: 'completed' as const, updatedAt: new Date().toISOString() };
    await updateTask(updated);
    tasks.value = tasks.value.map(t => t.id === taskId ? updated : t);
    if (currentTask.value?.id === taskId) {
      currentTask.value = updated;
    }
  };

  const updateCheckStatus = async (recordId: number, status: CheckStatus, note?: string) => {
    const index = checkRecords.value.findIndex(r => r.id === recordId);
    if (index === -1) return;

    const updated = {
      ...checkRecords.value[index],
      checkStatus: status,
      actionNote: note !== undefined ? note : checkRecords.value[index].actionNote,
      checkedAt: status !== 'unchecked' ? new Date().toISOString() : '',
    };
    await updateCheckRecord(updated);
    checkRecords.value[index] = updated;
  };

  const updateActionNote = async (recordId: number, note: string) => {
    const index = checkRecords.value.findIndex(r => r.id === recordId);
    if (index === -1) return;

    const updated = {
      ...checkRecords.value[index],
      actionNote: note,
    };
    await updateCheckRecord(updated);
    checkRecords.value[index] = updated;
  };

  const getGearForRecord = (record: TaskCheckRecord): RainGear | undefined => {
    return gears.value.find(g => g.id === record.gearId);
  };

  const generateConclusion = (): TaskConclusion | null => {
    if (!currentTask.value || !isAllChecked.value) return null;

    const duplicateCabinets: string[] = [];
    const cabinetMap = new Map<string, number[]>();
    gears.value.forEach(g => {
      const c = g.cabinetNo.trim();
      if (!c) return;
      if (!cabinetMap.has(c)) cabinetMap.set(c, []);
      cabinetMap.get(c)!.push(g.id);
    });
    for (const [cabinetNo, ids] of cabinetMap) {
      if (ids.length > 1) duplicateCabinets.push(cabinetNo);
    }

    const gapItems = gears.value.filter(g => g.quantity < g.minStock && g.status !== 'closed');
    const emptyResponsible = gears.value.filter(g => !g.responsiblePerson.trim());

    const actionNotes = checkRecords.value
      .filter(r => r.checkStatus === 'needsAction' && r.actionNote.trim())
      .map(r => {
        const gear = getGearForRecord(r);
        return {
          gearId: r.gearId,
          cabinetNo: gear?.cabinetNo || '-',
          name: gear?.name || '未命名',
          note: r.actionNote,
        };
      });

    return {
      gapItems,
      duplicateCabinets,
      emptyResponsible,
      actionNotes,
    };
  };

  const generateConclusionText = (conclusion: TaskConclusion): string => {
    const lines: string[] = [];
    const task = currentTask.value!;
    const now = new Date().toLocaleString('zh-CN');

    lines.push(`📋 盘点结论摘要 — ${task.name}`);
    lines.push(`📅 盘点时间：${now}`);
    lines.push(`👤 负责人：${task.responsiblePerson}`);
    lines.push(`📝 盘点范围：${task.scope}`);
    lines.push('');

    lines.push(`【统计概览】`);
    lines.push(`  总记录数：${totalCount.value}`);
    lines.push(`  已确认：${confirmedCount.value}`);
    lines.push(`  需处理：${needsActionCount.value}`);
    lines.push('');

    if (conclusion.gapItems.length > 0) {
      lines.push(`⚠️ 缺口项（${conclusion.gapItems.length}项）：`);
      conclusion.gapItems.forEach(item => {
        lines.push(`  · [${item.cabinetNo}] ${item.name} — 当前${item.quantity}，最低${item.minStock}，缺${item.minStock - item.quantity}`);
      });
      lines.push('');
    }

    if (conclusion.duplicateCabinets.length > 0) {
      lines.push(`🔄 重复柜位（${conclusion.duplicateCabinets.length}个）：`);
      conclusion.duplicateCabinets.forEach(c => {
        lines.push(`  · ${c}`);
      });
      lines.push('');
    }

    if (conclusion.emptyResponsible.length > 0) {
      lines.push(`👤 责任人空缺（${conclusion.emptyResponsible.length}项）：`);
      conclusion.emptyResponsible.forEach(item => {
        lines.push(`  · [${item.cabinetNo}] ${item.name}`);
      });
      lines.push('');
    }

    if (conclusion.actionNotes.length > 0) {
      lines.push(`📝 需处理备注汇总：`);
      conclusion.actionNotes.forEach(item => {
        lines.push(`  · [${item.cabinetNo}] ${item.name}：${item.note}`);
      });
      lines.push('');
    }

    if (conclusion.gapItems.length === 0 && conclusion.duplicateCabinets.length === 0 && conclusion.emptyResponsible.length === 0 && conclusion.actionNotes.length === 0) {
      lines.push('✅ 本次盘点无异常，所有柜位状态正常。');
    }

    return lines.join('\n');
  };

  const setStatusFilter = (status: CheckStatus | 'all') => {
    statusFilter.value = status;
  };

  return {
    tasks,
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
    loadTasks,
    loadTaskDetail,
    createTask,
    removeTask,
    completeTask,
    updateCheckStatus,
    updateActionNote,
    getGearForRecord,
    generateConclusion,
    generateConclusionText,
    setStatusFilter,
  };
}
