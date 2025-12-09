// User Service - LocalStorage-only (no backend /api/users endpoint)
// The backend has /api/profile for current user, but no user management endpoints

import { api } from './api';

const STORAGE_KEY = 'users';
const CURRENT_ID_KEY = 'current_user_id';

const nowIso = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function sortBy(list, sort) {
	if (!sort) return list;
	let field = sort;
	let dir = 1;
	if (sort.startsWith('-')) {
		field = sort.slice(1);
		dir = -1;
	}
	return [...list].sort((a, b) =>
		a[field] > b[field] ? dir : a[field] < b[field] ? -dir : 0
	);
}

function loadLS() {
	if (typeof window === 'undefined') return [];
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
	} catch {
		return [];
	}
}

function saveLS(data) {
	if (typeof window === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function upsertLS(rec) {
	const list = loadLS();
	const idx = list.findIndex((r) => r.id === rec.id);
	if (idx >= 0) list[idx] = { ...list[idx], ...rec };
	else list.push(rec);
	saveLS(list);
}

function deleteFromLS(id) {
	const list = loadLS().filter((r) => r.id !== id);
	saveLS(list);
}

export const User = {
	async list(options = {}) {
		const { filter, sort, limit } = options;
		let data = loadLS();

		// Apply filter if provided
		if (filter && typeof filter === 'object') {
			data = data.filter((item) =>
				Object.entries(filter).every(([k, v]) => item[k] === v)
			);
		}

		// Apply sort
		if (sort) data = sortBy(data, sort);

		// Apply limit
		if (typeof limit === 'number') data = data.slice(0, limit);

		return data;
	},

	async get(id) {
		const list = loadLS();
		return list.find((u) => u.id === id) || null;
	},

	async create(userData) {
		const rec = {
			id: uid(),
			...userData,
			created_date: nowIso(),
			last_updated: nowIso()
		};
		upsertLS(rec);
		return rec;
	},

	async update(id, userData) {
		const existing = await this.get(id);
		if (!existing) throw new Error('User not found');
		const updated = {
			...existing,
			...userData,
			last_updated: nowIso()
		};
		upsertLS(updated);
		return updated;
	},

	async delete(id) {
		deleteFromLS(id);
		return { success: true };
	},

	// Get current user from /api/profile (this DOES exist in backend)
	async getCurrentUser() {
		try {
			const data = await api.get('/profile');
			// Sync to localStorage
			if (data?.id) {
				this.syncAuthUser(data);
			}
			return data;
		} catch (error) {
			console.error('Failed to fetch current user:', error);
			return null;
		}
	},

	// Alias for getCurrentUser (for backwards compatibility)
	async me() {
		const currentUserId = typeof window !== 'undefined' ? localStorage.getItem(CURRENT_ID_KEY) : null;

		// Try to get from /api/profile first
		try {
			const data = await api.get('/profile');
			if (data?.id) {
				this.syncAuthUser(data);
			}
			return data;
		} catch (error) {
			console.error('Failed to fetch current user:', error);

			// Fallback to cached user
			if (currentUserId) {
				const cached = loadLS().find(u => u.id === currentUserId);
				if (cached) return cached;
			}

			// Return default user if authenticated
			const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('access_token');
			if (hasToken) {
				const defaultUser = {
					id: currentUserId || 'default_user',
					name: 'Default User',
					email: 'user@example.com',
					role: 'user',
					preferences: { theme: 'light', language: 'en' },
					created_date: nowIso(),
					last_updated: nowIso()
				};
				return defaultUser;
			}

			return null;
		}
	},

	// Update current user data (localStorage-only since users are not stored in backend)
	async updateMyUserData(patch = {}) {
		const currentUserId = typeof window !== 'undefined' ? localStorage.getItem(CURRENT_ID_KEY) : null;

		if (!currentUserId) {
			// If no current user ID, try to get from me()
			const user = await this.me();
			if (!user) {
				throw new Error('No current user found');
			}

			const updated = {
				...user,
				...patch,
				last_updated: nowIso()
			};
			upsertLS(updated);
			return updated;
		}

		const existing = await this.get(currentUserId);
		if (!existing) {
			throw new Error('Current user not found in localStorage');
		}

		const updated = {
			...existing,
			...patch,
			last_updated: nowIso()
		};

		upsertLS(updated);
		return updated;
	},

	// Sync authenticated user to local cache
	async syncAuthUser(authUser = {}) {
		const { id, email, name, roles, role } = authUser;

		if (!id) return null;

		const existing = loadLS().find(u => u.id === id);
		const normalizedEmail = email?.toLowerCase();
		// Default to 'admin' instead of 'user' for localStorage-only environment
		const roleValue = role || (Array.isArray(roles) && roles.length ? roles[0] : existing?.role || 'admin');
		const now = nowIso();

		const record = {
			...(existing || {
				created_date: now
			}),
			id,
			name: name ?? existing?.name ?? normalizedEmail?.split('@')[0] ?? 'User',
			email: normalizedEmail ?? existing?.email ?? '',
			role: roleValue,
			roles: roles?.length ? roles : existing?.roles ?? [roleValue],
			last_updated: now
		};

		upsertLS(record);

		if (typeof window !== 'undefined') {
			localStorage.setItem(CURRENT_ID_KEY, id);
		}

		return record;
	},

	// Clear cache
	clearCache() {
		if (typeof window === 'undefined') return;
		localStorage.removeItem(STORAGE_KEY);
	}
};
