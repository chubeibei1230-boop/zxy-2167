import { ref, computed, watch, reactive } from 'vue';
import type { RainGear, RainGearStatus, FilterOptions, ModifyHistory } from '@/types';
import { useIndexedDB } from './useIndexedDB';

const FIELD_LABELS: Record<string, string> = {
  name: '名称',
  cabinetNo: '柜位',
  quantity: '数量',
  minStock: '最低保留数',
  responsiblePerson: '责任人',
  tempNote: '临时备注',
  description: '补充说明',
  status: '状态',
};

export function useRainGearStore() {
  const {
    getAllGears,
    addGear,
    updateGear,
    deleteGear,
    addHistory,
    getRecentHistory,
    bulkUpdateStatus,
    bulkDelete,
    exportData,
    importData,
  } = useIndexedDB();

  const items = ref<RainGear[]>([]);
  const history = ref<ModifyHistory[]>([]);
  const selectedIds = ref<Set<number>>(new Set());
  const isLoading = ref(false);
  const highlightId = ref<number | null>(null);

  const filters = reactive<FilterOptions>({
    cabinetNo: '',
    responsiblePerson: '',
    statuses: [],
    showGapOnly: false,
  });

  const isGap = (item: RainGear): boolean => {
    return item.quantity < item.minStock && item.status !== 'closed';
  };

  const allResponsiblePersons = computed(() => {
    const persons = new Set<string>();
    items.value.forEach(item => {
      if (item.responsiblePerson.trim()) {
        persons.add(item.responsiblePerson);
      }
    });
    return Array.from(persons).sort();
  });

  const duplicateCabinets = computed(() => {
    const map = new Map<string, number[]>();
    items.value.forEach(item => {
      const normalizedCabinet = item.cabinetNo.trim();
      if (!normalizedCabinet) return;
      if (!map.has(normalizedCabinet)) {
        map.set(normalizedCabinet, []);
      }
      map.get(normalizedCabinet)!.push(item.id);
    });
    return Array.from(map.entries())
      .filter(([, ids]) => ids.length > 1)
      .map(([cabinetNo]) => cabinetNo);
  });

  const gapItems = computed(() => {
    return items.value.filter(item => isGap(item));
  });

  const emptyResponsible = computed(() => {
    return items.value.filter(item => !item.responsiblePerson.trim());
  });

  const filteredItems = computed(() => {
    const filterCabinet = filters.cabinetNo.trim();
    const filterResponsible = filters.responsiblePerson.trim();
    return items.value.filter(item => {
      if (filterCabinet && !item.cabinetNo.trim().includes(filterCabinet)) {
        return false;
      }
      if (filterResponsible && item.responsiblePerson.trim() !== filterResponsible) {
        return false;
      }
      if (filters.statuses.length > 0 && !filters.statuses.includes(item.status)) {
        return false;
      }
      if (filters.showGapOnly && !isGap(item)) {
        return false;
      }
      return true;
    });
  });

  const responsibleStats = computed(() => {
    const stats = new Map<string, { total: number; gap: number }>();
    items.value.forEach(item => {
      if (!item.responsiblePerson.trim()) return;
      if (!stats.has(item.responsiblePerson)) {
        stats.set(item.responsiblePerson, { total: 0, gap: 0 });
      }
      const s = stats.get(item.responsiblePerson)!;
      s.total++;
      if (isGap(item)) s.gap++;
    });
    return stats;
  });

  const isCabinetDuplicate = (cabinetNo: string): boolean => {
    return duplicateCabinets.value.includes(cabinetNo.trim());
  };

  const loadData = async () => {
    isLoading.value = true;
    try {
      const [gears, hist] = await Promise.all([
        getAllGears(),
        getRecentHistory(10),
      ]);
      items.value = gears.sort((a, b) => a.cabinetNo.localeCompare(b.cabinetNo));
      history.value = hist;
    } finally {
      isLoading.value = false;
    }
  };

  const createEmptyGear = (): Omit<RainGear, 'id'> => {
    const now = new Date().toISOString();
    return {
      name: '',
      cabinetNo: '',
      quantity: 0,
      minStock: 2,
      responsiblePerson: '',
      tempNote: '',
      description: '',
      status: 'available',
      createdAt: now,
      updatedAt: now,
    };
  };

  const recordHistory = async (
    recordId: number,
    fieldName: string,
    oldValue: string,
    newValue: string
  ) => {
    const historyRecord: Omit<ModifyHistory, 'id'> = {
      recordId,
      fieldName,
      oldValue,
      newValue,
      modifiedAt: new Date().toISOString(),
    };
    await addHistory(historyRecord);
    history.value = await getRecentHistory(10);
  };

  const addItem = async (baseItem?: Partial<RainGear>) => {
    const newItem = { ...createEmptyGear(), ...baseItem };
    const id = await addGear(newItem);
    const addedItem = { ...newItem, id } as RainGear;
    items.value.push(addedItem);
    items.value.sort((a, b) => a.cabinetNo.localeCompare(b.cabinetNo));
    highlightId.value = id;
    setTimeout(() => {
      highlightId.value = null;
    }, 2000);
    return addedItem;
  };

  const copyLastItem = async () => {
    if (items.value.length === 0) {
      return addItem();
    }
    const lastItem = items.value[items.value.length - 1];
    const { id, createdAt, updatedAt, ...copyData } = lastItem;
    return addItem(copyData);
  };

  const parseCabinetRange = (rangeStr: string): string[] => {
    const match = rangeStr.match(/^([A-Za-z]+)(\d+)-([A-Za-z]*)?(\d+)$/);
    if (!match) return [rangeStr];

    const [, prefix1, startStr, prefix2, endStr] = match;
    const prefix = prefix2 || prefix1;
    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);
    const padLength = Math.max(startStr.length, endStr.length);

    if (isNaN(start) || isNaN(end) || start > end) return [rangeStr];

    const cabinets: string[] = [];
    for (let i = start; i <= end; i++) {
      cabinets.push(`${prefix}${String(i).padStart(padLength, '0')}`);
    }
    return cabinets;
  };

  const fillContinuousCabinets = async (rangeStr: string, baseItem?: Partial<RainGear>) => {
    const cabinets = parseCabinetRange(rangeStr);
    const newItems: RainGear[] = [];
    const existingCabinets = new Set(items.value.map(item => item.cabinetNo.trim()));

    for (const cabinetNo of cabinets) {
      if (!existingCabinets.has(cabinetNo.trim())) {
        const newItem = await addItem({ ...baseItem, cabinetNo: cabinetNo.trim() });
        newItems.push(newItem);
      }
    }

    return newItems;
  };

  const updateItem = async (id: number, updates: Partial<RainGear>) => {
    const index = items.value.findIndex(item => item.id === id);
    if (index === -1) return;

    const oldItem = { ...items.value[index] };
    const sanitizedUpdates: Partial<RainGear> = { ...updates };

    if (sanitizedUpdates.cabinetNo !== undefined) {
      sanitizedUpdates.cabinetNo = sanitizedUpdates.cabinetNo.trim();
    }
    if (sanitizedUpdates.quantity !== undefined) {
      sanitizedUpdates.quantity = Math.max(0, Number(sanitizedUpdates.quantity) || 0);
    }
    if (sanitizedUpdates.minStock !== undefined) {
      sanitizedUpdates.minStock = Math.max(0, Number(sanitizedUpdates.minStock) || 0);
    }
    if (sanitizedUpdates.responsiblePerson !== undefined) {
      sanitizedUpdates.responsiblePerson = sanitizedUpdates.responsiblePerson.trim();
    }

    const newItem = { ...oldItem, ...sanitizedUpdates, updatedAt: new Date().toISOString() };

    const changedFields: string[] = [];
    for (const key of Object.keys(sanitizedUpdates)) {
      const k = key as keyof RainGear;
      if (String(oldItem[k]) !== String(newItem[k])) {
        changedFields.push(key);
      }
    }

    if (changedFields.length > 0) {
      if (changedFields.includes('quantity') || changedFields.includes('minStock')) {
        const isNowGap = newItem.quantity < newItem.minStock;
        if (isNowGap && newItem.status === 'available') {
          newItem.status = 'needRefill';
          if (!changedFields.includes('status')) {
            changedFields.push('status');
          }
        }
      }

      items.value[index] = newItem;
      await updateGear(newItem);

      for (const field of changedFields) {
        const label = FIELD_LABELS[field] || field;
        await recordHistory(
          id,
          label,
          String(oldItem[field as keyof RainGear]),
          String(newItem[field as keyof RainGear])
        );
      }

      items.value.sort((a, b) => a.cabinetNo.localeCompare(b.cabinetNo));
    }
  };

  const removeItem = async (id: number) => {
    const index = items.value.findIndex(item => item.id === id);
    if (index === -1) return;

    items.value.splice(index, 1);
    selectedIds.value.delete(id);
    await deleteGear(id);
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id);
    } else {
      selectedIds.value.add(id);
    }
  };

  const selectAll = () => {
    filteredItems.value.forEach(item => {
      selectedIds.value.add(item.id);
    });
  };

  const deselectAll = () => {
    selectedIds.value.clear();
  };

  const isAllSelected = computed(() => {
    if (filteredItems.value.length === 0) return false;
    return filteredItems.value.every(item => selectedIds.value.has(item.id));
  });

  const batchUpdateStatus = async (status: RainGearStatus) => {
    const filteredIdSet = new Set(filteredItems.value.map(item => item.id));
    const ids = Array.from(selectedIds.value).filter(id => filteredIdSet.has(id));
    if (ids.length === 0) return;

    await bulkUpdateStatus(ids, status);

    for (const id of ids) {
      const index = items.value.findIndex(item => item.id === id);
      if (index !== -1) {
        const oldStatus = items.value[index].status;
        items.value[index].status = status;
        items.value[index].updatedAt = new Date().toISOString();
        if (oldStatus !== status) {
          await recordHistory(id, '状态', oldStatus, status);
        }
      }
    }

    selectedIds.value.clear();
  };

  const batchRemove = async () => {
    const filteredIdSet = new Set(filteredItems.value.map(item => item.id));
    const ids = Array.from(selectedIds.value).filter(id => filteredIdSet.has(id));
    if (ids.length === 0) return;

    await bulkDelete(ids);
    const idSetToRemove = new Set(ids);
    items.value = items.value.filter(item => !idSetToRemove.has(item.id));
    selectedIds.value.clear();
  };

  const scrollToItem = (id: number) => {
    highlightId.value = id;
    const element = document.getElementById(`gear-row-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        highlightId.value = null;
      }, 3000);
    }
  };

  const setFilter = (key: keyof FilterOptions, value: any) => {
    (filters as any)[key] = value;
    const filteredIdSet = new Set(filteredItems.value.map(item => item.id));
    selectedIds.value.forEach(id => {
      if (!filteredIdSet.has(id)) {
        selectedIds.value.delete(id);
      }
    });
  };

  const toggleStatusFilter = (status: RainGearStatus) => {
    const index = filters.statuses.indexOf(status);
    if (index === -1) {
      filters.statuses.push(status);
    } else {
      filters.statuses.splice(index, 1);
    }
  };

  const exportJson = async () => {
    return exportData();
  };

  const importJson = async (jsonStr: string) => {
    const result = await importData(jsonStr);
    if (result.success > 0) {
      await loadData();
    }
    return result;
  };

  watch(
    () => items.value,
    () => {
      items.value.forEach(item => {
        if (isGap(item) && item.status === 'available') {
          updateItem(item.id, { status: 'needRefill' });
        }
      });
    },
    { deep: true }
  );

  return {
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
    responsibleStats,
    isGap,
    isCabinetDuplicate,
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
    toggleStatusFilter,
    exportJson,
    importJson,
  };
}
