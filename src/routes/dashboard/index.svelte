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
  import AdminManagement from '../../lib/pages/admin-management.svelte';
  import { Clock, Calendar, SquareCheckBig, Bug, Hammer, ChartColumnIncreasing, Users, Home, ReceiptText, Plus, User, Shield } from 'lucide-svelte';
  

  // Reactive variables that will be updated by store subscription
  let user = null;
  let role = null;
  let isMentor = false;
  let isStudent = false;
  let selectedStudent = null;
  let myStudents = [];
  let isLoading = true;
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
    console.log('Dashboard: userStore updated:', { isLoading: state.isLoading, selectedStudent: state.selectedStudent, role: state.role, user: state.user });
    user = state.user;
    role = state.role;
    isMentor = state.role === 'mentor';
    isStudent = state.role === 'student';
    selectedStudent = state.selectedStudent;
    myStudents = state.myStudents || [];
    isLoading = state.isLoading;
  });

  onMount(async () => {
    // Restore user state from localStorage on page load/reload
    console.log('Dashboard onMount: Calling loadUserAndRole()');
    try {
      await userStore.loadUserAndRole();
      console.log('Dashboard onMount: loadUserAndRole completed');
    } catch (error) {
      console.error('Dashboard onMount: loadUserAndRole failed', error);
      // Redirect to login on error
      window.location.href = '/';
    }
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
        
        <div class="mt-3 p-2 bg-white/5 rounded-lg border border-white/10">
          {#if user}
            <p class="text-white/80 text-sm font-medium">{user.email}</p>
            <p class="text-white/60 text-xs capitalize">{role} Account</p>
          {:else}
            <p class="text-white/60 text-sm">Loading...</p>
          {/if}
        </div>
      </div>

      <!-- Student Management Section -->
      {#if role === 'admin'}
        <!-- ADMIN: Shows ALL students -->
        <div class="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-white/80 text-sm font-medium">All Students</h4>
            <a href="/students">
              <button class="inline-flex items-center justify-center rounded-md font-medium transition-colors h-7 px-2 text-xs text-white/60 hover:text-white hover:bg-white/10">
                <Plus class="w-3 h-3 mr-1"/>
                Add
              </button>
            </a>
          </div>
          {#if myStudents && myStudents.length > 0}
            <div class="space-y-2 max-h-64 overflow-y-auto">
              {#each myStudents as student}
                <button
                  class="w-full text-left p-3 rounded-lg transition-all {selectedStudent?.id === student.id ? 'bg-white/20 border border-white/30' : 'bg-white/5 hover:bg-white/10'}"
                  on:click={() => userStore.setSelectedStudent(student)}
                >
                  <p class="text-white text-sm font-medium">{student.full_name}</p>
                  <p class="text-white/60 text-xs">{student.student_email}</p>
                </button>
              {/each}
            </div>
          {:else}
            <div class="text-center py-4">
              <User class="w-8 h-8 text-white/30 mx-auto mb-2"/>
              <p class="text-white/60 text-sm mb-3">No students yet</p>
              <a href="/students">
                <button class="inline-flex items-center justify-center rounded-md text-xs transition-colors bg-emerald-500 hover:bg-emerald-600 text-white h-8 px-3">
                  <Plus class="w-3 h-3 mr-1"/>
                  Create Contract
                </button>
              </a>
            </div>
          {/if}
        </div>
      {:else if role === 'mentor'}
        <!-- MENTOR: Shows ONLY assigned students -->
        <div class="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-white/80 text-sm font-medium">My Students</h4>
            <span class="text-white/60 text-xs">{myStudents?.length || 0} assigned</span>
          </div>
          {#if myStudents && myStudents.length > 0}
            <div class="space-y-2 max-h-64 overflow-y-auto">
              {#each myStudents as student}
                <button
                  class="w-full text-left p-3 rounded-lg transition-all {selectedStudent?.id === student.id ? 'bg-white/20 border border-white/30' : 'bg-white/5 hover:bg-white/10'}"
                  on:click={() => userStore.setSelectedStudent(student)}
                >
                  <p class="text-white text-sm font-medium">{student.full_name}</p>
                  <p class="text-white/60 text-xs">{student.student_email}</p>
                </button>
              {/each}
            </div>
          {:else}
            <div class="text-center py-4">
              <User class="w-8 h-8 text-white/30 mx-auto mb-2"/>
              <p class="text-white/60 text-sm">No students assigned</p>
            </div>
          {/if}
        </div>
      {:else}
        <!-- STUDENT: Shows "Your Profile" card -->
        <div class="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
          <h4 class="text-white/80 text-sm font-medium mb-3">Your Profile</h4>
          {#if selectedStudent}
            <div class="p-3 rounded-lg bg-white/10 border border-white/20">
              <p class="text-white text-sm font-medium">{selectedStudent.full_name}</p>
              <p class="text-white/60 text-xs mt-1">{selectedStudent.student_email}</p>
              <div class="mt-2 pt-2 border-t border-white/20">
                <p class="text-white/60 text-xs">Contract Hours</p>
                <p class="text-white font-semibold">{selectedStudent.contract_hours || 600}h</p>
              </div>
            </div>
          {:else}
            <div class="text-center py-4">
              <User class="w-8 h-8 text-white/30 mx-auto mb-2"/>
              <p class="text-white/60 text-sm">Loading profile...</p>
            </div>
          {/if}
        </div>
      {/if}
      
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
        
        {#if role === 'admin'}
          <!-- Admin Management - Only for admin -->
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'admin-management' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            href="/admin"
            on:click|preventDefault={() => setActiveView('admin-management')}
          >
            <Shield class="w-5 h-5"/>
            <span class="font-medium">Admin Panel</span>
          </a>
        {/if}
        
        {#if role === 'admin' || role === 'mentor'}
          <!-- Proof & Approval - Only for admin and mentor -->
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'proof-approval' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            href="/proofapproval"
            on:click|preventDefault={() => setActiveView('proof-approval')}
          >
            <ReceiptText class="w-5 h-5"/>
            <span class="font-medium">Proof & Approval</span>
          </a>
        {/if}
        
        <a
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'students' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
          href="/students"
          on:click|preventDefault={() => setActiveView('students')}
        >
          <Users class="w-5 h-5"/>
          <span class="font-medium">Student Contracts</span>
          {#if role === 'student'}
            <span class="ml-auto text-[10px] text-white/50">(view)</span>
          {/if}
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
          {#if role === 'admin'}
            <!-- ADMIN Dashboard -->
            <h1 class="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p class="text-white/70 mb-8">Full system access - manage all students and approvals</p>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                <h3 class="text-white/80 text-sm mb-2">Total Hours (All)</h3>
                <p class="text-3xl font-bold text-white">{stats.totalApproved}</p>
                <p class="text-white/50 text-xs mt-1">Across all students</p>
              </div>
              <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                <h3 class="text-white/80 text-sm mb-2">Daily Hours</h3>
                <p class="text-3xl font-bold text-white">{stats.dailyHours}</p>
                <p class="text-white/50 text-xs mt-1">Today's total</p>
              </div>
              <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                <h3 class="text-white/80 text-sm mb-2">Weekly Hours</h3>
                <p class="text-3xl font-bold text-white">{stats.weeklyHours}</p>
                <p class="text-white/50 text-xs mt-1">This week</p>
              </div>
              <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                <h3 class="text-white/80 text-sm mb-2">Avg Completion</h3>
                <p class="text-3xl font-bold text-white">{stats.completionPercentage}%</p>
                <p class="text-white/50 text-xs mt-1">System average</p>
              </div>
            </div>
            
            {#if selectedStudent}
              <div class="mt-8 p-6 bg-white/5 rounded-xl border border-white/20">
                <h2 class="text-xl font-bold text-white mb-4">Selected Student: {selectedStudent.full_name}</h2>
                <p class="text-white/70">View and manage student details, approve hours, manage contracts</p>
              </div>
            {/if}
            
          {:else if role === 'mentor'}
            <!-- MENTOR Dashboard -->
            <h1 class="text-3xl font-bold text-white mb-2">Mentor Dashboard</h1>
            <p class="text-white/70 mb-8">Manage your assigned students - {myStudents?.length || 0} students</p>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                <h3 class="text-white/80 text-sm mb-2">Total Hours (Assigned)</h3>
                <p class="text-3xl font-bold text-white">{stats.totalApproved}</p>
                <p class="text-white/50 text-xs mt-1">Your students</p>
              </div>
              <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                <h3 class="text-white/80 text-sm mb-2">Daily Hours</h3>
                <p class="text-3xl font-bold text-white">{stats.dailyHours}</p>
                <p class="text-white/50 text-xs mt-1">Today's total</p>
              </div>
              <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                <h3 class="text-white/80 text-sm mb-2">Weekly Hours</h3>
                <p class="text-3xl font-bold text-white">{stats.weeklyHours}</p>
                <p class="text-white/50 text-xs mt-1">This week</p>
              </div>
              <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                <h3 class="text-white/80 text-sm mb-2">Students</h3>
                <p class="text-3xl font-bold text-white">{myStudents?.length || 0}</p>
                <p class="text-white/50 text-xs mt-1">Assigned to you</p>
              </div>
            </div>
            
            {#if selectedStudent}
              <div class="mt-8 p-6 bg-white/5 rounded-xl border border-white/20">
                <h2 class="text-xl font-bold text-white mb-4">Selected Student: {selectedStudent.full_name}</h2>
                <p class="text-white/70">Review time entries, approve hours, manage their contract</p>
              </div>
            {/if}
            
          {:else}
            <!-- STUDENT Dashboard -->
            <h1 class="text-3xl font-bold text-white mb-2">My Dashboard</h1>
            <p class="text-white/70 mb-8">Track your hours and progress toward completion</p>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                <h3 class="text-white/80 text-sm mb-2">Total Hours</h3>
                <p class="text-3xl font-bold text-white">{stats.totalApproved}</p>
                <p class="text-white/50 text-xs mt-1">All approved hours</p>
              </div>
              <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                <h3 class="text-white/80 text-sm mb-2">Today</h3>
                <p class="text-3xl font-bold text-white">{stats.dailyHours}</p>
                <p class="text-white/50 text-xs mt-1">Hours worked today</p>
              </div>
              <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                <h3 class="text-white/80 text-sm mb-2">This Week</h3>
                <p class="text-3xl font-bold text-white">{stats.weeklyHours}</p>
                <p class="text-white/50 text-xs mt-1">Weekly total</p>
              </div>
              <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                <h3 class="text-white/80 text-sm mb-2">Progress</h3>
                <p class="text-3xl font-bold text-white">{stats.completionPercentage}%</p>
                <p class="text-white/50 text-xs mt-1">of {selectedStudent?.contract_hours || 600}h goal</p>
              </div>
            </div>
            
            <!-- Quick Actions for Students -->
            <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                class="p-4 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl transition-all text-left"
                on:click={() => setActiveView('daily-tracker')}
              >
                <Clock class="w-6 h-6 text-emerald-400 mb-2"/>
                <h3 class="text-white font-semibold">Log Hours</h3>
                <p class="text-white/60 text-sm">Track your daily work</p>
              </button>
              <button
                class="p-4 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl transition-all text-left"
                on:click={() => setActiveView('tasks')}
              >
                <SquareCheckBig class="w-6 h-6 text-blue-400 mb-2"/>
                <h3 class="text-white font-semibold">View Tasks</h3>
                <p class="text-white/60 text-sm">Check assigned work</p>
              </button>
              <button
                class="p-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl transition-all text-left"
                on:click={() => setActiveView('schedule')}
              >
                <Calendar class="w-6 h-6 text-purple-400 mb-2"/>
                <h3 class="text-white font-semibold">My Schedule</h3>
                <p class="text-white/60 text-sm">View upcoming events</p>
              </button>
            </div>
          {/if}
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
      
      {:else if activeView === 'admin-management'}
      <AdminManagement/>
      
      {:else if activeView === 'students'}
          <Students/>
      {/if}
      
      <!-- Action Buttons (bottom left) -->
      <div class="absolute bottom-6 right-5 flex flex-col gap-3 z-50">
        <button 
          class="inline-flex items-center justify-center rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-14 h-14 bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110" 
          title="Report a Bug"
        >
         <Bug size={24}/>
        </button>
        <button 
          class="inline-flex items-center justify-center rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110" 
          title="Request Enhancement"
        >
         <Hammer size={24}/>
        </button>
      </div>
      
      <!-- Debug Info Button -->
      <div class="absolute bottom-6 right-6 z-50">
        <DebugInfo />
      </div>
    </div>
  </main>
</div>
