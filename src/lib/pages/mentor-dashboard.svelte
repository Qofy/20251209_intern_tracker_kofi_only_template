<script>
  import { onMount } from 'svelte';
  import { Student, Task, TimeEntry, User, Message } from '../../entities/all';
  import { userStore } from '../../stores/userStore';
  import Button from '$lib/components/ui/button.svelte';
  import Input from '$lib/components/ui/input.svelte';
  import Dialog from '$lib/components/ui/dialog.svelte';
  import {
    Users, ClipboardList, MessageSquare, TrendingUp,
    Plus, Check, X, Edit, Trash2, Send, FileText,
    Clock, Calendar, AlertCircle, CheckCircle, Target,
    User as UserIcon, Mail, Phone, Award, RefreshCw, Shield, Activity, BookCheck,
    Download, Eye, XCircle
  } from 'lucide-svelte';
  import { format, parseISO } from 'date-fns';

  $: user = $userStore.user;

  // Accept initialTab prop from parent component
  export let initialTab = 'students';

  // State variables
  let activeTab = initialTab; // students, tasks, submissions, messages, reports, profile

  // Update activeTab when initialTab changes
  $: activeTab = initialTab;
  let assignedStudents = [];
  let tasks = [];
  let timeEntries = [];
  let messages = [];
  let selectedStudent = null;
  let selectedConversation = null;
  let isLoading = false;

  // Dialog states
  let showTaskDialog = false;
  let showFeedbackDialog = false;
  let showReportDialog = false;
  let showMessageDialog = false;
  let showTimeEntryDialog = false;
  let showSubmissionDetailsModal = false;
  let viewingSubmission = null;

  // Form data
  let taskForm = {
    title: '',
    description: '',
    assigned_to: '',
    due_date: '',
    priority: 'medium',
    status: 'assigned',
    estimated_hours: 8
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

  let timeEntryForm = {
    student_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '',
    end_time: '',
    break_start: '',
    break_end: '',
    manually_inputted_hours: 0,
    notes: '',
    status: 'draft'
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

  // Keep track of which mentor email we've loaded data for to avoid unnecessary resets
  let _loadedForEmail = null;

  // If user becomes available later (e.g., after route change), reload data for that mentor
  $: if (user?.email && _loadedForEmail !== user.email) {
    _loadedForEmail = user.email;
    // call but don't block reactive updates
    loadMentorData();
  }

  async function loadMentorData() {
    // If user not yet set, skip loading to avoid clearing existing UI state
    if (!user || !user.email) {
      console.warn('[Mentor] loadMentorData skipped - user not available');
      return;
    }

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

      // Load messages for this mentor
      await loadMessages();

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
        messages: messages.length,
        mentorEmail: user?.email
      });
    } catch (error) {
      console.error('[Mentor] Error loading data:', error);
    }
    isLoading = false;
  }

  async function loadMessages() {
    try {
      messages = await Message.getMentorMessages();
      console.log('[Mentor] Loaded messages:', messages.length);
      console.log('[Mentor] Messages:', messages);
      console.log('[Mentor] User email:', user?.email);
      
      // Debug: Show all to_email addresses in messages
      messages.forEach((msg, index) => {
        console.log(`[Mentor] Message ${index}: from="${msg.from_email}" to="${msg.to_email}" role="${msg.to_role}"`);
      });
      
      const messagesToMentor = messages.filter(m => m.to_email === user?.email);
      console.log('[Mentor] Messages to mentor:', messagesToMentor);
    } catch (error) {
      console.error('[Mentor] Error loading messages:', error);
    }
  }

  function getConversationPreview(studentEmail) {
    // Get all messages in conversation with this student (both directions)
    const studentMessages = messages.filter(m => 
      (m.from_email === studentEmail && m.to_email === user?.email) || 
      (m.from_email === user?.email && m.to_email === studentEmail)
    );
    if (studentMessages.length === 0) return null;
    
    const latestMessage = studentMessages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    return {
      ...latestMessage,
      unreadCount: studentMessages.filter(m => !m.is_read && m.to_email === user?.email).length
    };
  }

  async function viewConversation(studentEmail) {
    try {
      selectedConversation = await Message.getConversation(studentEmail);
      // Mark messages as read
      const unreadMessages = selectedConversation.filter(m => !m.is_read && m.to_email === user?.email);
      for (const msg of unreadMessages) {
        await Message.markAsRead(msg.id);
      }
      await loadMessages(); // Refresh the message list
    } catch (error) {
      console.error('[Mentor] Error loading conversation:', error);
    }
  }

  async function replyToMessage() {
    try {
      if (!messageForm.to_student || !messageForm.subject || !messageForm.message) {
        alert('Please fill in all fields');
        return;
      }

      await Message.send({
        to_email: messageForm.to_student,
        to_role: 'Student',
        subject: messageForm.subject,
        content: messageForm.message,
        student_id: assignedStudents.find(s => s.student_email === messageForm.to_student)?.id,
        mentor_email: user?.email
      });

      alert('Reply sent successfully!');
      showMessageDialog = false;
      resetMessageForm();
      await loadMessages();
      
      // Refresh conversation if viewing one
      if (selectedConversation && selectedConversation.length > 0) {
        await viewConversation(messageForm.to_student);
      }
    } catch (error) {
      console.error('[Mentor] Error sending reply:', error);
      alert('Failed to send reply. Please try again.');
    }
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
      if (!entry) {
        alert('Entry not found');
        return;
      }

      // Only update fields that exist in the database
      await TimeEntry.update(entry.id, {
        status: feedbackForm.status,
        mentor_comments: feedbackForm.comments
      });

      timeEntries = timeEntries.map(e => 
        e.id === entry.id 
          ? { ...e, status: feedbackForm.status, mentor_comments: feedbackForm.comments }
          : e
      );

      showFeedbackDialog = false;
      resetFeedbackForm();
      await loadMentorData();
      alert('Feedback provided successfully!');
      console.log('[Mentor] Provided feedback for entry:', entry.id);
    } catch (error) {
      console.error('[Mentor] Error providing feedback:', error);
      alert('Failed to provide feedback: ' + (error.message || 'Unknown error'));
    }
  }

  async function approveEntry(entryId) {
    try {
      console.log('[Mentor] Approving entry with ID:', entryId);
      
      // Check if entry exists
      if (!entryId) {
        alert('Invalid entry ID');
        return;
      }

      // Only update the status field to avoid database schema issues
      await TimeEntry.update(entryId, {
        status: 'approved'
      });
      
      timeEntries = timeEntries.map(e => e.id === entryId ? { ...e, status: 'approved' } : e);
      await loadMentorData();
      alert('Time entry approved successfully!');
      console.log('[Mentor] Approved entry:', entryId);
    } catch (error) {
      console.error('[Mentor] Error approving entry:', error);
      alert('Failed to approve entry: ' + (error.message || 'Unknown error'));
    }
  }

  async function rejectEntry(entryId) {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;

    try {
      // Only update status and mentor_comments to avoid database schema issues
      await TimeEntry.update(entryId, {
        status: 'rejected',
        mentor_comments: reason
      });
      timeEntries = timeEntries.map(e =>
        e.id === entryId
          ? { ...e, status: 'rejected', mentor_comments: reason }
          : e
      );
      await loadMentorData();
      alert('Time entry rejected successfully!');
      console.log('[Mentor] Rejected entry:', entryId);
    } catch (error) {
      console.error('[Mentor] Error rejecting entry:', error);
    }
  }

  // Submission Details & Downloads
  function viewSubmissionDetails(submission) {
    viewingSubmission = submission;
    showSubmissionDetailsModal = true;
  }

  function closeSubmissionDetailsModal() {
    showSubmissionDetailsModal = false;
    viewingSubmission = null;
  }

  async function downloadFile(url, filename) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename || 'proof-file.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file');
    }
  }

  async function downloadAllSubmissionFiles(submission) {
    if (!submission.proof_files || submission.proof_files.length === 0) {
      alert('No files to download');
      return;
    }

    for (let i = 0; i < submission.proof_files.length; i++) {
      const file = submission.proof_files[i];
      const filename = `${submission.created_by}-proof-${i + 1}-${submission.date}.pdf`;
      await downloadFile(file, filename);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  function getSubmissionStatusBadge(status) {
    const configs = {
      draft: { class: 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/30', label: 'Pending Review' },
      submitted: { class: 'bg-amber-500/20 text-amber-300 border border-amber-400/30', label: 'Submitted' },
      approved: { class: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30', label: 'Approved' },
      rejected: { class: 'bg-red-500/20 text-red-300 border border-red-400/30', label: 'Rejected' }
    };
    return configs[status] || configs.draft;
  }

  // Messaging
  function openMessageDialog(studentEmail) {
    messageForm.to_student = studentEmail;
    showMessageDialog = true;
  }

  async function sendMessage() {
    await replyToMessage();
  }

  // Contract forwarding function
  async function forwardContractDecisionToStudent(adminMessage) {
    try {
      console.log('Forwarding contract decision:', adminMessage);
      
      // Extract student email and name from the admin message content
      let studentEmail = '';
      let studentName = '';
      const messageContent = adminMessage.content;
      
      // Try to extract student email and name from message content
      const emailMatch = messageContent.match(/Email:\s*([^\n\s]+)/);
      const nameMatch = messageContent.match(/Student:\s*([^\n]+)/);
      
      if (emailMatch) {
        studentEmail = emailMatch[1].trim();
        console.log('Extracted email from message:', studentEmail);
      }
      if (nameMatch) {
        studentName = nameMatch[1].trim();
        console.log('Extracted name from message:', studentName);
      }
      
      // If no email found in message, try other methods
      if (!studentEmail) {
        console.log('No email in message, trying assigned students...');
        if (assignedStudents && assignedStudents.length > 0) {
          // Use first assigned student or show selector
          const selectedStudent = assignedStudents[0];
          studentEmail = selectedStudent.student_email || selectedStudent.email;
          studentName = selectedStudent.full_name || selectedStudent.student_name || 'Student';
          console.log('Using assigned student:', studentEmail, studentName);
        } else {
          // If no assigned students, prompt for email
          studentEmail = prompt('Enter student email address to forward the contract decision to:');
          if (!studentEmail) {
            alert('Email is required to forward the contract decision');
            return;
          }
          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(studentEmail)) {
            alert('Please enter a valid email address');
            return;
          }
          studentName = prompt('Enter student name (optional):') || 'Student';
        }
      }

      console.log('Final student details:', { email: studentEmail, name: studentName });

      // Determine if it's approval or rejection
      const isApproval = adminMessage.subject.includes('APPROVED');
      const isRejection = adminMessage.subject.includes('REJECTED');
      
      console.log('Message type:', { isApproval, isRejection, subject: adminMessage.subject });
      
      let forwardSubject, forwardContent;
      
      if (isApproval) {
        forwardSubject = `🎉 Great News! Your Contract Has Been Approved`;
        forwardContent = `**Congratulations ${studentName}! Your internship contract has been approved by administration.**

**Student Information:**
- Name: ${studentName}
- Email: ${studentEmail}
- Mentor: ${user?.full_name || user?.email}

**What this means for you:**
✅ Your internship is officially approved
✅ You can begin your internship activities
✅ All paperwork is complete

**Next Steps:**
1. 📅 I will contact you to schedule an orientation meeting
2. 🎯 We'll discuss your initial tasks and goals
3. 📋 I'll assign your first set of learning objectives
4. 📞 We'll establish our regular check-in schedule

**Getting Started:**
- Check your dashboard for any new tasks I've assigned
- Prepare any questions you have about the internship
- Review the internship guidelines I'll send separately

I'm excited to work with you and support your learning journey. Welcome to the team!

**Admin's Notes:** ${messageContent.includes('Admin Notes:') ? messageContent.split('Admin Notes:')[1].split('\n')[0].trim() : 'No additional notes'}

Feel free to reach out if you have any questions!

Best regards,
${user?.full_name || user?.email}
Your Mentor`;
      } else if (isRejection) {
        forwardSubject = `📋 Contract Revision Required - Let's Work Together`;
        forwardContent = `**${studentName}, your contract needs some revisions before we can move forward.**

**Student Information:**
- Name: ${studentName}
- Email: ${studentEmail}
- Mentor: ${user?.full_name || user?.email}

**Don't worry - this is normal and we'll work together to address the feedback.**

**Admin Feedback:**
${messageContent.includes('Admin Feedback:') ? messageContent.split('Admin Feedback:')[1].split('**')[0].trim() : 'Please see the full feedback below.'}

**What we need to do:**
1. 📞 Let's schedule a call to discuss the required changes
2. 📝 I'll help you understand what needs to be updated
3. 🔄 We'll revise the contract together
4. ✅ Once updated, we'll resubmit for approval

**My Support:**
- I'm here to help you through this process
- We can review each requirement together
- I'll make sure you understand all the changes needed
- This won't delay your start date significantly

**Next Steps:**
- Reply to this message with your availability for a quick call
- Don't stress - these revisions are usually straightforward
- We'll have this sorted out quickly

Looking forward to working with you soon!

Best regards,
${user?.full_name || user?.email}
Your Mentor`;
      } else {
        // Generic contract message forwarding
        forwardSubject = `Contract Update - ${adminMessage.subject}`;
        forwardContent = `**${studentName}, I received the following update about your contract from administration:**

**Student Information:**
- Name: ${studentName}
- Email: ${studentEmail}
- Mentor: ${user?.full_name || user?.email}

**Message from Administration:**
${messageContent}

Please let me know if you have any questions. I'm here to help!

Best regards,
${user?.full_name || user?.email}`;
      }

      console.log('Sending message with subject:', forwardSubject);

      // Send the forwarded message to student
      const sentMessage = await Message.send({
        to_email: studentEmail,
        to_role: 'Student',
        from_email: user?.email,
        from_role: 'Mentor',
        subject: forwardSubject,
        content: forwardContent,
        message_type: 'contract_forwarded',
        mentor_email: user?.email
      });

      console.log('Message sent successfully:', sentMessage);

      // Try to mark the admin message as forwarded
      try {
        const updatedMessage = await Message.update(adminMessage.id, {
          forwarded_to_student: true,
          forwarded_at: new Date().toISOString()
        });
        console.log('Message marked as forwarded:', updatedMessage);
      } catch (updateError) {
        console.warn('Could not update message status (this is OK):', updateError);
        // Continue anyway - the message was sent successfully
      }

      // Show success message with more details
      alert(`✅ SUCCESS!\n\nContract decision forwarded to:\n📧 ${studentEmail}\n👤 ${studentName}\n\n🎯 The student will receive a personalized ${isApproval ? 'congratulations' : 'revision guidance'} message from you.`);
      
      await loadMessages(); // Reload messages to show updated status
      
    } catch (error) {
      console.error('Error forwarding contract decision:', error);
      alert('Failed to forward contract decision: ' + error.message);
    }
  }

  // Test function to create sample contract message
  async function createTestContractMessage() {
    try {
      await Message.send({
        to_email: user?.email,
        to_role: 'Mentor',
        from_email: 'jesus@gmail.com',
        from_role: 'Admin',
        subject: 'Contract APPROVED - Action Required: Notify John Doe',
        content: `**Contract Final Decision - Please Notify Your Student**

Student: John Doe
Email: john.doe@example.com
Contract Status: APPROVED
Reviewed by Admin: jesus@gmail.com

✅ **GOOD NEWS!** The contract has been APPROVED by administration!

**Admin Notes:**
All requirements met. Student can begin internship.

**🎯 IMPORTANT - Your Action Required:**
Please contact your student immediately to inform them that:
• Their contract is approved
• They can officially begin their internship
• You will coordinate next steps and task assignments

**Next Steps for You:**
1. 📞 Contact student with approval news
2. 📋 Begin internship coordination
3. 🎯 Assign initial tasks and orientation
4. 📅 Schedule first check-in meeting

Contract ID: TEST_CONTRACT_123`,
        message_type: 'contract_decision'
      });
      
      alert('Test contract message created! Check your admin messages section.');
      await loadMessages();
    } catch (error) {
      console.error('Error creating test message:', error);
      alert('Failed to create test message');
    }
  }

  // Progress Reports
  async function submitReport() {
    try {
      // Validate student selection first
      if (!reportForm.student_id) {
        alert('Please select a student for this report');
        return;
      }

      if (!reportForm.content || !reportForm.period_start || !reportForm.period_end) {
        alert('Please fill in all required fields (report content, period start, and period end)');
        return;
      }

      // Get student details for the report
      const student = assignedStudents.find(s => s.id === parseInt(reportForm.student_id));
      if (!student) {
        alert('Invalid student selected. Please choose a valid student from the list.');
        return;
      }

      console.log('[Mentor] Submitting report for student:', student);
      console.log('[Mentor] Report form:', reportForm);
      
      // Use actual student data with fallbacks - Student entity uses full_name
      const fullName = student.full_name || 'Unknown Student';
      const nameParts = fullName.split(' ');
      const studentFirstName = nameParts[0] || 'Student';
      const studentLastName = nameParts.slice(1).join(' ') || '';
      const studentEmail = student.student_email || student.email || 'unknown@email.com';
      
      // Send report as a message to admin (use jesus@gmail.com as admin email)
      await Message.send({
        to_email: 'jesus@gmail.com',  // Fixed admin email
        to_role: 'Admin',
        subject: `${reportForm.report_type.toUpperCase()} Report - ${studentFirstName} ${studentLastName}`,
        content: `**Report Type:** ${reportForm.report_type.toUpperCase()}
**Period:** ${reportForm.period_start} to ${reportForm.period_end}
**Student:** ${studentFirstName} ${studentLastName} (${studentEmail})
**Mentor:** ${user?.email}

**Report Content:**
${reportForm.content}`,
        student_id: parseInt(reportForm.student_id),  // Ensure it's a number
        mentor_email: user?.email,
        message_type: 'report',
        report_data: JSON.stringify({
          student_id: parseInt(reportForm.student_id),
          student_name: `${studentFirstName} ${studentLastName}`,
          student_email: studentEmail,
          report_type: reportForm.report_type,
          period_start: reportForm.period_start,
          period_end: reportForm.period_end,
          mentor_email: user?.email
        })
      });

      console.log('[Mentor] Report submitted successfully:', reportForm);
      alert('Report submitted to admin successfully!');
      showReportDialog = false;
      resetReportForm();
    } catch (error) {
      console.error('[Mentor] Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
    }
  }

  async function createTimeEntry() {
    try {
      if (!timeEntryForm.student_id) {
        alert('Please select a student');
        return;
      }

      const timeEntryData = {
        ...timeEntryForm,
        created_by: user?.email,
        created_at: new Date().toISOString()
      };

      await TimeEntry.create(timeEntryData);
      alert('Time entry created successfully!');
      showTimeEntryDialog = false;
      resetTimeEntryForm();
      await loadMentorData();
    } catch (error) {
      console.error('Error creating time entry:', error);
      alert('Failed to create time entry');
    }
  }

  // Form helpers
  function resetTaskForm() {
    taskForm = {
      title: '',
      description: '',
      assigned_to: '',
      due_date: '',
      priority: 'medium',
      status: 'assigned',
      estimated_hours: 8
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

  function resetTimeEntryForm() {
    timeEntryForm = {
      student_id: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '',
      end_time: '',
      break_start: '',
      break_end: '',
      manually_inputted_hours: 0,
      notes: '',
      status: 'draft'
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

  // Enhanced student progress calculations
  function getStudentProgress(student) {
    const approvedEntries = getEntriesByStudent(student.student_email).filter(e => e.status === 'approved');
    const approvedHours = approvedEntries.reduce((sum, e) => sum + (parseFloat(e.manually_inputted_hours) || 0), 0);
    const contractHours = student.contract_hours || 600;
    const completionPercentage = Math.min(100, Math.round((approvedHours / contractHours) * 100));
    
    const studentTasks = getTasksByStudent(student.student_email);
    const completedTasks = studentTasks.filter(t => t.status === 'completed').length;
    const averageTaskProgress = studentTasks.length > 0 ? 
      Math.round(studentTasks.reduce((sum, t) => sum + (parseInt(t.progress_percentage) || 0), 0) / studentTasks.length) : 0;
    
    return {
      approvedHours,
      contractHours,
      completionPercentage,
      totalTasks: studentTasks.length,
      completedTasks,
      averageTaskProgress,
      pendingReviews: getEntriesByStudent(student.student_email).filter(e => e.status === 'draft').length,
      weeklyHours: getWeeklyHours(student.student_email),
      lastActivity: getLastActivity(student.student_email)
    };
  }

  function getWeeklyHours(studentEmail) {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return getEntriesByStudent(studentEmail)
      .filter(e => new Date(e.date || e.created_at) >= oneWeekAgo && e.status === 'approved')
      .reduce((sum, e) => sum + (parseFloat(e.manually_inputted_hours) || 0), 0);
  }

  function getLastActivity(studentEmail) {
    const entries = getEntriesByStudent(studentEmail);
    if (entries.length === 0) return null;
    
    const latest = entries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    return latest;
  }

  function getProgressStatusColor(percentage) {
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 50) return 'text-blue-400';
    if (percentage >= 25) return 'text-yellow-400';
    return 'text-red-400';
  }

  function getProgressBarColor(percentage) {
    if (percentage >= 80) return 'from-green-500 to-emerald-500';
    if (percentage >= 50) return 'from-blue-500 to-purple-500';
    if (percentage >= 25) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  }

  // Enhanced reporting analytics functions
  function getReportingStats() {
    const currentDate = new Date();
    const currentWeek = getDateRange('week');
    const currentMonth = getDateRange('month');
    
    // Calculate weekly statistics
    const weeklyHours = assignedStudents.reduce((sum, student) => {
      const studentHours = getWeeklyHours(student.student_email);
      return sum + studentHours;
    }, 0);

    const weeklySubmissions = timeEntries.filter(e => {
      const entryDate = new Date(e.date || e.created_at);
      return entryDate >= currentWeek.start && entryDate <= currentWeek.end;
    }).length;

    // Calculate monthly statistics  
    const monthlyHours = assignedStudents.reduce((sum, student) => {
      const monthlyStudentHours = getMonthlyHours(student.student_email);
      return sum + monthlyStudentHours;
    }, 0);

    const monthlySubmissions = timeEntries.filter(e => {
      const entryDate = new Date(e.date || e.created_at);
      return entryDate >= currentMonth.start && entryDate <= currentMonth.end;
    }).length;

    // Get student performance data
    const studentPerformance = assignedStudents.map(student => {
      const progress = getStudentProgress(student);
      return {
        name: student.full_name,
        email: student.student_email,
        progress: progress.completionPercentage,
        weeklyHours: progress.weeklyHours,
        taskCompletion: progress.totalTasks > 0 ? Math.round((progress.completedTasks / progress.totalTasks) * 100) : 0,
        pendingReviews: progress.pendingReviews,
        averageProgress: progress.averageTaskProgress
      };
    });

    // Calculate team averages
    const averageProgress = studentPerformance.length > 0 ? 
      Math.round(studentPerformance.reduce((sum, s) => sum + s.progress, 0) / studentPerformance.length) : 0;
    
    const averageTaskCompletion = studentPerformance.length > 0 ?
      Math.round(studentPerformance.reduce((sum, s) => sum + s.taskCompletion, 0) / studentPerformance.length) : 0;

    return {
      weekly: {
        hours: weeklyHours,
        submissions: weeklySubmissions,
        avgHoursPerStudent: assignedStudents.length > 0 ? (weeklyHours / assignedStudents.length) : 0
      },
      monthly: {
        hours: monthlyHours,
        submissions: monthlySubmissions,
        avgHoursPerStudent: assignedStudents.length > 0 ? (monthlyHours / assignedStudents.length) : 0
      },
      team: {
        averageProgress,
        averageTaskCompletion,
        totalPendingReviews: studentPerformance.reduce((sum, s) => sum + s.pendingReviews, 0),
        studentsAtRisk: studentPerformance.filter(s => s.progress < 25).length,
        highPerformers: studentPerformance.filter(s => s.progress >= 80).length
      },
      students: studentPerformance
    };
  }

  function getMonthlyHours(studentEmail) {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    return getEntriesByStudent(studentEmail)
      .filter(e => new Date(e.date || e.created_at) >= oneMonthAgo && e.status === 'approved')
      .reduce((sum, e) => sum + (parseFloat(e.manually_inputted_hours) || 0), 0);
  }

  function getDateRange(period) {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    if (period === 'week') {
      start.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
      end.setDate(start.getDate() + 6); // End of week (Saturday)
    } else if (period === 'month') {
      start.setDate(1); // First day of month
      end.setMonth(start.getMonth() + 1);
      end.setDate(0); // Last day of month
    }

    return { start, end };
  }

  function generateReportContent(type, studentId = null) {
    const stats = getReportingStats();
    const dateRange = getDateRange(type === 'weekly' ? 'week' : 'month');
    
    if (studentId) {
      // Individual student report
      const student = assignedStudents.find(s => s.id === parseInt(studentId));
      const studentStats = stats.students.find(s => s.email === student.student_email);
      
      return `# ${type.toUpperCase()} Student Progress Report

## Student Information
- **Name:** ${student.full_name}
- **Email:** ${student.student_email}
- **Contract Hours:** ${student.contract_hours}
- **Report Period:** ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}

## Progress Summary
- **Overall Progress:** ${studentStats.progress}%
- **Task Completion Rate:** ${studentStats.taskCompletion}%
- **${type === 'weekly' ? 'Weekly' : 'Monthly'} Hours:** ${studentStats.weeklyHours.toFixed(1)} hours
- **Pending Reviews:** ${studentStats.pendingReviews}
- **Average Task Progress:** ${studentStats.averageProgress}%

## Mentor Assessment
${studentStats.progress >= 80 ? '✅ **Excellent Performance** - Student is exceeding expectations' : 
  studentStats.progress >= 50 ? '👍 **Good Progress** - Student is meeting expectations' :
  studentStats.progress >= 25 ? '⚠️ **Needs Attention** - Student requires additional support' :
  '🚨 **At Risk** - Immediate intervention required'}

## Recommendations
${studentStats.progress < 25 ? '- Schedule immediate one-on-one meeting\n- Review workload and identify blockers\n- Provide additional resources or mentoring' :
  studentStats.pendingReviews > 3 ? '- Prioritize reviewing pending submissions\n- Provide timely feedback to maintain momentum' :
  '- Continue current mentoring approach\n- Regular check-ins to maintain progress'}

## Additional Notes
[Add any specific observations, achievements, or concerns here]`;
    } else {
      // Team report
      return `# ${type.toUpperCase()} Team Progress Report

## Overview
- **Report Period:** ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}
- **Total Students:** ${assignedStudents.length}
- **Reporting Mentor:** ${user?.full_name || user?.email}

## Team Statistics
- **Average Progress:** ${stats.team.averageProgress}%
- **Average Task Completion:** ${stats.team.averageTaskCompletion}%
- **${type === 'weekly' ? 'Weekly' : 'Monthly'} Hours:** ${stats[type === 'weekly' ? 'weekly' : 'monthly'].hours.toFixed(1)} hours
- **Total Submissions:** ${stats[type === 'weekly' ? 'weekly' : 'monthly'].submissions}
- **Pending Reviews:** ${stats.team.totalPendingReviews}

## Performance Distribution
- **High Performers (80%+):** ${stats.team.highPerformers} students
- **On Track (25-79%):** ${assignedStudents.length - stats.team.highPerformers - stats.team.studentsAtRisk} students  
- **At Risk (<25%):** ${stats.team.studentsAtRisk} students

## Individual Student Summary
${stats.students.map(s => `### ${s.name}
- Progress: ${s.progress}% | Task Completion: ${s.taskCompletion}% | ${type === 'weekly' ? 'Weekly' : 'Monthly'} Hours: ${s.weeklyHours.toFixed(1)}h`).join('\n\n')}

## Key Insights & Actions
${stats.team.studentsAtRisk > 0 ? `⚠️ **Attention Required:** ${stats.team.studentsAtRisk} student(s) below 25% progress` : ''}
${stats.team.totalPendingReviews > 5 ? `📋 **Review Backlog:** ${stats.team.totalPendingReviews} submissions pending review` : ''}
${stats.team.averageProgress >= 75 ? '🎉 **Team Performing Well:** Average progress above 75%' : ''}

## Recommendations
- Focus mentoring efforts on students below 50% progress
- Maintain regular check-ins with high performers
- Address any blockers identified in individual sessions

## Mentor Notes
[Add any additional observations or recommendations here]`;
    }
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
            <p class="text-white/70">{assignedStudents.length} total students under your guidance</p>
            {#if assignedStudents.length > 0}
              {@const avgProgress = Math.round(assignedStudents.reduce((sum, s) => sum + getStudentProgress(s).completionPercentage, 0) / assignedStudents.length)}
              {@const totalHours = assignedStudents.reduce((sum, s) => sum + getStudentProgress(s).approvedHours, 0)}
              <div class="mt-2 flex items-center gap-4 text-sm">
                <span class="text-white/60">Avg Progress: <span class="{getProgressStatusColor(avgProgress)} font-semibold">{avgProgress}%</span></span>
                <span class="text-white/60">Total Hours: <span class="text-white font-semibold">{totalHours.toFixed(1)}</span></span>
              </div>
            {/if}
          </div>
          <div class="flex gap-3">
            <Button
              on:click={loadMentorData}
              class="bg-blue-500 hover:bg-blue-600 text-white h-10 px-4 rounded-md flex items-center"
              disabled={isLoading}
            >
              <RefreshCw class="w-4 h-4 mr-2 {isLoading ? 'animate-spin' : ''}" />
              {isLoading ? 'Refreshing...' : 'Reload Data'}
            </Button>
          </div>
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
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {#each assignedStudents as student}
              {@const progress = getStudentProgress(student)}
              <div class="bg-white/5 rounded-xl border border-white/20 p-6 hover:bg-white/10 transition-all duration-300 hover:scale-[1.02]">
                <!-- Student Header -->
                <div class="flex items-start justify-between mb-4">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center relative">
                      <UserIcon class="w-6 h-6 text-white" />
                      {#if progress.completionPercentage >= 80}
                        <div class="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                          <Award class="w-3 h-3 text-white" />
                        </div>
                      {/if}
                    </div>
                    <div>
                      <h3 class="text-lg font-bold text-white">{student.full_name}</h3>
                      <p class="text-white/50 text-sm">{student.student_email}</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="{getProgressStatusColor(progress.completionPercentage)} text-lg font-bold">
                      {progress.completionPercentage}%
                    </div>
                    <p class="text-white/50 text-xs">Complete</p>
                  </div>
                </div>

                <!-- Progress Bar -->
                <div class="mb-4">
                  <div class="flex justify-between text-xs text-white/60 mb-1">
                    <span>Contract Progress</span>
                    <span>{progress.approvedHours} / {progress.contractHours} hrs</span>
                  </div>
                  <div class="w-full bg-white/10 rounded-full h-2">
                    <div class="bg-gradient-to-r {getProgressBarColor(progress.completionPercentage)} h-2 rounded-full transition-all duration-500 relative overflow-hidden" 
                         style="width: {progress.completionPercentage}%">
                      <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-pulse"></div>
                    </div>
                  </div>
                </div>

                <!-- Enhanced Stats Grid -->
                <div class="grid grid-cols-2 gap-3 mb-4">
                  <div class="bg-white/5 rounded-lg p-3">
                    <div class="flex items-center gap-2 mb-1">
                      <ClipboardList class="w-4 h-4 text-blue-400" />
                      <span class="text-white/70 text-xs">Tasks</span>
                    </div>
                    <p class="text-white font-semibold">{progress.completedTasks}/{progress.totalTasks}</p>
                    {#if progress.totalTasks > 0}
                      <p class="text-white/50 text-xs">{Math.round((progress.completedTasks/progress.totalTasks)*100)}% done</p>
                    {:else}
                      <p class="text-white/50 text-xs">No tasks yet</p>
                    {/if}
                  </div>
                  
                  <div class="bg-white/5 rounded-lg p-3">
                    <div class="flex items-center gap-2 mb-1">
                      <Clock class="w-4 h-4 text-green-400" />
                      <span class="text-white/70 text-xs">This Week</span>
                    </div>
                    <p class="text-white font-semibold">{progress.weeklyHours.toFixed(1)}h</p>
                    <p class="text-white/50 text-xs">Weekly hours</p>
                  </div>
                  
                  <div class="bg-white/5 rounded-lg p-3">
                    <div class="flex items-center gap-2 mb-1">
                      <Target class="w-4 h-4 text-purple-400" />
                      <span class="text-white/70 text-xs">Avg Progress</span>
                    </div>
                    <p class="text-white font-semibold">{progress.averageTaskProgress}%</p>
                    <p class="text-white/50 text-xs">Task progress</p>
                  </div>
                  
                  <div class="bg-white/5 rounded-lg p-3">
                    <div class="flex items-center gap-2 mb-1">
                      <AlertCircle class="w-4 h-4 text-yellow-400" />
                      <span class="text-white/70 text-xs">Pending</span>
                    </div>
                    <p class="text-white font-semibold">{progress.pendingReviews}</p>
                    <p class="text-white/50 text-xs">Reviews</p>
                  </div>
                </div>

                <!-- Last Activity -->
                {#if progress.lastActivity}
                  <div class="mb-4 p-2 bg-white/5 rounded-lg">
                    <p class="text-white/60 text-xs mb-1">Last Activity:</p>
                    <p class="text-white text-sm">
                      {new Date(progress.lastActivity.created_at).toLocaleDateString()} - 
                      <span class="{progress.lastActivity.status === 'approved' ? 'text-green-400' : progress.lastActivity.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'}">
                        {progress.lastActivity.status}
                      </span>
                    </p>
                  </div>
                {/if}

                <!-- Action Buttons -->
                <div class="flex gap-2">
                  <Button 
                    on:click={() => selectStudent(student)}
                    class="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm transition-colors flex h-10 items-center px-2 rounded-md justify-center"
                  >
                    <UserIcon class="w-4 h-4 mr-2" />
                    Details
                  </Button>
                  <Button 
                    on:click={() => openMessageDialog(student.student_email)}
                    class="bg-purple-500 hover:bg-purple-600 text-white transition-colors h-10 flex items-center justify-center rounded-md w-10"
                  >
                    <MessageSquare class="w-4 h-4" />
                  </Button>
                  {#if progress.pendingReviews > 0}
                    <Button 
                      on:click={() => { activeTab = 'submissions'; }}
                      class="bg-yellow-500 hover:bg-yellow-600 text-white relative"
                    >
                      <Clock class="w-4 h-4" />
                      <div class="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white">
                        {progress.pendingReviews}
                      </div>
                    </Button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}

        {#if selectedStudent}
          {@const detailedProgress = getStudentProgress(selectedStudent)}
          <div class="mt-8 bg-white/5 rounded-xl border border-white/20 p-6">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-xl font-bold text-white">Student Details: {selectedStudent.full_name}</h3>
              <Button 
                on:click={() => selectedStudent = null}
                variant="ghost"
                class="text-white/70 hover:text-white h-10 rounded-md flex items-center px-2 justify-center"
              >
                <X class="w-4 h-4" />
              </Button>
            </div>

            <!-- Progress Overview -->
            <div class="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
              <div class="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl p-4">
                <div class="flex items-center gap-2 mb-2">
                  <Award class="w-5 h-5 text-blue-400" />
                  <span class="text-white font-semibold">Contract Progress</span>
                </div>
                <div class="text-2xl font-bold {getProgressStatusColor(detailedProgress.completionPercentage)}">
                  {detailedProgress.completionPercentage}%
                </div>
                <p class="text-white/60 text-sm">{detailedProgress.approvedHours} / {detailedProgress.contractHours} hours</p>
              </div>
              
              <div class="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-4">
                <div class="flex items-center gap-2 mb-2">
                  <CheckCircle class="w-5 h-5 text-green-400" />
                  <span class="text-white font-semibold">Task Completion</span>
                </div>
                <div class="text-2xl font-bold text-white">
                  {detailedProgress.completedTasks}/{detailedProgress.totalTasks}
                </div>
                <p class="text-white/60 text-sm">{detailedProgress.totalTasks > 0 ? Math.round((detailedProgress.completedTasks/detailedProgress.totalTasks)*100) : 0}% completed</p>
              </div>
              
              <div class="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-4">
                <div class="flex items-center gap-2 mb-2">
                  <TrendingUp class="w-5 h-5 text-purple-400" />
                  <span class="text-white font-semibold">Weekly Hours</span>
                </div>
                <div class="text-2xl font-bold text-white">
                  {detailedProgress.weeklyHours.toFixed(1)}
                </div>
                <p class="text-white/60 text-sm">This week's progress</p>
              </div>
              
              <div class="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-4">
                <div class="flex items-center gap-2 mb-2">
                  <AlertCircle class="w-5 h-5 text-yellow-400" />
                  <span class="text-white font-semibold">Pending Reviews</span>
                </div>
                <div class="text-2xl font-bold text-white">
                  {detailedProgress.pendingReviews}
                </div>
                <p class="text-white/60 text-sm">Awaiting approval</p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Contact & Contract Info -->
              <div class="bg-white/5 rounded-xl p-4">
                <h4 class="text-white font-semibold mb-3 flex items-center gap-2">
                  <UserIcon class="w-4 h-4" />
                  Student Information
                </h4>
                <div class="space-y-3">
                  <div class="flex items-center gap-2 text-white/70">
                    <Mail class="w-4 h-4" />
                    <span class="text-sm">{selectedStudent.student_email}</span>
                  </div>
                  <div class="flex items-center gap-2 text-white/70">
                    <Calendar class="w-4 h-4" />
                    <span class="text-sm">Start: {selectedStudent.start_date ? new Date(selectedStudent.start_date).toLocaleDateString() : 'Not set'}</span>
                  </div>
                  <div class="flex items-center gap-2 text-white/70">
                    <Target class="w-4 h-4" />
                    <span class="text-sm">Contract: {selectedStudent.contract_hours} hours</span>
                  </div>
                  {#if selectedStudent.end_date}
                    <div class="flex items-center gap-2 text-white/70">
                      <Calendar class="w-4 h-4" />
                      <span class="text-sm">End: {new Date(selectedStudent.end_date).toLocaleDateString()}</span>
                    </div>
                  {/if}
                </div>
              </div>

              <!-- Recent Activity & Tasks -->
              <div class="bg-white/5 rounded-xl p-4">
                <h4 class="text-white font-semibold mb-3 flex items-center gap-2">
                  <Clock class="w-4 h-4" />
                  Recent Activity
                </h4>
                <div class="space-y-2 max-h-40 overflow-y-auto">
                  {#each getEntriesByStudent(selectedStudent.student_email).slice(0, 5) as entry}
                    <div class="text-sm text-white/70 flex items-center justify-between p-2 bg-white/5 rounded">
                      <div>
                        <span class="text-white">{new Date(entry.date || entry.created_at).toLocaleDateString()}</span>
                        {#if entry.manually_inputted_hours}
                          <span class="text-white/50"> • {entry.manually_inputted_hours}h</span>
                        {/if}
                      </div>
                      <span class="px-2 py-1 rounded text-xs {entry.status === 'approved' ? 'bg-green-500/20 text-green-400' : entry.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}">
                        {entry.status}
                      </span>
                    </div>
                  {:else}
                    <p class="text-white/50 text-sm text-center py-4">No recent activity</p>
                  {/each}
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-3 mt-6">
              <Button 
                on:click={() => openMessageDialog(selectedStudent.student_email)}
                class="bg-purple-500 hover:bg-purple-600 text-white justify-center flex items-center px-2 rounded-md"
              >
                <MessageSquare class="w-4 h-4 mr-2" />
                Send Message
              </Button>
              <Button 
                on:click={() => { activeTab = 'tasks'; taskForm.assigned_to = selectedStudent.student_email; showTaskDialog = true; }}
                class="bg-blue-500 hover:bg-blue-600 text-white rounded-md h-10 flex items-center justify-center px-2"
              >
                <Plus class="w-4 h-4 mr-2" />
                Assign Task
              </Button>
              {#if detailedProgress.pendingReviews > 0}
                <Button 
                  on:click={() => { activeTab = 'submissions'; }}
                  class="bg-yellow-500 hover:bg-yellow-600 text-white"
                >
                  <AlertCircle class="w-4 h-4 mr-2" />
                  Review Submissions ({detailedProgress.pendingReviews})
                </Button>
              {/if}
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
            <Button 
              on:click={() => showTimeEntryDialog = true}
              class="bg-blue-500 hover:bg-blue-600 text-white h-10 rounded-md px-4 flex items-center justify-center"
            >
              <Clock class="w-4 h-4 mr-2" />
              Add Time Entry
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
                    <div class="flex items-center gap-4 text-xs text-white/50 mb-3">
                      <span>Assigned to: {getStudentNameById(task.student_id)}</span>
                      <span>Due: {task.due_date || 'No deadline'}</span>
                      <span>Hours: {task.hours_worked || 0}/{task.estimated_hours || 8}</span>
                      <span>Progress: {task.progress_percentage || 0}%</span>
                    </div>
                    
                    <!-- Progress Bar -->
                    <div class="w-full bg-white/10 rounded-full h-2 mb-2">
                      <div 
                        class="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                        style="width: {task.progress_percentage || 0}%"
                      ></div>
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
                      class="bg-blue-500 hover:bg-blue-600 text-white text-sm h-10 flex items-center justify-center px-2 rounded-md"
                      disabled={task.status === 'in_progress'}
                    >
                      Mark In Progress
                    </Button>
                    <Button 
                      on:click={() => updateTaskStatus(task.id, 'completed')}
                      class="bg-green-500 hover:bg-green-600 text-white text-sm h-10 flex items-center justify-center px-2 rounded-md"
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
                  <div class="flex flex-col gap-2 ml-4">
                    <Button
                      on:click={() => viewSubmissionDetails(entry)}
                      class="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-400/30 h-9 px-4 flex items-center rounded-md whitespace-nowrap"
                    >
                      <Eye class="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    {#if entry.proof_files && entry.proof_files.length > 0}
                      <Button
                        on:click={() => downloadAllSubmissionFiles(entry)}
                        class="bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-400/30 h-9 px-4 flex items-center rounded-md whitespace-nowrap"
                      >
                        <Download class="w-4 h-4 mr-2" />
                        Download ({entry.proof_files.length})
                      </Button>
                    {/if}
                  </div>
                </div>

                <div class="flex gap-2">
                  <Button
                    on:click={() => approveEntry(entry.id)}
                    class="bg-green-500 hover:bg-green-600 text-white h-10 rounded-md px-2 items-center justify-center flex"
                  >
                    <Check class="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    on:click={() => rejectEntry(entry.id)}
                    class="bg-red-500 hover:bg-red-600 text-white h-10 rounded-md px-2 items-center justify-center flex"
                  >
                    <X class="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    on:click={() => openFeedbackDialog(entry)}
                    class="bg-blue-500 hover:bg-blue-600 text-white h-10 rounded-md px-2 items-center justify-center flex"
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
        <!-- Enhanced Progress Reports -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-2xl font-bold text-white">Progress Reports & Analytics</h2>
            <p class="text-white/70">Comprehensive reporting dashboard for student progress tracking</p>
          </div>
          <div class="flex gap-3">
            <Button 
              on:click={() => { 
                reportForm.content = generateReportContent('weekly'); 
                reportForm.report_type = 'weekly';
                showReportDialog = true; 
              }}
              class="bg-blue-500 hover:bg-blue-600 text-white h-10 rounded-md px-4 flex items-center"
            >
              <FileText class="w-4 h-4 mr-2" />
              Quick Weekly Report
            </Button>
            <Button 
              on:click={() => showReportDialog = true}
              class="bg-purple-500 hover:bg-purple-600 text-white h-10 rounded-md px-4 flex items-center"
            >
              <Plus class="w-4 h-4 mr-2" />
              Custom Report
            </Button>
          </div>
        </div>

        {@const reportStats = getReportingStats()}

        <!-- Analytics Overview -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div class="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-white/20 p-6">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-lg bg-blue-500/30 flex items-center justify-center">
                <TrendingUp class="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p class="text-white font-semibold">Team Average</p>
                <p class="text-white/60 text-sm">Progress</p>
              </div>
            </div>
            <div class="text-2xl font-bold {getProgressStatusColor(reportStats.team.averageProgress)}">
              {reportStats.team.averageProgress}%
            </div>
            <p class="text-white/50 text-sm mt-1">Across {assignedStudents.length} students</p>
          </div>

          <div class="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl border border-white/20 p-6">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-lg bg-green-500/30 flex items-center justify-center">
                <CheckCircle class="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p class="text-white font-semibold">Task Completion</p>
                <p class="text-white/60 text-sm">Team Average</p>
              </div>
            </div>
            <div class="text-2xl font-bold text-white">
              {reportStats.team.averageTaskCompletion}%
            </div>
            <p class="text-white/50 text-sm mt-1">Average completion rate</p>
          </div>

          <div class="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-white/20 p-6">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-lg bg-purple-500/30 flex items-center justify-center">
                <Clock class="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p class="text-white font-semibold">Weekly Hours</p>
                <p class="text-white/60 text-sm">This Week</p>
              </div>
            </div>
            <div class="text-2xl font-bold text-white">
              {reportStats.weekly.hours.toFixed(1)}
            </div>
            <p class="text-white/50 text-sm mt-1">{reportStats.weekly.avgHoursPerStudent.toFixed(1)}h per student</p>
          </div>

          <div class="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl border border-white/20 p-6">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-lg bg-yellow-500/30 flex items-center justify-center">
                <AlertCircle class="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p class="text-white font-semibold">Pending Reviews</p>
                <p class="text-white/60 text-sm">Need Attention</p>
              </div>
            </div>
            <div class="text-2xl font-bold text-white">
              {reportStats.team.totalPendingReviews}
            </div>
            <p class="text-white/50 text-sm mt-1">Awaiting approval</p>
          </div>
        </div>

        <!-- Performance Distribution -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <!-- Team Performance Chart -->
          <div class="bg-white/5 rounded-xl border border-white/20 p-6">
            <h3 class="text-white font-bold mb-4 flex items-center gap-2">
              <Award class="w-5 h-5 text-purple-400" />
              Performance Distribution
            </h3>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-4 h-4 bg-green-500 rounded"></div>
                  <span class="text-white/70">High Performers (80%+)</span>
                </div>
                <span class="text-green-400 font-semibold">{reportStats.team.highPerformers} students</span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-4 h-4 bg-blue-500 rounded"></div>
                  <span class="text-white/70">On Track (25-79%)</span>
                </div>
                <span class="text-blue-400 font-semibold">{assignedStudents.length - reportStats.team.highPerformers - reportStats.team.studentsAtRisk} students</span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-4 h-4 bg-red-500 rounded"></div>
                  <span class="text-white/70">At Risk (&lt;25%)</span>
                </div>
                <span class="text-red-400 font-semibold">{reportStats.team.studentsAtRisk} students</span>
              </div>
            </div>

            <!-- Performance Bar Chart -->
            <div class="mt-6">
              <div class="w-full bg-white/10 rounded-full h-4 overflow-hidden">
                {#if assignedStudents.length > 0}
                  {@const total = assignedStudents.length}
                  {@const highPercentage = (reportStats.team.highPerformers / total) * 100}
                  {@const onTrackPercentage = ((total - reportStats.team.highPerformers - reportStats.team.studentsAtRisk) / total) * 100}
                  {@const atRiskPercentage = (reportStats.team.studentsAtRisk / total) * 100}
                  <div class="h-full flex">
                    <div class="bg-green-500 transition-all duration-500" style="width: {highPercentage}%"></div>
                    <div class="bg-blue-500 transition-all duration-500" style="width: {onTrackPercentage}%"></div>
                    <div class="bg-red-500 transition-all duration-500" style="width: {atRiskPercentage}%"></div>
                  </div>
                {/if}
              </div>
            </div>
          </div>

          <!-- Recent Activity Summary -->
          <div class="bg-white/5 rounded-xl border border-white/20 p-6">
            <h3 class="text-white font-bold mb-4 flex items-center gap-2">
              <Activity class="w-5 h-5 text-blue-400" />
              Recent Activity Summary
            </h3>
            <div class="space-y-4">
              <div class="bg-white/5 rounded-lg p-3">
                <p class="text-white/70 text-sm mb-1">This Week</p>
                <div class="flex justify-between items-center">
                  <span class="text-white">Total Hours</span>
                  <span class="text-blue-400 font-semibold">{reportStats.weekly.hours.toFixed(1)}h</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-white">Submissions</span>
                  <span class="text-purple-400 font-semibold">{reportStats.weekly.submissions}</span>
                </div>
              </div>
              
              <div class="bg-white/5 rounded-lg p-3">
                <p class="text-white/70 text-sm mb-1">This Month</p>
                <div class="flex justify-between items-center">
                  <span class="text-white">Total Hours</span>
                  <span class="text-green-400 font-semibold">{reportStats.monthly.hours.toFixed(1)}h</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-white">Submissions</span>
                  <span class="text-yellow-400 font-semibold">{reportStats.monthly.submissions}</span>
                </div>
              </div>
            </div>

            <!-- Quick Actions -->
            <div class="mt-4 pt-4 border-t border-white/10">
              <p class="text-white/70 text-sm mb-3">Quick Report Actions</p>
              <div class="flex flex-col gap-2">
                <Button 
                  on:click={() => {
                    reportForm.content = generateReportContent('monthly');
                    reportForm.report_type = 'monthly';
                    showReportDialog = true;
                  }}
                  variant="ghost" 
                  class="text-white/70 hover:text-white justify-start"
                >
                  <Calendar class="w-4 h-4 mr-2" />
                  Monthly Summary
                </Button>
                <Button 
                  on:click={() => { activeTab = 'submissions'; }}
                  variant="ghost" 
                  class="text-white/70 hover:text-white justify-start"
                  disabled={reportStats.team.totalPendingReviews === 0}
                >
                  <AlertCircle class="w-4 h-4 mr-2" />
                  Review Pending ({reportStats.team.totalPendingReviews})
                </Button>
              </div>
            </div>
          </div>
        </div>

        <!-- Individual Student Reports -->
        <div class="bg-white/5 rounded-xl border border-white/20 p-6">
          <h3 class="text-white font-bold mb-4 flex items-center gap-2">
            <Users class="w-5 h-5 text-green-400" />
            Individual Student Reports
          </h3>
          <p class="text-white/70 mb-6">Generate detailed progress reports for individual students</p>
          
          {#if assignedStudents.length === 0}
            <div class="text-center py-12">
              <Users class="w-16 h-16 text-white/30 mx-auto mb-4" />
              <p class="text-white/70">No students assigned for reporting</p>
            </div>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {#each assignedStudents as student}
                {@const studentProgress = getStudentProgress(student)}
                <div class="bg-white/5 border border-white/20 rounded-lg p-4 hover:bg-white/10 transition-all">
                  <div class="flex items-center gap-3 mb-3">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <UserIcon class="w-5 h-5 text-white" />
                    </div>
                    <div class="flex-1">
                      <p class="text-white font-semibold truncate">{student.full_name}</p>
                      <p class="text-white/50 text-sm">{studentProgress.completionPercentage}% complete</p>
                    </div>
                  </div>
                  
                  <div class="space-y-2 mb-4 text-sm">
                    <div class="flex justify-between">
                      <span class="text-white/70">Weekly Hours:</span>
                      <span class="text-white">{studentProgress.weeklyHours.toFixed(1)}h</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-white/70">Tasks Done:</span>
                      <span class="text-white">{studentProgress.completedTasks}/{studentProgress.totalTasks}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-white/70">Pending:</span>
                      <span class="{studentProgress.pendingReviews > 0 ? 'text-yellow-400' : 'text-green-400'}">{studentProgress.pendingReviews}</span>
                    </div>
                  </div>

                  <div class="flex gap-2">
                    <Button 
                      on:click={() => {
                        reportForm.content = generateReportContent('weekly', student.id);
                        reportForm.student_id = student.id.toString();
                        reportForm.report_type = 'weekly';
                        showReportDialog = true;
                      }}
                      class="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm h-10 flex items-center justify-center px-2 rounded-md"
                    >
                      <FileText class="w-3 h-3 mr-1" />
                      Weekly
                    </Button>
                    <Button 
                      on:click={() => {
                        reportForm.content = generateReportContent('monthly', student.id);
                        reportForm.student_id = student.id.toString();
                        reportForm.report_type = 'monthly';
                        showReportDialog = true;
                      }}
                      class="flex-1 bg-purple-500 hover:bg-purple-600 text-white text-sm  h-10 flex items-center justify-center px-2 rounded-md"
                    >
                      <Calendar class="w-3 h-3 mr-1" />
                      Monthly
                    </Button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

      {:else if activeTab === 'messages'}
        <!-- Messages Management -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-2xl font-bold text-white">Messages</h2>
            <p class="text-white/70">
              {messages.filter(m => !m.is_read && m.to_email === user?.email).length} unread messages | 
              Total: {messages.length} messages
            </p>
          </div>
          <Button
            on:click={loadMessages}
            class="bg-blue-500 hover:bg-blue-600 text-white h-10 px-4 rounded-md flex items-center"
            disabled={isLoading}
          >
            <RefreshCw class="w-4 h-4 mr-2 {isLoading ? 'animate-spin' : ''}" />
            {isLoading ? 'Refreshing...' : 'Refresh Messages'}
          </Button>
        </div>

        <!-- Admin Messages Section -->
        {@const adminMessages = messages.filter(m => m.from_role === 'Admin' && m.to_email === user?.email)}
        {#if adminMessages.length > 0}
          <div class="bg-white/5 rounded-xl border border-white/20 p-6 mb-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-white font-bold flex items-center gap-2">
                <Shield class="w-5 h-5" />
                Messages from Admin ({adminMessages.length})
              </h3>
              <!-- Test button to create sample contract message -->
              <Button
                on:click={createTestContractMessage}
                class="bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-1 rounded"
                title="Create test contract decision message"
              >
                Test Contract Message
              </Button>
            </div>
            <div class="space-y-3 max-h-64 overflow-y-auto">
              {#each adminMessages as msg}
                <div class="p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all">
                  <div class="flex justify-between items-start mb-2">
                    <div class="flex-1">
                      <h4 class="text-white font-semibold">{msg.subject}</h4>
                      <p class="text-white/60 text-sm">
                        From: {msg.from_email} • {new Date(msg.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div class="flex items-center gap-2">
                      {#if !msg.is_read}
                        <span class="bg-red-500 text-white text-xs px-2 py-1 rounded">New</span>
                      {/if}
                      
                      <!-- Enhanced forwarding buttons with better conditional logic -->
                      {#if msg.forwarded_to_student || msg.forwarded_at}
                        <!-- Already forwarded - show success status -->
                        <span class="bg-green-500/20 text-green-300 text-xs px-3 py-1.5 rounded border border-green-500/30 flex items-center gap-1">
                          <CheckCircle class="w-3 h-3" />
                          <BookCheck color="green"/> Forwarded
                        </span>
                      {:else if msg.from_role === 'Admin'}
                        <!-- Not yet forwarded - show action button -->
                        <Button
                          on:click={() => forwardContractDecisionToStudent(msg)}
                          class="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-xs px-4 py-1.5 rounded-md font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-1"
                          title="Forward this message to the student with personalized content"
                        >
                          <Send class="w-3 h-3" />
                           Forward to Student
                        </Button>
                      {/if}
                    </div>
                  </div>
                  <p class="text-white/70 text-sm whitespace-pre-line">{msg.content}</p>
                  
                  <!-- Enhanced Contract forwarding status with better visual feedback -->
                  {#if msg.forwarded_to_student || msg.forwarded_at}
                    <div class="mt-3 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                      <div class="flex items-center gap-2">
                        <CheckCircle class="w-4 h-4 text-green-400" />
                        <p class="text-green-300 text-sm font-medium">
                          🎉 Successfully forwarded to student!
                        </p>
                      </div>
                      {#if msg.forwarded_at}
                        <p class="text-green-400/80 text-xs mt-1 ml-6">
                          Forwarded on: {new Date(msg.forwarded_at).toLocaleDateString()} at {new Date(msg.forwarded_at).toLocaleTimeString()}
                        </p>
                      {/if}
                      <p class="text-green-400/60 text-xs mt-1 ml-6">
                        <BookCheck color="green"/> The student has received the {msg.subject.includes('APPROVED') ? 'congratulations' : 'revision guidance'} message from you.
                      </p>
                    </div>
                  {:else if msg.message_type === 'contract_decision' || msg.subject.toLowerCase().includes('contract') || msg.subject.includes('APPROVED') || msg.subject.includes('REJECTED')}
                    <div class="mt-3 p-3 bg-orange-500/20 border border-orange-500/50 rounded-lg">
                      <div class="flex items-center gap-2">
                        <Clock class="w-4 h-4 text-orange-400" />
                        <p class="text-orange-300 text-sm font-medium">
                          📤 Contract decision awaiting forwarding to student
                        </p>
                      </div>
                      <p class="text-orange-400/80 text-xs mt-1 ml-6">
                        Click the "Forward" button above to send this {msg.subject.includes('APPROVED') ? 'approval' : 'decision'} to the student.
                      </p>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}

        {#if selectedConversation}
          <!-- Conversation View -->
          <div class="bg-white/5 rounded-xl border border-white/20 p-6 mb-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold text-white">
                Conversation with {getStudentName(selectedConversation[0]?.from_email || selectedConversation[0]?.to_email)}
              </h3>
              <Button
                on:click={() => selectedConversation = null}
                variant="ghost"
                class="text-white/70 hover:text-white"
              >
                <X class="w-4 h-4" />
              </Button>
            </div>

            <div class="space-y-4 max-h-96 overflow-y-auto">
              {#each selectedConversation as msg}
                <div class="p-4 rounded-lg {msg.from_email === user?.email ? 'bg-blue-500/20 ml-8' : 'bg-white/10 mr-8'}">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-white font-semibold text-sm">
                      {msg.from_email === user?.email ? 'You' : getStudentName(msg.from_email)}
                    </span>
                    <span class="text-white/50 text-xs">
                      {format(parseISO(msg.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  <p class="text-white/80 font-semibold text-sm mb-2">{msg.subject}</p>
                  <p class="text-white/70 text-sm">{msg.content}</p>
                </div>
              {/each}
            </div>

            <div class="mt-4 pt-4 border-t border-white/20">
              <Button
                on:click={() => {
                  messageForm.to_student = selectedConversation.find(m => m.from_email !== user?.email)?.from_email || selectedConversation.find(m => m.to_email !== user?.email)?.to_email;
                  messageForm.subject = 'Re: ' + (selectedConversation[0]?.subject || 'Message');
                  showMessageDialog = true;
                }}
                class="bg-green-500 hover:bg-green-600 text-white h-10 px-4 rounded-md flex items-center"
              >
                <Send class="w-4 h-4 mr-2" />
                Reply to Message
              </Button>
            </div>
          </div>
        {:else}
          <!-- Message List -->
          {#if messages.length === 0}
            <div class="text-center py-12 bg-white/5 rounded-xl">
              <MessageSquare class="w-16 h-16 text-white/30 mx-auto mb-4" />
              <p class="text-white/70">No messages yet</p>
              <p class="text-white/50 text-sm mt-2">Messages from your students will appear here</p>
            </div>
          {:else}
            <div class="space-y-4">
              {#each messages as message}
                <div class="bg-white/5 rounded-xl border border-white/20 p-6 hover:bg-white/10 transition-all">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-3 mb-2">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                          <UserIcon class="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 class="text-white font-semibold">{getStudentName(message.from_email)}</h3>
                          <p class="text-white/50 text-sm">{message.from_email} → {message.to_email}</p>
                          <p class="text-white/40 text-xs">Roles: {message.from_role} → {message.to_role}</p>
                        </div>
                      </div>
                      <div class="ml-13">
                        <p class="text-white/80 font-medium text-sm mb-1">{message.subject}</p>
                        <p class="text-white/60 text-sm line-clamp-3">{message.content}</p>
                        <p class="text-white/40 text-xs mt-2">
                          {format(parseISO(message.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div class="flex flex-col items-end gap-2">
                      <Button
                        on:click={() => {
                          messageForm.to_student = message.from_email;
                          messageForm.subject = 'Re: ' + (message.subject || 'Message');
                          showMessageDialog = true;
                        }}
                        class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 text-xs h-10 flex rounded-md items-center"
                      >
                        <Send class="w-3 h-3 mr-1" />
                        Reply
                      </Button>
                      <Button
                        on:click={() => viewConversation(message.from_email)}
                        variant="ghost"
                        class="text-white/70 hover:text-white px-3 py-1 text-xs"
                      >
                        View Thread
                      </Button>
                      {#if !message.is_read}
                        <span class="px-2 py-1 rounded-full text-xs bg-red-500 text-white">New</span>
                      {/if}
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        {/if}

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
              <label class="text-white/70 text-sm block mb-2">Estimated Hours</label>
              <Input 
                type="number"
                step="0.5"
                min="0.5"
                max="40"
                bind:value={taskForm.estimated_hours}
                placeholder="8"
                class="bg-white/5 border-white/20 text-white"
              />
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

<!-- Time Entry Dialog -->
{#if showTimeEntryDialog}
  <Dialog bind:open={showTimeEntryDialog}>
    <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div class="bg-transparent rounded-xl border border-white/20 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 class="text-2xl font-bold text-white mb-6">Add Time Entry</h2>
        
        <div class="space-y-4">
          <div>
            <label class="text-white/70 text-sm block mb-2">Student</label>
            <select 
              bind:value={timeEntryForm.student_id} 
              class="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white"
            >
              <option value="">Select a student</option>
              {#each assignedStudents as student}
                <option value={student.id}>{student.full_name} ({student.student_email})</option>
              {/each}
            </select>
          </div>

          <div>
            <label class="text-white/70 text-sm block mb-2">Date</label>
            <Input bind:value={timeEntryForm.date} type="date" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-white/70 text-sm block mb-2">Start Time</label>
              <Input bind:value={timeEntryForm.start_time} type="time" />
            </div>
            <div>
              <label class="text-white/70 text-sm block mb-2">End Time</label>
              <Input bind:value={timeEntryForm.end_time} type="time" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-white/70 text-sm block mb-2">Break Start</label>
              <Input bind:value={timeEntryForm.break_start} type="time" />
            </div>
            <div>
              <label class="text-white/70 text-sm block mb-2">Break End</label>
              <Input bind:value={timeEntryForm.break_end} type="time" />
            </div>
          </div>

          <div>
            <label class="text-white/70 text-sm block mb-2">Manual Hours</label>
            <Input bind:value={timeEntryForm.manually_inputted_hours} type="number" step="0.25" min="0" />
          </div>

          <div>
            <label class="text-white/70 text-sm block mb-2">Notes</label>
            <textarea 
              bind:value={timeEntryForm.notes}
              placeholder="Additional notes about the work session..."
              class="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white min-h-[100px] resize-none"
            ></textarea>
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <Button 
            on:click={() => { showTimeEntryDialog = false; resetTimeEntryForm(); }}
            variant="outline" 
            class="text-white border-white/20"
          >
            Cancel
          </Button>
          <Button 
            on:click={createTimeEntry}
            class="bg-blue-500 hover:bg-blue-600 text-white h-10 flex items-center justify-center px-2 rounded-md"
          >
            <Clock class="w-4 h-4 mr-2" />
            Add Time Entry
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
            <label class="text-white/70 text-sm block mb-2">
              Select Student <span class="text-red-400">*</span>
            </label>
            <select
              bind:value={reportForm.student_id}
              class="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white"
            >
              <option value="">Choose a student...</option>
              {#each assignedStudents as student}
                <option value={student.id}>{student.full_name}</option>
              {/each}
            </select>
            {#if assignedStudents.length === 0}
              <p class="text-yellow-400 text-xs mt-1">No students assigned yet</p>
            {/if}
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

        {#if !reportForm.student_id || !reportForm.content}
          <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-4">
            <p class="text-yellow-400 text-sm">
              <span class="font-semibold">Required fields:</span>
              {#if !reportForm.student_id}
                <span class="block">• Please select a student</span>
              {/if}
              {#if !reportForm.content}
                <span class="block">• Please enter report content</span>
              {/if}
            </p>
          </div>
        {/if}

        <div class="flex gap-3 mt-6">
          <Button
            on:click={submitReport}
            class="flex-1 bg-purple-500 hover:bg-purple-600 text-white flex h-10 items-center justify-center rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!reportForm.content || !reportForm.student_id}
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
            class="flex-1 bg-blue-500 hover:bg-blue-600 text-white h-10 rounded-md flex items-center px-2 justify-center"
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

<!-- Submission Details Modal -->
{#if showSubmissionDetailsModal && viewingSubmission}
  {@const badge = getSubmissionStatusBadge(viewingSubmission.status)}
  <div
    class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
    on:click={closeSubmissionDetailsModal}
    on:keydown={(e) => e.key === 'Escape' && closeSubmissionDetailsModal()}
    role="button"
    tabindex="0"
    aria-label="Close modal"
  >
    <div
      class="bg-gray-900 rounded-2xl border border-white/20 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      on:click|stopPropagation
      role="dialog"
      aria-modal="true"
    >
      <!-- Modal Header -->
      <div class="flex items-start justify-between mb-6 border-b border-white/10 pb-4">
        <div>
          <h2 class="text-2xl font-bold text-white mb-2">Submission Details</h2>
          <p class="text-white/70">{getStudentName(viewingSubmission.created_by)} • {viewingSubmission.date}</p>
        </div>
        <button
          on:click={closeSubmissionDetailsModal}
          class="text-white/70 hover:text-white transition-colors"
        >
          <XCircle class="w-6 h-6" />
        </button>
      </div>

      <!-- Modal Content -->
      <div class="space-y-6">
        <!-- Status Badge -->
        <div>
          <span class="px-3 py-1 rounded-full text-xs font-semibold {badge.class}">
            {badge.label}
          </span>
        </div>

        <!-- Time Details -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="p-4 bg-white/5 rounded-lg border border-white/10">
            <p class="text-white/60 text-sm mb-1">Date</p>
            <p class="text-white font-semibold">{viewingSubmission.date || 'N/A'}</p>
          </div>
          <div class="p-4 bg-white/5 rounded-lg border border-white/10">
            <p class="text-white/60 text-sm mb-1">Start Time</p>
            <p class="text-white font-semibold">{viewingSubmission.start_time || 'N/A'}</p>
          </div>
          <div class="p-4 bg-white/5 rounded-lg border border-white/10">
            <p class="text-white/60 text-sm mb-1">End Time</p>
            <p class="text-white font-semibold">{viewingSubmission.end_time || 'N/A'}</p>
          </div>
        </div>

        <!-- Hours Details -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 bg-blue-500/10 rounded-lg border border-blue-400/30">
            <p class="text-blue-300 text-sm mb-1">Claimed Hours</p>
            <p class="text-white font-bold text-2xl">{viewingSubmission.manually_inputted_hours?.toFixed(2) || '0.00'}h</p>
          </div>
          <div class="p-4 bg-green-500/10 rounded-lg border border-green-400/30">
            <p class="text-green-300 text-sm mb-1">Approved Hours</p>
            <p class="text-white font-bold text-2xl">{viewingSubmission.approved_hours?.toFixed(2) || '0.00'}h</p>
          </div>
        </div>

        <!-- Description -->
        {#if viewingSubmission.description}
          <div class="p-4 bg-white/5 rounded-lg border border-white/10">
            <p class="text-white/60 text-sm mb-2">Description</p>
            <p class="text-white">{viewingSubmission.description}</p>
          </div>
        {/if}

        <!-- Proof Type -->
        {#if viewingSubmission.proof_type}
          <div class="p-4 bg-white/5 rounded-lg border border-white/10">
            <p class="text-white/60 text-sm mb-2">Proof Type</p>
            <p class="text-white font-medium capitalize">{viewingSubmission.proof_type?.replace('_', ' ') || 'N/A'}</p>
          </div>
        {/if}

        <!-- Proof Files -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-white font-semibold">Proof Files</h3>
            {#if viewingSubmission.proof_files && viewingSubmission.proof_files.length > 0}
              <Button
                on:click={() => downloadAllSubmissionFiles(viewingSubmission)}
                class="bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-400/30 h-8 px-3 text-sm flex items-center rounded-md"
              >
                <Download class="w-3 h-3 mr-2" />
                Download All
              </Button>
            {/if}
          </div>
          {#if viewingSubmission.proof_files && viewingSubmission.proof_files.length > 0}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              {#each viewingSubmission.proof_files as file, index}
                <div class="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
                  <FileText class="w-5 h-5 text-blue-400" />
                  <div class="flex-1 min-w-0">
                    <p class="text-white text-sm font-medium">Proof File {index + 1}</p>
                  </div>
                  <div class="flex gap-1">
                    <button
                      on:click={() => downloadFile(file, `${viewingSubmission.created_by}-proof-${index + 1}.pdf`)}
                      class="p-2 bg-blue-500/20 rounded border border-blue-400/30 text-blue-300 hover:bg-blue-500/30 transition-colors"
                      title="Download"
                    >
                      <Download class="w-4 h-4" />
                    </button>
                    <a
                      href={file}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="p-2 bg-purple-500/20 rounded border border-purple-400/30 text-purple-300 hover:bg-purple-500/30 transition-colors"
                      title="View"
                    >
                      <Eye class="w-4 h-4" />
                    </a>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-white/60 text-sm">No proof files uploaded</p>
          {/if}
        </div>

        <!-- Mentor Comments -->
        {#if viewingSubmission.mentor_comments}
          <div class="p-4 bg-yellow-500/10 rounded-lg border border-yellow-400/30">
            <p class="text-yellow-300 text-sm mb-2">Mentor Comments</p>
            <p class="text-white">{viewingSubmission.mentor_comments}</p>
          </div>
        {/if}

        <!-- Break Times -->
        {#if viewingSubmission.break_start || viewingSubmission.break_end}
          <div class="p-4 bg-white/5 rounded-lg border border-white/10">
            <p class="text-white/60 text-sm mb-2">Break Times</p>
            <div class="flex gap-4">
              <div>
                <span class="text-white/70 text-xs">Break Start:</span>
                <span class="text-white ml-2">{viewingSubmission.break_start || 'N/A'}</span>
              </div>
              <div>
                <span class="text-white/70 text-xs">Break End:</span>
                <span class="text-white ml-2">{viewingSubmission.break_end || 'N/A'}</span>
              </div>
            </div>
          </div>
        {/if}

        <!-- Metadata -->
        <div class="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
          <div>
            <p class="text-white/60 text-xs mb-1">Created At</p>
            <p class="text-white text-sm">{viewingSubmission.created_at || 'N/A'}</p>
          </div>
          <div>
            <p class="text-white/60 text-xs mb-1">Updated At</p>
            <p class="text-white text-sm">{viewingSubmission.updated_at || 'N/A'}</p>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
        <Button
          on:click={closeSubmissionDetailsModal}
          class="bg-gray-600 hover:bg-gray-700 text-white h-10 px-6 rounded-md"
        >
          Close
        </Button>
        {#if viewingSubmission.status === 'draft'}
          <Button
            on:click={() => { rejectEntry(viewingSubmission.id); closeSubmissionDetailsModal(); }}
            class="bg-red-500 hover:bg-red-600 text-white h-10 px-6 rounded-md flex items-center"
          >
            <X class="w-4 h-4 mr-2" />
            Reject
          </Button>
          <Button
            on:click={() => { approveEntry(viewingSubmission.id); closeSubmissionDetailsModal(); }}
            class="bg-green-500 hover:bg-green-600 text-white h-10 px-6 rounded-md flex items-center"
          >
            <Check class="w-4 h-4 mr-2" />
            Approve
          </Button>
        {/if}
      </div>
    </div>
  </div>
{/if}
