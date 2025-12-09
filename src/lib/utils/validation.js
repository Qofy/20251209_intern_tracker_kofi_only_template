/**
 * Zero-trust frontend validation utilities
 * Mirrors backend validation rules for defense in depth
 */
import { PATTERNS } from "$lib/utils/patterns";

export const EMAIL_REGEX = new RegExp(PATTERNS.zip, "v");

/*
 * Validate email with strict rules
 */
export function validateEmail(email) {
	const trimmed = email.trim().toLowerCase();

	if (!trimmed) {
		return { valid: false, error: "Email is required" };
	}

	if (trimmed.length > 254) {
		return { valid: false, error: "Email too long (max 254 characters)" };
	}

	if (!EMAIL_REGEX.test(trimmed)) {
		return { valid: false, error: "Invalid email format" };
	}

	const parts = trimmed.split("@");
	if (parts.length !== 2) {
		return { valid: false, error: "Invalid email format" };
	}

	const [local, domain] = parts;

	if (!local || local.length > 64) {
		return { valid: false, error: "Invalid email local part" };
	}

	if (!domain || !domain.includes(".")) {
		return { valid: false, error: "Invalid email domain" };
	}

	// Check for common disposable email domains
	const disposableDomains = [
		"tempmail.com",
		"throwaway.email",
		"10minutemail.com",
		"guerrillamail.com",
	];
	if (disposableDomains.some((d) => domain.endsWith(d))) {
		return {
			valid: false,
			error: "Disposable email addresses are not allowed",
		};
	}

	return { valid: true, value: trimmed };
}

/**
 * Validate password strength with comprehensive rules
 */
export function validatePassword(password) {
	if (!password) {
		return { valid: false, error: "Password is required" };
	}

	if (password.length < 12) {
		return { valid: false, error: "Password must be at least 12 characters" };
	}

	if (password.length > 128) {
		return { valid: false, error: "Password must be less than 128 characters" };
	}

	const hasLowercase = /[a-z]/.test(password);
	const hasUppercase = /[A-Z]/.test(password);
	const hasDigit = /[0-9]/.test(password);
	const hasSpecial = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password);

	if (!hasLowercase) {
		return {
			valid: false,
			error: "Password must contain at least one lowercase letter",
		};
	}

	if (!hasUppercase) {
		return {
			valid: false,
			error: "Password must contain at least one uppercase letter",
		};
	}

	if (!hasDigit) {
		return { valid: false, error: "Password must contain at least one number" };
	}

	if (!hasSpecial) {
		return {
			valid: false,
			error:
				"Password must contain at least one special character (!@#$%^&*...)",
		};
	}

	// Check for common weak patterns
	const lower = password.toLowerCase();
	const commonPatterns = [
		"password",
		"123456",
		"qwerty",
		"abc123",
		"letmein",
		"111111",
		"123123",
		"admin",
		"welcome",
		"monkey",
	];

	for (const pattern of commonPatterns) {
		if (lower.includes(pattern)) {
			return { valid: false, error: "Password contains common weak patterns" };
		}
	}

	// Check for sequential characters
	if (/012|123|234|345|456|567|678|789|abc|bcd|cde|def/i.test(password)) {
		return { valid: false, error: "Password contains sequential characters" };
	}

	return { valid: true };
}

/**
 * Get password strength indicator (for UI feedback)
 */
export function getPasswordStrength(password) {
	if (!password) return { score: 0, label: "None", color: "gray" };

	let score = 0;

	// Length scoring
	if (password.length >= 12) score += 2;
	else if (password.length >= 8) score += 1;

	// Character variety
	if (/[a-z]/.test(password)) score += 1;
	if (/[A-Z]/.test(password)) score += 1;
	if (/[0-9]/.test(password)) score += 1;
	if (/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) score += 1;

	// Length bonus
	if (password.length >= 16) score += 1;
	if (password.length >= 20) score += 1;

	// Variety bonus
	const uniqueChars = new Set(password).size;
	if (uniqueChars >= 10) score += 1;

	// Map score to strength
	if (score >= 8) return { score, label: "Very Strong", color: "green" };
	if (score >= 6) return { score, label: "Strong", color: "blue" };
	if (score >= 4) return { score, label: "Medium", color: "yellow" };
	if (score >= 2) return { score, label: "Weak", color: "orange" };
	return { score, label: "Very Weak", color: "red" };
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input) {
	if (typeof input !== "string") return "";

	return input
		.trim()
		.replace(/[<>'"]/g, "") // Remove potentially dangerous characters
		.slice(0, 1000); // Limit length
}

/**
 * Rate limiting helper for client-side
 */
export class RateLimiter {
	constructor(maxAttempts = 5, windowMs = 60000) {
		this.maxAttempts = maxAttempts;
		this.windowMs = windowMs;
		this.attempts = [];
	}

	canAttempt() {
		const now = Date.now();
		// Remove old attempts outside the window
		this.attempts = this.attempts.filter((time) => now - time < this.windowMs);

		return this.attempts.length < this.maxAttempts;
	}

	recordAttempt() {
		this.attempts.push(Date.now());
	}

	getRemainingTime() {
		if (this.attempts.length < this.maxAttempts) return 0;

		const oldestAttempt = Math.min(...this.attempts);
		const timeUntilReset = this.windowMs - (Date.now() - oldestAttempt);
		return Math.max(0, timeUntilReset);
	}

	reset() {
		this.attempts = [];
	}
}

/**
 * Debounce function - delays execution until after wait time
 */
export function debounce(func, wait = 300) {
	let timeout;
	return function executedFunction(...args) {
		const later = () => {
			clearTimeout(timeout);
			func(...args);
		};
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}

/**
 * Customer-specific validation
 */
export function validatePhone(phone) {
	if (!phone) return { valid: true }; // Optional field

	// Allow international phone numbers with common formats
	//	const phoneRegex = /^[0-9+()\-.\s]{6,32}$/;
	const phoneRegex = new RegExp(PATTERNS.phone, "v");

	if (!phoneRegex.test(phone)) {
		return { valid: false, error: "Invalid phone number format" };
	}

	return { valid: true };
}

export function validateUrl(url) {
	if (!url) return { valid: true }; // Optional field

	const urlRegex = new RegExp(PATTERNS.url, "v");
	// const urlRegex = /^https?:\/\/[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]{1,2048}$/;

	if (!urlRegex.test(url)) {
		return {
			valid: false,
			error: "Invalid URL format (must start with http:// or https://)",
		};
	}

	if (url.length > 2048) {
		return { valid: false, error: "URL too long (max 2048 characters)" };
	}

	return { valid: true };
}

export function validateCountryCode(code) {
	if (!code) {
		return { valid: false, error: "Country is required" };
	}

	// Must be 2-letter uppercase ISO code
	const countryRegex = /^[A-Z]{2}$/;

	if (!countryRegex.test(code)) {
		return {
			valid: false,
			error: "Country must be 2-letter ISO code (e.g., US, NO, GB)",
		};
	}

	return { valid: true };
}

export function validateCurrencyCode(code) {
	if (!code) {
		return { valid: false, error: "Currency is required" };
	}

	// Must be 3-letter uppercase ISO code
	const currencyRegex = /^[A-Z]{3}$/;

	if (!currencyRegex.test(code)) {
		return {
			valid: false,
			error: "Currency must be 3-letter ISO code (e.g., USD, EUR, NOK)",
		};
	}

	return { valid: true };
}

export function validateVatNumber(country, vat) {
	if (!vat) return { valid: true }; // Optional field

	// Country-specific VAT validation
	const patterns = {
		NO: /^NO\d{9}MVA$/,
		DE: /^DE\d{9}$/,
		NL: /^NL[A-Z0-9]{12}$/,
		GB: /^GB\d{9}$|^GB\d{12}$|^GBGD\d{3}$|^GBHA\d{3}$/,
	};

	const pattern = patterns[country] || /^[A-Z0-9]{6,20}$/; // Generic pattern

	if (!pattern.test(vat)) {
		return {
			valid: false,
			error: `Invalid VAT number format for ${country || "selected country"}`,
		};
	}

	return { valid: true };
}

export function validateZipCode(zip) {
	if (!zip) return { valid: true }; // Optional field

	const zipRegex = new RegExp(PATTERNS.zip, "v");

	if (!zipRegex.test(zip)) {
		return { valid: false, error: "Invalid postal code format" };
	}

	return { valid: true };
}

export function validateName(name) {
	if (!name || name.trim().length === 0) {
		return { valid: false, error: "Name is required" };
	}

	if (name.length > 128) {
		return { valid: false, error: "Name too long (max 128 characters)" };
	}

	// Allow letters, numbers, spaces, and common business characters
	// const nameRegex = /^[A-Za-z0-9\s\-,.&/()'_]{1,128}$/;
	const nameRegex = new RegExp(PATTERNS.name, "v");

	if (!nameRegex.test(name)) {
		return { valid: false, error: "Name contains invalid characters" };
	}

	return { valid: true };
}
