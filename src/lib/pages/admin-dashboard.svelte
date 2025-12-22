<script>
  import { onMount } from 'svelte';
  import { User, Student, Task, TimeEntry, Project, Message, Contract, Vacancy } from '../../entities/all';
  import { ContractWorkflowService } from '../services/contractWorkflow.js';
  import { userStore } from '../../stores/userStore';
  import Button from '$lib/components/ui/button.svelte';
  import Input from '$lib/components/ui/input.svelte';
  import Dialog from '$lib/components/ui/dialog.svelte';
  import {
    Users, UserPlus, UserCog, Settings, Shield,
    FileText, TrendingUp, AlertTriangle, CheckCircle,
    Search, Edit2, Trash2, Mail, Clock, Calendar,
    BarChart3, PieChart, Activity, UserCheck,
    FolderOpen, GitBranch, MessageSquare, Send,
    GraduationCap, Download, Eye, XCircle, Filter, Check, X
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
  // Track which tenant/user scope we've loaded data for to avoid unnecessary reloads
  let _loadedForScope = null;

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

  // Unassigned candidates cache (falls back to unscoped fetch if company scoping hides students)
  let unassignedCandidates = null;

  async function openAssignModal() {
    // Prepare unassigned student candidates before showing modal
    try {
      if (allStudents && allStudents.length > 0) {
        unassignedCandidates = allStudents.filter(s => !s.mentor_email || s.mentor_email === '');
      } else {
        // If no students were loaded (company scoping might have filtered them), fetch without scope
        const all = await Student.list();
        unassignedCandidates = all.filter(s => !s.mentor_email || s.mentor_email === '');
      }
    } catch (e) {
      console.error('[Admin] Failed to prepare unassigned students:', e);
      unassignedCandidates = [];
    }
    showAssignModal = true;
  }

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

  // Admin messaging state
  let adminMessages = [];
  let adminReports = [];
  let selectedReport = null;
  let showReplyDialog = false;
  let replyContent = '';

  // Vacancies (backend-backed). Keep UI state here.
  let vacancies = [];
  let showVacancyForm = false;
  let newVacancy = {
    id: null,
    title: '',
    description: '',
    location: '',
    type: 'Full-Time',
    remote: false,
    posted_by: user?.email || '',
    status: 'open',
    created_at: null
  };

  async function loadVacancies() {
    try {
      // Try to load from backend (scoped to company via server)
      const list = await Vacancy.list();
      vacancies = Array.isArray(list) ? list : [];

      // Filter vacancies by company
      const currentCompanyKey = user?.companyKey || user?.company_key || user?.companyId || user?.company_id;
      if (currentCompanyKey) {
        vacancies = vacancies.filter(belongsToMyCompany);
      }
    } catch (e) {
      console.warn('[Admin Dashboard] Failed to load vacancies from API, falling back to localStorage:', e);
      try {
        const raw = localStorage.getItem('admin_vacancies');
        vacancies = raw ? JSON.parse(raw) : [];

        // Filter local vacancies by company too
        const currentCompanyKey = user?.companyKey || user?.company_key || user?.companyId || user?.company_id;
        if (currentCompanyKey) {
          vacancies = vacancies.filter(belongsToMyCompany);
        }
      } catch (err) {
        console.warn('[Admin Dashboard] Failed to parse local vacancies:', err);
        vacancies = [];
      }
    }
  }

  async function createVacancy() {
    if (!newVacancy.title.trim()) {
      alert('Please enter a job title');
      return;
    }

    // Include company key for data isolation
    const currentCompanyKey = user?.companyKey || user?.company_key || user?.companyId || user?.company_id;
    const payload = {
      title: newVacancy.title,
      description: newVacancy.description,
      location: newVacancy.location,
      type: newVacancy.type,
      remote: newVacancy.remote,
      companyKey: currentCompanyKey
    };

    try {
      const created = await Vacancy.create(payload);
      // API returns created object with id and timestamps
      vacancies = [created, ...vacancies];
      newVacancy = { id: null, title: '', description: '', location: '', type: 'Full-Time', remote: false, posted_by: user?.email || '', status: 'open', created_at: null };
      showVacancyForm = false;
      alert('Vacancy posted successfully');
    } catch (e) {
      console.error('[Admin Dashboard] Failed to create vacancy via API, saving locally as fallback:', e);
      // Fallback to localStorage persistence
      try {
        const vacancy = { ...payload, id: `vac_${Date.now()}`, posted_by: user?.email || '', created_at: new Date().toISOString() };
        vacancies = [vacancy, ...vacancies];
        localStorage.setItem('admin_vacancies', JSON.stringify(vacancies));
        newVacancy = { id: null, title: '', description: '', location: '', type: 'Full-Time', remote: false, posted_by: user?.email || '', status: 'open', created_at: null };
        showVacancyForm = false;
        alert('Vacancy saved locally (offline mode)');
      } catch (err) {
        console.error('[Admin Dashboard] Fallback local save failed:', err);
        alert('Failed to post vacancy');
      }
    }
  }

  async function deleteVacancy(id) {
    if (!confirm('Delete this vacancy?')) return;
    try {
      // If id looks numeric, attempt API delete
      if (typeof id === 'number' || String(id).match(/^\d+$/)) {
        await Vacancy.delete(id);
        vacancies = vacancies.filter(v => String(v.id) !== String(id));
      } else {
        // Local fallback entry (non-numeric id)
        vacancies = vacancies.filter(v => v.id !== id);
        localStorage.setItem('admin_vacancies', JSON.stringify(vacancies));
      }
    } catch (e) {
      console.error('[Admin Dashboard] Failed to delete vacancy via API, removing locally:', e);
      vacancies = vacancies.filter(v => String(v.id) !== String(id));
      try { localStorage.setItem('admin_vacancies', JSON.stringify(vacancies)); } catch (err) {}
    }
  }

  // Contract workflow state
  let allContracts = [];
  let selectedContract = null;
  let showContractReviewDialog = false;
  let contractReviewForm = {
    approved: true,
    feedback: ''
  };

  onMount(async () => {
    const scopeKey = user?.companyKey || user?.company_key || user?.companyId || user?.company_id || user?.email || null;
    if (scopeKey && _loadedForScope !== scopeKey) {
      await loadData();
    } else {
      // If no user yet, still call loadData to populate public info
      if (!scopeKey) await loadData();
    }
  });

  // Reactive: reload when the admin's company key or user email changes
  $: {
    const scopeKey = user?.companyKey || user?.company_key || user?.companyId || user?.company_id || user?.email || null;
    if (scopeKey && scopeKey !== _loadedForScope) {
      // don't await in reactive block
      loadData();
    }
  }

  // Helper function to check if entity belongs to current admin's company
  function belongsToMyCompany(entity) {
    if (!user) return false;

    // Get both numeric ID and string key from user
    const myCompanyId = user.company_id || user.companyId;
    const myCompanyKey = user.companyKey || user.company_key;

    // Get both numeric ID and string key from entity
    const entityCompanyId = entity.company_id || entity.companyId;
    const entityCompanyKey = entity.companyKey || entity.company_key;

    // If user has no company identifiers, show all (backward compatibility)
    if (!myCompanyId && !myCompanyKey) return true;

    // Match on numeric ID if both have it
    if (myCompanyId && entityCompanyId) {
      if (String(myCompanyId) === String(entityCompanyId)) return true;
    }

    // Match on string key if both have it
    if (myCompanyKey && entityCompanyKey) {
      if (String(myCompanyKey) === String(entityCompanyKey)) return true;
    }

    return false;
  }

  async function loadData(force = false) {
    // Determine the current load scope (companyKey preferred)
    const scopeKey = user?.companyKey || user?.company_key || user?.companyId || user?.company_id || user?.email || null;

    if (!force && scopeKey && _loadedForScope === scopeKey) {
      console.log('[Admin Dashboard] Skipping loadData — already loaded for scope', scopeKey);
      return;
    }

    isLoading = true;
    try {
      // If current user is an admin and has a company key, request users scoped to that company
      const currentCompanyKey = user?.companyKey || user?.company_key || user?.companyId || user?.company_id;
      const companyFilter = currentCompanyKey ? { companyKey: currentCompanyKey } : {};

      if (user && user.role === 'admin' && currentCompanyKey) {
        try {
          allUsers = await User.list(companyFilter);
        } catch (e) {
          console.warn('[Admin Dashboard] Server-side company scoping failed, falling back to full user list', e);
          allUsers = await User.list();
        }
      } else {
        allUsers = await User.list();
      }

      // Apply company filtering to all entities for company isolation
      allStudents = currentCompanyKey ? await Student.list(companyFilter) : await Student.list();
      allMentors = allUsers.filter(u => u.role === 'mentor');
      allTasks = currentCompanyKey ? await Task.list(companyFilter) : await Task.list();
      allTimeEntries = currentCompanyKey ? await TimeEntry.list(companyFilter) : await TimeEntry.list();
      allProjects = currentCompanyKey ? await Project.list(companyFilter) : await Project.list();
      allContracts = currentCompanyKey ? await Contract.list(companyFilter) : await Contract.list();

      // CLIENT-SIDE FILTERING: Ensure only company data is shown (backend may not filter)
      if (currentCompanyKey) {
        console.log('[Admin Dashboard] Applying client-side company filtering for:', currentCompanyKey);

        const beforeFilter = {
          users: allUsers.length,
          students: allStudents.length,
          tasks: allTasks.length,
          timeEntries: allTimeEntries.length,
          projects: allProjects.length,
          contracts: allContracts.length
        };

        allUsers = allUsers.filter(belongsToMyCompany);
        allStudents = allStudents.filter(belongsToMyCompany);
        allTasks = allTasks.filter(belongsToMyCompany);
        allTimeEntries = allTimeEntries.filter(belongsToMyCompany);
        allProjects = allProjects.filter(belongsToMyCompany);

        // Enhanced contract filtering: check contract's company OR student's company
        allContracts = allContracts.filter(contract => {
          // First check if contract has company key directly
          if (belongsToMyCompany(contract)) {
            console.log('[Contract Filter] Contract belongs to company (direct):', contract.id || contract.student_name);
            return true;
          }

          // If not, check if the student email in the contract belongs to our company students
          if (contract.student_email) {
            const student = allStudents.find(s => s.student_email === contract.student_email || s.email === contract.student_email);
            if (student && belongsToMyCompany(student)) {
              console.log('[Contract Filter] Contract belongs to company (via student):', contract.id || contract.student_name, 'student:', contract.student_email);
              return true;
            }
          }

          // Check if created_by (user who created contract) belongs to our company
          if (contract.created_by) {
            const creator = allUsers.find(u => u.email === contract.created_by);
            if (creator && belongsToMyCompany(creator)) {
              console.log('[Contract Filter] Contract belongs to company (via creator):', contract.id || contract.student_name, 'creator:', contract.created_by);
              return true;
            }
          }

          console.log('[Contract Filter] Contract EXCLUDED:', contract.id || contract.student_name, 'student:', contract.student_email, 'company:', contract.companyKey || contract.company_key);
          return false;
        });

        allMentors = allUsers.filter(u => u.role === 'mentor');

        console.log('[Admin Dashboard] Filtered results:', {
          before: beforeFilter,
          after: {
            users: allUsers.length,
            students: allStudents.length,
            tasks: allTasks.length,
            timeEntries: allTimeEntries.length,
            projects: allProjects.length,
            contracts: allContracts.length
          }
        });
      }

      // Load admin messages and reports
      await loadAdminMessages();

      // Sync student records for registered users who don't have student records
      await syncStudentRecords();

      // Reload students after sync with company filtering
      allStudents = currentCompanyKey ? await Student.list(companyFilter) : await Student.list();

      // Apply client-side filtering again after sync
      if (currentCompanyKey) {
        allStudents = allStudents.filter(belongsToMyCompany);
      }

      // Calculate stats
      stats.totalUsers = allUsers.length;
      stats.totalStudents = allStudents.length;
      stats.totalMentors = allMentors.length;
      stats.totalProjects = allProjects.length;
      stats.pendingApprovals = allTimeEntries.filter(e => e.status === 'draft').length;
      stats.activeInterns = allStudents.filter(s => s.contract_hours > 0).length;

      console.log('[Admin Dashboard] Data loaded:', {
        stats,
        studentsCount: allStudents.length,
        mentorsCount: allMentors.length,
        studentsData: allStudents,
        reportsCount: adminReports.length,
        contractsCount: allContracts.length
      });
      // Mark this scope as loaded so we don't reload unnecessarily on tab navigation
      if (scopeKey) _loadedForScope = scopeKey;
    } catch (error) {
      console.error('[Admin Dashboard] Error loading data:', error);
    }
    isLoading = false;
    // Load persisted vacancies after data load
    try { loadVacancies(); } catch (e) {}
  }

  async function loadAdminMessages() {
    try {
      adminMessages = await Message.getAdminMessages();
      adminReports = await Message.getAdminReports();

      console.log('[Admin Dashboard] Raw admin messages before filter:', adminMessages.length);
      console.log('[Admin Dashboard] Raw admin reports before filter:', adminReports.length);
      console.log('[Admin Dashboard] All raw reports:', adminReports);

      // Filter messages and reports by company
      const currentCompanyKey = user?.companyKey || user?.company_key || user?.companyId || user?.company_id;
      console.log('[Admin Dashboard] Current company key for filtering:', currentCompanyKey);
      console.log('[Admin Dashboard] User object:', user);

      if (currentCompanyKey) {
        console.log('[Admin Dashboard] Filtering messages and reports by company...');
        // For messages: include if belongs to company OR is to/from current user
        adminMessages = adminMessages.filter((msg, idx) => {
          const belongs = belongsToMyCompany(msg);
          const isDirectMessage = msg.to_email === user?.email || msg.from_email === user?.email;
          if (!belongs && !isDirectMessage && idx < 5) {
            console.log('[Admin Dashboard] Message filtered out:', msg, 'company_id:', msg.company_id || msg.companyId, 'companyKey:', msg.companyKey || msg.company_key);
          }
          return belongs || isDirectMessage;
        });
        // For reports: include if belongs to company OR is to/from current user
        adminReports = adminReports.filter((report, idx) => {
          const belongs = belongsToMyCompany(report);
          const isDirectReport = report.to_email === user?.email || report.from_email === user?.email;
          if (!belongs && !isDirectReport) {
            console.log('[Admin Dashboard] Report filtered out:', report, 'company_id:', report.company_id || report.companyId, 'companyKey:', report.companyKey || report.company_key);
          }
          return belongs || isDirectReport;
        });
      }

      console.log('[Admin Dashboard] Loaded admin messages:', adminMessages.length);
      console.log('[Admin Dashboard] Loaded admin reports:', adminReports.length);
      console.log('[Admin Dashboard] Current user email:', user?.email);
      console.log('[Admin Dashboard] Admin messages:', adminMessages);
      console.log('[Admin Dashboard] Admin reports:', adminReports);
    } catch (error) {
      console.error('[Admin Dashboard] Error loading admin messages:', error);
    }
  }

  // Dynamic disputes/issues builder
  $: allDisputes = (() => {
    const fromReports = (adminReports || []).filter(r => r && (r.type === 'dispute' || r.category === 'dispute' || /disput/i.test(r.subject || r.title || ''))).map(r => ({
      id: r.id,
      title: r.title || r.subject || r.type || 'Report',
      priority: r.priority || 'Medium',
      student: r.student_email || r.from_email || r.reported_by || '',
      mentor: r.mentor_email || r.to_email || '',
      description: (r.body || r.content || r.message || '')
    }));

    const fromTime = (allTimeEntries || []).filter(e => e && (e.status === 'dispute' || e.status === 'rejected' || e.flagged === true)).map(e => ({
      id: `time_${e.id}`,
      title: 'Hour Approval Dispute',
      priority: e.status === 'rejected' ? 'High' : 'Medium',
      student: e.student_email || e.user_email || '',
      mentor: e.mentor_email || '',
      description: `${e.hours || 0}h on ${e.date || e.created_at || ''} - ${e.notes || e.reason || ''}`
    }));

    // Avoid duplicates by id
    const combined = [...fromReports, ...fromTime];
    const seen = new Set();
    return combined.filter(d => {
      if (!d || !d.id) return false;
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
  })();

  async function replyToReport(report) {
    selectedReport = report;
    showReplyDialog = true;
  }

  async function sendReportReply() {
    try {
      if (!replyContent.trim()) {
        alert('Please enter a reply message');
        return;
      }

      await Message.replyToReport(selectedReport.id, replyContent);
      alert('Reply sent successfully!');
      showReplyDialog = false;
      replyContent = '';
      selectedReport = null;
      await loadAdminMessages();
    } catch (error) {
      console.error('[Admin Dashboard] Error sending reply:', error);
      alert('Failed to send reply. Please try again.');
    }
  }

  function formatReportData(reportDataJson) {
    try {
      return JSON.parse(reportDataJson || '{}');
    } catch (error) {
      return {};
    }
  }

  // Contract workflow functions
  async function reviewContract(contract) {
    selectedContract = contract;
    contractReviewForm.approved = true;
    contractReviewForm.feedback = '';
    showContractReviewDialog = true;
  }

  async function submitContractReview() {
    try {
      if (!contractReviewForm.approved && !contractReviewForm.feedback.trim()) {
        alert('Please provide feedback for rejection');
        return;
      }

      await Contract.adminReview(
        selectedContract.id, 
        contractReviewForm.approved, 
        contractReviewForm.feedback
      );

      // Send notifications via workflow service
      await ContractWorkflowService.notifyMentorOfAdminDecision(
        selectedContract,
        user?.email,
        contractReviewForm.approved,
        contractReviewForm.feedback
      );

      if (contractReviewForm.approved) {
        await ContractWorkflowService.notifyStudentOfFinalDecision(
          selectedContract,
          true,
          selectedContract.mentor_email,
          null
        );
      } else {
        await ContractWorkflowService.notifyStudentOfFinalDecision(
          selectedContract,
          false,
          selectedContract.mentor_email,
          contractReviewForm.feedback
        );
      }

      alert(`Contract ${contractReviewForm.approved ? 'approved' : 'rejected'} successfully!`);
      showContractReviewDialog = false;
      selectedContract = null;
      await loadData();
    } catch (error) {
      console.error('[Admin Dashboard] Error reviewing contract:', error);
      alert('Failed to review contract. Please try again.');
    }
  }

  function getContractStatusColor(status) {
    const colorMap = {
      'draft': 'text-gray-400',
      'student_signed': 'text-yellow-400',
      'mentor_reviewing': 'text-blue-400',
      'admin_reviewing': 'text-purple-400',
      'admin_approved': 'text-green-400',
      'admin_rejected': 'text-red-400'
    };
    return colorMap[status] || 'text-gray-400';
  }

  async function syncStudentRecords() {
    try {
      // Find users with role 'student' who don't have student records
      const studentUsers = allUsers.filter(u => u.role === 'student');
      const existingStudentEmails = allStudents.map(s => s.student_email || s.email);

      for (const studentUser of studentUsers) {
        if (!existingStudentEmails.includes(studentUser.email)) {
          console.log('[Admin Dashboard] Creating student record for:', studentUser.email);
          try {
            await Student.create({
              student_email: studentUser.email,
              full_name: studentUser.full_name,
              company_id: studentUser.company_id,
              companyKey: studentUser.companyKey || studentUser.company_key || studentUser.companyId || studentUser.company_id,
              status: 'active'
            });
          } catch (error) {
            console.log('[Admin Dashboard] Failed to create student record for', studentUser.email, ':', error.message);
          }
        }
      }
    } catch (error) {
      console.error('[Admin Dashboard] Error syncing student records:', error);
    }
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
      // Try to find student in the current allStudents list first, then fallback to unassignedCandidates
      let student = allStudents.find(s => s.id === assignmentData.studentId);
      if (!student && unassignedCandidates) {
        student = unassignedCandidates.find(s => s.id === assignmentData.studentId);
      }
      if (!student) return;

      await Student.update(student.id, {
        mentor_email: assignmentData.mentorEmail
      });

      alert('Student assigned to mentor successfully!');
      showAssignModal = false;
      assignmentData = { studentId: null, mentorEmail: '' };
      // Clear cached candidates so next open will re-query scoped/unscoped lists
      unassignedCandidates = null;
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

  // Projects filter state and helpers (make programs/projects UI dynamic)
  let projectFilter = 'all'; // 'all' | 'program' | 'project'
  $: filteredProjects = allProjects.filter(p => projectFilter === 'all' ? true : p.type === projectFilter);
  $: totalProgramsCount = allProjects.filter(p => p.type === 'program').length;
  $: totalProjectsCount = allProjects.filter(p => p.type === 'project').length;

  function getAssignedCount(project) {
    // Projects may store assigned students in `assigned_students` array
    if (!project) return 0;
    if (Array.isArray(project.assigned_students)) return project.assigned_students.length;
    // fallback: count students that reference this project id (if stored on student)
    return allStudents.filter(s => s.project_id === project.id || (s.assigned_projects && s.assigned_projects.includes(project.id))).length;
  }

  function getUnassignedStudents() {
    return allStudents.filter(s => !s.mentor_email || s.mentor_email === '');
  }

  // Contract management functions
  async function approveContract(contractId, adminNotes = '') {
    try {
      console.log('[Admin] Approving contract:', contractId);

      // Update contract status directly using Contract entity
      await Contract.update(contractId, {
        status: 'admin_approved',
        admin_feedback: adminNotes,
        admin_reviewed_at: new Date().toISOString()
      });

      // Get the updated contract for messaging (filter by company for security)
      let contracts = await Contract.list();
      const currentCompanyKey = user?.companyKey || user?.company_key || user?.companyId || user?.company_id;
      if (currentCompanyKey) {
        contracts = contracts.filter(c => belongsToMyCompany(c) ||
          allStudents.some(s => (s.student_email === c.student_email || s.email === c.student_email)));
      }
      const contract = contracts.find(c => c.id === contractId);

      console.log('[Admin] Contract after update:', contract);

      if (contract) {
        // Verify mentor email exists
        if (!contract.mentor_email) {
          console.error('[Admin] Contract has no mentor email!', contract);
          alert('Warning: Contract has no mentor assigned. Message cannot be sent.');
        } else {
          console.log('[Admin] Sending notification to mentor:', contract.mentor_email);
          // Send notification to mentor only - mentor will notify student
          await ContractWorkflowService.notifyMentorOfAdminDecision(contract, user.email, true, adminNotes);
          console.log('[Admin] Notification sent successfully to:', contract.mentor_email);
        }
      } else {
        console.error('[Admin] Contract not found after update!');
      }

      alert('Contract approved successfully! Mentor has been notified and will inform the student.');
      await loadData();
    } catch (error) {
      console.error('[Admin] Error approving contract:', error);
      alert('Failed to approve contract: ' + error.message);
    }
  }

  async function rejectContract(contractId, adminNotes = '') {
    const reason = adminNotes || prompt('Please provide a reason for rejecting this contract:');
    if (!reason) return;

    try {
      // Update contract status directly using Contract entity
      await Contract.update(contractId, {
        status: 'admin_rejected',
        admin_feedback: reason,
        admin_reviewed_at: new Date().toISOString()
      });

      // Get the updated contract for messaging (filter by company for security)
      let contracts = await Contract.list();
      const currentCompanyKey = user?.companyKey || user?.company_key || user?.companyId || user?.company_id;
      if (currentCompanyKey) {
        contracts = contracts.filter(c => belongsToMyCompany(c) ||
          allStudents.some(s => (s.student_email === c.student_email || s.email === c.student_email)));
      }
      const contract = contracts.find(c => c.id === contractId);
      
      if (contract) {
        // Send notification to mentor only - mentor will notify student
        await ContractWorkflowService.notifyMentorOfAdminDecision(contract, user.email, false, reason);
      }
      
      alert('Contract rejected. Mentor has been notified and will inform the student with feedback.');
      await loadData();
    } catch (error) {
      console.error('Error rejecting contract:', error);
      alert('Failed to reject contract: ' + error.message);
    }
  }

  // Dispute actions
  function reviewDispute(dispute) {
    // Basic handler - open modal or mark as in-progress
    alert(`Open dispute review for: ${dispute.title}`);
  }

  function viewDisputeDetails(dispute) {
    alert(`Dispute details:\nTitle: ${dispute.title}\nStudent: ${dispute.student}\nDescription: ${dispute.description}`);
  }

  function viewContractDetails(contract) {
    // Display contract details with proper field names
    const contractName = contract.student_name || contract.title || `Contract #${contract.id}`;
    const details = `
Contract Details:
Name: ${contractName}
Student: ${contract.student_email || 'Not provided'}
Mentor: ${contract.mentor_email || 'Not assigned'}  
Hours: ${contract.contract_hours || 0}
Work Area: ${contract.work_area || contract.company_name || 'Not specified'}
Status: ${contract.status}
    `;
    alert(details);
  }

  // Only show users that belong to the same company as the current admin (when logged-in user is admin)
  $: visibleAllUsers = (() => {
    if (!user) return allUsers;
    // if current user is admin, restrict to same companyKey; otherwise show all
    if (user.role === 'admin' && user.companyKey) {
      return allUsers.filter(u => {
        // support multiple possible field names from backend
        const companyKey = u.companyKey || u.company_key || u.company_id || u.companyId;
        const adminKey = user.companyKey || user.company_key || user.company_id || user.companyId;
        return companyKey && adminKey && String(companyKey) === String(adminKey);
      });
    }
    return allUsers;
  })();

  // Derive mentors from visible users so assignments/dispatch only show same-company mentors
  $: allMentors = visibleAllUsers.filter(u => u.role === 'mentor');

  // Filtered users respect company visibility and search query
  $: filteredUsers = visibleAllUsers.filter(u =>
    (u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Dynamic Reports & Analytics calculations
  $: totalApprovedHours = allTimeEntries
    .filter(e => e.status === 'approved')
    .reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0);

  $: averageCompletionRate = (() => {
    if (!allStudents || allStudents.length === 0) return 0;
    const activeStudents = allStudents.filter(s => s.contract_hours > 0);
    if (activeStudents.length === 0) return 0;

    const totalCompletion = activeStudents.reduce((sum, student) => {
      const studentHours = allTimeEntries
        .filter(e => e.student_email === student.student_email && e.status === 'approved')
        .reduce((total, e) => total + (parseFloat(e.hours) || 0), 0);
      const contractHours = parseFloat(student.contract_hours) || 0;
      return sum + (contractHours > 0 ? (studentHours / contractHours) * 100 : 0);
    }, 0);

    return Math.round(totalCompletion / activeStudents.length);
  })();

  $: weeklyActivityData = (() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentEntries = allTimeEntries.filter(e => {
      const entryDate = new Date(e.created_at || e.date);
      return entryDate >= oneWeekAgo;
    });

    return {
      totalHours: recentEntries.reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0),
      totalEntries: recentEntries.length,
      approvedEntries: recentEntries.filter(e => e.status === 'approved').length,
      pendingEntries: recentEntries.filter(e => e.status === 'draft' || e.status === 'pending').length,
      activeStudents: new Set(recentEntries.map(e => e.student_email)).size
    };
  })();

  $: monthlyPerformanceData = (() => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const recentEntries = allTimeEntries.filter(e => {
      const entryDate = new Date(e.created_at || e.date);
      return entryDate >= oneMonthAgo;
    });

    const studentPerformance = allStudents.map(student => {
      const studentEntries = recentEntries.filter(e => e.student_email === student.student_email);
      const totalHours = studentEntries.reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0);
      const approvedHours = studentEntries
        .filter(e => e.status === 'approved')
        .reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0);

      return {
        name: student.full_name,
        email: student.student_email,
        totalHours,
        approvedHours,
        entriesCount: studentEntries.length
      };
    }).filter(s => s.totalHours > 0);

    return {
      topPerformers: studentPerformance.sort((a, b) => b.approvedHours - a.approvedHours).slice(0, 5),
      totalHours: recentEntries.reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0),
      averageHoursPerStudent: studentPerformance.length > 0
        ? Math.round(recentEntries.reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0) / studentPerformance.length)
        : 0
    };
  })();

  $: mentorEvaluationData = (() => {
    return allMentors.map(mentor => {
      const assignedStudents = allStudents.filter(s => s.mentor_email === mentor.email);
      const studentEmails = assignedStudents.map(s => s.student_email);
      const mentorTimeEntries = allTimeEntries.filter(e => studentEmails.includes(e.student_email));

      const totalHours = mentorTimeEntries.reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0);
      const approvedHours = mentorTimeEntries
        .filter(e => e.status === 'approved')
        .reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0);
      const pendingCount = mentorTimeEntries.filter(e => e.status === 'draft' || e.status === 'pending').length;

      return {
        name: mentor.full_name || mentor.email,
        email: mentor.email,
        studentsCount: assignedStudents.length,
        totalHours,
        approvedHours,
        pendingCount,
        responseRate: mentorTimeEntries.length > 0
          ? Math.round((approvedHours / totalHours) * 100)
          : 0
      };
    }).filter(m => m.studentsCount > 0);
  })();

  // State for expanded report views
  let expandedReport = null;

  // Submissions state
  let viewingSubmission = null;
  let showSubmissionDetailsModal = false;
  let submissionStatusFilter = 'all'; // 'all', 'submitted', 'approved', 'rejected'

  $: filteredSubmissions = allTimeEntries.filter(entry => {
    if (submissionStatusFilter === 'all') return true;
    return entry.status === submissionStatusFilter;
  });

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

  async function approveSubmission(submission) {
    try {
      await TimeEntry.update(submission.id, { status: 'approved' });
      alert('Submission approved successfully!');
      await loadData();
      closeSubmissionDetailsModal();
    } catch (error) {
      console.error('Error approving submission:', error);
      alert('Failed to approve submission');
    }
  }

  async function rejectSubmission(submission) {
    try {
      await TimeEntry.update(submission.id, { status: 'rejected', approved_hours: 0 });
      alert('Submission rejected');
      await loadData();
      closeSubmissionDetailsModal();
    } catch (error) {
      console.error('Error rejecting submission:', error);
      alert('Failed to reject submission');
    }
  }

  function getSubmissionStatusBadge(status) {
    const configs = {
      draft: 'bg-gray-500/20 text-gray-300 border border-gray-400/30',
      submitted: 'bg-amber-500/20 text-amber-300 border border-amber-400/30',
      approved: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30',
      rejected: 'bg-red-500/20 text-red-300 border border-red-400/30'
    };
    const labels = {
      draft: 'Draft',
      submitted: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected'
    };
    return { class: configs[status] || configs.draft, label: labels[status] || status };
  }
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
        <span class="text-3xl font-bold text-white">{allContracts.filter(c => c.status === 'pending_approval').length}</span>
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
  <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 mt-8 relative">
    <!-- (Vacancies aside removed) -->

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
            on:click={openAssignModal}
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

      <!-- Program / Project Filters -->
      <div class="flex items-center gap-3 mb-6">
        <div class="flex gap-2">
          <Button
            on:click={() => projectFilter = 'all'}
            variant={projectFilter === 'all' ? 'solid' : 'ghost'}
            class="text-white/80"
          >
            All ({allProjects.length})
          </Button>
          <Button
            on:click={() => projectFilter = 'program'}
            variant={projectFilter === 'program' ? 'solid' : 'ghost'}
            class="text-white/80"
          >
            Programs ({totalProgramsCount})
          </Button>
          <Button
            on:click={() => projectFilter = 'project'}
            variant={projectFilter === 'project' ? 'solid' : 'ghost'}
            class="text-white/80"
          >
            Projects ({totalProjectsCount})
          </Button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div class="bg-white/5 rounded-xl border border-white/20 p-6">
          <GitBranch class="w-8 h-8 text-blue-400 mb-3" />
          <h3 class="text-white font-bold text-lg mb-2">Total Items</h3>
          <p class="text-3xl font-bold text-white">{allProjects.length}</p>
          <p class="text-white/50 text-sm mt-2">Programs: {totalProgramsCount} · Projects: {totalProjectsCount}</p>
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
            {#each filteredProjects as project}
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
                    <span class="px-3 py-1 rounded-full text-xs bg-white/5 text-white/70">{getAssignedCount(project)} assigned</span>
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
        <h2 class="text-2xl font-bold text-white">Report & Analytics</h2>
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
          <p class="text-3xl font-bold text-white">{totalApprovedHours.toLocaleString()}h</p>
          <p class="text-white/50 text-xs mt-2">
            {allTimeEntries.filter(e => e.status === 'approved').length} approved entries
          </p>
        </div>

        <div class="bg-white/5 rounded-xl border border-white/20 p-6">
          <PieChart class="w-8 h-8 text-purple-400 mb-3" />
          <h3 class="text-white font-bold text-lg mb-2">Completion Rate</h3>
          <p class="text-white/70 text-sm mb-4">Average across all active interns</p>
          <p class="text-3xl font-bold text-white">{averageCompletionRate}%</p>
          <p class="text-white/50 text-xs mt-2">
            Based on {allStudents.filter(s => s.contract_hours > 0).length} active interns
          </p>
        </div>
      </div>

      <!-- Messages from Mentors Section -->
      <div class="bg-white/5 rounded-xl border border-white/20 p-6 mb-6">
        <h3 class="text-white font-bold mb-4 flex items-center gap-2">
          <Mail class="w-5 h-5" />
          Messages ({adminMessages.filter(m => m.message_type !== 'report').length})
        </h3>
        {#if adminMessages.filter(m => m.message_type !== 'report').length > 0}
          <div class="space-y-3 max-h-96 overflow-y-auto">
            {#each adminMessages.filter(m => m.message_type !== 'report') as message}
              <div class="p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all">
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <h4 class="text-white font-semibold">{message.subject}</h4>
                    <p class="text-white/60 text-sm">
                      From: {message.from_email} ({message.from_role}) •
                      {new Date(message.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div class="flex gap-2">
                    {#if !message.is_read}
                      <span class="bg-blue-500 text-white text-xs px-2 py-1 rounded">New</span>
                    {/if}
                  </div>
                </div>
                <p class="text-white/70 text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-white/60 text-center py-8">No messages received yet.</p>
        {/if}
      </div>

      <!-- Mentor Reports Section -->
      <div class="bg-white/5 rounded-xl border border-white/20 p-6 mb-6">
        <h3 class="text-white font-bold mb-4 flex items-center gap-2">
          <MessageSquare class="w-5 h-5" />
          Mentor Reports ({adminReports.length})
        </h3>
        {#if adminReports.length > 0}
          <div class="space-y-3 max-h-96 overflow-y-auto">
            {#each adminReports as report}
              {@const reportData = formatReportData(report.report_data)}
              <div class="p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all">
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <h4 class="text-white font-semibold">{report.subject}</h4>
                    <p class="text-white/60 text-sm">
                      From: {report.from_email} • 
                      Student: {reportData.student_name} • 
                      {new Date(report.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div class="flex gap-2">
                    {#if !report.is_read}
                      <span class="bg-blue-500 text-white text-xs px-2 py-1 rounded">New</span>
                    {/if}
                    <Button 
                      on:click={() => replyToReport(report)}
                      class="bg-green-600 hover:bg-green-700 text-white h-8 px-3 flex items-center gap-1"
                    >
                      <Send class="w-3 h-3" />
                      Reply
                    </Button>
                  </div>
                </div>
                <div class="bg-white/5 rounded p-3 mb-3">
                  <p class="text-white/80 text-sm font-medium">Report Type: {reportData.report_type?.toUpperCase()}</p>
                  <p class="text-white/80 text-sm">Period: {reportData.period_start} to {reportData.period_end}</p>
                </div>
                <p class="text-white/70 text-sm line-clamp-3">{report.content}</p>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-white/60 text-center py-8">No mentor reports received yet.</p>
        {/if}
      </div>

      <div class="bg-white/5 rounded-xl border border-white/20 p-6">
        <h3 class="text-white font-bold mb-4">System Reports</h3>
        <div class="space-y-3">
          <!-- Weekly Activity Report -->
          <div class="rounded-lg border border-white/10 overflow-hidden">
            <button
              on:click={() => expandedReport = expandedReport === 'weekly' ? null : 'weekly'}
              class="w-full text-left p-4 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-between"
            >
              <div>
                <h4 class="text-white font-semibold flex items-center gap-2">
                  <Activity class="w-4 h-4" />
                  Weekly Activity Report
                </h4>
                <p class="text-white/60 text-sm">Overview of user activity for the past 7 days</p>
              </div>
              <span class="text-white/70">{expandedReport === 'weekly' ? '▼' : '▶'}</span>
            </button>
            {#if expandedReport === 'weekly'}
              <div class="p-4 bg-white/5 border-t border-white/10">
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p class="text-white/60 text-xs">Total Hours Logged</p>
                    <p class="text-white font-bold text-xl">{weeklyActivityData.totalHours.toFixed(1)}h</p>
                  </div>
                  <div>
                    <p class="text-white/60 text-xs">Total Entries</p>
                    <p class="text-white font-bold text-xl">{weeklyActivityData.totalEntries}</p>
                  </div>
                  <div>
                    <p class="text-white/60 text-xs">Approved Entries</p>
                    <p class="text-green-400 font-bold text-xl">{weeklyActivityData.approvedEntries}</p>
                  </div>
                  <div>
                    <p class="text-white/60 text-xs">Pending Entries</p>
                    <p class="text-yellow-400 font-bold text-xl">{weeklyActivityData.pendingEntries}</p>
                  </div>
                  <div>
                    <p class="text-white/60 text-xs">Active Students</p>
                    <p class="text-blue-400 font-bold text-xl">{weeklyActivityData.activeStudents}</p>
                  </div>
                  <div>
                    <p class="text-white/60 text-xs">Avg Hours/Student</p>
                    <p class="text-purple-400 font-bold text-xl">
                      {weeklyActivityData.activeStudents > 0
                        ? (weeklyActivityData.totalHours / weeklyActivityData.activeStudents).toFixed(1)
                        : 0}h
                    </p>
                  </div>
                </div>
              </div>
            {/if}
          </div>

          <!-- Monthly Performance Report -->
          <div class="rounded-lg border border-white/10 overflow-hidden">
            <button
              on:click={() => expandedReport = expandedReport === 'monthly' ? null : 'monthly'}
              class="w-full text-left p-4 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-between"
            >
              <div>
                <h4 class="text-white font-semibold flex items-center gap-2">
                  <TrendingUp class="w-4 h-4" />
                  Monthly Performance Report
                </h4>
                <p class="text-white/60 text-sm">Detailed performance metrics for the past 30 days</p>
              </div>
              <span class="text-white/70">{expandedReport === 'monthly' ? '▼' : '▶'}</span>
            </button>
            {#if expandedReport === 'monthly'}
              <div class="p-4 bg-white/5 border-t border-white/10">
                <div class="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p class="text-white/60 text-xs">Total Hours (30 days)</p>
                    <p class="text-white font-bold text-xl">{monthlyPerformanceData.totalHours.toFixed(1)}h</p>
                  </div>
                  <div>
                    <p class="text-white/60 text-xs">Avg Hours/Student</p>
                    <p class="text-white font-bold text-xl">{monthlyPerformanceData.averageHoursPerStudent}h</p>
                  </div>
                </div>

                {#if monthlyPerformanceData.topPerformers.length > 0}
                  <h5 class="text-white/80 font-semibold text-sm mb-2">Top 5 Performers</h5>
                  <div class="space-y-2">
                    {#each monthlyPerformanceData.topPerformers as performer, index}
                      <div class="flex items-center justify-between p-2 bg-white/5 rounded border border-white/10">
                        <div class="flex items-center gap-2">
                          <span class="text-white/70 text-xs font-bold">#{index + 1}</span>
                          <div>
                            <p class="text-white text-sm font-medium">{performer.name}</p>
                            <p class="text-white/50 text-xs">{performer.email}</p>
                          </div>
                        </div>
                        <div class="text-right">
                          <p class="text-green-400 font-bold">{performer.approvedHours.toFixed(1)}h</p>
                          <p class="text-white/50 text-xs">{performer.entriesCount} entries</p>
                        </div>
                      </div>
                    {/each}
                  </div>
                {:else}
                  <p class="text-white/50 text-sm text-center py-4">No performance data available for the past month</p>
                {/if}
              </div>
            {/if}
          </div>

          <!-- Mentor Evaluation Report -->
          <div class="rounded-lg border border-white/10 overflow-hidden">
            <button
              on:click={() => expandedReport = expandedReport === 'mentor' ? null : 'mentor'}
              class="w-full text-left p-4 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-between"
            >
              <div>
                <h4 class="text-white font-semibold flex items-center gap-2">
                  <UserCheck class="w-4 h-4" />
                  Mentor Evaluation Report
                </h4>
                <p class="text-white/60 text-sm">Mentor performance and oversight metrics</p>
              </div>
              <span class="text-white/70">{expandedReport === 'mentor' ? '▼' : '▶'}</span>
            </button>
            {#if expandedReport === 'mentor'}
              <div class="p-4 bg-white/5 border-t border-white/10">
                {#if mentorEvaluationData.length > 0}
                  <div class="space-y-3">
                    {#each mentorEvaluationData as mentor}
                      <div class="p-3 bg-white/5 rounded border border-white/10">
                        <div class="flex items-start justify-between mb-2">
                          <div>
                            <p class="text-white font-semibold">{mentor.name}</p>
                            <p class="text-white/50 text-xs">{mentor.email}</p>
                          </div>
                          <span class="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">
                            {mentor.studentsCount} student{mentor.studentsCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div class="grid grid-cols-3 gap-3 mt-2">
                          <div>
                            <p class="text-white/60 text-xs">Total Hours</p>
                            <p class="text-white font-bold">{mentor.totalHours.toFixed(1)}h</p>
                          </div>
                          <div>
                            <p class="text-white/60 text-xs">Approved</p>
                            <p class="text-green-400 font-bold">{mentor.approvedHours.toFixed(1)}h</p>
                          </div>
                          <div>
                            <p class="text-white/60 text-xs">Pending</p>
                            <p class="text-yellow-400 font-bold">{mentor.pendingCount}</p>
                          </div>
                        </div>
                        <div class="mt-2 pt-2 border-t border-white/10">
                          <div class="flex items-center justify-between">
                            <span class="text-white/60 text-xs">Approval Rate</span>
                            <span class="text-white font-semibold">{mentor.responseRate}%</span>
                          </div>
                          <div class="w-full bg-white/10 rounded-full h-2 mt-1">
                            <div
                              class="bg-green-400 h-2 rounded-full transition-all"
                              style="width: {mentor.responseRate}%"
                            ></div>
                          </div>
                        </div>
                      </div>
                    {/each}
                  </div>
                {:else}
                  <p class="text-white/50 text-sm text-center py-4">No mentor evaluation data available</p>
                {/if}
              </div>
            {/if}
          </div>
        </div>
      </div>

    {:else if activeTab === 'submissions'}
      <!-- Work Submissions & Approvals -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-white">Work Submissions & Approvals</h2>
          <p class="text-white/70">Review and approve submitted work hours from interns</p>
        </div>
        <div class="flex gap-2">
          <select
            bind:value={submissionStatusFilter}
            class="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
          >
            <option value="all">All Submissions ({allTimeEntries.length})</option>
            <option value="submitted">Pending ({allTimeEntries.filter(e => e.status === 'submitted').length})</option>
            <option value="approved">Approved ({allTimeEntries.filter(e => e.status === 'approved').length})</option>
            <option value="rejected">Rejected ({allTimeEntries.filter(e => e.status === 'rejected').length})</option>
          </select>
        </div>
      </div>

      {#if filteredSubmissions.length === 0}
        <div class="text-center py-12 bg-white/5 rounded-xl border border-white/20">
          <FileText class="w-16 h-16 text-white/30 mx-auto mb-4" />
          <h3 class="text-xl font-semibold text-white mb-2">No Submissions Found</h3>
          <p class="text-white/60">No submissions match the current filter</p>
        </div>
      {:else}
        <div class="space-y-4">
          {#each filteredSubmissions as submission}
            {@const statusBadge = getSubmissionStatusBadge(submission.status)}
            <div class="bg-white/5 rounded-xl border border-white/20 p-6 hover:bg-white/10 transition-all">
              <div class="flex items-start justify-between mb-4">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-2">
                    <h3 class="text-xl font-bold text-white">{submission.created_by || 'Unknown User'}</h3>
                    <span class="px-3 py-1 rounded-full text-xs font-semibold {statusBadge.class}">
                      {statusBadge.label}
                    </span>
                  </div>
                  <p class="text-white/70 text-sm">Date: {submission.date || 'N/A'}</p>
                </div>
                <div class="flex gap-2">
                  <Button
                    on:click={() => viewSubmissionDetails(submission)}
                    class="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-400/30 h-9 px-4 flex items-center rounded-md"
                  >
                    <Eye class="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                  {#if submission.proof_files && submission.proof_files.length > 0}
                    <Button
                      on:click={() => downloadAllSubmissionFiles(submission)}
                      class="bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-400/30 h-9 px-4 flex items-center rounded-md"
                    >
                      <Download class="w-4 h-4 mr-2" />
                      Download ({submission.proof_files.length})
                    </Button>
                  {/if}
                </div>
              </div>

              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div class="p-3 bg-white/5 rounded-lg border border-white/10">
                  <p class="text-white/60 mb-1">Start Time</p>
                  <p class="text-white font-semibold">{submission.start_time || 'N/A'}</p>
                </div>
                <div class="p-3 bg-white/5 rounded-lg border border-white/10">
                  <p class="text-white/60 mb-1">End Time</p>
                  <p class="text-white font-semibold">{submission.end_time || 'N/A'}</p>
                </div>
                <div class="p-3 bg-blue-500/10 rounded-lg border border-blue-400/30">
                  <p class="text-blue-300 mb-1">Claimed Hours</p>
                  <p class="text-white font-bold">{submission.manually_inputted_hours?.toFixed(2) || '0.00'}h</p>
                </div>
                <div class="p-3 bg-green-500/10 rounded-lg border border-green-400/30">
                  <p class="text-green-300 mb-1">Approved Hours</p>
                  <p class="text-white font-bold">{submission.approved_hours?.toFixed(2) || '0.00'}h</p>
                </div>
              </div>

              {#if submission.description}
                <div class="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
                  <p class="text-white/60 text-xs mb-1">Description:</p>
                  <p class="text-white text-sm">{submission.description}</p>
                </div>
              {/if}

              {#if submission.status === 'submitted'}
                <div class="flex gap-2 mt-4">
                  <Button
                    on:click={() => rejectSubmission(submission)}
                    class="bg-red-500 hover:bg-red-600 text-white h-9 px-4 flex items-center rounded-md"
                  >
                    <X class="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    on:click={() => approveSubmission(submission)}
                    class="bg-green-500 hover:bg-green-600 text-white h-9 px-4 flex items-center rounded-md"
                  >
                    <Check class="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}

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
            <h3 class="text-yellow-400 font-semibold">{allDisputes.length} Open Disputes</h3>
            <p class="text-white/70 text-sm">Requiring immediate attention</p>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        {#if allDisputes.length === 0}
          <div class="text-center py-8">
            <AlertTriangle class="w-16 h-16 text-white/30 mx-auto mb-4" />
            <p class="text-white/70">No open disputes</p>
          </div>
        {:else}
          {#each allDisputes as dispute}
            <div class="bg-white/5 rounded-xl border border-white/20 p-6">
              <div class="flex items-start justify-between mb-3">
                <div>
                  <h3 class="text-white font-bold">{dispute.title}</h3>
                  <p class="text-white/60 text-sm mt-1">Student: {dispute.student || 'Unknown'}{dispute.mentor ? ` | Mentor: ${dispute.mentor}` : ''}</p>
                </div>
                <span class="px-3 py-1 rounded-full text-xs {dispute.priority === 'High' ? 'bg-red-500/20 text-red-400' : dispute.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}">{dispute.priority}</span>
              </div>
              <p class="text-white/70 text-sm mb-4">{dispute.description}</p>
              <div class="flex gap-2">
                <Button class="bg-green-500 hover:bg-green-600 text-white px-2 rounded-md" on:click={() => reviewDispute(dispute)}>Review & Resolve</Button>
                <Button variant="ghost" class="text-white/70 hover:text-white" on:click={() => viewDisputeDetails(dispute)}>View Details</Button>
              </div>
            </div>
          {/each}
        {/if}
      </div>

    {:else if activeTab === 'applications'}
      <!-- Applications & Contract Approvals -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-white">Applications & Contract Approvals</h2>
        <div class="flex gap-2">
          <span class="px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 font-semibold">
            {allContracts.filter(c => c.status === 'pending_approval').length} Pending Applications
          </span>
          <span class="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 font-semibold">
            {allContracts.filter(c => c.status === 'pending_approval').length} To Review
          </span>
          <span class="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 font-semibold">
            {allContracts.filter(c => c.status === 'admin_approved').length} Approved
          </span>
          <span class="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 font-semibold">
            {allContracts.filter(c => c.status === 'admin_rejected').length} Rejected
          </span>
        </div>
      </div>

      <!-- Contract Approvals Section -->
      {#if allContracts.filter(c => c.status === 'pending_approval').length > 0}
        <div class="mb-8">
          <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <FileText class="w-5 h-5 text-purple-400" />
            Contracts Awaiting Admin Approval
          </h3>
          <div class="space-y-4">
            {#each allContracts.filter(c => c.status === 'pending_approval') as contract}
              <div class="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                      <h4 class="text-white font-bold text-lg">{contract.student_name || contract.title || 'Contract'}</h4>
                      <span class="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400">
                        Contract - Pending Admin Approval
                      </span>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <p class="text-white/60">Student Email</p>
                        <p class="text-white font-medium">{contract.student_email || 'Not provided'}</p>
                      </div>
                      <div>
                        <p class="text-white/60">Mentor</p>
                        <p class="text-white font-medium">{contract.mentor_email || 'Not assigned'}</p>
                      </div>
                      <div>
                        <p class="text-white/60">Contract Hours</p>
                        <p class="text-white font-medium">{contract.contract_hours || 0}h</p>
                      </div>
                      <div>
                        <p class="text-white/60">Work Area</p>
                        <p class="text-white font-medium">{contract.work_area || contract.company_name || 'Not specified'}</p>
                      </div>
                    </div>
                    
                    <!-- Signature Status -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      {#if contract.student_signature}
                        <div class="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                          <p class="text-green-400 text-sm font-medium">✓ Student Signed: {contract.student_signature}</p>
                          <p class="text-white/60 text-xs">{contract.student_signed_date || 'Date not recorded'}</p>
                        </div>
                      {/if}
                      {#if contract.mentor_signature}
                        <div class="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                          <p class="text-blue-400 text-sm font-medium">✓ Mentor Approved: {contract.mentor_signature}</p>
                          <p class="text-white/60 text-xs">{contract.mentor_signed_date || 'Date not recorded'}</p>
                        </div>
                      {/if}
                    </div>
                  </div>
                </div>
                
                <!-- Admin Review Section -->
                <div class="border-t border-purple-500/30 pt-4">
                  <h5 class="text-purple-400 font-semibold mb-3 flex items-center gap-2">
                    <Shield class="w-4 h-4" />
                    Admin Review Required
                  </h5>
                  <div class="mb-4">
                    <label class="text-white/70 text-sm block mb-2">Admin Notes (Optional)</label>
                    <textarea
                      bind:value={contract.adminNotes}
                      placeholder="Add feedback or notes for this contract approval/rejection..."
                      class="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 h-20 resize-none"
                    ></textarea>
                  </div>
                  <div class="flex gap-3">
                    <Button
                      on:click={() => approveContract(contract.id, contract.adminNotes)}
                      class="bg-green-500 hover:bg-green-600 text-white h-10 px-4 flex items-center rounded-md"
                    >
                      <CheckCircle class="w-4 h-4 mr-2" />
                      Approve Contract
                    </Button>
                    <Button
                      on:click={() => rejectContract(contract.id, contract.adminNotes)}
                      class="bg-red-500 hover:bg-red-600 text-white h-10 px-4 flex items-center rounded-md"
                    >
                      <AlertTriangle class="w-4 h-4 mr-2" />
                      Reject Contract
                    </Button>
                    <Button
                      on:click={() => viewContractDetails(contract)}
                      variant="ghost"
                      class="text-white/70 hover:text-white h-10 px-4 flex items-center rounded-md"
                    >
                      View Full Contract
                    </Button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Approved & Rejected Contracts Section -->
      {#if allContracts.filter(c => c.status === 'admin_approved' || c.status === 'admin_rejected').length > 0}
        <div class="mb-8">
          <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <CheckCircle class="w-5 h-5 text-green-400" />
            Reviewed Contracts
          </h3>
          <div class="space-y-3">
            {#each allContracts.filter(c => c.status === 'admin_approved' || c.status === 'admin_rejected') as contract}
              <div class="bg-white/5 border border-white/20 rounded-xl p-4 {contract.status === 'admin_approved' ? 'border-green-500/30' : 'border-red-500/30'}">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                      <h4 class="text-white font-bold">{contract.student_name || contract.title || 'Contract'}</h4>
                      <span class="px-3 py-1 rounded-full text-xs font-semibold {contract.status === 'admin_approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
                        {contract.status === 'admin_approved' ? '✓ Approved' : '✗ Rejected'}
                      </span>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p class="text-white/50 text-xs">Student</p>
                        <p class="text-white">{contract.student_email || 'Not provided'}</p>
                      </div>
                      <div>
                        <p class="text-white/50 text-xs">Mentor</p>
                        <p class="text-white">{contract.mentor_email || 'Not assigned'}</p>
                      </div>
                      <div>
                        <p class="text-white/50 text-xs">Reviewed On</p>
                        <p class="text-white">{contract.admin_reviewed_at ? new Date(contract.admin_reviewed_at).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <div>
                        <p class="text-white/50 text-xs">Status</p>
                        <p class="{contract.status === 'admin_approved' ? 'text-green-400' : 'text-red-400'} font-semibold">
                          {contract.status === 'admin_approved' ? 'Active' : 'Rejected'}
                        </p>
                      </div>
                    </div>
                    {#if contract.admin_feedback}
                      <div class="mt-3 p-2 bg-white/5 rounded border border-white/10">
                        <p class="text-white/60 text-xs mb-1">Admin Notes:</p>
                        <p class="text-white text-sm">{contract.admin_feedback}</p>
                      </div>
                    {/if}
                  </div>
                  <Button
                    on:click={() => viewContractDetails(contract)}
                    variant="ghost"
                    class="text-white/70 hover:text-white h-8 px-3 flex items-center rounded-md ml-3"
                  >
                    <FileText class="w-4 h-4 mr-1" />
                    View
                  </Button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Regular Applications Section -->
      <div class="mb-4">
        <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <GraduationCap class="w-5 h-5 text-yellow-400" />
          Internship Applications
        </h3>
        <div class="space-y-4">
          <div class="bg-white/5 rounded-xl border border-white/20 p-6">
            <div class="flex items-start justify-between mb-4">
              <div>
                <h4 class="text-white font-bold text-lg">Sarah Johnson</h4>
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
                Approve Application
              </Button>
              <Button class="bg-red-500 hover:bg-red-600 text-white h-10 px-2 items-center flex rounded-md">
                <AlertTriangle class="w-4 h-4 mr-2" />
                Reject Application
              </Button>
              <Button variant="ghost" class="text-white/70 hover:text-white h-10 px-2 items-center flex rounded-md">View Application</Button>
            </div>
          </div>
        </div>
      </div>

    {:else if activeTab === 'vacancies'}
      <!-- Job Vacancies Main Section -->
      <div class="mb-6">
        <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <FolderOpen class="w-5 h-5 text-blue-400" />
          Job Vacancies
        </h3>

        <div class="mb-4">
          <div class="flex items-center justify-between mb-3">
            <p class="text-white/70 text-sm">Manage public job postings for internships and roles.</p>
            <div class="flex gap-2">
              <Button on:click={() => { showVacancyForm = !showVacancyForm; }} class="bg-green-500 hover:bg-green-600 text-white h-9 px-3">
                {showVacancyForm ? 'Close' : 'Post Vacancy'}
              </Button>
            </div>
          </div>

          {#if showVacancyForm}
            <div class="bg-white/5 rounded-xl border border-white/20 p-4 mb-4">
              <div class="grid grid-cols-1 gap-2">
                <Input bind:value={newVacancy.title} placeholder="Job title" class="bg-white/5 text-white h-9" />
                <Input bind:value={newVacancy.location} placeholder="Location" class="bg-white/5 text-white h-9" />
                <Input bind:value={newVacancy.type} placeholder="Type (e.g. Full-Time)" class="bg-white/5 text-white h-9" />
                <textarea bind:value={newVacancy.description} placeholder="Short description" class="w-full bg-white/5 text-white p-2 rounded h-24"></textarea>
                <div class="flex gap-2 justify-end">
                  <Button variant="ghost" on:click={() => { showVacancyForm = false; }} class="text-white/70">Cancel</Button>
                  <Button on:click={createVacancy} class="bg-blue-500 text-white">Post Vacancy</Button>
                </div>
              </div>
            </div>
          {/if}

          <div class="space-y-3">
            {#if vacancies.length === 0}
              <div class="bg-white/5 rounded-xl border border-white/20 p-6">
                <p class="text-white/60">No vacancies posted yet.</p>
              </div>
            {:else}
              {#each vacancies as v}
                <div class="bg-white/5 rounded-xl border border-white/20 p-4 flex items-start justify-between">
                  <div>
                    <h4 class="text-white font-semibold">{v.title}</h4>
                    <p class="text-white/60 text-sm">{v.location} · {v.type} {v.remote ? '· Remote' : ''}</p>
                    <p class="text-white/70 text-sm mt-2 line-clamp-3">{v.description}</p>
                  </div>
                  <div class="flex flex-col items-end gap-2">
                    <div class="text-white/60 text-xs">{new Date(v.created_at).toLocaleDateString()}</div>
                    <Button variant="ghost" on:click={() => deleteVacancy(v.id)} class="text-red-400 h-8 px-2">
                      <Trash2 class="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              {/each}
            {/if}
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
    <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 rounded-3xl">
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
    <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 rounded-3xl">
      <div class="bg-transparent rounded-xl border border-white/20 p-6 max-w-2xl w-full">
        <h2 class="text-2xl font-bold text-white mb-6">Assign Student to Mentor</h2>

        <div class="space-y-4">
          <div>
            <label class="text-white/70 text-sm block mb-2">Select Student</label>
            {#if !unassignedCandidates || unassignedCandidates.length === 0}
              <div class="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 mb-4">
                <p class="text-yellow-200 text-sm">
                  ⚠️ No students available to assign. You may need to create student records first, or check company scoping.
                </p>
                {#if unassignedCandidates === null}
                  <p class="text-white/60 text-xs mt-2">Tip: the dashboard tried scoped students first — click "Reload Data" to refresh or check <code>/admin-debug</code> for diagnostics.</p>
                {/if}
              </div>
            {/if}
            <select
              bind:value={assignmentData.studentId}
              class="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white"
              disabled={!unassignedCandidates || unassignedCandidates.length === 0}
            >
              <option value={null}>
                {!unassignedCandidates || unassignedCandidates.length === 0 ? 'No students available' : 'Choose a student...'}
              </option>
              {#each (unassignedCandidates || []) as student}
                <option value={student.id}>{student.full_name} ({student.student_email || student.email})</option>
              {/each}
            </select>
          </div>

          <div>
            <label class="text-white/70 text-sm block mb-2">Select Mentor</label>
            {#if allMentors.length === 0}
              <div class="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 mb-4">
                <p class="text-yellow-200 text-sm">
                  ⚠️ No mentors found. You need to create users with "mentor" role first.
                </p>
              </div>
            {/if}
            <select
              bind:value={assignmentData.mentorEmail}
              class="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white"
              disabled={allMentors.length === 0}
            >
              <option value="">
                {allMentors.length === 0 ? 'No mentors available' : 'Choose a mentor...'}
              </option>
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
            on:click={() => { showAssignModal = false; assignmentData = { studentId: null, mentorEmail: '' }; unassignedCandidates = null; }}
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
    <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 rounded-3xl">
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

<!-- Report Reply Modal -->
{#if showReplyDialog && selectedReport}
  <Dialog bind:open={showReplyDialog}>
    <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 rounded-3xl">
      <div class="bg-transparent rounded-xl border border-white/20 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 class="text-2xl font-bold text-white mb-6">Reply to Report</h2>

        <div class="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
          <h3 class="text-white font-semibold mb-2">{selectedReport.subject}</h3>
          <p class="text-white/70 text-sm mb-3">From: {selectedReport.from_email}</p>
          <div class="text-white/60 text-sm max-h-32 overflow-y-auto">
            {selectedReport.content}
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <label class="text-white/70 text-sm block mb-2">Your Reply</label>
            <textarea
              bind:value={replyContent}
              placeholder="Type your response to the mentor..."
              class="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-white/50 min-h-[120px]"
            />
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <Button
            on:click={sendReportReply}
            class="flex-1 bg-green-500 hover:bg-green-600 text-white h-10 flex items-center rounded-md justify-center"
            disabled={!replyContent.trim()}
          >
            <Send class="w-4 h-4 mr-2" />
            Send Reply
          </Button>
          <Button
            on:click={() => { showReplyDialog = false; replyContent = ''; selectedReport = null; }}
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
          <p class="text-white/70">{viewingSubmission.created_by} • {viewingSubmission.date}</p>
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
        <div class="p-4 bg-white/5 rounded-lg border border-white/10">
          <p class="text-white/60 text-sm mb-2">Proof Type</p>
          <p class="text-white font-medium capitalize">{viewingSubmission.proof_type?.replace('_', ' ') || 'N/A'}</p>
        </div>

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
        {#if viewingSubmission.status === 'submitted'}
          <Button
            on:click={() => rejectSubmission(viewingSubmission)}
            class="bg-red-500 hover:bg-red-600 text-white h-10 px-6 rounded-md flex items-center"
          >
            <X class="w-4 h-4 mr-2" />
            Reject
          </Button>
          <Button
            on:click={() => approveSubmission(viewingSubmission)}
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
