<script>
  import { onMount } from 'svelte';
  import { User, Student } from '../../entities/all';
  import { userStore } from '../../stores/userStore';
  import { Users, UserPlus, UserCog, FileText, Settings, Shield, CheckCircle, XCircle, Search, Edit2, Trash2 } from 'lucide-svelte';

  let activeTab = 'users'; // users, mentors, students, assignments, reports, settings
  let allUsers = [];
  let allStudents = [];
  let allMentors = [];
  let isLoading = true;
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

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    isLoading = true;
    try {
      // Load all students
      allStudents = await Student.list();
      
      // TODO: Load all users and mentors from API
      // For now, using demo data
      allUsers = [
        { id: 1, email: 'admin@example.com', full_name: 'Admin', role: 'admin', status: 'active' },
        { id: 2, email: 'mentor@example.com', full_name: 'Mentor', role: 'mentor', status: 'active' },
        { id: 3, email: 'student@example.com', full_name: 'Student', role: 'student', status: 'active' }
      ];
      
      allMentors = allUsers.filter(u => u.role === 'mentor');
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      isLoading = false;
    }
  }

  async function createUser() {
    try {
      // TODO: Call API to create user
      console.log('Creating user:', newUser);
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
      // TODO: Call API to delete user
      console.log('Deleting user:', userId);
      alert('User deleted successfully!');
      await loadData();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  }

  async function assignStudentToMentor() {
    try {
      // TODO: Call API to assign student to mentor
      console.log('Assigning student:', assignmentData);
      alert('Student assigned successfully!');
      showAssignModal = false;
      assignmentData = { studentId: null, mentorId: null };
      await loadData();
    } catch (error) {
      console.error('Error assigning student:', error);
      alert('Failed to assign student');
    }
  }

  async function createContract() {
    try {
      // TODO: Call API to create student contract
      const contractData = {
        ...newContract,
        status: 'active'
      };
      console.log('Creating contract:', contractData);
      
      // For now, using Student.create
      await Student.create(contractData);
      
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
      
      // Update userStore with new students list
      await userStore.loadUserAndRole();
    } catch (error) {
      console.error('Error creating contract:', error);
      alert('Failed to create contract');
    }
  }

  function filterUsers(users) {
    if (!searchQuery) return users;
    return users.filter(u => 
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  $: filteredUsers = filterUsers(allUsers);
  $: filteredStudents = filterUsers(allStudents);
  $: filteredMentors = filterUsers(allMentors);
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

  {:else if activeTab === 'assignments'}
    <!-- Student-Mentor Assignments -->
    <div class="space-y-4">
      <div class="flex justify-end">
        <button
          class="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl"
          on:click={() => showAssignModal = true}
        >
          <Shield class="w-4 h-4"/>
          New Assignment
        </button>
      </div>
      
      <div class="bg-white/5 rounded-xl border border-white/10 p-6">
        <p class="text-white/60">Assignment management interface - Coming soon</p>
      </div>
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
    <div class="bg-white/5 rounded-xl border border-white/10 p-6">
      <h3 class="text-white font-semibold mb-4">System Configuration</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-white/80 text-sm mb-2">Default Contract Hours</label>
          <input type="number" value="600" class="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"/>
        </div>
        <div>
          <label class="block text-white/80 text-sm mb-2">System Email</label>
          <input type="email" value="admin@system.com" class="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"/>
        </div>
        <button class="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg">
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
