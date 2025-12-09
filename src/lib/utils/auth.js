export const AUTH_CHANGE_EVENT = "auth:change";

export function emitAuthChange(detail) {
	try {
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT, { detail }));
		}
	} catch {
		// Ignore environments without window (SSR/tests)
	}
}

// Get the auth token if it exists
export function getToken() {
	try {
		return localStorage.getItem("access_token") || "";
	} catch {
		return "";
	}
}

// Get auth headers for API requests
export function getAuthHeaders() {
	const token = getToken();
	return token ? { Authorization: `Bearer ${token}` } : {};
}

export function persistAuthSession({ token, email, claims, user } = {}) {
	try {
		if (token) {
			localStorage.setItem("access_token", token);
		}

		const normalizedEmail =
			(email || user?.email || claims?.email || "")
				?.toLowerCase()
				.trim();
		if (normalizedEmail) {
			localStorage.setItem("user_email", normalizedEmail);
		}

		const userId = user?.id || claims?.sub;
		if (userId) {
			localStorage.setItem("current_user_id", userId);
		}

		const roles = user?.roles || claims?.roles;
		if (roles && roles.length) {
			localStorage.setItem("user_roles", JSON.stringify(roles));
		}

		emitAuthChange({ type: "login", userId });
	} catch (err) {
		console.error("Failed to persist auth session:", err);
	}
}

// Clear auth token and optionally redirect to login
export function clearAuth(redirect = true) {
	try {
		const isAuthRoute = /^\/(?:login|register)(?:\/|$)/i.test(
			window.location.pathname,
		);
		localStorage.removeItem("access_token");
		localStorage.removeItem("user_email");
		localStorage.removeItem("current_user_id");
		localStorage.removeItem("user_roles");
		emitAuthChange({ type: "logout" });
		if (redirect && !isAuthRoute) {
			const currentPath = window.location.pathname + window.location.search;
			window.location.href = `/login?redirectTo=${encodeURIComponent(
				currentPath,
			)}`;
		}
	} catch (e) {
		console.error("Failed to clear auth:", e);
	}
}

// Check if we have a valid token
export function hasValidAuth() {
	const token = getToken();
	return !!token;
}

// Redirect to login if no valid token (for protected routes)
export function requireAuth() {
	if (!hasValidAuth()) {
		if (/^\/(?:login|register)(?:\/|$)/i.test(window.location.pathname)) {
			return false;
		}
		const currentPath = window.location.pathname + window.location.search;
		window.location.href = `/login?redirectTo=${encodeURIComponent(currentPath)}`;
		return false;
	}
	return true;
}
