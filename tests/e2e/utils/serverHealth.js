/**
 * Server health check utility
 * Verifies that the backend API server is running before tests execute
 */

const API_BASE_URL = process.env.VITE_API_BASE || 'http://127.0.0.1:8081/api';
const API_PORT = 8081;
const MAX_RETRIES = 5;
const RETRY_DELAY = 1000; // 1 second

/**
 * Check if the backend server is healthy
 * @returns {Promise<boolean>}
 */
async function isServerHealthy() {
  try {
    // Try to fetch the version endpoint which should be fast and always available
    const response = await fetch(`${API_BASE_URL}/version`, {
      method: 'GET',
      timeout: 5000,
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Wait for server to be ready with retries
 * @throws {Error} If server is not ready after max retries
 */
async function ensureServerReady() {
  console.log(`\n🔍 Checking if backend server is running on port ${API_PORT}...`);
  console.log(`   API Base URL: ${API_BASE_URL}\n`);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const healthy = await isServerHealthy();
      if (healthy) {
        console.log(`✅ Backend server is healthy and ready for testing!\n`);
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }

    if (attempt < MAX_RETRIES) {
      console.log(
        `⏳ Attempt ${attempt}/${MAX_RETRIES}: Server not ready, retrying in ${RETRY_DELAY}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }
  }

  // Server is not running
  const errorMessage = `
❌ BACKEND SERVER NOT FOUND OR NOT RESPONDING

The E2E tests require the backend server to be running.

🚀 To start the backend server, run this command in another terminal:

   cd backend
   cargo run --release

⚙️  The server should listen on:
   - Port: ${API_PORT}
   - URL: http://127.0.0.1:${API_PORT}

📍 Expected API Base URL: ${API_BASE_URL}

⏱️  Once started, the server typically takes 10-30 seconds to initialize.

If you continue to see this error after starting the server:
1. Wait a few seconds for the server to fully start
2. Check that the backend compiled without errors
3. Verify the server is listening on port ${API_PORT}: netstat -tlnp | grep ${API_PORT}
4. Check the backend logs for any errors
`;

  throw new Error(errorMessage);
}

export { ensureServerReady, isServerHealthy };
