// src/utils/constants.js
// Centralized configuration and environment variable normalization

/**
 * Get environment variable with fallback
 * Handles both Vite (import.meta.env) and Node.js (process.env) environments
 */
function getEnv(key, fallback = '') {
  // Vite environment (browser)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key] || fallback;
  }
  // Node.js environment (SSR/tests)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || fallback;
  }
  return fallback;
}

/**
 * Normalize API base URL
 * Handles duplicate env vars: VITE_API_BASE_URL, VITE_API_BASE, API_BASE
 */
export const API_BASE_URL =
  getEnv('VITE_API_BASE_URL') ||
  getEnv('VITE_API_BASE') ||
  getEnv('API_BASE') ||
  '/api'; // Use Vite proxy by default

/**
 * Normalize AUTH base URL
 * Handles duplicate env vars: VITE_AUTH_BASE, AUTH_BASE
 */
export const AUTH_BASE_URL =
  getEnv('VITE_AUTH_BASE') ||
  getEnv('AUTH_BASE') ||
  '/auth'; // Use Vite proxy by default

/**
 * Optional products feed override (frontend uses to avoid duplicate URLs)
 */
export const PRODUCTS_API_URL =
  getEnv('VITE_PRODUCTS_API_URL') ||
  getEnv('PRODUCTS_API_URL') ||
  '';

/**
 * Access token for API authentication
 */
export const ACCESS_TOKEN =
  getEnv('VITE_ACCESS_TOKEN') ||
  getEnv('ACCESS_TOKEN') ||
  'your-secure-access-token-here-change-this-in-production';

/**
 * Offline mode flag
 */
export const OFFLINE_MODE = getEnv('VITE_OFFLINE_MODE') === 'true';

/**
 * Environment mode (development/production)
 */
export const IS_DEVELOPMENT =
  getEnv('MODE') === 'development' ||
  getEnv('NODE_ENV') === 'development';

/**
 * Default request timeout (ms)
 */
export const DEFAULT_TIMEOUT = 20000;

/**
 * Default retry configuration for fetch requests
 */
export const DEFAULT_RETRY_CONFIG = {
  retryCount: 2,
  retryDelay: 1000,
  timeoutMs: 20000,
};

/**
 * Base path for the SPA (mirrors Vite BASE_URL)
 */
export const APP_BASE_PATH = (getEnv('BASE_URL') || '/').replace(/\/?$/, '/');

// Log configuration in development
if (IS_DEVELOPMENT) {
  console.log('[constants] Configuration loaded:', {
    API_BASE_URL,
    AUTH_BASE_URL,
    PRODUCTS_API_URL,
    OFFLINE_MODE,
    IS_DEVELOPMENT,
  });
}
