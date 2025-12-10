<script>
  import { onMount } from 'svelte';
  import { userStore, isMentor, isStudent, isAdmin } from '../../stores/userStore';
  import { TimeEntry } from '../../entities/all';
  import { format, startOfWeek, startOfMonth, parseISO } from 'date-fns';
  import { Clock, Calendar, CheckCircle2, TrendingUp, Users, BarChart3, FileText } from 'lucide-svelte';

  let timeEntries = [];
  let stats = {
    totalApproved: 0,
    dailyHours: 0,
    weeklyHours: 0,
    monthlyHours: 0,
    completionPercentage: 0
  };
  let isLoading = true;

  $: selectedStudent = $userStore.selectedStudent;
  $: student = selectedStudent;

  $: if (student && !$userStore.isLoading) {
    loadData();
  } else if (!student && !$userStore.isLoading) {
    isLoading = false;
  }

  async function loadData() {
    try {
      const entries = await TimeEntry.list("-created_date");
      timeEntries = entries;
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
</script>

{#if $userStore.isLoading}
  <div class="p-8 text-gray-600 text-center">
    <p class="text-lg">Loading user data...</p>
  </div>
{:else if !student}
  <div class="p-8 text-gray-600 text-center">
    <p class="text-lg">No student profile found.</p>
  </div>
{:else if isLoading}
  <div class="p-8 text-gray-600 text-center">
    <p class="text-lg">Loading dashboard...</p>
  </div>
{:else}
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
      <p class="text-gray-600">
        Welcome back, {student?.full_name || 'User'}! Here's your overview.
      </p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- Total Hours Card -->
      <div class="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Clock class="w-6 h-6 text-blue-600" />
          </div>
          <span class="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
            +12%
          </span>
        </div>
        <h3 class="text-gray-600 text-sm font-medium mb-1">Total Hours</h3>
        <p class="text-2xl font-bold text-gray-900">{stats.totalApproved}h</p>
        <p class="text-xs text-gray-500 mt-1">of {student?.contract_hours || 600}h</p>
      </div>

      <!-- Weekly Hours Card -->
      <div class="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <Calendar class="w-6 h-6 text-green-600" />
          </div>
          <span class="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
            +8%
          </span>
        </div>
        <h3 class="text-gray-600 text-sm font-medium mb-1">This Week</h3>
        <p class="text-2xl font-bold text-gray-900">{stats.weeklyHours}h</p>
        <p class="text-xs text-gray-500 mt-1">of 40h target</p>
      </div>

      <!-- Monthly Hours Card -->
      <div class="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <TrendingUp class="w-6 h-6 text-purple-600" />
          </div>
          <span class="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
            +15%
          </span>
        </div>
        <h3 class="text-gray-600 text-sm font-medium mb-1">This Month</h3>
        <p class="text-2xl font-bold text-gray-900">{stats.monthlyHours}h</p>
        <p class="text-xs text-gray-500 mt-1">of 160h target</p>
      </div>

      <!-- Completion Card -->
      <div class="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
            <CheckCircle2 class="w-6 h-6 text-amber-600" />
          </div>
        </div>
        <h3 class="text-gray-600 text-sm font-medium mb-1">Completion</h3>
        <p class="text-2xl font-bold text-gray-900">{stats.completionPercentage}%</p>
        <div class="w-full bg-gray-200 rounded-full h-2 mt-3">
          <div
            class="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
            style="width: {Math.min(stats.completionPercentage, 100)}%"
          ></div>
        </div>
      </div>
    </div>

    <!-- Recent Activity & Quick Actions -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recent Activity -->
      <div class="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold text-gray-900">Recent Activity</h3>
          <button class="text-sm text-purple-600 hover:text-purple-800 font-medium">View All</button>
        </div>
        <div class="space-y-4">
          {#if timeEntries.length > 0}
            {#each timeEntries.slice(0, 5) as entry (entry.id)}
              <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Clock class="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-gray-900">
                      {format(parseISO(entry.date), 'MMM d, yyyy')}
                    </p>
                    <p class="text-xs text-gray-500">
                      {entry.start_time || '--'} - {entry.end_time || 'In Progress'}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  {#if entry.status === 'approved'}
                    <span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                      Approved
                    </span>
                  {:else if entry.status === 'submitted'}
                    <span class="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
                      Pending
                    </span>
                  {/if}
                  <span class="text-sm font-bold text-gray-900">
                    {entry.approved_hours || entry.manually_inputted_hours || 0}h
                  </span>
                </div>
              </div>
            {/each}
          {:else}
            <p class="text-center text-gray-500 py-8">No recent activity</p>
          {/if}
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <h3 class="text-lg font-bold text-gray-900 mb-6">Quick Stats</h3>
        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div class="flex items-center gap-3">
              <Users class="w-5 h-5 text-blue-600" />
              <span class="text-sm font-medium text-gray-700">Total Entries</span>
            </div>
            <span class="text-lg font-bold text-gray-900">{timeEntries.length}</span>
          </div>

          <div class="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div class="flex items-center gap-3">
              <CheckCircle2 class="w-5 h-5 text-green-600" />
              <span class="text-sm font-medium text-gray-700">Approved</span>
            </div>
            <span class="text-lg font-bold text-gray-900">
              {timeEntries.filter(e => e.status === 'approved').length}
            </span>
          </div>

          <div class="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
            <div class="flex items-center gap-3">
              <FileText class="w-5 h-5 text-yellow-600" />
              <span class="text-sm font-medium text-gray-700">Pending</span>
            </div>
            <span class="text-lg font-bold text-gray-900">
              {timeEntries.filter(e => e.status === 'submitted').length}
            </span>
          </div>

          <div class="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
            <div class="flex items-center gap-3">
              <BarChart3 class="w-5 h-5 text-purple-600" />
              <span class="text-sm font-medium text-gray-700">Avg/Day</span>
            </div>
            <span class="text-lg font-bold text-gray-900">
              {timeEntries.length > 0 ? (stats.totalApproved / timeEntries.length).toFixed(1) : 0}h
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
