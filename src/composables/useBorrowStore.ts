import { ref, computed, reactive } from 'vue';
import type {
  RainGear,
  RainGearStatus,
  BorrowRecord,
  BorrowStatus,
  BorrowFilterOptions,
} from '@/types';
import { useIndexedDB } from './useIndexedDB';

export function useBorrowStore() {
  const {
    getAllGears,
    updateGear,
    addHistory,
    getAllBorrowRecords,
    addBorrowRecord,
    updateBorrowRecord,
    deleteBorrowRecord,
  } = useIndexedDB();

  const borrowRecords = ref<BorrowRecord[]>([]);
  const gears = ref<RainGear[]>([]);
  const isLoading = ref(false);
  const selectedIds = ref<Set<number>>(new Set());

  const filters = reactive<BorrowFilterOptions>({
    cabinetNo: '',
    borrower: '',
    statuses: [],
    showOverdueOnly: false,
  });

  const getGear = (gearId: number): RainGear | undefined => {
    return gears.value.find(g => g.id === gearId);
  };

  const isOverdue = (record: BorrowRecord): boolean => {
    if (record.status === 'returned' || record.status === 'lost') return false;
    if (!record.expectedReturnTime) return false;
    return new Date(record.expectedReturnTime) < new Date();
  };

  const isTodayReturn = (record: BorrowRecord): boolean => {
    if (!record.expectedReturnTime) return false;
    const expected = new Date(record.expectedReturnTime);
    const today = new Date();
    return expected.getFullYear() === today.getFullYear()
      && expected.getMonth() === today.getMonth()
      && expected.getDate() === today.getDate();
  };

  const allBorrowers = computed(() => {
    const borrowers = new Set<string>();
    borrowRecords.value.forEach(r => {
      if (r.borrower.trim()) {
        borrowers.add(r.borrower.trim());
      }
    });
    return Array.from(borrowers).sort();
  });

  const availableGears = computed(() => {
    return gears.value.filter(g => g.status !== 'closed' && g.quantity > 0);
  });

  const pendingReturnCount = computed(() =>
    borrowRecords.value.filter(r => r.status === 'borrowed').length
  );

  const overdueCount = computed(() =>
    borrowRecords.value.filter(r => r.status === 'overdue' || (r.status === 'borrowed' && isOverdue(r))).length
  );

  const todayReturnCount = computed(() =>
    borrowRecords.value.filter(r => r.status === 'borrowed' && isTodayReturn(r)).length
  );

  const completedCount = computed(() =>
    borrowRecords.value.filter(r => r.status === 'returned').length
  );

  const lostCount = computed(() =>
    borrowRecords.value.filter(r => r.status === 'lost').length
  );

  const damagedCount = computed(() =>
    borrowRecords.value.filter(r => r.status === 'damaged').length
  );

  const anomalyCount = computed(() =>
    borrowRecords.value.filter(r => r.status === 'lost' || r.status === 'damaged').length
  );

  const overdueRecords = computed(() =>
    borrowRecords.value.filter(r => r.status === 'overdue' || (r.status === 'borrowed' && isOverdue(r)))
  );

  const anomalyRecords = computed(() =>
    borrowRecords.value.filter(r => r.status === 'lost' || r.status === 'damaged')
  );

  const filteredRecords = computed(() => {
    return borrowRecords.value.filter(record => {
      const gear = getGear(record.gearId);

      if (filters.cabinetNo.trim()) {
        if (!gear || !gear.cabinetNo.trim().includes(filters.cabinetNo.trim())) {
          return false;
        }
      }

      if (filters.borrower.trim()) {
        if (!record.borrower.trim().includes(filters.borrower.trim())) {
          return false;
        }
      }

      if (filters.statuses.length > 0 && !filters.statuses.includes(record.status)) {
        return false;
      }

      if (filters.showOverdueOnly && !isOverdue(record) && record.status !== 'overdue') {
        return false;
      }

      return true;
    });
  });

  const recordsWithGearInfo = computed(() => {
    return filteredRecords.value.map(record => ({
      record,
      gear: getGear(record.gearId),
      isOverdue: isOverdue(record) || record.status === 'overdue',
    }));
  });

  const recentCompletedRecords = computed(() => {
    return [...borrowRecords.value]
      .filter(r => r.status === 'returned')
      .sort((a, b) => new Date(b.actualReturnTime || b.updatedAt).getTime() - new Date(a.actualReturnTime || a.updatedAt).getTime())
      .slice(0, 10);
  });

  const loadData = async () => {
    isLoading.value = true;
    try {
      const [allGears, allRecords] = await Promise.all([
        getAllGears(),
        getAllBorrowRecords(),
      ]);
      gears.value = allGears.sort((a, b) => a.cabinetNo.localeCompare(b.cabinetNo));
      borrowRecords.value = allRecords.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } finally {
      isLoading.value = false;
    }
  };

  const createEmptyRecord = (gearId: number): Omit<BorrowRecord, 'id'> => {
    const now = new Date().toISOString();
    return {
      gearId,
      borrowQuantity: 1,
      borrower: '',
      contactInfo: '',
      purpose: '',
      expectedReturnTime: '',
      actualReturnTime: '',
      actualReturnQuantity: 0,
      damageNote: '',
      status: 'borrowed',
      createdAt: now,
      updatedAt: now,
    };
  };

  const addRecord = async (gearId: number, data?: Partial<BorrowRecord>) => {
    const newRecord = { ...createEmptyRecord(gearId), ...data };
    const id = await addBorrowRecord(newRecord);
    const addedRecord = { ...newRecord, id } as BorrowRecord;
    borrowRecords.value.unshift(addedRecord);

    const gear = getGear(gearId);
    if (gear) {
      const deductQty = Math.min(newRecord.borrowQuantity, gear.quantity);
      const newQuantity = gear.quantity - deductQty;
      let newGearStatus: RainGearStatus = gear.status;
      if (newQuantity < gear.minStock && gear.status === 'available') {
        newGearStatus = 'needRefill';
      }
      const updatedGear: RainGear = {
        ...gear,
        quantity: newQuantity,
        status: newGearStatus,
        updatedAt: new Date().toISOString(),
      };
      gears.value = gears.value.map(g => g.id === gear.id ? updatedGear : g);
      await updateGear(updatedGear);

      await addHistory({
        recordId: gear.id,
        fieldName: '借出',
        oldValue: `${gear.quantity}(${gear.status})`,
        newValue: `${newQuantity}(${newGearStatus})`,
        modifiedAt: new Date().toISOString(),
      });
    }

    return addedRecord;
  };

  const returnRecord = async (id: number, returnData: { actualReturnQuantity: number; damageNote: string; newStatus: BorrowStatus }) => {
    const index = borrowRecords.value.findIndex(r => r.id === id);
    if (index === -1) return;

    const oldRecord = borrowRecords.value[index];
    const now = new Date().toISOString();

    const newRecord: BorrowRecord = {
      ...oldRecord,
      status: returnData.newStatus,
      actualReturnQuantity: returnData.actualReturnQuantity,
      actualReturnTime: now,
      damageNote: returnData.damageNote.trim(),
      updatedAt: now,
    };

    borrowRecords.value[index] = newRecord;
    await updateBorrowRecord(newRecord);

    const gear = getGear(oldRecord.gearId);
    if (gear) {
      const returnQty = returnData.actualReturnQuantity;
      const newQuantity = gear.quantity + returnQty;
      let newGearStatus: RainGearStatus = gear.status;
      if (newQuantity >= gear.minStock && gear.status === 'needRefill') {
        newGearStatus = 'available';
      }
      if (returnData.newStatus === 'damaged' && newGearStatus === 'available') {
        newGearStatus = 'needClean';
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
        fieldName: '归还',
        oldValue: `${gear.quantity}(${gear.status})`,
        newValue: `${newQuantity}(${newGearStatus})`,
        modifiedAt: now,
      });
    }
  };

  const markOverdue = async () => {
    const now = new Date();
    for (const record of borrowRecords.value) {
      if (record.status === 'borrowed' && record.expectedReturnTime && new Date(record.expectedReturnTime) < now) {
        record.status = 'overdue';
        record.updatedAt = now.toISOString();
        await updateBorrowRecord(record);
      }
    }
  };

  const removeRecord = async (id: number) => {
    const index = borrowRecords.value.findIndex(r => r.id === id);
    if (index === -1) return;

    borrowRecords.value.splice(index, 1);
    selectedIds.value.delete(id);
    await deleteBorrowRecord(id);
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

  const batchRemove = async () => {
    const filteredIdSet = new Set(filteredRecords.value.map(r => r.id));
    const ids = Array.from(selectedIds.value).filter(id => filteredIdSet.has(id));
    if (ids.length === 0) return;

    for (const id of ids) {
      await removeRecord(id);
    }
    selectedIds.value.clear();
  };

  const setFilter = (key: keyof BorrowFilterOptions, value: any) => {
    (filters as any)[key] = value;
    const filteredIdSet = new Set(filteredRecords.value.map(r => r.id));
    selectedIds.value.forEach(id => {
      if (!filteredIdSet.has(id)) {
        selectedIds.value.delete(id);
      }
    });
  };

  const toggleStatusFilter = (status: BorrowStatus) => {
    const index = filters.statuses.indexOf(status);
    if (index === -1) {
      filters.statuses.push(status);
    } else {
      filters.statuses.splice(index, 1);
    }
  };

  const generateSummaryText = (): string => {
    const lines: string[] = [];
    const now = new Date().toLocaleString('zh-CN');
    const borrowed = borrowRecords.value.filter(r => r.status === 'borrowed');
    const overdue = overdueRecords.value;
    const returned = borrowRecords.value.filter(r => r.status === 'returned');
    const lost = borrowRecords.value.filter(r => r.status === 'lost');
    const damaged = borrowRecords.value.filter(r => r.status === 'damaged');

    lines.push(`🌂 雨具借用归还汇总报告`);
    lines.push(`📅 生成时间：${now}`);
    lines.push('');

    lines.push(`【统计概览】`);
    lines.push(`  借出中：${borrowed.length} 条，共借出 ${borrowed.reduce((s, r) => s + r.borrowQuantity, 0)} 件`);
    lines.push(`  已逾期：${overdue.length} 条`);
    lines.push(`  已归还：${returned.length} 条`);
    lines.push(`  已丢失：${lost.length} 条`);
    lines.push(`  已损坏：${damaged.length} 条`);
    lines.push('');

    if (overdue.length > 0) {
      lines.push(`⚠️ 逾期提醒（${overdue.length}条）：`);
      overdue.forEach(r => {
        const gear = getGear(r.gearId);
        lines.push(`  · [${gear?.cabinetNo || '-'}] ${gear?.name || '未命名'} — 借用人：${r.borrower}，联系方式：${r.contactInfo || '未填写'}，借出${r.borrowQuantity}件，预计归还：${r.expectedReturnTime ? new Date(r.expectedReturnTime).toLocaleDateString('zh-CN') : '未设置'}`);
      });
      lines.push('');
    }

    if (lost.length > 0 || damaged.length > 0) {
      lines.push(`🔴 异常记录（${lost.length + damaged.length}条）：`);
      [...lost, ...damaged].forEach(r => {
        const gear = getGear(r.gearId);
        const statusLabel = r.status === 'lost' ? '丢失' : '损坏';
        lines.push(`  · [${gear?.cabinetNo || '-'}] ${gear?.name || '未命名'} — ${statusLabel}，借用人：${r.borrower}，实际归还${r.actualReturnQuantity}件${r.damageNote ? '，说明：' + r.damageNote : ''}`);
      });
      lines.push('');
    }

    if (borrowed.length > 0) {
      lines.push(`📋 当前借出清单：`);
      borrowed.forEach(r => {
        const gear = getGear(r.gearId);
        lines.push(`  · [${gear?.cabinetNo || '-'}] ${gear?.name || '未命名'} — 借用人：${r.borrower}，联系方式：${r.contactInfo || '未填写'}，借出${r.borrowQuantity}件，预计归还：${r.expectedReturnTime ? new Date(r.expectedReturnTime).toLocaleDateString('zh-CN') : '未设置'}${r.purpose ? '，用途：' + r.purpose : ''}`);
      });
    }

    return lines.join('\n');
  };

  return {
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
  };
}
