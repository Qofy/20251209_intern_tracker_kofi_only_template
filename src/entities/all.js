import apiClient from '../api/client';

// Helper to check if we're in demo mode
function isDemoMode() {
  const token = localStorage.getItem('auth_token');
  return token && token.startsWith('demo_');
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
    return apiClient.getStudents(params);
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
    return apiClient.getQuestions();
  }

  static async create(data) {
    return apiClient.createQuestion(data);
  }

  static async update(id, data) {
    return apiClient.updateQuestion(id, data);
  }

  static async delete(id) {
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
