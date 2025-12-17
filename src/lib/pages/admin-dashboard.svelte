<script>
  import { onMount } from 'svelte';
  import { User, Student, Task, TimeEntry, Project } from '../../entities/all';
  import { userStore } from '../../stores/userStore';
  import Button from '$lib/components/ui/button.svelte';
  import Input from '$lib/components/ui/input.svelte';
  import Dialog from '$lib/components/ui/dialog.svelte';
  import {
    Users, UserPlus, UserCog, Settings, Shield,
    FileText, TrendingUp, AlertTriangle, CheckCircle,
    Search, Edit2, Trash2, Mail, Clock, Calendar,
    BarChart3, PieChart, Activity, UserCheck,
    FolderOpen, GitBranch
  } from 'lucide-svelte';

  $: user = $userStore.user;

  // Accept initialTab prop from parent component
  export let initialTab = 'users';

  // State variables
  let activeTab = initialTab;

  // Update activeTab when initialTab changes
  $: activeTab = initialTab;

  let allUsers = [];
  let allStudents = [];
  let allMentors = [];
  let allTasks = [];
  let allTimeEntries = [];
  let allProjects = [];
  let isLoading = false;
  let searchQuery = '';

  // Modal states
  let showCreateUserModal = false;
  let showAssignModal = false;
  let showCreateContractModal = false;
  let showSettingsModal = false;
  let showCreateProjectModal = false;

  // Form data
  let newUser = {
    email: '',
    password: '',
    full_name: '',
    role: 'student'
  };

  let newContract = {
    student_email: '',
    full_name: '',
    mentor_email: '',
    contract_hours: 600,
    start_date: '',
    end_date: '',
    department: '',
    position: ''
  };

  let assignmentData = {
    studentId: null,
    mentorEmail: ''
  };

  let newProject = {
    name: '',
    description: '',
    type: 'program', // program or project
    start_date: '',
    end_date: '',
    status: 'active',
    assigned_students: []
  };

  // Stats
  let stats = {
    totalUsers: 0,
    totalStudents: 0,
    totalMentors: 0,
    totalProjects: 0,
    pendingApprovals: 0,
    activeInterns: 0,
    systemHealth: 100
  };

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    isLoading = true;
    try {
      allUsers = await User.list();
      allStudents = await Student.list();
      allMentors = allUsers.filter(u => u.role === 'mentor');
      allTasks = await Task.list();
      allTimeEntries = await TimeEntry.list();
      allProjects = await Project.list();

      // Calculate stats
      stats.totalUsers = allUsers.length;
      stats.totalStudents = allStudents.length;
      stats.totalMentors = allMentors.length;
      stats.totalProjects = allProjects.length;
      stats.pendingApprovals = allTimeEntries.filter(e => e.status === 'draft').length;
      stats.activeInterns = allStudents.filter(s => s.contract_hours > 0).length;

      console.log('[Admin Dashboard] Data loaded:', stats);
    } catch (error) {
      console.error('[Admin Dashboard] Error loading data:', error);
    }
    isLoading = false;
  }

  async function createUser() {
    try {
      await User.create(newUser);
      alert('User created successfully!');
      showCreateUserModal = false;
      newUser = { email: '', password: '', full_name: '', role: 'student' };
      await loadData();
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user');
    }
  }

  async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await User.delete(userId);
      await loadData();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  }

  async function createContract() {
    try {
      await Student.create(newContract);
      alert('Contract created successfully!');
      showCreateContractModal = false;
      newContract = {
        student_email: '',
        full_name: '',
        mentor_email: '',
        contract_hours: 600,
        start_date: '',
        end_date: '',
        department: '',
        position: ''
      };
      await loadData();
    } catch (error) {
      console.error('Error creating contract:', error);
      alert('Failed to create contract');
    }
  }

  async function assignStudentToMentor() {
    try {
      const student = allStudents.find(s => s.id === assignmentData.studentId);
      if (!student) return;

      await Student.update(student.id, {
        mentor_email: assignmentData.mentorEmail
      });

      alert('Student assigned to mentor successfully!');
      showAssignModal = false;
      assignmentData = { studentId: null, mentorEmail: '' };
      await loadData();
    } catch (error) {
      console.error('Error assigning student:', error);
      alert('Failed to assign student');
    }
  }

  async function createProject() {
    try {
      await Project.create(newProject);
      alert(`${newProject.type === 'program' ? 'Program' : 'Project'} created successfully!`);
      showCreateProjectModal = false;
      newProject = {
        name: '',
        description: '',
        type: 'program',
        start_date: '',
        end_date: '',
        status: 'active',
        assigned_students: []
      };
      await loadData();
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project');
    }
  }

  async function deleteProject(projectId) {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await Project.delete(projectId);
      await loadData();
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project');
    }
  }

  function getStudentsByMentor(mentorEmail) {
    return allStudents.filter(s => s.mentor_email === mentorEmail);
  }

  function getUnassignedStudents() {
    return allStudents.filter(s => !s.mentor_email || s.mentor_email === '');
  }

  $: filteredUsers = allUsers.filter(u =>
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
</script>

<!-- Admin Dashboard Content (embedded version) -->
<div class="p-8">
  <!-- Header -->
  <div class="mb-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p class="text-white/70">Full system access - manage all users, students, and system settings</p>
      </div>
      <Button
        on:click={loadData}
        class="bg-blue-500 hover:bg-blue-600 text-white flex h-10 px-4 items-center rounded-md"
        disabled={isLoading}
      >
        <Activity class="w-5 h-5 mr-2 {isLoading ? 'animate-spin' : ''}" />
        {isLoading ? 'Loading...' : 'Reload All Data'}
      </Button>
    </div>
  </div>

  <!-- Stats Overview -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
      <div class="flex items-center justify-between mb-2">
        <Users class="w-8 h-8 text-blue-400" />
        <span class="text-3xl font-bold text-white">{stats.totalUsers}</span>
      </div>
      <p class="text-white/70 text-sm">Total Users</p>
    </div>

    <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
      <div class="flex items-center justify-between mb-2">
        <UserCheck class="w-8 h-8 text-green-400" />
        <span class="text-3xl font-bold text-white">{stats.activeInterns}</span>
      </div>
      <p class="text-white/70 text-sm">Active Interns</p>
    </div>

    <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
      <div class="flex items-center justify-between mb-2">
        <Clock class="w-8 h-8 text-yellow-400" />
        <span class="text-3xl font-bold text-white">{stats.pendingApprovals}</span>
      </div>
      <p class="text-white/70 text-sm">Pending Approvals</p>
    </div>

    <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
      <div class="flex items-center justify-between mb-2">
        <Activity class="w-8 h-8 text-purple-400" />
        <span class="text-3xl font-bold text-white">{stats.systemHealth}%</span>
      </div>
      <p class="text-white/70 text-sm">System Health</p>
    </div>
  </div>

  <!-- Content Area -->
  <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 mt-8">

    {#if activeTab === 'users'}
      <!-- User Management -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-white">User Management</h2>
        <div class="flex gap-2">
          <Button
            on:click={loadData}
            class="bg-blue-500 hover:bg-blue-600 text-white flex h-10 px-2 items-center rounded-md"
            disabled={isLoading}
          >
            <Activity class="w-4 h-4 mr-2 {isLoading ? 'animate-spin' : ''}" />
            {isLoading ? 'Loading...' : 'Reload Data'}
          </Button>
          <Button
            on:click={() => showCreateUserModal = true}
            class="bg-green-500 hover:bg-green-600 text-white flex h-10 px-2 items-center rounded-md"
          >
            <UserPlus class="w-4 h-4 mr-2" />
            Create User
          </Button>
        </div>
      </div>

      <!-- Search -->
      <div class="mb-6">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50"/>
          <Input
            bind:value={searchQuery}
            placeholder="Search users by name or email..."
            class="pl-10 bg-white/5 border-white/20 text-white h-10 px-2 rounded-sm"
          />
        </div>
      </div>

      {#if isLoading}
        <div class="text-center py-8">
          <Clock class="w-12 h-12 text-white/50 mx-auto animate-spin" />
          <p class="text-white/70 mt-4">Loading users...</p>
        </div>
      {:else}
        <div class="space-y-3">
          {#each filteredUsers as user}
            <div class="bg-white/5 rounded-xl border border-white/20 p-4 flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Users class="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 class="text-white font-semibold">{user.full_name || user.email}</h3>
                  <p class="text-white/60 text-sm">{user.email}</p>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <span class="px-3 py-1 rounded-full text-xs font-semibold capitalize {user.role === 'admin' ? 'bg-red-500/20 text-red-400' : user.role === 'mentor' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}">
                  {user.role}
                </span>
                <Button
                  on:click={() => deleteUser(user.id)}
                  variant="ghost"
                  class="text-red-400 hover:text-red-300"
                >
                  <Trash2 class="w-4 h-4" />
                </Button>
              </div>
            </div>
          {/each}
        </div>
      {/if}

    {:else if activeTab === 'assignments'}
      <!-- Student Assignments -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-white">Student Assignments</h2>
        <div class="flex gap-2">
          <Button
            on:click={loadData}
            class="bg-blue-500 hover:bg-blue-600 text-white flex h-10 px-2 items-center rounded-md"
            disabled={isLoading}
          >
            <Activity class="w-4 h-4 mr-2 {isLoading ? 'animate-spin' : ''}" />
            {isLoading ? 'Loading...' : 'Reload Data'}
          </Button>
          <Button
            on:click={() => showAssignModal = true}
            class="bg-purple-500 hover:bg-purple-600 text-white flex h-10 px-2 rounded-md items-center"
          >
            <UserCog class="w-4 h-4 mr-2" />
            Assign Student
          </Button>
        </div>
      </div>

      <!-- Unassigned Students -->
      {#if getUnassignedStudents().length > 0}
        <div class="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <h3 class="text-yellow-400 font-semibold mb-2 flex items-center gap-2">
            <AlertTriangle class="w-5 h-5" />
            Unassigned Students ({getUnassignedStudents().length})
          </h3>
          <p class="text-white/70 text-sm">These students need to be assigned to a mentor</p>
        </div>
      {/if}

      <!-- Mentor List with Assigned Students -->
      <div class="space-y-4">
        {#each allMentors as mentor}
          <div class="bg-white/5 rounded-xl border border-white/20 p-6">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <Shield class="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 class="text-lg font-bold text-white">{mentor.full_name || mentor.email}</h3>
                  <p class="text-white/60 text-sm">{mentor.email}</p>
                </div>
              </div>
              <span class="px-3 py-1 rounded-full text-sm bg-blue-500/20 text-blue-400">
                {getStudentsByMentor(mentor.email).length} Students
              </span>
            </div>

            {#if getStudentsByMentor(mentor.email).length > 0}
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {#each getStudentsByMentor(mentor.email) as student}
                  <div class="bg-white/5 rounded-lg p-3 border border-white/10">
                    <p class="text-white text-sm font-medium">{student.full_name}</p>
                    <p class="text-white/60 text-xs">{student.student_email}</p>
                  </div>
                {/each}
              </div>
            {:else}
              <p class="text-white/50 text-sm text-center py-2">No students assigned</p>
            {/if}
          </div>
        {/each}
      </div>

    {:else if activeTab === 'programs'}
      <!-- Programs & Projects -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-white">Internship Programs & Projects</h2>
        <div class="flex gap-2">
          <Button
            on:click={loadData}
            class="bg-blue-500 hover:bg-blue-600 text-white flex h-10 px-2 items-center rounded-md"
            disabled={isLoading}
          >
            <Activity class="w-4 h-4 mr-2 {isLoading ? 'animate-spin' : ''}" />
            {isLoading ? 'Loading...' : 'Reload Data'}
          </Button>
          <Button
            on:click={() => showCreateProjectModal = true}
            class="bg-green-500 hover:bg-green-600 text-white h-10 rounded-md flex items-center px-2"
          >
            <FolderOpen class="w-4 h-4 mr-2" />
            New Program
          </Button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div class="bg-white/5 rounded-xl border border-white/20 p-6">
          <GitBranch class="w-8 h-8 text-blue-400 mb-3" />
          <h3 class="text-white font-bold text-lg mb-2">Total Projects</h3>
          <p class="text-3xl font-bold text-white">{stats.totalProjects}</p>
        </div>

        <div class="bg-white/5 rounded-xl border border-white/20 p-6">
          <Activity class="w-8 h-8 text-green-400 mb-3" />
          <h3 class="text-white font-bold text-lg mb-2">Active</h3>
          <p class="text-3xl font-bold text-white">{allProjects.filter(p => p.status === 'active').length}</p>
        </div>

        <div class="bg-white/5 rounded-xl border border-white/20 p-6">
          <CheckCircle class="w-8 h-8 text-purple-400 mb-3" />
          <h3 class="text-white font-bold text-lg mb-2">Completed</h3>
          <p class="text-3xl font-bold text-white">{allProjects.filter(p => p.status === 'completed').length}</p>
        </div>
      </div>

      <div class="mt-6 bg-white/5 rounded-xl border border-white/20 p-6">
        <h3 class="text-white font-bold mb-4">All Programs & Projects</h3>
        {#if allProjects.length === 0}
          <div class="text-center py-8">
            <FolderOpen class="w-16 h-16 text-white/30 mx-auto mb-4" />
            <p class="text-white/70">No programs or projects yet</p>
            <Button
              on:click={() => showCreateProjectModal = true}
              class="mt-4 bg-green-500 hover:bg-green-600 text-white h-10  px-2 rounded-md"
            >
              Create Your First Program
            </Button>
          </div>
        {:else}
          <div class="space-y-3">
            {#each allProjects as project}
              <div class="bg-white/5 rounded-xl border border-white/20 p-4 flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-2">
                    <h4 class="text-white font-bold text-lg">{project.name}</h4>
                    <span class="px-3 py-1 rounded-full text-xs capitalize {project.status === 'active' ? 'bg-green-500/20 text-green-400' : project.status === 'completed' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'}">
                      {project.status}
                    </span>
                    <span class="px-3 py-1 rounded-full text-xs capitalize bg-blue-500/20 text-blue-400">
                      {project.type}
                    </span>
                  </div>
                  {#if project.description}
                    <p class="text-white/70 text-sm mb-2">{project.description}</p>
                  {/if}
                  <div class="flex items-center gap-4 text-xs text-white/50">
                    {#if project.start_date}
                      <span>Start: {project.start_date}</span>
                    {/if}
                    {#if project.end_date}
                      <span>End: {project.end_date}</span>
                    {/if}
                  </div>
                </div>
                <div class="flex gap-2">
                  <Button
                    on:click={() => deleteProject(project.id)}
                    variant="ghost"
                    class="text-red-400 hover:text-red-300 h-8 px-2"
                  >
                    <Trash2 class="w-4 h-4" />
                  </Button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

    {:else if activeTab === 'reports'}
      <!-- Reports & Analytics -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-white">Reports & Analytics</h2>
        <Button class="bg-blue-500 hover:bg-blue-600 text-white flex h-10 items-center rounded-md px-2">
          <FileText class="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div class="bg-white/5 rounded-xl border border-white/20 p-6">
          <BarChart3 class="w-8 h-8 text-blue-400 mb-3" />
          <h3 class="text-white font-bold text-lg mb-2">Hours Analytics</h3>
          <p class="text-white/70 text-sm mb-4">Total approved hours across all students</p>
          <p class="text-3xl font-bold text-white">2,450h</p>
        </div>

        <div class="bg-white/5 rounded-xl border border-white/20 p-6">
          <PieChart class="w-8 h-8 text-purple-400 mb-3" />
          <h3 class="text-white font-bold text-lg mb-2">Completion Rate</h3>
          <p class="text-white/70 text-sm mb-4">Average across all active interns</p>
          <p class="text-3xl font-bold text-white">68%</p>
        </div>
      </div>

      <div class="bg-white/5 rounded-xl border border-white/20 p-6">
        <h3 class="text-white font-bold mb-4">System Reports</h3>
        <div class="space-y-3">
          <button class="w-full text-left p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all">
            <h4 class="text-white font-semibold">Weekly Activity Report</h4>
            <p class="text-white/60 text-sm">Overview of user activity for the past week</p>
          </button>
          <button class="w-full text-left p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all">
            <h4 class="text-white font-semibold">Monthly Performance Report</h4>
            <p class="text-white/60 text-sm">Detailed performance metrics for all interns</p>
          </button>
          <button class="w-full text-left p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all">
            <h4 class="text-white font-semibold">Mentor Evaluation Report</h4>
            <p class="text-white/60 text-sm">Mentor performance and student feedback</p>
          </button>
        </div>
      </div>

    {:else if activeTab === 'settings'}
      <!-- System Settings -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-white">System Settings & Permissions</h2>
      </div>

      <div class="space-y-6">
        <div class="bg-white/5 rounded-xl border border-white/20 p-6">
          <h3 class="text-white font-bold mb-4 flex items-center gap-2">
            <Settings class="w-5 h-5" />
            General Settings
          </h3>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-white font-medium">Default Contract Hours</p>
                <p class="text-white/60 text-sm">Standard hours for new contracts</p>
              </div>
              <Input type="number" value="600" class="w-24 bg-white/5 border-white/20 text-white" />
            </div>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-white font-medium">Auto-Approval Threshold</p>
                <p class="text-white/60 text-sm">Hours limit for automatic approval</p>
              </div>
              <Input type="number" value="8" class="w-24 bg-white/5 border-white/20 text-white" />
            </div>
          </div>
        </div>

        <div class="bg-white/5 rounded-xl border border-white/20 p-6">
          <h3 class="text-white font-bold mb-4 flex items-center gap-2">
            <Shield class="w-5 h-5" />
            Security & Permissions
          </h3>
          <div class="space-y-3">
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked class="w-4 h-4" />
              <span class="text-white">Require email verification for new accounts</span>
            </label>
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked class="w-4 h-4" />
              <span class="text-white">Enable two-factor authentication</span>
            </label>
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" class="w-4 h-4" />
              <span class="text-white">Allow students to delete their own time entries</span>
            </label>
          </div>
        </div>

        <div class="bg-white/5 rounded-xl border border-white/20 p-6">
          <h3 class="text-white font-bold mb-4">Notification Settings</h3>
          <p class="text-white/70 text-sm">Configure system-wide notification preferences</p>
          <Button class="mt-4 bg-blue-500 hover:bg-blue-600 text-white flex h-10 items-center px-2 rounded-md">
            <Mail class="w-4 h-4 mr-2" />
            Configure Notifications
          </Button>
        </div>
      </div>

    {:else if activeTab === 'disputes'}
      <!-- Disputes & Issues -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-white">Disputes & Issues</h2>
      </div>

      <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mb-6">
        <div class="flex items-center gap-3">
          <AlertTriangle class="w-6 h-6 text-yellow-400" />
          <div>
            <h3 class="text-yellow-400 font-semibold">3 Open Disputes</h3>
            <p class="text-white/70 text-sm">Requiring immediate attention</p>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <div class="bg-white/5 rounded-xl border border-white/20 p-6">
          <div class="flex items-start justify-between mb-3">
            <div>
              <h3 class="text-white font-bold">Hour Approval Dispute</h3>
              <p class="text-white/60 text-sm mt-1">Student: John Doe | Mentor: Jane Smith</p>
            </div>
            <span class="px-3 py-1 rounded-full text-xs bg-red-500/20 text-red-400">High Priority</span>
          </div>
          <p class="text-white/70 text-sm mb-4">Student disputes rejected time entry for 8 hours on 2025-12-15</p>
          <div class="flex gap-2">
            <Button class="bg-green-500 hover:bg-green-600 text-white px-2 rounded-md">Review & Resolve</Button>
            <Button variant="ghost" class="text-white/70 hover:text-white">View Details</Button>
          </div>
        </div>

        <div class="bg-white/5 rounded-xl border border-white/20 p-6">
          <div class="flex items-start justify-between mb-3">
            <div>
              <h3 class="text-white font-bold">Mentor Assignment Issue</h3>
              <p class="text-white/60 text-sm mt-1">Student: Alice Brown</p>
            </div>
            <span class="px-3 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">Medium Priority</span>
          </div>
          <p class="text-white/70 text-sm mb-4">Student requests mentor change due to scheduling conflicts</p>
          <div class="flex gap-2">
            <Button class="bg-blue-500 hover:bg-blue-600 text-white px-2 rounded-md">Reassign Mentor</Button>
            <Button variant="ghost" class="text-white/70 hover:text-white">Contact Student</Button>
          </div>
        </div>
      </div>

    {:else if activeTab === 'applications'}
      <!-- Applications -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-white">Internship Applications</h2>
        <span class="px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 font-semibold">
          5 Pending
        </span>
      </div>

      <div class="space-y-4">
        <div class="bg-white/5 rounded-xl border border-white/20 p-6">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-white font-bold text-lg">Sarah Johnson</h3>
              <p class="text-white/60 text-sm">sarah.johnson@example.com</p>
            </div>
            <span class="px-3 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">Pending Review</span>
          </div>
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p class="text-white/60 text-sm">Applied For</p>
              <p class="text-white font-medium">Software Engineering Intern</p>
            </div>
            <div>
              <p class="text-white/60 text-sm">Applied On</p>
              <p class="text-white font-medium">Dec 15, 2025</p>
            </div>
          </div>
          <div class="flex gap-2">
            <Button class="bg-green-500 hover:bg-green-600 text-white h-10 px-2 items-center flex rounded-md">
              <CheckCircle class="w-4 h-4 mr-2" />
              Approve
            </Button>
            <Button class="bg-red-500 hover:bg-red-600 text-white h-10 px-2 items-center flex rounded-md">
              <AlertTriangle class="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button variant="ghost" class="text-white/70 hover:text-white h-10 px-2 items-center flex rounded-md">View Application</Button>
          </div>
        </div>
      </div>

    {:else if activeTab === 'profile'}
      <!-- Admin Profile -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-white">Admin Profile</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white/5 rounded-xl border border-white/20 p-6">
          <h3 class="text-lg font-bold text-white mb-4">Profile Information</h3>
          <div class="space-y-4">
            <div>
              <label class="text-white/70 text-sm">Full Name</label>
              <Input
                value={user?.full_name || user?.email}
                disabled
                class="bg-white/5 border-white/20 text-white mt-1 px-2 rounded-sm"
              />
            </div>
            <div>
              <label class="text-white/70 text-sm">Email</label>
              <Input
                value={user?.email}
                disabled
                class="bg-white/5 border-white/20 text-white mt-1 px-2 rounded-sm"
              />
            </div>
            <div>
              <label class="text-white/70 text-sm">Role</label>
              <Input
                value="Administrator"
                disabled
                class="bg-white/5 border-white/20 text-white mt-1 px-2 rounded-sm"
              />
            </div>
          </div>
        </div>

        <div class="bg-white/5 rounded-xl border border-white/20 p-6">
          <h3 class="text-lg font-bold text-white mb-4">Activity Overview</h3>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-white/70">Users Created:</span>
              <span class="text-white font-bold text-xl">{stats.totalUsers}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-white/70">Contracts Managed:</span>
              <span class="text-white font-bold text-xl">{stats.totalStudents}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-white/70">System Actions:</span>
              <span class="text-white font-bold text-xl">247</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-white/70">Disputes Resolved:</span>
              <span class="text-green-400 font-bold text-xl">15</span>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Create User Modal -->
{#if showCreateUserModal}
  <Dialog bind:open={showCreateUserModal}>
    <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div class="bg-transparent rounded-xl border border-white/20 p-6 max-w-2xl w-full">
        <h2 class="text-2xl font-bold text-white mb-6">Create New User</h2>

        <div class="space-y-4">
          <div>
            <label class="text-white/70 text-sm block mb-2">Email</label>
            <Input
              bind:value={newUser.email}
              type="email"
              placeholder="user@example.com"
              class="bg-white/5 border-white/20 text-white h-10 rounded-md px-2 w-full"
            />
          </div>

          <div>
            <label class="text-white/70 text-sm block mb-2">Full Name</label>
            <Input
              bind:value={newUser.full_name}
              placeholder="John Doe"
              class="bg-white/5 border-white/20 text-white h-10 rounded-md px-2 w-full"
            />
          </div>

          <div>
            <label class="text-white/70 text-sm block mb-2">Password</label>
            <Input
              bind:value={newUser.password}
              type="password"
              placeholder="Enter password"
              class="bg-white/5 border-white/20 text-white h-10 rounded-md px-2 w-full"
            />
          </div>

          <div>
            <label class="text-white/70 text-sm block mb-2">Role</label>
            <select
              bind:value={newUser.role}
              class="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white"
            >
              <option value="student">Student</option>
              <option value="mentor">Mentor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <Button
            on:click={createUser}
            class="flex-1 bg-green-500 hover:bg-green-600 text-white h-10 flex items-center rounded-md justify-center"
            disabled={!newUser.email || !newUser.password}
          >
            Create User
          </Button>
          <Button
            on:click={() => { showCreateUserModal = false; newUser = { email: '', password: '', full_name: '', role: 'student' }; }}
            variant="ghost"
            class="text-white/70 hover:text-white"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  </Dialog>
{/if}

<!-- Assign Student Modal -->
{#if showAssignModal}
  <Dialog bind:open={showAssignModal}>
    <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div class="bg-transparent rounded-xl border border-white/20 p-6 max-w-2xl w-full">
        <h2 class="text-2xl font-bold text-white mb-6">Assign Student to Mentor</h2>

        <div class="space-y-4">
          <div>
            <label class="text-white/70 text-sm block mb-2">Select Student</label>
            <select
              bind:value={assignmentData.studentId}
              class="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white"
            >
              <option value={null}>Choose a student...</option>
              {#each allStudents as student}
                <option value={student.id}>{student.full_name} ({student.student_email})</option>
              {/each}
            </select>
          </div>

          <div>
            <label class="text-white/70 text-sm block mb-2">Select Mentor</label>
            <select
              bind:value={assignmentData.mentorEmail}
              class="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white"
            >
              <option value="">Choose a mentor...</option>
              {#each allMentors as mentor}
                <option value={mentor.email}>{mentor.full_name || mentor.email}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <Button
            on:click={assignStudentToMentor}
            class="flex-1 bg-purple-500 hover:bg-purple-600 text-white h-10 justify-center items-center flex rounded-md"
            disabled={!assignmentData.studentId || !assignmentData.mentorEmail}
          >
            Assign Student
          </Button>
          <Button
            on:click={() => { showAssignModal = false; assignmentData = { studentId: null, mentorEmail: '' }; }}
            variant="ghost"
            class="text-white/70 hover:text-white"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  </Dialog>
{/if}

<!-- Create Contract Modal -->
{#if showCreateContractModal}
  <Dialog bind:open={showCreateContractModal}>
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-gray-900 rounded-xl border border-white/20 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 class="text-2xl font-bold text-white mb-6">Create Student Contract</h2>

        <div class="space-y-4">
          <div>
            <label class="text-white/70 text-sm block mb-2">Student Email</label>
            <Input
              bind:value={newContract.student_email}
              type="email"
              placeholder="student@example.com"
              class="bg-white/5 border-white/20 text-white"
            />
          </div>

          <div>
            <label class="text-white/70 text-sm block mb-2">Full Name</label>
            <Input
              bind:value={newContract.full_name}
              placeholder="Student Name"
              class="bg-white/5 border-white/20 text-white"
            />
          </div>

          <div>
            <label class="text-white/70 text-sm block mb-2">Assigned Mentor</label>
            <select
              bind:value={newContract.mentor_email}
              class="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white"
            >
              <option value="">Select mentor...</option>
              {#each allMentors as mentor}
                <option value={mentor.email}>{mentor.full_name || mentor.email}</option>
              {/each}
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-white/70 text-sm block mb-2">Contract Hours</label>
              <Input
                bind:value={newContract.contract_hours}
                type="number"
                class="bg-white/5 border-white/20 text-white"
              />
            </div>
            <div>
              <label class="text-white/70 text-sm block mb-2">Department</label>
              <Input
                bind:value={newContract.department}
                placeholder="Engineering"
                class="bg-white/5 border-white/20 text-white"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-white/70 text-sm block mb-2">Start Date</label>
              <Input
                bind:value={newContract.start_date}
                type="date"
                class="bg-white/5 border-white/20 text-white"
              />
            </div>
            <div>
              <label class="text-white/70 text-sm block mb-2">End Date</label>
              <Input
                bind:value={newContract.end_date}
                type="date"
                class="bg-white/5 border-white/20 text-white"
              />
            </div>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <Button
            on:click={createContract}
            class="flex-1 bg-green-500 hover:bg-green-600 text-white"
            disabled={!newContract.student_email || !newContract.full_name}
          >
            Create Contract
          </Button>
          <Button
            on:click={() => { showCreateContractModal = false; }}
            variant="ghost"
            class="text-white/70 hover:text-white"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  </Dialog>
{/if}

<!-- Create Project/Program Modal -->
{#if showCreateProjectModal}
  <Dialog bind:open={showCreateProjectModal}>
    <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div class="bg-transparent rounded-xl border border-white/20 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 class="text-2xl font-bold text-white mb-6">Create New Program/Project</h2>

        <div class="space-y-4">
          <div>
            <label class="text-white/70 text-sm block mb-2">Type</label>
            <select
              bind:value={newProject.type}
              class="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white"
            >
              <option value="program">Program</option>
              <option value="project">Project</option>
            </select>
          </div>

          <div>
            <label class="text-white/70 text-sm block mb-2">Name</label>
            <Input
              bind:value={newProject.name}
              placeholder="e.g., Summer Internship Program 2025"
              class="bg-white/5 border-white/20 text-white h-10 rounded-md px-2 w-full"
            />
          </div>

          <div>
            <label class="text-white/70 text-sm block mb-2">Description</label>
            <textarea
              bind:value={newProject.description}
              placeholder="Brief description of the program/project..."
              class="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-white/50 min-h-[100px]"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-white/70 text-sm block mb-2">Start Date</label>
              <Input
                bind:value={newProject.start_date}
                type="date"
                class="bg-white/5 border-white/20 text-white h-10 rounded-md px-2 w-full"
              />
            </div>
            <div>
              <label class="text-white/70 text-sm block mb-2">End Date</label>
              <Input
                bind:value={newProject.end_date}
                type="date"
                class="bg-white/5 border-white/20 text-white h-10 rounded-md px-2 w-full"
              />
            </div>
          </div>

          <div>
            <label class="text-white/70 text-sm block mb-2">Status</label>
            <select
              bind:value={newProject.status}
              class="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white"
            >
              <option value="active">Active</option>
              <option value="planned">Planned</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <Button
            on:click={createProject}
            class="flex-1 bg-green-500 hover:bg-green-600 text-white h-10 flex items-center rounded-md justify-center"
            disabled={!newProject.name}
          >
            <FolderOpen class="w-4 h-4 mr-2" />
            Create {newProject.type === 'program' ? 'Program' : 'Project'}
          </Button>
          <Button
            on:click={() => { showCreateProjectModal = false; newProject = { name: '', description: '', type: 'program', start_date: '', end_date: '', status: 'active', assigned_students: [] }; }}
            variant="ghost"
            class="text-white/70 hover:text-white"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  </Dialog>
{/if}
