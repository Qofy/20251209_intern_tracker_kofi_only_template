// API Error Handling Utilities
// Handles the new ApiError format from backend:
// { status, code, message, errors?: { [fieldPath]: string } }

/**
 * Parse API error from response
 * @param {Error} error - Error object from request
 * @returns {object} - Parsed error with status, code, message, and field errors
 */
export function parseApiError(error) {
	const defaultError = {
		status: 500,
		code: 'unknown_error',
		message: 'An unexpected error occurred',
		fieldErrors: {}
	};

	if (!error) return defaultError;

	// If error has data property (from request utility)
	if (error.data) {
		return {
			status: error.status || error.data.status || 500,
			code: error.data.code || 'unknown_error',
			message: error.data.message || error.message || 'An error occurred',
			fieldErrors: error.data.errors || {}
		};
	}

	// Fallback to error properties
	return {
		status: error.status || 500,
		code: error.code || 'unknown_error',
		message: error.message || 'An error occurred',
		fieldErrors: {}
	};
}

/**
 * Get error message for a specific field
 * @param {object} apiError - Parsed API error
 * @param {string} fieldPath - Field path (e.g., 'address.country', 'items.0.quantity')
 * @returns {string|null} - Error message for the field, or null if no error
 */
export function getFieldError(apiError, fieldPath) {
	if (!apiError || !apiError.fieldErrors) return null;

	return apiError.fieldErrors[fieldPath] || null;
}

/**
 * Check if there are any field errors
 * @param {object} apiError - Parsed API error
 * @returns {boolean}
 */
export function hasFieldErrors(apiError) {
	if (!apiError || !apiError.fieldErrors) return false;

	return Object.keys(apiError.fieldErrors).length > 0;
}

/**
 * Get all field error messages as an array
 * @param {object} apiError - Parsed API error
 * @returns {Array<{field: string, message: string}>}
 */
export function getFieldErrorsList(apiError) {
	if (!apiError || !apiError.fieldErrors) return [];

	return Object.entries(apiError.fieldErrors).map(([field, message]) => ({
		field,
		message
	}));
}

/**
 * Format field errors for display in a form
 * Returns an object where keys are field names and values are error messages
 * @param {object} apiError - Parsed API error
 * @returns {object} - { [fieldName]: errorMessage }
 */
export function formatFieldErrors(apiError) {
	if (!apiError || !apiError.fieldErrors) return {};

	return { ...apiError.fieldErrors };
}

/**
 * Check if error is a validation error (400 status)
 * @param {object} apiError - Parsed API error
 * @returns {boolean}
 */
export function isValidationError(apiError) {
	return apiError && apiError.status === 400;
}

/**
 * Check if error is an authentication error (401 status)
 * @param {object} apiError - Parsed API error
 * @returns {boolean}
 */
export function isAuthError(apiError) {
	return apiError && apiError.status === 401;
}

/**
 * Check if error is an authorization error (403 status)
 * @param {object} apiError - Parsed API error
 * @returns {boolean}
 */
export function isForbiddenError(apiError) {
	return apiError && apiError.status === 403;
}

/**
 * Check if error is a not found error (404 status)
 * @param {object} apiError - Parsed API error
 * @returns {boolean}
 */
export function isNotFoundError(apiError) {
	return apiError && apiError.status === 404;
}

/**
 * Check if error is a conflict error (409 status)
 * @param {object} apiError - Parsed API error
 * @returns {boolean}
 */
export function isConflictError(apiError) {
	return apiError && apiError.status === 409;
}

/**
 * Get user-friendly error message
 * @param {object} apiError - Parsed API error
 * @returns {string}
 */
export function getUserFriendlyMessage(apiError) {
	if (!apiError) return 'An unexpected error occurred';

	// Use the message from the error
	if (apiError.message) return apiError.message;

	// Fallback messages based on status
	switch (apiError.status) {
		case 400:
			return 'Invalid request. Please check your input.';
		case 401:
			return 'Authentication required. Please log in.';
		case 403:
			return 'You do not have permission to perform this action.';
		case 404:
			return 'The requested resource was not found.';
		case 409:
			return 'A conflict occurred. Please try again.';
		case 500:
			return 'A server error occurred. Please try again later.';
		default:
			return 'An error occurred. Please try again.';
	}
}

/**
 * Create a display-friendly error object for UI components
 * @param {Error} error - Raw error from request
 * @returns {object} - { message: string, fieldErrors: object, status: number, code: string }
 */
export function createErrorDisplay(error) {
	const apiError = parseApiError(error);

	return {
		message: getUserFriendlyMessage(apiError),
		fieldErrors: formatFieldErrors(apiError),
		status: apiError.status,
		code: apiError.code,
		hasFieldErrors: hasFieldErrors(apiError),
		isValidation: isValidationError(apiError)
	};
}

/**
 * Log error to console with formatting
 * @param {string} context - Context where error occurred (e.g., 'CustomerForm')
 * @param {Error} error - Error object
 */
export function logApiError(context, error) {
	const apiError = parseApiError(error);

	console.group(`[API Error] ${context}`);
	console.error('Status:', apiError.status);
	console.error('Code:', apiError.code);
	console.error('Message:', apiError.message);

	if (hasFieldErrors(apiError)) {
		console.error('Field Errors:', apiError.fieldErrors);
	}

	console.groupEnd();
}
