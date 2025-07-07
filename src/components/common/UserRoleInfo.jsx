// src/components/common/UserRoleInfo.jsx
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, User, Eye, Settings, Briefcase } from 'lucide-react';

const UserRoleInfo = () => {
  const { user } = useAuth();

  if (!user) return null;

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'manager':
        return <Briefcase className="w-4 h-4" />;
      case 'employee':
        return <Settings className="w-4 h-4" />;
      case 'viewer':
      default:
        return <Eye className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'employee':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'viewer':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleDescription = (role) => {
    switch (role) {
      case 'admin':
        return 'Full system access';
      case 'manager':
        return 'Manage suppliers & orders';
      case 'employee':
        return 'Create & edit records';
      case 'viewer':
      default:
        return 'View-only access';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
        {getRoleIcon(user.role)}
        <span className="ml-1 capitalize">{user.role}</span>
      </div>
      {user.email === 'edisonchung@flowsolution.net' && (
        <div className="text-xs text-purple-600 font-medium">
          Super Admin
        </div>
      )}
    </div>
  );
};

export default UserRoleInfo;

// Role Information Display Component
export const RoleInfoPanel = () => {
  const roles = [
    {
      role: 'admin',
      label: 'Administrator',
      description: 'Full system access, user management, all CRUD operations',
      color: 'purple',
      icon: Shield
    },
    {
      role: 'manager',
      label: 'Manager',
      description: 'Manage suppliers, products, and purchase orders',
      color: 'blue',
      icon: Briefcase
    },
    {
      role: 'employee',
      label: 'Employee',
      description: 'Create and edit products, view suppliers and orders',
      color: 'green',
      icon: Settings
    },
    {
      role: 'viewer',
      label: 'Viewer',
      description: 'View-only access to all modules (default for new users)',
      color: 'gray',
      icon: Eye
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">User Role Permissions</h3>
      <div className="space-y-3">
        {roles.map(({ role, label, description, color, icon: Icon }) => (
          <div key={role} className="flex items-start space-x-3">
            <div className={`p-2 rounded-lg bg-${color}-100`}>
              <Icon className={`w-5 h-5 text-${color}-600`} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">{label}</h4>
              <p className="text-sm text-gray-600">{description}</p>
              {role === 'viewer' && (
                <p className="text-xs text-gray-500 mt-1">
                  * Default role for all new registered users
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
        <p className="text-xs text-purple-800">
          <strong>Note:</strong> edisonchung@flowsolution.net has permanent super admin access.
        </p>
      </div>
    </div>
  );
};
