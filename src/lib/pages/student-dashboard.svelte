<script>
  import { onMount } from 'svelte';
  import { Task, TimeEntry, Student, Schedule, Message, User } from '../../entities/all';
  import { userStore } from '../../stores/userStore';
  import Button from '$lib/components/ui/button.svelte';
  import Input from '$lib/components/ui/input.svelte';
  import Dialog from '$lib/components/ui/dialog.svelte';
  import {
    ClipboardList, Upload, TrendingUp, MessageSquare,
    Mail, User as UserIcon, BookOpen, Calendar,
    CheckCircle, Clock, AlertCircle, FileText,
    Award, Target, Send, Download, Star,
    Briefcase, GraduationCap, Activity, RefreshCw
  } from 'lucide-svelte';
  import { format, parseISO } from 'date-fns';

  $: user = $userStore.user;
  $: selectedStudent = $userStore.selectedStudent;

  // Accept initialTab prop from parent component
  export let initialTab = 'tasks';

  // State variables
  let activeTab = initialTab;

  // Update activeTab when initialTab changes
  $: activeTab = initialTab;

  let myTasks = [];
  let mySubmissions = [];
  let mySchedule = [];
  let myFeedback = [];
  let mentorInfo = null;
  let messages = [];
  let isLoading = false;
  let isLoadingMessages = false;

  // Modal states
  let showSubmitWorkModal = false;
  let showMessageModal = false;
  let showResourceModal = false;
  let showTimeTrackerModal = false;

  // Form data
  let submitWorkForm = {
    taskId: null,
    description: '',
    file: null,
    hoursWorked: 1,
    submittedAt: new Date().toISOString()
  };

  let messageForm = {
    subject: '',
    message: ''
  };

  // Time tracking state
  let timeTracker = {
    isWorking: false,
    startTime: null,
    endTime: null,
    breakStart: null,
    breakEnd: null,
    isOnBreak: false,
    currentSession: null
  };

  // Stats
  let stats = {
    totalTasks: 0,
    completedTasks: 0,
    pendingSubmissions: 0,
    totalHours: 0,
    approvedHours: 0,
    completionPercentage: 0,
    contractHours: 600
  };

  onMount(async () => {
    await loadStudentData();
    await loadMessages();
  });

  async function loadMessages() {
    isLoadingMessages = true;
    try {
      messages = await Message.getStudentMessages();
      console.log('[Student Dashboard] Loaded messages:', messages.length);
    } catch (error) {
      console.error('[Student Dashboard] Error loading messages:', error);
      messages = [];
    }
    isLoadingMessages = false;
  }

  async function loadStudentData() {
    isLoading = true;
    try {
      // First, find the student record for this user
      const allStudents = await Student.list();
      const studentRecord = allStudents.find(s => s.student_email === user?.email);
      console.log('[Student Dashboard] Student record found:', studentRecord);

      // Load mentor information if student has mentor assigned
      if (studentRecord?.mentor_email) {
        try {
          const allUsers = await User.list();
          console.log('[Student Dashboard] All users:', allUsers);
          console.log('[Student Dashboard] Looking for mentor:', studentRecord.mentor_email);
          
          mentorInfo = allUsers.find(u => u.email === studentRecord.mentor_email);
          if (!mentorInfo) {
            // If mentor not found, let's see what mentors exist
            const mentors = allUsers.filter(u => u.role && u.role.toLowerCase().includes('mentor'));
            console.log('[Student Dashboard] Available mentors:', mentors);
            
            // If there's only one mentor, use that one
            if (mentors.length === 1) {
              console.log('[Student Dashboard] Using the only available mentor:', mentors[0].email);
              mentorInfo = mentors[0];
              // Update the student record to use the correct mentor
              studentRecord.mentor_email = mentors[0].email;
            } else {
              // Create a basic info object
              mentorInfo = {
                email: studentRecord.mentor_email,
                full_name: studentRecord.mentor_email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                role: 'mentor'
              };
            }
          }
          console.log('[Student Dashboard] Mentor info loaded:', mentorInfo);
        } catch (error) {
          console.error('Error loading mentor info:', error);
          mentorInfo = {
            email: studentRecord.mentor_email,
            full_name: 'Mentor',
            role: 'mentor'
          };
        }
        
        // Update selectedStudent to use the correct mentor email and info
        selectedStudent = {
          ...studentRecord,
          mentor_email: mentorInfo.email
        };
        
        // Update the userStore using the proper method
        userStore.setSelectedStudent(selectedStudent);
      }

      // Load tasks assigned to this student using student_id
      const allTasks = await Task.list();
      if (studentRecord) {
        myTasks = allTasks.filter(t => t.student_id === studentRecord.id);
        console.log('[Student Dashboard] Found tasks for student ID:', studentRecord.id, 'Tasks:', myTasks);
      } else {
        console.warn('[Student Dashboard] No student record found for email:', user?.email);
        myTasks = [];
      }

      // Load time entries (submissions)
      const allEntries = await TimeEntry.list();
      mySubmissions = allEntries.filter(e => e.created_by === user?.email);

      // Load schedule
      const allSchedule = await Schedule.list();
      mySchedule = allSchedule.filter(s =>
        s.student_email === user?.email ||
        s.assigned_to === user?.email
      );

      // Calculate stats
      stats.totalTasks = myTasks.length;
      stats.completedTasks = myTasks.filter(t => t.status === 'completed').length;
      stats.pendingSubmissions = mySubmissions.filter(s => s.status === 'draft').length;
      stats.approvedHours = mySubmissions.reduce((sum, e) => sum + (parseFloat(e.approved_hours) || 0), 0);
      stats.totalHours = mySubmissions.reduce((sum, e) => sum + (parseFloat(e.manually_inputted_hours) || 0), 0);
      stats.contractHours = selectedStudent?.contract_hours || 600;
      stats.completionPercentage = Math.round((stats.approvedHours / stats.contractHours) * 100);

      // Mock feedback data (since we don't have a feedback entity yet)
      myFeedback = mySubmissions
        .filter(e => e.mentor_comments && e.mentor_comments.trim() !== '')
        .map(e => ({
          id: e.id,
          date: e.date,
          rating: e.rating || 0,
          comments: e.mentor_comments,
          status: e.status
        }));

      console.log('[Student Dashboard] Data loaded:', stats);
    } catch (error) {
      console.error('[Student Dashboard] Error loading data:', error);
    }
    isLoading = false;
  }

  async function submitWork() {
    try {
      // First, find the student record for this user
      const allStudents = await Student.list();
      const studentRecord = allStudents.find(s => s.student_email === user?.email);
      
      if (!studentRecord) {
        alert('Student record not found. Please contact your administrator.');
        return;
      }

      // Create a new time entry or submission
      const submission = {
        student_id: studentRecord.id,
        date: format(new Date(), 'yyyy-MM-dd'),
        description: submitWorkForm.description,
        status: 'submitted',
        created_by: user?.email,
        created_at: new Date().toISOString()
      };

      await TimeEntry.create(submission);

      // If a task is selected, update its completion status
      if (submitWorkForm.taskId) {
        try {
          // Calculate hours worked (default to 1 hour if not specified)
          const hoursWorked = submitWorkForm.hoursWorked || 1;
          
          // Get current task to update its hours
          const currentTask = myTasks.find(t => t.id === submitWorkForm.taskId);
          if (currentTask) {
            const newHoursWorked = (currentTask.hours_worked || 0) + hoursWorked;
            const estimatedHours = currentTask.estimated_hours || 8; // Default 8 hours if not set
            const progressPercentage = Math.min(100, Math.round((newHoursWorked / estimatedHours) * 100));
            
            await Task.update(submitWorkForm.taskId, {
              status: 'completed',
              hours_worked: newHoursWorked,
              progress_percentage: progressPercentage
            });
            
            console.log(`Task ${submitWorkForm.taskId} marked as completed with ${newHoursWorked}h worked`);
          }
        } catch (taskError) {
          console.error('Error updating task status:', taskError);
          // Don't fail the whole submission if task update fails
        }
      }
      alert('Work submitted successfully!');
      showSubmitWorkModal = false;
      submitWorkForm = {
        taskId: null,
        description: '',
        file: null,
        hoursWorked: 1,
        submittedAt: new Date().toISOString()
      };
      await loadStudentData();
    } catch (error) {
      console.error('Error submitting work:', error);
      alert('Failed to submit work');
    }
  }

  async function sendMessage() {
    try {
      console.log('[Student] Sending message:', messageForm);
      console.log('[Student] Selected student record:', selectedStudent);
      console.log('[Student] Mentor email from selectedStudent:', selectedStudent?.mentor_email);
      
      if (!selectedStudent?.mentor_email) {
        alert('No mentor assigned. Please contact your admin.');
        return;
      }

      await Message.send({
        to_email: selectedStudent.mentor_email,
        to_role: 'Mentor',
        subject: messageForm.subject,
        content: messageForm.message,
        student_id: selectedStudent.id,
        mentor_email: selectedStudent.mentor_email
      });

      console.log('[Student] Message sent to:', selectedStudent.mentor_email);

      alert('Message sent to mentor successfully!');
      showMessageModal = false;
      messageForm = { subject: '', message: '' };
      await loadMessages(); // Reload messages to show sent message
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  }

  // Time tracking functions
  async function startWork() {
    try {
      const now = new Date();
      timeTracker.isWorking = true;
      timeTracker.startTime = now.toISOString();
      timeTracker.endTime = null;
      
      // Find student record
      const allStudents = await Student.list();
      const studentRecord = allStudents.find(s => s.student_email === user?.email);
      
      if (studentRecord) {
        // Create a new time entry session
        const sessionData = {
          student_id: studentRecord.id,
          date: format(now, 'yyyy-MM-dd'),
          start_time: format(now, 'HH:mm'),
          status: 'draft',
          created_by: user?.email,
          created_at: now.toISOString()
        };
        
        const session = await TimeEntry.create(sessionData);
        timeTracker.currentSession = session;
        
        alert('Work session started!');
      }
    } catch (error) {
      console.error('Error starting work session:', error);
      alert('Failed to start work session');
    }
  }

  async function endWork() {
    try {
      if (!timeTracker.currentSession) {
        alert('No active session found');
        return;
      }

      const now = new Date();
      timeTracker.isWorking = false;
      timeTracker.endTime = now.toISOString();
      
      // Update the current session with end time
      const updatedData = {
        end_time: format(now, 'HH:mm'),
        break_start: timeTracker.breakStart ? format(new Date(timeTracker.breakStart), 'HH:mm') : null,
        break_end: timeTracker.breakEnd ? format(new Date(timeTracker.breakEnd), 'HH:mm') : null,
        status: 'submitted'
      };
      
      await TimeEntry.update(timeTracker.currentSession.id, updatedData);
      
      // Calculate hours worked and update related task if any
      if (timeTracker.startTime) {
        const startTime = new Date(timeTracker.startTime);
        const endTime = now;
        const breakTime = timeTracker.breakStart && timeTracker.breakEnd ? 
          (new Date(timeTracker.breakEnd) - new Date(timeTracker.breakStart)) / (1000 * 60 * 60) : 0;
        const hoursWorked = Math.max(0, (endTime - startTime) / (1000 * 60 * 60) - breakTime);
        
        // Update any in-progress task for this student
        try {
          const studentTasks = myTasks.filter(t => t.status === 'in_progress');
          if (studentTasks.length > 0) {
            const task = studentTasks[0]; // Take the first in-progress task
            const newHoursWorked = (task.hours_worked || 0) + hoursWorked;
            const estimatedHours = task.estimated_hours || 8;
            const progressPercentage = Math.min(100, Math.round((newHoursWorked / estimatedHours) * 100));
            
            await Task.update(task.id, {
              hours_worked: newHoursWorked,
              progress_percentage: progressPercentage,
              status: progressPercentage >= 100 ? 'completed' : 'in_progress'
            });
            
            console.log(`Updated task ${task.id}: ${hoursWorked.toFixed(2)}h added, ${progressPercentage}% complete`);
          }
        } catch (taskError) {
          console.error('Error updating task progress:', taskError);
        }
      }
      
      // Reset tracker
      timeTracker = {
        isWorking: false,
        startTime: null,
        endTime: null,
        breakStart: null,
        breakEnd: null,
        isOnBreak: false,
        currentSession: null
      };
      
      alert('Work session ended and submitted!');
      await loadStudentData();
    } catch (error) {
      console.error('Error ending work session:', error);
      alert('Failed to end work session');
    }
  }

  async function startBreak() {
    if (!timeTracker.isWorking) {
      alert('Start work session first');
      return;
    }
    
    timeTracker.isOnBreak = true;
    timeTracker.breakStart = new Date().toISOString();
    alert('Break started');
  }

  async function endBreak() {
    if (!timeTracker.isOnBreak) {
      alert('No active break to end');
      return;
    }
    
    timeTracker.isOnBreak = false;
    timeTracker.breakEnd = new Date().toISOString();
    alert('Break ended');
  }

  function getTaskPriorityColor(priority) {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'low': return 'bg-green-500/20 text-green-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400';
      case 'in_progress': return 'bg-blue-500/20 text-blue-400';
      case 'approved': return 'bg-green-500/20 text-green-400';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      case 'draft': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  }
</script>

<!-- Student Dashboard Content (embedded version) -->
<div class="p-8">
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-4xl font-bold text-white mb-2">My Dashboard</h1>
    <p class="text-white/70">Track your internship progress, tasks, and communicate with your mentor</p>
  </div>

  <!-- Stats Overview -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
      <div class="flex items-center justify-between mb-2">
        <ClipboardList class="w-8 h-8 text-blue-400" />
        <span class="text-3xl font-bold text-white">{stats.totalTasks}</span>
      </div>
      <p class="text-white/70 text-sm">Total Tasks</p>
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
        <Clock class="w-8 h-8 text-yellow-400" />
        <span class="text-3xl font-bold text-white">{stats.approvedHours}</span>
      </div>
      <p class="text-white/70 text-sm">Approved Hours</p>
    </div>

    <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
      <div class="flex items-center justify-between mb-2">
        <Target class="w-8 h-8 text-purple-400" />
        <span class="text-3xl font-bold text-white">{stats.completionPercentage}%</span>
      </div>
      <p class="text-white/70 text-sm">Progress</p>
    </div>
  </div>

  <!-- Content Area -->
  <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 mt-8">

    {#if activeTab === 'tasks'}
      <!-- My Tasks & Projects -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-white">My Tasks & Projects</h2>
          <span class="text-white/70">{stats.completedTasks} of {stats.totalTasks} completed</span>
        </div>
        <div class="flex gap-2">
          {#if timeTracker.isWorking}
            <Button
              on:click={endWork}
              class="bg-red-500 hover:bg-red-600 text-white h-10 px-4 rounded-md flex items-center"
            >
              <Clock class="w-4 h-4 mr-2" />
              End Work
            </Button>
            {#if timeTracker.isOnBreak}
              <Button
                on:click={endBreak}
                class="bg-yellow-500 hover:bg-yellow-600 text-white h-10 px-4 rounded-md flex items-center"
              >
                <Clock class="w-4 h-4 mr-2" />
                End Break
              </Button>
            {:else}
              <Button
                on:click={startBreak}
                class="bg-yellow-500 hover:bg-yellow-600 text-white h-10 px-4 rounded-md flex items-center"
              >
                <Clock class="w-4 h-4 mr-2" />
                Start Break
              </Button>
            {/if}
          {:else}
            <Button
              on:click={startWork}
              class="bg-green-500 hover:bg-green-600 text-white h-10 px-4 rounded-md flex items-center"
            >
              <Clock class="w-4 h-4 mr-2" />
              Start Work
            </Button>
          {/if}
          <Button
            on:click={loadStudentData}
            class="bg-blue-500 hover:bg-blue-600 text-white h-10 px-4 rounded-md flex items-center"
            disabled={isLoading}
          >
            <RefreshCw class="w-4 h-4 mr-2 {isLoading ? 'animate-spin' : ''}" />
            {isLoading ? 'Refreshing...' : 'Reload Tasks'}
          </Button>
        </div>
      </div>

      {#if isLoading}
        <div class="text-center py-8">
          <Clock class="w-12 h-12 text-white/50 mx-auto animate-spin" />
          <p class="text-white/70 mt-4">Loading tasks...</p>
        </div>
      {:else if myTasks.length === 0}
        <div class="text-center py-12 bg-white/5 rounded-xl">
          <ClipboardList class="w-16 h-16 text-white/30 mx-auto mb-4" />
          <p class="text-white/70">No tasks assigned yet</p>
          <p class="text-white/50 text-sm mt-2">Your mentor will assign tasks soon</p>
        </div>
      {:else}
        <div class="space-y-4">
          {#each myTasks as task}
            <div class="bg-white/5 rounded-xl border border-white/20 p-6">
              <div class="flex items-start justify-between mb-4">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-2">
                    <h3 class="text-lg font-bold text-white">{task.title}</h3>
                    <span class="px-3 py-1 rounded-full text-xs capitalize {getTaskPriorityColor(task.priority)}">
                      {task.priority || 'normal'}
                    </span>
                    <span class="px-3 py-1 rounded-full text-xs capitalize {getStatusColor(task.status)}">
                      {task.status || 'assigned'}
                    </span>
                  </div>
                  <p class="text-white/70 text-sm mb-3">{task.description}</p>
                  <div class="flex items-center gap-4 text-xs text-white/50 mb-3">
                    <span class="flex items-center gap-1">
                      <Calendar class="w-4 h-4" />
                      Due: {task.due_date || 'No deadline'}
                    </span>
                    <span class="flex items-center gap-1">
                      <UserIcon class="w-4 h-4" />
                      Assigned by: {task.created_by || 'Mentor'}
                    </span>
                    <span class="flex items-center gap-1">
                      <Clock class="w-4 h-4" />
                      {task.hours_worked || 0}h / {task.estimated_hours || 8}h
                    </span>
                    <span>{task.progress_percentage || 0}% complete</span>
                  </div>
                  
                  <!-- Progress Bar -->
                  <div class="w-full bg-white/10 rounded-full h-2 mb-3">
                    <div 
                      class="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                      style="width: {task.progress_percentage || 0}%"
                    ></div>
                  </div>
                </div>
              </div>

              {#if task.status !== 'completed'}
                <div class="flex gap-2">
                  <Button class="bg-blue-500 hover:bg-blue-600 text-white">
                    Start Working
                  </Button>
                  <Button
                    on:click={() => { submitWorkForm.taskId = task.id; showSubmitWorkModal = true; }}
                    class="bg-green-500 hover:bg-green-600 text-white h-10 rounded-md px-2 flex items-center"
                  >
                    <Upload class="w-4 h-4 mr-2" />
                    Submit Work
                  </Button>
                </div>
              {:else}
                <div class="flex items-center gap-2 text-green-400">
                  <CheckCircle class="w-5 h-5" />
                  <span class="font-semibold">Completed</span>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}

    {:else if activeTab === 'submissions'}
      <!-- My Submissions -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-white">My Submissions</h2>
        <div class="flex gap-2">
          <Button
            on:click={loadStudentData}
            variant="outline"
            class="text-white border-white/20 hover:bg-white/10"
          >
            <RefreshCw class="w-4 h-4 mr-2" />
            Reload
          </Button>
          <Button
            on:click={() => showSubmitWorkModal = true}
            class="bg-green-500 hover:bg-green-600 text-white h-10 rounded-md px-2 flex items-center"
          >
            <Upload class="w-4 h-4 mr-2" />
            Submit New Work
          </Button>
        </div>
      </div>

      <div class="space-y-4">
        {#each mySubmissions as submission}
          <div class="bg-white/5 rounded-xl border border-white/20 p-6">
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <h3 class="text-white font-bold">{submission.date}</h3>
                  <span class="px-3 py-1 rounded-full text-xs capitalize {getStatusColor(submission.status)}">
                    {submission.status}
                  </span>
                </div>
                {#if submission.description}
                  <p class="text-white/70 text-sm mb-2">{submission.description}</p>
                {/if}
                <div class="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <p class="text-white/50 text-xs">Hours Submitted</p>
                    <p class="text-white font-semibold">{submission.manually_inputted_hours || 0}h</p>
                  </div>
                  {#if submission.status === 'approved'}
                    <div>
                      <p class="text-white/50 text-xs">Approved Hours</p>
                      <p class="text-green-400 font-semibold">{submission.approved_hours || 0}h</p>
                    </div>
                  {/if}
                </div>
              </div>
            </div>

            {#if submission.mentor_comments}
              <div class="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                <p class="text-white/70 text-sm font-semibold mb-2">Mentor Feedback:</p>
                <p class="text-white/60 text-sm">{submission.mentor_comments}</p>
                {#if submission.rating}
                  <div class="flex items-center gap-1 mt-2">
                    {#each Array(submission.rating) as _, i}
                      <Star class="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {:else}
          <div class="text-center py-12 bg-white/5 rounded-xl">
            <FileText class="w-16 h-16 text-white/30 mx-auto mb-4" />
            <p class="text-white/70">No submissions yet</p>
            <Button
              on:click={() => showSubmitWorkModal = true}
              class="mt-4 bg-green-500 hover:bg-green-600 text-white h-10 rounded-md px-2 "
            >
              Submit Your First Work
            </Button>
          </div>
        {/each}
      </div>

    {:else if activeTab === 'progress'}
      <!-- My Progress & Deadlines -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-white">My Progress & Deadlines</h2>
      </div>

      <!-- Progress Overview -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div class="bg-white/5 rounded-xl border border-white/20 p-6">
          <h3 class="text-white font-bold mb-4 flex items-center gap-2">
            <Target class="w-5 h-5 text-purple-400" />
            Contract Progress
          </h3>
          <div class="space-y-4">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-white/70 text-sm">Hours Completed</span>
                <span class="text-white font-semibold">{stats.approvedHours} / {stats.contractHours}h</span>
              </div>
              <div class="w-full bg-white/10 rounded-full h-3">
                <div
                  class="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all"
                  style="width: {stats.completionPercentage}%"
                ></div>
              </div>
              <p class="text-white/50 text-xs mt-1">{stats.completionPercentage}% Complete</p>
            </div>

            <div class="pt-4 border-t border-white/10">
              <p class="text-white/70 text-sm">Hours Remaining</p>
              <p class="text-3xl font-bold text-white">{stats.contractHours - stats.approvedHours}h</p>
            </div>
          </div>
        </div>

        <div class="bg-white/5 rounded-xl border border-white/20 p-6">
          <h3 class="text-white font-bold mb-4 flex items-center gap-2">
            <Activity class="w-5 h-5 text-green-400" />
            Task Progress
          </h3>
          <div class="space-y-4">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-white/70 text-sm">Tasks Completed</span>
                <span class="text-white font-semibold">{stats.completedTasks} / {stats.totalTasks}</span>
              </div>
              <div class="w-full bg-white/10 rounded-full h-3">
                <div
                  class="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all"
                  style="width: {stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0}%"
                ></div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div>
                <p class="text-white/70 text-sm">In Progress</p>
                <p class="text-2xl font-bold text-blue-400">{myTasks.filter(t => t.status === 'in_progress').length}</p>
              </div>
              <div>
                <p class="text-white/70 text-sm">Pending</p>
                <p class="text-2xl font-bold text-yellow-400">{myTasks.filter(t => t.status === 'assigned').length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Upcoming Deadlines -->
      <div class="bg-white/5 rounded-xl border border-white/20 p-6">
        <h3 class="text-white font-bold mb-4 flex items-center gap-2">
          <AlertCircle class="w-5 h-5 text-yellow-400" />
          Upcoming Deadlines
        </h3>
        <div class="space-y-3">
          {#each myTasks.filter(t => t.due_date && t.status !== 'completed') as task}
            <div class="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <p class="text-white font-medium">{task.title}</p>
                <p class="text-white/60 text-sm">{task.due_date}</p>
              </div>
              <span class="px-3 py-1 rounded-full text-xs {getTaskPriorityColor(task.priority)}">
                {task.priority || 'normal'}
              </span>
            </div>
          {:else}
            <p class="text-white/50 text-center py-4">No upcoming deadlines</p>
          {/each}
        </div>
      </div>

    {:else if activeTab === 'feedback'}
      <!-- Feedback & Evaluations -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-white">Feedback & Evaluations</h2>
      </div>

      {#if myFeedback.length === 0}
        <div class="text-center py-12 bg-white/5 rounded-xl">
          <MessageSquare class="w-16 h-16 text-white/30 mx-auto mb-4" />
          <p class="text-white/70">No feedback yet</p>
          <p class="text-white/50 text-sm mt-2">Your mentor will provide feedback on your submissions</p>
        </div>
      {:else}
        <div class="space-y-4">
          {#each myFeedback as feedback}
            <div class="bg-white/5 rounded-xl border border-white/20 p-6">
              <div class="flex items-start justify-between mb-4">
                <div>
                  <h3 class="text-white font-bold mb-1">Submission from {feedback.date}</h3>
                  {#if feedback.rating > 0}
                    <div class="flex items-center gap-1 mb-2">
                      {#each Array(feedback.rating) as _, i}
                        <Star class="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      {/each}
                      <span class="text-white/70 text-sm ml-2">({feedback.rating}/10)</span>
                    </div>
                  {/if}
                </div>
                <span class="px-3 py-1 rounded-full text-xs {getStatusColor(feedback.status)}">
                  {feedback.status}
                </span>
              </div>

              <div class="p-4 bg-white/5 rounded-lg border border-white/10">
                <p class="text-white/70 text-sm font-semibold mb-2 flex items-center gap-2">
                  <Award class="w-4 h-4 text-blue-400" />
                  Mentor's Feedback:
                </p>
                <p class="text-white/80 text-sm leading-relaxed">{feedback.comments}</p>
              </div>
            </div>
          {/each}
        </div>
      {/if}

    {:else if activeTab === 'messages'}
      <!-- Messages / Communication -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-white">Messages</h2>
        <Button
          on:click={() => showMessageModal = true}
          class="bg-blue-500 hover:bg-blue-600 text-white h-10 rounded-md px-2 flex items-center"
        >
          <Send class="w-4 h-4 mr-2" />
          New Message
        </Button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white/5 rounded-xl border border-white/20 p-6">
          <h3 class="text-white font-bold mb-4 flex items-center gap-2">
            <UserIcon class="w-5 h-5 text-blue-400" />
            Your Mentor
          </h3>
          {#if mentorInfo}
            <div class="space-y-3">
              <div>
                <p class="text-white/70 text-sm">Name</p>
                <p class="text-white font-medium">{mentorInfo.full_name || mentorInfo.email}</p>
              </div>
              <div>
                <p class="text-white/70 text-sm">Email</p>
                <p class="text-white/80 text-sm">{mentorInfo.email}</p>
              </div>
              <Button
                on:click={() => showMessageModal = true}
                class="w-full bg-blue-500 hover:bg-blue-600 text-white mt-4 h-10 rounded-md px-2 flex items-center justify-center"
              >
                <Mail class="w-4 h-4 mr-2" />
                Send Message
              </Button>
            </div>
          {:else if selectedStudent?.mentor_email}
            <div class="space-y-3">
              <div>
                <p class="text-white/70 text-sm">Name</p>
                <p class="text-white font-medium">{selectedStudent.mentor_email}</p>
              </div>
              <div>
                <p class="text-white/70 text-sm">Email</p>
                <p class="text-white/80 text-sm">{selectedStudent.mentor_email}</p>
              </div>
              <Button
                on:click={() => showMessageModal = true}
                class="w-full bg-blue-500 hover:bg-blue-600 text-white mt-4 h-10 rounded-md px-2 flex items-center justify-center"
              >
                <Mail class="w-4 h-4 mr-2" />
                Send Message
              </Button>
            </div>
          {:else}
            <p class="text-white/50 text-sm">No mentor assigned yet</p>
          {/if}
        </div>

        <div class="bg-white/5 rounded-xl border border-white/20 p-6">
          <h3 class="text-white font-bold mb-4 flex items-center gap-2">
            <MessageSquare class="w-5 h-5 text-purple-400" />
            Quick Communication
          </h3>
          <p class="text-white/70 text-sm mb-4">
            Stay in touch with your mentor for guidance, questions, and feedback.
          </p>
          <div class="space-y-2">
            <Button class="w-full bg-white/5 hover:bg-white/10 text-white justify-start">
              Request Meeting
            </Button>
            <Button class="w-full bg-white/5 hover:bg-white/10 text-white justify-start">
              Ask a Question
            </Button>
            <Button class="w-full bg-white/5 hover:bg-white/10 text-white justify-start">
              Report an Issue
            </Button>
          </div>
        </div>
      </div>

      <!-- Message History -->
      <div class="mt-6 bg-white/5 rounded-xl border border-white/20 p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-white font-bold">Message History</h3>
          <Button
            on:click={loadMessages}
            variant="ghost"
            class="text-white/70 hover:text-white"
            disabled={isLoadingMessages}
          >
            <RefreshCw class="w-4 h-4 mr-2 {isLoadingMessages ? 'animate-spin' : ''}" />
            {isLoadingMessages ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        {#if isLoadingMessages}
          <div class="text-center py-8">
            <div class="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full mx-auto mb-4"></div>
            <p class="text-white/60">Loading messages...</p>
          </div>
        {:else if messages.length === 0}
          <div class="text-center py-8">
            <MessageSquare class="w-12 h-12 text-white/30 mx-auto mb-4" />
            <p class="text-white/50 text-sm">No messages yet</p>
            <p class="text-white/40 text-xs mt-2">Your conversation with your mentor will appear here</p>
          </div>
        {:else}
          <div class="space-y-4 max-h-80 overflow-y-auto">
            {#each messages as message}
              <div class="bg-white/5 rounded-lg border border-white/10 p-4">
                <div class="flex items-start justify-between mb-2">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
                      <UserIcon class="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p class="text-white font-medium text-sm">
                        {message.from_email === user?.email ? 'You' : (mentorInfo?.full_name || 'Mentor')}
                      </p>
                      <p class="text-white/50 text-xs">
                        {format(parseISO(message.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                  {#if !message.is_read && message.to_email === user?.email}
                    <span class="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">New</span>
                  {/if}
                </div>
                
                <h4 class="text-white font-semibold text-sm mb-2">{message.subject}</h4>
                <p class="text-white/80 text-sm leading-relaxed">{message.content}</p>
              </div>
            {/each}
          </div>
        {/if}
      </div>

    {:else if activeTab === 'profile'}
      <!-- My Profile & Portfolio -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-white">My Profile & Portfolio</h2>
        <Button class="bg-blue-500 hover:bg-blue-600 text-white h-10 rounded-md px-2 flex items-center">
          Edit Profile
        </Button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white/5 rounded-xl border border-white/20 p-6">
          <h3 class="text-lg font-bold text-white mb-4">Personal Information</h3>
          <div class="space-y-4">
            <div>
              <label class="text-white/70 text-sm">Full Name</label>
              <Input
                value={selectedStudent?.full_name || ''}
                disabled
                class="bg-white/5 border-white/20 text-white mt-1"
              />
            </div>
            <div>
              <label class="text-white/70 text-sm">Email</label>
              <Input
                value={selectedStudent?.student_email || user?.email}
                disabled
                class="bg-white/5 border-white/20 text-white mt-1"
              />
            </div>
            <div>
              <label class="text-white/70 text-sm">Department</label>
              <Input
                value={selectedStudent?.department || 'Not specified'}
                disabled
                class="bg-white/5 border-white/20 text-white mt-1"
              />
            </div>
            <div>
              <label class="text-white/70 text-sm">Position</label>
              <Input
                value={selectedStudent?.position || 'Intern'}
                disabled
                class="bg-white/5 border-white/20 text-white mt-1"
              />
            </div>
          </div>
        </div>

        <div class="bg-white/5 rounded-xl border border-white/20 p-6">
          <h3 class="text-lg font-bold text-white mb-4">Internship Details</h3>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-white/70">Start Date:</span>
              <span class="text-white font-medium">{selectedStudent?.start_date || 'Not set'}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-white/70">End Date:</span>
              <span class="text-white font-medium">{selectedStudent?.end_date || 'Not set'}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-white/70">Contract Hours:</span>
              <span class="text-white font-bold text-xl">{stats.contractHours}h</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-white/70">Completed Hours:</span>
              <span class="text-green-400 font-bold text-xl">{stats.approvedHours}h</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-white/70">Remaining:</span>
              <span class="text-blue-400 font-bold text-xl">{stats.contractHours - stats.approvedHours}h</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Portfolio Section -->
      <div class="mt-6 bg-white/5 rounded-xl border border-white/20 p-6">
        <h3 class="text-white font-bold mb-4 flex items-center gap-2">
          <Briefcase class="w-5 h-5 text-purple-400" />
          My Portfolio
        </h3>
        <p class="text-white/70 text-sm mb-4">
          Showcase your work, projects, and achievements during your internship.
        </p>
        <Button class="bg-purple-500 hover:bg-purple-600 text-white h-10 rounded-md px-2 flex items-center">
          <Upload class="w-4 h-4 mr-2" />
          Upload Portfolio Item
        </Button>
      </div>

    {:else if activeTab === 'resources'}
      <!-- Learning Resources & Materials -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-white">Learning Resources & Materials</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div class="bg-white/5 rounded-xl border border-white/20 p-6 hover:bg-white/10 transition-all cursor-pointer">
          <BookOpen class="w-10 h-10 text-blue-400 mb-3" />
          <h3 class="text-white font-bold mb-2">Documentation</h3>
          <p class="text-white/60 text-sm mb-4">Access project documentation and guides</p>
          <Button class="w-full bg-blue-500 hover:bg-blue-600 text-white h-10 rounded-md px-2 flex items-center justify-center">
            View Docs
          </Button>
        </div>

        <div class="bg-white/5 rounded-xl border border-white/20 p-6 hover:bg-white/10 transition-all cursor-pointer">
          <GraduationCap class="w-10 h-10 text-green-400 mb-3" />
          <h3 class="text-white font-bold mb-2">Training Materials</h3>
          <p class="text-white/60 text-sm mb-4">Onboarding and skill development resources</p>
          <Button class="w-full bg-green-500 hover:bg-green-600 text-white h-10 rounded-md px-2 flex items-center justify-center">
            Start Learning
          </Button>
        </div>

        <div class="bg-white/5 rounded-xl border border-white/20 p-6 hover:bg-white/10 transition-all cursor-pointer">
          <FileText class="w-10 h-10 text-purple-400 mb-3" />
          <h3 class="text-white font-bold mb-2">Templates</h3>
          <p class="text-white/60 text-sm mb-4">Download templates for reports and submissions</p>
          <Button class="w-full bg-purple-500 hover:bg-purple-600 text-white h-10 rounded-md px-2 flex items-center justify-center">
            <Download class="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      <!-- Resource Library -->
      <div class="bg-white/5 rounded-xl border border-white/20 p-6">
        <h3 class="text-white font-bold mb-4">Resource Library</h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-all">
            <div class="flex items-center gap-3">
              <FileText class="w-5 h-5 text-blue-400" />
              <div>
                <p class="text-white font-medium">Getting Started Guide</p>
                <p class="text-white/60 text-sm">Introduction to your internship program</p>
              </div>
            </div>
            <Download class="w-5 h-5 text-white/50" />
          </div>

          <div class="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-all">
            <div class="flex items-center gap-3">
              <FileText class="w-5 h-5 text-green-400" />
              <div>
                <p class="text-white font-medium">Code Style Guidelines</p>
                <p class="text-white/60 text-sm">Best practices and coding standards</p>
              </div>
            </div>
            <Download class="w-5 h-5 text-white/50" />
          </div>

          <div class="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-all">
            <div class="flex items-center gap-3">
              <FileText class="w-5 h-5 text-purple-400" />
              <div>
                <p class="text-white font-medium">Project Documentation</p>
                <p class="text-white/60 text-sm">Technical specifications and requirements</p>
              </div>
            </div>
            <Download class="w-5 h-5 text-white/50" />
          </div>
        </div>
      </div>

    {:else if activeTab === 'schedule'}
      <!-- Schedule & Milestones -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-white">Schedule & Milestones</h2>
      </div>

      <!-- Internship Timeline -->
      <div class="bg-white/5 rounded-xl border border-white/20 p-6 mb-6">
        <h3 class="text-white font-bold mb-4 flex items-center gap-2">
          <Calendar class="w-5 h-5 text-blue-400" />
          Internship Timeline
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p class="text-white/70 text-sm mb-1">Start Date</p>
            <p class="text-white font-bold text-lg">{selectedStudent?.start_date || 'Not set'}</p>
          </div>
          <div>
            <p class="text-white/70 text-sm mb-1">End Date</p>
            <p class="text-white font-bold text-lg">{selectedStudent?.end_date || 'Not set'}</p>
          </div>
          <div>
            <p class="text-white/70 text-sm mb-1">Duration</p>
            <p class="text-white font-bold text-lg">12 weeks</p>
          </div>
        </div>
      </div>

      <!-- Milestones -->
      <div class="bg-white/5 rounded-xl border border-white/20 p-6 mb-6">
        <h3 class="text-white font-bold mb-4 flex items-center gap-2">
          <Target class="w-5 h-5 text-purple-400" />
          Key Milestones
        </h3>
        <div class="space-y-4">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle class="w-5 h-5 text-green-400" />
            </div>
            <div class="flex-1">
              <p class="text-white font-semibold">Onboarding Complete</p>
              <p class="text-white/60 text-sm">Completed orientation and initial setup</p>
              <p class="text-green-400 text-xs mt-1">✓ Completed</p>
            </div>
          </div>

          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Clock class="w-5 h-5 text-blue-400" />
            </div>
            <div class="flex-1">
              <p class="text-white font-semibold">Mid-Term Review</p>
              <p class="text-white/60 text-sm">Performance evaluation and feedback session</p>
              <p class="text-blue-400 text-xs mt-1">⏳ In Progress</p>
            </div>
          </div>

          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center flex-shrink-0">
              <Target class="w-5 h-5 text-gray-400" />
            </div>
            <div class="flex-1">
              <p class="text-white font-semibold">Final Project</p>
              <p class="text-white/60 text-sm">Complete and present capstone project</p>
              <p class="text-gray-400 text-xs mt-1">○ Upcoming</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Schedule Events -->
      <div class="bg-white/5 rounded-xl border border-white/20 p-6">
        <h3 class="text-white font-bold mb-4">Upcoming Events</h3>
        {#if mySchedule.length > 0}
          <div class="space-y-3">
            {#each mySchedule as event}
              <div class="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div class="flex items-center gap-3">
                  <Calendar class="w-5 h-5 text-blue-400" />
                  <div>
                    <p class="text-white font-medium">{event.title || 'Event'}</p>
                    <p class="text-white/60 text-sm">{event.start_time} - {event.end_time}</p>
                  </div>
                </div>
                <span class="text-white/50 text-sm">{event.date}</span>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-white/50 text-center py-8">No upcoming events scheduled</p>
        {/if}
      </div>
    {/if}
  </div>
</div>

<!-- Submit Work Modal -->
{#if showSubmitWorkModal}
  <Dialog bind:open={showSubmitWorkModal}>
    <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div class="bg-transparent rounded-xl border border-white/20 p-6 max-w-2xl w-full">
        <h2 class="text-2xl font-bold text-white mb-6">Submit Work</h2>

        <div class="space-y-4">
          <div>
            <label class="text-white/70 text-sm block mb-2">Task (Optional)</label>
            <select
              bind:value={submitWorkForm.taskId}
              class="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white"
            >
              <option value={null}>General submission</option>
              {#each myTasks as task}
                <option value={task.id}>{task.title}</option>
              {/each}
            </select>
          </div>

          <div>
            <label class="text-white/70 text-sm block mb-2">Description</label>
            <textarea
              bind:value={submitWorkForm.description}
              placeholder="Describe what you worked on..."
              class="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-white/50 min-h-[120px]"
            />
          </div>

          <div>
            <label class="text-white/70 text-sm block mb-2">Hours Worked</label>
            <Input
              bind:value={submitWorkForm.hoursWorked}
              type="number"
              step="0.25"
              min="0.25"
              max="24"
              placeholder="1.0"
              class="bg-white/5 border-white/20 text-white"
            />
          </div>

          <div>
            <label class="text-white/70 text-sm block mb-2">Upload File (Optional)</label>
            <Input
              type="file"
              class="bg-white/5 border-white/20 text-white"
            />
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <Button
            on:click={submitWork}
            class="flex-1 bg-green-500 hover:bg-green-600 text-white h-10 rounded-md px-2 flex items-center justify-center"
          >
            <Upload class="w-4 h-4 mr-2" />
            Submit Work
          </Button>
          <Button
            on:click={() => { showSubmitWorkModal = false; }}
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

<!-- Message Modal -->
{#if showMessageModal}
  <Dialog bind:open={showMessageModal}>
    <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div class="bg-transparent rounded-xl border border-white/20 p-6 max-w-2xl w-full">
        <h2 class="text-2xl font-bold text-white mb-6">Send Message to Mentor</h2>

        <div class="space-y-4">
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
              class="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-white/50 min-h-[150px]"
            />
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <Button
            on:click={sendMessage}
            class="flex-1 bg-blue-500 hover:bg-blue-600 text-white h-10 rounded-md px-2 flex items-center justify-center"
            disabled={!messageForm.subject || !messageForm.message}
          >
            <Send class="w-4 h-4 mr-2" />
            Send Message
          </Button>
          <Button
            on:click={() => { showMessageModal = false; messageForm = { subject: '', message: '' }; }}
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
