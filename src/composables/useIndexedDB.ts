import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import type { RainGear, ModifyHistory } from '@/types';

const DB_NAME = 'rain_gear_db';
const DB_VERSION = 1;
const STORE_GEARS = 'rain_gears';
const STORE_HISTORY = 'modify_history';

let dbPromise: Promise<IDBPDatabase> | null = null;

function initDB(): Promise<IDBPDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
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
    return JSON.stringify({ gears, history }, null, 2);
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
  };
}
