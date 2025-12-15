import apiClient from '../api/client';

// Entity classes that use the API client
export class User {
  static async me() {
    return apiClient.request('/api/users/me');
  }
}

export class Student {
  static async list() {
    return apiClient.getStudents();
  }

  static async filter(params) {
    return apiClient.getStudents(params);
  }

  static async create(data) {
    return apiClient.createStudent(data);
  }

  static async update(id, data) {
    return apiClient.updateStudent(id, data);
  }

  static async delete(id) {
    return apiClient.deleteStudent(id);
  }
}

export class Task {
  static async list(params = {}) {
    const offlineMode = true;
    if (offlineMode) {
      return [
        { id: 1, title: 'Complete project documentation', description: 'Write comprehensive docs', status: 'in_progress', due_date: '2024-12-20', priority: 'high' },
        { id: 2, title: 'Review code changes', description: 'Review PR #123', status: 'pending', due_date: '2024-12-18', priority: 'medium' },
        { id: 3, title: 'Fix bug in login flow', description: 'Users reporting issues', status: 'completed', due_date: '2024-12-15', priority: 'high' },
        { id: 4, title: 'Update dependencies', description: 'Update npm packages', status: 'pending', due_date: '2024-12-25', priority: 'low' }
      ];
    }
    return apiClient.getTasks(params);
  }

  static async create(data) {
    const offlineMode = true;
    if (offlineMode) {
      console.log('Offline mode: mock create task', data);
      return { id: Date.now(), ...data, status: 'pending' };
    }
    return apiClient.createTask(data);
  }

  static async update(id, data) {
    const offlineMode = true;
    if (offlineMode) {
      console.log('Offline mode: mock update task', id, data);
      return { id, ...data };
    }
    return apiClient.updateTask(id, data);
  }

  static async delete(id) {
    const offlineMode = true;
    if (offlineMode) {
      console.log('Offline mode: mock delete task', id);
      return { success: true };
    }
    return apiClient.deleteTask(id);
  }
}

export class TimeEntry {
  static async list(params = {}) {
    // Return mock data for offline mode
    const offlineMode = true;
    if (offlineMode) {
      // Generate mock time entries for the past 30 days
      const entries = [];
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        entries.push({
          id: i + 1,
          date: dateStr,
          start_time: '09:00',
          end_time: '17:00',
          break_start: '12:00',
          break_end: '13:00',
          approved_hours: 7 + Math.random() * 2, // 7-9 hours
          manually_inputted_hours: 8,
          status: i < 20 ? 'approved' : i < 25 ? 'submitted' : 'draft',
          mentor_comments: i % 3 === 0 ? 'Good work!' : '',
          created_by: 1,
          created_date: dateStr
        });
      }
      return entries;
    }
    return apiClient.getTimeEntries(params);
  }

  static async filter(params = {}) {
    const offlineMode = true;
    if (offlineMode) {
      const allEntries = await this.list();
      if (params.status) {
        return allEntries.filter(e => e.status === params.status);
      }
      return allEntries;
    }
    return apiClient.getTimeEntries(params);
  }

  static async create(data) {
    const offlineMode = true;
    if (offlineMode) {
      console.log('Offline mode: mock create time entry', data);
      return { id: Date.now(), ...data, status: 'draft' };
    }
    return apiClient.createTimeEntry(data);
  }

  static async update(id, data) {
    const offlineMode = true;
    if (offlineMode) {
      console.log('Offline mode: mock update time entry', id, data);
      return { id, ...data };
    }
    return apiClient.updateTimeEntry(id, data);
  }

  static async delete(id) {
    const offlineMode = true;
    if (offlineMode) {
      console.log('Offline mode: mock delete time entry', id);
      return { success: true };
    }
    return apiClient.deleteTimeEntry(id);
  }
}

export class Schedule {
  static async list(params = {}) {
    const offlineMode = true;
    if (offlineMode) {
      return [
        { id: 1, title: 'Team Meeting', date: '2024-12-16', start_time: '10:00', end_time: '11:00', type: 'meeting' },
        { id: 2, title: 'Code Review Session', date: '2024-12-17', start_time: '14:00', end_time: '15:00', type: 'review' },
        { id: 3, title: 'Training Workshop', date: '2024-12-19', start_time: '09:00', end_time: '12:00', type: 'training' }
      ];
    }
    return apiClient.getSchedules(params);
  }

  static async create(data) {
    const offlineMode = true;
    if (offlineMode) {
      console.log('Offline mode: mock create schedule', data);
      return { id: Date.now(), ...data };
    }
    return apiClient.createSchedule(data);
  }

  static async update(id, data) {
    const offlineMode = true;
    if (offlineMode) {
      console.log('Offline mode: mock update schedule', id, data);
      return { id, ...data };
    }
    return apiClient.updateSchedule(id, data);
  }

  static async delete(id) {
    const offlineMode = true;
    if (offlineMode) {
      console.log('Offline mode: mock delete schedule', id);
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

export class StudentDocument {
  static async list(params = {}) {
    return apiClient.getDocuments(params);
  }

  static async create(data) {
    return apiClient.uploadDocument(data);
  }

  static async delete(id) {
    return apiClient.deleteDocument(id);
  }
}

export class Application {
  static async list(params = {}) {
    return apiClient.request('/api/applications', { method: 'GET', params });
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
