// TaskYar Web 2.0 — Account-Scoped Offline IndexedDB Persistence Engine
// Provides zero-leakage multi-user isolation by naming databases TaskYarDB_{userId}
// Includes deep plain-record serialization to guarantee 100% DataCloneError immunity

import { toRaw } from 'vue';

let activeDb = null;
let currentUserId = null;

const DB_VERSION = 1;

/**
 * Deep plain serializer to unwrap Vue 3 Reactive Proxies, Pinia references,
 * protect against circular references, and eliminate non-cloneable objects.
 */
export function deepClonePlain(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'function' || typeof value === 'symbol') {
      return undefined;
    }
    return value;
  }

  // Unwrap Vue 3 reactive proxies
  const raw = toRaw(value);

  if (raw === null || typeof raw !== 'object') {
    if (typeof raw === 'function' || typeof raw === 'symbol') {
      return undefined;
    }
    return raw;
  }

  // Circular reference detection
  if (seen.has(raw)) {
    return seen.get(raw);
  }

  // Clone Date instances cleanly
  if (raw instanceof Date) {
    return new Date(raw.getTime());
  }

  // Clone Arrays
  if (Array.isArray(raw)) {
    const copy = [];
    seen.set(raw, copy);
    for (const item of raw) {
      const cloned = deepClonePlain(item, seen);
      if (cloned !== undefined) {
        copy.push(cloned);
      }
    }
    return copy;
  }

  // Clone Plain Objects
  const copy = {};
  seen.set(raw, copy);
  for (const key of Object.keys(raw)) {
    // Strip internal Vue reactivity keys
    if (
      key.startsWith('__v_') ||
      key === '__v_isRef' ||
      key === '__v_isReadonly' ||
      key === '__v_raw'
    ) {
      continue;
    }
    const val = deepClonePlain(raw[key], seen);
    if (val !== undefined) {
      copy[key] = val;
    }
  }
  return copy;
}

/**
 * Normalizes task data into a safe, cloneable record for IndexedDB.
 */
export function normalizeTaskRecord(task) {
  if (!task) return null;
  const raw = deepClonePlain(task);

  const localKey =
    raw.local_key ||
    (raw.id ? `id_${raw.id}` : (raw.client_uuid ? `uuid_${raw.client_uuid}` : `tmp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`));

  return {
    ...raw,
    local_key: localKey,
    id: raw.id ?? null,
    client_uuid: raw.client_uuid ?? null,
    title: String(raw.title || ''),
    period: raw.period || 'daily',
    dueDate: raw.dueDate || raw.due_date || null,
    due_date: raw.dueDate || raw.due_date || null,
    dueTime: raw.dueTime || raw.due_time || '',
    due_time: raw.dueTime || raw.due_time || '',
    completed: Boolean(raw.completed),
    important: Boolean(raw.important),
    notes: String(raw.notes || ''),
    category_id: raw.category_id ?? (raw.category?.id || null),
    category: raw.category ? deepClonePlain(raw.category) : null,
    tags: Array.isArray(raw.tags) ? raw.tags.map(t => deepClonePlain(t)) : [],
    subtasks: Array.isArray(raw.subtasks) ? raw.subtasks.map(s => deepClonePlain(s)) : [],
    alarmEnabled: Boolean(raw.alarmEnabled || raw.alarm_enabled),
    alarm_enabled: Boolean(raw.alarmEnabled || raw.alarm_enabled),
    alarmTriggered: Boolean(raw.alarmTriggered || raw.alarm_triggered),
    reminderOffsetMinutes: Number(raw.reminderOffsetMinutes ?? raw.reminder_offset_minutes ?? 0),
    reminder_offset_minutes: Number(raw.reminderOffsetMinutes ?? raw.reminder_offset_minutes ?? 0),
    snoozeUntil: raw.snoozeUntil || raw.snooze_until || null,
    recurrencePattern: raw.recurrencePattern || raw.recurrence_pattern || 'none',
    recurrence_pattern: raw.recurrencePattern || raw.recurrence_pattern || 'none',
    recurrenceInterval: Number(raw.recurrenceInterval ?? raw.recurrence_interval ?? 1),
    recurrence_interval: Number(raw.recurrenceInterval ?? raw.recurrence_interval ?? 1),
    recurrenceWeekdays: raw.recurrenceWeekdays || raw.recurrence_weekdays || null,
    recurrenceEndDate: raw.recurrenceEndDate || raw.recurrence_end_date || null,
    recurrenceCount: raw.recurrenceCount ?? raw.recurrence_count ?? null,
    revision: Number(raw.revision || 1),
    sync_status: raw.sync_status || 'synced',
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    created_at: raw.createdAt || raw.created_at || new Date().toISOString(),
    updated_at: raw.updated_at || new Date().toISOString()
  };
}

/**
 * Normalizes category data into a safe, cloneable record.
 */
export function normalizeCategoryRecord(cat) {
  if (!cat) return null;
  const raw = deepClonePlain(cat);
  return {
    id: raw.id,
    name: String(raw.name || ''),
    color: raw.color || '#3B82F6',
    icon: raw.icon || null,
    user_id: raw.user_id ?? null,
    created_at: raw.created_at || null,
    updated_at: raw.updated_at || null
  };
}

/**
 * Normalizes tag data into a safe, cloneable record.
 */
export function normalizeTagRecord(tag) {
  if (!tag) return null;
  const raw = deepClonePlain(tag);
  return {
    id: raw.id,
    name: String(raw.name || ''),
    color: raw.color || '#6D28D9',
    user_id: raw.user_id ?? null
  };
}

/**
 * Normalizes mutation data into a safe, cloneable record.
 */
export function normalizeMutationRecord(mut) {
  if (!mut) return null;
  const raw = deepClonePlain(mut);
  return {
    id: raw.id || `mut_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    type: raw.type,
    client_uuid: raw.client_uuid || null,
    expected_revision: raw.expected_revision ?? null,
    payload: deepClonePlain(raw.payload || {}),
    timestamp: Number(raw.timestamp || Date.now())
  };
}

/**
 * Open (or switch to) the IndexedDB database for a specific authenticated user.
 */
export function openUserDb(userId) {
  if (!userId) {
    closeUserDb();
    return Promise.resolve(null);
  }

  if (activeDb && currentUserId === userId) {
    return Promise.resolve(activeDb);
  }

  closeUserDb();
  currentUserId = userId;
  const dbName = `TaskYarDB_${userId}`;

  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(dbName, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 1. Tasks Store
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'local_key' });
          taskStore.createIndex('id', 'id', { unique: false });
          taskStore.createIndex('client_uuid', 'client_uuid', { unique: false });
          taskStore.createIndex('dueDate', 'dueDate', { unique: false });
          taskStore.createIndex('completed', 'completed', { unique: false });
        }

        // 2. Categories Store
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }

        // 3. Tags Store
        if (!db.objectStoreNames.contains('tags')) {
          db.createObjectStore('tags', { keyPath: 'id' });
        }

        // 4. Pending Offline Mutations Queue
        if (!db.objectStoreNames.contains('pending_mutations')) {
          const mutStore = db.createObjectStore('pending_mutations', { keyPath: 'id' });
          mutStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // 5. Sync Metadata
        if (!db.objectStoreNames.contains('sync_meta')) {
          db.createObjectStore('sync_meta', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        activeDb = event.target.result;
        console.log(`[OfflineDB] Opened account-isolated database: ${dbName}`);
        resolve(activeDb);
      };

      request.onerror = (event) => {
        console.error('[OfflineDB] Error opening database:', event.target.error);
        reject(event.target.error);
      };
    } catch (err) {
      console.error('[OfflineDB] Unexpected exception opening database:', err);
      reject(err);
    }
  });
}

/**
 * Close active database connection on logout or account switch.
 */
export function closeUserDb() {
  if (activeDb) {
    activeDb.close();
    activeDb = null;
    currentUserId = null;
  }
}

// -------------------------------------------------------------
// Tasks Persistence
// -------------------------------------------------------------

export async function saveTaskOffline(task) {
  if (!activeDb || !task) return false;
  const cleanTask = normalizeTaskRecord(task);

  return new Promise((resolve, reject) => {
    try {
      const tx = activeDb.transaction('tasks', 'readwrite');
      const store = tx.objectStore('tasks');

      tx.oncomplete = () => resolve(cleanTask);
      tx.onerror = () => {
        console.error('[OfflineDB] Transaction error saving task:', tx.error);
        reject(tx.error);
      };
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));

      const req = store.put(cleanTask);
      req.onerror = () => {
        console.error('[OfflineDB] Store.put error saving task:', req.error);
      };
    } catch (err) {
      console.error('[OfflineDB] Exception saving task offline:', err);
      reject(err);
    }
  });
}

/**
 * Batch saves tasks with offline-safety guarantee:
 * Never deletes pending offline mutations or unsynced tasks.
 */
export async function saveTasksOffline(tasksList) {
  if (!activeDb) return false;
  const incoming = Array.isArray(tasksList) ? tasksList : [];

  return new Promise((resolve, reject) => {
    try {
      const tx = activeDb.transaction(['tasks'], 'readwrite');
      const store = tx.objectStore('tasks');

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => {
        console.error('[OfflineDB] Transaction error in saveTasksOffline:', tx.error);
        reject(tx.error);
      };
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));

      // 1. Fetch existing tasks to preserve any pending offline changes
      const getReq = store.getAll();
      getReq.onsuccess = () => {
        const existing = getReq.result || [];
        const pendingOfflineTasks = new Map();

        // Identify local pending tasks that haven't synced yet
        for (const item of existing) {
          if (item && item.sync_status === 'pending') {
            pendingOfflineTasks.set(item.local_key, item);
          }
        }

        // 2. Clear store safely
        const clearReq = store.clear();
        clearReq.onsuccess = () => {
          // Re-insert incoming server tasks
          for (const item of incoming) {
            const clean = normalizeTaskRecord(item);
            if (clean) {
              store.put(clean);
            }
          }

          // Re-insert preserved offline pending tasks (if not superseded by server version)
          for (const [key, pendingTask] of pendingOfflineTasks) {
            const superseded = incoming.some(
              t => (t.client_uuid && t.client_uuid === pendingTask.client_uuid) || (t.id && t.id === pendingTask.id)
            );
            if (!superseded) {
              store.put(pendingTask);
            }
          }
        };
        clearReq.onerror = () => {
          console.error('[OfflineDB] Clear error:', clearReq.error);
        };
      };
      getReq.onerror = () => {
        console.error('[OfflineDB] Error reading existing tasks:', getReq.error);
      };
    } catch (err) {
      console.error('[OfflineDB] Exception in saveTasksOffline:', err);
      reject(err);
    }
  });
}

export async function getAllTasksOffline() {
  if (!activeDb) return [];

  return new Promise((resolve) => {
    try {
      const tx = activeDb.transaction('tasks', 'readonly');
      const store = tx.objectStore('tasks');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => {
        console.warn('[OfflineDB] Error reading all tasks:', req.error);
        resolve([]);
      };
    } catch (err) {
      console.warn('[OfflineDB] Exception in getAllTasksOffline:', err);
      resolve([]);
    }
  });
}

export async function deleteTaskOffline(idOrUuid) {
  if (!activeDb || !idOrUuid) return false;

  return new Promise((resolve) => {
    try {
      const tx = activeDb.transaction('tasks', 'readwrite');
      const store = tx.objectStore('tasks');
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);

      store.delete(`id_${idOrUuid}`);
      store.delete(`uuid_${idOrUuid}`);
    } catch (err) {
      console.warn('[OfflineDB] Exception in deleteTaskOffline:', err);
      resolve(false);
    }
  });
}

// -------------------------------------------------------------
// Categories & Tags Persistence
// -------------------------------------------------------------

export async function saveCategoriesOffline(categories) {
  if (!activeDb) return false;
  const list = Array.isArray(categories) ? categories : [];

  return new Promise((resolve, reject) => {
    try {
      const tx = activeDb.transaction('categories', 'readwrite');
      const store = tx.objectStore('categories');

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => {
        console.error('[OfflineDB] Transaction error in saveCategoriesOffline:', tx.error);
        reject(tx.error);
      };
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));

      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        for (const c of list) {
          if (!c) continue;
          const clean = normalizeCategoryRecord(c);
          if (clean && clean.id != null) {
            store.put(clean);
          }
        }
      };
      clearReq.onerror = () => {
        console.error('[OfflineDB] Clear error in saveCategoriesOffline:', clearReq.error);
      };
    } catch (err) {
      console.error('[OfflineDB] Exception in saveCategoriesOffline:', err);
      reject(err);
    }
  });
}

export async function getAllCategoriesOffline() {
  if (!activeDb) return [];

  return new Promise((resolve) => {
    try {
      const tx = activeDb.transaction('categories', 'readonly');
      const store = tx.objectStore('categories');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch (err) {
      console.warn('[OfflineDB] Exception in getAllCategoriesOffline:', err);
      resolve([]);
    }
  });
}

export async function saveTagsOffline(tags) {
  if (!activeDb) return false;
  const list = Array.isArray(tags) ? tags : [];

  return new Promise((resolve, reject) => {
    try {
      const tx = activeDb.transaction('tags', 'readwrite');
      const store = tx.objectStore('tags');

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);

      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        for (const t of list) {
          if (!t) continue;
          const clean = normalizeTagRecord(t);
          if (clean && clean.id != null) {
            store.put(clean);
          }
        }
      };
    } catch (err) {
      console.error('[OfflineDB] Exception in saveTagsOffline:', err);
      reject(err);
    }
  });
}

export async function getAllTagsOffline() {
  if (!activeDb) return [];

  return new Promise((resolve) => {
    try {
      const tx = activeDb.transaction('tags', 'readonly');
      const store = tx.objectStore('tags');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch (err) {
      console.warn('[OfflineDB] Exception in getAllTagsOffline:', err);
      resolve([]);
    }
  });
}

// -------------------------------------------------------------
// Offline Mutation Queue Persistence
// -------------------------------------------------------------

export async function enqueueMutation(mutation) {
  if (!activeDb || !mutation) return false;
  const cleanItem = normalizeMutationRecord(mutation);

  return new Promise((resolve, reject) => {
    try {
      const tx = activeDb.transaction('pending_mutations', 'readwrite');
      const store = tx.objectStore('pending_mutations');

      tx.oncomplete = () => {
        console.log('[OfflineDB] Mutation enqueued:', cleanItem.type, cleanItem.id);
        resolve(cleanItem);
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);

      store.put(cleanItem);
    } catch (err) {
      console.error('[OfflineDB] Exception in enqueueMutation:', err);
      reject(err);
    }
  });
}

export async function getPendingMutations() {
  if (!activeDb) return [];

  return new Promise((resolve, reject) => {
    try {
      const tx = activeDb.transaction('pending_mutations', 'readonly');
      const store = tx.objectStore('pending_mutations');
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result || [];
        items.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    } catch (err) {
      console.warn('[OfflineDB] Exception in getPendingMutations:', err);
      resolve([]);
    }
  });
}

export async function removeMutation(mutationId) {
  if (!activeDb || !mutationId) return false;

  return new Promise((resolve) => {
    try {
      const tx = activeDb.transaction('pending_mutations', 'readwrite');
      const store = tx.objectStore('pending_mutations');
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);

      store.delete(mutationId);
    } catch (err) {
      console.warn('[OfflineDB] Exception in removeMutation:', err);
      resolve(false);
    }
  });
}

export async function clearPendingMutations() {
  if (!activeDb) return false;

  return new Promise((resolve) => {
    try {
      const tx = activeDb.transaction('pending_mutations', 'readwrite');
      const store = tx.objectStore('pending_mutations');
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);

      store.clear();
    } catch (err) {
      console.warn('[OfflineDB] Exception in clearPendingMutations:', err);
      resolve(false);
    }
  });
}

// -------------------------------------------------------------
// Metadata Persistence (Last Sync, etc.)
// -------------------------------------------------------------

export async function setSyncMeta(key, value) {
  if (!activeDb || !key) return false;

  return new Promise((resolve) => {
    try {
      const tx = activeDb.transaction('sync_meta', 'readwrite');
      const store = tx.objectStore('sync_meta');
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);

      store.put({ key, value: deepClonePlain(value) });
    } catch (err) {
      console.warn('[OfflineDB] Exception in setSyncMeta:', err);
      resolve(false);
    }
  });
}

export async function getSyncMeta(key) {
  if (!activeDb || !key) return null;

  return new Promise((resolve) => {
    try {
      const tx = activeDb.transaction('sync_meta', 'readonly');
      const store = tx.objectStore('sync_meta');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => resolve(null);
    } catch (err) {
      console.warn('[OfflineDB] Exception in getSyncMeta:', err);
      resolve(null);
    }
  });
}
