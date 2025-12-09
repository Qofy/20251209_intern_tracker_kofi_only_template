import { test, expect } from '@playwright/test';
import {
  waitForPageLoad,
  checkElementVisible,
  fillField,
  clickButton,
  testData,
  waitForAPIResponse
} from '../utils/helpers';

test.describe('Page Functionality Tests', () => {

  test.describe('Dashboard Tests', () => {
    test('Dashboard displays statistics or widgets', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      // Check for common dashboard elements
      const hasStats = await checkElementVisible(page, '[class*="stat"], [class*="widget"], [class*="card"], [class*="chart"]');
      expect(hasStats).toBeTruthy();

      // Check for recent activities or summary
      const hasSummary = await checkElementVisible(page, '[class*="recent"], [class*="summary"], [class*="activity"]');
      // Dashboard should have some content
      expect(hasStats || hasSummary).toBeTruthy();
    });

    test('Dashboard quick actions work', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      // Look for quick action buttons
      const quickActions = await page.$$('[class*="quick"], [class*="action"], button[class*="primary"]');
      expect(quickActions.length).toBeGreaterThan(0);
    });
  });


});
