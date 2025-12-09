const API_BASE_URL = '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('auth_token');
    console.log('ApiClient initialized with token:', this.token ? 'present' : 'none');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('auth_token', token);
    console.log('Token set in ApiClient:', token ? 'present' : 'none');
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
      console.log('Adding Authorization header');
    } else {
      console.log('No token available for request');
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth methods
  async login(email, password) {
    // Clear any existing token first
    this.clearToken();
    
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.token) {
      this.setToken(response.token);
      console.log('Token set:', response.token.substring(0, 20) + '...');
    }
    
    return response;
  }

  async register(userData) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  logout() {
    this.clearToken();
  }

  // Student methods
  async getStudents(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/students${query ? `?${query}` : ''}`);
  }

  async createStudent(studentData) {
    return this.request('/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
  }

  async updateStudent(id, studentData) {
    return this.request(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(studentData),
    });
  }

  async deleteStudent(id) {
    return this.request(`/students/${id}`, {
      method: 'DELETE',
    });
  }

  // Task methods
  async getTasks(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/tasks${query ? `?${query}` : ''}`);
  }

  async createTask(taskData) {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async updateTask(id, taskData) {
    return this.request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  }

  async deleteTask(id) {
    return this.request(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // Time entry methods
  async getTimeEntries(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/time-entries${query ? `?${query}` : ''}`);
  }

  async createTimeEntry(entryData) {
    return this.request('/time-entries', {
      method: 'POST',
      body: JSON.stringify(entryData),
    });
  }

  async updateTimeEntry(id, entryData) {
    return this.request(`/time-entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(entryData),
    });
  }

  async deleteTimeEntry(id) {
    return this.request(`/time-entries/${id}`, {
      method: 'DELETE',
    });
  }

  // Schedule methods
  async getSchedules(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/schedules${query ? `?${query}` : ''}`);
  }

  async createSchedule(scheduleData) {
    return this.request('/schedules', {
      method: 'POST',
      body: JSON.stringify(scheduleData),
    });
  }

  async updateSchedule(id, scheduleData) {
    return this.request(`/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(scheduleData),
    });
  }

  async deleteSchedule(id) {
    return this.request(`/schedules/${id}`, {
      method: 'DELETE',
    });
  }

  // Question methods
  async getQuestions() {
    return this.request('/questions');
  }

  async createQuestion(questionData) {
    return this.request('/questions', {
      method: 'POST',
      body: JSON.stringify(questionData),
    });
  }

  async updateQuestion(id, questionData) {
    return this.request(`/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(questionData),
    });
  }

  async deleteQuestion(id) {
    return this.request(`/questions/${id}`, {
      method: 'DELETE',
    });
  }

  // Document methods
  async getDocuments(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/documents${query ? `?${query}` : ''}`);
  }

  async uploadDocument(documentData) {
    return this.request('/documents', {
      method: 'POST',
      body: JSON.stringify(documentData),
    });
  }

  async deleteDocument(id) {
    return this.request(`/documents/${id}`, {
      method: 'DELETE',
    });
  }

  // File methods
  async uploadFiles(files) {
    const formData = new FormData();
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    return this.request('/files/upload', {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData, let browser set it
      },
      body: formData,
    });
  }

  getFileUrl(filename) {
    return `${API_BASE_URL}/files/${filename}`;
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;