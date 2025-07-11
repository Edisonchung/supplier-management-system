// src/components/admin/EmergencyUserManagement.jsx
import React, { useState, useEffect } from 'react';
import { Users, Shield, UserCheck, UserX, Crown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const EmergencyUserManagement = ({ showNotification }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Only show for edison admin
  if (user?.email !== 'edisonchung@flowsolution.net') {
    return (
      <div className="text-center py-8">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Access denied. Admin only.</p>
      </div>
    );
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Get from Firestore users collection
      const snapshot = await window.firebase.firestore().collection('users').get();
      const userList = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      setUsers(userList);
    } catch (error) {
      console.error('Error loading users:', error);
      showNotification('Error loading users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      await window.firebase.firestore()
        .collection('users')
        .doc(userId)
        .update({ 
          role: newRole,
          updatedAt: new Date().toISOString(),
          updatedBy: user.email
        });
      
      showNotification(`User role updated to ${newRole}`, 'success');
      loadUsers(); // Refresh list
    } catch (error) {
      console.error('Error updating user role:', error);
      showNotification('Error updating user role', 'error');
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await window.firebase.firestore()
        .collection('users')
        .doc(userId)
        .update({ 
          status: newStatus,
          updatedAt: new Date().toISOString(),
          updatedBy: user.email
        });
      
      showNotification(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`, 'success');
      loadUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      showNotification('Error updating user status', 'error');
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'text-red-600 bg-red-100';
      case 'manager': return 'text-blue-600 bg-blue-100';
      case 'employee': return 'text-green-600 bg-green-100';
      case 'viewer': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-2">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage team member roles and access</p>
        </div>
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          <span className="text-sm text-gray-600">Super Admin</span>
        </div>
      </div>

      {/* User List */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Team Members ({users.length})
          </h2>
        </div>
        
        <div className="divide-y">
          {users.map((userItem) => (
            <div key={userItem.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {userItem.displayName || userItem.email}
                    </h3>
                    <p className="text-sm text-gray-600">{userItem.email}</p>
                    {userItem.lastLogin && (
                      <p className="text-xs text-gray-500">
                        Last login: {new Date(userItem.lastLogin).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Role Badge */}
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(userItem.role)}`}>
                    {userItem.role || 'viewer'}
                  </span>

                  {/* Status Toggle */}
                  <button
                    onClick={() => toggleUserStatus(userItem.id, userItem.status)}
                    className={`p-2 rounded-lg ${
                      userItem.status === 'active' 
                        ? 'text-green-600 hover:bg-green-50' 
                        : 'text-gray-400 hover:bg-gray-50'
                    }`}
                    title={userItem.status === 'active' ? 'Deactivate user' : 'Activate user'}
                  >
                    {userItem.status === 'active' ? <UserCheck size={18} /> : <UserX size={18} />}
                  </button>

                  {/* Role Selector */}
                  <select
                    value={userItem.role || 'viewer'}
                    onChange={(e) => updateUserRole(userItem.id, e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={userItem.email === 'edisonchung@flowsolution.net'}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Role Permissions</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li><strong>Admin:</strong> Full system access, user management</li>
          <li><strong>Manager:</strong> Suppliers, Products, Purchase Orders, PIs</li>
          <li><strong>Employee:</strong> Products (view + edit), Dashboard</li>
          <li><strong>Viewer:</strong> Products (view only), Dashboard</li>
        </ul>
      </div>
    </div>
  );
};

export default EmergencyUserManagement;
