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

  async function handleSubmit() {
    isLoading = true;
    error = '';

    try {
      await userStore.login(email, password);
      await userStore.loadUserAndRole();
      $goto('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      error = err.message || 'Login failed';
    } finally {
      isLoading = false;
    }
  }

  async function handleSignup() {
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

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
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

  <div class="w-full max-w-md mx-4 bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-white mb-2">WorkTracker</h1>
      <p class="text-white/70 text-sm">Intern Hours Manager</p>
    </div>

    <form on:submit|preventDefault={handleSubmit} class="space-y-5">
      <div>
        <label class="block text-white text-sm font-medium mb-2">Email</label>
        <input type="email" bind:value={email} class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-white/40 transition-colors text-white placeholder-white/50" placeholder="Enter your email" required />
      </div>

      <div>
        <label class="block text-white text-sm font-medium mb-2">Password</label>
        <input type="password" bind:value={password} class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-white/40 transition-colors text-white placeholder-white/50" placeholder="Enter your password" required />
      </div>

      {#if error}
        <div class="bg-red-500/20 border border-red-400/30 text-red-100 text-sm p-3 rounded-xl text-center">{error}</div>
      {/if}

      <button type="submit" disabled={isLoading} on:click="{handleSignup}" class="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>

    <div class="mt-6 text-center">
      <p class="text-white/70 text-sm">Don't have an account? <button type="button" on:click={() => showSignup = true} class="text-white font-semibold underline hover:text-white/80">Sign up here</button></p>
    </div>

    <div class="mt-6 pt-6 border-t border-white/20">
      <p class="text-white/60 text-sm text-center mb-4">Quick Login (Demo)</p>
      <div class="grid grid-cols-3 gap-2">
        <button type="button" on:click={() => quickLogin('admin')} class="bg-red-500/30 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-red-500/40 transition-colors border border-white/10">Admin</button>
        <button type="button" on:click={() => quickLogin('mentor')} class="bg-blue-500/30 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-blue-500/40 transition-colors border border-white/10">Mentor</button>
        <button type="button" on:click={() => quickLogin('student')} class="bg-green-500/30 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-green-500/40 transition-colors border border-white/10">Student</button>
      </div>
    </div>
  </div>

  {#if showSignup}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div class="w-full max-w-md mx-4 bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
        <h2 class="text-2xl font-bold text-white mb-6 text-center">Create Account</h2>

        <form on:submit|preventDefault={handleSignup} class="space-y-4">
          <div>
            <label class="block text-white text-sm font-medium mb-2">Full Name</label>
            <input type="text" bind:value={signupData.full_name} class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-white/40 transition-colors text-white placeholder-white/50" placeholder="Enter your full name" required />
          </div>

          <div>
            <label class="block text-white text-sm font-medium mb-2">Email</label>
            <input type="email" bind:value={signupData.email} class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-white/40 transition-colors text-white placeholder-white/50" placeholder="Enter your email" required />
          </div>

          <div>
            <label class="block text-white text-sm font-medium mb-2">Password</label>
            <input type="password" bind:value={signupData.password} class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-white/40 transition-colors text-white placeholder-white/50" placeholder="Enter your password" required />
          </div>

          <div>
            <label class="block text-white text-sm font-medium mb-2">Role</label>
            <select bind:value={signupData.role} class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-white/40 transition-colors text-white">
              <option value="student" class="bg-purple-900">Student</option>
              <option value="mentor" class="bg-purple-900">Mentor</option>
            </select>
          </div>

          {#if error}
            <div class="bg-red-500/20 border border-red-400/30 text-red-100 text-sm p-3 rounded-xl text-center">{error}</div>
          {/if}

          <div class="flex gap-3 pt-2">
            <button type="button" on:click={() => showSignup = false} class="flex-1 bg-white/20 text-white font-semibold py-3 px-6 rounded-xl hover:bg-white/30 transition-all duration-200 border border-white/20">Cancel</button>
            <button type="submit" disabled={isLoading} class="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl">{isLoading ? 'Creating...' : 'Sign Up'}</button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>
