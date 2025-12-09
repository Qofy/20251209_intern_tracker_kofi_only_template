// Auth Store - Replaces AuthContext.jsx
import { writable, derived, get } from 'svelte/store';

const CURRENT_USER_KEY = 'current_user_id';
const ACCESS_TOKEN_KEY = 'access_token';
const LAST_COMPANY_KEY = 'last_active_company_id';
const AUTH_CHANGE_EVENT = 'authChange';

// Safe localStorage operations
const safeGet = (key) => {
	if (typeof window === 'undefined') return null;
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
};

const safeSet = (key, value) => {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(key, value);
	} catch {
		// noop
	}
};

const safeRemove = (key) => {
	if (typeof window === 'undefined') return;
	try {
		localStorage.removeItem(key);
	} catch {
		// noop
	}
};

// Role-Permission mapping
const ROLE_PERMISSION_MAP = {
	super_admin: ['manage_users', 'manage_system_settings'],
	admin: ['manage_users', 'manage_system_settings'],
	user_manager: ['manage_users'],
	settings_manager: ['manage_system_settings'],
	user: []
};

// Derive permissions from user roles
function derivePermissions(user) {
	if (!user) return new Set();

	const assignedRoles = new Set();
	if (user.role) assignedRoles.add(user.role);
	if (Array.isArray(user.roles)) {
		user.roles.filter(Boolean).forEach((role) => assignedRoles.add(role));
	}
	if (assignedRoles.size === 0) {
		assignedRoles.add('user');
	}

	const permissions = new Set(['personal_settings']);
	assignedRoles.forEach((role) => {
		const grants = ROLE_PERMISSION_MAP[role] || [];
		grants.forEach((perm) => permissions.add(perm));
	});

	return permissions;
}

// Create auth store
function createAuthStore() {
	const { subscribe, set, update } = writable({
		currentUser: null,
		currentCompany: null,
		userCompanies: [],
		permissions: new Set(),
		loading: true
	});

	let previousUserId = null;

	return {
		subscribe,

		// Initialize auth state
		async init() {
			try {
				const storedId = safeGet(CURRENT_USER_KEY);
				if (!storedId) {
					update(state => ({ ...state, currentUser: null, loading: false }));
					return;
				}

				// Import User entity dynamically to avoid circular deps
				const { User } = await import('$lib/services/user.service');
				const existingUser = await User.get(storedId);

				if (existingUser) {
					const permissions = derivePermissions(existingUser);
					update(state => ({
						...state,
						currentUser: existingUser,
						permissions,
						loading: false
					}));

					// Load user companies
					await this.loadUserCompanies(existingUser);
				} else {
					update(state => ({ ...state, currentUser: null, loading: false }));
				}
			} catch (error) {
				console.error('Failed to load current user:', error);
				update(state => ({ ...state, loading: false }));
			}
		},

		// Load companies for user
		async loadUserCompanies(user) {
			try {
				const { Company } = await import('$lib/services/company.service');
				let companies;

				if (user.role === 'admin') {
					companies = await Company.list();
				} else {
					companies = await Company.list({
						filter: { 'user_access.user_id': user.id }
					});
				}

				update(state => ({ ...state, userCompanies: companies }));

				// Restore last active company
				const storedCompanyId = safeGet(LAST_COMPANY_KEY);
				if (storedCompanyId) {
					const company = companies.find((c) => c.id === storedCompanyId);
					if (company) {
						this.setCurrentCompany(company);
						return;
					}
				}

				// Default to first company
				if (companies.length > 0) {
					this.setCurrentCompany(companies[0]);
				}
			} catch (error) {
				console.error('Failed to load companies:', error);
			}
		},

		// Set current user
		setCurrentUser(user) {
			if (!user) {
				previousUserId = null;
				safeRemove(CURRENT_USER_KEY);
				safeRemove(LAST_COMPANY_KEY);
				update(state => ({
					...state,
					currentUser: null,
					currentCompany: null,
					userCompanies: [],
					permissions: new Set()
				}));
				return;
			}

			// Reset company context if user changed
			if (previousUserId && previousUserId !== user.id) {
				safeRemove(LAST_COMPANY_KEY);
				update(state => ({
					...state,
					currentCompany: null,
					userCompanies: []
				}));
			}

			previousUserId = user.id;
			safeSet(CURRENT_USER_KEY, user.id);

			const permissions = derivePermissions(user);
			update(state => ({
				...state,
				currentUser: user,
				permissions
			}));

			// Load companies
			this.loadUserCompanies(user);
		},

		// Set current company
		setCurrentCompany(company) {
			if (company) {
				safeSet(LAST_COMPANY_KEY, company.id);
			} else {
				safeRemove(LAST_COMPANY_KEY);
			}

			update(state => ({ ...state, currentCompany: company }));
		},

		// Check if user has permission
		hasPermission(permission) {
			const state = get({ subscribe });
			return state.permissions.has(permission);
		},

		// Logout
		logout() {
			safeRemove(CURRENT_USER_KEY);
			safeRemove(ACCESS_TOKEN_KEY);
			safeRemove(LAST_COMPANY_KEY);

			update(state => ({
				...state,
				currentUser: null,
				currentCompany: null,
				userCompanies: [],
				permissions: new Set()
			}));
		},

		// Refresh current user
		async refresh() {
			const state = get({ subscribe });
			if (state.currentUser) {
				await this.init();
			}
		}
	};
}

export const auth = createAuthStore();

// Derived stores for convenience
export const currentUser = derived(auth, ($auth) => $auth.currentUser);
export const currentCompany = derived(auth, ($auth) => $auth.currentCompany);
export const userCompanies = derived(auth, ($auth) => $auth.userCompanies);
export const isAuthenticated = derived(auth, ($auth) => $auth.currentUser !== null);
export const isAdmin = derived(auth, ($auth) => $auth.currentUser?.role === 'admin');
export const permissions = derived(auth, ($auth) => $auth.permissions);

// Initialize auth on load (browser only)
if (typeof window !== 'undefined') {
	auth.init();

	// Listen for auth changes
	window.addEventListener(AUTH_CHANGE_EVENT, (event) => {
		if (event?.detail?.type === 'logout') {
			auth.logout();
		} else {
			auth.refresh();
		}
	});

	// Listen for storage changes
	window.addEventListener('storage', (event) => {
		if (event.key === CURRENT_USER_KEY || event.key === ACCESS_TOKEN_KEY) {
			auth.refresh();
		}
	});
}
