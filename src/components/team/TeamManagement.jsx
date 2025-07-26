// src/components/team/TeamManagement.jsx
// Enhanced Team Management with Multi-Company Support

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Shield,
  Eye,
  Activity,
  Download,
  Building2,
  Crown,
  MapPin,
  UserCheck,
  UserX,
  Key,
  ChevronDown,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import companyManagementService from '../../services/companyManagementService';
import {
  getTeamMembers,
  createTeamMember,
  updateUserRole,
  deactivateUser,
  resetPassword,
  exportTeamData,
  getTeamActivity
} from '../../services/teamService';

const TeamManagement = () => {
  // Existing state
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [recentActivity, setRecentActivity] = useState([]);
  const [showActivity, setShowActivity] = useState(false);
  
  // New multi-company state
  const [companies, setCompanies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userCompanyAssignments, setUserCompanyAssignments] = useState({});
  
  const [newMember, setNewMember] = useState({
    email: '',
    displayName: '',
    role: 'viewer',
    department: 'General',
    password: '',
    // New company fields
    companyRole: 'employee',
    companyIds: [],
    branchIds: [],
    isMultiCompanyUser: false
  });

  const { user } = useAuth();
  const permissions = usePermissions();

  useEffect(() => {
    loadData();
    loadCompanyData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [members, activity] = await Promise.all([
        getTeamMembers(),
        getTeamActivity()
      ]);
      
      setTeamMembers(members);
      setRecentActivity(activity);
      
      // Load company assignments for each user
      await loadUserCompanyAssignments(members);
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyData = async () => {
    try {
      const [companiesData, branchesData] = await Promise.all([
        companyManagementService.getAllCompanies(),
        companyManagementService.getAllBranches()
      ]);
      
      setCompanies(companiesData);
      setBranches(branchesData);
    } catch (error) {
      console.error('Error loading company data:', error);
    }
  };

  const loadUserCompanyAssignments = async (members) => {
    try {
      const assignments = {};
      for (const member of members) {
        if (member.email) {
          const assignment = await companyManagementService.getUserAdminAssignment(member.email);
          if (assignment) {
            assignments[member.uid] = assignment;
          }
        }
      }
      setUserCompanyAssignments(assignments);
    } catch (error) {
      console.error('Error loading user company assignments:', error);
    }
  };

  // Enhanced team member creation with company assignment
  const handleCreateMember = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create the basic team member
      await createTeamMember(newMember);
      
      // If this is a multi-company user, create company assignment
      if (newMember.isMultiCompanyUser && newMember.companyIds.length > 0) {
        await companyManagementService.updateAdminAssignment(newMember.email, {
          role: newMember.companyRole,
          companyIds: newMember.companyIds,
          branchIds: newMember.branchIds,
          permissions: getPermissionsForRole(newMember.companyRole),
          assignedDate: new Date().toISOString(),
          assignedBy: user.email,
          badge: getBadgeForRole(newMember.companyRole, newMember.companyIds)
        });
      }
      
      setShowCreateModal(false);
      setNewMember({
        email: '',
        displayName: '',
        role: 'viewer',
        department: 'General',
        password: '',
        companyRole: 'employee',
        companyIds: [],
        branchIds: [],
        isMultiCompanyUser: false
      });
      
      alert(`✅ Team member created successfully!\n\nEmail: ${newMember.email}\nPassword: ${newMember.password}\n\n⚠️ Please share these credentials securely.`);
      
      await loadData();
    } catch (error) {
      alert('❌ Failed to create team member: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Company role management
  const handleManageCompanyAccess = async (member) => {
    setSelectedUser(member);
    setShowCompanyModal(true);
  };

  const handleUpdateCompanyAssignment = async (assignment) => {
    try {
      setLoading(true);
      
      await companyManagementService.updateAdminAssignment(selectedUser.email, {
        ...assignment,
        updatedDate: new Date().toISOString(),
        updatedBy: user.email
      });
      
      await loadData();
      setShowCompanyModal(false);
      alert('✅ Company assignment updated successfully!');
    } catch (error) {
      alert('❌ Failed to update company assignment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for company roles
  const getPermissionsForRole = (role) => {
    const rolePermissions = {
      group_admin: ['view_all', 'edit_all', 'manage_users', 'manage_companies', 'financial_oversight'],
      division_admin: ['view_division', 'edit_division', 'manage_division_users'],
      company_admin: ['view_company', 'edit_company', 'manage_company_users'],
      regional_admin: ['view_region', 'edit_region'],
      employee: ['view_assigned', 'edit_assigned']
    };
    return rolePermissions[role] || ['view_assigned'];
  };

  const getBadgeForRole = (role, companyIds) => {
    const badges = {
      group_admin: `👑 Group CEO - ${companyIds.includes('*') ? 'All' : companyIds.length} Companies`,
      division_admin: `🏢 Division Director - ${companyIds.length} Companies`,
      company_admin: `🏪 Managing Director`,
      regional_admin: `🌍 Regional Manager`,
      employee: `👤 Employee`
    };
    return badges[role] || '👤 Employee';
  };

  // Existing functions with enhancements
  const handleRoleUpdate = async (userId, newRole, currentDepartment) => {
    if (teamMembers.find(m => m.uid === userId)?.email === 'edisonchung@flowsolution.net') {
      alert('⚠️ Cannot modify Edison\'s role - permanent super admin access.');
      return;
    }

    setLoading(true);
    try {
      await updateUserRole(userId, newRole, currentDepartment);
      await loadData();
      alert(`✅ Role updated successfully to ${newRole.charAt(0).toUpperCase() + newRole.slice(1)}`);
    } catch (error) {
      alert('❌ Failed to update role: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDepartmentUpdate = async (userId, currentRole, newDepartment) => {
    if (!newDepartment.trim()) {
      alert('⚠️ Department cannot be empty');
      return;
    }

    setLoading(true);
    try {
      await updateUserRole(userId, currentRole, newDepartment.trim());
      await loadData();
      alert(`✅ Department updated successfully to ${newDepartment}`);
    } catch (error) {
      alert('❌ Failed to update department: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateUser = async (userId, userName) => {
    if (confirm(`⚠️ Are you sure you want to deactivate ${userName}?\n\nThey will lose access to the system immediately.`)) {
      setLoading(true);
      try {
        await deactivateUser(userId);
        await loadData();
        alert(`✅ User ${userName} has been deactivated`);
      } catch (error) {
        alert('❌ Failed to deactivate user: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePasswordReset = async (email) => {
    if (confirm(`🔄 Send password reset email to ${email}?`)) {
      try {
        await resetPassword(email);
        alert('✅ Password reset email sent successfully!');
      } catch (error) {
        alert('❌ Failed to send password reset: ' + error.message);
      }
    }
  };

  const exportData = async () => {
    try {
      await exportTeamData(teamMembers);
      alert('✅ Team data exported successfully!');
    } catch (error) {
      alert('❌ Failed to export data: ' + error.message);
    }
  };

  // Company Badge Component
  const CompanyBadge = ({ assignment }) => {
    if (!assignment) return null;

    const getCompanyNames = (companyIds) => {
      if (companyIds.includes('*')) return 'All Companies';
      return companyIds.map(id => {
        const company = companies.find(c => c.id === id);
        return company?.code || id;
      }).join(', ');
    };

    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
        <Crown className="w-3 h-3" />
        <span>{assignment.badge || assignment.role}</span>
        {assignment.companyIds && (
          <span className="text-blue-600">
            ({getCompanyNames(assignment.companyIds)})
          </span>
        )}
      </div>
    );
  };

  // Company Assignment Modal
  const CompanyAssignmentModal = () => {
    const [formData, setFormData] = useState({
      role: 'employee',
      companyIds: [],
      branchIds: [],
      permissions: []
    });

    useEffect(() => {
      if (selectedUser) {
        const assignment = userCompanyAssignments[selectedUser.uid];
        if (assignment) {
          setFormData({
            role: assignment.role || 'employee',
            companyIds: assignment.companyIds || [],
            branchIds: assignment.branchIds || [],
            permissions: assignment.permissions || []
          });
        }
      }
    }, [selectedUser]);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              Manage Company Access - {selectedUser?.displayName}
            </h3>
            <button
              onClick={() => setShowCompanyModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* Company Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({
                  ...formData,
                  role: e.target.value,
                  permissions: getPermissionsForRole(e.target.value)
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="employee">👤 Employee</option>
                <option value="company_admin">🏪 Company Admin</option>
                <option value="regional_admin">🌍 Regional Admin</option>
                <option value="division_admin">🏢 Division Admin</option>
                {permissions.isGroupAdmin && (
                  <option value="group_admin">👑 Group Admin</option>
                )}
              </select>
            </div>

            {/* Company Access */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Access
              </label>
              <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.companyIds.includes('*')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, companyIds: ['*'], branchIds: ['*'] });
                        } else {
                          setFormData({ ...formData, companyIds: [], branchIds: [] });
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="font-medium">All Companies</span>
                  </label>
                  
                  {companies.map(company => (
                    <label key={company.id} className="flex items-center ml-4">
                      <input
                        type="checkbox"
                        checked={formData.companyIds.includes(company.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              companyIds: [...formData.companyIds.filter(id => id !== '*'), company.id]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              companyIds: formData.companyIds.filter(id => id !== company.id)
                            });
                          }
                        }}
                        disabled={formData.companyIds.includes('*')}
                        className="mr-2"
                      />
                      <Building2 className="w-4 h-4 mr-1 text-blue-600" />
                      <span>{company.name} ({company.code})</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Permissions Preview */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permissions
              </label>
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="flex flex-wrap gap-2">
                  {formData.permissions.map(permission => (
                    <span
                      key={permission}
                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                    >
                      {permission.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => handleUpdateCompanyAssignment(formData)}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Assignment'}
              </button>
              <button
                onClick={() => setShowCompanyModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading && teamMembers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading team data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600">Manage team members, roles, and company access</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* User Badge */}
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
            <Crown className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              {permissions.userBadge}
            </span>
          </div>
          
          <button
            onClick={() => setShowActivity(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Activity className="w-4 h-4" />
            Activity
          </button>
          
          <button
            onClick={exportData}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          
          {permissions.canManageUsers && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Member
            </button>
          )}
        </div>
      </div>

      {/* Team Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Members</p>
              <p className="text-2xl font-bold text-gray-900">{teamMembers.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <Crown className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">Multi-Company Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.keys(userCompanyAssignments).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">Companies</p>
              <p className="text-2xl font-bold text-gray-900">{companies.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <UserCheck className="w-8 h-8 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {teamMembers.filter(m => m.status !== 'inactive').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Members Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  System Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company Access
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teamMembers.map((member) => (
                <tr key={member.uid} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {member.displayName?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {member.displayName}
                        </div>
                        <div className="text-sm text-gray-500">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={member.role || 'viewer'}
                      onChange={(e) => handleRoleUpdate(member.uid, e.target.value, member.department)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                      disabled={loading || member.email === 'edisonchung@flowsolution.net'}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      value={member.department || 'General'}
                      onBlur={(e) => {
                        if (e.target.value !== (member.department || 'General')) {
                          handleDepartmentUpdate(member.uid, member.role, e.target.value);
                        }
                      }}
                      onKeyPress={(e) => e.key === 'Enter' && e.target.blur()}
                      className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    />
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <CompanyBadge assignment={userCompanyAssignments[member.uid]} />
                      {permissions.canManageUsers && (
                        <button
                          onClick={() => handleManageCompanyAccess(member)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          <Building2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      member.status === 'inactive' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {member.status === 'inactive' ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePasswordReset(member.email)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Reset Password"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      
                      {permissions.canManageUsers && member.email !== 'edisonchung@flowsolution.net' && (
                        <button
                          onClick={() => handleDeactivateUser(member.uid, member.displayName)}
                          className="text-red-600 hover:text-red-800"
                          title="Deactivate User"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Member Modal - Enhanced with Company Assignment */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Team Member</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateMember} className="space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newMember.email}
                    onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={newMember.displayName}
                    onChange={(e) => setNewMember({...newMember, displayName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    System Role
                  </label>
                  <select
                    value={newMember.role}
                    onChange={(e) => setNewMember({...newMember, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={newMember.department}
                    onChange={(e) => setNewMember({...newMember, department: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Engineering, Sales, Admin"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temporary Password *
                </label>
                <input
                  type="text"
                  value={newMember.password}
                  onChange={(e) => setNewMember({...newMember, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Generate a secure temporary password"
                  required
                />
              </div>

              {/* Multi-Company Assignment */}
              <div className="border-t pt-4">
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="isMultiCompanyUser"
                    checked={newMember.isMultiCompanyUser}
                    onChange={(e) => setNewMember({...newMember, isMultiCompanyUser: e.target.checked})}
                    className="mr-2"
                  />
                  <label htmlFor="isMultiCompanyUser" className="text-sm font-medium text-gray-700">
                    Grant Multi-Company Access
                  </label>
                </div>

                {newMember.isMultiCompanyUser && (
                  <div className="space-y-3 bg-blue-50 p-4 rounded-md">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Role
                      </label>
                      <select
                        value={newMember.companyRole}
                        onChange={(e) => setNewMember({...newMember, companyRole: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="employee">👤 Employee</option>
                        <option value="company_admin">🏪 Company Admin</option>
                        <option value="regional_admin">🌍 Regional Admin</option>
                        <option value="division_admin">🏢 Division Admin</option>
                        {permissions.isGroupAdmin && (
                          <option value="group_admin">👑 Group Admin</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Access
                      </label>
                      <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2 bg-white">
                        <div className="space-y-1">
                          {companies.map(company => (
                            <label key={company.id} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={newMember.companyIds.includes(company.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewMember({
                                      ...newMember,
                                      companyIds: [...newMember.companyIds, company.id]
                                    });
                                  } else {
                                    setNewMember({
                                      ...newMember,
                                      companyIds: newMember.companyIds.filter(id => id !== company.id)
                                    });
                                  }
                                }}
                                className="mr-2"
                              />
                              <Building2 className="w-4 h-4 mr-1 text-blue-600" />
                              <span className="text-sm">{company.name} ({company.code})</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Member'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Company Assignment Modal */}
      {showCompanyModal && <CompanyAssignmentModal />}

      {/* Activity Modal - Existing */}
      {showActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recent Team Activity</h3>
              <button
                onClick={() => setShowActivity(false)}
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

      {/* Enhanced Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">💡 Team Management Guide</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <ul className="space-y-1">
            <li><strong>System Role:</strong> Click dropdown to change basic permissions</li>
            <li><strong>Department:</strong> Click field to edit, press Enter to save</li>
            <li><strong>Company Access:</strong> Click building icon to manage company permissions</li>
          </ul>
          <ul className="space-y-1">
            <li><strong>Multi-Company Users:</strong> Can access multiple companies with specific roles</li>
            <li><strong>Protection:</strong> Edison's account cannot be modified</li>
            <li><strong>Company Roles:</strong> Group/Division/Company/Regional admin levels available</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TeamManagement;
