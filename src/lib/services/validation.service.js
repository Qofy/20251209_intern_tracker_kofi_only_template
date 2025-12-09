// Validation Service - Manages validation errors

const VALIDATION_ERRORS_KEY = 'validation_errors';

// Get validation errors from localStorage
export function getValidationErrors() {
	if (typeof window === 'undefined') return [];
	try {
		const stored = localStorage.getItem(VALIDATION_ERRORS_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch (error) {
		console.error('Failed to get validation errors:', error);
		return [];
	}
}

// Save validation errors to localStorage
function saveValidationErrors(errors) {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(VALIDATION_ERRORS_KEY, JSON.stringify(errors));
		// Dispatch event for UI updates
		window.dispatchEvent(new CustomEvent('validationErrors', { detail: errors }));
	} catch (error) {
		console.error('Failed to save validation errors:', error);
	}
}

// Add validation error
export function addValidationError(error) {
	const errors = getValidationErrors();
	const newError = {
		id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
		timestamp: new Date().toISOString(),
		...error
	};
	errors.push(newError);
	saveValidationErrors(errors);
	return newError;
}

// Remove validation error
export function removeValidationError(errorId) {
	const errors = getValidationErrors();
	const filtered = errors.filter((e) => e.id !== errorId);
	saveValidationErrors(filtered);
}

// Clear all validation errors
export function clearValidationErrors() {
	saveValidationErrors([]);
}

// Get validation error by ID
export function getValidationError(errorId) {
	const errors = getValidationErrors();
	return errors.find((e) => e.id === errorId);
}

// Update validation error
export function updateValidationError(errorId, updates) {
	const errors = getValidationErrors();
	const index = errors.findIndex((e) => e.id === errorId);
	if (index !== -1) {
		errors[index] = { ...errors[index], ...updates };
		saveValidationErrors(errors);
	}
}
