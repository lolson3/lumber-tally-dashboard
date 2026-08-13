const DATABASE_NAME = "lumber-tally-dashboard";
const DATABASE_VERSION = 1;
const TABLE_STORE = "bronze-tables";

export interface PersistedTable<T> {
  table: string;
  rowCount: number;
  rows: T[];
}

function openDatabase() {
  if (!("indexedDB" in globalThis)) return Promise.resolve<IDBDatabase | null>(null);
  return new Promise<IDBDatabase | null>((resolve) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(TABLE_STORE)) database.createObjectStore(TABLE_STORE, { keyPath: "table" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

const databasePromise = openDatabase();

export async function readPersistedTable<T>(table: string): Promise<PersistedTable<T> | null> {
  const database = await databasePromise;
  if (!database) return null;
  return new Promise((resolve) => {
    const request = database.transaction(TABLE_STORE, "readonly").objectStore(TABLE_STORE).get(table);
    request.onsuccess = () => resolve((request.result as PersistedTable<T> | undefined) ?? null);
    request.onerror = () => resolve(null);
  });
}

export async function persistTable<T>(entry: PersistedTable<T>) {
  const database = await databasePromise;
  if (!database) return;
  await new Promise<void>((resolve) => {
    const transaction = database.transaction(TABLE_STORE, "readwrite");
    transaction.objectStore(TABLE_STORE).put(entry);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
}
