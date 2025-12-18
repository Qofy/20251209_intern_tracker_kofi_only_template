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
  import MentorDashboard from '../../lib/pages/mentor-dashboard.svelte';
  import AdminDashboard from '../../lib/pages/admin-dashboard.svelte';
  import StudentDashboard from '../../lib/pages/student-dashboard.svelte';
  import Contracts from '../../lib/pages/contracts.svelte';
  import { Clock, Calendar, SquareCheckBig, Bug, Hammer, ChartColumnIncreasing, Users, Home, ReceiptText, Plus, User, Shield, GraduationCap, Upload, TrendingUp, MessageSquare, BookOpen, FileText } from 'lucide-svelte';
  

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

  // Set default view based on role
  $: if (role === 'mentor' && activeView === 'dashboard') {
    activeView = 'mentor-students';
  } else if (role === 'admin' && activeView === 'dashboard') {
    activeView = 'admin-users';
  } else if (role === 'student' && activeView === 'dashboard') {
    activeView = 'student-tasks';
  }

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

{#if !role || !user}
  <!-- DEFAULT LAYOUT (Not logged in or no role) -->
  <div class="min-h-screen flex gap-6 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 px-10 py-11 text-white">
    <aside class="w-64 p-6 flex-shrink-0">
      <div class="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-6 shadow-2xl flex flex-col min-h-full">
        <!-- Logo & User Info -->
        <div class="mb-8 text-center">
          <div class="w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Home class="w-8 h-8 text-white"/>
          </div>
          <h1 class="text-xl font-bold text-white">WorkTracker</h1>
          <p class="text-white/70 text-sm">Intern Hours Manager</p>

          <div class="mt-3 p-2 bg-white/5 rounded-lg border border-white/10">
            <p class="text-white/60 text-sm">Please log in</p>
          </div>
          
        </div>

        <!-- Navigation -->
        <nav class="space-y-2 flex-1">
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 text-white/50 cursor-not-allowed"
            href="/dashboard"
          >
            <Home class="w-5 h-5"/>
            <span class="font-medium">Dashboard</span>
          </a>
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 text-white/50 cursor-not-allowed"
            href="#"
          >
            <Users class="w-5 h-5"/>
            <span class="font-medium">Features</span>
          </a>
        </nav>

        <!-- Login Button -->
        <div class="mt-4 pt-4 border-t border-white/20">
          <a
            href="/"
            class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-white/80 hover:bg-red-500/20 hover:text-white w-full font-bold"
          >
            Go to Login
          </a>
        </div>
      </div>
    </aside>
    <main class="flex-1 p-6 relative">
      <div class="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl min-h-full p-8">
        <div class="text-center py-12">
          <Shield class="w-24 h-24 text-white/30 mx-auto mb-6" />
          <h1 class="text-4xl font-bold text-white mb-4">Welcome to WorkTracker</h1>
          <p class="text-white/70 text-lg mb-8">
            Please log in to access your dashboard and features
          </p>
          <a
            href="/"
            class="inline-block px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-semibold text-lg transition-all"
          >
            Go to Login Page
          </a>
        </div>
      </div>
    </main>
  </div>
{:else if role === 'mentor'}
  <!-- MENTOR LAYOUT -->
  <div class="min-h-screen flex gap-6 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 px-10 py-11 text-white">
    <aside class="w-64 p-6 flex-shrink-0">
      <div class="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-6 shadow-2xl flex flex-col min-h-full">
        <!-- Logo & User Info -->
        <div class="mb-8 text-center">
          <div class="w-16 h-16 bg-gradient-to-r from-purple-400 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <GraduationCap class="w-8 h-8 text-white"/>
          </div>
          <h1 class="text-xl font-bold text-white">Mentor Portal</h1>
          <p class="text-white/70 text-sm">Student Management</p>

          <div class="mt-3 p-2 bg-white/5 rounded-lg border border-white/10">
            {#if user}
              <p class="text-white/80 text-sm font-medium">{user.email}</p>
              <p class="text-white/60 text-xs capitalize">{role} Account</p>
            {:else}
              <p class="text-white/60 text-sm">Loading...</p>
            {/if}
          </div>
        </div>

        <!-- Navigation for Mentor -->
        <nav class="space-y-2 flex-1">
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'mentor-students' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            href="/mentor/students"
            on:click|preventDefault={() => setActiveView('mentor-students')}
          >
            <Users class="w-5 h-5"/>
            <span class="font-medium">My Students</span>
          </a>
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'mentor-tasks' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            href="/mentor/tasks"
            on:click|preventDefault={() => setActiveView('mentor-tasks')}
          >
            <SquareCheckBig class="w-5 h-5"/>
            <span class="font-medium">Tasks & Projects</span>
          </a>
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'mentor-contracts' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            href="/mentor/contracts"
            on:click|preventDefault={() => setActiveView('mentor-contracts')}
          >
            <FileText class="w-5 h-5"/>
            <span class="font-medium">Contracts</span>
          </a>
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'mentor-submissions' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            href="/mentor/submissions"
            on:click|preventDefault={() => setActiveView('mentor-submissions')}
          >
            <ReceiptText class="w-5 h-5"/>
            <span class="font-medium">Submissions</span>
          </a>
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'mentor-messages' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            href="/mentor/messages"
            on:click|preventDefault={() => setActiveView('mentor-messages')}
          >
            <MessageSquare class="w-5 h-5"/>
            <span class="font-medium">Messages</span>
          </a>
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'mentor-reports' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            href="/mentor/reports"
            on:click|preventDefault={() => setActiveView('mentor-reports')}
          >
            <ChartColumnIncreasing class="w-5 h-5"/>
            <span class="font-medium">Reports</span>
          </a>
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'mentor-profile' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            href="/mentor/profile"
            on:click|preventDefault={() => setActiveView('mentor-profile')}
          >
            <User class="w-5 h-5"/>
            <span class="font-medium">My Profile</span>
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
        <!-- Render Mentor Dashboard with the specific tab -->
        {#if activeView === 'mentor-students' || activeView === 'mentor-tasks' || activeView === 'mentor-submissions' || activeView === 'mentor-messages' || activeView === 'mentor-reports' || activeView === 'mentor-profile'}
          <MentorDashboard initialTab={activeView.replace('mentor-', '')} />
        {:else if activeView === 'mentor-contracts'}
          <Contracts userRole="mentor" />
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
      </div>
    </main>
  </div>
{:else if role === 'admin'}
  <!-- ADMIN LAYOUT -->
  <div class="min-h-screen flex gap-6 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 px-10 py-11 text-white">
    <aside class="w-64 p-6 flex-shrink-0">
      <div class="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-6 shadow-2xl flex flex-col min-h-full">
        <!-- Logo & User Info -->
        <div class="mb-8 text-center">
          <div class="w-16 h-16 bg-gradient-to-r from-red-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Shield class="w-8 h-8 text-white"/>
          </div>
          <h1 class="text-xl font-bold text-white">Admin Portal</h1>
          <p class="text-white/70 text-sm">System Management</p>

          <div class="mt-3 p-2 bg-white/5 rounded-lg border border-white/10">
            {#if user}
              <p class="text-white/80 text-sm font-medium">{user.email}</p>
              <p class="text-white/60 text-xs capitalize">{role} Account</p>
            {:else}
              <p class="text-white/60 text-sm">Loading...</p>
            {/if}
          </div>
        </div>

        <!-- Navigation for Admin -->
        <nav class="space-y-2 flex-1">
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'admin-users' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            href="/admin/users"
            on:click|preventDefault={() => setActiveView('admin-users')}
          >
            <Users class="w-5 h-5"/>
            <span class="font-medium">User Management</span>
          </a>
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'admin-assignments' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            href="/admin/assignments"
            on:click|preventDefault={() => setActiveView('admin-assignments')}
          >
            <User class="w-5 h-5"/>
            <span class="font-medium">Student Assignments</span>
          </a>
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'admin-programs' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            href="/admin/programs"
            on:click|preventDefault={() => setActiveView('admin-programs')}
          >
            <SquareCheckBig class="w-5 h-5"/>
            <span class="font-medium">Programs & Projects</span>
          </a>
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'admin-contracts' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            href="/admin/contracts"
            on:click|preventDefault={() => setActiveView('admin-contracts')}
          >
            <FileText class="w-5 h-5"/>
            <span class="font-medium">Contract Approvals</span>
          </a>
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'admin-reports' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            href="/admin/reports"
            on:click|preventDefault={() => setActiveView('admin-reports')}
          >
            <ChartColumnIncreasing class="w-5 h-5"/>
            <span class="font-medium">Reports & Analytics</span>
          </a>
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'admin-settings' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            href="/admin/settings"
            on:click|preventDefault={() => setActiveView('admin-settings')}
          >
            <Home class="w-5 h-5"/>
            <span class="font-medium">System Settings</span>
          </a>
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'admin-disputes' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            href="/admin/disputes"
            on:click|preventDefault={() => setActiveView('admin-disputes')}
          >
            <ReceiptText class="w-5 h-5"/>
            <span class="font-medium">Disputes & Issues</span>
          </a>
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'admin-applications' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            href="/admin/applications"
            on:click|preventDefault={() => setActiveView('admin-applications')}
          >
            <GraduationCap class="w-5 h-5"/>
            <span class="font-medium">Applications</span>
          </a>
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'admin-profile' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            href="/admin/profile"
            on:click|preventDefault={() => setActiveView('admin-profile')}
          >
            <User class="w-5 h-5"/>
            <span class="font-medium">My Profile</span>
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
        <!-- Render Admin Dashboard with the specific tab -->
        {#if activeView === 'admin-users' || activeView === 'admin-assignments' || activeView === 'admin-programs' || activeView === 'admin-reports' || activeView === 'admin-settings' || activeView === 'admin-disputes' || activeView === 'admin-applications' || activeView === 'admin-profile'}
          <AdminDashboard initialTab={activeView.replace('admin-', '')} />
        {:else if activeView === 'admin-contracts'}
          <Contracts userRole="admin" />
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
      </div>
    </main>
  </div>
{:else}
  <!-- STUDENT LAYOUT -->
  <div class="min-h-screen flex gap-6 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 px-10 py-11 text-white">
    <aside class="w-64 p-6 flex-shrink-0">
      <div class="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-6 shadow-2xl flex flex-col min-h-full">
        <!-- Logo & User Info -->
        <div class="mb-8 text-center">
          <div class="w-16 h-16 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <GraduationCap class="w-8 h-8 text-white"/>
          </div>
          <h1 class="text-xl font-bold text-white">Student Portal</h1>
          <p class="text-white/70 text-sm">Internship Management</p>

          <div class="mt-3 p-2 bg-white/5 rounded-lg border border-white/10">
            {#if user}
              <p class="text-white/80 text-sm font-medium">{user.email}</p>
              <p class="text-white/60 text-xs capitalize">{role} Account</p>
            {:else}
              <p class="text-white/60 text-sm">Loading...</p>
            {/if}
          </div>
        </div>

        <!-- Navigation for Student -->
        <nav class="space-y-2 flex-1">
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'student-tasks' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            href="/student/tasks"
            on:click|preventDefault={() => setActiveView('student-tasks')}
          >
            <SquareCheckBig class="w-5 h-5"/>
            <span class="font-medium">My Tasks</span>
          </a>
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'student-submissions' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            href="/student/submissions"
            on:click|preventDefault={() => setActiveView('student-submissions')}
          >
            <Upload class="w-5 h-5"/>
            <span class="font-medium">Submissions</span>
          </a>
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'student-contracts' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            href="/student/contracts"
            on:click|preventDefault={() => setActiveView('student-contracts')}
          >
            <FileText class="w-5 h-5"/>
            <span class="font-medium">My Contract</span>
          </a>
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'student-progress' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            href="/student/progress"
            on:click|preventDefault={() => setActiveView('student-progress')}
          >
            <TrendingUp class="w-5 h-5"/>
            <span class="font-medium">My Progress</span>
          </a>
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'student-feedback' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            href="/student/feedback"
            on:click|preventDefault={() => setActiveView('student-feedback')}
          >
            <ChartColumnIncreasing class="w-5 h-5"/>
            <span class="font-medium">Feedback</span>
          </a>
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'student-messages' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            href="/student/messages"
            on:click|preventDefault={() => setActiveView('student-messages')}
          >
            <MessageSquare class="w-5 h-5"/>
            <span class="font-medium">Messages</span>
          </a>
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'student-profile' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            href="/student/profile"
            on:click|preventDefault={() => setActiveView('student-profile')}
          >
            <User class="w-5 h-5"/>
            <span class="font-medium">My Profile</span>
          </a>
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'student-resources' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            href="/student/resources"
            on:click|preventDefault={() => setActiveView('student-resources')}
          >
            <BookOpen class="w-5 h-5"/>
            <span class="font-medium">Resources</span>
          </a>
          <a
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {activeView === 'student-schedule' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            href="/student/schedule"
            on:click|preventDefault={() => setActiveView('student-schedule')}
          >
            <Calendar class="w-5 h-5"/>
            <span class="font-medium">Schedule</span>
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
        <!-- Render Student Dashboard with the specific tab -->
        {#if activeView === 'student-tasks' || activeView === 'student-submissions' || activeView === 'student-progress' || activeView === 'student-feedback' || activeView === 'student-messages' || activeView === 'student-profile' || activeView === 'student-resources' || activeView === 'student-schedule'}
          <StudentDashboard initialTab={activeView.replace('student-', '')} />
        {:else if activeView === 'student-contracts'}
          <Contracts userRole="student" />
        {:else if activeView === 'dashboard'}
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
      <!-- <div class="absolute bottom-6 right-6 z-50">
        <DebugInfo />
      </div> -->
    </div>
  </main>
  </div>
{/if}
