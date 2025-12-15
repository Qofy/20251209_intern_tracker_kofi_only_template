<script>
  import { userStore } from '../../stores/userStore';

  let email = '';
  let password = '';
  let isLoading = false;
  let error = '';
  let showSignup = false;
  let signupData = { email: '', password: '', full_name: '', role: 'student' };

  async function handleSubmit() {
    console.log('!!!handleSubmit called with email:', email);
    isLoading = true;
    error = '';

    try {
      await userStore.login(email, password);
      await userStore.loadUserAndRole();
      window.location.href = '/dashboard';
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
      console.log('Registering with data:', { ...signupData, password: '***' });
      await userStore.register(signupData);
      showSignup = false;
      await userStore.loadUserAndRole();
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Registration error:', err);
      error = err.message || 'Registration failed';
    } finally {
      isLoading = false;
    }
  }

  function quickLogin(userType) {
    userStore.setDemoUser(userType);
    window.location.href = '/dashboard';
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
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

      <button type="submit" disabled={isLoading} class="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>

    <div class="mt-6 text-center">
      <p class="text-white/70 text-sm">Don't have an account? <button type="button" on:click={() => showSignup = true} class="text-white font-semibold underline hover:text-white/80">Sign up here</button></p>
    </div>

    <div class="mt-6 pt-6 border-t border-white/20">
      <p class="text-white/60 text-sm text-center mb-4">Quick Login (Demo)</p>
      <div class="grid grid-cols-3 gap-2">
        <button 
          type="button" 
          on:click={() => quickLogin('admin')} 
          class="bg-red-500/30 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-red-500/40 transition-colors border border-white/10"
        >
          Admin
        </button>
        <button 
          type="button" 
          on:click={() => quickLogin('mentor')} 
          class="bg-blue-500/30 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-blue-500/40 transition-colors border border-white/10"
        >
          Mentor
        </button>
        <button 
          type="button" 
          on:click={() => quickLogin('student')} 
          class="bg-green-500/30 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-green-500/40 transition-colors border border-white/10"
        >
          Student
        </button>
      </div>
    </div>
  </div>

  {#if showSignup}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" on:click={() => showSignup = false}>
      <div class="w-full max-w-md mx-4 bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl" on:click|stopPropagation>
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

