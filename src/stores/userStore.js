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
      console.log('loadUserAndRole: Checking for auth token...', localStorage.getItem('auth_token') ? 'FOUND' : 'NOT FOUND');

      try {
        console.log('loadUserAndRole: Calling User.me()');
        const currentUser = await User.me();
        console.log('loadUserAndRole: User.me() returned:', currentUser);
        
        const userRole = currentUser.role || 'student';
        console.log('loadUserAndRole: User role:', userRole);

        let allStudents = [], myStudents = [], selectedStudent = null;

        if (userRole === 'admin') {
          console.log('loadUserAndRole: Admin - fetching all students');
          allStudents = await Student.list();
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
        set({
          user: currentUser,
          role: userRole,
          allStudents,
          myStudents,
          selectedStudent,
          isLoading: false
        });
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
      update(state => ({ ...state, selectedStudent: student }));
    }
  };
}

export const userStore = createUserStore();
export const isMentor = derived(userStore, $u => $u.role === 'mentor');
export const isStudent = derived(userStore, $u => $u.role === 'student');
export const isAdmin = derived(userStore, $u => $u.role === 'admin');