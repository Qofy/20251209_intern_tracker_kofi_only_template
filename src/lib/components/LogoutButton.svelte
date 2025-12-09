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
  class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-white/80 hover:bg-red-500/20 hover:text-red-300 w-full"
>
  <LogOut class="w-5 h-5" />
  <span class="font-medium">Logout</span>
</button>
