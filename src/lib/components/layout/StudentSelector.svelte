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
    <div class="p-3 bg-gray-50 rounded-lg border border-gray-200">
      <p class="text-gray-500 text-xs text-center">
        {$isAdmin ? 'No students in system' : 'No students assigned'}
      </p>
    </div>
  {:else}
    <div>
      <div class="flex items-center gap-2 mb-2">
        {#if $isAdmin}
          <Crown class="w-4 h-4 text-amber-600" />
        {:else}
          <Users class="w-4 h-4 text-gray-600" />
        {/if}
        <span class="text-gray-700 text-xs font-semibold">
          {$isAdmin ? 'Admin View' : 'Select Student'}
        </span>
      </div>

      <div class="relative">
        <select
          value={selectedStudent?.id || ''}
          on:change={handleChange}
          class="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="" disabled>Choose a student...</option>
          {#each studentsToShow as student (student.id)}
            <option value={student.id}>
              {student.full_name}
            </option>
          {/each}
        </select>
        <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronsUpDown class="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {#if $isAdmin && selectedStudent}
        <div class="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
          <p class="text-amber-700 text-xs font-medium">
            Viewing as: {selectedStudent.full_name}
          </p>
        </div>
      {/if}
    </div>
  {/if}
{/if}
