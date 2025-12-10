<script>
  import { userStore, isMentor, isStudent } from '../../stores/userStore';
  import { AlertTriangle } from 'lucide-svelte';
</script>

<div class="max-w-4xl">
  <!-- Mentor Dashboard -->
  {#if $isMentor}
    <div class="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-xl">
      <h1 class="text-2xl font-bold text-white mb-3">Mentor Dashboard</h1>
      <p class="text-white/70 text-sm mb-6">
        Welcome, Select a student to view their progress.
      </p>

      <div class="bg-blue-500/20 border border-blue-400/30 rounded-xl p-4 backdrop-blur-sm">
        <p class="text-blue-100 text-sm">
          Please select a student from the sidebar to view their dashboard.
        </p>
      </div>
    </div>

  <!-- Student Dashboard -->
  {:else if $isStudent}
    <div class="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-xl">
      <div class="flex flex-col items-center justify-center py-12">
        <div class="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle class="w-8 h-8 text-orange-400" />
        </div>
        <h2 class="text-xl font-bold text-white mb-2">No student profile found.</h2>
        <p class="text-white/60 text-sm text-center max-w-md">
          Please contact your mentor to set up your profile.
        </p>
      </div>
    </div>

  <!-- Admin Dashboard -->
  {:else}
    <div class="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-xl">
      <h1 class="text-2xl font-bold text-white mb-3">Admin Dashboard</h1>
      <p class="text-white/70 text-sm mb-6">
        System Overview and Management
      </p>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Total Students -->
        <div class="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <p class="text-white/70 text-sm font-medium">Total Students</p>
          <p class="text-3xl font-bold text-white mt-2">
            {$userStore.allStudents?.length || 0}
          </p>
        </div>

        <!-- Total Mentors -->
        <div class="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <p class="text-white/70 text-sm font-medium">Total Mentors</p>
          <p class="text-3xl font-bold text-white mt-2">-</p>
        </div>

        <!-- Active Contracts -->
        <div class="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <p class="text-white/70 text-sm font-medium">Active Contracts</p>
          <p class="text-3xl font-bold text-white mt-2">-</p>
        </div>
      </div>
    </div>
  {/if}
</div>
