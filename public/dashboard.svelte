<script>
  import { onMount } from 'svelte';
  import { userStore } from "../../stores/userStore"
  import { TimeEntry, Student, Task } from '../entities/all';
  import { format, startOfWeek, startOfMonth, parseISO } from 'date-fns';
  import ProgressCard from '$lib/components/dashboard/ProgressCard.svelte';
  import QuickActions from '$lib/components/dashboard/QuickActions.svelte';
  import LogoutButton from '$lib/components/LogoutButton.svelte';
  import Reports from '../src/routes/reports.svelte';
  import Tasks from '../src/routes/tasks.svelte';
  import Schedule from "../src/routes/schedule-manager.svelte";
  import DailyTracker from '../src/routes/daily-tracker.svelte';
  import ProofApproval from '../src/routes/proof-approval.svelte';
  import Students from '../src/routes/students.svelte';
  import { Clock, Calendar, SquareCheckBig, ChartColumnIncreasing, Users, Home, ReceiptText, Plus, User } from 'lucide-svelte';
  

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

  userStore.subscribe(state => {
    user = state.user;
    role = state.role;
    isMentor = state.role === 'mentor';
    isStudent = state.role === 'student';
    selectedStudent = state.selectedStudent;
    myStudents = state.myStudents || [];
    isLoading = state.isLoading || false;
  });

  function setActiveView(view) {
    activeView = view;
  }
  onMount(() => {
    if (selectedStudent) {
      loadData();
    }
  });

  $: if (selectedStudent) {
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
  <aside class="w-64 p-6 flex flex-shrink-0">
    <div class="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-6 shadow-2xl flex flex-col gap-3">
      <!-- Logo & User Info -->
      <div class="flex flex-col items-center">
        <div class="w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
          <Clock class="w-8 h-8 text-white"/>
        </div>
        <h1 class="text-xl font-bold text-white">WorkTracker</h1>
        <p class="text-white/70 text-sm">Intern Hours Manager</p>
        
        {#if user}
          <div class="mt-3 p-3 bg-white/5 rounded-lg border border-white/10 w-full">
            <p class="text-white/80 text-sm font-medium text-center truncate">
              {user.full_name || user.email}
            </p>
            <p class="text-white/60 text-xs capitalize text-center mt-1">
              {role} Account
            </p>
          </div>
        {/if}
      </div>

      <!-- Student Management Section (for mentors and admins) -->
      {#if isMentor || role === 'admin'}
        <div class="p-4 bg-white/5 rounded-xl border border-white/10">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-white/80 text-sm font-medium">Students</h4>
            <a href="/students" class="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
              <Plus class="w-4 h-4"/>
            </a>
          </div>
          
          {#if myStudents.length > 0}
            <div class="space-y-2">
              {#each myStudents as student}
                <button
                  on:click={() => userStore.setSelectedStudent(student)}
                  class="w-full p-2 rounded-lg text-left transition-colors {selectedStudent?.id === student.id ? 'bg-emerald-500/20 text-white' : 'bg-white/5 text-white/80 hover:bg-white/10'}"
                >
                  <p class="text-xs font-medium truncate">{student.full_name}</p>
                </button>
              {/each}
            </div>
          {:else}
            <div class="text-center py-3">
              <User class="w-8 h-8 text-white/30 mx-auto mb-2"/>
              <p class="text-white/60 text-xs mb-2">No students</p>
              <a href="/students" class="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300">
                <Plus class="w-3 h-3"/>
                Add Student
              </a>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Navigation -->
      <nav class="space-y-2 flex-1">
        <button
          on:click={() => setActiveView('dashboard')}
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full {activeView === 'dashboard' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
        >
          <Home class="w-5 h-5"/>
          <span class="font-medium">Dashboard</span>
        </button>
        <button
          on:click={() => setActiveView('daily-tracker')}
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full {activeView === 'daily-tracker' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
        >
          <Clock class="w-5 h-5"/>
          <span>Daily Tracker</span>
        </button>
        <button
          on:click={() => setActiveView('schedule')}
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full {activeView === 'schedule' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
        >
          <Calendar class="w-5 h-5"/>
          <span>Schedule</span>
        </button>
        <button
          on:click={() => setActiveView('tasks')}
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full {activeView === 'tasks' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
        >
          <SquareCheckBig class="w-5 h-5"/>
          <span>Tasks</span>
        </button>
        <button
          on:click={() => setActiveView('reports')}
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full {activeView === 'reports' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
        >
          <ChartColumnIncreasing class="w-5 h-5"/>
          <span>Reports</span>
        </button>
        
        {#if isMentor || role === 'admin'}
          <button
            on:click={() => setActiveView('proof-approval')}
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full {activeView === 'proof-approval' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
          >
            <ReceiptText class="w-5 h-5"/>
            <span>Proof & Approval</span>
          </button>
          <button
            on:click={() => setActiveView('students')}
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full {activeView === 'students' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
          >
            <Users class="w-5 h-5"/>
            <span>Student Contracts</span>
          </button>
        {/if}
      </nav>

      <!-- Logout Button -->
      {#if user}
        <LogoutButton />
      {/if}
    </div>
  </aside>
  <main class="flex-1 overflow-auto bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl">
    {#if isLoading}
      <div class="p-8 text-white text-center">
        <p class="text-lg">Loading...</p>
      </div>
    {:else if !selectedStudent}
      <div class="p-8 text-white text-center">
        <p class="text-lg">No student profile found. Please select a student or check your profile settings.</p>
      </div>
    {:else if activeView === 'dashboard'}
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
      <!-- <div class="p-8">
        <h1 class="text-3xl font-bold text-white mb-2">Daily Tracker</h1>
        <p class="text-white/70 mb-8">Track your daily work hours.</p>
        <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6 text-center">
          <p class="text-white/60">Daily tracker content goes here</p>
        </div>
      </div> -->
    {:else if activeView === 'schedule'}
    <Schedule/>
      <!-- <div class="p-8">
        <h1 class="text-3xl font-bold text-white mb-2">Schedule Manager</h1>
        <p class="text-white/70 mb-8">Manage your work schedule.</p>
        <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6 text-center">
          <p class="text-white/60">Schedule content goes here</p>
        </div>
      </div> -->
    {:else if activeView === 'tasks'}
    <Tasks/>
      <!-- <div class="p-8">
        <h1 class="text-3xl font-bold text-white mb-2">Tasks</h1>
        <p class="text-white/70 mb-8">Manage your tasks and assignments.</p>
        <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6 text-center">
          <p class="text-white/60">Tasks content goes here</p>
        </div>
      </div> -->
    {:else if activeView === 'reports'}
      <!-- <div class="p-8">
        <h1 class="text-3xl font-bold text-white mb-2">Reports</h1>
        <p class="text-white/70 mb-8">View and generate reports.</p>
        <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6 text-center">
          <p class="text-white/60">Reports content goes here</p>
        </div>
      </div> -->
      <Reports/>
    {:else if activeView === 'proof-approval'}
    <ProofApproval/>
      <!-- <div class="p-8">
        <h1 class="text-3xl font-bold text-white mb-2">Proof & Approval</h1>
        <p class="text-white/70 mb-8">Review and approve student submissions.</p>
        <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6 text-center">
          <p class="text-white/60">Proof & approval content goes here</p>
        </div>
      </div> -->
    {:else if activeView === 'students'}
        <Students/>
      <!-- <div class="p-8">
        <h1 class="text-3xl font-bold text-white mb-2">Student Contracts</h1>
        <p class="text-white/70 mb-8">Manage student contracts and information.</p>
        <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6 text-center">
          <p class="text-white/60">Student contracts content goes here</p>
        </div>
      </div>-->
    {/if} 
  </main>
</div>