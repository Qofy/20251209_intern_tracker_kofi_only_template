// Use empty base URL so requests go through Vite proxy
const API_BASE_URL = '';

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
    console.log('[ApiClient] Making request to:', url);
    console.log('[ApiClient] Method:', options.method || 'GET');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Always get the latest token from localStorage
    const currentToken = localStorage.getItem('auth_token') || this.token;
    if (currentToken) {
      config.headers.Authorization = `Bearer ${currentToken}`;
      console.log('[ApiClient] Adding Authorization header with token:', currentToken.substring(0, 15) + '...');
    } else {
      console.log('[ApiClient] No token available for request');
    }

    try {
      console.log('[ApiClient] Fetching...');
      const response = await fetch(url, config);
      console.log('[ApiClient] Response received:', response.status, response.statusText);
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          console.error('API Error Response:', errorData);
        } catch (e) {
          console.error('Could not parse error response');
        }
        throw new Error(errorMessage);
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
    
    console.log('[ApiClient] Logging in with email:', email);
    console.log('[ApiClient] Request URL:', '/api/auth/login');
    console.log('[ApiClient] Request body:', JSON.stringify({ email, password: '***' }));
    
    const response = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    console.log('[ApiClient] Login response received:', response);
    
    if (response.token) {
      this.setToken(response.token);
      console.log('[ApiClient] Token set:', response.token.substring(0, 20) + '...');
    } else {
      console.warn('[ApiClient] No token in response');
    }
    
    return response;
  }

  async register(userData) {
    console.log('[ApiClient] Registering user:', { ...userData, password: '***' });
    console.log('[ApiClient] Request URL:', '/api/auth/register');
    
    const response = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    console.log('[ApiClient] Registration response:', response);
    
    if (response.token) {
      this.setToken(response.token);
      console.log('[ApiClient] Token set after registration');
    } else {
      console.warn('[ApiClient] No token in registration response');
    }
    
    return response;
  }

  logout() {
    this.clearToken();
  }

  // Student methods
  async getStudents(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/students${query ? `?${query}` : ''}`);
  }

  async createStudent(studentData) {
    return this.request('/api/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
  }

  async updateStudent(id, studentData) {
    return this.request(`/api/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(studentData),
    });
  }

  async deleteStudent(id) {
    return this.request(`/api/students/${id}`, {
      method: 'DELETE',
    });
  }

  // Task methods
  async getTasks(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/tasks${query ? `?${query}` : ''}`);
  }

  async createTask(taskData) {
    return this.request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async updateTask(id, taskData) {
    return this.request(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  }

  async deleteTask(id) {
    return this.request(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // Time entry methods
  async getTimeEntries(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/time-entries${query ? `?${query}` : ''}`);
  }

  async createTimeEntry(entryData) {
    return this.request('/api/time-entries', {
      method: 'POST',
      body: JSON.stringify(entryData),
    });
  }

  async updateTimeEntry(id, entryData) {
    return this.request(`/api/time-entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(entryData),
    });
  }

  async deleteTimeEntry(id) {
    return this.request(`/api/time-entries/${id}`, {
      method: 'DELETE',
    });
  }

  // Schedule methods
  async getSchedules(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/schedules${query ? `?${query}` : ''}`);
  }

  async createSchedule(scheduleData) {
    return this.request('/api/schedules', {
      method: 'POST',
      body: JSON.stringify(scheduleData),
    });
  }

  async updateSchedule(id, scheduleData) {
    return this.request(`/api/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(scheduleData),
    });
  }

  async deleteSchedule(id) {
    return this.request(`/api/schedules/${id}`, {
      method: 'DELETE',
    });
  }

  // Question methods
  async getQuestions() {
    return this.request('/api/questions');
  }

  async createQuestion(questionData) {
    return this.request('/api/questions', {
      method: 'POST',
      body: JSON.stringify(questionData),
    });
  }

  async updateQuestion(id, questionData) {
    return this.request(`/api/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(questionData),
    });
  }

  async deleteQuestion(id) {
    return this.request(`/api/questions/${id}`, {
      method: 'DELETE',
    });
  }

  // Document methods
  async getDocuments(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/documents${query ? `?${query}` : ''}`);
  }

  async uploadDocument(documentData) {
    return this.request('/api/documents', {
      method: 'POST',
      body: JSON.stringify(documentData),
    });
  }

  async deleteDocument(id) {
    return this.request(`/api/documents/${id}`, {
      method: 'DELETE',
    });
  }

  // File methods
  async uploadFiles(files) {
    const formData = new FormData();
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    return this.request('/api/files/upload', {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData, let browser set it
      },
      body: formData,
    });
  }

  getFileUrl(filename) {
    return `/api/files/${filename}`;
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;