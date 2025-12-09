<script>
  import { onMount } from 'svelte';
  import { goto } from '@roxi/routify';
  import { userStore } from '../stores/userStore';

  onMount(async () => {
    // Wait a moment for the store to initialize
    await new Promise(resolve => setTimeout(resolve, 100));

    if ($userStore.user) {
      $goto('/dashboard');
    } else {
      $goto('/login');
    }
  });
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
  <div class="text-white text-xl">Loading...</div>
</div>
