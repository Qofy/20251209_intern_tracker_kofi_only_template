import { writable, derived } from 'svelte/store';
import { User, Student } from '../entities/all';
import apiClient from '../api/client';

function createUserStore() {
  // Load from localStorage on init
  const storedUser = localStorage.getItem('user_data');
  const initialState = storedUser ? JSON.parse(storedUser) : {
    user: null,
    role: null,
    allStudents: [],
    myStudents: [],
    selectedStudent: null,
    isLoading: true
  };

  const { subscribe, set, update } = writable(initialState);

  // Save to localStorage whenever state changes
  const saveToLocalStorage = (state) => {
    localStorage.setItem('user_data', JSON.stringify(state));
  };

  return {
    subscribe,
    
    login: async (email, password) => {
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
      localStorage.removeItem('user_data');
      const state = {
        user: null,
        role: null,
        allStudents: [],
        myStudents: [],
        selectedStudent: null,
        isLoading: false
      };
      set(state);
      // Redirect to login page
      window.location.href = '/';
    },
    
    loadUserAndRole: async () => {
      console.log('loadUserAndRole: CALLED');
      console.log('loadUserAndRole: Checking for auth token...', localStorage.getItem('auth_token') ? 'FOUND' : 'NOT FOUND');

      try {
        console.log('loadUserAndRole: Calling User.me()');
        const currentUser = await User.me();
        console.log('loadUserAndRole: User.me() returned:', currentUser);
        
        const userRole = currentUser.role || 'student';
        console.log('loadUserAndRole: User role:', userRole);

        let allStudents = [], myStudents = [], selectedStudent = null;

        if (userRole === 'admin') {
          console.log('loadUserAndRole: Admin - fetching students for company');
          const companyKey = currentUser.companyKey || currentUser.company_key || currentUser.companyId || currentUser.company_id;
          if (companyKey) {
            // Filter students by company for data isolation
            allStudents = await Student.list({ companyKey: companyKey });
            console.log('loadUserAndRole: Loaded students filtered by company:', companyKey, 'count:', allStudents.length);
          } else {
            // Fallback to all students if no company key
            allStudents = await Student.list();
            console.log('loadUserAndRole: No company key, loaded all students');
          }
          myStudents = allStudents;
          selectedStudent = allStudents[0] || null;
        } else if (userRole === 'mentor') {
          console.log('loadUserAndRole: Mentor - fetching assigned students');
          myStudents = await Student.filter({ mentor_email: currentUser.email });
          selectedStudent = myStudents[0] || null;
        } else {
          console.log('loadUserAndRole: Student - fetching own profile');
          const studentProfile = await Student.filter({ student_email: currentUser.email });
          selectedStudent = studentProfile[0] || null;
        }

        console.log('loadUserAndRole: Setting store state', { user: currentUser, role: userRole, studentsCount: myStudents.length });
        const state = {
          user: currentUser,
          role: userRole,
          allStudents,
          myStudents,
          selectedStudent,
          isLoading: false
        };
        set(state);
        saveToLocalStorage(state);
        console.log('loadUserAndRole: Store state updated successfully');
      } catch (error) {
        console.error("loadUserAndRole: Error occurred:", error);
        console.error("loadUserAndRole: Error details:", error.message, error.stack);
        set({ 
          user: null,
          role: 'public',
          allStudents: [],
          myStudents: [],
          selectedStudent: null,
          isLoading: false 
        });
        console.log('loadUserAndRole: Set role to public due to error');
      }
    },
    
    setSelectedStudent: (student) => {
      update(state => {
        const newState = { ...state, selectedStudent: student };
        saveToLocalStorage(newState);
        return newState;
      });
    },

    setDemoUser: (userType) => {
      const demoUsers = {
        admin: { email: 'admin@example.com', full_name: 'Admin', role: 'admin' },
        mentor: { email: 'mentor@example.com', full_name: 'Mentor', role: 'mentor' },
        student: { email: 'student@example.com', full_name: 'Student', role: 'student' }
      };

      const user = demoUsers[userType];
      localStorage.setItem('auth_token', `demo_${userType}`);
      apiClient.setToken(`demo_${userType}`);
      
      const state = {
        user,
        role: userType,
        allStudents: [],
        myStudents: [],
        selectedStudent: null,
        isLoading: false
      };
      set(state);
      saveToLocalStorage(state);
    }
  };
}

export const userStore = createUserStore();
export const isMentor = derived(userStore, $u => $u.role === 'mentor');
export const isStudent = derived(userStore, $u => $u.role === 'student');
export const isAdmin = derived(userStore, $u => $u.role === 'admin');