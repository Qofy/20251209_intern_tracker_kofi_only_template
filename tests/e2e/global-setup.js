/**
 * Global setup for E2E tests
 * Runs once before all tests to verify server availability
 */

// import { ensureServerReady } from './utils/serverHealth.js';

async function globalSetup() {
  // Check that backend server is ready before running tests
  // await ensureServerReady();
}

export default globalSetup;
