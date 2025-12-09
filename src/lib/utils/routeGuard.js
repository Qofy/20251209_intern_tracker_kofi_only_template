// Route Guard Utilities
// Ensures company is selected for routes that require tenant context

import { hasActiveCompany, routeRequiresTenant } from './tenant.js';

/**
 * Check if current route requires a company and redirect if not selected
 * @param {string} currentPath - Current route path
 * @param {function} redirectFn - Redirect function (e.g., goto from routify)
 * @returns {boolean} - true if guard passed, false if redirected
 */
export function checkTenantRequired(currentPath, redirectFn) {
	// Check if route requires tenant
	if (!routeRequiresTenant(currentPath)) {
		return true; // Route doesn't require tenant, allow access
	}

	// Check if company is selected
	if (hasActiveCompany()) {
		return true; // Company is selected, allow access
	}

	// Redirect to company selection
	console.warn('Route requires company selection:', currentPath);

	if (redirectFn) {
		// Redirect to dashboard (or company selection page)
		// Store the intended destination to redirect after selection
		if (typeof sessionStorage !== 'undefined') {
			sessionStorage.setItem('redirect_after_company_select', currentPath);
		}
		redirectFn('/dashboard?selectCompany=true');
	}

	return false;
}

/**
 * Get redirect path after company selection
 * @returns {string|null} - Path to redirect to, or null
 */
export function getRedirectAfterCompanySelect() {
	if (typeof sessionStorage === 'undefined') return null;

	const redirect = sessionStorage.getItem('redirect_after_company_select');
	if (redirect) {
		sessionStorage.removeItem('redirect_after_company_select');
		return redirect;
	}

	return null;
}

/**
 * Check if company selection is required for the app
 * Shows company selector modal if needed
 * @returns {boolean} - true if company is selected or not required
 */
export function shouldShowCompanySelector() {
	const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

	// Don't show selector on exempt routes
	if (!routeRequiresTenant(currentPath)) {
		return false;
	}

	// Show selector if no company is selected
	return !hasActiveCompany();
}
