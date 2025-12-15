<script>
  console.log("dashboard")
  import { onMount } from 'svelte';
  import { userStore } from "../../stores/userStore"
  import { TimeEntry, Student, Task } from '../../entities/all';
  import { format, startOfWeek, startOfMonth, parseISO } from 'date-fns';
  import ProgressCard from '$lib/components/dashboard/ProgressCard.svelte';
  import QuickActions from '$lib/components/dashboard/QuickActions.svelte';
  import LogoutButton from '$lib/components/LogoutButton.svelte';
  import DebugInfo from '$lib/components/DebugInfo.svelte';
  import Reports from '../../lib/pages/reports.svelte';
  import Tasks from '../../lib/pages/tasks.svelte';
  import Schedule from "../../lib/pages/schedule-manager.svelte";
  import DailyTracker from '../../lib/pages/daily-tracker.svelte';
  import ProofApproval from '../../lib/pages/proof-approval.svelte';
  import Students from '../../lib/pages/students.svelte';
  import { Clock, Calendar, SquareCheckBig, ChartColumnIncreasing, Users, Home, ReceiptText, Plus, User } from 'lucide-svelte';
  

  // Default UI test values - will be overridden by store subscription
  let user = { id: 3, email: 'admin@example.com', full_name: 'Demo Admin', role: 'admin', company_id: 1 };
  let role = 'admin';
  let isMentor = false;
  let isStudent = false;
  let selectedStudent = { id: 1, full_name: 'Demo Student', student_email: 'student@example.com', contract_hours: 600 }; // Default for UI testing
  let myStudents = [];
  let isLoading = false; // Start as false for UI testing
  let timeEntries = [];
  let currentStatus = 'not_started';
  let todayEntry = null;
  let activeView = 'dashboard'; // Track which view to show
  let stats = {
    totalApproved: 0,
    dailyHours: 0,
    weeklyHours: 0,
    monthlyHours: 0,
    completionPercentage: 0
  };

  const unsubscribe = userStore.subscribe(state => {
    console.log('Dashboard: userStore updated:', { isLoading: state.isLoading, selectedStudent: state.selectedStudent, role: state.role });
    user = state.user;
    role = state.role;
    isMentor = state.role === 'mentor';
    isStudent = state.role === 'student';
    selectedStudent = state.selectedStudent;
    myStudents = state.myStudents || [];
    isLoading = state.isLoading;
  });

  onMount(() => {
    // Restore user state from localStorage on page load/reload
    console.log('Dashboard onMount: Calling loadUserAndRole()');
    userStore.loadUserAndRole();
    return unsubscribe;
  });

  function setActiveView(view) {
    activeView = view;
  }

  $: if (selectedStudent) {
    console.log('Dashboard: selectedStudent changed, calling loadData:', selectedStudent);
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

      calculateStats(entries, selectedStudent);
    } catch (error) {
      console.error("Error loading data:", error);
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

<div class="min-h-screen flex gap-6 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 px-10 py-11 text-white">
  <aside class="w-64 p-6 flex-shrink-0">
    <div class="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-6 shadow-2xl flex flex-col min-h-full">
      <!-- Logo & User Info -->
      <div class="mb-8 text-center">
        <div class="w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
          <Clock class="w-8 h-8 text-white"/>
        </div>
        <h1 class="text-xl font-bold text-white">WorkTracker</h1>
        <p class="text-white/70 text-sm">Intern Hours Manager</p>
        
        <!-- User Info - updates dynamically based on store -->
        <div class="mt-3 p-2 bg-white/5 rounded-lg border border-white/10">
          <p class="text-white/80 text-sm font-medium">
            {user?.email || 'user@example.com'}
          </p>
          <p class="text-white/60 text-xs capitalize">
            {role || 'student'} Account
          </p>
        </div>
      </div>

      <!-- Student Management Section -->
      <div class="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
        <div class="flex items-center justify-between flex-col  mb-3">
          <h4 class="text-white/80 text-sm font-medium text-center">Student Management</h4>
          <a href="/students">
            <button class="inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none hover:bg-accent hover:text-accent-foreground h-9 px-3  text-white/60 hover:text-white hover:bg-white/10">
              <Plus class="w-4 h-4 mr-1"/>
              Add
            </button>
          </a>
        </div>
        <div class="text-center py-4">
          <User class="w-8 h-8 text-white/30 mx-auto mb-2"/>
          <p class="text-white/60 text-sm mb-3">No students assigned</p>
          <a href="/students">
            <button class="inline-flex items-center justify-center rounded-md text-[.8rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-3  bg-emerald-500 hover:bg-emerald-600 text-white">
              <Plus  class="w-4 h-4 mr-1"/>
              Create Contract
            </button>
          </a>
        </div>
      </div>
      
      <!-- Navigation -->
      <nav class="space-y-2 flex-1">
        <a
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'dashboard' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
          href="/dashboard"
          on:click|preventDefault={() => setActiveView('dashboard')}
        >
          <Home class="w-5 h-5"/>
          <span class="font-medium">Dashboard</span>
        </a>
        <a
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'daily-tracker' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
          href="/dailytracker"
          on:click|preventDefault={() => setActiveView('daily-tracker')}
        >
          <Clock class="w-5 h-5"/>
          <span class="font-medium">Daily Tracker</span>
        </a>
        <a
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'schedule' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
          href="/schedulemanager"
          on:click|preventDefault={() => setActiveView('schedule')}
        >
          <Calendar class="w-5 h-5"/>
          <span class="font-medium">Schedule</span>
        </a>
        <a
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'tasks' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
          href="/tasks"
          on:click|preventDefault={() => setActiveView('tasks')}
        >
          <SquareCheckBig class="w-5 h-5"/>
          <span class="font-medium">Tasks</span>
        </a>
        <a
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'reports' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
          href="/reports"
          on:click|preventDefault={() => setActiveView('reports')}
        >
          <ChartColumnIncreasing class="w-5 h-5"/>
          <span class="font-medium">Reports</span>
        </a>
        <a
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'proof-approval' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
          href="/proofapproval"
          on:click|preventDefault={() => setActiveView('proof-approval')}
        >
          <ReceiptText size=30/>
          <span class="font-medium">Proof & Approval</span>
        </a>
        <a
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'students' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
          href="/students"
          on:click|preventDefault={() => setActiveView('students')}
        >
          <Users size=30/>
          <span class="font-medium">Student Contracts</span>
        </a>
      </nav>

      <!-- Logout Button -->
      <div class="mt-4 pt-4 border-t border-white/20">
        <LogoutButton />
      </div>
    </div>
  </aside>
  <main class="flex-1 p-6 relative">
    <div class="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl min-h-full">
      <!-- TEMP: Showing dashboard regardless of loading/selectedStudent state for UI review -->
      {#if activeView === 'dashboard'}
        <div class="p-8">
          <h1 class="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p class="text-white/70 mb-8">Welcome back! Here's your overview.</p>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
              <h3 class="text-white/80 text-sm mb-2">Total Hours</h3>
              <p class="text-3xl font-bold text-white">{stats.totalApproved}</p>
            </div>
            <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
              <h3 class="text-white/80 text-sm mb-2">Daily Hours</h3>
              <p class="text-3xl font-bold text-white">{stats.dailyHours}</p>
            </div>
            <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
              <h3 class="text-white/80 text-sm mb-2">Weekly Hours</h3>
              <p class="text-3xl font-bold text-white">{stats.weeklyHours}</p>
            </div>
            <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
              <h3 class="text-white/80 text-sm mb-2">Completion</h3>
              <p class="text-3xl font-bold text-white">{stats.completionPercentage}%</p>
            </div>
          </div>
        </div>
      {:else if activeView === 'daily-tracker'}
      <DailyTracker/>
      
      {:else if activeView === 'schedule'}
      <Schedule/>
       
      {:else if activeView === 'tasks'}
      <Tasks/>
       
      {:else if activeView === 'reports'}
       
        <Reports/>
      {:else if activeView === 'proof-approval'}
      <ProofApproval/>
      
      {:else if activeView === 'students'}
          <Students/>
      {/if}
      
      <!-- Debug Info Button -->
      <div class="absolute bottom-6 right-6 z-50">
        <DebugInfo />
      </div>
    </div>
  </main>
</div>
