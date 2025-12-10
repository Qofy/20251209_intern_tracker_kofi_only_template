<script>
  import { LogOut } from 'lucide-svelte';
  import { userStore } from '../../stores/userStore';
  import { goto } from '@roxi/routify';

  function handleLogout() {
    userStore.logout();
    $goto('/login');
  }
</script>

<button
  on:click={handleLogout}
  class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-gray-700 hover:bg-red-50 hover:text-red-600 w-full"
>
  <LogOut class="w-5 h-5" />
  <span class="font-medium text-sm">Logout</span>
</button>
