// Auto-save utilities - Replaces useAutoSave hook

/**
 * Create auto-save manager for form data
 * @param {string} entity - Entity type
 * @param {string} recordId - Record ID (or 'new')
 * @param {object} options - Configuration options
 */
export function createAutoSave(entity, recordId, options = {}) {
	const { debounceMs = 500, enabled = true, onSave = null, onError = null } = options;

	const draftKey = `draft_${entity}_${recordId || 'new'}`;
	const metaKey = `draft_meta_${entity}_${recordId || 'new'}`;
	let lastSaved = null;
	let saveTimeout = null;

	// Save draft to localStorage
	function saveDraft(data) {
		if (!enabled || typeof window === 'undefined') return;

		try {
			const draft = {
				...data,
				_meta: {
					entity,
					recordId: recordId || 'new',
					savedAt: new Date().toISOString(),
					status: 'unsaved'
				}
			};

			localStorage.setItem(draftKey, JSON.stringify(draft));
			localStorage.setItem(metaKey, JSON.stringify(draft._meta));

			lastSaved = draft._meta.savedAt;

			if (onSave) {
				onSave(draft);
			}

			// Dispatch event for UI updates
			window.dispatchEvent(
				new CustomEvent('draftSaved', {
					detail: { entity, recordId: recordId || 'new', draft }
				})
			);
		} catch (error) {
			console.error('Failed to save draft:', error);
			if (onError) {
				onError(error);
			}
		}
	}

	// Debounced save
	function debouncedSave(data) {
		if (saveTimeout) {
			clearTimeout(saveTimeout);
		}
		saveTimeout = setTimeout(() => {
			saveDraft(data);
		}, debounceMs);
	}

	// Auto-save when data changes
	function autoSave(formData) {
		if (!enabled || !formData || typeof window === 'undefined') return;

		// Don't save if data hasn't changed
		const currentData = JSON.stringify(formData);
		if (currentData === lastSaved) return;

		debouncedSave(formData);
	}

	// Load draft
	function loadDraft() {
		if (typeof window === 'undefined') return null;
		try {
			const saved = localStorage.getItem(draftKey);
			if (saved) {
				const draft = JSON.parse(saved);
				// Remove meta from returned data
				const { _meta, ...data } = draft;
				return { data, meta: _meta };
			}
		} catch (error) {
			console.error('Failed to load draft:', error);
		}
		return null;
	}

	// Clear draft
	function clearDraft() {
		if (typeof window === 'undefined') return;
		localStorage.removeItem(draftKey);
		localStorage.removeItem(metaKey);
		lastSaved = null;

		// Dispatch event
		window.dispatchEvent(
			new CustomEvent('draftCleared', {
				detail: { entity, recordId: recordId || 'new' }
			})
		);
	}

	// Get draft metadata
	function getDraftMeta() {
		if (typeof window === 'undefined') return null;
		try {
			const meta = localStorage.getItem(metaKey);
			return meta ? JSON.parse(meta) : null;
		} catch (error) {
			console.error('Failed to get draft meta:', error);
			return null;
		}
	}

	// Check if draft exists
	function hasDraft() {
		if (typeof window === 'undefined') return false;
		return !!localStorage.getItem(draftKey);
	}

	// Cleanup
	function destroy() {
		if (saveTimeout) {
			clearTimeout(saveTimeout);
		}
	}

	return {
		saveDraft,
		autoSave,
		loadDraft,
		clearDraft,
		getDraftMeta,
		hasDraft,
		destroy,
		get lastSaved() {
			return lastSaved;
		}
	};
}

/**
 * Get all drafts for an entity type
 * @param {string} entity - Entity type
 * @returns {array} - Array of draft metadata
 */
export function getAllDrafts(entity) {
	if (typeof window === 'undefined') return [];

	const drafts = [];
	const prefix = `draft_meta_${entity}_`;

	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key && key.startsWith(prefix)) {
			try {
				const meta = JSON.parse(localStorage.getItem(key));
				drafts.push(meta);
			} catch (error) {
				console.error('Failed to parse draft meta:', error);
			}
		}
	}

	return drafts;
}

/**
 * Clear all drafts for an entity type
 * @param {string} entity - Entity type
 */
export function clearAllDrafts(entity) {
	if (typeof window === 'undefined') return;

	const keysToRemove = [];
	const prefix = `draft_${entity}_`;
	const metaPrefix = `draft_meta_${entity}_`;

	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key && (key.startsWith(prefix) || key.startsWith(metaPrefix))) {
			keysToRemove.push(key);
		}
	}

	keysToRemove.forEach((key) => localStorage.removeItem(key));
}
