<script context="module">
    /** @type {RoutifyLoad} */
    const load = () => {
        return {
            redirect: '/login',
        }
    }

    export { load }
</script>

<script>
  import { onMount } from 'svelte';
  // import { goto } from '@roxi/routify';
// import {Router,activeRoute} from '@roxi/routify';
  onMount(() => {
    // $activeRoute.router.name = 'login';
  });
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
  <div class="text-center">
    <div class="w-16 h-16 mx-auto mb-4 rounded-lg flex items-center justify-center shadow-lg animate-pulse bg-gradient-to-br from-orange-400 to-orange-500">
      <svg class="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
    <div class="text-white text-xl font-semibold">Redirecting to dashboard...</div>
  </div>
</div>
