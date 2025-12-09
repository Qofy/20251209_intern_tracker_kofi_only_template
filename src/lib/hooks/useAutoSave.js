import { writable } from 'svelte/store';

/**
 * Auto-save hook for form draft management
 * @param {string} entityType - Type of entity (e.g., 'customers', 'products')
 * @param {string} entityId - ID of entity (e.g., 'new', or actual ID)
 * @param {object} formData - The reactive form data object
 * @param {object} options - Configuration options
 * @param {boolean} options.enabled - Whether auto-save is enabled (default: true)
 * @param {number} options.debounceMs - Debounce delay in milliseconds (default: 1000)
 * @returns {object} Auto-save utilities
 */
export function useAutoSave(entityType, entityId, formData, options = {}) {
	const { enabled = true, debounceMs = 1000 } = options;

	// Create reactive stores
	const isDirty = writable(false);
	const isSaving = writable(false);
	const lastSaved = writable(null);

	// Generate storage key for this draft
	const getDraftKey = () => `draft_${entityType}_${entityId}`;

	let saveTimeout = null;
	let previousData = null;

	/**
	 * Save draft to localStorage
	 */
	const saveDraft = (data) => {
		if (!enabled) return;

		try {
			const draftKey = getDraftKey();
			const draftData = {
				data,
				savedAt: new Date().toISOString(),
				entityType,
				entityId
			};
			localStorage.setItem(draftKey, JSON.stringify(draftData));
			lastSaved.set(draftData.savedAt);
			isDirty.set(false);
			console.log(`[useAutoSave] Draft saved: ${draftKey}`);
		} catch (error) {
			console.error('[useAutoSave] Failed to save draft:', error);
		}
	};

	/**
	 * Load draft from localStorage
	 * @returns {object|null} Draft data or null if not found
	 */
	const loadDraft = () => {
		if (!enabled) return null;

		try {
			const draftKey = getDraftKey();
			const stored = localStorage.getItem(draftKey);
			if (!stored) return null;

			const draft = JSON.parse(stored);
			console.log(`[useAutoSave] Draft loaded: ${draftKey}`);
			return draft;
		} catch (error) {
			console.error('[useAutoSave] Failed to load draft:', error);
			return null;
		}
	};

	/**
	 * Clear draft from localStorage
	 */
	const clearDraft = () => {
		try {
			const draftKey = getDraftKey();
			localStorage.removeItem(draftKey);
			isDirty.set(false);
			lastSaved.set(null);
			console.log(`[useAutoSave] Draft cleared: ${draftKey}`);
		} catch (error) {
			console.error('[useAutoSave] Failed to clear draft:', error);
		}
	};

	/**
	 * Check if a draft exists
	 * @returns {boolean} True if draft exists
	 */
	const hasDraft = () => {
		if (!enabled) return false;

		try {
			const draftKey = getDraftKey();
			return localStorage.getItem(draftKey) !== null;
		} catch (error) {
			console.error('[useAutoSave] Failed to check draft:', error);
			return false;
		}
	};

	/**
	 * Trigger auto-save with debounce
	 */
	const triggerAutoSave = (data) => {
		if (!enabled) return;

		// Clear existing timeout
		if (saveTimeout) {
			clearTimeout(saveTimeout);
		}

		// Mark as dirty
		isDirty.set(true);

		// Debounce the save
		saveTimeout = setTimeout(() => {
			isSaving.set(true);
			saveDraft(data);
			isSaving.set(false);
		}, debounceMs);
	};

	/**
	 * Save immediately without debounce
	 */
	const save = async (data) => {
		if (!enabled) return;

		if (saveTimeout) {
			clearTimeout(saveTimeout);
			saveTimeout = null;
		}

		isSaving.set(true);
		saveDraft(data || formData);
		isSaving.set(false);
	};

	/**
	 * Reset auto-save state
	 */
	const reset = () => {
		if (saveTimeout) {
			clearTimeout(saveTimeout);
			saveTimeout = null;
		}
		isDirty.set(false);
		isSaving.set(false);
		previousData = null;
	};

	/**
	 * Watch for changes in formData and trigger auto-save
	 * Note: This is a basic implementation. In a real Svelte component,
	 * you'd use $: reactive statements to watch formData changes.
	 */
	const watchFormData = (data) => {
		if (!enabled) return;

		// Compare with previous data to detect changes
		const currentDataStr = JSON.stringify(data);
		if (previousData !== currentDataStr) {
			previousData = currentDataStr;
			triggerAutoSave(data);
		}
	};

	// Cleanup on destroy
	const destroy = () => {
		if (saveTimeout) {
			clearTimeout(saveTimeout);
			saveTimeout = null;
		}
	};

	return {
		// Stores (use with $isDirty, $isSaving, $lastSaved in Svelte)
		isDirty,
		isSaving,
		lastSaved,

		// Methods
		save,
		reset,
		loadDraft,
		clearDraft,
		hasDraft,
		watchFormData,
		destroy
	};
}
