<script>
  import { onMount } from 'svelte';
  import { Student, Task, TimeEntry, User } from '../../entities/all';
  import { userStore } from '../../stores/userStore';
  import Button from '$lib/components/ui/button.svelte';
  import Input from '$lib/components/ui/input.svelte';
  import Dialog from '$lib/components/ui/dialog.svelte';
  import { 
    Users, ClipboardList, MessageSquare, TrendingUp, 
    Plus, Check, X, Edit, Trash2, Send, FileText,
    Clock, Calendar, AlertCircle, CheckCircle, Target,
    User as UserIcon, Mail, Phone, Award, RefreshCw
  } from 'lucide-svelte';
  import { format, parseISO } from 'date-fns';

  $: user = $userStore.user;

  // Accept initialTab prop from parent component
  export let initialTab = 'students';

  // State variables
  let activeTab = initialTab; // students, tasks, submissions, reports, profile

  // Update activeTab when initialTab changes
  $: activeTab = initialTab;
  let assignedStudents = [];
  let tasks = [];
  let timeEntries = [];
  let selectedStudent = null;
  let isLoading = false;

  // Dialog states
  let showTaskDialog = false;
  let showFeedbackDialog = false;
  let showReportDialog = false;
  let showMessageDialog = false;

  // Form data
  let taskForm = {
    title: '',
    description: '',
    assigned_to: '',
    due_date: '',
    priority: 'medium',
    status: 'assigned'
  };

  let feedbackForm = {
    entry_id: '',
    rating: 5,
    comments: '',
    status: 'approved'
  };

  let reportForm = {
    student_id: '',
    report_type: 'weekly',
    content: '',
    period_start: '',
    period_end: ''
  };

  let messageForm = {
    to_student: '',
    subject: '',
    message: ''
  };

  // Stats
  let stats = {
    totalStudents: 0,
    pendingSubmissions: 0,
    completedTasks: 0,
    totalHoursThisWeek: 0
  };

  onMount(async () => {
    await loadMentorData();
  });

  async function loadMentorData() {
    isLoading = true;
    try {
      // Load students assigned to this mentor using the filter method
      assignedStudents = await Student.filter({ mentor_email: user?.email });
      console.log('[Mentor Dashboard] Loaded students for mentor:', user?.email, assignedStudents);
      
      // Load tasks assigned to this mentor using mentor_email filter
      tasks = await Task.list({ mentor_email: user?.email });

      // Load time entries for assigned students
      const allEntries = await TimeEntry.list();
      timeEntries = allEntries.filter(e => {
        return assignedStudents.some(s => s.student_email === e.created_by);
      });

      // Calculate stats
      stats.totalStudents = assignedStudents.length;
      stats.pendingSubmissions = timeEntries.filter(e => e.status === 'draft').length;
      stats.completedTasks = tasks.filter(t => t.status === 'completed').length;
      
      const thisWeek = timeEntries.filter(e => {
        const entryDate = new Date(e.date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return entryDate >= weekAgo;
      });
      stats.totalHoursThisWeek = thisWeek.reduce((sum, e) => sum + (parseFloat(e.manually_inputted_hours) || 0), 0);

      console.log('[Mentor] Loaded data:', {
        students: assignedStudents.length,
        tasks: tasks.length,
        entries: timeEntries.length,
        mentorEmail: user?.email
      });
    } catch (error) {
      console.error('[Mentor] Error loading data:', error);
    }
    isLoading = false;
  }

  // Task Management
  async function createTask() {
    try {
      // Find the student by email to get their ID
      const student = assignedStudents.find(s => s.student_email === taskForm.assigned_to);
      if (!student) {
        alert('Please select a valid student');
        return;
      }

      const newTask = await Task.create({
        title: taskForm.title,
        description: taskForm.description,
        student_id: student.id,
        due_date: taskForm.due_date,
        priority: taskForm.priority,
        status: taskForm.status,
        assigned_by: user?.email,
        mentor_email: user?.email,
        created_at: new Date().toISOString()
      });
      console.log('[Mentor] Created task:', newTask);
      tasks = [...tasks, newTask];
      showTaskDialog = false;
      resetTaskForm();
      await loadMentorData();
    } catch (error) {
      console.error('[Mentor] Error creating task:', error);
      alert('Failed to create task: ' + error.message);
    }
  }

  async function updateTaskStatus(taskId, newStatus) {
    try {
      await Task.update(taskId, { status: newStatus });
      tasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
      console.log('[Mentor] Updated task status:', taskId, newStatus);
    } catch (error) {
      console.error('[Mentor] Error updating task:', error);
    }
  }

  async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await Task.delete(taskId);
      tasks = tasks.filter(t => t.id !== taskId);
      console.log('[Mentor] Deleted task:', taskId);
    } catch (error) {
      console.error('[Mentor] Error deleting task:', error);
    }
  }

  // Feedback & Approval
  async function provideFeedback() {
    try {
      const entry = timeEntries.find(e => e.id === feedbackForm.entry_id);
      if (!entry) return;

      await TimeEntry.update(entry.id, {
        status: feedbackForm.status,
        mentor_comments: feedbackForm.comments,
        rating: feedbackForm.rating,
        reviewed_by: user?.email,
        reviewed_at: new Date().toISOString()
      });

      timeEntries = timeEntries.map(e => 
        e.id === entry.id 
          ? { ...e, status: feedbackForm.status, mentor_comments: feedbackForm.comments, rating: feedbackForm.rating }
          : e
      );

      showFeedbackDialog = false;
      resetFeedbackForm();
      await loadMentorData();
      console.log('[Mentor] Provided feedback for entry:', entry.id);
    } catch (error) {
      console.error('[Mentor] Error providing feedback:', error);
    }
  }

  async function approveEntry(entryId) {
    try {
      await TimeEntry.update(entryId, {
        status: 'approved',
        reviewed_by: user?.email,
        reviewed_at: new Date().toISOString()
      });
      timeEntries = timeEntries.map(e => e.id === entryId ? { ...e, status: 'approved' } : e);
      await loadMentorData();
      console.log('[Mentor] Approved entry:', entryId);
    } catch (error) {
      console.error('[Mentor] Error approving entry:', error);
    }
  }

  async function rejectEntry(entryId) {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    
    try {
      await TimeEntry.update(entryId, {
        status: 'rejected',
        mentor_comments: reason,
        reviewed_by: user?.email,
        reviewed_at: new Date().toISOString()
      });
      timeEntries = timeEntries.map(e => 
        e.id === entryId 
          ? { ...e, status: 'rejected', mentor_comments: reason }
          : e
      );
      await loadMentorData();
      console.log('[Mentor] Rejected entry:', entryId);
    } catch (error) {
      console.error('[Mentor] Error rejecting entry:', error);
    }
  }

  // Messaging
  function openMessageDialog(studentEmail) {
    messageForm.to_student = studentEmail;
    showMessageDialog = true;
  }

  async function sendMessage() {
    console.log('[Mentor] Sending message:', messageForm);
    // TODO: Implement messaging system
    alert('Message sent! (Messaging system to be implemented)');
    showMessageDialog = false;
    resetMessageForm();
  }

  // Progress Reports
  async function submitReport() {
    console.log('[Mentor] Submitting report:', reportForm);
    // TODO: Implement report submission to admin
    alert('Report submitted to admin! (Report system to be implemented)');
    showReportDialog = false;
    resetReportForm();
  }

  // Form helpers
  function resetTaskForm() {
    taskForm = {
      title: '',
      description: '',
      assigned_to: '',
      due_date: '',
      priority: 'medium',
      status: 'assigned'
    };
  }

  function resetFeedbackForm() {
    feedbackForm = {
      entry_id: '',
      rating: 5,
      comments: '',
      status: 'approved'
    };
  }

  function resetReportForm() {
    reportForm = {
      student_id: '',
      report_type: 'weekly',
      content: '',
      period_start: '',
      period_end: ''
    };
  }

  function resetMessageForm() {
    messageForm = {
      to_student: '',
      subject: '',
      message: ''
    };
  }

  function openFeedbackDialog(entry) {
    feedbackForm.entry_id = entry.id;
    showFeedbackDialog = true;
  }

  function getStudentName(email) {
    const student = assignedStudents.find(s => s.student_email === email);
    return student?.full_name || email;
  }

  function getStudentNameById(studentId) {
    const student = assignedStudents.find(s => s.id === studentId);
    return student?.full_name || `Student #${studentId}`;
  }

  function getTasksByStudent(studentEmail) {
    const student = assignedStudents.find(s => s.student_email === studentEmail);
    return tasks.filter(t => t.student_id === student?.id);
  }

  function getEntriesByStudent(studentEmail) {
    return timeEntries.filter(e => e.created_by === studentEmail);
  }

  function selectStudent(student) {
    selectedStudent = student;
    activeTab = 'students';
  }
</script>

<!-- Mentor Dashboard Content (embedded version) -->
<div class="p-8">
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-4xl font-bold text-white mb-2">Mentor Dashboard</h1>
    <p class="text-white/70">Manage your students, track progress, and provide guidance</p>
  </div>

    <!-- Stats Overview -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <div class="flex items-center justify-between mb-2">
          <Users class="w-8 h-8 text-blue-400" />
          <span class="text-3xl font-bold text-white">{stats.totalStudents}</span>
        </div>
        <p class="text-white/70 text-sm">Assigned Students</p>
      </div>

      <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <div class="flex items-center justify-between mb-2">
          <Clock class="w-8 h-8 text-yellow-400" />
          <span class="text-3xl font-bold text-white">{stats.pendingSubmissions}</span>
        </div>
        <p class="text-white/70 text-sm">Pending Reviews</p>
      </div>

      <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <div class="flex items-center justify-between mb-2">
          <CheckCircle class="w-8 h-8 text-green-400" />
          <span class="text-3xl font-bold text-white">{stats.completedTasks}</span>
        </div>
        <p class="text-white/70 text-sm">Completed Tasks</p>
      </div>

      <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <div class="flex items-center justify-between mb-2">
          <TrendingUp class="w-8 h-8 text-purple-400" />
          <span class="text-3xl font-bold text-white">{stats.totalHoursThisWeek.toFixed(1)}</span>
        </div>
        <p class="text-white/70 text-sm">Hours This Week</p>
      </div>
    </div>

    <!-- Content Area -->
    <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 mt-8">
      
      {#if activeTab === 'students'}
        <!-- Students Management -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-2xl font-bold text-white">My Students</h2>
            <p class="text-white/70">{assignedStudents.length} total students</p>
          </div>
          <Button
            on:click={loadMentorData}
            class="bg-blue-500 hover:bg-blue-600 text-white h-10 px-4 rounded-md flex items-center"
            disabled={isLoading}
          >
            <RefreshCw class="w-4 h-4 mr-2 {isLoading ? 'animate-spin' : ''}" />
            {isLoading ? 'Refreshing...' : 'Reload Students'}
          </Button>
        </div>

        {#if isLoading}
          <div class="text-center py-8">
            <Clock class="w-12 h-12 text-white/50 mx-auto animate-spin" />
            <p class="text-white/70 mt-4">Loading students...</p>
          </div>
        {:else if assignedStudents.length === 0}
          <div class="text-center py-12 bg-white/5 rounded-xl">
            <Users class="w-16 h-16 text-white/30 mx-auto mb-4" />
            <p class="text-white/70">No students assigned yet</p>
            <p class="text-white/50 text-sm mt-2">Contact your admin to get students assigned</p>
          </div>
        {:else}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each assignedStudents as student}
              <div class="bg-white/5 rounded-xl border border-white/20 p-6 hover:bg-white/10 transition-all">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <UserIcon class="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 class="text-lg font-bold text-white">{student.full_name}</h3>
                      <p class="text-white/50 text-sm">{student.student_email}</p>
                    </div>
                  </div>
                </div>

                <div class="space-y-2 mb-4">
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-white/70">Contract Hours:</span>
                    <span class="text-white font-semibold">{student.contract_hours}h</span>
                  </div>
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-white/70">Active Tasks:</span>
                    <span class="text-white font-semibold">{getTasksByStudent(student.student_email).length}</span>
                  </div>
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-white/70">Pending Reviews:</span>
                    <span class="text-yellow-400 font-semibold">
                      {getEntriesByStudent(student.student_email).filter(e => e.status === 'draft').length}
                    </span>
                  </div>
                </div>

                <div class="flex gap-2">
                  <Button 
                    on:click={() => selectStudent(student)}
                    class="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm"
                  >
                    View Details
                  </Button>
                  <Button 
                    on:click={() => openMessageDialog(student.student_email)}
                    class="bg-purple-500 hover:bg-purple-600 text-white"
                  >
                    <MessageSquare class="w-4 h-4" />
                  </Button>
                </div>
              </div>
            {/each}
          </div>
        {/if}

        {#if selectedStudent}
          <div class="mt-8 bg-white/5 rounded-xl border border-white/20 p-6">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-xl font-bold text-white">Student Details: {selectedStudent.full_name}</h3>
              <Button 
                on:click={() => selectedStudent = null}
                variant="ghost"
                class="text-white/70 hover:text-white"
              >
                <X class="w-4 h-4" />
              </Button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 class="text-white font-semibold mb-3">Contact Information</h4>
                <div class="space-y-2">
                  <div class="flex items-center gap-2 text-white/70">
                    <Mail class="w-4 h-4" />
                    <span class="text-sm">{selectedStudent.student_email}</span>
                  </div>
                  <div class="flex items-center gap-2 text-white/70">
                    <Calendar class="w-4 h-4" />
                    <span class="text-sm">Start: {selectedStudent.start_date || 'Not set'}</span>
                  </div>
                  <div class="flex items-center gap-2 text-white/70">
                    <Target class="w-4 h-4" />
                    <span class="text-sm">Contract: {selectedStudent.contract_hours} hours</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 class="text-white font-semibold mb-3">Recent Activity</h4>
                <div class="space-y-2">
                  {#each getEntriesByStudent(selectedStudent.student_email).slice(0, 3) as entry}
                    <div class="text-sm text-white/70 flex items-center justify-between">
                      <span>{entry.date}</span>
                      <span class="px-2 py-1 rounded text-xs {entry.status === 'approved' ? 'bg-green-500/20 text-green-400' : entry.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}">
                        {entry.status}
                      </span>
                    </div>
                  {:else}
                    <p class="text-white/50 text-sm">No recent activity</p>
                  {/each}
                </div>
              </div>
            </div>
          </div>
        {/if}

      {:else if activeTab === 'tasks'}
        <!-- Tasks & Projects -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-white">Tasks & Projects</h2>
          <div class="flex gap-3">
            <Button
              on:click={loadMentorData}
              class="bg-blue-500 hover:bg-blue-600 text-white h-10 px-4 rounded-md flex items-center"
              disabled={isLoading}
            >
              <RefreshCw class="w-4 h-4 mr-2 {isLoading ? 'animate-spin' : ''}" />
              {isLoading ? 'Refreshing...' : 'Reload Tasks'}
            </Button>
            <Button 
              on:click={() => showTaskDialog = true}
              class="bg-green-500 hover:bg-green-600 text-white h-10 rounded-md px-4 flex items-center"
            >
              <Plus class="w-4 h-4 mr-2" />
              Create Task
            </Button>
          </div>
        </div>

        {#if tasks.length === 0}
          <div class="text-center py-12 bg-white/5 rounded-xl">
            <ClipboardList class="w-16 h-16 text-white/30 mx-auto mb-4" />
            <p class="text-white/70">No tasks created yet</p>
            <Button 
              on:click={() => showTaskDialog = true}
              class="mt-4 bg-green-500 hover:bg-green-600 text-white h-10 px-2 rounded-md"
            >
              Create First Task
            </Button>
          </div>
        {:else}
          <div class="space-y-4">
            {#each tasks as task}
              <div class="bg-white/5 rounded-xl border border-white/20 p-6">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                      <h3 class="text-lg font-bold text-white">{task.title}</h3>
                      <span class="px-3 py-1 rounded-full text-xs {task.priority === 'high' ? 'bg-red-500/20 text-red-400' : task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}">
                        {task.priority}
                      </span>
                      <span class="px-3 py-1 rounded-full text-xs {task.status === 'completed' ? 'bg-green-500/20 text-green-400' : task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}">
                        {task.status}
                      </span>
                    </div>
                    <p class="text-white/70 text-sm mb-2">{task.description}</p>
                    <div class="flex items-center gap-4 text-xs text-white/50">
                      <span>Assigned to: {getStudentNameById(task.student_id)}</span>
                      <span>Due: {task.due_date || 'No deadline'}</span>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <Button 
                      on:click={() => deleteTask(task.id)}
                      variant="ghost"
                      class="text-red-400 hover:text-red-300"
                    >
                      <Trash2 class="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {#if task.status !== 'completed'}
                  <div class="flex gap-2 mt-4">
                    <Button 
                      on:click={() => updateTaskStatus(task.id, 'in_progress')}
                      class="bg-blue-500 hover:bg-blue-600 text-white text-sm"
                      disabled={task.status === 'in_progress'}
                    >
                      Mark In Progress
                    </Button>
                    <Button 
                      on:click={() => updateTaskStatus(task.id, 'completed')}
                      class="bg-green-500 hover:bg-green-600 text-white text-sm"
                    >
                      Mark Complete
                    </Button>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}

      {:else if activeTab === 'submissions'}
        <!-- Time Entry Submissions & Approval -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-white">Student Submissions</h2>
          <p class="text-white/70">{stats.pendingSubmissions} pending reviews</p>
        </div>

        {#if timeEntries.length === 0}
          <div class="text-center py-12 bg-white/5 rounded-xl">
            <FileText class="w-16 h-16 text-white/30 mx-auto mb-4" />
            <p class="text-white/70">No submissions yet</p>
          </div>
        {:else}
          <div class="space-y-4">
            {#each timeEntries.filter(e => e.status === 'draft') as entry}
              <div class="bg-white/5 rounded-xl border border-white/20 p-6">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                      <h3 class="text-lg font-bold text-white">{getStudentName(entry.created_by)}</h3>
                      <span class="px-3 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                        Pending Review
                      </span>
                    </div>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span class="text-white/50">Date:</span>
                        <span class="text-white ml-2">{entry.date}</span>
                      </div>
                      <div>
                        <span class="text-white/50">Hours:</span>
                        <span class="text-white ml-2">{entry.manually_inputted_hours || 0}</span>
                      </div>
                      <div>
                        <span class="text-white/50">Start:</span>
                        <span class="text-white ml-2">{entry.start_time || 'N/A'}</span>
                      </div>
                      <div>
                        <span class="text-white/50">End:</span>
                        <span class="text-white ml-2">{entry.end_time || 'N/A'}</span>
                      </div>
                    </div>
                    {#if entry.description}
                      <p class="text-white/70 text-sm mt-2">{entry.description}</p>
                    {/if}
                  </div>
                </div>

                <div class="flex gap-2">
                  <Button 
                    on:click={() => approveEntry(entry.id)}
                    class="bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Check class="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    on:click={() => rejectEntry(entry.id)}
                    class="bg-red-500 hover:bg-red-600 text-white"
                  >
                    <X class="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button 
                    on:click={() => openFeedbackDialog(entry)}
                    class="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <MessageSquare class="w-4 h-4 mr-2" />
                    Provide Feedback
                  </Button>
                </div>
              </div>
            {/each}

            <!-- Approved/Rejected Entries -->
            <div class="mt-8">
              <h3 class="text-xl font-bold text-white mb-4">Recent Reviews</h3>
              <div class="space-y-3">
                {#each timeEntries.filter(e => e.status !== 'draft').slice(0, 5) as entry}
                  <div class="bg-white/5 rounded-lg border border-white/20 p-4 flex items-center justify-between">
                    <div class="flex-1">
                      <span class="text-white font-semibold">{getStudentName(entry.created_by)}</span>
                      <span class="text-white/50 text-sm ml-3">{entry.date}</span>
                      <span class="text-white/70 text-sm ml-3">{entry.manually_inputted_hours || 0}h</span>
                    </div>
                    <span class="px-3 py-1 rounded-full text-xs {entry.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
                      {entry.status}
                    </span>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        {/if}

      {:else if activeTab === 'reports'}
        <!-- Progress Reports -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-white">Progress Reports</h2>
          <Button 
            on:click={() => showReportDialog = true}
            class="bg-purple-500 hover:bg-purple-600 text-white h-10 rounded-md px-2 flex items-center"
          >
            <Plus class="w-4 h-4 mr-2" />
            Submit Report
          </Button>
        </div>

        <div class="bg-white/5 rounded-xl border border-white/20 p-6">
          <h3 class="text-lg font-bold text-white mb-4">Submit Reports to Admin</h3>
          <p class="text-white/70 mb-4">Create weekly or monthly progress reports about your students' performance and submit them to the administration.</p>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-white/5 rounded-lg p-4">
              <h4 class="text-white font-semibold mb-2">Weekly Summary</h4>
              <p class="text-white/70 text-sm">Total hours: {stats.totalHoursThisWeek.toFixed(1)}h</p>
              <p class="text-white/70 text-sm">Active students: {assignedStudents.length}</p>
            </div>
            <div class="bg-white/5 rounded-lg p-4">
              <h4 class="text-white font-semibold mb-2">Task Completion</h4>
              <p class="text-white/70 text-sm">Completed: {stats.completedTasks}</p>
              <p class="text-white/70 text-sm">In Progress: {tasks.filter(t => t.status === 'in_progress').length}</p>
            </div>
            <div class="bg-white/5 rounded-lg p-4">
              <h4 class="text-white font-semibold mb-2">Pending Items</h4>
              <p class="text-white/70 text-sm">Reviews needed: {stats.pendingSubmissions}</p>
              <p class="text-white/70 text-sm">Open tasks: {tasks.filter(t => t.status === 'assigned').length}</p>
            </div>
          </div>

          <Button 
            on:click={() => showReportDialog = true}
            class="bg-purple-500 hover:bg-purple-600 text-white w-full h-10 rounded-md px-2 flex items-center justify-center"
          >
            <FileText class="w-4 h-4 mr-2" />
            Create Detailed Report
          </Button>
        </div>

      {:else if activeTab === 'profile'}
        <!-- Mentor Profile -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-white">My Profile & Availability</h2>
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
                  class="bg-white/5 border-white/20 text-white mt-1"
                />
              </div>
              <div>
                <label class="text-white/70 text-sm">Email</label>
                <Input 
                  value={user?.email}
                  disabled
                  class="bg-white/5 border-white/20 text-white mt-1"
                />
              </div>
              <div>
                <label class="text-white/70 text-sm">Role</label>
                <Input 
                  value="Mentor"
                  disabled
                  class="bg-white/5 border-white/20 text-white mt-1"
                />
              </div>
            </div>
          </div>

          <div class="bg-white/5 rounded-xl border border-white/20 p-6">
            <h3 class="text-lg font-bold text-white mb-4">Statistics</h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-white/70">Total Students Assigned:</span>
                <span class="text-white font-bold text-xl">{stats.totalStudents}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-white/70">Total Tasks Created:</span>
                <span class="text-white font-bold text-xl">{tasks.length}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-white/70">Reviews Completed:</span>
                <span class="text-white font-bold text-xl">{timeEntries.filter(e => e.status !== 'draft').length}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-white/70">Completion Rate:</span>
                <span class="text-green-400 font-bold text-xl">
                  {tasks.length > 0 ? Math.round((stats.completedTasks / tasks.length) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 bg-white/5 rounded-xl border border-white/20 p-6">
          <h3 class="text-lg font-bold text-white mb-4">Request Support</h3>
          <p class="text-white/70 mb-4">Need additional resources, have concerns, or require administrative support?</p>
          <Button class="bg-orange-500 hover:bg-orange-600 text-white h-10 rounded-md px-2 flex items-center">
            <Mail class="w-4 h-4 mr-2" />
            Contact Admin
          </Button>
        </div>
      {/if}
    </div>
</div>

<!-- Task Creation Dialog -->
{#if showTaskDialog}
  <Dialog bind:open={showTaskDialog}>
    <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 rounded-3xl">
      <div class="bg-tarnsparent rounded-xl border border-white/20 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 class="text-2xl font-bold text-white mb-6">Create New Task</h2>
        
        <div class="space-y-4">
          <div>
            <label class="text-white/70 text-sm block mb-2">Task Title</label>
            <Input 
              bind:value={taskForm.title}
              placeholder="Enter task title"
              class="bg-white/5 border-white/20 text-white"
            />
          </div>

          <div>
            <label class="text-white/70 text-sm block mb-2">Description</label>
            <textarea 
              bind:value={taskForm.description}
              placeholder="Describe the task..."
              class="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-white/50 min-h-[100px]"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-white/70 text-sm block mb-2">Assign To Student</label>
              <select 
                bind:value={taskForm.assigned_to}
                class="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white"
              >
                <option value="">Select student</option>
                {#each assignedStudents as student}
                  <option value={student.student_email}>{student.full_name}</option>
                {/each}
              </select>
            </div>

            <div>
              <label class="text-white/70 text-sm block mb-2">Due Date</label>
              <Input 
                type="date"
                bind:value={taskForm.due_date}
                class="bg-white/5 border-white/20 text-white"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-white/70 text-sm block mb-2">Priority</label>
              <select 
                bind:value={taskForm.priority}
                class="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label class="text-white/70 text-sm block mb-2">Status</label>
              <select 
                bind:value={taskForm.status}
                class="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white"
              >
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <Button 
            on:click={createTask}
            class="flex-1 bg-green-500 hover:bg-green-600 text-white h-10 rounded-md px-2 flex items-center justify-center"
            disabled={!taskForm.title || !taskForm.assigned_to}
          >
            Create Task
          </Button>
          <Button 
            on:click={() => { showTaskDialog = false; resetTaskForm(); }}
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

<!-- Feedback Dialog -->
{#if showFeedbackDialog}
  <Dialog bind:open={showFeedbackDialog}>
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-gray-900 rounded-xl border border-white/20 p-6 max-w-2xl w-full">
        <h2 class="text-2xl font-bold text-white mb-6">Provide Feedback</h2>
        
        <div class="space-y-4">
          <div>
            <label class="text-white/70 text-sm block mb-2">Rating (1-10)</label>
            <Input 
              type="number"
              min="1"
              max="10"
              bind:value={feedbackForm.rating}
              class="bg-white/5 border-white/20 text-white"
            />
          </div>

          <div>
            <label class="text-white/70 text-sm block mb-2">Comments & Feedback</label>
            <textarea 
              bind:value={feedbackForm.comments}
              placeholder="Provide detailed feedback..."
              class="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-white/50 min-h-[120px]"
            />
          </div>

          <div>
            <label class="text-white/70 text-sm block mb-2">Status</label>
            <select 
              bind:value={feedbackForm.status}
              class="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white"
            >
              <option value="approved">Approve</option>
              <option value="rejected">Reject</option>
              <option value="needs_revision">Needs Revision</option>
            </select>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <Button 
            on:click={provideFeedback}
            class="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
          >
            Submit Feedback
          </Button>
          <Button 
            on:click={() => { showFeedbackDialog = false; resetFeedbackForm(); }}
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

<!-- Report Submission Dialog -->
{#if showReportDialog}
  <Dialog bind:open={showReportDialog}>
    <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 rounded-3xl">
      <div class="bg-transparent rounded-xl border border-white/20 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 class="text-2xl font-bold text-white mb-6">Submit Progress Report</h2>
        
        <div class="space-y-4">
          <div>
            <label class="text-white/70 text-sm block mb-2">Report Type</label>
            <select 
              bind:value={reportForm.report_type}
              class="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white"
            >
              <option value="weekly">Weekly Report</option>
              <option value="monthly">Monthly Report</option>
              <option value="incident">Incident Report</option>
              <option value="progress">Progress Update</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-white/70 text-sm block mb-2">Period Start</label>
              <Input 
                type="date"
                bind:value={reportForm.period_start}
                class="bg-white/5 border-white/20 text-white"
              />
            </div>
            <div>
              <label class="text-white/70 text-sm block mb-2">Period End</label>
              <Input 
                type="date"
                bind:value={reportForm.period_end}
                class="bg-white/5 border-white/20 text-white"
              />
            </div>
          </div>

          <div>
            <label class="text-white/70 text-sm block mb-2">Select Student (Optional)</label>
            <select 
              bind:value={reportForm.student_id}
              class="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white"
            >
              <option value="">All Students</option>
              {#each assignedStudents as student}
                <option value={student.id}>{student.full_name}</option>
              {/each}
            </select>
          </div>

          <div>
            <label class="text-white/70 text-sm block mb-2">Report Content</label>
            <textarea 
              bind:value={reportForm.content}
              placeholder="Write your detailed progress report here..."
              class="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-white/50 min-h-[200px]"
            />
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <Button 
            on:click={submitReport}
            class="flex-1 bg-purple-500 hover:bg-purple-600 text-white flex h-10 items-center justify-center rounded-md"
            disabled={!reportForm.content}
          >
            <Send class="w-4 h-4 mr-2" />
            Submit to Admin
          </Button>
          <Button 
            on:click={() => { showReportDialog = false; resetReportForm(); }}
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

<!-- Message Dialog -->
{#if showMessageDialog}
  <Dialog bind:open={showMessageDialog}>
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-gray-900 rounded-xl border border-white/20 p-6 max-w-2xl w-full">
        <h2 class="text-2xl font-bold text-white mb-6">Send Message</h2>
        
        <div class="space-y-4">
          <div>
            <label class="text-white/70 text-sm block mb-2">To</label>
            <Input 
              value={getStudentName(messageForm.to_student)}
              disabled
              class="bg-white/5 border-white/20 text-white"
            />
          </div>

          <div>
            <label class="text-white/70 text-sm block mb-2">Subject</label>
            <Input 
              bind:value={messageForm.subject}
              placeholder="Message subject"
              class="bg-white/5 border-white/20 text-white"
            />
          </div>

          <div>
            <label class="text-white/70 text-sm block mb-2">Message</label>
            <textarea 
              bind:value={messageForm.message}
              placeholder="Write your message..."
              class="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-white/50 min-h-[120px]"
            />
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <Button 
            on:click={sendMessage}
            class="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
            disabled={!messageForm.subject || !messageForm.message}
          >
            <Send class="w-4 h-4 mr-2" />
            Send Message
          </Button>
          <Button 
            on:click={() => { showMessageDialog = false; resetMessageForm(); }}
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
