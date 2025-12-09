import { defineConfig, devices } from "@playwright/test";
import "dotenv/config";

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
	testDir: "./tests/e2e",
	/* Global setup to verify server is running */
	globalSetup: "./tests/e2e/global-setup.js",
	/* Run tests in files in parallel */
	fullyParallel: true,
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,
	/* Retry on CI only */
	retries: process.env.CI ? 2 : 0,
	/* Opt out of parallel tests on CI. */
	workers: process.env.CI ? 1 : undefined,
	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: [
		["html"],
		["./tests/e2e/reporters/gherkin-reporter.js"],
		["json", { outputFile: "test-results.json" }],
		["junit", { outputFile: "test-results.xml" }],
	],
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		/* Base URL to use in actions like `await page.goto('/')`. */
		baseURL: "http://localhost:5173",
		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: "on-first-retry",
		/* Take screenshots on failure */
		screenshot: "only-on-failure",
		/* Video recording */
		video: "retain-on-failure",
	},

	/* Configure projects for major browsers */
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},

		{
			name: "firefox",
			use: { ...devices["Desktop Firefox"] },
		},

		{
			name: "webkit",
			use: { ...devices["Desktop Safari"] },
		},

		/* Test against mobile viewports. */
		{
			name: "Mobile Chrome",
			use: { ...devices["Pixel 5"] },
		},
		{
			name: "Mobile Safari",
			use: { ...devices["iPhone 12"] },
		},
	],

	/* Run your local dev server before starting the tests */
	webServer: {
		command: "npm run dev",
		url: "http://localhost:5173",
		reuseExistingServer: true,
		timeout: 120 * 1000,
		env: {
			// Use relative paths to leverage Vite proxy and avoid CORS issues
			VITE_API_BASE_URL: "/api",
			VITE_AUTH_BASE: "/auth",
			VITE_ACCESS_TOKEN:
				process.env.VITE_ACCESS_TOKEN || process.env.ACCESS_TOKEN || "",
			VITE_DISABLE_REGISTRATION_STATUS:
				process.env.VITE_DISABLE_REGISTRATION_STATUS || "true",
		},
	},
});
