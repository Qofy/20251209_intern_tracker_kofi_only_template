// Tenant Context Management
// Manages company/tenant selection for multi-tenant operations

/**
 * Get the current active company ID
 * Checks in order: E2E_COMPANY_ID (for tests), last_active_company_id (for users)
 */
export function getActiveCompanyId() {
	if (typeof window === 'undefined') return null;

	// For E2E tests
	const e2eCompanyId = localStorage.getItem('E2E_COMPANY_ID');
	if (e2eCompanyId) return e2eCompanyId;

	// For regular users
	return localStorage.getItem('last_active_company_id');
}

/**
 * Set the active company ID
 */
export function setActiveCompanyId(companyId) {
	if (typeof window === 'undefined') return;

	if (companyId) {
		localStorage.setItem('last_active_company_id', companyId);

		// Dispatch event for components to react to company changes
		window.dispatchEvent(
			new CustomEvent('companyChange', {
				detail: { companyId }
			})
		);
	} else {
		localStorage.removeItem('last_active_company_id');
	}
}

/**
 * Check if a company is currently selected
 */
export function hasActiveCompany() {
	return !!getActiveCompanyId();
}

/**
 * Clear the active company
 */
export function clearActiveCompany() {
	setActiveCompanyId(null);
}

/**
 * Check if a route requires tenant context
 * Returns true if the route requires a selected company
 */
export function routeRequiresTenant(path) {
	// Routes that don't require tenant context
	const exemptRoutes = [
		'/login',
		'/register',
		'/forgot-password',
		'/reset-password',
		'/profile',
		'/settings',
		'/auth',
		'/public'
	];

	// Check if path starts with any exempt route
	return !exemptRoutes.some(route => path.startsWith(route));
}

/**
 * Get tenant header object for API calls
 * Returns { 'X-Company-Id': companyId } or empty object
 */
export function getTenantHeaders() {
	const companyId = getActiveCompanyId();
	console.log('[Tenant] Getting tenant headers, companyId:', companyId);
	return companyId ? { 'X-Company-Id': companyId } : {};
}

/**
 * Set E2E company ID (for testing)
 */
export function setE2ECompanyId(companyId) {
	if (typeof window === 'undefined') return;

	if (companyId) {
		localStorage.setItem('E2E_COMPANY_ID', companyId);
	} else {
		localStorage.removeItem('E2E_COMPANY_ID');
	}
}

/**
 * Clear E2E company ID
 */
export function clearE2ECompanyId() {
	setE2ECompanyId(null);
}
