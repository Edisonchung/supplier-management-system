// Mock Firebase Functions
export const mockFirebase = {
  auth: {
    currentUser: null,
    signInWithEmailAndPassword: async (email, password) => {
      const users = [
        { uid: '1', email: 'admin@company.com', role: 'admin', displayName: 'System Administrator' },
        { uid: '2', email: 'manager@company.com', role: 'manager', displayName: 'John Manager' },
        { uid: '3', email: 'employee@company.com', role: 'employee', displayName: 'Jane Employee' },
        { uid: '4', email: 'viewer@company.com', role: 'viewer', displayName: 'Bob Viewer' }
      ];
      
      const user = users.find(u => u.email === email);
      if (user && password === 'password123') {
        mockFirebase.auth.currentUser = user;
        return { user };
      }
      throw new Error('Invalid credentials');
    },
    signOut: async () => {
      mockFirebase.auth.currentUser = null;
    }
  },
  firestore: {
    collection: (name) => ({
      doc: (id) => ({
        set: async (data) => {
          const stored = JSON.parse(localStorage.getItem(name) || '[]');
          const index = stored.findIndex(item => item.id === id);
          if (index >= 0) {
            stored[index] = { ...data, id };
          } else {
            stored.push({ ...data, id });
          }
          localStorage.setItem(name, JSON.stringify(stored));
        },
        update: async (data) => {
          const stored = JSON.parse(localStorage.getItem(name) || '[]');
          const index = stored.findIndex(item => item.id === id);
          if (index >= 0) {
            stored[index] = { ...stored[index], ...data };
            localStorage.setItem(name, JSON.stringify(stored));
          }
        },
        delete: async () => {
          const stored = JSON.parse(localStorage.getItem(name) || '[]');
          const filtered = stored.filter(item => item.id !== id);
          localStorage.setItem(name, JSON.stringify(filtered));
        }
      }),
      get: async () => ({
        docs: JSON.parse(localStorage.getItem(name) || '[]').map(item => ({
          id: item.id,
          data: () => item
        }))
      }),
      add: async (data) => {
        const stored = JSON.parse(localStorage.getItem(name) || '[]');
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        stored.push({ ...data, id });
        localStorage.setItem(name, JSON.stringify(stored));
        return { id };
      }
    })
  }
};
