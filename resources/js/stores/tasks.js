import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiRequest } from '@/api/client';
import { getLocalISODate, isoToJalali, jalaliToISO, jalaliMonthLength, getCurrentPersianWeekDays } from '@/utils/jalali';
import { playCompleteSound, playAlarmBeep } from '@/utils/audio';
import {
    openUserDb,
    closeUserDb,
    saveTaskOffline,
    saveTasksOffline,
    getAllTasksOffline,
    deleteTaskOffline,
    saveCategoriesOffline,
    getAllCategoriesOffline,
    saveTagsOffline,
    getAllTagsOffline,
    enqueueMutation,
    getPendingMutations,
    removeMutation,
    clearPendingMutations,
    setSyncMeta,
    getSyncMeta
} from '@/utils/offlineDb';

export const useTasksStore = defineStore('tasks', () => {
    const tasks = ref([]);
    const categories = ref([]);
    const tags = ref([]);
    const loading = ref(false);
    const currentView = ref('myday');
    const searchQuery = ref('');
    const selectedTaskId = ref(null);
    const selectedCategoryFilter = ref(null);
    const selectedTagFilter = ref(null);
    const activeAlarmTaskId = ref(null);
    const alarmModalOpen = ref(false);
    let alarmTimer = null;
    const selectedDateISO = ref(getLocalISODate());

    // Offline & Sync state
    const isOnline = ref(typeof window !== 'undefined' ? window.navigator.onLine : true);
    const isSyncing = ref(false);
    const pendingSyncCount = ref(0);
    const activeConflict = ref(null);
    let syncBackoffTimeout = null;
    let syncAttempts = 0;

    if (typeof window !== 'undefined') {
        window.addEventListener('online', () => {
            isOnline.value = true;
            triggerSync();
        });
        window.addEventListener('offline', () => {
            isOnline.value = false;
        });
    }

    // Advanced Reminders state
    const requestedNotificationPermission = ref(false);
    const triggeredAlarmsSet = new Set();

    // Modals state
    const categoryModalOpen = ref(false);
    const recurrenceModalOpen = ref(false);
    const recurrenceModalTargetTask = ref(null);
    const recurrenceActionModalOpen = ref(false);
    const recurrenceActionTargetOccurrence = ref(null);

    const selectedTask = computed(() => {
        return tasks.value.find(t => t.id === selectedTaskId.value) || null;
    });

    const activeAlarmTask = computed(() => {
        return tasks.value.find(t => t.id === activeAlarmTaskId.value) || null;
    });

    const filteredTasks = computed(() => {
        const q = searchQuery.value.trim().toLowerCase();
        const todayISO = getLocalISODate();
        const catFilter = selectedCategoryFilter.value;
        const tagFilter = selectedTagFilter.value;

        return tasks.value.filter(t => {
            // Category filter
            if (catFilter !== null) {
                if (catFilter === 'uncategorized') {
                    if (t.category_id || t.category) return false;
                } else {
                    const cId = t.category_id || t.category?.id;
                    if (cId !== catFilter) return false;
                }
            }

            // Tag filter
            if (tagFilter !== null) {
                const hasTag = (t.tags || []).some(tag => tag.id === tagFilter);
                if (!hasTag) return false;
            }

            // Search query
            if (q && !t.title.toLowerCase().includes(q)) return false;

            // View filters
            if (currentView.value === 'analytics') {
                return false;
            }
            if (currentView.value === 'myday') {
                return (t.dueDate || t.due_date) === todayISO;
            }
            if (currentView.value === 'daydetail') {
                return (t.dueDate || t.due_date) === selectedDateISO.value;
            }
            if (currentView.value === 'important') {
                return Boolean(t.important);
            }
            if (currentView.value === 'daily') {
                return t.period === 'daily';
            }
            if (currentView.value === 'weekly') {
                return t.period === 'weekly';
            }
            if (currentView.value === 'monthly') {
                return t.period === 'monthly';
            }
            return true;
        });
    });

    const activeTasks = computed(() => filteredTasks.value.filter(t => !t.completed));
    const completedTasks = computed(() => filteredTasks.value.filter(t => t.completed));

    const progressPercent = computed(() => {
        const total = filteredTasks.value.length;
        if (total === 0) return 0;
        const done = completedTasks.value.length;
        return Math.round((done / total) * 100);
    });

    const badges = computed(() => {
        const active = tasks.value.filter(t => !t.completed);
        const todayISO = getLocalISODate();

        return {
            myday: active.filter(t => (t.dueDate || t.due_date) === todayISO).length,
            important: active.filter(t => t.important).length,
            daily: active.filter(t => t.period === 'daily').length,
            weekly: active.filter(t => t.period === 'weekly').length,
            monthly: active.filter(t => t.period === 'monthly').length,
            all: active.length
        };
    });

    const categoryCounts = computed(() => {
        const counts = {};
        for (const t of tasks.value) {
            const catId = t.category_id || t.category?.id;
            if (catId) {
                counts[catId] = (counts[catId] || 0) + 1;
            }
        }
        return counts;
    });

    // ---------------------------------------------------------
    // Offline Storage Initialization
    // ---------------------------------------------------------

    async function initOfflineStore(userId) {
        if (!userId) {
            closeUserDb();
            return;
        }
        try {
            await openUserDb(userId);
            const cachedMutations = await getPendingMutations();
            pendingSyncCount.value = cachedMutations.length;

            const cachedTasks = await getAllTasksOffline();
            if (cachedTasks.length > 0 && tasks.value.length === 0) {
                tasks.value = cachedTasks;
            }

            const cachedCats = await getAllCategoriesOffline();
            if (cachedCats.length > 0 && categories.value.length === 0) {
                categories.value = cachedCats;
            }

            const cachedTags = await getAllTagsOffline();
            if (cachedTags.length > 0 && tags.value.length === 0) {
                tags.value = cachedTags;
            }

            if (isOnline.value) {
                triggerSync();
            }
        } catch (e) {
            console.warn('[OfflineStore] Failed to initialize account DB:', e);
        }
    }

    // ---------------------------------------------------------
    // Fetch Actions
    // ---------------------------------------------------------

    async function fetchTasks(params = {}) {
        loading.value = true;
        try {
            if (!isOnline.value) {
                const cached = await getAllTasksOffline();
                tasks.value = cached;
                return;
            }

            let url = '/api/tasks';
            const queryParams = new URLSearchParams();
            if (currentView.value === 'weekboard') {
                const weekDays = getCurrentPersianWeekDays();
                queryParams.set('from', weekDays[0].iso);
                queryParams.set('to', weekDays[6].iso);
            } else if (currentView.value === 'monthboard') {
                const todayJalali = isoToJalali(getLocalISODate());
                const mLen = jalaliMonthLength(todayJalali.jy, todayJalali.jm);
                queryParams.set('from', jalaliToISO(todayJalali.jy, todayJalali.jm, 1));
                queryParams.set('to', jalaliToISO(todayJalali.jy, todayJalali.jm, mLen));
            }

            for (const [key, val] of Object.entries(params)) {
                if (val !== null && val !== undefined) {
                    queryParams.set(key, val);
                }
            }

            const qs = queryParams.toString();
            if (qs) url += `?${qs}`;

            const data = await apiRequest(url);
            tasks.value = data.tasks || [];

            // Update offline cache with persistent base tasks
            const persistable = tasks.value.filter(t => !t.is_occurrence);
            await saveTasksOffline(persistable);

        } catch (err) {
            console.error('Error fetching tasks from server, falling back to IndexedDB:', err);
            const cached = await getAllTasksOffline();
            if (cached.length > 0) {
                tasks.value = cached;
            }
        } finally {
            loading.value = false;
        }
    }

    async function fetchCategories() {
        try {
            if (!isOnline.value) {
                const cached = await getAllCategoriesOffline();
                if (cached.length > 0) categories.value = cached;
                return;
            }
            const data = await apiRequest('/api/categories');
            categories.value = data.categories || [];
            await saveCategoriesOffline(categories.value);
        } catch (err) {
            console.error('Error fetching categories:', err);
            const cached = await getAllCategoriesOffline();
            if (cached.length > 0) categories.value = cached;
        }
    }

    async function createCategory(payload) {
        try {
            const data = await apiRequest('/api/categories', {
                method: 'POST',
                body: payload
            });
            if (data?.category) {
                categories.value.push(data.category);
                await saveCategoriesOffline(categories.value);
            }
            return data.category;
        } catch (err) {
            console.error('Error creating category:', err);
            throw err;
        }
    }

    async function updateCategory(id, payload) {
        try {
            const data = await apiRequest(`/api/categories/${id}`, {
                method: 'PUT',
                body: payload
            });
            if (data?.category) {
                const idx = categories.value.findIndex(c => c.id === id);
                if (idx !== -1) {
                    categories.value[idx] = data.category;
                    await saveCategoriesOffline(categories.value);
                }
            }
            return data.category;
        } catch (err) {
            console.error('Error updating category:', err);
            throw err;
        }
    }

    async function deleteCategory(id) {
        try {
            await apiRequest(`/api/categories/${id}`, { method: 'DELETE' });
            categories.value = categories.value.filter(c => c.id !== id);
            await saveCategoriesOffline(categories.value);
            if (selectedCategoryFilter.value === id) {
                selectedCategoryFilter.value = null;
            }
            tasks.value.forEach(t => {
                if (t.category_id === id) {
                    t.category_id = null;
                    t.category = null;
                }
            });
        } catch (err) {
            console.error('Error deleting category:', err);
            throw err;
        }
    }

    async function fetchTags() {
        try {
            if (!isOnline.value) {
                const cached = await getAllTagsOffline();
                if (cached.length > 0) tags.value = cached;
                return;
            }
            const data = await apiRequest('/api/tags');
            tags.value = data.tags || [];
            await saveTagsOffline(tags.value);
        } catch (err) {
            console.error('Error fetching tags:', err);
            const cached = await getAllTagsOffline();
            if (cached.length > 0) tags.value = cached;
        }
    }

    async function createTag(payload) {
        try {
            const data = await apiRequest('/api/tags', {
                method: 'POST',
                body: payload
            });
            if (data?.tag) {
                tags.value.push(data.tag);
                await saveTagsOffline(tags.value);
            }
            return data.tag;
        } catch (err) {
            console.error('Error creating tag:', err);
            throw err;
        }
    }

    async function deleteTag(id) {
        try {
            await apiRequest(`/api/tags/${id}`, { method: 'DELETE' });
            tags.value = tags.value.filter(t => t.id !== id);
            await saveTagsOffline(tags.value);
            if (selectedTagFilter.value === id) {
                selectedTagFilter.value = null;
            }
            tasks.value.forEach(t => {
                if (t.tags) {
                    t.tags = t.tags.filter(tag => tag.id !== id);
                }
            });
        } catch (err) {
            console.error('Error deleting tag:', err);
            throw err;
        }
    }

    // ---------------------------------------------------------
    // Offline-Aware Task CRUD Operations
    // ---------------------------------------------------------

    async function addTask(payload) {
        const clientUuid = payload.client_uuid || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `uuid_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`);
        const todayISO = getLocalISODate();
        const dueDate = payload.due_date ?? payload.dueDate ?? null;

        const optimisticTask = {
            id: `temp_${Date.now()}`,
            client_uuid: clientUuid,
            title: payload.title,
            period: payload.period || 'daily',
            dueDate: dueDate,
            due_date: dueDate,
            dueTime: payload.due_time ?? payload.dueTime ?? null,
            due_time: payload.due_time ?? payload.dueTime ?? null,
            alarmEnabled: payload.alarm_enabled ?? payload.alarmEnabled ?? false,
            alarm_enabled: payload.alarm_enabled ?? payload.alarmEnabled ?? false,
            alarmTriggered: false,
            alarm_triggered: false,
            reminderOffsetMinutes: payload.reminder_offset_minutes ?? payload.reminderOffsetMinutes ?? 0,
            reminder_offset_minutes: payload.reminder_offset_minutes ?? payload.reminderOffsetMinutes ?? 0,
            snoozeUntil: null,
            snooze_until: null,
            completed: false,
            important: payload.important || false,
            myDay: dueDate === todayISO,
            my_day: dueDate === todayISO,
            notes: payload.notes || '',
            category_id: payload.category_id ?? payload.categoryId ?? null,
            recurrencePattern: payload.recurrence_pattern ?? payload.recurrencePattern ?? 'none',
            recurrence_pattern: payload.recurrence_pattern ?? payload.recurrencePattern ?? 'none',
            recurrenceInterval: payload.recurrence_interval ?? payload.recurrenceInterval ?? 1,
            recurrence_interval: payload.recurrence_interval ?? payload.recurrenceInterval ?? 1,
            recurrenceWeekdays: payload.recurrence_weekdays ?? payload.recurrenceWeekdays ?? null,
            recurrence_weekdays: payload.recurrence_weekdays ?? payload.recurrenceWeekdays ?? null,
            recurrenceEndDate: payload.recurrence_end_date ?? payload.recurrenceEndDate ?? null,
            recurrence_end_date: payload.recurrence_end_date ?? payload.recurrenceEndDate ?? null,
            recurrenceCount: payload.recurrence_count ?? payload.recurrenceCount ?? null,
            recurrence_count: payload.recurrence_count ?? payload.recurrenceCount ?? null,
            revision: 1,
            sync_status: isOnline.value ? 'synced' : 'pending',
            createdAt: new Date().toISOString(),
            subtasks: payload.subtasks || [],
            tags: payload.tags || []
        };

        tasks.value.unshift(optimisticTask);
        await saveTaskOffline(optimisticTask);

        if (!isOnline.value) {
            await enqueueMutation({
                type: 'create_task',
                client_uuid: clientUuid,
                payload: { ...payload, client_uuid: clientUuid }
            });
            pendingSyncCount.value++;
            return optimisticTask;
        }

        try {
            const data = await apiRequest('/api/tasks', {
                method: 'POST',
                body: { ...payload, client_uuid: clientUuid }
            });
            if (data?.task) {
                const idx = tasks.value.findIndex(t => t.client_uuid === clientUuid || t.id === optimisticTask.id);
                if (idx !== -1) {
                    tasks.value[idx] = data.task;
                }
                await saveTaskOffline(data.task);

                if (data.task.recurrence_pattern && data.task.recurrence_pattern !== 'none') {
                    await fetchTasks();
                }
                return data.task;
            }
        } catch (err) {
            console.warn('Network error adding task, enqueuing for sync:', err);
            optimisticTask.sync_status = 'pending';
            await saveTaskOffline(optimisticTask);
            await enqueueMutation({
                type: 'create_task',
                client_uuid: clientUuid,
                payload: { ...payload, client_uuid: clientUuid }
            });
            pendingSyncCount.value++;
            return optimisticTask;
        }
    }

    async function toggleComplete(id) {
        const task = tasks.value.find(t => t.id === id);
        if (!task) return;

        if (task.is_occurrence) {
            return toggleOccurrenceComplete(task.parent_id, task.occurrence_date, !task.completed);
        }

        const newStatus = !task.completed;
        task.completed = newStatus;
        task.sync_status = isOnline.value ? 'synced' : 'pending';

        if (newStatus) {
            playCompleteSound();
        }

        await saveTaskOffline(task);

        if (!isOnline.value) {
            await enqueueMutation({
                type: 'update_task',
                client_uuid: task.client_uuid,
                expected_revision: task.revision,
                payload: { id: task.id, completed: newStatus, client_uuid: task.client_uuid }
            });
            pendingSyncCount.value++;
            return;
        }

        try {
            await apiRequest(`/api/tasks/${id}`, {
                method: 'PUT',
                body: { completed: newStatus, expected_revision: task.revision }
            });
            task.sync_status = 'synced';
            await saveTaskOffline(task);
        } catch (err) {
            if (err?.status === 409) {
                activeConflict.value = {
                    mutation_id: `conflict_${Date.now()}`,
                    client_uuid: task.client_uuid,
                    server_task: err.data?.server_task || null,
                    client_payload: { completed: newStatus },
                    server_revision: err.data?.server_revision || 0,
                    client_expected_revision: task.revision
                };
            } else {
                task.sync_status = 'pending';
                await enqueueMutation({
                    type: 'update_task',
                    client_uuid: task.client_uuid,
                    expected_revision: task.revision,
                    payload: { id: task.id, completed: newStatus, client_uuid: task.client_uuid }
                });
                pendingSyncCount.value++;
            }
        }
    }

    async function toggleOccurrenceComplete(taskId, occurrenceDate, completed) {
        const occ = tasks.value.find(t => t.parent_id === taskId && t.occurrence_date === occurrenceDate);
        if (occ) {
            occ.completed = completed;
            if (completed) playCompleteSound();
        }

        if (!isOnline.value) {
            await enqueueMutation({
                type: 'toggle_occurrence',
                payload: { task_id: taskId, occurrence_date: occurrenceDate, completed: completed }
            });
            pendingSyncCount.value++;
            return;
        }

        try {
            await apiRequest(`/api/tasks/${taskId}/recurrence/complete`, {
                method: 'POST',
                body: {
                    occurrence_date: occurrenceDate,
                    completed: completed
                }
            });
        } catch (err) {
            console.warn('Network error toggling occurrence, queuing offline mutation:', err);
            await enqueueMutation({
                type: 'toggle_occurrence',
                payload: { task_id: taskId, occurrence_date: occurrenceDate, completed: completed }
            });
            pendingSyncCount.value++;
        }
    }

    async function skipOccurrence(taskId, occurrenceDate) {
        const targetId = `${taskId}__${occurrenceDate}`;
        tasks.value = tasks.value.filter(t => t.id !== targetId);
        if (selectedTaskId.value === targetId) {
            selectedTaskId.value = null;
        }

        if (!isOnline.value) {
            await enqueueMutation({
                type: 'skip_occurrence',
                payload: { task_id: taskId, occurrence_date: occurrenceDate }
            });
            pendingSyncCount.value++;
            return;
        }

        try {
            await apiRequest(`/api/tasks/${taskId}/recurrence/skip`, {
                method: 'POST',
                body: { occurrence_date: occurrenceDate }
            });
        } catch (err) {
            console.warn('Network error skipping occurrence, queuing offline mutation:', err);
            await enqueueMutation({
                type: 'skip_occurrence',
                payload: { task_id: taskId, occurrence_date: occurrenceDate }
            });
            pendingSyncCount.value++;
        }
    }

    async function editThisOccurrence(taskId, occurrenceDate, changes) {
        try {
            const data = await apiRequest(`/api/tasks/${taskId}/recurrence/edit-this`, {
                method: 'POST',
                body: {
                    occurrence_date: occurrenceDate,
                    changes: changes
                }
            });
            await fetchTasks();
            if (data?.detached_task) {
                selectedTaskId.value = data.detached_task.id;
            }
            return data;
        } catch (err) {
            console.error('Error detaching occurrence:', err);
            throw err;
        }
    }

    async function editFutureOccurrences(taskId, fromDate, changes) {
        try {
            const data = await apiRequest(`/api/tasks/${taskId}/recurrence/edit-future`, {
                method: 'POST',
                body: {
                    from_date: fromDate,
                    changes: changes
                }
            });
            await fetchTasks();
            return data;
        } catch (err) {
            console.error('Error editing future occurrences:', err);
            throw err;
        }
    }

    async function toggleImportant(id) {
        const task = tasks.value.find(t => t.id === id);
        if (!task) return;
        const newStatus = !task.important;
        task.important = newStatus;

        const targetId = task.is_occurrence ? task.parent_id : id;
        task.sync_status = isOnline.value ? 'synced' : 'pending';
        await saveTaskOffline(task);

        if (!isOnline.value) {
            await enqueueMutation({
                type: 'update_task',
                client_uuid: task.client_uuid,
                expected_revision: task.revision,
                payload: { id: targetId, important: newStatus, client_uuid: task.client_uuid }
            });
            pendingSyncCount.value++;
            return;
        }

        try {
            await apiRequest(`/api/tasks/${targetId}`, {
                method: 'PUT',
                body: { important: newStatus, expected_revision: task.revision }
            });
            task.sync_status = 'synced';
            await saveTaskOffline(task);
        } catch (err) {
            console.error('Error updating task importance:', err);
            task.sync_status = 'pending';
            await enqueueMutation({
                type: 'update_task',
                client_uuid: task.client_uuid,
                expected_revision: task.revision,
                payload: { id: targetId, important: newStatus, client_uuid: task.client_uuid }
            });
            pendingSyncCount.value++;
        }
    }

    async function updateTask(id, payload) {
        const task = tasks.value.find(t => t.id === id);
        if (!task) return;

        const targetId = task.is_occurrence ? task.parent_id : id;

        Object.assign(task, payload);
        task.sync_status = isOnline.value ? 'synced' : 'pending';
        await saveTaskOffline(task);

        if (!isOnline.value) {
            await enqueueMutation({
                type: 'update_task',
                client_uuid: task.client_uuid,
                expected_revision: task.revision,
                payload: { id: targetId, ...payload, client_uuid: task.client_uuid }
            });
            pendingSyncCount.value++;
            return;
        }

        try {
            const data = await apiRequest(`/api/tasks/${targetId}`, {
                method: 'PUT',
                body: { ...payload, expected_revision: task.revision }
            });
            if (data?.task) {
                Object.assign(task, data.task);
                task.sync_status = 'synced';
                await saveTaskOffline(task);
            }
        } catch (err) {
            if (err?.status === 409) {
                console.warn('Conflict detected:', err.data);
                activeConflict.value = {
                    mutation_id: `conflict_${Date.now()}`,
                    client_uuid: task.client_uuid,
                    server_task: err.data?.server_task || null,
                    client_payload: payload,
                    server_revision: err.data?.server_revision || 0,
                    client_expected_revision: task.revision
                };
            } else {
                console.warn('Network error updating task, enqueuing mutation:', err);
                task.sync_status = 'pending';
                await saveTaskOffline(task);
                await enqueueMutation({
                    type: 'update_task',
                    client_uuid: task.client_uuid,
                    expected_revision: task.revision,
                    payload: { id: targetId, ...payload, client_uuid: task.client_uuid }
                });
                pendingSyncCount.value++;
            }
        }
    }

    async function deleteTask(id) {
        const idx = tasks.value.findIndex(t => t.id === id);
        if (idx === -1) return;
        const task = tasks.value[idx];
        const targetId = task.is_occurrence ? task.parent_id : id;

        tasks.value.splice(idx, 1);
        if (selectedTaskId.value === id) {
            selectedTaskId.value = null;
        }
        await deleteTaskOffline(id);

        if (!isOnline.value) {
            await enqueueMutation({
                type: 'delete_task',
                client_uuid: task.client_uuid,
                payload: { id: targetId }
            });
            pendingSyncCount.value++;
            return;
        }

        try {
            await apiRequest(`/api/tasks/${targetId}`, { method: 'DELETE' });
        } catch (err) {
            console.warn('Network error deleting task, enqueuing deletion mutation:', err);
            await enqueueMutation({
                type: 'delete_task',
                client_uuid: task.client_uuid,
                payload: { id: targetId }
            });
            pendingSyncCount.value++;
        }
    }

    // ---------------------------------------------------------
    // Offline Synchronization Engine
    // ---------------------------------------------------------

    async function triggerSync() {
        if (!isOnline.value || isSyncing.value) return;
        isSyncing.value = true;

        try {
            const pending = await getPendingMutations();
            pendingSyncCount.value = pending.length;
            const lastSync = await getSyncMeta('last_sync_timestamp');

            const res = await apiRequest('/api/sync', {
                method: 'POST',
                body: {
                    mutations: pending,
                    last_sync_timestamp: lastSync
                }
            });

            if (res?.success) {
                // Clear applied mutations
                if (res.applied && res.applied.length > 0) {
                    for (const app of res.applied) {
                        await removeMutation(app.mutation_id);
                    }
                }

                // Handle conflicts
                if (res.conflicts && res.conflicts.length > 0) {
                    activeConflict.value = res.conflicts[0];
                }

                // Reconcile server tasks
                if (res.server_tasks) {
                    for (const st of res.server_tasks) {
                        const idx = tasks.value.findIndex(t => t.id === st.id || (t.client_uuid && t.client_uuid === st.client_uuid));
                        if (idx !== -1) {
                            tasks.value[idx] = st;
                        } else {
                            tasks.value.push(st);
                        }
                    }
                    await saveTasksOffline(tasks.value.filter(t => !t.is_occurrence));
                }

                // Remove server-deleted tasks from local state and offline DB
                if (res.deleted_ids && res.deleted_ids.length > 0) {
                    const delSet = new Set(res.deleted_ids);
                    tasks.value = tasks.value.filter(t => !delSet.has(t.id));
                    for (const delId of res.deleted_ids) {
                        await deleteTaskOffline(delId);
                    }
                }

                if (res.categories) {
                    categories.value = res.categories;
                    await saveCategoriesOffline(res.categories);
                }

                if (res.sync_timestamp) {
                    await setSyncMeta('last_sync_timestamp', res.sync_timestamp);
                }

                const remaining = await getPendingMutations();
                pendingSyncCount.value = remaining.length;
                syncAttempts = 0;
            }
        } catch (err) {
            console.warn('[Sync] Sync failed, will retry with backoff:', err);
            syncAttempts = Math.min(syncAttempts + 1, 5);
            const delay = Math.min(2000 * Math.pow(2, syncAttempts - 1), 30000);
            if (syncBackoffTimeout) clearTimeout(syncBackoffTimeout);
            syncBackoffTimeout = setTimeout(() => {
                if (isOnline.value) triggerSync();
            }, delay);
        } finally {
            isSyncing.value = false;
        }
    }

    async function resolveActiveConflict(choice) {
        if (!activeConflict.value) return;
        const c = activeConflict.value;
        const targetUuid = c.client_uuid;

        if (choice === 'server') {
            if (c.server_task) {
                const idx = tasks.value.findIndex(t => t.client_uuid === targetUuid || t.id === c.server_task.id);
                if (idx !== -1) {
                    tasks.value[idx] = c.server_task;
                }
                await saveTaskOffline(c.server_task);
            }
            if (c.mutation_id) {
                await removeMutation(c.mutation_id);
            }
        } else if (choice === 'local') {
            try {
                const targetId = c.server_task?.id;
                if (targetId) {
                    const data = await apiRequest(`/api/tasks/${targetId}`, {
                        method: 'PUT',
                        body: {
                            ...c.client_payload,
                            expected_revision: c.server_revision
                        }
                    });
                    if (data?.task) {
                        const idx = tasks.value.findIndex(t => t.id === targetId || t.client_uuid === targetUuid);
                        if (idx !== -1) {
                            tasks.value[idx] = data.task;
                        }
                        await saveTaskOffline(data.task);
                    }
                }
            } catch (err) {
                console.error('Error forcing local conflict resolution:', err);
            }
            if (c.mutation_id) {
                await removeMutation(c.mutation_id);
            }
        }

        activeConflict.value = null;
        const remaining = await getPendingMutations();
        pendingSyncCount.value = remaining.length;
    }

    function dismissConflict() {
        activeConflict.value = null;
    }

    // ---------------------------------------------------------
    // Subtasks Operations
    // ---------------------------------------------------------

    async function addSubtask(taskId, textOrTitle) {
        const text = (typeof textOrTitle === 'string' ? textOrTitle : textOrTitle?.text || textOrTitle?.title || '').trim();
        if (!text) return null;

        // Resolve actual database task id (e.g. if taskId is occurrence '12__2026-10-30')
        let actualTaskId = taskId;
        if (typeof taskId === 'string' && taskId.includes('__')) {
            actualTaskId = parseInt(taskId.split('__')[0], 10) || taskId.split('__')[0];
        }

        const targetTask = tasks.value.find(t => t.id === taskId || t.id === actualTaskId || t.client_uuid === taskId);
        if (!targetTask) return null;

        if (!targetTask.subtasks) {
            targetTask.subtasks = [];
        }

        // Optimistic subtask object
        const tempId = `temp_sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const clientUuid = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        const optimisticSubtask = {
            id: tempId,
            task_id: actualTaskId,
            text,
            title: text,
            is_done: false,
            done: false,
            client_uuid: clientUuid,
            order_index: targetTask.subtasks.length
        };

        targetTask.subtasks.push(optimisticSubtask);

        // Also update parent task or occurrence copies if any
        for (const t of tasks.value) {
            if (t !== targetTask && (t.id === actualTaskId || (t.is_occurrence && t.parent_id === actualTaskId))) {
                if (!t.subtasks) t.subtasks = [];
                if (!t.subtasks.some(s => s.client_uuid === clientUuid)) {
                    t.subtasks.push(optimisticSubtask);
                }
            }
        }

        // Persist offline immediately
        await saveTaskOffline(targetTask);

        // Server sync
        try {
            const data = await apiRequest(`/api/tasks/${actualTaskId}/subtasks`, {
                method: 'POST',
                body: {
                    text,
                    title: text,
                    client_uuid: clientUuid
                }
            });

            if (data?.subtask) {
                // Replace temp optimistic subtask with server subtask
                const idx = targetTask.subtasks.findIndex(s => s.id === tempId || s.client_uuid === clientUuid);
                if (idx !== -1) {
                    targetTask.subtasks[idx] = {
                        ...data.subtask,
                        done: Boolean(data.subtask.is_done || data.subtask.done)
                    };
                }

                // Update occurrence copies with server data
                for (const t of tasks.value) {
                    if (t.subtasks) {
                        const sIdx = t.subtasks.findIndex(s => s.id === tempId || s.client_uuid === clientUuid);
                        if (sIdx !== -1) {
                            t.subtasks[sIdx] = {
                                ...data.subtask,
                                done: Boolean(data.subtask.is_done || data.subtask.done)
                            };
                        }
                    }
                }

                await saveTaskOffline(targetTask);
                return data.subtask;
            }
        } catch (err) {
            console.error('Error adding subtask to server:', err);
            // If offline, enqueue mutation for sync
            if (!isOnline.value) {
                await enqueueMutation({
                    id: `mut_sub_add_${Date.now()}`,
                    type: 'subtask_create',
                    task_id: actualTaskId,
                    payload: optimisticSubtask
                });
            } else {
                // Online error: revert optimistic subtask
                const idx = targetTask.subtasks.findIndex(s => s.id === tempId || s.client_uuid === clientUuid);
                if (idx !== -1) {
                    targetTask.subtasks.splice(idx, 1);
                }
                await saveTaskOffline(targetTask);
            }
        }

        return optimisticSubtask;
    }

    async function toggleSubtask(taskIdOrSubtaskId, maybeSubtaskId) {
        let subtaskId = maybeSubtaskId ?? taskIdOrSubtaskId;

        // Find subtask and its containing task
        let targetTask = null;
        let targetSubtask = null;

        for (const t of tasks.value) {
            const s = (t.subtasks || []).find(sub => sub.id === subtaskId || sub.client_uuid === subtaskId);
            if (s) {
                targetTask = t;
                targetSubtask = s;
                break;
            }
        }

        if (!targetTask || !targetSubtask) return;

        const newDone = !(targetSubtask.is_done || targetSubtask.done);
        targetSubtask.is_done = newDone;
        targetSubtask.done = newDone;

        // Update occurrence copies
        for (const t of tasks.value) {
            for (const s of (t.subtasks || [])) {
                if (s.id === subtaskId || (s.client_uuid && s.client_uuid === targetSubtask.client_uuid)) {
                    s.is_done = newDone;
                    s.done = newDone;
                }
            }
        }

        await saveTaskOffline(targetTask);

        // If subtask has a real ID (numeric or string without temp), sync with server
        if (typeof subtaskId === 'number' || (typeof subtaskId === 'string' && !subtaskId.startsWith('temp_'))) {
            try {
                await apiRequest(`/api/subtasks/${subtaskId}`, {
                    method: 'PUT',
                    body: { is_done: newDone, done: newDone }
                });
            } catch (err) {
                console.error('Error toggling subtask on server:', err);
                if (!isOnline.value) {
                    await enqueueMutation({
                        id: `mut_sub_toggle_${Date.now()}`,
                        type: 'subtask_update',
                        subtask_id: subtaskId,
                        payload: { is_done: newDone, done: newDone }
                    });
                }
            }
        }
    }

    async function deleteSubtask(subtaskId) {
        let affectedTask = null;

        for (const t of tasks.value) {
            const idx = (t.subtasks || []).findIndex(s => s.id === subtaskId || s.client_uuid === subtaskId);
            if (idx !== -1) {
                t.subtasks.splice(idx, 1);
                affectedTask = t;
            }
        }

        if (affectedTask) {
            await saveTaskOffline(affectedTask);
        }

        if (typeof subtaskId === 'number' || (typeof subtaskId === 'string' && !subtaskId.startsWith('temp_'))) {
            try {
                await apiRequest(`/api/subtasks/${subtaskId}`, { method: 'DELETE' });
            } catch (err) {
                console.error('Error deleting subtask on server:', err);
                if (!isOnline.value) {
                    await enqueueMutation({
                        id: `mut_sub_del_${Date.now()}`,
                        type: 'subtask_delete',
                        subtask_id: subtaskId
                    });
                }
            }
        }
    }

    async function updateSubtask(subtaskId, newText) {
        const text = (newText || '').trim();
        if (!text) return;

        let affectedTask = null;
        for (const t of tasks.value) {
            const s = (t.subtasks || []).find(sub => sub.id === subtaskId || sub.client_uuid === subtaskId);
            if (s) {
                s.text = text;
                s.title = text;
                affectedTask = t;
            }
        }

        if (affectedTask) {
            await saveTaskOffline(affectedTask);
        }

        if (typeof subtaskId === 'number' || (typeof subtaskId === 'string' && !subtaskId.startsWith('temp_'))) {
            try {
                await apiRequest(`/api/subtasks/${subtaskId}`, {
                    method: 'PUT',
                    body: { text, title: text }
                });
            } catch (err) {
                console.error('Error updating subtask on server:', err);
            }
        }
    }

    // ---------------------------------------------------------
    // Stage 5: Advanced Reminders & Snooze Engine
    // ---------------------------------------------------------

    function requestNotificationPermission() {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            Notification.requestPermission().then(permission => {
                requestedNotificationPermission.value = (permission === 'granted');
            });
        }
    }

    function checkAlarms() {
        if (activeAlarmTaskId.value) return;
        const now = new Date();
        const currentTimestamp = now.getTime();
        const todayISO = getLocalISODate(now);

        for (const t of tasks.value) {
            const enabled = t.alarmEnabled ?? t.alarm_enabled;
            const completed = t.completed;
            if (completed || !enabled) continue;

            const d = t.dueDate || t.due_date || todayISO;
            const time = t.dueTime || t.due_time;
            if (!time) continue;

            // 1. Check if snooze is active
            const snooze = t.snoozeUntil || t.snooze_until;
            if (snooze) {
                const snoozeTimestamp = new Date(snooze).getTime();
                if (currentTimestamp >= snoozeTimestamp && !triggeredAlarmsSet.has(`snooze_${t.id}_${snooze}`)) {
                    triggeredAlarmsSet.add(`snooze_${t.id}_${snooze}`);
                    triggerAlarm(t, 'یادآور پس از تعویق');
                    break;
                }
                continue;
            }

            // 2. Check scheduled due time with offset
            const offsetMinutes = t.reminderOffsetMinutes ?? t.reminder_offset_minutes ?? 0;
            const parts = time.split(':').map(Number);
            const hours = parts[0] || 0;
            const minutes = parts[1] || 0;

            const dueDateTime = new Date(`${d}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
            const triggerTime = dueDateTime.getTime() - (offsetMinutes * 60000);

            const diff = currentTimestamp - triggerTime;
            const alarmKey = `${t.id}_${d}_${time}_${offsetMinutes}`;

            // Trigger if within a 90 second window and not previously triggered
            if (diff >= 0 && diff < 90000 && !triggeredAlarmsSet.has(alarmKey) && !(t.alarmTriggered ?? t.alarm_triggered)) {
                triggeredAlarmsSet.add(alarmKey);
                let reason = 'زمان انجام کار فرا رسیده است!';
                if (offsetMinutes > 0) {
                    reason = `${offsetMinutes} دقیقه پیش از موعد انجام کار`;
                }
                triggerAlarm(t, reason);
                break;
            }
        }
    }

    function triggerAlarm(task, reason = '') {
        activeAlarmTaskId.value = task.id;
        task.alarmTriggered = true;
        task.alarm_triggered = true;
        alarmModalOpen.value = true;

        playAlarmBeep();
        if (alarmTimer) clearInterval(alarmTimer);
        alarmTimer = setInterval(playAlarmBeep, 2500);

        // Web Notification fallback to in-app audio & modal
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification('یادآور تسک‌یار وب', {
                    body: `${task.title}\n${reason}`,
                    icon: '/icons/icon-192.png',
                    badge: '/icons/icon-192.png',
                    dir: 'rtl',
                    lang: 'fa'
                });
            } catch (e) {
                console.warn('Native notification failed:', e);
            }
        }

        const targetId = task.is_occurrence ? task.parent_id : task.id;
        updateTask(targetId, { alarm_triggered: true });
    }

    function dismissAlarm() {
        if (alarmTimer) clearInterval(alarmTimer);
        activeAlarmTaskId.value = null;
        alarmModalOpen.value = false;
    }

    function snoozeAlarm(minutes = 5) {
        if (alarmTimer) clearInterval(alarmTimer);
        const task = tasks.value.find(t => t.id === activeAlarmTaskId.value);
        if (task) {
            const snoozeTime = new Date(Date.now() + minutes * 60000);
            const snoozeISO = snoozeTime.toISOString();
            const targetId = task.is_occurrence ? task.parent_id : task.id;
            updateTask(targetId, {
                snooze_until: snoozeISO,
                snoozeUntil: snoozeISO,
                alarm_triggered: false,
                alarmTriggered: false
            });
        }
        activeAlarmTaskId.value = null;
        alarmModalOpen.value = false;
    }

    function reset() {
        tasks.value = [];
        categories.value = [];
        tags.value = [];
        loading.value = false;
        currentView.value = 'myday';
        searchQuery.value = '';
        selectedTaskId.value = null;
        selectedCategoryFilter.value = null;
        selectedTagFilter.value = null;
        activeAlarmTaskId.value = null;
        alarmModalOpen.value = false;
        categoryModalOpen.value = false;
        recurrenceModalOpen.value = false;
        recurrenceActionModalOpen.value = false;
        activeConflict.value = null;
        selectedDateISO.value = getLocalISODate();
        closeUserDb();
    }

    // Network listeners
    if (typeof window !== 'undefined') {
        window.addEventListener('online', () => {
            isOnline.value = true;
            console.log('[Network] Reconnected to online');
            triggerSync();
        });

        window.addEventListener('offline', () => {
            isOnline.value = false;
            console.log('[Network] Lost network connection, offline mode active');
        });

        setInterval(checkAlarms, 10000);
    }

    return {
        tasks,
        categories,
        tags,
        loading,
        currentView,
        searchQuery,
        selectedTaskId,
        selectedTask,
        selectedCategoryFilter,
        selectedTagFilter,
        selectedDateISO,
        activeAlarmTaskId,
        activeAlarmTask,
        alarmModalOpen,
        categoryModalOpen,
        recurrenceModalOpen,
        recurrenceModalTargetTask,
        recurrenceActionModalOpen,
        recurrenceActionTargetOccurrence,
        isOnline,
        isSyncing,
        pendingSyncCount,
        activeConflict,
        filteredTasks,
        activeTasks,
        completedTasks,
        progressPercent,
        badges,
        categoryCounts,
        initOfflineStore,
        fetchTasks,
        fetchCategories,
        createCategory,
        updateCategory,
        deleteCategory,
        fetchTags,
        createTag,
        deleteTag,
        addTask,
        toggleComplete,
        toggleOccurrenceComplete,
        skipOccurrence,
        editThisOccurrence,
        editFutureOccurrences,
        toggleImportant,
        updateTask,
        deleteTask,
        triggerSync,
        syncWithServer: triggerSync,
        resolveActiveConflict,
        dismissConflict,
        addSubtask,
        toggleSubtask,
        updateSubtask,
        deleteSubtask,
        requestNotificationPermission,
        checkAlarms,
        triggerAlarm,
        dismissAlarm,
        snoozeAlarm,
        reset
    };
});
