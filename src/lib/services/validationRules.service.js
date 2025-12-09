// Validation Rules Service
// Fetches and caches validation rules from the backend

import { request } from '../utils/request.js';

// In-memory cache for validation rules
let rulesCache = null;
let rulesCacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all validation rules from the backend
 * Uses consolidated endpoint: GET /api/validation/rules
 */
export async function fetchValidationRules(forceRefresh = false) {
	// Return cached rules if valid
	if (
		!forceRefresh &&
		rulesCache &&
		rulesCacheTimestamp &&
		Date.now() - rulesCacheTimestamp < CACHE_DURATION
	) {
		return rulesCache;
	}

	try {
		const rules = await request('/api/validation/rules', {
			method: 'GET',
			exemptTenant: true // Validation rules are not tenant-scoped
		});

		rulesCache = rules;
		rulesCacheTimestamp = Date.now();

		return rules;
	} catch (error) {
		console.error('Failed to fetch validation rules:', error);

		// Return cached rules if available, even if expired
		if (rulesCache) {
			console.warn('Using expired validation rules cache');
			return rulesCache;
		}

		// Return empty rules if no cache available
		return { models: [] };
	}
}

/**
 * Get validation rules for a specific model
 * @param {string} modelName - Name of the model (e.g., 'Company', 'Customer', 'Quote', 'Invoice')
 */
export async function getModelValidationRules(modelName) {
	const allRules = await fetchValidationRules();

	const modelRules = allRules.models?.find(m => m.model === modelName);

	return modelRules || { model: modelName, fields: {} };
}

/**
 * Fetch validation rules for companies
 * Uses specific endpoint: GET /api/validation/companies
 */
export async function fetchCompanyValidationRules() {
	try {
		const rules = await request('/api/validation/companies', {
			method: 'GET',
			exemptTenant: true
		});
		return rules;
	} catch (error) {
		console.error('Failed to fetch company validation rules:', error);
		return { fields: {} };
	}
}

/**
 * Fetch validation rules for customers
 * Uses specific endpoint: GET /api/validation_customers
 */
export async function fetchCustomerValidationRules() {
	try {
		const rules = await request('/api/validation_customers', {
			method: 'GET'
		});
		return rules;
	} catch (error) {
		console.error('Failed to fetch customer validation rules:', error);
		return { fields: {} };
	}
}

/**
 * Fetch validation rules for quotes
 * Uses specific endpoint: GET /api/validation/quotes
 */
export async function fetchQuoteValidationRules() {
	try {
		const rules = await request('/api/validation/quotes', {
			method: 'GET'
		});
		return rules;
	} catch (error) {
		console.error('Failed to fetch quote validation rules:', error);
		return { fields: {} };
	}
}

/**
 * Fetch validation rules for invoices
 * Uses specific endpoint: GET /api/validation/invoices
 */
export async function fetchInvoiceValidationRules() {
	try {
		const rules = await request('/api/validation/invoices', {
			method: 'GET'
		});
		return rules;
	} catch (error) {
		console.error('Failed to fetch invoice validation rules:', error);
		return { fields: {} };
	}
}

/**
 * Check if a field is required based on validation rules
 * @param {object} modelRules - Validation rules for the model
 * @param {string} fieldPath - Field path (e.g., 'name', 'address.country')
 */
export function isFieldRequired(modelRules, fieldPath) {
	if (!modelRules || !modelRules.fields) return false;

	const fieldRules = modelRules.fields[fieldPath];
	return fieldRules?.required === true;
}

/**
 * Get field validation pattern (regex)
 * @param {object} modelRules - Validation rules for the model
 * @param {string} fieldPath - Field path
 */
export function getFieldPattern(modelRules, fieldPath) {
	if (!modelRules || !modelRules.fields) return null;

	const fieldRules = modelRules.fields[fieldPath];
	return fieldRules?.pattern || null;
}

/**
 * Get field enum values (allowed values)
 * @param {object} modelRules - Validation rules for the model
 * @param {string} fieldPath - Field path
 */
export function getFieldEnum(modelRules, fieldPath) {
	if (!modelRules || !modelRules.fields) return null;

	const fieldRules = modelRules.fields[fieldPath];
	return fieldRules?.enum || null;
}

/**
 * Get field coercion rules (type conversions)
 * @param {object} modelRules - Validation rules for the model
 * @param {string} fieldPath - Field path
 */
export function getFieldCoercions(modelRules, fieldPath) {
	if (!modelRules || !modelRules.fields) return null;

	const fieldRules = modelRules.fields[fieldPath];
	return fieldRules?.coercions || null;
}

/**
 * Validate a field value against its rules
 * @param {object} modelRules - Validation rules for the model
 * @param {string} fieldPath - Field path
 * @param {any} value - Field value
 * @returns {object} - { valid: boolean, error: string|null }
 */
export function validateField(modelRules, fieldPath, value) {
	if (!modelRules || !modelRules.fields) {
		return { valid: true, error: null };
	}

	const fieldRules = modelRules.fields[fieldPath];
	if (!fieldRules) {
		return { valid: true, error: null };
	}

	// Check required
	if (fieldRules.required && (value === null || value === undefined || value === '')) {
		return { valid: false, error: 'This field is required' };
	}

	// Skip other validations if empty and not required
	if (!value && !fieldRules.required) {
		return { valid: true, error: null };
	}

	// Check pattern (regex)
	if (fieldRules.pattern && value) {
		const regex = new RegExp(fieldRules.pattern);
		if (!regex.test(String(value))) {
			return { valid: false, error: 'Invalid format' };
		}
	}

	// Check enum (allowed values)
	if (fieldRules.enum && value) {
		if (!fieldRules.enum.includes(value)) {
			return { valid: false, error: `Must be one of: ${fieldRules.enum.join(', ')}` };
		}
	}

	return { valid: true, error: null };
}

/**
 * Validate an entire object against model rules
 * @param {object} modelRules - Validation rules for the model
 * @param {object} data - Object to validate
 * @returns {object} - { valid: boolean, errors: { [fieldPath]: string } }
 */
export function validateModel(modelRules, data) {
	const errors = {};
	let valid = true;

	if (!modelRules || !modelRules.fields) {
		return { valid: true, errors: {} };
	}

	// Validate each field in the rules
	for (const [fieldPath, fieldRules] of Object.entries(modelRules.fields)) {
		// Get nested field value
		const value = getNestedValue(data, fieldPath);

		const result = validateField(modelRules, fieldPath, value);
		if (!result.valid) {
			errors[fieldPath] = result.error;
			valid = false;
		}
	}

	return { valid, errors };
}

/**
 * Helper: Get nested value from object using dot notation
 * @param {object} obj - Object to get value from
 * @param {string} path - Dot-separated path (e.g., 'address.country')
 */
function getNestedValue(obj, path) {
	return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Clear validation rules cache
 * Use this when backend version changes or to force refresh
 */
export function clearValidationCache() {
	rulesCache = null;
	rulesCacheTimestamp = null;
}
