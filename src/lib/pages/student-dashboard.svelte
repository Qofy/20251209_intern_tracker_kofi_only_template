<script>
  import { onMount, onDestroy } from 'svelte';
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
    Briefcase, GraduationCap, Activity, RefreshCw, Rocket, AlarmClock
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

  // Enhanced Time tracking state with real-time functionality
  let timeTracker = {
    isWorking: false,
    startTime: null,
    endTime: null,
    breakStart: null,
    breakEnd: null,
    isOnBreak: false,
    currentSession: null,
    // New real-time tracking fields
    currentTaskId: null,
    elapsedTime: 0, // in seconds
    breakElapsedTime: 0, // total break time in seconds
    timerInterval: null,
    displayTime: '00:00:00',
    totalBreakTime: 0 // accumulated break time
  };

  // Enhanced Stats with actual progress tracking
  let stats = {
    totalTasks: 0,
    completedTasks: 0,
    pendingSubmissions: 0,
    totalHours: 0,
    approvedHours: 0,
    completionPercentage: 0,
    contractHours: 600,
    // New task progress fields
    totalEstimatedHours: 0,
    totalHoursWorked: 0,
    averageTaskProgress: 0,
    taskCompletionRate: 0
  };

  // Reactive statements to automatically update stats when data changes
  $: if (myTasks) {
    stats.totalTasks = myTasks.length;
    stats.completedTasks = myTasks.filter(t => t.status === 'completed').length;
    stats.totalEstimatedHours = myTasks.reduce((sum, t) => sum + (parseFloat(t.estimated_hours) || 0), 0);
    stats.totalHoursWorked = myTasks.reduce((sum, t) => sum + (parseFloat(t.hours_worked) || 0), 0);
    stats.averageTaskProgress = myTasks.length > 0 ? 
      Math.round(myTasks.reduce((sum, t) => sum + (parseInt(t.progress_percentage) || 0), 0) / myTasks.length) : 0;
    stats.taskCompletionRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;
  }

  $: if (mySubmissions) {
    stats.pendingSubmissions = mySubmissions.filter(s => s.status === 'draft').length;
    stats.approvedHours = mySubmissions.reduce((sum, e) => sum + (parseFloat(e.approved_hours) || 0), 0);
    stats.totalHours = mySubmissions.reduce((sum, e) => sum + (parseFloat(e.manually_inputted_hours) || 0), 0);
  }

  $: if (selectedStudent) {
    stats.contractHours = selectedStudent?.contract_hours || 600;
    stats.completionPercentage = Math.min(100, Math.round((stats.approvedHours / stats.contractHours) * 100));
  }

  onMount(async () => {
    await loadStudentData();
    await loadMessages();
  });

  onDestroy(() => {
    // Clean up timer when component is destroyed
    stopTimer();
  });

  onDestroy(() => {
    // Clean up timer when component is destroyed
    stopTimer();
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

  // Function to update task progress dynamically
  async function updateTaskProgress(taskId, newProgress, hoursWorked = 0) {
    try {
      const taskIndex = myTasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return;

      const task = myTasks[taskIndex];
      const updatedHours = (parseFloat(task.hours_worked) || 0) + hoursWorked;
      
      // Handle progress percentage - use existing progress if newProgress is null/undefined
      let progressPercentage;
      if (newProgress !== null && newProgress !== undefined) {
        progressPercentage = Math.min(100, Math.max(0, parseInt(newProgress)));
      } else {
        // Keep existing progress, but recalculate based on hours if we're adding time
        progressPercentage = parseInt(task.progress_percentage) || 0;
        
        // Optionally update progress based on hours worked vs estimated hours
        if (hoursWorked > 0 && task.estimated_hours) {
          const estimatedHours = parseFloat(task.estimated_hours);
          const hoursBasedProgress = Math.min(100, Math.round((updatedHours / estimatedHours) * 100));
          // Use the higher of current progress or hours-based progress
          progressPercentage = Math.max(progressPercentage, hoursBasedProgress);
        }
      }
      
      // Automatically mark as completed if progress is 100%
      const newStatus = progressPercentage >= 100 ? 'completed' : 
                       progressPercentage > 0 ? 'in_progress' : 'assigned';

      // Prepare update data - only include fields that should be updated
      const updateData = {
        hours_worked: updatedHours,
        progress_percentage: progressPercentage,
        status: newStatus
      };

      console.log(`Updating task ${taskId}:`, updateData);

      // Update the task in the database
      const updatedTask = await Task.update(taskId, updateData);

      // Update local task array
      myTasks[taskIndex] = {
        ...myTasks[taskIndex],
        hours_worked: updatedHours,
        progress_percentage: progressPercentage,
        status: newStatus
      };
      
      // Trigger reactivity
      myTasks = myTasks;

      console.log(`Task ${taskId} updated: ${progressPercentage}% complete, ${updatedHours}h worked, status: ${newStatus}`);
      
      if (newStatus === 'completed') {
        alert(`🎉 Task "${task.title}" has been completed!`);
      }

    } catch (error) {
      console.error('Error updating task progress:', error);
      
      // Provide specific error messages based on the error type
      let errorMessage = 'Failed to update task progress';
      
      if (error.message) {
        if (error.message.includes('Internal server error')) {
          errorMessage = 'Server error: Please check your internet connection and try again';
        } else if (error.message.includes('not found')) {
          errorMessage = 'Task not found: Please refresh the page and try again';
        } else {
          errorMessage = `Update failed: ${error.message}`;
        }
      }
      
      alert(`❌ ${errorMessage}\n\n🔧 If this problem persists, please contact your mentor or administrator.`);
    }
  }

  // Function to mark task as completed manually
  async function markTaskCompleted(taskId) {
    await updateTaskProgress(taskId, 100);
  }

  // Enhanced Timer Functions with Visual Feedback
  
  // Format seconds to HH:MM:SS display
  function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Update timer display every second with enhanced notifications
  function startTimer() {
    if (timeTracker.timerInterval) return; // Already running
    
    timeTracker.timerInterval = setInterval(() => {
      if (timeTracker.isWorking && !timeTracker.isOnBreak) {
        timeTracker.elapsedTime++;
        timeTracker.displayTime = formatTime(timeTracker.elapsedTime);
        
        // Visual feedback every 15 minutes
        if (timeTracker.elapsedTime > 0 && timeTracker.elapsedTime % 900 === 0) {
          const minutes = timeTracker.elapsedTime / 60;
          console.log(`⏰ Time tracking: ${minutes} minutes worked!`);
          alert(`⏰ Time Update: You've been working for ${Math.floor(minutes)} minutes! Great progress! 💪`);
        }
        
        // Update page title with current time every 10 seconds
        if (timeTracker.elapsedTime % 10 === 0) {
          if (typeof document !== 'undefined') {
            const taskName = timeTracker.currentTaskId ? 
              (myTasks.find(t => t.id === timeTracker.currentTaskId)?.title || 'Task') : 'Work';
            document.title = `⏱️ ${timeTracker.displayTime} - ${taskName} | Intern Tracker`;
          }
        }
      }
      // Force reactivity
      timeTracker = { ...timeTracker };
    }, 1000);
  }
  
  // Stop the timer and reset page title
  function stopTimer() {
    if (timeTracker.timerInterval) {
      clearInterval(timeTracker.timerInterval);
      timeTracker.timerInterval = null;
    }
    
    // Reset page title
    if (typeof document !== 'undefined') {
      document.title = 'Intern Tracker - Student Dashboard';
    }
  }

  // Start work session with timer
  async function startWork(taskId = null) {
    try {
      const now = new Date();
      timeTracker.isWorking = true;
      timeTracker.startTime = now.toISOString();
      timeTracker.endTime = null;
      timeTracker.currentTaskId = taskId;
      timeTracker.elapsedTime = 0;
      timeTracker.totalBreakTime = 0;
      timeTracker.displayTime = '00:00:00';
      
      // Start the real-time timer
      startTimer();
      
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
          created_at: now.toISOString(),
          description: taskId ? `Working on task ${taskId}` : 'General work session'
        };
        
        const session = await TimeEntry.create(sessionData);
        timeTracker.currentSession = session;
        
        // Update task status to in_progress if specified
        if (taskId) {
          try {
            await updateTaskProgress(taskId, null, 0); // Don't change progress, just update status
            const task = myTasks.find(t => t.id === taskId);
            if (task && task.status === 'assigned') {
              await Task.update(taskId, { status: 'in_progress' });
              // Update local state
              const taskIndex = myTasks.findIndex(t => t.id === taskId);
              if (taskIndex !== -1) {
                myTasks[taskIndex].status = 'in_progress';
                myTasks = myTasks; // Trigger reactivity
              }
            }
          } catch (taskError) {
            console.error('Error updating task status:', taskError);
          }
        }
        
        const taskInfo = taskId ? `\n📋 Task: ${myTasks.find(t => t.id === taskId)?.title || 'Unknown'}` : '\n📝 General work session';
        alert(`🚀 Timer Started!${taskInfo}\n\n⏱️ Time tracking is now active and visible in the header.\n\n💡 Tip: Take breaks when needed and the timer will pause automatically!`);
      }
    } catch (error) {
      console.error('Error starting work session:', error);
      alert('Failed to start work session');
      stopTimer();
    }
  }
  
  // Start break
  function startBreak() {
    if (!timeTracker.isWorking || timeTracker.isOnBreak) return;
    
    timeTracker.isOnBreak = true;
    timeTracker.breakStart = new Date().toISOString();
    timeTracker.breakElapsedTime = 0;
    
    // Timer continues running but doesn't increment work time during break
    alert('☕ Break Time!\n\n⏸️ Timer is now paused. Your work time tracking has stopped.\n\n🔄 Click "Resume" when you\'re ready to continue working!');
  }
  
  // End break
  function endBreak() {
    if (!timeTracker.isWorking || !timeTracker.isOnBreak) return;
    
    timeTracker.isOnBreak = false;
    timeTracker.breakEnd = new Date().toISOString();
    
    // Calculate break duration and add to total break time
    if (timeTracker.breakStart) {
      const breakDuration = Math.floor((new Date() - new Date(timeTracker.breakStart)) / 1000);
      timeTracker.totalBreakTime += breakDuration;
    }
    
    // Resume timer (work time calculation resumes)
    alert('🔄 Work Resumed!\n\n▶️ Timer is now active again. Your work time tracking has resumed.\n\n💪 Let\'s get back to being productive!');
  }
  
  // End work session
  async function endWork() {
    try {
      if (!timeTracker.currentSession) {
        alert('No active session found');
        return;
      }

      const now = new Date();
      timeTracker.isWorking = false;
      timeTracker.endTime = now.toISOString();
      
      // Stop the timer
      stopTimer();
      
      // If currently on break, end it
      if (timeTracker.isOnBreak) {
        endBreak();
      }
      
      // Calculate total work time (excluding breaks)
      const totalSessionTime = timeTracker.elapsedTime; // seconds
      const totalWorkTimeHours = Math.max(0, (totalSessionTime - timeTracker.totalBreakTime) / 3600);
      
      // Update the current session with end time and break info
      const updatedData = {
        end_time: format(now, 'HH:mm'),
        break_start: timeTracker.breakStart ? format(new Date(timeTracker.breakStart), 'HH:mm') : null,
        break_end: timeTracker.breakEnd ? format(new Date(timeTracker.breakEnd), 'HH:mm') : null,
        status: 'submitted',
        manually_inputted_hours: totalWorkTimeHours.toFixed(2),
        notes: `Session: ${formatTime(totalSessionTime)}, Breaks: ${formatTime(timeTracker.totalBreakTime)}, Work: ${formatTime(totalSessionTime - timeTracker.totalBreakTime)}`
      };
      
      await TimeEntry.update(timeTracker.currentSession.id, updatedData);
      
      // Update related task if specified
      if (timeTracker.currentTaskId && totalWorkTimeHours > 0) {
        try {
          await updateTaskProgress(timeTracker.currentTaskId, null, totalWorkTimeHours);
          
          const task = myTasks.find(t => t.id === timeTracker.currentTaskId);
          const taskTitle = task?.title || 'Unknown Task';
          console.log(`Updated task "${taskTitle}": +${totalWorkTimeHours.toFixed(2)}h worked`);
        } catch (taskError) {
          console.error('Error updating task progress:', taskError);
        }
      }
      
      const workTimeDisplay = formatTime(totalSessionTime - timeTracker.totalBreakTime);
      const taskInfo = timeTracker.currentTaskId ? 
        `\n📋 Task: ${myTasks.find(t => t.id === timeTracker.currentTaskId)?.title || 'Unknown'}` : 
        '\n📝 General work session';
      
      // Reset tracker
      timeTracker = {
        isWorking: false,
        startTime: null,
        endTime: null,
        breakStart: null,
        breakEnd: null,
        isOnBreak: false,
        currentSession: null,
        currentTaskId: null,
        elapsedTime: 0,
        breakElapsedTime: 0,
        timerInterval: null,
        displayTime: '00:00:00',
        totalBreakTime: 0
      };
      
      alert(`✅ Work Session Completed!${taskInfo}\n\n⏱️ Total work time: ${workTimeDisplay}\n📊 Session logged and task updated.\n\n🎉 Great job! Your progress has been saved.`);
      
    } catch (error) {
      console.error('Error ending work session:', error);
      alert('Error ending work session: ' + error.message);
    }
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
          const hoursWorked = submitWorkForm.hoursWorked || 1;
          
          // Use the dynamic progress update function to mark as completed
          await updateTaskProgress(submitWorkForm.taskId, 100, hoursWorked);
          
          console.log(`Task ${submitWorkForm.taskId} marked as completed with ${hoursWorked}h worked`);
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
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="text-4xl font-bold text-white mb-2">My Dashboard</h1>
        <p class="text-white/70">Track your internship progress, tasks, and communicate with your mentor</p>
      </div>
      
      <!-- Enhanced Global Time Tracker Display -->
      {#if timeTracker.isWorking}
        <div class="bg-gradient-to-r from-green-500/30 to-blue-500/30 border-2 border-green-400 rounded-2xl px-8 py-6 min-w-[280px] shadow-2xl backdrop-blur-md">
          <div class="text-center">
            <!-- Header with pulsing indicator -->
            <div class="flex items-center justify-center gap-3 mb-3">
              <div class="relative">
                <div class="w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
                <div class="absolute inset-0 w-4 h-4 bg-green-400 rounded-full animate-ping opacity-75"></div>
              </div>
              <span class="text-white font-bold text-lg">⏱️ TIME TRACKING</span>
            </div>
            
            <!-- Large timer display -->
            <div class="bg-black/30 rounded-xl px-4 py-3 mb-3 border border-green-500/50">
              <div class="text-4xl font-mono font-black text-green-300 tracking-wider drop-shadow-lg">
                {timeTracker.displayTime}
              </div>
              <div class="text-green-400/80 text-sm font-medium mt-1">
                {#if timeTracker.isOnBreak}
                  ☕ BREAK TIME - Timer Paused
                {:else}
                  🚀 ACTIVELY WORKING
                {/if}
              </div>
            </div>
            
            <!-- Task info -->
            {#if timeTracker.currentTaskId}
              <div class="bg-blue-500/20 rounded-lg px-3 py-2 mb-3 border border-blue-500/30">
                <div class="text-blue-300 text-sm font-semibold">Current Task:</div>
                <div class="text-white font-medium truncate">
                  📋 {myTasks.find(t => t.id === timeTracker.currentTaskId)?.title || 'Unknown Task'}
                </div>
              </div>
            {:else}
              <div class="bg-purple-500/20 rounded-lg px-3 py-2 mb-3 border border-purple-500/30">
                <div class="text-purple-300 text-sm font-semibold">General Work Session</div>
              </div>
            {/if}
            
            <!-- Control buttons -->
            <div class="flex gap-2 justify-center">
              {#if !timeTracker.isOnBreak}
                <Button 
                  on:click={startBreak}
                  class="bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-sm px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105"
                >
                  ☕ Take Break
                </Button>
              {:else}
                <Button 
                  on:click={endBreak}
                  class="bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 animate-pulse"
                >
                  🔄 Resume Work
                </Button>
              {/if}
              <Button 
                on:click={endWork}
                class="bg-red-500 hover:bg-red-600 text-white font-bold text-sm px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                ⏹️ End Session
              </Button>
            </div>
          </div>
        </div>
      {:else}
        <!-- Enhanced Quick Start Button -->
        <div class="text-right">
          <Button 
            on:click={() => startWork()}
            class="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 hover:from-pink-800 hover:to-blue-600 text-white px-8 py-4 flex items-center gap-3 font-bold text-lg rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-200 animate-bounce"
          >
            <Clock class="w-6 h-6" />
            <Rocket color="red"/> Start Tracking Time
          </Button>
          <p class="text-white/70 text-sm mt-2 font-medium flex gap-2 items-center"><AlarmClock/> Track your work across all tasks</p>
        </div>
      {/if}
    </div>
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
                  </div>
                  
                  <!-- Enhanced Progress Information -->
                  <div class="bg-white/5 rounded-lg p-3 mb-3">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-white/70 text-sm">Hours Progress</span>
                      <span class="text-white font-semibold text-sm">
                        {(parseFloat(task.hours_worked) || 0).toFixed(1)}h / {(parseFloat(task.estimated_hours) || 8).toFixed(1)}h
                      </span>
                    </div>
                    
                    <!-- Hours Progress Bar -->
                    <div class="w-full bg-white/10 rounded-full h-2 mb-2">
                      <div 
                        class="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                        style="width: {Math.min(100, ((parseFloat(task.hours_worked) || 0) / (parseFloat(task.estimated_hours) || 8)) * 100)}%"
                      ></div>
                    </div>
                    
                    <div class="flex items-center justify-between">
                      <span class="text-white/70 text-sm">Task Completion</span>
                      <span class="text-white font-semibold text-sm">{parseInt(task.progress_percentage) || 0}% complete</span>
                    </div>
                    
                    <!-- Task Progress Bar -->
                    <div class="w-full bg-white/10 rounded-full h-2">
                      <div 
                        class="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                        style="width: {parseInt(task.progress_percentage) || 0}%"
                      ></div>
                    </div>
                    
                    <!-- Progress Status Indicator -->
                    {#if (parseFloat(task.hours_worked) || 0) > (parseFloat(task.estimated_hours) || 8)}
                      <p class="text-orange-400 text-xs mt-2 flex items-center gap-1">
                        <AlertCircle class="w-3 h-3" />
                        Over estimated time by {((parseFloat(task.hours_worked) || 0) - (parseFloat(task.estimated_hours) || 8)).toFixed(1)}h
                      </p>
                    {:else if (parseInt(task.progress_percentage) || 0) >= 100}
                      <p class="text-green-400 text-xs mt-2 flex items-center gap-1">
                        <CheckCircle class="w-3 h-3" />
                        Task completed! Awaiting submission or review
                      </p>
                    {:else if (parseFloat(task.hours_worked) || 0) >= (parseFloat(task.estimated_hours) || 8) * 0.8}
                      <p class="text-yellow-400 text-xs mt-2 flex items-center gap-1">
                        <Clock class="w-3 h-3" />
                        Approaching time limit - {((parseFloat(task.estimated_hours) || 8) - (parseFloat(task.hours_worked) || 0)).toFixed(1)}h remaining
                      </p>
                    {/if}
                  </div>
                </div>
              </div>

              {#if task.status !== 'completed'}
                <div class="space-y-3">
                  <!-- Progress Update Controls -->
                  <div class="flex items-center gap-3 bg-white/5 rounded-lg p-3">
                    <label class="text-white/70 text-sm font-medium min-w-[60px]">Progress:</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={parseInt(task.progress_percentage) || 0}
                      class="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      on:change={async (e) => {
                        const newProgress = parseInt(e.target.value);
                        await updateTaskProgress(task.id, newProgress);
                      }}
                    />
                    <span class="text-white text-sm font-medium min-w-[45px] text-center">
                      {parseInt(task.progress_percentage) || 0}%
                    </span>
                  </div>
                  
                  <!-- Action Buttons -->
                  <div class="flex gap-2 flex-wrap">
                    <!-- Enhanced Time Tracking Controls -->
                    {#if !timeTracker.isWorking}
                      <Button 
                        on:click={() => startWork(task.id)}
                        class="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-3 flex items-center gap-3 text-sm font-bold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 animate-pulse"
                      >
                        <Clock class="w-5 h-5" />
                        ▶️ START TRACKING TIME
                      </Button>
                    {:else if timeTracker.currentTaskId === task.id}
                      <!-- Enhanced Active timer controls for this task -->
                      <div class="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-400 rounded-xl p-4">
                        <!-- Timer display header -->
                        <div class="flex items-center justify-center gap-2 mb-3">
                          <div class="relative">
                            <div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                            <div class="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping opacity-75"></div>
                          </div>
                          <span class="text-green-300 font-bold text-sm">⏱️ TIMER ACTIVE</span>
                        </div>
                        
                        <!-- Large timer display -->
                        <div class="bg-black/40 rounded-lg px-4 py-3 mb-3 text-center border border-green-500/50">
                          <div class="text-3xl font-mono font-black text-green-300 tracking-wider">
                            {timeTracker.displayTime}
                          </div>
                          <div class="text-green-400/80 text-xs font-medium mt-1">
                            {#if timeTracker.isOnBreak}
                              ☕ ON BREAK - Timer Paused
                            {:else}
                              🔥 WORKING ON THIS TASK
                            {/if}
                          </div>
                        </div>
                        
                        <!-- Control buttons -->
                        <div class="flex gap-2 justify-center flex-wrap">
                          {#if !timeTracker.isOnBreak}
                            <Button 
                              on:click={startBreak}
                              class="bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-xs px-3 py-2 rounded-lg transform hover:scale-105 transition-all"
                            >
                              ☕ Break
                            </Button>
                          {:else}
                            <Button 
                              on:click={endBreak}
                              class="bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs px-3 py-2 rounded-lg transform hover:scale-105 transition-all animate-pulse"
                            >
                              🔄 Resume
                            </Button>
                          {/if}
                          
                          <Button 
                            on:click={endWork}
                            class="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-3 py-2 rounded-lg transform hover:scale-105 transition-all"
                          >
                            ⏹️ Stop
                          </Button>
                        </div>
                      </div>
                    {:else if timeTracker.currentTaskId && timeTracker.currentTaskId !== task.id}
                      <!-- Working on different task -->
                      <div class="bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2">
                        <span class="text-orange-300 text-sm">Working on another task</span>
                      </div>
                    {/if}
                    
                    <!-- Quick Progress Buttons -->
                    {#if parseInt(task.progress_percentage) < 100}
                      <Button 
                        on:click={() => updateTaskProgress(task.id, 25)}
                        class="bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 text-xs px-3 py-2"
                      >
                        25%
                      </Button>
                      <Button 
                        on:click={() => updateTaskProgress(task.id, 50)}
                        class="bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 text-xs px-3 py-2"
                      >
                        50%
                      </Button>
                      <Button 
                        on:click={() => updateTaskProgress(task.id, 75)}
                        class="bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-300 text-xs px-3 py-2"
                      >
                        75%
                      </Button>
                      <Button 
                        on:click={() => markTaskCompleted(task.id)}
                        class="bg-green-500/20 hover:bg-green-500/40 text-green-300 text-xs px-3 py-2 font-medium"
                      >
                        ✅ Mark Complete
                      </Button>
                    {/if}
                    
                    <!-- Submit Work Button -->
                    <Button
                      on:click={() => { submitWorkForm.taskId = task.id; showSubmitWorkModal = true; }}
                      class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 flex items-center text-sm font-medium"
                    >
                      <Upload class="w-4 h-4 mr-2" />
                      Submit Work
                    </Button>
                  </div>
                </div>
              {:else}
                <div class="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <div class="flex items-center gap-3 text-green-400">
                    <CheckCircle class="w-6 h-6" />
                    <div>
                      <span class="font-semibold text-lg">Task Completed! 🎉</span>
                      <p class="text-green-300/80 text-sm mt-1">
                        Total time: {(parseFloat(task.hours_worked) || 0).toFixed(1)} hours
                        {#if parseFloat(task.estimated_hours)}
                          / {parseFloat(task.estimated_hours).toFixed(1)} estimated
                        {/if}
                      </p>
                    </div>
                  </div>
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
            class="text-white border-white/20 hover:bg-white/10 h-10 flex items-center px-2"
          >
            <RefreshCw class="w-4 h-4 mr-2" />
            Reload
          </Button>
          <Button
            on:click={() => showSubmitWorkModal = true}
            class="bg-green-500 hover:bg-green-600 text-white h-10 rounded-md px-2 flex items-center hover:rounded-md"
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
      <!-- Comprehensive Progress Summary -->
      <div class="bg-white/5 rounded-xl border border-white/20 p-6 mb-6">
        <h3 class="text-white font-bold mb-4 flex items-center gap-2">
          <TrendingUp class="w-5 h-5 text-blue-400" />
          Progress Overview
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Contract Hours Progress -->
          <div class="text-center">
            <div class="relative w-16 h-16 mx-auto mb-2">
              <svg class="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="rgb(255 255 255 / 0.1)" stroke-width="4"></circle>
                <circle 
                  cx="32" cy="32" r="28" fill="none" stroke="rgb(147 51 234)" stroke-width="4"
                  stroke-dasharray="{2 * Math.PI * 28}"
                  stroke-dashoffset="{2 * Math.PI * 28 * (1 - stats.completionPercentage / 100)}"
                  stroke-linecap="round"
                ></circle>
              </svg>
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-white font-bold text-sm">{stats.completionPercentage}%</span>
              </div>
            </div>
            <p class="text-white/70 text-sm">Contract</p>
            <p class="text-white text-xs">{stats.approvedHours.toFixed(1)}h approved</p>
          </div>

          <!-- Task Completion Progress -->
          <div class="text-center">
            <div class="relative w-16 h-16 mx-auto mb-2">
              <svg class="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="rgb(255 255 255 / 0.1)" stroke-width="4"></circle>
                <circle 
                  cx="32" cy="32" r="28" fill="none" stroke="rgb(34 197 94)" stroke-width="4"
                  stroke-dasharray="{2 * Math.PI * 28}"
                  stroke-dashoffset="{2 * Math.PI * 28 * (1 - stats.taskCompletionRate / 100)}"
                  stroke-linecap="round"
                ></circle>
              </svg>
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-white font-bold text-sm">{stats.taskCompletionRate}%</span>
              </div>
            </div>
            <p class="text-white/70 text-sm">Tasks Done</p>
            <p class="text-white text-xs">{stats.completedTasks} of {stats.totalTasks}</p>
          </div>

          <!-- Average Task Progress -->
          <div class="text-center">
            <div class="relative w-16 h-16 mx-auto mb-2">
              <svg class="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="rgb(255 255 255 / 0.1)" stroke-width="4"></circle>
                <circle 
                  cx="32" cy="32" r="28" fill="none" stroke="rgb(59 130 246)" stroke-width="4"
                  stroke-dasharray="{2 * Math.PI * 28}"
                  stroke-dashoffset="{2 * Math.PI * 28 * (1 - stats.averageTaskProgress / 100)}"
                  stroke-linecap="round"
                ></circle>
              </svg>
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-white font-bold text-sm">{stats.averageTaskProgress}%</span>
              </div>
            </div>
            <p class="text-white/70 text-sm">Avg Progress</p>
            <p class="text-white text-xs">Task completion</p>
          </div>

          <!-- Hours Efficiency -->
          <div class="text-center">
            <div class="relative w-16 h-16 mx-auto mb-2">
              <svg class="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="rgb(255 255 255 / 0.1)" stroke-width="4"></circle>
                <circle 
                  cx="32" cy="32" r="28" fill="none" stroke="rgb(236 72 153)" stroke-width="4"
                  stroke-dasharray="{2 * Math.PI * 28}"
                  stroke-dashoffset="{2 * Math.PI * 28 * (1 - Math.min(100, (stats.approvedHours / Math.max(stats.totalHours, 1)) * 100) / 100)}"
                  stroke-linecap="round"
                ></circle>
              </svg>
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-white font-bold text-sm">{Math.round(Math.min(100, (stats.approvedHours / Math.max(stats.totalHours, 1)) * 100))}%</span>
              </div>
            </div>
            <p class="text-white/70 text-sm">Efficiency</p>
            <p class="text-white text-xs">Approved rate</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div class="bg-white/5 rounded-xl border border-white/20 p-6">
          <h3 class="text-white font-bold mb-4 flex items-center gap-2">
            <Target class="w-5 h-5 text-purple-400" />
            Contract Progress
          </h3>
          <div class="space-y-4">
            <!-- Main progress bar -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-white/70 text-sm">Approved Hours</span>
                <span class="text-white font-semibold">{stats.approvedHours.toFixed(1)} / {stats.contractHours}h</span>
              </div>
              <div class="w-full bg-white/10 rounded-full h-3">
                <div
                  class="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all"
                  style="width: {stats.completionPercentage}%"
                ></div>
              </div>
              <p class="text-white/50 text-xs mt-1">{stats.completionPercentage}% Complete</p>
            </div>

            <!-- Additional progress details -->
            <div class="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div>
                <p class="text-white/70 text-sm">Total Logged</p>
                <p class="text-xl font-bold text-blue-400">{stats.totalHours.toFixed(1)}h</p>
                <p class="text-white/50 text-xs">All entries</p>
              </div>
              <div>
                <p class="text-white/70 text-sm">Remaining</p>
                <p class="text-xl font-bold text-white">{Math.max(0, stats.contractHours - stats.approvedHours).toFixed(1)}h</p>
                <p class="text-white/50 text-xs">To complete</p>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white/5 rounded-xl border border-white/20 p-6">
          <h3 class="text-white font-bold mb-4 flex items-center gap-2">
            <Activity class="w-5 h-5 text-green-400" />
            Task Progress
          </h3>
          <div class="space-y-4">
            <!-- Task completion progress -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-white/70 text-sm">Tasks Completed</span>
                <span class="text-white font-semibold">{stats.completedTasks} / {stats.totalTasks}</span>
              </div>
              <div class="w-full bg-white/10 rounded-full h-3">
                <div
                  class="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all"
                  style="width: {stats.taskCompletionRate}%"
                ></div>
              </div>
              <p class="text-white/50 text-xs mt-1">{stats.taskCompletionRate}% Complete</p>
            </div>

            <!-- Hours progress -->
            {#if stats.totalEstimatedHours > 0}
            <div class="pt-2">
              <div class="flex items-center justify-between mb-2">
                <span class="text-white/70 text-sm">Hours Worked</span>
                <span class="text-white font-semibold">{stats.totalHoursWorked.toFixed(1)} / {stats.totalEstimatedHours.toFixed(1)}h</span>
              </div>
              <div class="w-full bg-white/10 rounded-full h-2">
                <div
                  class="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all"
                  style="width: {Math.min(100, (stats.totalHoursWorked / stats.totalEstimatedHours) * 100)}%"
                ></div>
              </div>
              <p class="text-white/50 text-xs mt-1">Average Task Progress: {stats.averageTaskProgress}%</p>
            </div>
            {/if}

            <!-- Status breakdown -->
            <div class="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
              <div class="text-center">
                <p class="text-white/70 text-sm">In Progress</p>
                <p class="text-lg font-bold text-blue-400">{myTasks.filter(t => t.status === 'in_progress').length}</p>
              </div>
              <div class="text-center">
                <p class="text-white/70 text-sm">Pending</p>
                <p class="text-lg font-bold text-yellow-400">{myTasks.filter(t => t.status === 'assigned').length}</p>
              </div>
              <div class="text-center">
                <p class="text-white/70 text-sm">Done</p>
                <p class="text-lg font-bold text-green-400">{stats.completedTasks}</p>
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
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-300 flex items-center justify-center">
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
        <h2 class="text-2xl font-bold text-white">Schedule & Progress Tracking</h2>
        <div class="flex gap-2">
          <Button variant="ghost" class="text-white/60 hover:text-white">
            <RefreshCw class="w-4 h-4 mr-2" />
            Sync Calendar
          </Button>
        </div>
      </div>

      <!-- Contract Progress Overview -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Contract Completion -->
        <div class="bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl border border-white/20 p-6">
          <h3 class="text-white font-bold mb-4 flex items-center gap-2">
            <Award class="w-5 h-5 text-purple-400" />
            Contract Progress
          </h3>
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-white/70">Hours Completed</span>
              <span class="text-white font-bold">{stats.approvedHours} / {stats.contractHours} hrs</span>
            </div>
            <div class="w-full bg-white/10 rounded-full h-3">
              <div class="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500 relative overflow-hidden" 
                   style="width: {stats.completionPercentage}%">
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-pulse"></div>
              </div>
            </div>
            <div class="flex justify-between items-center text-sm">
              <span class="text-white/60">{stats.completionPercentage}% Complete</span>
              <span class="text-white/60">{stats.contractHours - stats.approvedHours} hrs remaining</span>
            </div>
          </div>
        </div>

        <!-- Task Completion Rate -->
        <div class="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl border border-white/20 p-6">
          <h3 class="text-white font-bold mb-4 flex items-center gap-2">
            <Target class="w-5 h-5 text-green-400" />
            Task Completion
          </h3>
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-white/70">Tasks Completed</span>
              <span class="text-white font-bold">{stats.completedTasks} / {stats.totalTasks}</span>
            </div>
            <div class="w-full bg-white/10 rounded-full h-3">
              <div class="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500 relative overflow-hidden" 
                   style="width: {stats.taskCompletionRate}%">
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-pulse"></div>
              </div>
            </div>
            <div class="flex justify-between items-center text-sm">
              <span class="text-white/60">{stats.taskCompletionRate}% Complete</span>
              <span class="text-white/60">Avg Progress: {stats.averageTaskProgress}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Internship Timeline -->
      <div class="bg-white/5 rounded-xl border border-white/20 p-6 mb-6">
        <h3 class="text-white font-bold mb-4 flex items-center gap-2">
          <Calendar class="w-5 h-5 text-blue-400" />
          Internship Timeline
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p class="text-white/70 text-sm mb-1">Start Date</p>
            <p class="text-white font-bold text-lg">{selectedStudent?.start_date ? format(parseISO(selectedStudent.start_date), 'MMM dd, yyyy') : 'Not set'}</p>
          </div>
          <div>
            <p class="text-white/70 text-sm mb-1">End Date</p>
            <p class="text-white font-bold text-lg">{selectedStudent?.end_date ? format(parseISO(selectedStudent.end_date), 'MMM dd, yyyy') : 'Not set'}</p>
          </div>
          <div>
            <p class="text-white/70 text-sm mb-1">Duration</p>
            <p class="text-white font-bold text-lg">{Math.ceil(stats.contractHours / 40)} weeks</p>
          </div>
          <div>
            <p class="text-white/70 text-sm mb-1">Weekly Target</p>
            <p class="text-white font-bold text-lg">40 hours</p>
          </div>
        </div>
        
        <!-- Timeline Progress Bar -->
        {#if selectedStudent?.start_date && selectedStudent?.end_date}
          {@const startDate = parseISO(selectedStudent.start_date)}
          {@const endDate = parseISO(selectedStudent.end_date)}
          {@const now = new Date()}
          {@const totalDuration = endDate - startDate}
          {@const elapsed = now - startDate}
          {@const timeProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))}
          <div class="mt-6">
            <div class="flex justify-between text-sm text-white/60 mb-2">
              <span>Timeline Progress</span>
              <span>{Math.round(timeProgress)}% elapsed</span>
            </div>
            <div class="w-full bg-white/10 rounded-full h-2">
              <div class="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full transition-all duration-500" 
                   style="width: {timeProgress}%"></div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Dynamic Milestones -->
      <div class="bg-white/5 rounded-xl border border-white/20 p-6 mb-6">
        <h3 class="text-white font-bold mb-4 flex items-center gap-2">
          <Target class="w-5 h-5 text-purple-400" />
          Progress Milestones
        </h3>
        <div class="space-y-4">
          <!-- Onboarding Milestone -->
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-full {stats.totalTasks > 0 ? 'bg-green-500/20' : 'bg-gray-500/20'} flex items-center justify-center flex-shrink-0">
              {#if stats.totalTasks > 0}
                <CheckCircle class="w-5 h-5 text-green-400" />
              {:else}
                <Clock class="w-5 h-5 text-gray-400" />
              {/if}
            </div>
            <div class="flex-1">
              <p class="text-white font-semibold">Onboarding & Initial Tasks</p>
              <p class="text-white/60 text-sm">Get assigned tasks and begin internship work</p>
              <p class="{stats.totalTasks > 0 ? 'text-green-400' : 'text-gray-400'} text-xs mt-1">
                {stats.totalTasks > 0 ? '✓ Completed' : '○ Pending'}
              </p>
            </div>
            <div class="text-right">
              <p class="text-white/70 text-sm">{stats.totalTasks} tasks</p>
            </div>
          </div>

          <!-- Quarter Progress -->
          {#if stats.contractHours}
            {@const quarterHours = stats.contractHours / 4}
            <div class="flex items-start gap-4">
              <div class="w-10 h-10 rounded-full {stats.approvedHours >= quarterHours ? 'bg-green-500/20' : stats.approvedHours > 0 ? 'bg-blue-500/20' : 'bg-gray-500/20'} flex items-center justify-center flex-shrink-0">
                {#if stats.approvedHours >= quarterHours}
                  <CheckCircle class="w-5 h-5 text-green-400" />
                {:else if stats.approvedHours > 0}
                  <Clock class="w-5 h-5 text-blue-400" />
                {:else}
                  <Target class="w-5 h-5 text-gray-400" />
                {/if}
              </div>
              <div class="flex-1">
                <p class="text-white font-semibold">First Quarter Progress</p>
                <p class="text-white/60 text-sm">Complete 25% of contract hours ({quarterHours} hours)</p>
                <p class="{stats.approvedHours >= quarterHours ? 'text-green-400' : stats.approvedHours > 0 ? 'text-blue-400' : 'text-gray-400'} text-xs mt-1">
                  {stats.approvedHours >= quarterHours ? '✓ Completed' : stats.approvedHours > 0 ? '⏳ In Progress' : '○ Upcoming'}
                </p>
              </div>
              <div class="text-right">
                <p class="text-white/70 text-sm">{stats.approvedHours} / {quarterHours} hrs</p>
              </div>
            </div>
          {/if}

          <!-- Mid-Term Review -->
          {#if stats.contractHours}
            {@const midtermHours = stats.contractHours / 2}
            {@const quarterHours = stats.contractHours / 4}
            <div class="flex items-start gap-4">
              <div class="w-10 h-10 rounded-full {stats.approvedHours >= midtermHours ? 'bg-green-500/20' : stats.approvedHours >= quarterHours ? 'bg-blue-500/20' : 'bg-gray-500/20'} flex items-center justify-center flex-shrink-0">
                {#if stats.approvedHours >= midtermHours}
                  <CheckCircle class="w-5 h-5 text-green-400" />
                {:else if stats.approvedHours >= quarterHours}
                  <Clock class="w-5 h-5 text-blue-400" />
                {:else}
                  <Target class="w-5 h-5 text-gray-400" />
                {/if}
              </div>
              <div class="flex-1">
                <p class="text-white font-semibold">Mid-Term Review</p>
                <p class="text-white/60 text-sm">Performance evaluation at 50% completion</p>
                <p class="{stats.approvedHours >= midtermHours ? 'text-green-400' : stats.approvedHours >= quarterHours ? 'text-blue-400' : 'text-gray-400'} text-xs mt-1">
                  {stats.approvedHours >= midtermHours ? '✓ Completed' : stats.approvedHours >= quarterHours ? '⏳ Ready Soon' : '○ Upcoming'}
                </p>
              </div>
              <div class="text-right">
                <p class="text-white/70 text-sm">{Math.round(stats.completionPercentage)}%</p>
              </div>
            </div>
          {/if}

          <!-- Final Project -->
          {#if stats.contractHours}
            {@const finalPhaseHours = stats.contractHours * 0.8}
            <div class="flex items-start gap-4">
              <div class="w-10 h-10 rounded-full {stats.approvedHours >= finalPhaseHours ? 'bg-blue-500/20' : 'bg-gray-500/20'} flex items-center justify-center flex-shrink-0">
                {#if stats.approvedHours >= finalPhaseHours}
                  <Clock class="w-5 h-5 text-blue-400" />
                {:else}
                  <Target class="w-5 h-5 text-gray-400" />
                {/if}
              </div>
              <div class="flex-1">
                <p class="text-white font-semibold">Final Project Phase</p>
                <p class="text-white/60 text-sm">Capstone project and final deliverables</p>
                <p class="{stats.approvedHours >= finalPhaseHours ? 'text-blue-400' : 'text-gray-400'} text-xs mt-1">
                  {stats.approvedHours >= finalPhaseHours ? '⏳ In Progress' : '○ Upcoming'}
                </p>
              </div>
              <div class="text-right">
                <p class="text-white/70 text-sm">{stats.contractHours - stats.approvedHours} hrs left</p>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Enhanced Schedule Events -->
      <div class="bg-white/5 rounded-xl border border-white/20 p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-white font-bold">Upcoming Events & Deadlines</h3>
          <Button variant="ghost" size="sm" class="text-white/60 hover:text-white">
            <Calendar class="w-4 h-4 mr-2" />
            View Calendar
          </Button>
        </div>
        
        {#if mySchedule.length > 0}
          <div class="space-y-3">
            {#each mySchedule as event}
              <div class="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center">
                    <Calendar class="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p class="text-white font-medium">{event.title || 'Scheduled Event'}</p>
                    <div class="flex items-center gap-2 text-white/60 text-sm">
                      <Clock class="w-4 h-4" />
                      <span>{event.start_time} - {event.end_time}</span>
                    </div>
                    {#if event.parsed_schedule && event.parsed_schedule.length > 0}
                      <div class="mt-1">
                        <span class="text-white/50 text-xs">Activities: </span>
                        {#each event.parsed_schedule.slice(0, 2) as activity, i}
                          <span class="text-white/50 text-xs">{activity.activity}{i < event.parsed_schedule.length - 1 && i < 1 ? ', ' : ''}</span>
                        {/each}
                        {#if event.parsed_schedule.length > 2}
                          <span class="text-white/50 text-xs">+{event.parsed_schedule.length - 2} more</span>
                        {/if}
                      </div>
                    {/if}
                  </div>
                </div>
                <div class="text-right">
                  <span class="text-white/50 text-sm">{event.date}</span>
                  <div class="mt-1">
                    <span class="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full">
                      {event.created_by_mentor ? 'Mentor Set' : 'System'}
                    </span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="text-center py-12">
            <Calendar class="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p class="text-white/50 text-lg mb-2">No upcoming events scheduled</p>
            <p class="text-white/30 text-sm mb-6">Your mentor will schedule check-ins and milestones</p>
            <Button variant="ghost" class="text-white/60 hover:text-white">
              <MessageSquare class="w-4 h-4 mr-2" />
              Request Meeting
            </Button>
          </div>
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
