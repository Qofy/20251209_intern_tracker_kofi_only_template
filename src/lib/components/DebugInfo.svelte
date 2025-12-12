<script>
  import { userStore } from '../../stores/userStore';
  // import { dev } from '$app/environment';

  $: user = $userStore.user;
  $: selectedStudent = $userStore.selectedStudent;
  $: myStudents = $userStore.myStudents;
  $: isLoading = $userStore.isLoading;

  async function handleQuickFix() {
    try {
      await userStore.login('student@example.com', 'student123');
      await userStore.loadUserAndRole();
    } catch (error) {
      console.error('Quick fix failed:', error);
    }
  }

  // Check if we're in development mode
  const isDev = import.meta.env.DEV;
</script>

{#if isDev}
  <div class="fixed bottom-4 left-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-sm z-50">
    <h4 class="font-bold mb-2">Debug Info:</h4>
    <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
    <div>User: {user ? user.email : 'None'}</div>
    <div>Role: {user ? user.role : 'None'}</div>
    <div>Students: {myStudents?.length || 0}</div>
    <div>Selected: {selectedStudent ? selectedStudent.full_name : 'None'}</div>
    <div>Token: {typeof window !== 'undefined' && localStorage.getItem('auth_token') ? 'Present' : 'None'}</div>
    {#if !user && typeof window !== 'undefined' && localStorage.getItem('auth_token')}
      <button
        on:click={handleQuickFix}
        class="mt-2 bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
      >
        Quick Fix
      </button>
    {/if}
  </div>
{/if}
