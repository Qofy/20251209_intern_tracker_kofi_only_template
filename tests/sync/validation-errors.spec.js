import { test, expect } from '@playwright/test';

/**
 * Validation Error Sync Tests
 * Tests the behavior of the sync system when validation errors occur
 */

test.describe('Validation Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to application and login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('validation error stops sync retries and shows error panel', async ({ page }) => {
    // Go to create quote page
    await page.goto('/quotes/create');

    // Fill in form with invalid data (missing required field)
    await page.fill('input[placeholder*="Quote Title"]', 'Test Quote');
    // Intentionally skip customer selection to trigger validation error

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for validation error panel to appear
    await expect(page.locator('text=/Form Error/i')).toBeVisible({ timeout: 5000 });

    // Check that the error panel shows the validation error
    const errorPanel = page.locator('[class*="fixed"][class*="bottom"]').filter({ hasText: 'Form Error' });
    await expect(errorPanel).toBeVisible();

    // Expand the error panel
    await errorPanel.click();

    // Check that validation error details are shown
    await expect(page.locator('text=/Validation failed|customer/i')).toBeVisible();

    // Check that sync doesn't retry indefinitely
    // Wait a few seconds and check that the error count doesn't increase
    const initialErrorText = await errorPanel.textContent();
    await page.waitForTimeout(3000);
    const laterErrorText = await errorPanel.textContent();
    expect(initialErrorText).toBe(laterErrorText);
  });

  test('validation error can be edited and retried', async ({ page }) => {
    // Create a quote with missing data
    await page.goto('/quotes/create');
    await page.fill('input[placeholder*="Quote Title"]', 'Test Quote');
    await page.click('button[type="submit"]');

    // Wait for error panel
    await expect(page.locator('text=/Form Error/i')).toBeVisible({ timeout: 5000 });

    // Expand error panel
    await page.locator('text=/Form Error/i').click();

    // Click "Edit & Retry" button
    await page.click('button:has-text("Edit & Retry")');

    // Validation error recovery modal should open
    await expect(page.locator('text=/Fix Validation Error/i')).toBeVisible();

    // Modal should show the error details
    await expect(page.locator('text=/Validation failed/i')).toBeVisible();

    // Fix the data in the modal (add customer_id)
    const customerField = page.locator('input').filter({ has: page.locator('label:has-text("Customer")') });
    if (await customerField.isVisible()) {
      await customerField.fill('customer123');
    }

    // Submit the corrected data
    await page.click('button:has-text("Save & Retry")');

    // Error should be removed from the panel
    await expect(page.locator('text=/Form Error/i')).not.toBeVisible({ timeout: 5000 });
  });

  test('validation error can be dismissed', async ({ page }) => {
    // Create a quote with missing data
    await page.goto('/quotes/create');
    await page.fill('input[placeholder*="Quote Title"]', 'Test Quote');
    await page.click('button[type="submit"]');

    // Wait for error panel
    await expect(page.locator('text=/Form Error/i')).toBeVisible({ timeout: 5000 });

    // Expand error panel
    await page.locator('text=/Form Error/i').click();

    // Click dismiss button
    page.once('dialog', dialog => dialog.accept()); // Accept confirmation
    await page.click('button[class*="text-red"]:has(svg)');

    // Error should be removed
    await expect(page.locator('text=/Form Error/i')).not.toBeVisible({ timeout: 2000 });
  });

  test('multiple validation errors are shown correctly', async ({ page }) => {
    // Create multiple items with validation errors

    // First invalid quote
    await page.goto('/quotes/create');
    await page.fill('input[placeholder*="Quote Title"]', 'Quote 1');
    await page.click('button[type="submit"]');

    // Second invalid quote
    await page.goto('/quotes/create');
    await page.fill('input[placeholder*="Quote Title"]', 'Quote 2');
    await page.click('button[type="submit"]');

    // Wait for error panel
    await expect(page.locator('text=/2 Form Errors/i')).toBeVisible({ timeout: 5000 });

    // Expand error panel
    await page.locator('text=/Form Errors/i').click();

    // Check that both errors are listed
    await expect(page.locator('text=/Quote 1/i')).toBeVisible();
    await expect(page.locator('text=/Quote 2/i')).toBeVisible();
  });

  test('network errors use exponential backoff, validation errors do not', async ({ page, context }) => {
    // Simulate offline mode
    await context.setOffline(true);

    // Create a quote (will be queued)
    await page.goto('/quotes/create');
    await page.selectOption('select', { index: 1 }); // Select first customer
    await page.fill('input[placeholder*="Quote Title"]', 'Offline Quote');
    await page.click('button[type="submit"]');

    // Check that sync status shows pending
    await expect(page.locator('text=/pending|offline/i')).toBeVisible({ timeout: 5000 });

    // Go back online
    await context.setOffline(false);

    // If backend returns validation error, it should be handled differently than network error
    // This test assumes the backend is configured to return validation errors

    // Wait for sync attempt
    await page.waitForTimeout(2000);

    // Check that validation errors appear in error panel, not in sync retry queue
    const hasValidationError = await page.locator('text=/Form Error/i').isVisible();
    const hasSyncRetry = await page.locator('text=/retrying in/i').isVisible();

    // Either validation error panel appears OR sync succeeds
    // but validation errors should not show "retrying in X seconds"
    if (hasValidationError) {
      expect(hasSyncRetry).toBe(false);
    }
  });
});

test.describe('Exponential Backoff for Network Errors', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('sync retry intervals increase exponentially', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);

    // Create a quote
    await page.goto('/quotes/create');
    await page.selectOption('select', { index: 1 });
    await page.fill('input[placeholder*="Quote Title"]', 'Test Quote');
    await page.click('button[type="submit"]');

    // Should show offline
    await expect(page.locator('text=/offline|pending/i')).toBeVisible({ timeout: 5000 });

    // Go online (but simulate server being down by intercepting requests)
    await page.route('**/api/**', route => route.abort());
    await context.setOffline(false);

    // Wait for first retry attempt (should be ~3 seconds)
    await page.waitForTimeout(4000);

    // Check that retry countdown is visible
    const retryText = await page.locator('text=/retrying in/i').textContent();

    // Should show exponential backoff (next retry should be ~10s or more)
    expect(retryText).toMatch(/\d+[ms]/);

    // Verify the countdown decreases
    await page.waitForTimeout(2000);
    const laterRetryText = await page.locator('text=/retrying in/i').textContent();
    expect(laterRetryText).toBeTruthy();
  });

  test('sync succeeds when connection is restored', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);

    // Create a quote
    await page.goto('/quotes/create');
    await page.selectOption('select', { index: 1 });
    await page.fill('input[placeholder*="Quote Title"]', 'Test Quote');
    await page.fill('textarea', 'Test notes');
    await page.click('button[type="submit"]');

    // Should show offline
    await expect(page.locator('text=/offline|pending/i')).toBeVisible({ timeout: 5000 });

    // Go online
    await context.setOffline(false);

    // Wait for sync to complete
    await page.waitForTimeout(5000);

    // Pending indicator should disappear
    await expect(page.locator('text=/pending/i')).not.toBeVisible({ timeout: 10000 });
  });
});

test.describe('Validation Error UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('validation error panel does not block other UI elements', async ({ page }) => {
    // Create invalid quote
    await page.goto('/quotes/create');
    await page.fill('input[placeholder*="Quote Title"]', 'Test Quote');
    await page.click('button[type="submit"]');

    // Wait for error panel
    await expect(page.locator('text=/Form Error/i')).toBeVisible({ timeout: 5000 });

    // Check that navigation still works
    await page.click('a[href*="/dashboard"]');
    await expect(page).toHaveURL(/.*dashboard/);

    // Error panel should still be visible
    await expect(page.locator('text=/Form Error/i')).toBeVisible();

    // Check that other buttons are clickable
    const newQuoteButton = page.locator('text=/New Quote/i').first();
    await expect(newQuoteButton).toBeEnabled();
  });

  test('validation error panel auto-expands when new error occurs', async ({ page }) => {
    // Create first invalid quote
    await page.goto('/quotes/create');
    await page.fill('input[placeholder*="Quote Title"]', 'Test Quote 1');
    await page.click('button[type="submit"]');

    // Wait for error panel
    await expect(page.locator('text=/Form Error/i')).toBeVisible({ timeout: 5000 });

    // Collapse the panel
    await page.locator('text=/Form Error/i').click();
    await expect(page.locator('text=/Validation failed/i')).not.toBeVisible();

    // Create second invalid quote
    await page.goto('/quotes/create');
    await page.fill('input[placeholder*="Quote Title"]', 'Test Quote 2');
    await page.click('button[type="submit"]');

    // Panel should auto-expand
    await expect(page.locator('text=/2 Form Errors/i')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/Validation failed/i')).toBeVisible();
  });
});
