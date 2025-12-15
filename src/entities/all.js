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

  static async filter(params = {}) {
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
