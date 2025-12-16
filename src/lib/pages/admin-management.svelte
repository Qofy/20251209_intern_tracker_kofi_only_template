<script>
  console.log('[Admin] Script block executing');
  import { onMount, tick } from 'svelte';
  import { User, Student } from '../../entities/all';
  import { userStore } from '../../stores/userStore';
  import { Users, UserPlus, UserCog, FileText, Settings, Shield, CheckCircle, XCircle, Search, Edit2, Trash2, RefreshCw } from 'lucide-svelte';

  let activeTab = 'users'; // users, mentors, students, assignments, reports, settings
  let allUsers = [];
  let allStudents = [];
  let allMentors = [];
  let isLoading = false;
  console.log('[Admin] Initial isLoading:', isLoading);
  let searchQuery = '';
  let showCreateUserModal = false;
  let showAssignModal = false;
  let showCreateContractModal = false;
  
  // New user form
  let newUser = {
    email: '',
    password: '',
    full_name: '',
    role: 'student'
  };

  // New contract form
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

  // Assignment form
  let assignmentData = {
    studentId: null,
    mentorId: null
  };

  // Edit user form
  let editingUser = null;

  // Load data on mount - this ensures it loads every time the component mounts
  onMount(async () => {
    console.log('[Admin] onMount - Loading data...');
    await loadData();
  });

  async function loadData() {
    console.log('[Admin] loadData called, setting isLoading to true');
    isLoading = true;
    try {
      console.log('[Admin] Starting loadData...');
      
      // Debug: Check localStorage directly FIRST
      const storedStudents = localStorage.getItem('demo_students');
      console.log('[Admin] Raw localStorage demo_students:', storedStudents);
      
      // Load all students
      allStudents = await Student.list();
      console.log('[Admin] Loaded students from Student.list():', allStudents.length, allStudents);
      
      // Load all users
      allUsers = await User.list();
      console.log('[Admin] Loaded users:', allUsers.length, allUsers);
      
      allMentors = allUsers.filter(u => u.role === 'mentor');
      console.log('[Admin] Filtered mentors:', allMentors.length);
      console.log('[Admin] loadData complete, setting isLoading to false');
    } catch (error) {
      console.error('[Admin] Error loading admin data:', error);
    } finally {
      isLoading = false;
      console.log('[Admin] isLoading is now:', isLoading);
    }
  }

  async function createUser() {
    try {
      console.log('Creating user:', newUser);
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
      console.log('Deleting user:', userId);
      await User.delete(userId);
      alert('User deleted successfully!');
      await loadData();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  }

  async function assignStudentToMentor() {
    try {
      if (!assignmentData.studentId || !assignmentData.mentorId) {
        alert('Please select both a student and a mentor');
        return;
      }

      // Find the mentor to get their email
      const mentor = allMentors.find(m => m.id === assignmentData.mentorId);
      if (!mentor) {
        alert('Selected mentor not found');
        return;
      }

      // Update the student with the mentor's email
      await Student.update(assignmentData.studentId, {
        mentor_email: mentor.email
      });

      console.log('Assigned mentor', mentor.email, 'to student', assignmentData.studentId);
      alert('Student assigned to mentor successfully!');
      showAssignModal = false;
      assignmentData = { studentId: null, mentorId: null };
      await loadData();
    } catch (error) {
      console.error('Error assigning student:', error);
      alert('Failed to assign student: ' + error.message);
    }
  }

  async function createContract() {
    try {
      // TODO: Call API to create student contract
      const contractData = {
        ...newContract,
        status: 'active'
      };
      console.log('[Admin] Creating contract:', contractData);
      
      // For now, using Student.create
      const newStudentRecord = await Student.create(contractData);
      console.log('[Admin] Contract created successfully:', newStudentRecord);
      
      alert('Contract created successfully!');
      showCreateContractModal = false;
      
      // Reset form
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
      
      // Reload data to show new contract
      console.log('[Admin] Reloading data after contract creation...');
      await loadData();
      console.log('[Admin] Data reloaded, allStudents:', allStudents.length);
      
      // Switch to students tab to show the new contract
      activeTab = 'students';
      
      // Update userStore with new students list
      await userStore.loadUserAndRole();
    } catch (error) {
      console.error('[Admin] Error creating contract:', error);
      alert('Failed to create contract: ' + error.message);
    }
  }

  function filterUsers(users) {
    if (!searchQuery) return users;
    return users.filter(u => 
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  function filterStudents(students) {
    if (!searchQuery) return students;
    return students.filter(s => 
      s.student_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  $: filteredUsers = filterUsers(allUsers);
  $: filteredStudents = filterStudents(allStudents);
  $: filteredMentors = filterUsers(allMentors);
  
  // Debug reactive statement to log when students change
  $: {
    console.log('[Admin] Reactive: allStudents changed, count:', allStudents.length);
    console.log('[Admin] Reactive: filteredStudents count:', filteredStudents.length);
    if (allStudents.length > 0 && filteredStudents.length === 0 && searchQuery) {
      console.log('[Admin] WARNING: Students exist but filtered to zero - check filter logic');
    }
  }
</script>

<div class="p-8">
  <!-- Header -->
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-3xl font-bold text-white mb-2">Admin Management</h1>
      <p class="text-white/70">Manage users, permissions, and system settings</p>
    </div>
    <div class="flex gap-3">
      <button
        class="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-colors"
        on:click={loadData}
        disabled={isLoading}
        title="Refresh data"
      >
        <RefreshCw class="w-4 h-4 {isLoading ? 'animate-spin' : ''}"/>
        Refresh
      </button>
      <button
        class="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl transition-colors"
        on:click={() => showCreateContractModal = true}
      >
        <FileText class="w-4 h-4"/>
        Create Contract
      </button>
      <button
        class="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl transition-colors"
        on:click={() => showCreateUserModal = true}
      >
        <UserPlus class="w-4 h-4"/>
        Create User
      </button>
    </div>
  </div>

  <!-- Tabs -->
  <div class="flex gap-2 mb-6 border-b border-white/10">
    <button
      class="flex items-center gap-2 px-4 py-3 transition-colors {activeTab === 'users' ? 'text-white border-b-2 border-emerald-500' : 'text-white/60 hover:text-white'}"
      on:click={() => activeTab = 'users'}
    >
      <Users class="w-4 h-4"/>
      All Users
    </button>
    <button
      class="flex items-center gap-2 px-4 py-3 transition-colors {activeTab === 'mentors' ? 'text-white border-b-2 border-emerald-500' : 'text-white/60 hover:text-white'}"
      on:click={() => activeTab = 'mentors'}
    >
      <UserCog class="w-4 h-4"/>
      Mentors
    </button>
    <button
      class="flex items-center gap-2 px-4 py-3 transition-colors {activeTab === 'students' ? 'text-white border-b-2 border-emerald-500' : 'text-white/60 hover:text-white'}"
      on:click={() => activeTab = 'students'}
    >
      <Users class="w-4 h-4"/>
      Students
    </button>
    <button
      class="flex items-center gap-2 px-4 py-3 transition-colors {activeTab === 'assignments' ? 'text-white border-b-2 border-emerald-500' : 'text-white/60 hover:text-white'}"
      on:click={() => activeTab = 'assignments'}
    >
      <Shield class="w-4 h-4"/>
      Assignments
    </button>
    <button
      class="flex items-center gap-2 px-4 py-3 transition-colors {activeTab === 'reports' ? 'text-white border-b-2 border-emerald-500' : 'text-white/60 hover:text-white'}"
      on:click={() => activeTab = 'reports'}
    >
      <FileText class="w-4 h-4"/>
      System Reports
    </button>
    <button
      class="flex items-center gap-2 px-4 py-3 transition-colors {activeTab === 'settings' ? 'text-white border-b-2 border-emerald-500' : 'text-white/60 hover:text-white'}"
      on:click={() => activeTab = 'settings'}
    >
      <Settings class="w-4 h-4"/>
      Settings
    </button>
  </div>

  <!-- Search Bar -->
  <div class="mb-6">
    <div class="relative">
      <Search class="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40"/>
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search users..."
        class="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-emerald-500 transition-colors"
      />
    </div>
  </div>

  <!-- Content based on active tab -->
  {#if isLoading}
    <div class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-emerald-500"></div>
      <p class="text-white/60 mt-4">Loading data...</p>
    </div>
  {:else if activeTab === 'users'}
    <!-- All Users Table -->
    <div class="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
      <table class="w-full">
        <thead class="bg-white/5">
          <tr>
            <th class="text-left px-6 py-4 text-white/80 font-medium">Name</th>
            <th class="text-left px-6 py-4 text-white/80 font-medium">Email</th>
            <th class="text-left px-6 py-4 text-white/80 font-medium">Role</th>
            <th class="text-left px-6 py-4 text-white/80 font-medium">Status</th>
            <th class="text-right px-6 py-4 text-white/80 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredUsers as user}
            <tr class="border-t border-white/5 hover:bg-white/5 transition-colors">
              <td class="px-6 py-4 text-white">{user.full_name}</td>
              <td class="px-6 py-4 text-white/70">{user.email}</td>
              <td class="px-6 py-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                  {user.role === 'admin' ? 'bg-red-500/20 text-red-300' : user.role === 'mentor' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'}">
                  {user.role}
                </span>
              </td>
              <td class="px-6 py-4">
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium
                  {user.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-500/20 text-gray-300'}">
                  {#if user.status === 'active'}
                    <CheckCircle class="w-3 h-3"/>
                  {:else}
                    <XCircle class="w-3 h-3"/>
                  {/if}
                  {user.status}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    class="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 class="w-4 h-4"/>
                  </button>
                  <button
                    class="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Delete"
                    on:click={() => deleteUser(user.id)}
                  >
                    <Trash2 class="w-4 h-4"/>
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

  {:else if activeTab === 'mentors'}
    <!-- Mentors List -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each filteredMentors as mentor}
        <div class="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-white font-semibold">{mentor.full_name}</h3>
              <p class="text-white/60 text-sm">{mentor.email}</p>
            </div>
            <span class="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-lg">Mentor</span>
          </div>
          <div class="text-white/60 text-sm">
            <p>Assigned Students: 0</p>
            <p>Active Projects: 0</p>
          </div>
        </div>
      {/each}
    </div>

  {:else if activeTab === 'students'}
    <!-- Students List -->
    {#if filteredStudents.length === 0}
      <div class="bg-white/5 rounded-xl border border-white/10 p-12 text-center">
        <Users class="w-16 h-16 text-white/20 mx-auto mb-4"/>
        <h3 class="text-xl font-semibold text-white mb-2">No Student Contracts Found</h3>
        <p class="text-white/60 mb-6">
          {#if searchQuery}
            No students match your search "{searchQuery}"
          {:else}
            Create your first student contract to get started
          {/if}
        </p>
        
        <!-- Debug Info -->
        <div class="bg-black/30 rounded-lg p-4 mb-6 text-left text-sm">
          <p class="text-white/80 font-semibold mb-2">Debug Info:</p>
          <p class="text-white/60">Total Students in Array: {allStudents.length}</p>
          <p class="text-white/60">Filtered Students: {filteredStudents.length}</p>
          <p class="text-white/60">Search Query: "{searchQuery}"</p>
          <button
            class="mt-2 text-blue-400 hover:text-blue-300 text-xs"
            on:click={() => {
              const stored = localStorage.getItem('demo_students');
              console.log('Raw localStorage demo_students:', stored);
              alert('Check console for localStorage data');
            }}
          >
            Check localStorage (see console)
          </button>
        </div>
        
        {#if !searchQuery}
          <button
            class="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl transition-colors mx-auto"
            on:click={() => showCreateContractModal = true}
          >
            <FileText class="w-4 h-4"/>
            Create Student Contract
          </button>
        {/if}
      </div>
    {:else}
      <div class="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <table class="w-full">
          <thead class="bg-white/5">
            <tr>
              <th class="text-left px-6 py-4 text-white/80 font-medium">Name</th>
              <th class="text-left px-6 py-4 text-white/80 font-medium">Email</th>
              <th class="text-left px-6 py-4 text-white/80 font-medium">Mentor</th>
              <th class="text-left px-6 py-4 text-white/80 font-medium">Hours</th>
              <th class="text-right px-6 py-4 text-white/80 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredStudents as student}
              <tr class="border-t border-white/5 hover:bg-white/5 transition-colors">
                <td class="px-6 py-4 text-white">{student.full_name}</td>
                <td class="px-6 py-4 text-white/70">{student.student_email}</td>
                <td class="px-6 py-4 text-white/70">{student.mentor_email || 'Unassigned'}</td>
                <td class="px-6 py-4 text-white">{student.contract_hours || 0}h</td>
                <td class="px-6 py-4 text-right">
                  <button
                    class="text-blue-400 hover:text-blue-300 text-sm"
                    on:click={() => {
                      assignmentData.studentId = student.id;
                      showAssignModal = true;
                    }}
                  >
                    Assign Mentor
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

  {:else if activeTab === 'assignments'}
    <!-- Student-Mentor Assignments -->
    <div class="space-y-4">
      <div class="flex justify-between items-center mb-4">
        <div class="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search assignments..."
            bind:value={searchQuery}
            class="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
          />
        </div>
        <button
          class="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl"
          on:click={() => showAssignModal = true}
        >
          <Shield class="w-4 h-4"/>
          New Assignment
        </button>
      </div>
      
      <div class="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <table class="w-full">
          <thead class="bg-white/10">
            <tr>
              <th class="text-left p-4 text-white/80 font-semibold">Student</th>
              <th class="text-left p-4 text-white/80 font-semibold">Student Email</th>
              <th class="text-left p-4 text-white/80 font-semibold">Mentor</th>
              <th class="text-left p-4 text-white/80 font-semibold">Mentor Email</th>
              <th class="text-left p-4 text-white/80 font-semibold">Status</th>
              <th class="text-left p-4 text-white/80 font-semibold">Contract Hours</th>
              <th class="text-left p-4 text-white/80 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each allStudents.filter(s => s.mentor_email) as student}
              {@const mentor = allUsers.find(u => u.email === student.mentor_email)}
              <tr class="border-t border-white/10 hover:bg-white/5">
                <td class="p-4 text-white">{student.full_name}</td>
                <td class="p-4 text-white/70">{student.student_email}</td>
                <td class="p-4 text-white">
                  {#if mentor}
                    {mentor.full_name}
                  {:else}
                    <span class="text-white/50">Unknown</span>
                  {/if}
                </td>
                <td class="p-4 text-white/70">{student.mentor_email}</td>
                <td class="p-4">
                  <span class="px-3 py-1 rounded-full text-xs font-medium {
                    student.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' :
                    student.status === 'completed' ? 'bg-blue-500/20 text-blue-300' :
                    student.status === 'paused' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-gray-500/20 text-gray-300'
                  }">
                    {student.status || 'unknown'}
                  </span>
                </td>
                <td class="p-4 text-white/70">{student.contract_hours || 0} hrs</td>
                <td class="p-4">
                  <div class="flex gap-2">
                    <button
                      class="text-blue-400 hover:text-blue-300"
                      on:click={() => {
                        assignmentData = {
                          studentId: student.id,
                          mentorId: mentor?.id || null
                        };
                        showAssignModal = true;
                      }}
                      title="Change mentor"
                    >
                      <Edit2 class="w-4 h-4"/>
                    </button>
                    <button
                      class="text-red-400 hover:text-red-300"
                      on:click={async () => {
                        if (confirm('Remove this mentor assignment?')) {
                          await Student.update(student.id, { mentor_email: '' });
                          await loadData();
                        }
                      }}
                      title="Remove assignment"
                    >
                      <Trash2 class="w-4 h-4"/>
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
            {#if allStudents.filter(s => s.mentor_email).length === 0}
              <tr>
                <td colspan="7" class="p-8 text-center text-white/50">
                  No student-mentor assignments found. Create one using the "New Assignment" button.
                </td>
              </tr>
            {/if}
          </tbody>
        </table>
      </div>

      <!-- Unassigned Students -->
      {#if allStudents.filter(s => !s.mentor_email).length > 0}
        <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
          <h3 class="text-yellow-300 font-semibold mb-3 flex items-center gap-2">
            <Shield class="w-5 h-5"/>
            Unassigned Students ({allStudents.filter(s => !s.mentor_email).length})
          </h3>
          <div class="space-y-2">
            {#each allStudents.filter(s => !s.mentor_email) as student}
              <div class="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                <div>
                  <p class="text-white font-medium">{student.full_name}</p>
                  <p class="text-white/60 text-sm">{student.student_email}</p>
                </div>
                <button
                  class="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm"
                  on:click={() => {
                    assignmentData = { studentId: student.id, mentorId: null };
                    showAssignModal = true;
                  }}
                >
                  <Shield class="w-3 h-3"/>
                  Assign Mentor
                </button>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

  {:else if activeTab === 'reports'}
    <!-- System Reports -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 class="text-white font-semibold mb-2">User Statistics</h3>
        <div class="space-y-2 text-white/70">
          <p>Total Users: {allUsers.length}</p>
          <p>Active Mentors: {allMentors.length}</p>
          <p>Total Students: {allStudents.length}</p>
        </div>
      </div>
      
      <div class="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 class="text-white font-semibold mb-2">System Activity</h3>
        <div class="space-y-2 text-white/70">
          <p>Active Sessions: -</p>
          <p>Total Hours Logged: -</p>
          <p>Pending Approvals: -</p>
        </div>
      </div>
    </div>

  {:else if activeTab === 'settings'}
    <!-- System Settings -->
    <div class="space-y-6">
      <!-- General Settings -->
      <div class="bg-white/5 rounded-xl border border-white/10 p-6">
        <h3 class="text-white font-semibold mb-4 flex items-center gap-2">
          <Settings class="w-5 h-5"/>
          General Settings
        </h3>
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-white/80 text-sm mb-2">Default Contract Hours</label>
              <input 
                type="number" 
                value="600" 
                class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
              />
            </div>
            <div>
              <label class="block text-white/80 text-sm mb-2">System Timezone</label>
              <select class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white">
                <option>UTC</option>
                <option selected>America/New_York</option>
                <option>Europe/London</option>
                <option>Asia/Tokyo</option>
              </select>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-white/80 text-sm mb-2">System Email</label>
              <input 
                type="email" 
                value="admin@example.com" 
                class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
              />
            </div>
            <div>
              <label class="block text-white/80 text-sm mb-2">Company Name</label>
              <input 
                type="text" 
                value="Intern Tracker System" 
                class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Notification Settings -->
      <div class="bg-white/5 rounded-xl border border-white/10 p-6">
        <h3 class="text-white font-semibold mb-4">Notification Settings</h3>
        <div class="space-y-3">
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked class="w-5 h-5 rounded border-white/20 bg-white/10"/>
            <span class="text-white">Email notifications for new student registrations</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked class="w-5 h-5 rounded border-white/20 bg-white/10"/>
            <span class="text-white">Email notifications for time entry submissions</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" class="w-5 h-5 rounded border-white/20 bg-white/10"/>
            <span class="text-white">Daily summary reports to administrators</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked class="w-5 h-5 rounded border-white/20 bg-white/10"/>
            <span class="text-white">Notify mentors when students log hours</span>
          </label>
        </div>
      </div>

      <!-- Security Settings -->
      <div class="bg-white/5 rounded-xl border border-white/10 p-6">
        <h3 class="text-white font-semibold mb-4">Security Settings</h3>
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-white/80 text-sm mb-2">Session Timeout (minutes)</label>
              <input 
                type="number" 
                value="60" 
                class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
              />
            </div>
            <div>
              <label class="block text-white/80 text-sm mb-2">Password Min Length</label>
              <input 
                type="number" 
                value="8" 
                class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
              />
            </div>
          </div>
          
          <div class="space-y-3">
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked class="w-5 h-5 rounded border-white/20 bg-white/10"/>
              <span class="text-white">Require password change every 90 days</span>
            </label>
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked class="w-5 h-5 rounded border-white/20 bg-white/10"/>
              <span class="text-white">Enable two-factor authentication (2FA)</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Data Management -->
      <div class="bg-white/5 rounded-xl border border-white/10 p-6">
        <h3 class="text-white font-semibold mb-4">Data Management</h3>
        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <p class="text-white font-medium">Export All Data</p>
              <p class="text-white/60 text-sm">Download all system data as JSON</p>
            </div>
            <button 
              class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
              on:click={() => {
                const data = {
                  users: JSON.parse(localStorage.getItem('demo_users') || '[]'),
                  students: JSON.parse(localStorage.getItem('demo_students') || '[]'),
                  tasks: JSON.parse(localStorage.getItem('demo_tasks') || '[]'),
                  timeEntries: JSON.parse(localStorage.getItem('demo_time_entries') || '[]'),
                  schedules: JSON.parse(localStorage.getItem('demo_schedules') || '[]'),
                  exportDate: new Date().toISOString()
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `intern-tracker-data-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                alert('Data exported successfully!');
              }}
            >
              Export
            </button>
          </div>
          
          <div class="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <p class="text-white font-medium">Clear Demo Data</p>
              <p class="text-white/60 text-sm">Remove all localStorage demo data</p>
            </div>
            <button 
              class="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg"
              on:click={() => {
                if (confirm('This will clear all demo data. Continue?')) {
                  localStorage.removeItem('demo_users');
                  localStorage.removeItem('demo_students');
                  localStorage.removeItem('demo_tasks');
                  localStorage.removeItem('demo_time_entries');
                  localStorage.removeItem('demo_schedules');
                  alert('Demo data cleared successfully!');
                  loadData();
                }
              }}
            >
              Clear Data
            </button>
          </div>
          
          <div class="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div>
              <p class="text-red-300 font-medium">Reset System</p>
              <p class="text-red-300/60 text-sm">Restore system to initial state (WARNING: Cannot be undone)</p>
            </div>
            <button 
              class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
              on:click={() => {
                if (confirm('⚠️ WARNING: This will delete ALL data and reset the system to defaults.\n\nThis action CANNOT be undone!\n\nAre you absolutely sure?')) {
                  // Clear all localStorage
                  localStorage.clear();
                  alert('System has been reset. Please log in again.');
                  window.location.href = '/';
                }
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <!-- Save Button -->
      <div class="flex justify-end gap-3">
        <button 
          class="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg border border-white/20"
          on:click={() => {
            // Reset form or navigate away
            alert('Changes discarded');
          }}
        >
          Cancel
        </button>
        <button 
          class="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg"
          on:click={() => {
            // Save settings to localStorage
            const settings = {
              defaultContractHours: 600,
              timezone: 'America/New_York',
              systemEmail: 'admin@example.com',
              companyName: 'Intern Tracker System',
              notifications: {
                newRegistrations: true,
                timeEntries: true,
                dailySummary: false,
                mentorAlerts: true
              },
              security: {
                sessionTimeout: 60,
                passwordMinLength: 8,
                requirePasswordChange: true,
                enable2FA: true
              }
            };
            localStorage.setItem('system_settings', JSON.stringify(settings));
            alert('Settings saved successfully!');
          }}
        >
          Save Settings
        </button>
      </div>
    </div>
  {/if}
</div>

<!-- Create User Modal -->
{#if showCreateUserModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" on:click={() => showCreateUserModal = false}>
    <div class="bg-gradient-to-br from-indigo-900/90 to-purple-900/90 backdrop-blur-md rounded-2xl border border-white/20 p-8 max-w-md w-full mx-4" on:click|stopPropagation>
      <h2 class="text-2xl font-bold text-white mb-6">Create New User</h2>
      
      <div class="space-y-4">
        <div>
          <label class="block text-white/80 text-sm mb-2">Full Name</label>
          <input
            type="text"
            bind:value={newUser.full_name}
            class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
            placeholder="Enter full name"
          />
        </div>
        
        <div>
          <label class="block text-white/80 text-sm mb-2">Email</label>
          <input
            type="email"
            bind:value={newUser.email}
            class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
            placeholder="Enter email"
          />
        </div>
        
        <div>
          <label class="block text-white/80 text-sm mb-2">Password</label>
          <input
            type="password"
            bind:value={newUser.password}
            class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
            placeholder="Enter password"
          />
        </div>
        
        <div>
          <label class="block text-white/80 text-sm mb-2">Role</label>
          <select
            bind:value={newUser.role}
            class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
          >
            <option value="student">Student</option>
            <option value="mentor">Mentor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      
      <div class="flex gap-3 mt-6">
        <button
          class="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg transition-colors"
          on:click={createUser}
        >
          Create User
        </button>
        <button
          class="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg transition-colors"
          on:click={() => showCreateUserModal = false}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Create Contract Modal -->
{#if showCreateContractModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" on:click={() => showCreateContractModal = false}>
    <div class="bg-gradient-to-br from-indigo-900/90 to-purple-900/90 backdrop-blur-md rounded-2xl border border-white/20 p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" on:click|stopPropagation>
      <h2 class="text-2xl font-bold text-white mb-6">Create Student Contract</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-white/80 text-sm mb-2">Student Full Name *</label>
          <input
            type="text"
            bind:value={newContract.full_name}
            class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
            placeholder="Enter student name"
            required
          />
        </div>
        
        <div>
          <label class="block text-white/80 text-sm mb-2">Student Email *</label>
          <input
            type="email"
            bind:value={newContract.student_email}
            class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
            placeholder="student@example.com"
            required
          />
        </div>
        
        <div>
          <label class="block text-white/80 text-sm mb-2">Mentor Email</label>
          <select
            bind:value={newContract.mentor_email}
            class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
          >
            <option value="">-- Select Mentor --</option>
            {#each allMentors as mentor}
              <option value={mentor.email}>{mentor.full_name} ({mentor.email})</option>
            {/each}
          </select>
        </div>
        
        <div>
          <label class="block text-white/80 text-sm mb-2">Contract Hours *</label>
          <input
            type="number"
            bind:value={newContract.contract_hours}
            class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
            placeholder="600"
            min="1"
            required
          />
        </div>
        
        <div>
          <label class="block text-white/80 text-sm mb-2">Start Date *</label>
          <input
            type="date"
            bind:value={newContract.start_date}
            class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            required
          />
        </div>
        
        <div>
          <label class="block text-white/80 text-sm mb-2">End Date *</label>
          <input
            type="date"
            bind:value={newContract.end_date}
            class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            required
          />
        </div>
        
        <div>
          <label class="block text-white/80 text-sm mb-2">Department</label>
          <input
            type="text"
            bind:value={newContract.department}
            class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
            placeholder="e.g., Engineering, Marketing"
          />
        </div>
        
        <div>
          <label class="block text-white/80 text-sm mb-2">Position</label>
          <input
            type="text"
            bind:value={newContract.position}
            class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
            placeholder="e.g., Software Developer Intern"
          />
        </div>
      </div>
      
      <div class="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p class="text-blue-200 text-sm">
          <strong>Note:</strong> This will create a new student contract with the specified details. 
          An email will be sent to the student with their login credentials.
        </p>
      </div>
      
      <div class="flex gap-3 mt-6">
        <button
          class="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg transition-colors"
          on:click={createContract}
        >
          Create Contract
        </button>
        <button
          class="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg transition-colors"
          on:click={() => showCreateContractModal = false}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}
<!-- Assign Student Modal -->
{#if showAssignModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" on:click={() => showAssignModal = false}>
    <div class="bg-gradient-to-br from-indigo-900/90 to-purple-900/90 backdrop-blur-md rounded-2xl border border-white/20 p-8 max-w-md w-full mx-4" on:click|stopPropagation>
      <h2 class="text-2xl font-bold text-white mb-6">Assign Student to Mentor</h2>
      
      <div class="space-y-4">
        <div>
          <label class="block text-white/80 text-sm mb-2">Select Student</label>
          <select
            bind:value={assignmentData.studentId}
            class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
          >
            <option value={null}>-- Select Student --</option>
            {#each allStudents as student}
              <option value={student.id}>{student.full_name}</option>
            {/each}
          </select>
        </div>
        
        <div>
          <label class="block text-white/80 text-sm mb-2">Select Mentor</label>
          <select
            bind:value={assignmentData.mentorId}
            class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
          >
            <option value={null}>-- Select Mentor --</option>
            {#each allMentors as mentor}
              <option value={mentor.id}>{mentor.full_name}</option>
            {/each}
          </select>
        </div>
      </div>
      
      <div class="flex gap-3 mt-6">
        <button
          class="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg transition-colors"
          on:click={assignStudentToMentor}
        >
          Assign
        </button>
        <button
          class="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg transition-colors"
          on:click={() => showAssignModal = false}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}
