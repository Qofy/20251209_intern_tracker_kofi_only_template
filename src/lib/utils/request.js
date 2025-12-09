// src/utils/request.js
// Lightweight fetch wrapper with JSON handling, query params, timeout, and retry logic.
// Uses absolute URLs pointing to backend server (configured in constants.js)

import {
	API_BASE_URL,
	DEFAULT_TIMEOUT,
	DEFAULT_RETRY_CONFIG,
} from "./constants.js";
import { getToken } from "./auth.js";
import { triggerSessionTimeout } from "./authState.js";
import { getTenantHeaders } from "./tenant.js";

/**
 * request('/products', { method: 'POST', body: {...} })
 * request('/products', { query: { page:1, q:'shoes' } })
 * request('/products', { retry: true, retryCount: 3 })
 * request('/products', { exemptTenant: true }) - Skip X-Company-Id header
 */
export async function request(
	path,
	{
		method = "GET",
		headers = {},
		body,
		query,
		timeout = DEFAULT_TIMEOUT,
		retry = false,
		retryCount = DEFAULT_RETRY_CONFIG.retryCount,
		retryDelay = DEFAULT_RETRY_CONFIG.retryDelay,
		exemptTenant = false, // Set to true to skip X-Company-Id header
	} = {},
) {
	const url = buildUrl(API_BASE_URL, path, query);

	// Get authentication token from localStorage
	const token = getToken();

	// Get tenant headers (X-Company-Id) unless exempt
	const tenantHeaders = exemptTenant ? {} : getTenantHeaders();

	const authRequired = Boolean(token);
	const init = {
		method,
		headers: {
			Accept: "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...tenantHeaders, // Inject X-Company-Id header
			...headers, // User headers can override if needed
		},
	};

	if (body !== undefined) {
		// Allow raw body (FormData/Blob/string) or JSON object
		if (
			body instanceof FormData ||
			body instanceof Blob ||
			typeof body === "string"
		) {
			init.body = body;
		} else {
			init.body = JSON.stringify(body);
			init.headers["Content-Type"] = "application/json";
		}
	}

	console.log("url:", url);
	// Use retry logic if requested
	if (retry) {
		return fetchWithRetry(url, init, { timeout, retryCount, retryDelay, path, authRequired });
	}

	// Single attempt with timeout
	return fetchWithTimeout(url, init, { timeout, path, authRequired });
}

/**
 * Fetch with timeout (single attempt)
 */
async function fetchWithTimeout(url, init, { timeout, path, authRequired = false }) {
	const controller = new AbortController();
	const tid = setTimeout(
		() => controller.abort(new Error("Request timeout")),
		timeout,
	);

	try {
		const res = await fetch(url, { ...init, signal: controller.signal });
		const text = await res.text(); // some endpoints might return empty body
		const data = text ? tryJson(text) : null;

		if (!res.ok) {
			const err = new Error(`HTTP ${res.status} ${res.statusText}`);
			err.status = res.status;
			err.data = data;

			// Handle authentication/authorization errors
			if (res.status === 401 && authRequired) {
				// Unauthorized - session expired
				try {
					// Trigger session timeout modal and wait for reconfirmation
					const newToken = await triggerSessionTimeout(
						"session_expired",
						path,
						"401",
					);

					// User re-authenticated successfully, retry the request with new token
					if (newToken) {
						// Update headers with new token
						init.headers.Authorization = `Bearer ${newToken}`;

						// Retry the request
						const retryRes = await fetch(url, {
							...init,
							signal: controller.signal,
						});
						const retryText = await retryRes.text();
						const retryData = retryText ? tryJson(retryText) : null;

						if (!retryRes.ok) {
							const retryErr = new Error(
								`HTTP ${retryRes.status} ${retryRes.statusText}`,
							);
							retryErr.status = retryRes.status;
							retryErr.data = retryData;
							throw retryErr;
						}

						return retryData;
					}
				} catch (authErr) {
					// Re-authentication failed or was cancelled
					console.error("Session reconfirmation failed:", authErr);
					throw err;
				}
			} else if (res.status === 403 && authRequired) {
				// Forbidden - access denied
				await triggerSessionTimeout("access_denied", path, "403");
				// Will redirect to dashboard with message
			}

			throw err;
		}
		return data;
	} catch (err) {
		// Optional dev-friendly fallback: if /products* fails in dev, return sane defaults
		if (isDev() && /\/products(\/|$)/.test(path)) {
			return fallbackForProducts(path);
		}
		throw err;
	} finally {
		clearTimeout(tid);
	}
}

/**
 * Fetch with retry logic (exponential backoff)
 */
async function fetchWithRetry(
	url,
	init,
	{ timeout, retryCount, retryDelay, path, authRequired = false },
) {
	let lastError;

	for (let attempt = 0; attempt <= retryCount; attempt++) {
		try {
			return await fetchWithTimeout(url, init, { timeout, path, authRequired });
		} catch (err) {
			lastError = err;

			// Don't retry on final attempt
			if (attempt < retryCount) {
				const delay = retryDelay * 2 ** attempt; // exponential backoff
				console.warn(
					`[request] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`,
					err.message,
				);
				await sleep(delay);
			}
		}
	}

	// All retries failed
	console.error(
		`[request] All ${retryCount + 1} attempts failed for ${path}:`,
		lastError,
	);

	// Optional dev-friendly fallback
	if (isDev() && /\/products(\/|$)/.test(path)) {
		return fallbackForProducts(path);
	}

	throw lastError;
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildUrl(base, path, query) {
	const baseClean = String(base).replace(/\/$/, "");
	const pathClean = String(path || "").replace(/^\//, "");

	// Build absolute URL pointing to backend server
	// base should already be absolute (e.g., http://127.0.0.1:8081/api)
	const u = new URL(`${baseClean}/${pathClean}`);

	if (query && typeof query === "object") {
		for (const [k, v] of Object.entries(query)) {
			if (v === undefined || v === null) continue;
			Array.isArray(v)
				? v.forEach((vv) => u.searchParams.append(k, vv))
				: u.searchParams.set(k, v);
		}
	}

	// Return absolute URL to backend server
	return u.toString();
}

function tryJson(text) {
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

function isDev() {
	// Vite defines import.meta.env.MODE; fallback to NODE_ENV
	const mode =
		(typeof import.meta !== "undefined" && import.meta.env?.MODE) ||
		process.env.NODE_ENV;
	return mode !== "production";
}

// Very small dev fallback so your app can boot without a backend.
// You can delete this if you always have an API.
function fallbackForProducts(path) {
	if (/\/products\/update$/.test(path)) {
		return { ok: true, message: "dev-fallback: products updated (mock)" };
	}
	if (/\/products\/cache-status$/.test(path)) {
		return { cached: false, count: 0, last_updated: null };
	}
	// GET /products default: empty list
	return [];
}

export default request;
