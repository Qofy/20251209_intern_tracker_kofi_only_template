<script>
  console.log('_layout.svelte: Script is executing!');
  import '../app.css';
  import { onMount } from 'svelte';
  import { goto, isActive } from '@roxi/routify';
  import {
    BarChart3,
    Calendar,
    CheckSquare,
    Clock,
    FileArchive,
    FileSignature,
    FileText,
    Home,
    Settings,
    Users
  } from 'lucide-svelte';
  import { userStore, isMentor, isStudent, isAdmin } from '../stores/userStore';
  import LogoutButton from '../lib/components/LogoutButton.svelte';
  import StudentSelector from '../lib/components/layout/StudentSelector.svelte';
  import DebugInfo from '../lib/components/DebugInfo.svelte';

  const navItems = {
    all: [
      { title: 'Dashboard', url: '/dashboard', icon: Home },
      { title: 'Daily Tracker', url: '/daily-tracker', icon: Clock },
      { title: 'Schedule', url: '/schedule-manager', icon: Calendar },
      { title: 'Tasks', url: '/tasks', icon: CheckSquare },
      { title: 'Reports', url: '/reports', icon: BarChart3 }
    ],
    mentor: [
      { title: 'Proof & Approval', url: '/proof-approval', icon: FileText },
      { title: 'Student Contracts', url: '/students', icon: Users },
      { title: 'Contract Manager', url: '/contact-manager', icon: FileSignature }
    ],
    student: [
      { title: 'Claim Hours', url: '/claim-hours', icon: Clock },
      { title: 'My Documents', url: '/my-documents', icon: FileArchive }
    ],
    admin: [
      { title: 'Student Management', url: '/admin-students', icon: Users },
      { title: 'System Overview', url: '/admin-overview', icon: Settings },
      { title: 'Contract Manager', url: '/contact-manager', icon: FileSignature }
    ]
  };

  $: user = $userStore.user;
  $: role = $userStore.role;
  $: isLoading = $userStore.isLoading;

  $: visibleNavItems = (() => {
    const items = [...navItems.all];
    if ($isMentor) items.push(...navItems.mentor);
    if ($isStudent) items.push(...navItems.student);
    if ($isAdmin) items.push(...navItems.admin);

    // Remove duplicates
    const uniqueItems = items.reduce((acc, current) => {
      if (!acc.find(item => item.title === current.title)) {
        acc.push(current);
      }
      return acc;
    }, []);
    return uniqueItems;
  })();

  onMount(async () => {
    console.log('_layout onMount: START');
    console.log('_layout onMount: localStorage.auth_token =', localStorage.getItem('auth_token'));
    console.log('_layout onMount: localStorage.offline_role =', localStorage.getItem('offline_role'));
    console.log('_layout onMount: current userStore =', $userStore);

    // Always try to load user on mount if not logged in
    if (!$userStore.user) {
      console.log('_layout: Loading user on mount...');
      await userStore.loadUserAndRole();
      console.log('_layout: User loaded, user =', $userStore.user);
    } else {
      console.log('_layout: User already loaded, skipping loadUserAndRole');
    }

    // Check if we need to redirect after loading completes
    if (!$userStore.user) {
      console.log('_layout: No user found, redirecting to login');
      $goto('/login');
    } else {
      console.log('_layout: User found, staying on current page');
    }
  });

  // Check if current path is login page
  $: isLoginPage = typeof window !== 'undefined' && window.location.pathname === '/login';

  $: {
    console.log('_layout: isLoginPage =', isLoginPage);
    console.log('_layout: pathname =', typeof window !== 'undefined' ? window.location.pathname : 'SSR');
    console.log('_layout: userStore =', $userStore);
  }
</script>

{#if isLoginPage}
  <!-- Login page - just show content without layout -->
  <slot />
{:else if isLoading}
  <!-- Loading state -->
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
    <div class="text-white text-xl">Loading...</div>
  </div>
{:else}
  <!-- Main layout -->
  <div class="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex">
    <!-- Sidebar -->
    <aside class="w-64 bg-gradient-to-b from-purple-900/40 to-purple-950/40 backdrop-blur-md border-r border-white/10 shadow-2xl flex flex-col">
      <!-- Logo and branding -->
      <div class="p-6 border-b border-white/10">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br from-orange-400 to-orange-500">
            <Clock class="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 class="text-lg font-bold text-white">WorkTracker</h1>
            <p class="text-xs text-white/60">Intern Hours Manager</p>
          </div>
        </div>

        {#if user}
          <div class="p-3 bg-white/10 rounded-lg border border-white/20 backdrop-blur-sm">
            <p class="text-sm font-semibold text-white truncate">
              {user.full_name || user.email}
            </p>
            <p class="text-xs text-white/60 capitalize">
              {role} Account
            </p>
          </div>
        {/if}
      </div>

      <!-- Student Selector -->
      <div class="px-4 py-3 border-b border-white/10">
        <StudentSelector />
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {#if !isLoading}
          {#each visibleNavItems as item (item.title)}
            <a
              href={item.url}
              on:click|preventDefault={() => $goto(item.url)}
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 {$isActive(item.url)
                ? 'bg-white/20 text-white shadow-md backdrop-blur-sm'
                : 'text-white/80 hover:bg-white/10 hover:text-white'}"
            >
              <svelte:component this={item.icon} class="w-5 h-5" />
              <span class="font-medium text-sm">{item.title}</span>
            </a>
          {/each}
        {/if}
      </nav>

      <!-- Logout Button -->
      {#if user}
        <div class="p-4 border-t border-white/10">
          <LogoutButton />
        </div>
      {/if}
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-auto">
      <div class="p-8">
        <slot />
      </div>
    </main>

    <!-- Floating Action Buttons -->
    <div class="fixed bottom-6 right-6 flex flex-col gap-3">
      <button class="w-12 h-12 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110">
        <Settings class="w-6 h-6 text-white" />
      </button>
      <button class="w-12 h-12 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110">
        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    </div>
  </div>

  <!-- Debug Info -->
  <DebugInfo />
{/if}
