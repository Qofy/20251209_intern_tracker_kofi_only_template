// Base API Service Layer

import { getTenantHeaders } from '../utils/tenant.js';

const API_BASE_URL = typeof window !== 'undefined' ? (import.meta.env.VITE_API_BASE_URL || '/api') : '/api';

export class APIError extends Error {
	constructor(message, status, data) {
		super(message);
		this.name = 'APIError';
		this.status = status;
		this.data = data;
	}
}

// Get auth token
function getAuthToken() {
	if (typeof window === 'undefined') return null;
	try {
		return localStorage.getItem('access_token');
	} catch {
		return null;
	}
}

// Make API request
export async function apiRequest(endpoint, options = {}) {
	const url = `${API_BASE_URL}${endpoint}`;

	// Get tenant headers (X-Company-Id) unless exempt
	const exemptTenant = options.exemptTenant || false;
	const tenantHeaders = exemptTenant ? {} : getTenantHeaders();

	// Debug: Log tenant header injection
	if (!exemptTenant && Object.keys(tenantHeaders).length === 0) {
		console.warn(`[API] No tenant header for ${endpoint} - company not selected?`);
	}

	const headers = {
		'Content-Type': 'application/json',
		...tenantHeaders, // Inject X-Company-Id header
		...options.headers
	};

	// Add auth token if available
	const token = getAuthToken();
	if (token) {
		headers['Authorization'] = `Bearer ${token}`;
	}

	// Build config without exemptTenant option
	const { exemptTenant: _, ...restOptions } = options;
	const config = {
		...restOptions,
		headers
	};

	// Debug logging
	console.log(`[API] ${config.method || 'GET'} ${endpoint}`, {
		url,
		headers: config.headers,
		body: config.body
	});

	try {
		const response = await fetch(url, config);

		// Handle non-JSON responses
		const contentType = response.headers.get('content-type');
		const isJSON = contentType && contentType.includes('application/json');

		if (!response.ok) {
			const errorData = isJSON ? await response.json() : await response.text();

			// Log error details with full context
			console.error(`[API] Error ${response.status} from ${endpoint}:`, {
				url,
				status: response.status,
				statusText: response.statusText,
				headers: Object.fromEntries(response.headers.entries()),
				errorData
			});

			// Handle 401 Unauthorized - redirect to login
			if (response.status === 401 && typeof window !== 'undefined') {
				console.warn('[API] 401 Unauthorized - redirecting to login');
				// Clear invalid token
				localStorage.removeItem('access_token');
				localStorage.removeItem('current_user_id');
				// Redirect to login with current page as redirect target
				const currentPath = window.location.pathname + window.location.search;
				window.location.href = `/login?reason=session_expired&redirectTo=${encodeURIComponent(currentPath)}`;
			}

			throw new APIError(
				errorData?.message || errorData || `HTTP ${response.status}: ${response.statusText}`,
				response.status,
				errorData
			);
		}

		// Return JSON or text based on content type
		if (isJSON) {
			return await response.json();
		} else {
			// If we expected JSON but got HTML/text, throw an error
			const text = await response.text();
			if (text.trim().startsWith('<')) {
				console.error('[API] Received HTML instead of JSON from:', url);
				console.error('[API] Response preview:', text.substring(0, 500));
				throw new APIError('Expected JSON but received HTML. API endpoint may not exist.', response.status, text);
			}
			return text;
		}
	} catch (error) {
		// Re-throw API errors
		if (error instanceof APIError) {
			throw error;
		}

		// Network or other errors
		throw new APIError(error.message || 'Network request failed', 0, null);
	}
}

// Convenience methods
export const api = {
	get: (endpoint, options = {}) =>
		apiRequest(endpoint, { ...options, method: 'GET' }),

	post: (endpoint, data, options = {}) =>
		apiRequest(endpoint, {
			...options,
			method: 'POST',
			body: JSON.stringify(data)
		}),

	put: (endpoint, data, options = {}) =>
		apiRequest(endpoint, {
			...options,
			method: 'PUT',
			body: JSON.stringify(data)
		}),

	patch: (endpoint, data, options = {}) =>
		apiRequest(endpoint, {
			...options,
			method: 'PATCH',
			body: JSON.stringify(data)
		}),

	delete: (endpoint, options = {}) =>
		apiRequest(endpoint, { ...options, method: 'DELETE' })
};
