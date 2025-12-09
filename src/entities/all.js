import apiClient from '../api/client';

// Entity classes that use the API client
export class User {
  static async me() {
    // Return mock user data for offline mode
    const offlineMode = import.meta.env.VITE_OFFLINE_MODE === 'true';
    if (offlineMode) {
      return {
        id: 1,
        email: 'demo@example.com',
        name: 'Demo User',
        role: 'student'
      };
    }
    return apiClient.request('/auth/me');
  }
}

export class Student {
  static async list() {
    // Return mock data for offline mode
    const offlineMode = import.meta.env.VITE_OFFLINE_MODE === 'true';
    if (offlineMode) {
      return [];
    }
    return apiClient.getStudents();
  }

  static async filter(params) {
    // Return mock data for offline mode
    const offlineMode = import.meta.env.VITE_OFFLINE_MODE === 'true';
    if (offlineMode) {
      return [];
    }
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
    return apiClient.getTasks(params);
  }
  
  static async create(data) {
    return apiClient.createTask(data);
  }
  
  static async update(id, data) {
    return apiClient.updateTask(id, data);
  }
  
  static async delete(id) {
    return apiClient.deleteTask(id);
  }
}

export class TimeEntry {
  static async list(params = {}) {
    return apiClient.getTimeEntries(params);
  }
  
  static async create(data) {
    return apiClient.createTimeEntry(data);
  }
  
  static async update(id, data) {
    return apiClient.updateTimeEntry(id, data);
  }
  
  static async delete(id) {
    return apiClient.deleteTimeEntry(id);
  }
}

export class Schedule {
  static async list(params = {}) {
    return apiClient.getSchedules(params);
  }
  
  static async create(data) {
    return apiClient.createSchedule(data);
  }
  
  static async update(id, data) {
    return apiClient.updateSchedule(id, data);
  }
  
  static async delete(id) {
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