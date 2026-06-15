import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import type { RainGear, ModifyHistory, InventoryTask, TaskCheckRecord, RestockRecord } from '@/types';

const DB_NAME = 'rain_gear_db';
const DB_VERSION = 3;
const STORE_GEARS = 'rain_gears';
const STORE_HISTORY = 'modify_history';
const STORE_TASKS = 'inventory_tasks';
const STORE_CHECK_RECORDS = 'task_check_records';
const STORE_RESTOCK_RECORDS = 'restock_records';

let dbPromise: Promise<IDBPDatabase> | null = null;

function initDB(): Promise<IDBPDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains(STORE_GEARS)) {
        const gearStore = db.createObjectStore(STORE_GEARS, {
          keyPath: 'id',
          autoIncrement: true,
        });
        gearStore.createIndex('cabinetNo', 'cabinetNo', { unique: false });
        gearStore.createIndex('responsiblePerson', 'responsiblePerson', { unique: false });
        gearStore.createIndex('status', 'status', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_HISTORY)) {
        const historyStore = db.createObjectStore(STORE_HISTORY, {
          keyPath: 'id',
          autoIncrement: true,
        });
        historyStore.createIndex('recordId', 'recordId', { unique: false });
        historyStore.createIndex('modifiedAt', 'modifiedAt', { unique: false });
      }

      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(STORE_TASKS)) {
          const taskStore = db.createObjectStore(STORE_TASKS, {
            keyPath: 'id',
            autoIncrement: true,
          });
          taskStore.createIndex('status', 'status', { unique: false });
          taskStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORE_CHECK_RECORDS)) {
          const checkStore = db.createObjectStore(STORE_CHECK_RECORDS, {
            keyPath: 'id',
            autoIncrement: true,
          });
          checkStore.createIndex('taskId', 'taskId', { unique: false });
          checkStore.createIndex('gearId', 'gearId', { unique: false });
          checkStore.createIndex('checkStatus', 'checkStatus', { unique: false });
        }
      }

      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains(STORE_RESTOCK_RECORDS)) {
          const restockStore = db.createObjectStore(STORE_RESTOCK_RECORDS, {
            keyPath: 'id',
            autoIncrement: true,
          });
          restockStore.createIndex('gearId', 'gearId', { unique: false });
          restockStore.createIndex('status', 'status', { unique: false });
          restockStore.createIndex('createdAt', 'createdAt', { unique: false });
          restockStore.createIndex('sourceTaskId', 'sourceTaskId', { unique: false });
        }
      }
    },
  });

  return dbPromise;
}

export function useIndexedDB() {
  const db = initDB();

  const getAllGears = async (): Promise<RainGear[]> => {
    const result = await (await db).getAll(STORE_GEARS);
    return result as RainGear[];
  };

  const addGear = async (gear: Omit<RainGear, 'id'>): Promise<number> => {
    return (await db).add(STORE_GEARS, gear) as Promise<number>;
  };

  const updateGear = async (gear: RainGear): Promise<void> => {
    await (await db).put(STORE_GEARS, gear);
  };

  const deleteGear = async (id: number): Promise<void> => {
    await (await db).delete(STORE_GEARS, id);
  };

  const addHistory = async (history: Omit<ModifyHistory, 'id'>): Promise<number> => {
    return (await db).add(STORE_HISTORY, history) as Promise<number>;
  };

  const getRecentHistory = async (limit: number = 10): Promise<ModifyHistory[]> => {
    const tx = (await db).transaction(STORE_HISTORY, 'readonly');
    const store = tx.store;
    const index = store.index('modifiedAt');
    const result: ModifyHistory[] = [];

    let cursor = await index.openCursor(null, 'prev');
    while (cursor && result.length < limit) {
      result.push(cursor.value as ModifyHistory);
      cursor = await cursor.continue();
    }

    await tx.done;
    return result;
  };

  const bulkUpdateStatus = async (ids: number[], status: string): Promise<void> => {
    const tx = (await db).transaction(STORE_GEARS, 'readwrite');
    const store = tx.store;

    for (const id of ids) {
      const gear = await store.get(id);
      if (gear) {
        gear.status = status;
        gear.updatedAt = new Date().toISOString();
        await store.put(gear);
      }
    }

    await tx.done;
  };

  const bulkDelete = async (ids: number[]): Promise<void> => {
    const tx = (await db).transaction(STORE_GEARS, 'readwrite');
    const store = tx.store;

    for (const id of ids) {
      await store.delete(id);
    }

    await tx.done;
  };

  const exportData = async (): Promise<string> => {
    const gears = await getAllGears();
    const history = await getRecentHistory(1000);
    const tasks = await getAllTasks();
    const checkRecords = await getAllCheckRecords();
    const restockRecords = await getAllRestockRecords();
    return JSON.stringify({ gears, history, tasks, checkRecords, restockRecords }, null, 2);
  };

  const importData = async (jsonStr: string): Promise<{ success: number; failed: number }> => {
    const data = JSON.parse(jsonStr);
    const gears = data.gears || [];
    let success = 0;
    let failed = 0;

    const tx = (await db).transaction(STORE_GEARS, 'readwrite');
    const store = tx.store;

    for (const gear of gears) {
      try {
        const { id, ...gearWithoutId } = gear;
        await store.add(gearWithoutId);
        success++;
      } catch (e) {
        failed++;
      }
    }

    await tx.done;
    return { success, failed };
  };

  const getAllTasks = async (): Promise<InventoryTask[]> => {
    const result = await (await db).getAll(STORE_TASKS);
    return result as InventoryTask[];
  };

  const addTask = async (task: Omit<InventoryTask, 'id'>): Promise<number> => {
    return (await db).add(STORE_TASKS, task) as Promise<number>;
  };

  const updateTask = async (task: InventoryTask): Promise<void> => {
    await (await db).put(STORE_TASKS, task);
  };

  const deleteTask = async (id: number): Promise<void> => {
    await (await db).delete(STORE_TASKS, id);
  };

  const getAllCheckRecords = async (): Promise<TaskCheckRecord[]> => {
    const result = await (await db).getAll(STORE_CHECK_RECORDS);
    return result as TaskCheckRecord[];
  };

  const getCheckRecordsByTask = async (taskId: number): Promise<TaskCheckRecord[]> => {
    const tx = (await db).transaction(STORE_CHECK_RECORDS, 'readonly');
    const store = tx.store;
    const index = store.index('taskId');
    const result: TaskCheckRecord[] = [];

    let cursor = await index.openCursor(taskId);
    while (cursor) {
      result.push(cursor.value as TaskCheckRecord);
      cursor = await cursor.continue();
    }

    await tx.done;
    return result;
  };

  const addCheckRecord = async (record: Omit<TaskCheckRecord, 'id'>): Promise<number> => {
    return (await db).add(STORE_CHECK_RECORDS, record) as Promise<number>;
  };

  const updateCheckRecord = async (record: TaskCheckRecord): Promise<void> => {
    await (await db).put(STORE_CHECK_RECORDS, record);
  };

  const bulkAddCheckRecords = async (records: Omit<TaskCheckRecord, 'id'>[]): Promise<void> => {
    const tx = (await db).transaction(STORE_CHECK_RECORDS, 'readwrite');
    const store = tx.store;

    for (const record of records) {
      await store.add(record);
    }

    await tx.done;
  };

  const deleteCheckRecordsByTask = async (taskId: number): Promise<void> => {
    const records = await getCheckRecordsByTask(taskId);
    const tx = (await db).transaction(STORE_CHECK_RECORDS, 'readwrite');
    const store = tx.store;

    for (const record of records) {
      await store.delete(record.id);
    }

    await tx.done;
  };

  const getAllRestockRecords = async (): Promise<RestockRecord[]> => {
    const result = await (await db).getAll(STORE_RESTOCK_RECORDS);
    return result as RestockRecord[];
  };

  const getRestockRecordsByGear = async (gearId: number): Promise<RestockRecord[]> => {
    const tx = (await db).transaction(STORE_RESTOCK_RECORDS, 'readonly');
    const store = tx.store;
    const index = store.index('gearId');
    const result: RestockRecord[] = [];

    let cursor = await index.openCursor(gearId);
    while (cursor) {
      result.push(cursor.value as RestockRecord);
      cursor = await cursor.continue();
    }

    await tx.done;
    return result;
  };

  const addRestockRecord = async (record: Omit<RestockRecord, 'id'>): Promise<number> => {
    return (await db).add(STORE_RESTOCK_RECORDS, record) as Promise<number>;
  };

  const updateRestockRecord = async (record: RestockRecord): Promise<void> => {
    await (await db).put(STORE_RESTOCK_RECORDS, record);
  };

  const deleteRestockRecord = async (id: number): Promise<void> => {
    await (await db).delete(STORE_RESTOCK_RECORDS, id);
  };

  const bulkAddRestockRecords = async (records: Omit<RestockRecord, 'id'>[]): Promise<void> => {
    const tx = (await db).transaction(STORE_RESTOCK_RECORDS, 'readwrite');
    const store = tx.store;

    for (const record of records) {
      await store.add(record);
    }

    await tx.done;
  };

  return {
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
    getAllTasks,
    addTask,
    updateTask,
    deleteTask,
    getAllCheckRecords,
    getCheckRecordsByTask,
    addCheckRecord,
    updateCheckRecord,
    bulkAddCheckRecords,
    deleteCheckRecordsByTask,
    getAllRestockRecords,
    getRestockRecordsByGear,
    addRestockRecord,
    updateRestockRecord,
    deleteRestockRecord,
    bulkAddRestockRecords,
  };
}
