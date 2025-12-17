<script>
  import { onMount } from 'svelte';
  import apiClient from '../../api/client.js';
  import { userStore } from '../../stores/userStore.js';

  let currentUser = null;
  let companyStats = null;
  let users = [];
  let students = [];
  let loading = true;
  let error = '';

  let activeTab = 'overview';

  onMount(async () => {
    try {
      currentUser = await userStore.getCurrentUser();
      
      if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = '/dashboard';
        return;
      }

      await loadCompanyData();
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  });

  async function loadCompanyData() {
    try {
      const [statsData, usersData, studentsData] = await Promise.all([
        apiClient.getCompanyStats(currentUser.company_id),
        apiClient.getUsers(),
        apiClient.getStudents(),
      ]);

      companyStats = statsData.stats;
      users = usersData;
      students = studentsData;
    } catch (err) {
      error = 'Failed to load company data: ' + err.message;
    }
  }

  function goToDashboard() {
    window.location.href = '/dashboard';
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold text-white mb-2">Company Management</h1>
          <p class="text-purple-200">Manage your organization's users, students, and settings</p>
        </div>
        <button
          on:click={goToDashboard}
          class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>

    {#if loading}
      <div class="flex justify-center items-center h-64">
        <div class="text-white text-xl">Loading company data...</div>
      </div>
    {:else if error}
      <div class="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
        <p class="text-red-200">{error}</p>
      </div>
    {:else}
      <!-- Tabs -->
      <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-2 mb-6 border border-white/20">
        <div class="flex gap-2">
          <button
            class="flex-1 py-3 px-6 rounded-lg transition-all {activeTab === 'overview' ? 'bg-purple-600 text-white' : 'text-purple-200 hover:bg-white/10'}"
            on:click={() => activeTab = 'overview'}
          >
            📊 Overview
          </button>
          <button
            class="flex-1 py-3 px-6 rounded-lg transition-all {activeTab === 'users' ? 'bg-purple-600 text-white' : 'text-purple-200 hover:bg-white/10'}"
            on:click={() => activeTab = 'users'}
          >
            👥 Users ({users.length})
          </button>
          <button
            class="flex-1 py-3 px-6 rounded-lg transition-all {activeTab === 'students' ? 'bg-purple-600 text-white' : 'text-purple-200 hover:bg-white/10'}"
            on:click={() => activeTab = 'students'}
          >
            🎓 Students ({students.length})
          </button>
        </div>
      </div>

      <!-- Overview Tab -->
      {#if activeTab === 'overview'}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <!-- Total Users Card -->
          <div class="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 border border-white/20 shadow-xl">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-white/80 text-sm font-medium">Total Users</h3>
              <span class="text-3xl">👥</span>
            </div>
            <p class="text-4xl font-bold text-white">{companyStats?.totalUsers || 0}</p>
          </div>

          <!-- Admins Card -->
          <div class="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-6 border border-white/20 shadow-xl">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-white/80 text-sm font-medium">Admins</h3>
              <span class="text-3xl">👑</span>
            </div>
            <p class="text-4xl font-bold text-white">{companyStats?.admins || 0}</p>
          </div>

          <!-- Mentors Card -->
          <div class="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-6 border border-white/20 shadow-xl">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-white/80 text-sm font-medium">Mentors</h3>
              <span class="text-3xl">🎯</span>
            </div>
            <p class="text-4xl font-bold text-white">{companyStats?.mentors || 0}</p>
          </div>

          <!-- Students Card -->
          <div class="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 border border-white/20 shadow-xl">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-white/80 text-sm font-medium">Students</h3>
              <span class="text-3xl">🎓</span>
            </div>
            <p class="text-4xl font-bold text-white">{companyStats?.students || 0}</p>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h2 class="text-2xl font-bold text-white mb-4">Quick Actions</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button class="p-4 bg-purple-600/30 rounded-xl hover:bg-purple-600/50 transition-all border border-purple-400/30">
              <span class="text-2xl mb-2 block">📋</span>
              <p class="text-white font-semibold">Assign Students</p>
              <p class="text-purple-200 text-sm">Match students with mentors</p>
            </button>
            <button class="p-4 bg-blue-600/30 rounded-xl hover:bg-blue-600/50 transition-all border border-blue-400/30">
              <span class="text-2xl mb-2 block">📊</span>
              <p class="text-white font-semibold">View Reports</p>
              <p class="text-purple-200 text-sm">Company analytics</p>
            </button>
            <button class="p-4 bg-green-600/30 rounded-xl hover:bg-green-600/50 transition-all border border-green-400/30">
              <span class="text-2xl mb-2 block">⚙️</span>
              <p class="text-white font-semibold">Settings</p>
              <p class="text-purple-200 text-sm">Company configuration</p>
            </button>
          </div>
        </div>
      {/if}

      <!-- Users Tab -->
      {#if activeTab === 'users'}
        <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h2 class="text-2xl font-bold text-white mb-4">All Users</h2>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-white/20">
                  <th class="text-left py-3 px-4 text-purple-200 font-semibold">Name</th>
                  <th class="text-left py-3 px-4 text-purple-200 font-semibold">Email</th>
                  <th class="text-left py-3 px-4 text-purple-200 font-semibold">Role</th>
                  <th class="text-left py-3 px-4 text-purple-200 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody>
                {#each users as user}
                  <tr class="border-b border-white/10 hover:bg-white/5">
                    <td class="py-3 px-4 text-white">{user.full_name}</td>
                    <td class="py-3 px-4 text-purple-200">{user.email}</td>
                    <td class="py-3 px-4">
                      <span class="px-3 py-1 rounded-full text-xs font-semibold
                        {user.role === 'admin' ? 'bg-red-500/30 text-red-200' : 
                         user.role === 'mentor' ? 'bg-green-500/30 text-green-200' : 
                         'bg-blue-500/30 text-blue-200'}">
                        {user.role}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-purple-200">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}

      <!-- Students Tab -->
      {#if activeTab === 'students'}
        <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h2 class="text-2xl font-bold text-white mb-4">All Students</h2>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-white/20">
                  <th class="text-left py-3 px-4 text-purple-200 font-semibold">Name</th>
                  <th class="text-left py-3 px-4 text-purple-200 font-semibold">Email</th>
                  <th class="text-left py-3 px-4 text-purple-200 font-semibold">Mentor</th>
                  <th class="text-left py-3 px-4 text-purple-200 font-semibold">Contract Hours</th>
                  <th class="text-left py-3 px-4 text-purple-200 font-semibold">Period</th>
                </tr>
              </thead>
              <tbody>
                {#each students as student}
                  <tr class="border-b border-white/10 hover:bg-white/5">
                    <td class="py-3 px-4 text-white">{student.full_name}</td>
                    <td class="py-3 px-4 text-purple-200">{student.student_email}</td>
                    <td class="py-3 px-4 text-purple-200">
                      {student.mentor_email || 'Unassigned'}
                    </td>
                    <td class="py-3 px-4 text-white">{student.contract_hours}h</td>
                    <td class="py-3 px-4 text-purple-200">
                      {student.start_date ? new Date(student.start_date).toLocaleDateString() : 'N/A'}
                      {student.end_date ? ' - ' + new Date(student.end_date).toLocaleDateString() : ''}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>
