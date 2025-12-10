<script>
  import { onMount } from 'svelte';
  import { userStore, isMentor, isStudent, isAdmin } from '../../stores/userStore';
  import { TimeEntry } from '../../entities/all';
  import { format, startOfWeek, startOfMonth, parseISO } from 'date-fns';
  import ProgressCard from '../../lib/components/dashboard/ProgressCard.svelte';
  import QuickActions from '../../lib/components/dashboard/QuickActions.svelte';
  import { Clock, Calendar, CheckCircle2, TrendingUp, Star, AlertTriangle } from 'lucide-svelte';

  let timeEntries = [];
  let currentStatus = 'not_started';
  let todayEntry = null;
  let stats = {
    totalApproved: 0,
    dailyHours: 0,
    weeklyHours: 0,
    monthlyHours: 0,
    completionPercentage: 0
  };
  let isLoading = true;

  console.log('Dashboard script: EXECUTING');

  $: selectedStudent = $userStore.selectedStudent;
  $: student = $isMentor ? selectedStudent : selectedStudent;

  $: {
    console.log('Dashboard reactive: userStore =', $userStore);
    console.log('Dashboard reactive: selectedStudent =', selectedStudent);
    console.log('Dashboard reactive: student =', student);
    console.log('Dashboard reactive: isMentor =', $isMentor);
    console.log('Dashboard reactive: isLoading =', $userStore.isLoading);
  }

  onMount(() => {
    console.log('Dashboard onMount: START');
    console.log('Dashboard onMount: student =', student);
    console.log('Dashboard onMount: userStore.isLoading =', $userStore.isLoading);
    if (student) {
      loadData();
    } else {
      console.log('Dashboard onMount: No student, skipping loadData');
    }
  });

  $: if (student) {
    console.log('Dashboard reactive: student changed, loading data');
    loadData();
  }

  async function loadData() {
    try {
      const entries = await TimeEntry.list("-created_date");
      timeEntries = entries;

      const today = format(new Date(), 'yyyy-MM-dd');
      const todayTimeEntry = entries.find(entry => entry.date === today);
      todayEntry = todayTimeEntry;

      if (todayTimeEntry) {
        if (todayTimeEntry.end_time) {
          currentStatus = 'ended';
        } else if (todayTimeEntry.break_start && !todayTimeEntry.break_end) {
          currentStatus = 'on_break';
        } else if (todayTimeEntry.start_time) {
          currentStatus = 'working';
        }
      } else {
        currentStatus = 'not_started';
      }

      calculateStats(entries, student);
      isLoading = false;
    } catch (error) {
      console.error("Error loading data:", error);
      isLoading = false;
    }
  }

  function calculateStats(entries, studentData) {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(now), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');

    const totalApproved = entries.reduce((sum, entry) => sum + (entry.approved_hours || 0), 0);
    const dailyHours = entries.find(e => e.date === today)?.approved_hours || 0;

    const weeklyHours = entries
      .filter(e => parseISO(e.date) >= parseISO(weekStart))
      .reduce((sum, entry) => sum + (entry.approved_hours || 0), 0);

    const monthlyHours = entries
      .filter(e => parseISO(e.date) >= parseISO(monthStart))
      .reduce((sum, entry) => sum + (entry.approved_hours || 0), 0);

    const completionPercentage = studentData?.contract_hours
      ? Math.round((totalApproved / studentData.contract_hours) * 100)
      : 0;

    stats = {
      totalApproved,
      dailyHours,
      weeklyHours,
      monthlyHours,
      completionPercentage
    };
  }

  async function handleTimeAction(action, time = null) {
    const today = format(new Date(), 'yyyy-MM-dd');
    const currentTime = time || format(new Date(), 'HH:mm');

    try {
      if (todayEntry) {
        const updates = {};
        if (action === 'start') updates.start_time = currentTime;
        if (action === 'break_start') updates.break_start = currentTime;
        if (action === 'break_end') updates.break_end = currentTime;
        if (action === 'end') updates.end_time = currentTime;

        await TimeEntry.update(todayEntry.id, updates);
      } else {
        const newEntry = {
          date: today,
          [action === 'start' ? 'start_time' : `${action}_time`]: currentTime
        };
        await TimeEntry.create(newEntry);
      }

      loadData();
    } catch (error) {
      console.error("Error updating time entry:", error);
    }
  }
</script>

{#if $userStore.isLoading}
  <div class="p-8 text-white text-center">
    <p class="text-lg">Loading user data...</p>
  </div>
{:else if isLoading}
  <div class="p-8 text-white text-center">
    <p class="text-lg">Loading dashboard...</p>
  </div>
{:else if $isMentor}
  <!-- Mentor Dashboard -->
  <div class="p-8">
    <h1 class="text-3xl font-bold text-white mb-2">Mentor Dashboard</h1>
    <p class="text-white/70">
      Welcome, Mentor! You can view your students' progress here.
    </p>

    {#if selectedStudent}
      <div class="mt-8 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg text-white">
        <h2 class="text-xl font-bold mb-4">Viewing Dashboard for: {selectedStudent.full_name}</h2>

        <!-- Student Dashboard Content -->
        <div class="p-8">
          <!-- Main Progress Display -->
          <div class="mb-8">
            <div class="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-8 shadow-2xl">
              <div class="text-center mb-6">
                <h2 class="text-2xl font-bold text-white mb-2">Contract Progress</h2>
                <div class="flex items-center justify-center gap-4">
                  <span class="text-4xl font-bold text-white">{stats.totalApproved}</span>
                  <span class="text-2xl text-white/60">/</span>
                  <span class="text-4xl font-bold text-white/80">{student?.contract_hours || 600}</span>
                  <div class="ml-4 px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl">
                    <span class="text-2xl font-bold text-white">{stats.completionPercentage}%</span>
                  </div>
                </div>
              </div>

              <!-- Large Progress Bar -->
              <div class="w-full bg-white/10 rounded-full h-4 border border-white/20 mb-4">
                <div
                  class="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 h-full rounded-full transition-all duration-1000 shadow-lg relative overflow-hidden"
                  style="width: {Math.min(stats.completionPercentage, 100)}%"
                >
                  <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                </div>
              </div>

              <div class="flex justify-between text-white/60 text-sm">
                <span>0 hours</span>
                <span>{student?.contract_hours || 600} hours (Contract Complete)</span>
              </div>
            </div>
          </div>

          <!-- Stats Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <ProgressCard
              title="Daily Hours"
              current={stats.dailyHours}
              total={8}
              percentage={Math.round((stats.dailyHours / 8) * 100)}
              icon={Clock}
              color="bg-blue-500"
              trend="+2.5h"
            />
            <ProgressCard
              title="Weekly Hours"
              current={stats.weeklyHours}
              total={40}
              percentage={Math.round((stats.weeklyHours / 40) * 100)}
              icon={Calendar}
              color="bg-emerald-500"
              trend="+12%"
            />
            <ProgressCard
              title="Monthly Hours"
              current={stats.monthlyHours}
              total={160}
              percentage={Math.round((stats.monthlyHours / 160) * 100)}
              icon={TrendingUp}
              color="bg-purple-500"
            />
            <ProgressCard
              title="Approved Hours"
              current={stats.totalApproved}
              total={student?.contract_hours || 600}
              percentage={stats.completionPercentage}
              icon={CheckCircle2}
              color="bg-amber-500"
            />
          </div>

          <!-- Recent Activity -->
          <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
            <h3 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Star class="w-6 h-6 text-amber-400" />
              Recent Activity
            </h3>
            <div class="space-y-4">
              {#each timeEntries.slice(0, 5) as entry (entry.id)}
                <div class="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                  <div>
                    <p class="text-white font-medium">{format(parseISO(entry.date), 'MMM d, yyyy')}</p>
                    <p class="text-white/60 text-sm">
                      {entry.start_time} - {entry.end_time || 'In Progress'}
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    {#if entry.status === 'approved'}
                      <CheckCircle2 class="w-5 h-5 text-emerald-400" />
                    {/if}
                    {#if entry.status === 'submitted'}
                      <AlertTriangle class="w-5 h-5 text-amber-400" />
                    {/if}
                    <span class="text-white font-semibold">
                      {entry.approved_hours || entry.manually_inputted_hours || 0}h
                    </span>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    {:else}
      <div class="mt-8 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg text-white">
        <p class="text-white/70">Please select a student to view their dashboard.</p>
      </div>
    {/if}
  </div>
{:else}
  <!-- Student Dashboard -->
  {#if !student}
    <div class="p-8 text-white text-center">
      <p class="text-lg">No student profile found.</p>
    </div>
  {:else}
    <div class="p-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">Work Hour Dashboard</h1>
        <p class="text-white/70">
          Welcome back, {student?.full_name || 'Student'}! Track your progress and manage your internship hours.
        </p>
      </div>

      <!-- Main Progress Display -->
      <div class="mb-8">
        <div class="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-8 shadow-2xl">
          <div class="text-center mb-6">
            <h2 class="text-2xl font-bold text-white mb-2">Contract Progress</h2>
            <div class="flex items-center justify-center gap-4">
              <span class="text-4xl font-bold text-white">{stats.totalApproved}</span>
              <span class="text-2xl text-white/60">/</span>
              <span class="text-4xl font-bold text-white/80">{student?.contract_hours || 600}</span>
              <div class="ml-4 px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl">
                <span class="text-2xl font-bold text-white">{stats.completionPercentage}%</span>
              </div>
            </div>
          </div>

          <!-- Large Progress Bar -->
          <div class="w-full bg-white/10 rounded-full h-4 border border-white/20 mb-4">
            <div
              class="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 h-full rounded-full transition-all duration-1000 shadow-lg relative overflow-hidden"
              style="width: {Math.min(stats.completionPercentage, 100)}%"
            >
              <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
            </div>
          </div>

          <div class="flex justify-between text-white/60 text-sm">
            <span>0 hours</span>
            <span>{student?.contract_hours || 600} hours (Contract Complete)</span>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <ProgressCard
          title="Daily Hours"
          current={stats.dailyHours}
          total={8}
          percentage={Math.round((stats.dailyHours / 8) * 100)}
          icon={Clock}
          color="bg-blue-500"
          trend="+2.5h"
        />
        <ProgressCard
          title="Weekly Hours"
          current={stats.weeklyHours}
          total={40}
          percentage={Math.round((stats.weeklyHours / 40) * 100)}
          icon={Calendar}
          color="bg-emerald-500"
          trend="+12%"
        />
        <ProgressCard
          title="Monthly Hours"
          current={stats.monthlyHours}
          total={160}
          percentage={Math.round((stats.monthlyHours / 160) * 100)}
          icon={TrendingUp}
          color="bg-purple-500"
        />
        <ProgressCard
          title="Approved Hours"
          current={stats.totalApproved}
          total={student?.contract_hours || 600}
          percentage={stats.completionPercentage}
          icon={CheckCircle2}
          color="bg-amber-500"
        />
      </div>

      <!-- Quick Actions and Recent Activity -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickActions
          {currentStatus}
          onStartDay={() => handleTimeAction('start')}
          onBreakStart={() => handleTimeAction('break_start')}
          onBreakEnd={() => handleTimeAction('break_end')}
          onEndDay={() => handleTimeAction('end')}
        />

        <!-- Recent Activity -->
        <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
          <h3 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Star class="w-6 h-6 text-amber-400" />
            Recent Activity
          </h3>
          <div class="space-y-4">
            {#each timeEntries.slice(0, 5) as entry (entry.id)}
              <div class="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                <div>
                  <p class="text-white font-medium">{format(parseISO(entry.date), 'MMM d, yyyy')}</p>
                  <p class="text-white/60 text-sm">
                    {entry.start_time} - {entry.end_time || 'In Progress'}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  {#if entry.status === 'approved'}
                    <CheckCircle2 class="w-5 h-5 text-emerald-400" />
                  {/if}
                  {#if entry.status === 'submitted'}
                    <AlertTriangle class="w-5 h-5 text-amber-400" />
                  {/if}
                  <span class="text-white font-semibold">
                    {entry.approved_hours || entry.manually_inputted_hours || 0}h
                  </span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}
{/if}
