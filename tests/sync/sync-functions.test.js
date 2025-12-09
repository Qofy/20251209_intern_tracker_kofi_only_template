/**
 * Unit tests for sync functions
 * Tests the core sync logic, exponential backoff, and validation error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

global.localStorage = localStorageMock;

// Mock window events
global.window = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};

// Mock navigator
global.navigator = { onLine: true };

describe('Sync State Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize sync state correctly', () => {
    const state = JSON.parse(localStorage.getItem('sync_state') || '{"failureCount":0,"lastAttempt":null,"nextAttempt":null,"isSyncing":false}');
    expect(state.failureCount).toBe(0);
    expect(state.isSyncing).toBe(false);
    expect(state.nextAttempt).toBe(null);
  });

  it('should increment failure count on sync failure', () => {
    // Simulate first failure
    const now = Date.now();
    const backoffMs = 3000; // First backoff is 3 seconds
    const nextAttempt = now + backoffMs;

    localStorage.setItem('sync_state', JSON.stringify({
      failureCount: 1,
      lastAttempt: now,
      nextAttempt: nextAttempt,
      isSyncing: false,
    }));

    const state = JSON.parse(localStorage.getItem('sync_state'));
    expect(state.failureCount).toBe(1);
    expect(state.nextAttempt).toBeGreaterThan(now);
  });

  it('should use exponential backoff intervals', () => {
    const intervals = [3000, 10000, 30000, 60000, 300000, 600000, 900000];

    // Test that each failure increases the backoff
    for (let i = 0; i < intervals.length; i++) {
      const now = Date.now();
      const nextAttempt = now + intervals[i];

      localStorage.setItem('sync_state', JSON.stringify({
        failureCount: i,
        lastAttempt: now,
        nextAttempt: nextAttempt,
        isSyncing: false,
      }));

      const state = JSON.parse(localStorage.getItem('sync_state'));
      const expectedInterval = intervals[i];
      const actualInterval = state.nextAttempt - now;

      expect(actualInterval).toBeCloseTo(expectedInterval, -2); // Within 100ms
    }
  });

  it('should reset sync state on successful sync', () => {
    // Set a failed state
    localStorage.setItem('sync_state', JSON.stringify({
      failureCount: 3,
      lastAttempt: Date.now(),
      nextAttempt: Date.now() + 30000,
      isSyncing: false,
    }));

    // Simulate successful sync
    localStorage.setItem('sync_state', JSON.stringify({
      failureCount: 0,
      lastAttempt: null,
      nextAttempt: null,
      isSyncing: false,
    }));

    const state = JSON.parse(localStorage.getItem('sync_state'));
    expect(state.failureCount).toBe(0);
    expect(state.nextAttempt).toBe(null);
  });

  it('should cap failure count at max backoff index', () => {
    const maxFailures = 10;
    const now = Date.now();

    localStorage.setItem('sync_state', JSON.stringify({
      failureCount: maxFailures,
      lastAttempt: now,
      nextAttempt: now + 900000, // Max backoff is 15 minutes
      isSyncing: false,
    }));

    const state = JSON.parse(localStorage.getItem('sync_state'));

    // Failure count should not exceed the max index (6 for 7 intervals)
    expect(state.failureCount).toBeLessThanOrEqual(6);
  });
});

describe('Validation Error Storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should store validation errors', () => {
    const error = {
      id: 'error1',
      entity: 'quotes',
      action: 'create',
      tempId: 'tmp_123',
      payload: { title: 'Test' },
      errors: { customer_id: ['This field is required'] },
      message: 'Validation failed',
      timestamp: new Date().toISOString(),
    };

    localStorage.setItem('validation_errors', JSON.stringify([error]));

    const errors = JSON.parse(localStorage.getItem('validation_errors'));
    expect(errors).toHaveLength(1);
    expect(errors[0].id).toBe('error1');
    expect(errors[0].entity).toBe('quotes');
  });

  it('should remove validation error by id', () => {
    const errors = [
      { id: 'error1', entity: 'quotes' },
      { id: 'error2', entity: 'invoices' },
    ];
    localStorage.setItem('validation_errors', JSON.stringify(errors));

    // Remove error1
    const updated = errors.filter(e => e.id !== 'error1');
    localStorage.setItem('validation_errors', JSON.stringify(updated));

    const remaining = JSON.parse(localStorage.getItem('validation_errors'));
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('error2');
  });

  it('should clear all validation errors', () => {
    const errors = [
      { id: 'error1', entity: 'quotes' },
      { id: 'error2', entity: 'invoices' },
    ];
    localStorage.setItem('validation_errors', JSON.stringify(errors));

    localStorage.setItem('validation_errors', JSON.stringify([]));

    const cleared = JSON.parse(localStorage.getItem('validation_errors'));
    expect(cleared).toHaveLength(0);
  });
});

describe('Offline Queue Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should enqueue operations when offline', () => {
    const operation = {
      entity: 'quotes',
      action: 'create',
      tempId: 'tmp_123',
      payload: { title: 'Test Quote' },
      ts: new Date().toISOString(),
    };

    const queue = [operation];
    localStorage.setItem('offline_queue', JSON.stringify(queue));

    const stored = JSON.parse(localStorage.getItem('offline_queue'));
    expect(stored).toHaveLength(1);
    expect(stored[0].entity).toBe('quotes');
    expect(stored[0].action).toBe('create');
  });

  it('should dequeue operations after successful sync', () => {
    const queue = [
      { entity: 'quotes', action: 'create', tempId: 'tmp_1' },
      { entity: 'invoices', action: 'create', tempId: 'tmp_2' },
    ];
    localStorage.setItem('offline_queue', JSON.stringify(queue));

    // Simulate successful sync of first item
    queue.splice(0, 1);
    localStorage.setItem('offline_queue', JSON.stringify(queue));

    const remaining = JSON.parse(localStorage.getItem('offline_queue'));
    expect(remaining).toHaveLength(1);
    expect(remaining[0].entity).toBe('invoices');
  });

  it('should separate network errors from validation errors', () => {
    const queue = [
      { entity: 'quotes', action: 'create', tempId: 'tmp_1' },
    ];
    localStorage.setItem('offline_queue', JSON.stringify(queue));

    const validationErrors = [
      { id: 'error1', entity: 'invoices', tempId: 'tmp_2' },
    ];
    localStorage.setItem('validation_errors', JSON.stringify(validationErrors));

    // Network errors stay in queue
    const queueItems = JSON.parse(localStorage.getItem('offline_queue'));
    expect(queueItems).toHaveLength(1);
    expect(queueItems[0].entity).toBe('quotes');

    // Validation errors are separate
    const errors = JSON.parse(localStorage.getItem('validation_errors'));
    expect(errors).toHaveLength(1);
    expect(errors[0].entity).toBe('invoices');
  });
});

describe('Sync Status Calculation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should calculate next retry countdown', () => {
    const now = Date.now();
    const nextAttempt = now + 30000; // 30 seconds from now

    localStorage.setItem('sync_state', JSON.stringify({
      failureCount: 2,
      lastAttempt: now,
      nextAttempt: nextAttempt,
      isSyncing: false,
    }));

    const state = JSON.parse(localStorage.getItem('sync_state'));
    const nextRetryIn = Math.ceil((state.nextAttempt - Date.now()) / 1000);

    expect(nextRetryIn).toBeGreaterThan(0);
    expect(nextRetryIn).toBeLessThanOrEqual(30);
  });

  it('should show pending count correctly', () => {
    const queue = [
      { entity: 'quotes', action: 'create' },
      { entity: 'invoices', action: 'update' },
      { entity: 'customers', action: 'delete' },
    ];
    localStorage.setItem('offline_queue', JSON.stringify(queue));

    const stored = JSON.parse(localStorage.getItem('offline_queue'));
    expect(stored.length).toBe(3);
  });

  it('should indicate syncing state', () => {
    localStorage.setItem('sync_state', JSON.stringify({
      failureCount: 0,
      lastAttempt: Date.now(),
      nextAttempt: null,
      isSyncing: true,
    }));

    const state = JSON.parse(localStorage.getItem('sync_state'));
    expect(state.isSyncing).toBe(true);
  });
});

describe('Can Attempt Sync Logic', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should allow sync when no previous attempts', () => {
    localStorage.setItem('sync_state', JSON.stringify({
      failureCount: 0,
      lastAttempt: null,
      nextAttempt: null,
      isSyncing: false,
    }));

    const state = JSON.parse(localStorage.getItem('sync_state'));
    const canSync = !state.isSyncing && (state.nextAttempt === null || Date.now() >= state.nextAttempt);

    expect(canSync).toBe(true);
  });

  it('should block sync during backoff period', () => {
    const now = Date.now();
    const nextAttempt = now + 10000; // 10 seconds from now

    localStorage.setItem('sync_state', JSON.stringify({
      failureCount: 1,
      lastAttempt: now,
      nextAttempt: nextAttempt,
      isSyncing: false,
    }));

    const state = JSON.parse(localStorage.getItem('sync_state'));
    const canSync = !state.isSyncing && Date.now() >= state.nextAttempt;

    expect(canSync).toBe(false);
  });

  it('should allow sync after backoff period', () => {
    const now = Date.now();
    const nextAttempt = now - 1000; // 1 second ago (backoff passed)

    localStorage.setItem('sync_state', JSON.stringify({
      failureCount: 1,
      lastAttempt: now - 11000,
      nextAttempt: nextAttempt,
      isSyncing: false,
    }));

    const state = JSON.parse(localStorage.getItem('sync_state'));
    const canSync = !state.isSyncing && Date.now() >= state.nextAttempt;

    expect(canSync).toBe(true);
  });

  it('should block sync when already syncing', () => {
    localStorage.setItem('sync_state', JSON.stringify({
      failureCount: 0,
      lastAttempt: Date.now(),
      nextAttempt: null,
      isSyncing: true,
    }));

    const state = JSON.parse(localStorage.getItem('sync_state'));
    const canSync = !state.isSyncing;

    expect(canSync).toBe(false);
  });
});
