<script>
  import { userStore, isMentor, isAdmin } from '../../../stores/userStore';
  import { Users, User, Crown, ChevronsUpDown } from 'lucide-svelte';

  $: studentsToShow = $isAdmin ? $userStore.allStudents : $userStore.myStudents;
  $: selectedStudent = $userStore.selectedStudent;

  function handleChange(event) {
    const student = studentsToShow.find(s => s.id === event.target.value);
    userStore.setSelectedStudent(student);
  }
</script>

{#if ($isMentor || $isAdmin)}
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <User class="w-4 h-4 text-white/80" />
        <span class="text-white/80 text-xs font-medium">
          Student Management
        </span>
      </div>
      <button class="text-white/60 hover:text-white text-xs">+ Add</button>
    </div>

    {#if !studentsToShow || studentsToShow.length === 0}
      <div class="p-3 bg-white/10 rounded-lg border border-white/20 backdrop-blur-sm">
        <div class="flex flex-col items-center gap-2">
          <User class="w-8 h-8 text-white/40" />
          <p class="text-white/60 text-xs text-center">
            No students assigned
          </p>
          <button class="mt-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors">
            Create Contract
          </button>
        </div>
      </div>
    {:else}
      <div>
        <button class="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors">
          Create Contract
        </button>
      </div>
    {/if}
  </div>
{/if}
