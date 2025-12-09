import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const hash = (value) => createHash('sha256').update(value).digest('hex');

test.describe('Authentication Flow', () => {
test.beforeEach(async ({ page }) => {
  // Mock registration status endpoint to allow registration
  await page.route('**/auth/registration-settings*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        can_register: true,
        registration_open: true,
        invite_required: false,
        mode: 'public'
      }),
    });
  });

  // Clear any existing auth state from a known public route
  await page.goto(`${BASE_URL}/login`);
  await page.evaluate(() => localStorage.clear());
});

  test('should display login page with proper styling', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Check form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Sign In');
  });

  test('should display register page with proper styling', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    // Check form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Create Account');
  });

  test('should validate email on blur', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    const emailInput = page.locator('input[type="email"]');

    // Enter invalid email
    await emailInput.fill('invalid-email');
    await emailInput.blur();

    // Check for error message
    await expect(page.locator('text=Invalid email format')).toBeVisible();
  });

  test('should validate password requirements on register', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]').first();
    const confirmPasswordInput = page.locator('input[type="password"]').last();

    // Fill email
    await emailInput.fill('test@example.com');

    // Try weak password
    await passwordInput.fill('weak');
    await passwordInput.blur();

    // Should show error
    await expect(page.locator('text=/Password must be at least 12 characters/')).toBeVisible();
  });

  test('should show password strength indicator', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const passwordInput = page.locator('input[type="password"]').first();

    // Type a weak password
    await passwordInput.fill('Pass123!');

    // Password strength indicator should appear
    await expect(page.locator('text=Password Strength')).toBeVisible();

    // Type a strong password
    await passwordInput.fill('SuperSecure123!@#Password');

    // Should show higher strength
    await expect(page.locator('text=Password Strength')).toBeVisible();
  });

  test('should validate password match on register', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]').first();
    const confirmPasswordInput = page.locator('input[type="password"]').last();
    const submitButton = page.locator('button[type="submit"]');

    await emailInput.fill('test@example.com');
    await passwordInput.fill('ValidPass123!@#');
    await confirmPasswordInput.fill('DifferentPass123!@#');

    await submitButton.click();

    // Should show error
    await expect(page.locator('text=/Passwords do not match/')).toBeVisible();
  });

  test('should enforce client-side rate limiting on login', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    // Try to submit 6 times rapidly
    for (let i = 0; i < 6; i++) {
      await emailInput.fill('test@example.com');
      await passwordInput.fill('password123');
      await submitButton.click();
      await page.waitForTimeout(100);
    }

    // Should show rate limit error
    await expect(page.locator('text=/Too many login attempts/')).toBeVisible();
  });

  test('sends hashed credentials when submitting login', async ({ page }) => {
    await page.route('**/auth/login', async route => {
      const payload = route.request().postDataJSON();
      expect(payload.hashed_email).toBeDefined();
      expect(payload.hashed_password).toBeDefined();
      expect(payload.email).toBeUndefined();
      expect(payload.password).toBeUndefined();
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid email or password' }),
      });
    });

    await page.goto(`${BASE_URL}/login`);
    await page.locator('input[type="email"]').fill('audit@example.com');
    await page.locator('input[type="password"]').fill('SuperSecure123!@#');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('.neumorphic-inset.bg-red-50').first()).toBeVisible();
  });

  test('session reconfirm uses hashed password by default', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Wait for session timeout handler to be ready
    await page.waitForFunction(() => window.__quoteflowSessionTest !== undefined, { timeout: 5000 });

    await page.route('**/auth/reconfirm', async (route) => {
      const payload = route.request().postDataJSON();
      expect(payload.hashed_password).toBe(hash('MySecret123!'));
      expect(payload.password).toBeUndefined();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'new-token' }),
      });
    });

    await page.evaluate(() => {
      window.__quoteflowSessionTest.trigger({ attemptedRoute: '/quotes', reason: 'session_expired' });
    });

    const modalHeading = page.locator('h2:has-text("Session Timed Out")');
    await page.getByPlaceholder('Enter your password').fill('MySecret123!');
    await page.getByRole('button',{name: /Confirm/i}).click();
    await expect(modalHeading).toHaveCount(0);
    await page.unroute('**/auth/reconfirm');
  });

  test('session reconfirm falls back for legacy credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    let callCount = 0;

    // Wait for session timeout handler to be ready
    await page.waitForFunction(() => window.__quoteflowSessionTest !== undefined, { timeout: 5000 });

    await page.route('**/auth/reconfirm', async (route) => {
      callCount += 1;
      const payload = route.request().postDataJSON();
      if (callCount === 1) {
        expect(payload.hashed_password).toBe(hash('LegacyPass!@#'));
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'legacy_credentials', upgrade_required: true }),
        });
      } else {
        expect(payload.password).toBe('LegacyPass!@#');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ token: 'upgraded-token' }),
        });
      }
    });

    await page.evaluate(() => {
      window.__quoteflowSessionTest.trigger({ attemptedRoute: '/settings' });
    });

    const modalHeading = page.locator('h2:has-text("Session Timed Out")');
    await page.getByPlaceholder('Enter your password').fill('LegacyPass!@#');
    await page.getByRole('button', { name: /Confirm/i }).click();
    await expect(modalHeading).toHaveCount(0);
    await page.unroute('**/auth/reconfirm');
  });

  test('should prevent submission with disposable email', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]').first();
    const confirmPasswordInput = page.locator('input[type="password"]').last();

    await emailInput.fill('test@tempmail.com');
    await emailInput.blur();

    // Should show error about disposable email
    await expect(page.locator('text=/Disposable email addresses are not allowed/')).toBeVisible();
  });

  test('should reject common weak password patterns', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]');

    // Try password with common pattern
    await passwordInput.fill('Password123!');
    await passwordInput.blur();

    // Should show error
    await expect(page.locator('text=/Password contains common weak patterns/')).toBeVisible();
  });

  test('should show validation errors before making API call', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Monitor network requests
    let apiCallMade = false;
    page.on('request', request => {
      if (request.url().includes('/auth/login')) {
        apiCallMade = true;
      }
    });

    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');

    // Submit with invalid email
    await emailInput.fill('invalid-email');
    await submitButton.click();

    // Wait a bit to see if API call is made
    await page.waitForTimeout(500);

    // Should not make API call
    expect(apiCallMade).toBe(false);

    // Should show validation error
    await expect(page.locator('text=/Invalid email/')).toBeVisible();
  });

  test('should navigate between login and register pages', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Click register link
    await page.locator('text=Register account').click();

    // Should be on register page
    await expect(page).toHaveURL(/\/register/);
    await expect(page.locator('h1')).toContainText('Create Account');

    // Click sign in link
    await page.locator('text=Sign in').click();

    // Should be back on login page
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('h1')).toContainText('Login');
  });

  test('should have consistent styling between login and register', async ({ page }) => {
    // Check login page
    await page.goto(`${BASE_URL}/login`);
    const loginBg = await page.locator('body > div').first().evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );

    // Check register page
    await page.goto(`${BASE_URL}/register`);
    const registerBg = await page.locator('body > div').first().evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );

    // Both should use neumorphic #e0e0e0 background
    expect(loginBg).toBe(registerBg);
  });

  test('should clear validation errors when user types', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    const emailInput = page.locator('input[type="email"]');

    // Trigger validation error
    await emailInput.fill('invalid');
    await emailInput.blur();
    await expect(page.locator('text=/Invalid email/')).toBeVisible();

    // Start typing again
    await emailInput.fill('invalid@');

    // Error should be cleared
    await expect(page.locator('text=/Invalid email/')).not.toBeVisible();
  });

  test('should trim and normalize email addresses', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    const emailInput = page.locator('input[type="email"]');

    // Enter email with spaces and mixed case
    await emailInput.fill('  Test@Example.COM  ');

    // The validation should normalize it
    await emailInput.blur();

    // Should not show validation error (email is valid after normalization)
    await expect(page.locator('p.text-red-500')).not.toBeVisible();
  });

  test('should enforce maxLength on inputs', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]').first();

    // Email should have maxLength=254
    const emailMaxLength = await emailInput.getAttribute('maxlength');
    expect(emailMaxLength).toBe('254');

    // Password should have maxLength=128
    const passwordMaxLength = await passwordInput.getAttribute('maxlength');
    expect(passwordMaxLength).toBe('128');
  });

  test('should have proper autocomplete attributes', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    // Email should have autocomplete="email"
    const emailAutocomplete = await emailInput.getAttribute('autocomplete');
    expect(emailAutocomplete).toBe('email');

    // Password should have autocomplete="current-password"
    const passwordAutocomplete = await passwordInput.getAttribute('autocomplete');
    expect(passwordAutocomplete).toBe('current-password');
  });
});

test.describe('Authentication Integration', () => {
  // These tests require a running backend
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8081';

  test('should successfully register a new user', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `test-${timestamp}@example.com`;
    const testPassword = 'TestPassword123!@#';
    const hashedEmail = hash(testEmail);
    const hashedPassword = hash(testPassword);

    // Mock registration endpoint
    await page.route('**/auth/register', async (route) => {
      const payload = route.request().postDataJSON();
      // Verify the registration payload has hashed credentials
      expect(payload.hashed_email).toBe(hashedEmail);
      expect(payload.hashed_password).toBe(hashedPassword);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'new-user-token-123',
          user: {
            id: timestamp,
            email: testEmail,
            name: 'New Test User',
            roles: ['user']
          },
          claims: {
            sub: timestamp,
            email: testEmail,
            roles: ['user']
          }
        }),
      });
    });

    await page.goto(`${BASE_URL}/register`);

    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').first().fill(testPassword);
    await page.locator('input[type="password"]').last().fill(testPassword);
    await page.getByRole('button', { name: /Create Account/i }).click();

    // Should redirect to dashboard after successful registration
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });

    // Verify token was stored
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(token).toBe('new-user-token-123');

    // Cleanup
    await page.unroute('**/auth/register');
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    // First register a user
    const timestamp = Date.now();
    const testEmail = `login-test-${timestamp}@example.com`;
    const testPassword = 'TestPassword123!@#';
    const hashedEmail = hash(testEmail);
    const hashedPassword = hash(testPassword);

    // Mock registration endpoint
    await page.route('**/auth/register', async (route) => {
      const payload = route.request().postDataJSON();
      // Verify the registration payload has hashed credentials
      expect(payload.hashed_email).toBe(hashedEmail);
      expect(payload.hashed_password).toBe(hashedPassword);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'register-token-123',
          user: {
            id: timestamp,
            email: testEmail,
            name: 'Test User',
            roles: ['user']
          },
          claims: {
            sub: timestamp,
            email: testEmail,
            roles: ['user']
          }
        }),
      });
    });

    // Register
    await page.goto(`${BASE_URL}/register`);
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').first().fill(testPassword);
    await page.locator('input[type="password"]').last().fill(testPassword);
    await page.getByRole('button', { name: /Create Account/i }).click();

    // Wait for redirect to dashboard after registration
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });

    // Verify registration token was stored
    let token = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(token).toBe('register-token-123');

    // Logout by clearing storage
    await page.evaluate(() => localStorage.clear());

    // Mock login endpoint
    await page.route('**/auth/login', async (route) => {
      const payload = route.request().postDataJSON();
      // Verify the login payload has hashed credentials
      expect(payload.hashed_email).toBe(hashedEmail);
      expect(payload.hashed_password).toBe(hashedPassword);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'login-token-456',
          user: {
            id: timestamp,
            email: testEmail,
            name: 'Test User',
            roles: ['user']
          },
          claims: {
            sub: timestamp,
            email: testEmail,
            roles: ['user']
          }
        }),
      });
    });

    // Now login
    await page.goto(`${BASE_URL}/login`);
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.getByRole('button', { name: /Sign In/i }).click();

    // Should redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });

    // Should have auth token
    token = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(token).toBe('login-token-456');

    // Cleanup routes
    await page.unroute('**/auth/register');
    await page.unroute('**/auth/login');
  });

  test('should reject login with invalid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    await page.locator('input[type="email"]').fill('nonexistent@example.com');
    await page.locator('input[type="password"]').fill('WrongPassword123!');
    await page.locator('button[type="submit"]').click();

    // Should show error message
    await expect(page.locator('.neumorphic-inset.bg-red-50').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/Invalid email or password|Login failed/')).toBeVisible();
  });
});

test.describe('Password Reset Flow', () => {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8081';

  test.beforeEach(async ({ page }) => {
    // Mock registration status endpoint to allow registration
    await page.route('**/auth/registration-settings*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          can_register: true,
          registration_open: true,
          invite_required: false,
          mode: 'public'
        }),
      });
    });

    await page.goto(`${BASE_URL}/login`);
    await page.evaluate(() => localStorage.clear());
  });

  test('should display forgot password page', async ({ page }) => {
    await page.goto(`${BASE_URL}/forgot-password`);

    // Check page structure
    await expect(page.locator('h1')).toContainText('Forgot Password');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText(/Request Password Reset/);
  });

  test('should navigate to forgot password from login page', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    await page.locator('text=Forgot Password?').click();

    await expect(page).toHaveURL(/\/forgot-password/);
    await expect(page.locator('h1')).toContainText('Forgot Password');
  });

  test('should display reset password page', async ({ page }) => {
    await page.goto(`${BASE_URL}/reset-password`);

    // Check page structure
    await expect(page.locator('h1')).toContainText('Reset Password');
    await expect(page.locator('input[type="text"]')).toBeVisible(); // Reset token input
    await expect(page.locator('input[type="password"]').first()).toBeVisible(); // New password
    await expect(page.locator('input[type="password"]').last()).toBeVisible(); // Confirm password
    await expect(page.locator('button[type="submit"]')).toContainText(/Reset Password/);
  });

  test('should validate email on forgot password page', async ({ page }) => {
    await page.goto(`${BASE_URL}/forgot-password`);

    const emailInput = page.locator('input[type="email"]');

    // Enter invalid email
    await emailInput.fill('invalid-email');
    await emailInput.blur();

    // Check for error message
    await expect(page.locator('text=Invalid email format')).toBeVisible();
  });

  test('should submit forgot password request', async ({ page }) => {
    await page.goto(`${BASE_URL}/forgot-password`);

    const testEmail = 'reset-test@example.com';

    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('button[type="submit"]').click();

    // Should show success message
    await expect(page.locator('.neumorphic-inset.bg-green-50')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/Password reset request created|request ID/i')).toBeVisible();
  });

  test('should validate password requirements on reset password page', async ({ page }) => {
    await page.goto(`${BASE_URL}/reset-password`);

    const tokenInput = page.locator('input[type="text"]');
    const passwordInput = page.locator('input[type="password"]').first();
    const confirmInput = page.locator('input[type="password"]').last();

    // Fill token
    await tokenInput.fill('dummy-token-123');

    // Try weak password
    await passwordInput.fill('weak');
    await passwordInput.blur();

    // Should show error
    await expect(page.locator('text=/Password must be at least 8 characters/')).toBeVisible();
  });

  test('should validate password confirmation match', async ({ page }) => {
    await page.goto(`${BASE_URL}/reset-password`);

    const tokenInput = page.locator('input[type="text"]');
    const passwordInput = page.locator('input[type="password"]').first();
    const confirmInput = page.locator('input[type="password"]').last();
    const submitButton = page.locator('button[type="submit"]');

    await tokenInput.fill('dummy-token-123');
    await passwordInput.fill('ValidPass123!@#');
    await confirmInput.fill('DifferentPass123!@#');

    await submitButton.click();

    // Should show error
    await expect(page.locator('text=/Passwords do not match/')).toBeVisible();
  });

  test('should handle invalid reset token', async ({ page }) => {
    await page.goto(`${BASE_URL}/reset-password`);

    await page.locator('input[type="text"]').fill('invalid-token-12345');
    await page.locator('input[type="password"]').first().fill('NewPassword123!@#');
    await page.locator('input[type="password"]').last().fill('NewPassword123!@#');
    await page.locator('button[type="submit"]').click();

    // Should show error message - be more specific to avoid multiple matches
    const errorBox = page.locator('.neumorphic-inset.bg-red-50.text-red-500');
    await expect(errorBox).toBeVisible({ timeout: 10000 });
    await expect(errorBox).toContainText(/Invalid.*reset.*token|token.*invalid|not.*found/i);
  });

  test('should navigate between password reset pages', async ({ page }) => {
    await page.goto(`${BASE_URL}/forgot-password`);

    // Click "Have a reset token?" link
    await page.locator('text=Have a reset token?').click();

    // Should be on reset password page
    await expect(page).toHaveURL(/\/reset-password/);

    // Click "Request New Reset" link
    await page.locator('text=Request New Reset').click();

    // Should be back on forgot password page
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test('should navigate back to login from password reset pages', async ({ page }) => {
    // From forgot password
    await page.goto(`${BASE_URL}/forgot-password`);
    await page.locator('text=Back to Login').first().click();
    await expect(page).toHaveURL(/\/login/);

    // From reset password
    await page.goto(`${BASE_URL}/reset-password`);
    await page.locator('text=Back to Login').first().click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('should pre-fill token from URL query parameter', async ({ page }) => {
    const testToken = 'test-token-from-url';
    await page.goto(`${BASE_URL}/reset-password?token=${testToken}`);

    // Token input should be pre-filled
    const tokenInput = page.locator('input[type="text"]');
    await expect(tokenInput).toHaveValue(testToken);
  });

  test('should show request ID after submitting forgot password', async ({ page }) => {
    await page.goto(`${BASE_URL}/forgot-password`);

    await page.locator('input[type="email"]').fill('user@example.com');
    await page.locator('button[type="submit"]').click();

    // Should show success with request ID
    await expect(page.locator('.neumorphic-inset.bg-green-50')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('code')).toBeVisible(); // Request ID in code block
  });
});
