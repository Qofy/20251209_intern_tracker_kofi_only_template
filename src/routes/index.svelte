<script>
  import { onMount } from 'svelte';
  import { goto } from '@roxi/routify';
  import { userStore } from '../stores/userStore';

  onMount(async () => {
    // Check if already logged in
    const token = localStorage.getItem('auth_token');
    const offlineRole = localStorage.getItem('offline_role');

    if (token || offlineRole) {
      // User is logged in, go to dashboard
      goto('/dashboard');
    } else {
      // No auth, go to login
      goto('/login');
    }
  });
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-100">
  <div class="text-center">
    <div class="w-16 h-16 mx-auto mb-4 rounded-lg flex items-center justify-center shadow-lg animate-pulse" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
      <svg class="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
    <div class="text-gray-700 text-xl font-semibold">Loading...</div>
  </div>
</div>
