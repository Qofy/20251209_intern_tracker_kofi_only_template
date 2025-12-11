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
        console.log('Offline mode: Simulating login');
        // In offline mode, just set a mock token and user
        apiClient.setToken('mock_token_offline');
        return { success: true };
      }
      
      // Real API login
      return await apiClient.login(email, password);
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