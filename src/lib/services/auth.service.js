// Auth Service - Authentication API calls
import { api } from './api';

const AUTH_BASE_URL = '/auth';

// Hash password using SHA-256
async function sha256Hex(message) {
	if (typeof window === 'undefined') return message;

	const msgBuffer = new TextEncoder().encode(message);
	const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Login with hashed credentials
export async function login(email, password) {
	const hashedEmail = await sha256Hex(email);
	const hashedPassword = await sha256Hex(password);

	try {
		const response = await api.post(`${AUTH_BASE_URL}/login`, {
			hashed_email: hashedEmail,
			hashed_password: hashedPassword
		});

		if (response.token) {
			localStorage.setItem('access_token', response.token);
			if (response.user) {
				localStorage.setItem('current_user_id', response.user.id);
			}
		}

		return response;
	} catch (error) {
		// Handle 409 upgrade_required - retry with hashed credentials
		if (error.status === 409 && error.data?.code === 'upgrade_required') {
			console.log('Legacy auth detected, retrying with hashed credentials...');
			// Already using hashed credentials, so this shouldn't happen
			// But if backend returns this, the hashing might have failed
			throw new Error('Authentication upgrade required but already using hashed credentials');
		}
		throw error;
	}
}

// Register
export async function register(userData) {
	if (userData.password) {
		userData.hashed_password = await sha256Hex(userData.password);
		delete userData.password;
	}

	const response = await api.post(`${AUTH_BASE_URL}/register`, userData);

	if (response.token) {
		localStorage.setItem('access_token', response.token);
		if (response.user) {
			localStorage.setItem('current_user_id', response.user.id);
		}
	}

	return response;
}

// Logout
export function logout() {
	if (typeof window === 'undefined') return;

	localStorage.removeItem('access_token');
	localStorage.removeItem('current_user_id');
	localStorage.removeItem('last_active_company_id');

	// Dispatch auth change event
	window.dispatchEvent(new CustomEvent('authChange', { detail: { type: 'logout' } }));
}

// Reconfirm session (for session timeout)
export async function reconfirmSession(password) {
	try {
		const token = localStorage.getItem('access_token');
		const hashedPassword = await sha256Hex(password);

		const response = await api.post(
			`${AUTH_BASE_URL}/reconfirm`,
			{
				hashed_password: hashedPassword
			},
			{
				headers: {
					Authorization: `Bearer ${token}`
				}
			}
		);

		if (response.token) {
			localStorage.setItem('access_token', response.token);
			return response.token;
		}

		return null;
	} catch (error) {
		console.error('Reconfirm session failed:', error);
		return null;
	}
}

// Forgot password
export async function forgotPassword(email) {
	return api.post(`${AUTH_BASE_URL}/forgot-password`, { email });
}

// Reset password
export async function resetPassword(token, newPassword) {
	const hashedPassword = await sha256Hex(newPassword);

	return api.post(`${AUTH_BASE_URL}/reset-password`, {
		token,
		hashed_password: hashedPassword
	});
}

// Check if authenticated
export function isAuthenticated() {
	if (typeof window === 'undefined') return false;
	return !!localStorage.getItem('access_token');
}

// Get current token
export function getToken() {
	if (typeof window === 'undefined') return null;
	return localStorage.getItem('access_token');
}

// Redirect to login
export function redirectToLogin(reason = '', redirectTo = '') {
	if (typeof window === 'undefined') return;

	const params = new URLSearchParams();
	if (reason) params.append('reason', reason);
	if (redirectTo) params.append('redirectTo', redirectTo);

	const query = params.toString();
	window.location.href = `/login${query ? `?${query}` : ''}`;
}
