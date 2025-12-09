/**
 * Auth State Manager
 * Manages session timeout modal state and authentication flow
 */

import { APP_BASE_PATH } from "./constants.js";

let sessionTimeoutCallback = null;
let pendingRequest = null;
const AUTH_ROUTE_REGEX = /^\/(?:login|register)(?:\/|$)/i;
const NORMALIZED_BASE =
  APP_BASE_PATH === "/" ? "" : APP_BASE_PATH.replace(/\/$/, "");

/**
 * Register callback for session timeout events
 */
export function onSessionTimeout(callback) {
  sessionTimeoutCallback = callback;
}

/**
 * Trigger session timeout modal
 * @param {string} reason - 'session_expired' | 'server_timeout' | 'frontend_timeout'
 * @param {string} attemptedRoute - The route that was attempted
 * @param {string} errorType - '401' | '403'
 * @returns {Promise} - Resolves when user confirms password or rejects on cancel
 */
export function triggerSessionTimeout(
  reason,
  attemptedRoute,
  errorType = '401',
  options = {},
) {
  const { force = false } = options;
  return new Promise((resolve, reject) => {
    if (!force && shouldSuppressModal()) {
      reject(new Error('Session timeout suppressed on auth route'));
      return;
    }
    if (sessionTimeoutCallback) {
      pendingRequest = { resolve, reject };
      sessionTimeoutCallback({
        reason,
        attemptedRoute,
        errorType,
      });
    } else {
      redirectToLogin(reason || 'session_expired', attemptedRoute);
      reject(new Error('Session timeout'));
    }
  });
}

/**
 * Resolve pending request (called after successful password confirmation)
 * @param {string} newToken - New JWT token from reconfirmation
 */
export function resolveSessionTimeout(newToken) {
  if (pendingRequest) {
    // Store new token
    if (newToken) {
      localStorage.setItem('access_token', newToken);
    }
    pendingRequest.resolve(newToken);
    pendingRequest = null;
  }
}

/**
 * Reject pending request (called after failed password confirmation)
 */
export function rejectSessionTimeout() {
  if (pendingRequest) {
    pendingRequest.reject(new Error('Authentication failed'));
    pendingRequest = null;
  }
}

/**
 * Check if there's a pending session timeout
 */
export function hasPendingSessionTimeout() {
  return pendingRequest !== null;
}

/**
 * Get session timeout reason from localStorage (for login page banner)
 */
export function getSessionTimeoutReason() {
  const reason = localStorage.getItem('session_timeout_reason');
  const from = localStorage.getItem('session_timeout_from');

  // Clear after reading
  localStorage.removeItem('session_timeout_reason');
  localStorage.removeItem('session_timeout_from');

  return { reason, from };
}

/**
 * Get access denied message (for dashboard banner)
 */
export function getAccessDeniedMessage() {
  const message = localStorage.getItem('access_denied_message');

  // Clear after reading
  localStorage.removeItem('access_denied_message');

  return message;
}

/**
 * Set access denied message
 */
export function setAccessDeniedMessage(message) {
  localStorage.setItem('access_denied_message', message);
}

export function redirectToLogin(reason = 'session_expired', fromPath) {
  if (typeof window === 'undefined') return;
  if (AUTH_ROUTE_REGEX.test(window.location.pathname)) {
    return;
  }
  const currentPath = fromPath || window.location.pathname + window.location.search;
  localStorage.setItem('session_timeout_reason', reason);
  localStorage.setItem('session_timeout_from', currentPath);
  const loginUrl = `${NORMALIZED_BASE}/login?redirectTo=${encodeURIComponent(
    currentPath,
  )}&reason=${encodeURIComponent(reason)}`;
  const target = loginUrl.startsWith('/')
    ? loginUrl
    : `/${loginUrl.replace(/^\/?/, '')}`;
  if (window.location.pathname + window.location.search === target) {
    return;
  }
  window.location.href = target;
}

function shouldSuppressModal() {
  if (typeof window === 'undefined') return false;
  return AUTH_ROUTE_REGEX.test(window.location.pathname);
}

const isBrowser = typeof window !== 'undefined';
const envMode =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE) ||
  (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) ||
  'production';

if (isBrowser && envMode !== 'production') {
  window.__quoteflowSessionTest = {
    trigger(payload = {}) {
      return triggerSessionTimeout(
        payload.reason || 'session_expired',
        payload.attemptedRoute || window.location.pathname,
        payload.errorType || '401',
        { force: true },
      );
    },
  };
}
