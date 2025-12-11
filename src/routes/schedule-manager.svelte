<script>
  import { onMount } from 'svelte';
  import { Schedule } from '../entities/all';
  import { userStore, isMentor, isStudent, isAdmin } from '../stores/userStore';
  import { format } from 'date-fns';
  import Input from '$lib/components/ui/input.svelte';
  import { Calendar } from 'lucide-svelte';
  import ScheduleParser from '$lib/components/schedule/ScheduleParser.svelte';
  import ScheduleEditor from '$lib/components/schedule/ScheduleEditor.svelte';
  import ScheduleClaimer from '$lib/components/schedule/ScheduleClaimer.svelte';

  $: user = $userStore.user;
  $: selectedStudent = $userStore.selectedStudent;

  let selectedDate = format(new Date(), 'yyyy-MM-dd');
  let schedules = [];
  let isLoading = true;

  $: currentSchedule = schedules.length > 0 ? schedules[0] : null;

  onMount(() => {
    loadSchedule();
  });

  $: if (selectedDate || selectedStudent || user) {
    loadSchedule();
  }

  async function loadSchedule() {
    isLoading = true;
    try {
      const filterCriteria = { date: selectedDate };

      if ($isStudent && user) {
        filterCriteria.student_email = user.email;
      } else if (($isMentor || $isAdmin) && selectedStudent) {
        filterCriteria.student_email = selectedStudent.student_email;
      }

      if (filterCriteria.student_email) {
        const fetchedSchedules = await Schedule.filter(filterCriteria);
        schedules = fetchedSchedules;
      } else {
        schedules = [];
      }
    } catch (error) {
      console.error("Error loading schedule:", error);
      schedules = [];
    }
    isLoading = false;
  }

  async function handleScheduleCreate(data) {
    await Schedule.create(data);
    loadSchedule();
  }

  async function handleScheduleUpdate(id, data) {
    if (id) {
      await Schedule.update(id, data);
    } else {
      await Schedule.create(data);
    }
    loadSchedule();
  }
</script>

<div class="p-8">
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-white mb-2 flex items-center gap-3">
      <Calendar class="w-8 h-8 text-purple-400" />
      Schedule Manager
    </h1>
    <p class="text-white/70">Plan the daily schedule and provide materials for your interns.</p>
    {#if selectedStudent}
      <p class="text-white/70 text-sm mt-1">
        Viewing schedule for: <span class="font-semibold text-purple-300">{selectedStudent.full_name}</span>
      </p>
    {/if}
    {#if $isStudent}
      <p class="text-white/70 text-sm mt-1">Viewing your personal schedule</p>
    {/if}
  </div>

  <div class="mb-8 max-w-sm">
    <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
      <label for="date" class="text-white font-medium mb-2 block">Select Date</label>
      <Input
        id="date"
        type="date"
        bind:value={selectedDate}
        class="bg-white/10 border-white/20 text-white placeholder-white/50"
      />
    </div>
  </div>

  <div class="grid grid-cols-1 gap-8">
    {#if $isMentor || $isAdmin}
      <ScheduleParser
        date={selectedDate}
        onScheduleCreate={handleScheduleCreate}
        onScheduleUpdate={handleScheduleUpdate}
        existingSchedule={currentSchedule}
        {selectedStudent}
        isStudent={$isStudent}
        currentUser={user}
      />
    {/if}

    {#if $isStudent}
      <ScheduleClaimer
        date={selectedDate}
        schedule={currentSchedule}
        currentUser={user}
      />
    {/if}

    <ScheduleEditor
      date={selectedDate}
      schedule={currentSchedule}
      onScheduleUpdate={handleScheduleUpdate}
      {selectedStudent}
      isStudent={$isStudent}
      currentUser={user}
      {isLoading}
    />
  </div>
</div>
