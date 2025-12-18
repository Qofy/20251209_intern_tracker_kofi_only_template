import apiClient from '../api/client';

// Helper to check if we're in demo mode
function isDemoMode() {
    // Force real API mode for consistent message persistence
    // const token = localStorage.getItem('authToken');
    // return !token || token.startsWith('demo_');
    return false;
}

function getDemoRole() {
  const token = localStorage.getItem('auth_token');
  if (token && token.startsWith('demo_')) {
    return token.replace('demo_', '');
  }
  return null;
}

// Entity classes that use the API client
export class User {
  static async me() {
    if (isDemoMode()) {
      const role = getDemoRole();
      return {
        id: `demo_${role}_id`,
        email: `${role}@example.com`,
        full_name: role.charAt(0).toUpperCase() + role.slice(1),
        role: role
      };
    }
    return apiClient.request('/api/users/me');
  }

  static async list() {
    if (isDemoMode()) {
      const demoUsers = JSON.parse(localStorage.getItem('demo_users') || '[]');
      // If empty, add default users
      if (demoUsers.length === 0) {
        const defaults = [
          { id: 'demo_1', email: 'admin@example.com', full_name: 'Admin', role: 'admin', status: 'active' },
          { id: 'demo_2', email: 'mentor@example.com', full_name: 'Mentor', role: 'mentor', status: 'active' },
          { id: 'demo_3', email: 'student@example.com', full_name: 'Student', role: 'student', status: 'active' }
        ];
        localStorage.setItem('demo_users', JSON.stringify(defaults));
        return defaults;
      }
      return demoUsers;
    }
    return apiClient.request('/api/users');
  }

  static async create(data) {
    if (isDemoMode()) {
      const demoUsers = JSON.parse(localStorage.getItem('demo_users') || '[]');
      const newUser = {
        ...data,
        id: `demo_user_${Date.now()}`,
        status: 'active',
        created_at: new Date().toISOString()
      };
      demoUsers.push(newUser);
      localStorage.setItem('demo_users', JSON.stringify(demoUsers));
      return newUser;
    }
    return apiClient.request('/api/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async delete(id) {
    if (isDemoMode()) {
      const demoUsers = JSON.parse(localStorage.getItem('demo_users') || '[]');
      const filtered = demoUsers.filter(u => u.id !== id);
      localStorage.setItem('demo_users', JSON.stringify(filtered));
      return { success: true };
    }
    return apiClient.request(`/api/users/${id}`, {
      method: 'DELETE'
    });
  }
}

export class Student {
  static async list() {
    if (isDemoMode()) {
      // Return demo students from localStorage
      const demoStudents = JSON.parse(localStorage.getItem('demo_students') || '[]');
      return demoStudents;
    }
    return apiClient.getStudents();
  }

  static async filter(params) {
    if (isDemoMode()) {
      const demoStudents = JSON.parse(localStorage.getItem('demo_students') || '[]');
      // Simple filter by mentor_email or student_email
      if (params.mentor_email) {
        return demoStudents.filter(s => s.mentor_email === params.mentor_email);
      }
      if (params.student_email) {
        return demoStudents.filter(s => s.student_email === params.student_email);
      }
      return demoStudents;
    }
    
    try {
      const result = await apiClient.getStudents(params);
      
      // If searching for a student by email but no record found, create a default one
      if (params.student_email && (!result || result.length === 0)) {
        console.log(`No student record found for ${params.student_email}, creating default record`);
        
        // First, try to find the mentor by looking at tasks assigned to this student
        let mentorEmail = "admin@example.com"; // Default fallback
        
        try {
          // Get tasks assigned to this student to find who assigned them
          const studentTasks = await apiClient.getTasks({ student_email: params.student_email });
          if (studentTasks && studentTasks.length > 0) {
            // Use the created_by email from the most recent task as the mentor
            const latestTask = studentTasks.sort((a, b) => 
              new Date(b.created_date || b.created_at || 0) - new Date(a.created_date || a.created_at || 0)
            )[0];
            
            if (latestTask.created_by) {
              mentorEmail = latestTask.created_by;
              console.log(`Found mentor from task assignment: ${mentorEmail}`);
            }
          }
        } catch (taskError) {
          console.warn('Failed to fetch tasks for mentor detection:', taskError);
        }
        
        // Create a default student record with detected mentor assignment
        const defaultStudent = {
          full_name: "Student User", 
          student_email: params.student_email,
          mentor_email: mentorEmail,
          contract_hours: 600,
          start_date: "2025-01-01",
          end_date: "2025-06-01",
          status: "active",
          department: "Computer Science",
          position: "Intern"
        };
        
        // Try to create the record in the backend
        try {
          const created = await this.create(defaultStudent);
          return [created];
        } catch (error) {
          console.warn('Failed to create student record in backend, returning default:', error);
          // Return the default record even if backend creation fails
          return [{ ...defaultStudent, id: `temp_${Date.now()}` }];
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error fetching students:', error);
      
      // If API call fails and we're looking for a specific student, return a default
      if (params.student_email) {
        return [{
          id: `temp_${Date.now()}`,
          full_name: "Student User",
          student_email: params.student_email,
          mentor_email: "admin@example.com", // Fallback mentor
          contract_hours: 600,
          start_date: "2025-01-01",
          end_date: "2025-06-01",
          status: "active",
          department: "Computer Science",
          position: "Intern"
        }];
      }
      
      throw error;
    }
  }

  static async create(data) {
    if (isDemoMode()) {
      // Create demo student in localStorage
      const demoStudents = JSON.parse(localStorage.getItem('demo_students') || '[]');
      const newStudent = {
        ...data,
        id: `demo_student_${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      demoStudents.push(newStudent);
      localStorage.setItem('demo_students', JSON.stringify(demoStudents));
      return newStudent;
    }
    return apiClient.createStudent(data);
  }

  static async update(id, data) {
    if (isDemoMode()) {
      const demoStudents = JSON.parse(localStorage.getItem('demo_students') || '[]');
      const index = demoStudents.findIndex(s => s.id === id);
      if (index !== -1) {
        demoStudents[index] = { ...demoStudents[index], ...data, updated_at: new Date().toISOString() };
        localStorage.setItem('demo_students', JSON.stringify(demoStudents));
        return demoStudents[index];
      }
      throw new Error('Student not found');
    }
    return apiClient.updateStudent(id, data);
  }

  static async delete(id) {
    if (isDemoMode()) {
      const demoStudents = JSON.parse(localStorage.getItem('demo_students') || '[]');
      const filtered = demoStudents.filter(s => s.id !== id);
      localStorage.setItem('demo_students', JSON.stringify(filtered));
      return { success: true };
    }
    return apiClient.deleteStudent(id);
  }
}

export class Task {
  static async list(params = {}) {
    if (isDemoMode()) {
      const demoTasks = JSON.parse(localStorage.getItem('demo_tasks') || '[]');
      return demoTasks;
    }
    return apiClient.getTasks(params);
  }

  static async create(data) {
    if (isDemoMode()) {
      const demoTasks = JSON.parse(localStorage.getItem('demo_tasks') || '[]');
      const newTask = {
        ...data,
        id: `demo_task_${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      demoTasks.push(newTask);
      localStorage.setItem('demo_tasks', JSON.stringify(demoTasks));
      return newTask;
    }
    return apiClient.createTask(data);
  }

  static async update(id, data) {
    if (isDemoMode()) {
      const demoTasks = JSON.parse(localStorage.getItem('demo_tasks') || '[]');
      const index = demoTasks.findIndex(t => t.id === id);
      if (index !== -1) {
        demoTasks[index] = { ...demoTasks[index], ...data, updated_at: new Date().toISOString() };
        localStorage.setItem('demo_tasks', JSON.stringify(demoTasks));
        return demoTasks[index];
      }
      throw new Error('Task not found');
    }
    return apiClient.updateTask(id, data);
  }

  static async delete(id) {
    if (isDemoMode()) {
      const demoTasks = JSON.parse(localStorage.getItem('demo_tasks') || '[]');
      const filtered = demoTasks.filter(t => t.id !== id);
      localStorage.setItem('demo_tasks', JSON.stringify(filtered));
      return { success: true };
    }
    return apiClient.deleteTask(id);
  }
}

export class TimeEntry {
  static async list(params = {}) {
    if (isDemoMode()) {
      const demoEntries = JSON.parse(localStorage.getItem('demo_time_entries') || '[]');
      return demoEntries;
    }
    return apiClient.getTimeEntries(params);
  }

  static async filter(params = {}) {
    if (isDemoMode()) {
      const demoEntries = JSON.parse(localStorage.getItem('demo_time_entries') || '[]');
      // Simple filtering by any param keys
      if (Object.keys(params).length === 0) return demoEntries;
      return demoEntries.filter(entry => {
        return Object.entries(params).every(([key, value]) => entry[key] === value);
      });
    }
    return apiClient.getTimeEntries(params);
  }

  static async create(data) {
    if (isDemoMode()) {
      const demoEntries = JSON.parse(localStorage.getItem('demo_time_entries') || '[]');
      const newEntry = {
        ...data,
        id: `demo_entry_${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      demoEntries.push(newEntry);
      localStorage.setItem('demo_time_entries', JSON.stringify(demoEntries));
      return newEntry;
    }
    return apiClient.createTimeEntry(data);
  }

  static async update(id, data) {
    if (isDemoMode()) {
      const demoEntries = JSON.parse(localStorage.getItem('demo_time_entries') || '[]');
      const index = demoEntries.findIndex(e => e.id === id);
      if (index !== -1) {
        demoEntries[index] = { ...demoEntries[index], ...data, updated_at: new Date().toISOString() };
        localStorage.setItem('demo_time_entries', JSON.stringify(demoEntries));
        return demoEntries[index];
      }
      throw new Error('Time entry not found');
    }
    return apiClient.updateTimeEntry(id, data);
  }

  static async delete(id) {
    if (isDemoMode()) {
      const demoEntries = JSON.parse(localStorage.getItem('demo_time_entries') || '[]');
      const filtered = demoEntries.filter(e => e.id !== id);
      localStorage.setItem('demo_time_entries', JSON.stringify(filtered));
      return { success: true };
    }
    return apiClient.deleteTimeEntry(id);
  }
}

export class Schedule {
  static async list(params = {}) {
    if (isDemoMode()) {
      const demoSchedules = JSON.parse(localStorage.getItem('demo_schedules') || '[]');
      return demoSchedules;
    }
    return apiClient.getSchedules(params);
  }

  static async filter(params = {}) {
    if (isDemoMode()) {
      const demoSchedules = JSON.parse(localStorage.getItem('demo_schedules') || '[]');
      // Simple filtering by any param keys
      if (Object.keys(params).length === 0) return demoSchedules;
      return demoSchedules.filter(schedule => {
        return Object.entries(params).every(([key, value]) => schedule[key] === value);
      });
    }
    return apiClient.getSchedules(params);
  }

  static async create(data) {
    if (isDemoMode()) {
      const demoSchedules = JSON.parse(localStorage.getItem('demo_schedules') || '[]');
      const newSchedule = {
        ...data,
        id: `demo_schedule_${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      demoSchedules.push(newSchedule);
      localStorage.setItem('demo_schedules', JSON.stringify(demoSchedules));
      return newSchedule;
    }
    return apiClient.createSchedule(data);
  }

  static async update(id, data) {
    if (isDemoMode()) {
      const demoSchedules = JSON.parse(localStorage.getItem('demo_schedules') || '[]');
      const index = demoSchedules.findIndex(s => s.id === id);
      if (index !== -1) {
        demoSchedules[index] = { ...demoSchedules[index], ...data, updated_at: new Date().toISOString() };
        localStorage.setItem('demo_schedules', JSON.stringify(demoSchedules));
        return demoSchedules[index];
      }
      throw new Error('Schedule not found');
    }
    return apiClient.updateSchedule(id, data);
  }

  static async delete(id) {
    if (isDemoMode()) {
      const demoSchedules = JSON.parse(localStorage.getItem('demo_schedules') || '[]');
      const filtered = demoSchedules.filter(s => s.id !== id);
      localStorage.setItem('demo_schedules', JSON.stringify(filtered));
      return { success: true };
    }
    return apiClient.deleteSchedule(id);
  }
}

export class Question {
  static async list() {
    if (isDemoMode()) {
      const demoQuestions = JSON.parse(localStorage.getItem('demo_questions') || '[]');
      return demoQuestions;
    }
    return apiClient.getQuestions();
  }

  static async create(data) {
    if (isDemoMode()) {
      const demoQuestions = JSON.parse(localStorage.getItem('demo_questions') || '[]');
      const newQuestion = {
        ...data,
        id: `demo_question_${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      demoQuestions.push(newQuestion);
      localStorage.setItem('demo_questions', JSON.stringify(demoQuestions));
      return newQuestion;
    }
    return apiClient.createQuestion(data);
  }

  static async update(id, data) {
    if (isDemoMode()) {
      const demoQuestions = JSON.parse(localStorage.getItem('demo_questions') || '[]');
      const index = demoQuestions.findIndex(q => q.id === id);
      if (index !== -1) {
        demoQuestions[index] = { ...demoQuestions[index], ...data, updated_at: new Date().toISOString() };
        localStorage.setItem('demo_questions', JSON.stringify(demoQuestions));
        return demoQuestions[index];
      }
      throw new Error('Question not found');
    }
    return apiClient.updateQuestion(id, data);
  }

  static async delete(id) {
    if (isDemoMode()) {
      const demoQuestions = JSON.parse(localStorage.getItem('demo_questions') || '[]');
      const filtered = demoQuestions.filter(q => q.id !== id);
      localStorage.setItem('demo_questions', JSON.stringify(filtered));
      return { success: true };
    }
    return apiClient.deleteQuestion(id);
  }
}

export class Application {
  static async list(params = {}) {
    return apiClient.request('/api/applications', { 
      method: 'GET', 
      params 
    });
  }

  static async create(data) {
    return apiClient.request('/api/applications', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    });
  }

  static async update(id, data) {
    return apiClient.request(`/api/applications/${id}`, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    });
  }

  static async delete(id) {
    return apiClient.request(`/api/applications/${id}`, { 
      method: 'DELETE' 
    });
  }
}

export class ContractTemplate {
  static async list(params = {}) {
    return apiClient.request('/api/contract-templates', {
      method: 'GET',
      params
    });
  }

  static async create(data) {
    return apiClient.request('/api/contract-templates', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async update(id, data) {
    return apiClient.request(`/api/contract-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  static async delete(id) {
    return apiClient.request(`/api/contract-templates/${id}`, {
      method: 'DELETE'
    });
  }
}

export class Project {
  static async list(params = {}) {
    if (isDemoMode()) {
      const demoProjects = JSON.parse(localStorage.getItem('demo_projects') || '[]');
      return demoProjects;
    }
    return apiClient.request('/api/projects', {
      method: 'GET',
      params
    });
  }

  static async create(data) {
    if (isDemoMode()) {
      const demoProjects = JSON.parse(localStorage.getItem('demo_projects') || '[]');
      const newProject = {
        ...data,
        id: `demo_project_${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: data.status || 'active'
      };
      demoProjects.push(newProject);
      localStorage.setItem('demo_projects', JSON.stringify(demoProjects));
      return newProject;
    }
    return apiClient.request('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async update(id, data) {
    if (isDemoMode()) {
      const demoProjects = JSON.parse(localStorage.getItem('demo_projects') || '[]');
      const index = demoProjects.findIndex(p => p.id === id);
      if (index !== -1) {
        demoProjects[index] = { ...demoProjects[index], ...data, updated_at: new Date().toISOString() };
        localStorage.setItem('demo_projects', JSON.stringify(demoProjects));
        return demoProjects[index];
      }
      throw new Error('Project not found');
    }
    return apiClient.request(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  static async delete(id) {
    if (isDemoMode()) {
      const demoProjects = JSON.parse(localStorage.getItem('demo_projects') || '[]');
      const filtered = demoProjects.filter(p => p.id !== id);
      localStorage.setItem('demo_projects', JSON.stringify(filtered));
      return { success: true };
    }
    return apiClient.request(`/api/projects/${id}`, {
      method: 'DELETE'
    });
  }
}

export class Contract {
  static async list(filters = {}) {
    if (isDemoMode()) {
      const demoContracts = JSON.parse(localStorage.getItem('demo_contracts') || '[]');
      return demoContracts;
    }
    return apiClient.getContracts(filters);
  }

  static async create(data) {
    if (isDemoMode()) {
      const demoContracts = JSON.parse(localStorage.getItem('demo_contracts') || '[]');
      const newContract = {
        ...data,
        id: `demo_contract_${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      demoContracts.push(newContract);
      localStorage.setItem('demo_contracts', JSON.stringify(demoContracts));
      return newContract;
    }
    return apiClient.createContract(data);
  }

  static async update(id, data) {
    if (isDemoMode()) {
      const demoContracts = JSON.parse(localStorage.getItem('demo_contracts') || '[]');
      const index = demoContracts.findIndex(c => c.id === id);
      if (index !== -1) {
        demoContracts[index] = { ...demoContracts[index], ...data, updated_at: new Date().toISOString() };
        localStorage.setItem('demo_contracts', JSON.stringify(demoContracts));
        return demoContracts[index];
      }
      throw new Error('Contract not found');
    }
    return apiClient.updateContract(id, data);
  }

  static async signAsStudent(id, signatureData) {
    if (isDemoMode()) {
      return this.update(id, {
        student_signature: signatureData.signature,
        student_signed_date: signatureData.date,
        status: 'mentor_review'
      });
    }
    return apiClient.signContractAsStudent(id, signatureData);
  }

  static async submitToAdmin(id, signatureData) {
    if (isDemoMode()) {
      return this.update(id, {
        mentor_signature: signatureData.signature,
        mentor_signed_date: signatureData.date,
        status: 'pending_approval'
      });
    }
    return apiClient.submitContractToAdmin(id, signatureData);
  }

  static async approve(id, adminNotes = '') {
    if (isDemoMode()) {
      return this.update(id, {
        status: 'approved',
        admin_notes: adminNotes
      });
    }
    return apiClient.approveContract(id, adminNotes);
  }

  static async reject(id, rejectionReason) {
    if (isDemoMode()) {
      return this.update(id, {
        status: 'rejected',
        rejection_reason: rejectionReason
      });
    }
    return apiClient.rejectContract(id, rejectionReason);
  }

  static async delete(id) {
    if (isDemoMode()) {
      const demoContracts = JSON.parse(localStorage.getItem('demo_contracts') || '[]');
      const filtered = demoContracts.filter(c => c.id !== id);
      localStorage.setItem('demo_contracts', JSON.stringify(filtered));
      return { success: true };
    }
    return apiClient.deleteContract(id);
  }
}

export class Message {
  static async send(messageData) {
    if (isDemoMode()) {
      const demoMessages = JSON.parse(localStorage.getItem('demo_messages') || '[]');
      const newMessage = {
        ...messageData,
        id: `demo_message_${Date.now()}`,
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      demoMessages.push(newMessage);
      localStorage.setItem('demo_messages', JSON.stringify(demoMessages));
      return newMessage;
    }
    return apiClient.sendMessage(messageData);
  }

  static async getMentorMessages() {
    if (isDemoMode()) {
      const demoMessages = JSON.parse(localStorage.getItem('demo_messages') || '[]');
      const currentUser = JSON.parse(localStorage.getItem('demo_user') || '{}');
      return demoMessages.filter(m => m.to_email === currentUser.email && m.to_role === 'Mentor')
                         .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return apiClient.getMentorMessages();
  }

  static async getStudentMessages() {
    if (isDemoMode()) {
      const demoMessages = JSON.parse(localStorage.getItem('demo_messages') || '[]');
      const currentUser = JSON.parse(localStorage.getItem('demo_user') || '{}');
      return demoMessages.filter(m => m.to_email === currentUser.email && m.to_role === 'Student')
                         .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return apiClient.getStudentMessages();
  }

  static async getConversation(otherEmail) {
    if (isDemoMode()) {
      const demoMessages = JSON.parse(localStorage.getItem('demo_messages') || '[]');
      const currentUser = JSON.parse(localStorage.getItem('demo_user') || '{}');
      return demoMessages.filter(m => 
        (m.from_email === currentUser.email && m.to_email === otherEmail) ||
        (m.from_email === otherEmail && m.to_email === currentUser.email)
      ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }
    return apiClient.getConversation(otherEmail);
  }

  static async markAsRead(messageId) {
    if (isDemoMode()) {
      const demoMessages = JSON.parse(localStorage.getItem('demo_messages') || '[]');
      const index = demoMessages.findIndex(m => m.id === messageId);
      if (index !== -1) {
        demoMessages[index].is_read = true;
        localStorage.setItem('demo_messages', JSON.stringify(demoMessages));
        return demoMessages[index];
      }
      throw new Error('Message not found');
    }
    return apiClient.markMessageAsRead(messageId);
  }

  static async markAllAsRead() {
    if (isDemoMode()) {
      const demoMessages = JSON.parse(localStorage.getItem('demo_messages') || '[]');
      const currentUser = JSON.parse(localStorage.getItem('demo_user') || '{}');
      demoMessages.forEach(m => {
        if (m.to_email === currentUser.email) {
          m.is_read = true;
        }
      });
      localStorage.setItem('demo_messages', JSON.stringify(demoMessages));
      return { message: 'All messages marked as read' };
    }
    return apiClient.markAllMessagesAsRead();
  }

  static async getUnreadCount() {
    if (isDemoMode()) {
      const demoMessages = JSON.parse(localStorage.getItem('demo_messages') || '[]');
      const currentUser = JSON.parse(localStorage.getItem('demo_user') || '{}');
      return { 
        count: demoMessages.filter(m => m.to_email === currentUser.email && !m.is_read).length 
      };
    }
    return apiClient.getUnreadMessageCount();
  }

  static async delete(messageId) {
    if (isDemoMode()) {
      const demoMessages = JSON.parse(localStorage.getItem('demo_messages') || '[]');
      const filtered = demoMessages.filter(m => m.id !== messageId);
      localStorage.setItem('demo_messages', JSON.stringify(filtered));
      return { message: 'Message deleted successfully' };
    }
    return apiClient.deleteMessage(messageId);
  }

  static async getAdminMessages() {
    if (isDemoMode()) {
      const demoMessages = JSON.parse(localStorage.getItem('demo_messages') || '[]');
      const currentUser = JSON.parse(localStorage.getItem('demo_user') || '{}');
      return demoMessages.filter(m => m.to_email === currentUser.email && m.to_role === 'Admin')
                         .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return apiClient.getAdminMessages();
  }

  static async getAdminReports() {
    if (isDemoMode()) {
      const demoMessages = JSON.parse(localStorage.getItem('demo_messages') || '[]');
      const currentUser = JSON.parse(localStorage.getItem('demo_user') || '{}');
      return demoMessages.filter(m => 
        m.to_email === currentUser.email && 
        m.to_role === 'Admin' && 
        m.message_type === 'report'
      ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return apiClient.getAdminReports();
  }

  static async replyToReport(reportId, replyContent) {
    if (isDemoMode()) {
      const demoMessages = JSON.parse(localStorage.getItem('demo_messages') || '[]');
      const report = demoMessages.find(m => m.id === reportId);
      if (!report) throw new Error('Report not found');
      
      const reportData = JSON.parse(report.report_data || '{}');
      const newMessage = {
        id: Date.now(),
        from_email: JSON.parse(localStorage.getItem('demo_user') || '{}').email,
        to_email: reportData.mentor_email,
        from_role: 'Admin',
        to_role: 'Mentor',
        subject: `Re: ${report.subject}`,
        content: replyContent,
        is_read: false,
        student_id: reportData.student_id,
        mentor_email: reportData.mentor_email,
        message_type: 'message',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      demoMessages.push(newMessage);
      localStorage.setItem('demo_messages', JSON.stringify(demoMessages));
      return newMessage;
    }
    return apiClient.replyToReport(reportId, replyContent);
  }
}
