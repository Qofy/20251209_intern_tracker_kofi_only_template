import { expect } from '@playwright/test';

/**
 * Wait for the page to be fully loaded and ready
 */
export async function waitForPageLoad(page) {
  // Avoid waiting for networkidle because app may poll APIs when backend is offline
  await page.waitForLoadState('domcontentloaded');
  // Give a brief settle time for React render
  await page.waitForTimeout(150);
}

/**
 * Check if a page has loaded without errors
 */
export async function checkPageLoaded(page, expectedTitle) {
  // Wait for page to load
  await waitForPageLoad(page);

  // Check for console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Check page title if provided
  if (expectedTitle) {
    const title = await page.title();
    expect(title).toContain(expectedTitle);
  }

  // Ensure no critical errors on page
  const errorElement = await page.$('.error-boundary, .error-message, #error');
  expect(errorElement).toBeNull();

  return consoleErrors;
}

/**
 * Check if navigation menu is present and functional
 */
export async function checkNavigationMenu(page) {
  // Check for common navigation elements
  const navElement = await page.$('nav, .navigation, .sidebar, aside');
  expect(navElement).not.toBeNull();
}

/**
 * Navigate using the app's navigation menu
 */
export async function navigateViaMenu(page, linkText) {
  // Try different navigation patterns
  const selectors = [
    `nav a:has-text("${linkText}")`,
    `.sidebar a:has-text("${linkText}")`,
    `.navigation a:has-text("${linkText}")`,
    `aside a:has-text("${linkText}")`,
    `a:has-text("${linkText}")`
  ];

  for (const selector of selectors) {
    const element = await page.$(selector);
    if (element) {
      await element.click();
      await waitForPageLoad(page);
      return true;
    }
  }

  throw new Error(`Could not find navigation link with text: ${linkText}`);
}

/**
 * Check if a specific element or component is visible
 */
export async function checkElementVisible(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check for common page elements that indicate successful load
 */
export async function checkCommonElements(page) {
  // Check for header/nav
  const hasHeader = await checkElementVisible(page, 'header, nav, .header, .navbar');

  // Check for main content area
  const hasMain = await checkElementVisible(page, 'main, .main, .content, #root');

  // Check for footer (optional)
  const hasFooter = await checkElementVisible(page, 'footer, .footer');

  return {
    hasHeader,
    hasMain,
    hasFooter
  };
}

/**
 * Test data helpers
 */
export const testData = {
  customer: {
    name: 'Test Customer E2E',
    email: 'test@e2e.com',
    phone: '123-456-7890',
    address: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'TC',
      zip: '12345',
      country: 'Test Country'
    }
  },
  quote: {
    title: 'Test Quote E2E',
    description: 'E2E test quote description',
    amount: 1000.00,
    status: 'draft'
  },
  invoice: {
    title: 'Test Invoice E2E',
    description: 'E2E test invoice description',
    amount: 500.00,
    status: 'pending'
  },
  certificate: {
    title: 'Test Certificate E2E',
    description: 'E2E test certificate description',
    recipient: 'Test Recipient',
    issueDate: new Date().toISOString().split('T')[0]
  }
};

/**
 * Fill a form field with retry logic
 */
export async function fillField(page, selector, value, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.fill(selector, value);
      return;
    } catch (error) {
      if (i === retries - 1) throw error;
      await page.waitForTimeout(1000);
    }
  }
}

/**
 * Click a button with retry logic
 */
export async function clickButton(page, selector, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.click(selector);
      return;
    } catch (error) {
      if (i === retries - 1) throw error;
      await page.waitForTimeout(1000);
    }
  }
}

/**
 * Wait for API response
 */
export async function waitForAPIResponse(page, urlPattern, timeout = 10000) {
  return page.waitForResponse(
    response => response.url().includes(urlPattern) && response.status() === 200,
    { timeout }
  );
}