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
      const offlineMode = import.meta.env.VITE_OFFLINE_MODE === 'true';

      if (offlineMode) {
        console.log('Offline mode login with:', email);
        // Determine role from email
        let role = 'student';
        if (email.includes('admin')) {
          role = 'admin';
        } else if (email.includes('mentor')) {
          role = 'mentor';
        }

        // Store role preference and token for offline mode
        console.log('Login: Setting offline_role =', role);
        localStorage.setItem('offline_role', role);
        console.log('Login: Setting auth_token');
        localStorage.setItem('auth_token', 'offline-mock-token');
        apiClient.setToken('offline-mock-token');
        console.log('Login: Token and role stored in localStorage');

        return { token: 'offline-mock-token', user: { email, role } };
      }

      // Real API login
      const response = await apiClient.login(email, password);
      return response;
    },
    
    register: async (userData) => {
      const offlineMode = import.meta.env.VITE_OFFLINE_MODE === 'true';
      
      if (offlineMode) {
        console.log('Offline mode: Simulating registration');
        apiClient.setToken('mock_token_offline');
        return { success: true };
      }
      
      // Real API registration
      return await apiClient.register(userData);
    },
    
    logout: () => {
      apiClient.logout();
      set({
        user: null,
        role: null,
        allStudents: [],
        myStudents: [],
        selectedStudent: null,
        isLoading: false
      });
    },
    
    loadUserAndRole: async () => {
      update(state => ({ ...state, isLoading: true }));

      // Check for offline mode
      const offlineMode = import.meta.env.VITE_OFFLINE_MODE === 'true';

      if (offlineMode) {
        console.log('Running in offline mode with mock data');
        // Check for stored role preference or default to student
        const storedRole = localStorage.getItem('offline_role') || 'student';

        const mockUsers = {
          student: {
            id: 1,
            email: 'student@example.com',
            full_name: 'Demo Student',
            role: 'student',
            company_id: 1
          },
          mentor: {
            id: 2,
            email: 'mentor@example.com',
            full_name: 'Demo Mentor',
            role: 'mentor',
            company_id: 1
          },
          admin: {
            id: 3,
            email: 'admin@example.com',
            full_name: 'Demo Admin',
            role: 'admin',
            company_id: 1
          }
        };

        const mockStudents = [
          { id: 1, student_email: 'student@example.com', full_name: 'Demo Student', mentor_email: 'mentor@example.com', contract_hours: 600 },
          { id: 2, student_email: 'john@example.com', full_name: 'John Doe', mentor_email: 'mentor@example.com', contract_hours: 600 },
          { id: 3, student_email: 'jane@example.com', full_name: 'Jane Smith', mentor_email: 'mentor@example.com', contract_hours: 600 }
        ];

        const currentUser = mockUsers[storedRole];
        let allStudents = [], myStudents = [], selectedStudent = null;

        console.log('loadUserAndRole: storedRole =', storedRole);
        console.log('loadUserAndRole: currentUser =', currentUser);

        if (storedRole === 'admin') {
          allStudents = mockStudents;
          myStudents = mockStudents;
          selectedStudent = mockStudents[0];
          console.log('loadUserAndRole: Admin - selectedStudent =', selectedStudent);
        } else if (storedRole === 'mentor') {
          myStudents = mockStudents.filter(s => s.mentor_email === currentUser.email);
          selectedStudent = null; // Don't auto-select for mentor
          console.log('loadUserAndRole: Mentor - selectedStudent =', selectedStudent);
        } else {
          const studentProfile = mockStudents.find(s => s.student_email === currentUser.email);
          selectedStudent = studentProfile || null;
          console.log('loadUserAndRole: Student - selectedStudent =', selectedStudent);
        }

        console.log('loadUserAndRole: Final state =', { user: currentUser, role: storedRole, selectedStudent });

        update(state => ({
          ...state,
          user: currentUser,
          role: storedRole,
          allStudents,
          myStudents,
          selectedStudent,
          isLoading: false
        }));
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

        update(state => ({
          ...state,
          user: currentUser,
          role: userRole,
          allStudents,
          myStudents,
          selectedStudent,
          isLoading: false
        }));
      } catch (error) {
        console.error("User not logged in", error);
        update(state => ({ ...state, role: 'public', isLoading: false }));
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