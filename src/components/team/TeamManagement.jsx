// src/components/team/TeamManagement.jsx - Enhanced team management with Firebase
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Mail, 
  Calendar,
  Activity,
  Download,
  Upload,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Clock,
  Building,
  MoreVertical,
  Edit,
  Trash2,
  RefreshCw
} from 'lucide-react';

export default function TeamManagement() {
  const { 
    user, 
    teamMembers, 
    createTeamMember, 
    updateUserRole, 
    deactivateUser,
    resetPassword,
    loadTeamMembers,
    getTeamActivity,
    getUserStats,
    isAdmin,
    canManageUsers
  } = useAuth();

  // State management
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [recentActivity, setRecentActivity] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  // Form state
  const [newMember, setNewMember] = useState({
    email: '',
    displayName: '',
    role: 'viewer',
    department: 'General',
    password: ''
  });

  // Load data on component mount
  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      await loadTeamMembers();
      const activity = await getTeamActivity(20);
      setRecentActivity(activity);
      setUserStats(getUserStats());
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate secure password
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewMember(prev => ({ ...prev, password }));
  };

  // Handle create team member
  const handleCreateMember = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createTeamMember(newMember);
      setShowCreateModal(false);
      setNewMember({
        email: '',
        displayName: '',
        role: 'viewer',
        department: 'General',
        password: ''
      });
      
      // Show success with password info
      alert(`✅ Team member created successfully!\n\nEmail: ${newMember.email}\nPassword: ${newMember.password}\n\n⚠️ Please share these credentials securely.`);
      
      await loadData();
    } catch (error) {
      alert('❌ Failed to create team member: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle role update
  const handleRoleUpdate = async (userId, newRole, newDepartment) => {
    setLoading(true);
    try {
      await updateUserRole(userId, newRole, newDepartment);
      await loadData();
    } catch (error) {
      alert('❌ Failed to update role: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle user deactivation
  const handleDeactivateUser = async (userId, userName) => {
    if (confirm(`⚠️ Are you sure you want to deactivate ${userName}?\n\nThey will lose access to the system immediately.`)) {
      setLoading(true);
      try {
        await deactivateUser(userId);
        await loadData();
      } catch (error) {
        alert('❌ Failed to deactivate user: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle password reset
  const handlePasswordReset = async (email) => {
    if (confirm(`🔄 Send password reset email to ${email}?`)) {
      try {
        await resetPassword(email);
        alert('✅ Password reset email sent successfully!');
      } catch (error) {
        alert('❌ Failed to send reset email: ' + error.message);
      }
    }
  };

  // Export team data
  const exportTeamData = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      teamMembers: teamMembers.map(member => ({
        email: member.email,
        displayName: member.displayName,
        role: member.role,
        department: member.department,
        status: member.status,
        createdAt: member.createdAt?.toISOString(),
        lastLogin: member.lastLogin?.toISOString()
      })),
      statistics: userStats
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `higgsflow-team-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Show user details
  const showUserDetailsModal = (member) => {
    setSelectedUser(member);
    setShowUserDetails(true);
  };

  // Role badge component
  const RoleBadge = ({ role }) => {
    const roleConfig = {
      admin: { color: 'bg-purple-100 text-purple-800', icon: Shield },
      manager: { color: 'bg-blue-100 text-blue-800', icon: Users },
      employee: { color: 'bg-green-100 text-green-800', icon: Users },
      viewer: { color: 'bg-gray-100 text-gray-800', icon: Eye }
    };
    
    const config = roleConfig[role] || roleConfig.viewer;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  // Status badge component
  const StatusBadge = ({ status }) => (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
      status === 'active' 
        ? 'bg-green-100 text-green-800' 
        : 'bg-red-100 text-red-800'
    }`}>
      {status === 'active' ? (
        <CheckCircle className="w-3 h-3 mr-1" />
      ) : (
        <XCircle className="w-3 h-3 mr-1" />
      )}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );

  if (!canManageUsers) {
    return (
      <div className="max-w-2xl mx-auto mt-16 text-center">
        <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">You don't have permission to manage team members.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600 mt-1">Manage team members, roles, and permissions</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowActivityModal(true)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            Activity Log
          </button>
          
          <button
            onClick={exportTeamData}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add Team Member
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {userStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Members</p>
                <p className="text-2xl font-bold text-gray-900">{userStats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">{userStats.active}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Today</p>
                <p className="text-2xl font-bold text-gray-900">{userStats.loggedInToday}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Building className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Departments</p>
                <p className="text-2xl font-bold text-gray-900">{Object.keys(userStats.byDepartment).length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Members Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Team Members</h3>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teamMembers.map((member) => (
                <tr key={member.uid} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {member.photoURL ? (
                        <img src={member.photoURL} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {member.displayName?.charAt(0) || member.email.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{member.displayName}</div>
                        <div className="text-sm text-gray-500">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <RoleBadge role={member.role} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.department || 'General'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={member.status || 'active'} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.lastLogin ? member.lastLogin.toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => showUserDetailsModal(member)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      {member.uid !== user.uid && (
                        <>
                          <button
                            onClick={() => handlePasswordReset(member.email)}
                            className="text-orange-600 hover:text-orange-900 p-1"
                            title="Reset Password"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleDeactivateUser(member.uid, member.displayName)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Deactivate User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Member Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Add Team Member</h3>
            
            <form onSubmit={handleCreateMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newMember.email}
                  onChange={(e) => setNewMember(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="member@company.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <input
                  type="text"
                  value={newMember.displayName}
                  onChange={(e) => setNewMember(prev => ({ ...prev, displayName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newMember.role}
                  onChange={(e) => setNewMember(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="viewer">Viewer</option>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  value={newMember.department}
                  onChange={(e) => setNewMember(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="General"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newMember.password}
                    onChange={(e) => setNewMember(prev => ({ ...prev, password: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
                  >
                    Generate
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">User will be asked to change this on first login</p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">User Details</h3>
              <button
                onClick={() => setShowUserDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Basic Information</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-500">Email:</span> {selectedUser.email}</div>
                  <div><span className="text-gray-500">Name:</span> {selectedUser.displayName}</div>
                  <div><span className="text-gray-500">Role:</span> <RoleBadge role={selectedUser.role} /></div>
                  <div><span className="text-gray-500">Department:</span> {selectedUser.department}</div>
                  <div><span className="text-gray-500">Status:</span> <StatusBadge status={selectedUser.status || 'active'} /></div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Activity</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-500">Joined:</span> {selectedUser.createdAt?.toLocaleDateString()}</div>
                  <div><span className="text-gray-500">Last Login:</span> {selectedUser.lastLogin?.toLocaleString() || 'Never'}</div>
                  <div><span className="text-gray-500">User ID:</span> {selectedUser.uid}</div>
                </div>
              </div>
            </div>
            
            {selectedUser.uid !== user.uid && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex gap-3">
                  <button
                    onClick={() => handlePasswordReset(selectedUser.email)}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                  >
                    Reset Password
                  </button>
                  <button
                    onClick={() => handleDeactivateUser(selectedUser.uid, selectedUser.displayName)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Deactivate User
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activity Log Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Recent Team Activity</h3>
              <button
                onClick={() => setShowActivityModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="text-sm font-medium">{activity.action.replace('_', ' ')}</div>
                      <div className="text-xs text-gray-500">
                        User: {teamMembers.find(m => m.uid === activity.userId)?.displayName || activity.userId}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {activity.timestamp?.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
