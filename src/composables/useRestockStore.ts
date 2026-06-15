import { ref, computed, reactive } from 'vue';
import type {
  RainGear,
  RestockRecord,
  RestockStatus,
  RestockFilterOptions,
  RainGearStatus,
} from '@/types';
import { useIndexedDB } from './useIndexedDB';

export function useRestockStore() {
  const {
    getAllGears,
    updateGear,
    addHistory,
    getAllRestockRecords,
    addRestockRecord,
    updateRestockRecord,
    deleteRestockRecord,
    bulkAddRestockRecords,
  } = useIndexedDB();

  const restockRecords = ref<RestockRecord[]>([]);
  const gears = ref<RainGear[]>([]);
  const isLoading = ref(false);
  const selectedIds = ref<Set<number>>(new Set());

  const filters = reactive<RestockFilterOptions>({
    responsiblePerson: '',
    cabinetNo: '',
    statuses: [],
    gearStatuses: [],
    showOverdueOnly: false,
  });

  const isGap = (gear: RainGear): boolean => {
    return gear.quantity < gear.minStock && gear.status !== 'closed';
  };

  const isOverdue = (record: RestockRecord): boolean => {
    if (record.status === 'completed') return false;
    if (!record.estimatedCompletionTime) return false;
    return new Date(record.estimatedCompletionTime) < new Date();
  };

  const getGear = (gearId: number): RainGear | undefined => {
    return gears.value.find(g => g.id === gearId);
  };

  const allResponsiblePersons = computed(() => {
    const persons = new Set<string>();
    gears.value.forEach(gear => {
      if (gear.responsiblePerson.trim()) {
        persons.add(gear.responsiblePerson);
      }
    });
    restockRecords.value.forEach(record => {
      if (record.handler.trim()) {
        persons.add(record.handler);
      }
    });
    return Array.from(persons).sort();
  });

  const gapGears = computed(() => {
    return gears.value.filter(gear => isGap(gear));
  });

  const pendingCount = computed(() => restockRecords.value.filter(r => r.status === 'pending').length);
  const processingCount = computed(() => restockRecords.value.filter(r => r.status === 'processing').length);
  const completedCount = computed(() => restockRecords.value.filter(r => r.status === 'completed').length);
  const overdueCount = computed(() => restockRecords.value.filter(r => isOverdue(r)).length);

  const totalPlannedQuantity = computed(() =>
    restockRecords.value.filter(r => r.status !== 'completed').reduce((sum, r) => sum + r.plannedQuantity, 0)
  );

  const progressPercent = computed(() => {
    const total = restockRecords.value.length;
    if (total === 0) return 0;
    return Math.round((completedCount.value / total) * 100);
  });

  const recentRecords = computed(() => {
    return [...restockRecords.value]
      .filter(r => r.status === 'completed')
      .sort((a, b) => new Date(b.actualCompletionTime || b.updatedAt).getTime() - new Date(a.actualCompletionTime || a.updatedAt).getTime())
      .slice(0, 10);
  });

  const overdueRecords = computed(() => {
    return restockRecords.value.filter(r => isOverdue(r));
  });

  const filteredRecords = computed(() => {
    return restockRecords.value.filter(record => {
      const gear = getGear(record.gearId);
      if (!gear) return false;

      if (filters.responsiblePerson.trim()) {
        const filterPerson = filters.responsiblePerson.trim();
        const gearPerson = gear.responsiblePerson.trim();
        const handlerPerson = record.handler.trim();
        if (gearPerson !== filterPerson && handlerPerson !== filterPerson) {
          return false;
        }
      }

      if (filters.cabinetNo.trim()) {
        if (!gear.cabinetNo.trim().includes(filters.cabinetNo.trim())) {
          return false;
        }
      }

      if (filters.statuses.length > 0 && !filters.statuses.includes(record.status)) {
        return false;
      }

      if (filters.gearStatuses.length > 0 && !filters.gearStatuses.includes(gear.status)) {
        return false;
      }

      if (filters.showOverdueOnly && !isOverdue(record)) {
        return false;
      }

      return true;
    });
  });

  const recordsWithGearInfo = computed(() => {
    return filteredRecords.value.map(record => ({
      record,
      gear: getGear(record.gearId),
      isOverdue: isOverdue(record),
    })).filter(item => item.gear !== undefined);
  });

  const loadData = async () => {
    isLoading.value = true;
    try {
      const [allGears, allRecords] = await Promise.all([
        getAllGears(),
        getAllRestockRecords(),
      ]);
      gears.value = allGears.sort((a, b) => a.cabinetNo.localeCompare(b.cabinetNo));
      restockRecords.value = allRecords.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } finally {
      isLoading.value = false;
    }
  };

  const createEmptyRecord = (gearId: number): Omit<RestockRecord, 'id'> => {
    const gear = getGear(gearId);
    const gapQty = gear ? Math.max(0, gear.minStock - gear.quantity) : 0;
    const now = new Date().toISOString();
    return {
      gearId,
      gapQuantity: gapQty,
      plannedQuantity: gapQty,
      handler: gear?.responsiblePerson || '',
      note: '',
      estimatedCompletionTime: '',
      actualCompletionTime: '',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
  };

  const addRecord = async (gearId: number, data?: Partial<RestockRecord>) => {
    const newRecord = { ...createEmptyRecord(gearId), ...data };
    const id = await addRestockRecord(newRecord);
    const addedRecord = { ...newRecord, id } as RestockRecord;
    restockRecords.value.unshift(addedRecord);
    return addedRecord;
  };

  const generateFromGaps = async (sourceTaskId?: number) => {
    const existingGearIds = new Set(
      restockRecords.value.filter(r => r.status !== 'completed').map(r => r.gearId)
    );
    const newGaps = gapGears.value.filter(g => !existingGearIds.has(g.id));

    if (newGaps.length === 0) return 0;

    const now = new Date().toISOString();
    const records: Omit<RestockRecord, 'id'>[] = newGaps.map(gear => ({
      gearId: gear.id,
      sourceTaskId,
      gapQuantity: Math.max(0, gear.minStock - gear.quantity),
      plannedQuantity: Math.max(0, gear.minStock - gear.quantity),
      handler: gear.responsiblePerson || '',
      note: '',
      estimatedCompletionTime: '',
      actualCompletionTime: '',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }));

    await bulkAddRestockRecords(records);
    await loadData();
    return records.length;
  };

  const updateRecord = async (id: number, updates: Partial<RestockRecord>) => {
    const index = restockRecords.value.findIndex(r => r.id === id);
    if (index === -1) return;

    const oldRecord = { ...restockRecords.value[index] };
    const sanitizedUpdates: Partial<RestockRecord> = { ...updates };

    if (sanitizedUpdates.plannedQuantity !== undefined) {
      sanitizedUpdates.plannedQuantity = Math.max(0, Number(sanitizedUpdates.plannedQuantity) || 0);
    }

    const newRecord = { ...oldRecord, ...sanitizedUpdates, updatedAt: new Date().toISOString() };

    restockRecords.value[index] = newRecord;
    await updateRestockRecord(newRecord);
  };

  const STATUS_ORDER: Record<RestockStatus, number> = {
    pending: 0,
    processing: 1,
    completed: 2,
  };

  const updateStatus = async (id: number, status: RestockStatus) => {
    const index = restockRecords.value.findIndex(r => r.id === id);
    if (index === -1) return;

    const oldRecord = restockRecords.value[index];

    if (STATUS_ORDER[status] <= STATUS_ORDER[oldRecord.status]) {
      return;
    }

    const now = new Date().toISOString();

    const newRecord: RestockRecord = {
      ...oldRecord,
      status,
      updatedAt: now,
      actualCompletionTime: status === 'completed' ? now : '',
    };

    if (status === 'completed') {
      const gear = getGear(oldRecord.gearId);
      if (gear) {
        const addQty = Math.max(0, oldRecord.plannedQuantity);
        const newQuantity = gear.quantity + addQty;
        let newGearStatus: RainGearStatus = gear.status;
        if (newQuantity >= gear.minStock && gear.status === 'needRefill') {
          newGearStatus = 'available';
        }

        const updatedGear: RainGear = {
          ...gear,
          quantity: newQuantity,
          status: newGearStatus,
          updatedAt: now,
        };

        gears.value = gears.value.map(g => g.id === gear.id ? updatedGear : g);
        await updateGear(updatedGear);

        await addHistory({
          recordId: gear.id,
          fieldName: '补货完成',
          oldValue: `${gear.quantity}(${gear.status})`,
          newValue: `${newQuantity}(${newGearStatus})`,
          modifiedAt: now,
        });
      }
    }

    restockRecords.value[index] = newRecord;
    await updateRestockRecord(newRecord);
  };

  const removeRecord = async (id: number) => {
    const index = restockRecords.value.findIndex(r => r.id === id);
    if (index === -1) return;

    restockRecords.value.splice(index, 1);
    selectedIds.value.delete(id);
    await deleteRestockRecord(id);
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id);
    } else {
      selectedIds.value.add(id);
    }
  };

  const selectAll = () => {
    filteredRecords.value.forEach(r => selectedIds.value.add(r.id));
  };

  const deselectAll = () => {
    selectedIds.value.clear();
  };

  const isAllSelected = computed(() => {
    if (filteredRecords.value.length === 0) return false;
    return filteredRecords.value.every(r => selectedIds.value.has(r.id));
  });

  const batchUpdateStatus = async (status: RestockStatus) => {
    const filteredIdSet = new Set(filteredRecords.value.map(r => r.id));
    const ids = Array.from(selectedIds.value).filter(id => filteredIdSet.has(id));
    if (ids.length === 0) return;

    for (const id of ids) {
      await updateStatus(id, status);
    }
    selectedIds.value.clear();
  };

  const batchRemove = async () => {
    const filteredIdSet = new Set(filteredRecords.value.map(r => r.id));
    const ids = Array.from(selectedIds.value).filter(id => filteredIdSet.has(id));
    if (ids.length === 0) return;

    for (const id of ids) {
      await removeRecord(id);
    }
    selectedIds.value.clear();
  };

  const setFilter = (key: keyof RestockFilterOptions, value: any) => {
    (filters as any)[key] = value;
    const filteredIdSet = new Set(filteredRecords.value.map(r => r.id));
    selectedIds.value.forEach(id => {
      if (!filteredIdSet.has(id)) {
        selectedIds.value.delete(id);
      }
    });
  };

  const toggleStatusFilter = (status: RestockStatus) => {
    const index = filters.statuses.indexOf(status);
    if (index === -1) {
      filters.statuses.push(status);
    } else {
      filters.statuses.splice(index, 1);
    }
  };

  const toggleGearStatusFilter = (status: RainGearStatus) => {
    const index = filters.gearStatuses.indexOf(status);
    if (index === -1) {
      filters.gearStatuses.push(status);
    } else {
      filters.gearStatuses.splice(index, 1);
    }
  };

  const generateSummaryText = (): string => {
    const lines: string[] = [];
    const now = new Date().toLocaleString('zh-CN');
    const pending = restockRecords.value.filter(r => r.status === 'pending');
    const processing = restockRecords.value.filter(r => r.status === 'processing');
    const completed = restockRecords.value.filter(r => r.status === 'completed');
    const overdue = overdueRecords.value;

    lines.push(`📦 补货汇总报告`);
    lines.push(`📅 生成时间：${now}`);
    lines.push('');

    lines.push(`【统计概览】`);
    lines.push(`  待处理：${pending.length} 项，计划补充 ${pending.reduce((s, r) => s + r.plannedQuantity, 0)} 件`);
    lines.push(`  处理中：${processing.length} 项，计划补充 ${processing.reduce((s, r) => s + r.plannedQuantity, 0)} 件`);
    lines.push(`  已完成：${completed.length} 项，已补充 ${completed.reduce((s, r) => s + r.plannedQuantity, 0)} 件`);
    lines.push(`  逾期项：${overdue.length} 项`);
    lines.push('');

    if (overdue.length > 0) {
      lines.push(`⚠️ 逾期提醒（${overdue.length}项）：`);
      overdue.forEach(r => {
        const gear = getGear(r.gearId);
        lines.push(`  · [${gear?.cabinetNo || '-'}] ${gear?.name || '未命名'} — 责任人：${r.handler || '未指定'}，计划补充 ${r.plannedQuantity} 件，预计：${r.estimatedCompletionTime ? new Date(r.estimatedCompletionTime).toLocaleDateString('zh-CN') : '未设置'}`);
      });
      lines.push('');
    }

    if (pending.length > 0 || processing.length > 0) {
      lines.push(`📋 待完成补货清单：`);
      [...pending, ...processing].forEach(r => {
        const gear = getGear(r.gearId);
        const statusLabel = r.status === 'pending' ? '待处理' : '处理中';
        lines.push(`  · [${gear?.cabinetNo || '-'}] ${gear?.name || '未命名'} — ${statusLabel}，缺口${r.gapQuantity}件，计划补${r.plannedQuantity}件，责任人：${r.handler || '未指定'}${r.estimatedCompletionTime ? '，预计：' + new Date(r.estimatedCompletionTime).toLocaleDateString('zh-CN') : ''}${r.note ? '，备注：' + r.note : ''}`);
      });
      lines.push('');
    }

    if (recentRecords.value.length > 0) {
      lines.push(`✅ 最近完成记录：`);
      recentRecords.value.forEach(r => {
        const gear = getGear(r.gearId);
        lines.push(`  · [${gear?.cabinetNo || '-'}] ${gear?.name || '未命名'} — 补充 ${r.plannedQuantity} 件，完成时间：${r.actualCompletionTime ? new Date(r.actualCompletionTime).toLocaleString('zh-CN') : '-'}`);
      });
    }

    return lines.join('\n');
  };

  return {
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
  };
}
