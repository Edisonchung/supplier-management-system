// src/components/common/Header.jsx
import React, { useState } from 'react';
import { Menu, Bell, LogOut, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header = ({ toggleMobileMenu }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Sample notifications
  const notifications = [
    { id: 1, message: 'New order received', time: '5 minutes ago', unread: true },
    { id: 2, message: 'Low stock alert: Product ABC', time: '1 hour ago', unread: true },
    { id: 3, message: 'Supplier updated catalog', time: '2 hours ago', unread: false },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header className="fixed top-0 z-50 w-full bg-white border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Menu button and Title */}
          <div className="flex items-center">
            <button
              onClick={toggleMobileMenu}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            {/* Title with proper spacing */}
            <div className="ml-4 lg:ml-0 flex items-center space-x-3">
              {/* Logo */}
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                <span className="text-white font-bold text-sm">HF</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 whitespace-nowrap">
                HiggsFlow
              </h1>
            </div>
          </div>

          {/* Right side - Notifications and User menu */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowUserMenu(false);
                }}
                className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full"
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map(notification => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 hover:bg-gray-50 ${notification.unread ? 'bg-blue-50' : ''}`}
                      >
                        <p className="text-sm text-gray-900">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-gray-200">
                    <button className="text-sm text-blue-600 hover:text-blue-500">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center space-x-3 p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700">
                  {user?.email || 'User'}
                </span>
                <ChevronDown className="hidden md:block h-4 w-4 text-gray-400" />
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm text-gray-900">{user?.email}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  </div>
                  <button
                    onClick={() => {/* Handle profile */}}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showUserMenu || showNotifications) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowUserMenu(false);
            setShowNotifications(false);
          }}
        />
      )}
    </header>
  );
};

export default Header;
