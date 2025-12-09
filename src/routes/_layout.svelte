<script>
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
    await userStore.loadUserAndRole();

    if (!$userStore.user) {
      $goto('/login');
    }
  });

  // Check if current path is login page
  $: isLoginPage = typeof window !== 'undefined' && window.location.pathname === '/login';
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
  <div class="min-h-screen relative overflow-hidden">
    <!-- Background gradients -->
    <div class="fixed inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      <div class="absolute inset-0 bg-gradient-to-tr from-cyan-400/20 via-transparent to-emerald-400/20"></div>
      <div class="absolute top-20 left-20 w-96 h-96 bg-blue-400/30 rounded-full blur-3xl"></div>
      <div class="absolute bottom-20 right-20 w-80 h-80 bg-purple-400/30 rounded-full blur-3xl"></div>
      <div class="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-400/20 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
    </div>

    <div class="relative z-10 flex min-h-screen">
      <!-- Sidebar -->
      <aside class="w-64 p-6">
        <div class="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-6 shadow-2xl h-full flex flex-col">
          <!-- Logo and user info -->
          <div class="mb-8 text-center">
            <div class="w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Clock class="w-8 h-8 text-white" />
            </div>
            <h1 class="text-xl font-bold text-white">WorkTracker</h1>
            <p class="text-white/70 text-sm">Intern Hours Manager</p>
            {#if user}
              <div class="mt-3 p-2 bg-white/5 rounded-lg border border-white/10">
                <p class="text-white/80 text-sm font-medium">
                  {user.full_name || user.email}
                </p>
                <p class="text-white/60 text-xs capitalize">
                  {role} Account
                </p>
              </div>
            {/if}
          </div>

          <!-- Student Selector -->
          <StudentSelector />

          <!-- Navigation -->
          <nav class="space-y-2 flex-1">
            {#if !isLoading}
              {#each visibleNavItems as item (item.title)}
                <a
                  href={item.url}
                  on:click|preventDefault={() => $goto(item.url)}
                  class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 {$isActive(item.url)
                    ? 'bg-white/20 text-white border border-white/30 shadow-lg'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'}"
                >
                  <svelte:component this={item.icon} class="w-5 h-5" />
                  <span class="font-medium">{item.title}</span>
                </a>
              {/each}
            {/if}
          </nav>

          <!-- Logout Button -->
          {#if user}
            <div class="mt-4 pt-4 border-t border-white/20">
              <LogoutButton />
            </div>
          {/if}
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 p-6">
        <div class="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl min-h-full overflow-auto">
          <slot />
        </div>
      </main>
    </div>

    <!-- Debug Info -->
    <DebugInfo />
  </div>
{/if}
