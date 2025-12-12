<script>
  import { userStore, isMentor, isAdmin } from '../../../stores/userStore';
  import Select from '$lib/components/ui/select.svelte';
  import SelectContent from '$lib/components/ui/SelectContent.svelte';
  import SelectItem from '$lib/components/ui/SelectItem.svelte';
  import SelectTrigger from '$lib/components/ui/SelectTrigger.svelte';
  import SelectValue from '$lib/components/ui/SelectValue.svelte';
  import { Users, User, Crown } from 'lucide-svelte';

  $: studentsToShow = $isAdmin ? $userStore.allStudents : $userStore.myStudents;
  $: selectedStudent = $userStore.selectedStudent;

  function handleChange(value) {
    const student = studentsToShow.find(s => s.id === value);
    userStore.setSelectedStudent(student);
  }
</script>

{#if $isMentor || $isAdmin}
  <div class="mb-6">
    {#if !studentsToShow || studentsToShow.length === 0}
      <div class="mb-6 p-3 bg-white/5 rounded-xl border border-white/10">
        <p class="text-white/60 text-sm text-center">
          {$isAdmin ? 'No students in system' : 'No students assigned to you'}
        </p>
      </div>
    {:else}
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

      <Select
        value={selectedStudent?.id || ''}
        onValueChange={handleChange}
      >
        <SelectTrigger className="bg-white/10 border-white/20 text-white">
          <SelectValue placeholder="Choose a student..." />
        </SelectTrigger>
        <SelectContent>
          {#each studentsToShow as student}
            <SelectItem value={student.id}>
              <div class="flex items-center gap-2">
                <User class="w-4 h-4" />
                <span>{student.full_name}</span>
                <span class="text-xs text-gray-500">({student.student_email})</span>
              </div>
            </SelectItem>
          {/each}
        </SelectContent>
      </Select>

      {#if $isAdmin && selectedStudent}
        <div class="mt-2 p-2 bg-amber-500/20 rounded-lg border border-amber-400/30">
          <p class="text-amber-300 text-xs">
            🔄 Viewing as: {selectedStudent.full_name}
          </p>
        </div>
      {/if}
    {/if}
  </div>
{/if}
