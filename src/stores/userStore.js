import { writable, derived } from 'svelte/store';
import { User, Student } from '../entities/all';
import apiClient from '../api/client';

function createUserStore() {
  const { subscribe, set, update } = writable({
    user: null,
    role: null,
    allStudents: [],
    myStudents: [],
    selectedStudent: null,
    isLoading: true
  });

  return {
    subscribe,
    
    login: async (email, password) => {
      // Use real backend API
      const offlineMode = false;

      if (offlineMode) {
        console.log('Offline mode login with:', email);
        // Determine role from email
        let role = 'student';
        if (email.includes('admin')) {
          role = 'admin';
        } else if (email.includes('mentor')) {
          role = 'mentor';
        }

        localStorage.setItem('offline_role', role);
        localStorage.setItem('auth_token', 'offline-mock-token');
        apiClient.setToken('offline-mock-token');

        return { token: 'offline-mock-token', user: { email, role } };
      }

      try {
        const response = await apiClient.login(email, password);
        console.log('Login successful:', response);
        return response;
      } catch (error) {
        console.error('Login failed:', error);
        throw error;
      }
    },
    
    register: async (userData) => {
      // Use real backend API
      const offlineMode = false;
      
      if (offlineMode) {
        console.log('Offline mode: Simulating registration');
        apiClient.setToken('offline-mock-token');
        return { success: true, token: 'offline-mock-token' };
      }
      
      try {
        const response = await apiClient.register(userData);
        console.log('Registration successful:', response);
        return response;
      } catch (error) {
        console.error('Registration failed:', error);
        throw error;
      }
    },
    
    logout: () => {
      apiClient.logout();
      localStorage.removeItem('offline_role');
      set({
        user: null,
        role: null,
        allStudents: [],
        myStudents: [],
        selectedStudent: null,
        isLoading: false
      });
      // Redirect to login page
      window.location.href = '/';
    },
    
    loadUserAndRole: async () => {
      console.log('loadUserAndRole: CALLED');

      // Use real backend API
      const offlineMode = false;

      if (offlineMode) {
        console.log('Running in offline mode with mock data');
        const storedRole = localStorage.getItem('offline_role') || 'admin';

        const mockUsers = {
          student: { id: 1, email: 'student@example.com', full_name: 'Demo Student', role: 'student', company_id: 1 },
          mentor: { id: 2, email: 'mentor@example.com', full_name: 'Demo Mentor', role: 'mentor', company_id: 1 },
          admin: { id: 3, email: 'admin@example.com', full_name: 'Demo Admin', role: 'admin', company_id: 1 }
        };

        const mockStudents = [
          { id: 1, student_email: 'student@example.com', full_name: 'Demo Student', mentor_email: 'mentor@example.com', contract_hours: 600 },
          { id: 2, student_email: 'john@example.com', full_name: 'John Doe', mentor_email: 'mentor@example.com', contract_hours: 600 },
          { id: 3, student_email: 'jane@example.com', full_name: 'Jane Smith', mentor_email: 'mentor@example.com', contract_hours: 600 }
        ];

        const currentUser = mockUsers[storedRole];
        let allStudents = [], myStudents = [], selectedStudent = null;

        if (storedRole === 'admin') {
          allStudents = mockStudents;
          myStudents = mockStudents;
          selectedStudent = mockStudents[0];
        } else if (storedRole === 'mentor') {
          myStudents = mockStudents.filter(s => s.mentor_email === currentUser.email);
          selectedStudent = myStudents[0] || null;
        } else {
          const studentProfile = mockStudents.find(s => s.student_email === currentUser.email);
          selectedStudent = studentProfile || null;
        }

        set({
          user: currentUser,
          role: storedRole,
          allStudents,
          myStudents,
          selectedStudent,
          isLoading: false
        });
        return;
      }

      try {
        const currentUser = await User.me();
        const userRole = currentUser.role || 'student';

        let allStudents = [], myStudents = [], selectedStudent = null;

        if (userRole === 'admin') {
          allStudents = await Student.list();
          myStudents = allStudents;
          selectedStudent = allStudents[0] || null;
        } else if (userRole === 'mentor') {
          myStudents = await Student.filter({ mentor_email: currentUser.email });
          selectedStudent = myStudents[0] || null;
        } else {
          const studentProfile = await Student.filter({ student_email: currentUser.email });
          selectedStudent = studentProfile[0] || null;
        }

        set({
          user: currentUser,
          role: userRole,
          allStudents,
          myStudents,
          selectedStudent,
          isLoading: false
        });
      } catch (error) {
        console.error("User not logged in", error);
        set({ 
          user: null,
          role: 'public',
          allStudents: [],
          myStudents: [],
          selectedStudent: null,
          isLoading: false 
        });
      }
    },
    
    setSelectedStudent: (student) => {
      update(state => ({ ...state, selectedStudent: student }));
    }
  };
}

export const userStore = createUserStore();
export const isMentor = derived(userStore, $u => $u.role === 'mentor');
export const isStudent = derived(userStore, $u => $u.role === 'student');
export const isAdmin = derived(userStore, $u => $u.role === 'admin');