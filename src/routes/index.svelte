<script>
  import { onMount } from 'svelte';
  import { goto } from '@roxi/routify';

  onMount(() => {
    $goto('/dashboard');
  });
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
  <div class="text-white text-xl">Redirecting...</div>
</div>
