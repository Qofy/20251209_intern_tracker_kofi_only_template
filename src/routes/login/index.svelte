<script>
  import { userStore } from '../../stores/userStore';
  import { goto } from '@roxi/routify';

  let email = '';
  let password = '';
  let isLoading = false;
  let error = '';
  let showSignup = false;
  let signupData = { email: '', password: '', full_name: '', role: 'student' };

  const offlineMode = import.meta.env.VITE_OFFLINE_MODE === 'true';

  async function handleSubmit(e) {
    e.preventDefault();
    isLoading = true;
    error = '';

    try {
      console.log('Login: Starting login...');
      await userStore.login(email, password);
      console.log('Login: Login complete, loading user...');
      await userStore.loadUserAndRole();
      console.log('Login: User loaded, user store:', $userStore);

      // Use window.location for navigation to force a full page load
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Login error:', err);
      error = err.message || 'Login failed';
    } finally {
      isLoading = false;
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    isLoading = true;
    error = '';

    try {
      await userStore.register(signupData);
      showSignup = false;
      await userStore.loadUserAndRole();
      $goto('/dashboard');
    } catch (err) {
      error = err.message || 'Registration failed';
    } finally {
      isLoading = false;
    }
  }

  function quickLogin(userType) {
    const credentials = {
      admin: { email: 'admin@example.com', password: 'admin123' },
      mentor: { email: 'mentor@example.com', password: 'mentor123' },
      student: { email: 'student@example.com', password: 'student123' }
    };

    const cred = credentials[userType];
    email = cred.email;
    password = cred.password;
  }
</script>

<div class="min-h-screen flex items-center justify-center" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
  {#if offlineMode}
    <div class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div class="bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/30 text-yellow-100 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <span>Offline Mode - Using Mock Data</span>
      </div>
    </div>
  {/if}

  <div class="bg-white rounded-2xl shadow-2xl p-12 w-full max-w-md">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
      <p class="text-gray-600">Sign in to your account</p>
      {#if offlineMode}
        <p class="text-yellow-600 text-xs mt-2">Demo Mode - No Backend Required</p>
      {/if}
    </div>

    <form on:submit={handleSubmit} class="space-y-6">
      <div>
        <label class="block text-gray-700 text-sm font-semibold mb-2">
          Email
        </label>
        <input
          type="email"
          bind:value={email}
          class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
          placeholder="Enter your email"
          required
        />
      </div>

      <div>
        <label class="block text-gray-700 text-sm font-semibold mb-2">
          Password
        </label>
        <input
          type="password"
          bind:value={password}
          class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
          placeholder="Enter your password"
          required
        />
      </div>

      <div class="flex items-center justify-between">
        <label class="flex items-center">
          <input type="checkbox" class="mr-2 w-4 h-4 text-purple-600">
          <span class="text-sm text-gray-600">Remember me</span>
        </label>
        <a href="#" class="text-sm text-purple-600 hover:text-purple-800 font-medium">Forgot password?</a>
      </div>

      {#if error}
        <div class="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg text-center">
          {error}
        </div>
      {/if}

      <button
        type="submit"
        disabled={isLoading}
        class="w-full text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>

    <div class="mt-6 text-center">
      <p class="text-gray-600 text-sm">
        Don't have an account?{' '}
        <button
          on:click={() => showSignup = true}
          class="text-purple-600 hover:text-purple-800 font-semibold"
        >
          Sign up
        </button>
      </p>
    </div>

    <div class="mt-6 pt-6 border-t border-gray-200">
      <p class="text-gray-500 text-sm text-center mb-4">Quick Login (Demo)</p>
      <div class="grid grid-cols-3 gap-2">
        <button
          type="button"
          on:click={() => quickLogin('admin')}
          class="bg-red-100 text-red-600 px-3 py-2 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors"
        >
          Admin
        </button>
        <button
          type="button"
          on:click={() => quickLogin('mentor')}
          class="bg-blue-100 text-blue-600 px-3 py-2 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
        >
          Mentor
        </button>
        <button
          type="button"
          on:click={() => quickLogin('student')}
          class="bg-green-100 text-green-600 px-3 py-2 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors"
        >
          Student
        </button>
      </div>
    </div>
  </div>

  {#if showSignup}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
        <h2 class="text-2xl font-bold text-gray-900 mb-6 text-center">Create Account</h2>

        <form on:submit={handleSignup} class="space-y-4">
          <div>
            <label class="block text-gray-700 text-sm font-semibold mb-2">Full Name</label>
            <input
              type="text"
              bind:value={signupData.full_name}
              class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div>
            <label class="block text-gray-700 text-sm font-semibold mb-2">Email</label>
            <input
              type="email"
              bind:value={signupData.email}
              class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label class="block text-gray-700 text-sm font-semibold mb-2">Password</label>
            <input
              type="password"
              bind:value={signupData.password}
              class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="Enter your password"
              required
            />
          </div>

          <div>
            <label class="block text-gray-700 text-sm font-semibold mb-2">Role</label>
            <select
              bind:value={signupData.role}
              class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
            >
              <option value="student">Student</option>
              <option value="mentor">Mentor</option>
            </select>
          </div>

          {#if error}
            <div class="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg text-center">
              {error}
            </div>
          {/if}

          <div class="flex gap-3 pt-2">
            <button
              type="button"
              on:click={() => showSignup = false}
              class="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg hover:bg-gray-300 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              class="flex-1 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl"
              style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"
            >
              {isLoading ? 'Creating...' : 'Sign Up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>
