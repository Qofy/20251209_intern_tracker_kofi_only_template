import { test, expect } from '@playwright/test';
import {
  checkPageLoaded,
  checkCommonElements,
  checkElementVisible,
  waitForPageLoad
} from '../utils/helpers';

test.describe('All Pages Load Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start from home page
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test('Dashboard page loads correctly', async ({ page }) => {
    await page.goto('/dashboard');
    const errors = await checkPageLoaded(page);
    expect(errors).toHaveLength(0);

    // Check for dashboard-specific elements
    const hasDashboard = await checkElementVisible(page, 'h1, h2, .dashboard-title');
    expect(hasDashboard).toBeTruthy();

    // Check common elements
    const elements = await checkCommonElements(page);
    expect(elements.hasMain).toBeTruthy();
  });


  test('Pages handle missing query parameters gracefully', async ({ page }) => {
    // Test pages that might expect IDs
    const pagesWithParams = [
      '/edit-quote',
      '/edit-invoice',
      '/quote-details',
      '/invoice-details'
    ];


  });
});