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
  {#if !studentsToShow || studentsToShow.length === 0}
    <div class="mb-6 p-3 bg-white/5 rounded-xl border border-white/10">
      <p class="text-white/60 text-sm text-center">
        {$isAdmin ? 'No students in system' : 'No students assigned to you'}
      </p>
    </div>
  {:else}
    <div class="mb-6">
      <div class="flex items-center gap-2 mb-3">
        {#if $isAdmin}
          <Crown class="w-4 h-4 text-amber-400" />
        {:else}
          <Users class="w-4 h-4 text-blue-400" />
        {/if}
        <span class="text-white/80 text-sm font-medium">
          {$isAdmin ? 'Impersonate Student (Admin)' : 'Select Student'}
        </span>
      </div>

      <div class="relative">
        <select
          value={selectedStudent?.id || ''}
          on:change={handleChange}
          class="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2 pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-white/30"
        >
          <option value="" disabled>Choose a student...</option>
          {#each studentsToShow as student (student.id)}
            <option value={student.id} class="bg-gray-800">
              {student.full_name} ({student.student_email})
            </option>
          {/each}
        </select>
        <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronsUpDown class="w-4 h-4 text-white/50" />
        </div>
      </div>

      {#if $isAdmin && selectedStudent}
        <div class="mt-2 p-2 bg-amber-500/20 rounded-lg border border-amber-400/30">
          <p class="text-amber-300 text-xs">
            🔄 Viewing as: {selectedStudent.full_name}
          </p>
        </div>
      {/if}
    </div>
  {/if}
{/if}
