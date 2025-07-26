// src/services/teamService.js
// Team Management Service with Multi-Company Support

import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { toast } from 'react-hot-toast';

// Get all team members
export const getTeamMembers = async () => {
  try {
    const q = query(
      collection(db, 'users'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const members = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data(),
      id: doc.id
    }));
    
    console.log(`📥 Loaded ${members.length} team members`);
    return members;
  } catch (error) {
    console.error('Error fetching team members:', error);
    // Fallback to localStorage if Firestore fails
    try {
      const localMembers = JSON.parse(localStorage.getItem('teamMembers') || '[]');
      console.log(`📥 Fallback: Loaded ${localMembers.length} team members from localStorage`);
      return localMembers;
    } catch (localError) {
      console.error('Error loading from localStorage:', localError);
      return [];
    }
  }
};

// Create new team member
export const createTeamMember = async (memberData) => {
  try {
    // Generate a temporary password if not provided
    const tempPassword = memberData.password || generateTempPassword();
    
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      memberData.email, 
      tempPassword
    );
    
    // Update user profile
    await updateProfile(userCredential.user, {
      displayName: memberData.displayName
    });
    
    // Store user data in Firestore
    await addDoc(collection(db, 'users'), {
      uid: userCredential.user.uid,
      email: memberData.email,
      displayName: memberData.displayName,
      role: memberData.role || 'viewer',
      department: memberData.department || 'General',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: auth.currentUser?.uid || 'system'
    });
    
    console.log(`✅ Team member created: ${memberData.email}`);
    return { success: true, tempPassword };
    
  } catch (error) {
    console.error('Error creating team member:', error);
    
    // Fallback to localStorage for demo purposes
    try {
      const members = JSON.parse(localStorage.getItem('teamMembers') || '[]');
      const newMember = {
        uid: `user-${Date.now()}`,
        id: `user-${Date.now()}`,
        email: memberData.email,
        displayName: memberData.displayName,
        role: memberData.role || 'viewer',
        department: memberData.department || 'General',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      members.push(newMember);
      localStorage.setItem('teamMembers', JSON.stringify(members));
      
      console.log(`✅ Team member created in localStorage: ${memberData.email}`);
      return { success: true, tempPassword: memberData.password };
      
    } catch (localError) {
      console.error('Error saving to localStorage:', localError);
      throw new Error('Failed to create team member: ' + error.message);
    }
  }
};

// Update user role and department
export const updateUserRole = async (userId, role, department) => {
  try {
    // Try to update in Firestore first
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      role: role,
      department: department,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.uid || 'system'
    });
    
    console.log(`✅ User role updated in Firestore: ${userId}`);
    return { success: true };
    
  } catch (error) {
    console.error('Error updating user role in Firestore:', error);
    
    // Fallback to localStorage
    try {
      const members = JSON.parse(localStorage.getItem('teamMembers') || '[]');
      const memberIndex = members.findIndex(m => m.uid === userId || m.id === userId);
      
      if (memberIndex !== -1) {
        members[memberIndex] = {
          ...members[memberIndex],
          role: role,
          department: department,
          updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem('teamMembers', JSON.stringify(members));
        console.log(`✅ User role updated in localStorage: ${userId}`);
        return { success: true };
      } else {
        throw new Error('User not found');
      }
      
    } catch (localError) {
      console.error('Error updating in localStorage:', localError);
      throw new Error('Failed to update user role: ' + error.message);
    }
  }
};

// Deactivate user
export const deactivateUser = async (userId) => {
  try {
    // Try to update in Firestore first
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      status: 'inactive',
      deactivatedAt: serverTimestamp(),
      deactivatedBy: auth.currentUser?.uid || 'system'
    });
    
    console.log(`✅ User deactivated in Firestore: ${userId}`);
    return { success: true };
    
  } catch (error) {
    console.error('Error deactivating user in Firestore:', error);
    
    // Fallback to localStorage
    try {
      const members = JSON.parse(localStorage.getItem('teamMembers') || '[]');
      const memberIndex = members.findIndex(m => m.uid === userId || m.id === userId);
      
      if (memberIndex !== -1) {
        members[memberIndex] = {
          ...members[memberIndex],
          status: 'inactive',
          deactivatedAt: new Date().toISOString()
        };
        
        localStorage.setItem('teamMembers', JSON.stringify(members));
        console.log(`✅ User deactivated in localStorage: ${userId}`);
        return { success: true };
      } else {
        throw new Error('User not found');
      }
      
    } catch (localError) {
      console.error('Error deactivating in localStorage:', localError);
      throw new Error('Failed to deactivate user: ' + error.message);
    }
  }
};

// Send password reset email
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    console.log(`✅ Password reset email sent to: ${email}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    
    // For demo purposes, just log the action
    console.log(`📧 Demo: Password reset would be sent to ${email}`);
    return { success: true, demo: true };
  }
};

// Export team data
export const exportTeamData = async (teamMembers) => {
  try {
    // Create CSV content
    const headers = ['Name', 'Email', 'Role', 'Department', 'Status', 'Created Date'];
    const csvContent = [
      headers.join(','),
      ...teamMembers.map(member => [
        `"${member.displayName || ''}"`,
        `"${member.email || ''}"`,
        `"${member.role || ''}"`,
        `"${member.department || ''}"`,
        `"${member.status || 'active'}"`,
        `"${member.createdAt ? new Date(member.createdAt).toLocaleDateString() : ''}"`
      ].join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `team-members-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ Team data exported successfully');
    return { success: true };
  } catch (error) {
    console.error('Error exporting team data:', error);
    throw new Error('Failed to export team data: ' + error.message);
  }
};

// Get team activity (mock implementation)
export const getTeamActivity = async () => {
  try {
    // Try to get activity from Firestore
    const q = query(
      collection(db, 'activityLogs'),
      orderBy('timestamp', 'desc'),
      // limit(20) // Uncomment when you add limit import
    );
    
    const snapshot = await getDocs(q);
    const activities = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
    }));
    
    console.log(`📊 Loaded ${activities.length} activity logs`);
    return activities;
    
  } catch (error) {
    console.error('Error fetching team activity:', error);
    
    // Fallback to mock data
    const mockActivity = [
      {
        id: '1',
        action: 'user_login',
        userId: 'user-1',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        details: 'User logged in'
      },
      {
        id: '2', 
        action: 'role_updated',
        userId: 'user-2',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        details: 'Role changed to manager'
      },
      {
        id: '3',
        action: 'user_created',
        userId: 'user-3',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        details: 'New user account created'
      }
    ];
    
    console.log('📊 Using mock activity data');
    return mockActivity;
  }
};

// Log team activity
export const logTeamActivity = async (action, userId, details = '') => {
  try {
    await addDoc(collection(db, 'activityLogs'), {
      action,
      userId,
      details,
      timestamp: serverTimestamp(),
      performedBy: auth.currentUser?.uid || 'system'
    });
    
    console.log(`📝 Activity logged: ${action} for user ${userId}`);
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw error for logging failures
  }
};

// Helper function to generate temporary password
const generateTempPassword = () => {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  // Ensure at least one of each required character type
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.charAt(Math.floor(Math.random() * 26)); // Uppercase
  password += 'abcdefghijklmnopqrstuvwxyz'.charAt(Math.floor(Math.random() * 26)); // Lowercase  
  password += '0123456789'.charAt(Math.floor(Math.random() * 10)); // Number
  password += '!@#$%^&*'.charAt(Math.floor(Math.random() * 8)); // Special char
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Initialize demo data if needed
export const initializeDemoTeamData = () => {
  try {
    const existingMembers = localStorage.getItem('teamMembers');
    if (!existingMembers) {
      const demoMembers = [
        {
          uid: 'demo-admin',
          id: 'demo-admin',
          email: 'admin@company.com',
          displayName: 'System Administrator',
          role: 'admin',
          department: 'IT',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          uid: 'demo-manager',
          id: 'demo-manager',
          email: 'manager@company.com',
          displayName: 'Project Manager',
          role: 'manager',
          department: 'Operations',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          uid: 'demo-employee',
          id: 'demo-employee',
          email: 'employee@company.com',
          displayName: 'Team Member',
          role: 'employee',
          department: 'Sales',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      
      localStorage.setItem('teamMembers', JSON.stringify(demoMembers));
      console.log('✅ Demo team data initialized');
    }
  } catch (error) {
    console.error('Error initializing demo team data:', error);
  }
};

// Initialize demo data on service load
if (typeof window !== 'undefined') {
  initializeDemoTeamData();
}
