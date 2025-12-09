import { getValidationErrors, removeValidationError } from '$lib/services/validation.service';

/**
 * Removes all validation errors associated with a specific entity and record
 * @param {string} entityType - The entity type (e.g., 'customers', 'quotes', 'invoices')
 * @param {string|null} recordId - The record ID (can be temp ID or real ID)
 * @param {string|null} action - Optional action filter ('create', 'update', 'delete')
 */
export function removeEntityValidationErrors(entityType, recordId = null, action = null) {
	const validationErrors = getValidationErrors();

	const errorsToRemove = validationErrors.filter((e) => {
		// Match entity type
		if (e.entity !== entityType) return false;

		// If no recordId specified, match by action only
		if (!recordId) {
			return action ? e.action === action : true;
		}

		// Match by recordId or tempId
		const matchesId = e.tempId === recordId || e.recordId === recordId;

		// If action specified, also match action
		if (action) {
			return matchesId && e.action === action;
		}

		return matchesId;
	});

	errorsToRemove.forEach((error) => {
		console.log(`🧹 Removing validation error for ${entityType}:`, error.id);
		removeValidationError(error.id);
	});

	return errorsToRemove.length;
}

/**
 * Waits for an entity to sync successfully or fail with validation error
 * @param {string} recordId - The temp ID to wait for
 * @param {string} entityType - The entity type (e.g., 'customers', 'quotes', 'invoices')
 * @param {number} timeout - Timeout in milliseconds (default: 5000)
 * @returns {Promise<{success: boolean, validationError?: boolean, error?: object, networkError?: boolean}>}
 */
export function waitForEntitySync(recordId, entityType, timeout = 5000) {
	return new Promise((resolve) => {
		const timeoutId = setTimeout(() => {
			cleanup();
			resolve({ success: false, networkError: true });
		}, timeout);

		const cleanup = () => {
			clearTimeout(timeoutId);
			window.removeEventListener('validationErrors', handleValidationError);
			window.removeEventListener('syncSuccess', handleSyncSuccess);
		};

		const handleValidationError = (event) => {
			const errors = event.detail || [];
			const matchingError = errors.find(
				(e) => e.entity === entityType && (e.tempId === recordId || e.recordId === recordId)
			);

			if (matchingError) {
				cleanup();
				resolve({
					success: false,
					validationError: true,
					error: matchingError
				});
			}
		};

		const handleSyncSuccess = (event) => {
			const { entity: syncEntity, id: syncId } = event.detail || {};
			if (syncEntity === entityType && syncId === recordId) {
				cleanup();
				resolve({ success: true });
			}
		};

		window.addEventListener('validationErrors', handleValidationError);
		window.addEventListener('syncSuccess', handleSyncSuccess);
	});
}

/**
 * Checks if an entity save result has a real ID (backend success) or temp ID (queued for sync)
 * @param {object} result - The entity result from create/update
 * @returns {boolean} - true if real ID, false if temp ID
 */
export function hasRealId(result) {
	return result && result.id && !result.id.startsWith('tmp_');
}

/**
 * Unified handler for entity save results - handles validation cleanup, sync waiting, etc.
 * @param {object} options - Configuration options
 * @param {object} options.result - The entity save result
 * @param {string} options.entityType - The entity type (e.g., 'customers', 'quotes', 'invoices')
 * @param {string|null} options.existingId - The existing ID if updating (null for create)
 * @param {string} options.action - The action ('create' or 'update')
 * @param {boolean} options.waitForSync - Whether to wait for sync if temp ID (default: true)
 * @returns {Promise<{success: boolean, id: string, validationError?: boolean, error?: object}>}
 */
export async function handleEntitySaveResult({
	result,
	entityType,
	existingId = null,
	action = 'create',
	waitForSync = true
}) {
	const isRealId = hasRealId(result);

	if (isRealId) {
		// Backend succeeded immediately
		console.log(`✅ ${entityType} ${action}d successfully with real ID:`, result.id);

		// Remove validation errors
		removeEntityValidationErrors(entityType, result.id);
		removeEntityValidationErrors(entityType, existingId);
		if (action === 'create') {
			removeEntityValidationErrors(entityType, null, 'create');
		}

		return { success: true, id: result.id };
	} else {
		// Temp ID - created locally
		console.log(`⏳ ${entityType} ${action}d with temp ID, will sync:`, result.id);

		if (!waitForSync) {
			// Don't wait for sync - just return temp ID
			return { success: true, id: result.id, isTempId: true };
		}

		// Wait for sync to complete
		const syncResult = await waitForEntitySync(result.id, entityType);

		if (syncResult.success) {
			// Sync succeeded - remove validation errors
			removeEntityValidationErrors(entityType, result.id);
			removeEntityValidationErrors(entityType, existingId);
			if (action === 'create') {
				removeEntityValidationErrors(entityType, null, 'create');
			}

			return { success: true, id: result.id };
		} else if (syncResult.validationError) {
			// Validation error during sync
			return {
				success: false,
				validationError: true,
				error: syncResult.error,
				id: result.id
			};
		} else {
			// Network error - saved locally, will sync later
			return {
				success: true,
				networkError: true,
				id: result.id,
				isTempId: true
			};
		}
	}
}

/**
 * Performs entity create or update with unified error handling
 * @param {object} options - Configuration options
 * @param {object} options.Entity - The entity class (Customer, Quote, Invoice, etc.)
 * @param {object} options.data - The data to save
 * @param {string|null} options.id - The ID for update (null for create)
 * @param {string} options.entityType - The entity type string (e.g., 'customers')
 * @param {boolean} options.waitForSync - Whether to wait for sync (default: true)
 * @returns {Promise<{success: boolean, result?: object, id?: string, validationError?: boolean, error?: object}>}
 */
export async function saveEntity({ Entity, data, id = null, entityType, waitForSync = true }) {
	try {
		const isUpdate = !!id;
		const action = isUpdate ? 'update' : 'create';

		// Perform the save operation
		const result = isUpdate ? await Entity.update(id, data) : await Entity.create(data);

		// Handle the result with unified logic
		const saveResult = await handleEntitySaveResult({
			result,
			entityType,
			existingId: id,
			action,
			waitForSync
		});

		return {
			...saveResult,
			result
		};
	} catch (error) {
		console.error(`❌ Error saving ${entityType}:`, error);
		return {
			success: false,
			error,
			generalError: true
		};
	}
}
