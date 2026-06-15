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

export const STATUS_TEXT_COLORS: Record<RainGearStatus, string> = {
  available: 'text-sky-400',
  needRefill: 'text-orange-400',
  needClean: 'text-blue-400',
  closed: 'text-gray-400',
};
