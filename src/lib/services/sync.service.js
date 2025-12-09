// Sync Service - Manages offline sync queue

const SYNC_QUEUE_KEY = 'offline_queue';
const SYNC_STATE_KEY = 'sync_state';

// Get sync queue
export function getSyncQueue() {
	if (typeof window === 'undefined') return [];
	try {
		const stored = localStorage.getItem(SYNC_QUEUE_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch (error) {
		console.error('Failed to get sync queue:', error);
		return [];
	}
}

// Save sync queue
function saveSyncQueue(queue) {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
		// Dispatch event for UI updates
		window.dispatchEvent(new CustomEvent('syncQueueUpdated', { detail: queue }));
	} catch (error) {
		console.error('Failed to save sync queue:', error);
	}
}

// Get sync status
export function getSyncStatus() {
	if (typeof window === 'undefined')
		return { nextRetryIn: 0, isSyncing: false, lastSyncAt: null, pendingCount: 0 };
	try {
		const stored = localStorage.getItem(SYNC_STATE_KEY);
		const status = stored
			? JSON.parse(stored)
			: { nextRetryIn: 0, isSyncing: false, lastSyncAt: null };
		const queue = getSyncQueue();
		return { ...status, pendingCount: queue.length };
	} catch (error) {
		console.error('Failed to get sync status:', error);
		return { nextRetryIn: 0, isSyncing: false, lastSyncAt: null, pendingCount: 0 };
	}
}

// Update sync status
export function updateSyncStatus(status) {
	if (typeof window === 'undefined') return;
	try {
		const current = getSyncStatus();
		const updated = { ...current, ...status };
		localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(updated));
		// Dispatch event for UI updates
		window.dispatchEvent(new CustomEvent('syncStatus', { detail: updated }));
	} catch (error) {
		console.error('Failed to update sync status:', error);
	}
}

// Add to sync queue
export function addToSyncQueue(operation) {
	const queue = getSyncQueue();
	const newOp = {
		id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
		timestamp: new Date().toISOString(),
		attempts: 0,
		...operation
	};
	queue.push(newOp);
	saveSyncQueue(queue);
	return newOp;
}

// Remove from sync queue
export function removeFromSyncQueue(operationId) {
	const queue = getSyncQueue();
	const filtered = queue.filter((op) => op.id !== operationId);
	saveSyncQueue(filtered);
}

// Clear sync queue
export function clearSyncQueue() {
	saveSyncQueue([]);
}

// Get pending count
export function getPendingCount() {
	return getSyncQueue().length;
}
