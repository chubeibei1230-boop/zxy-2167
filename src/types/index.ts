export type RainGearStatus = 'available' | 'needRefill' | 'needClean' | 'closed';

export interface RainGear {
  id: number;
  name: string;
  cabinetNo: string;
  quantity: number;
  minStock: number;
  responsiblePerson: string;
  tempNote: string;
  description: string;
  status: RainGearStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ModifyHistory {
  id: number;
  recordId: number;
  fieldName: string;
  oldValue: string;
  newValue: string;
  modifiedAt: string;
}

export interface SummaryData {
  gapItems: RainGear[];
  duplicateCabinets: string[];
  emptyResponsible: RainGear[];
  recentHistory: ModifyHistory[];
}

export interface FilterOptions {
  cabinetNo: string;
  responsiblePerson: string;
  statuses: RainGearStatus[];
  showGapOnly: boolean;
}

export const STATUS_LABELS: Record<RainGearStatus, string> = {
  available: '可使用',
  needRefill: '待补充',
  needClean: '待清洁',
  closed: '暂不开放',
};

export const STATUS_COLORS: Record<RainGearStatus, string> = {
  available: 'bg-sky-500',
  needRefill: 'bg-orange-500',
  needClean: 'bg-blue-500',
  closed: 'bg-gray-500',
};

export type CheckStatus = 'unchecked' | 'confirmed' | 'needsAction';

export interface InventoryTask {
  id: number;
  name: string;
  scope: string;
  plannedCompletionTime: string;
  responsiblePerson: string;
  status: 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface TaskCheckRecord {
  id: number;
  taskId: number;
  gearId: number;
  checkStatus: CheckStatus;
  actionNote: string;
  checkedAt: string;
}

export interface TaskConclusion {
  gapItems: RainGear[];
  duplicateCabinets: string[];
  emptyResponsible: RainGear[];
  actionNotes: { gearId: number; cabinetNo: string; name: string; note: string }[];
}

export const CHECK_STATUS_LABELS: Record<CheckStatus, string> = {
  unchecked: '未核对',
  confirmed: '已确认',
  needsAction: '需处理',
};

export const CHECK_STATUS_COLORS: Record<CheckStatus, string> = {
  unchecked: 'bg-gray-500',
  confirmed: 'bg-emerald-500',
  needsAction: 'bg-red-500',
};

export const CHECK_STATUS_TEXT_COLORS: Record<CheckStatus, string> = {
  unchecked: 'text-gray-400',
  confirmed: 'text-emerald-400',
  needsAction: 'text-red-400',
};

export const STATUS_TEXT_COLORS: Record<RainGearStatus, string> = {
  available: 'text-sky-400',
  needRefill: 'text-orange-400',
  needClean: 'text-blue-400',
  closed: 'text-gray-400',
};
