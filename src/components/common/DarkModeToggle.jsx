// src/components/common/DarkModeToggle.jsx
import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useDarkMode } from '../../hooks/useDarkMode';

const DarkModeToggle = ({ variant = 'button', showLabel = false }) => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  if (variant === 'dropdown') {
    return (
      <div className="relative">
        <div className="space-y-1">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Theme
          </div>
          <button
            onClick={() => toggleDarkMode()}
            className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <Sun className="h-4 w-4 mr-2" />
            Light Mode
          </button>
          <button
            onClick={() => toggleDarkMode()}
            className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <Moon className="h-4 w-4 mr-2" />
            Dark Mode
          </button>
          <button className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
            <Monitor className="h-4 w-4 mr-2" />
            System
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={toggleDarkMode}
      className="dark-mode-toggle group"
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="relative w-5 h-5">
        {/* Sun icon for light mode */}
        <Sun 
          className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${
            isDarkMode 
              ? 'opacity-0 rotate-90 scale-75' 
              : 'opacity-100 rotate-0 scale-100'
          }`}
        />
        
        {/* Moon icon for dark mode */}
        <Moon 
          className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${
            isDarkMode 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 -rotate-90 scale-75'
          }`}
        />
      </div>
      
      {showLabel && (
        <span className="ml-2 text-sm font-medium">
          {isDarkMode ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
};

// Advanced toggle with three states (light/dark/system)
export const AdvancedDarkModeToggle = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [themeMode, setThemeMode] = React.useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved === null) return 'system';
    return JSON.parse(saved) ? 'dark' : 'light';
  });

  const handleThemeChange = (mode) => {
    setThemeMode(mode);
    
    if (mode === 'system') {
      localStorage.removeItem('darkMode');
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemDark !== isDarkMode) {
        toggleDarkMode();
      }
    } else {
      const newDarkMode = mode === 'dark';
      localStorage.setItem('darkMode', JSON.stringify(newDarkMode));
      if (newDarkMode !== isDarkMode) {
        toggleDarkMode();
      }
    }
  };

  const themes = [
    { id: 'light', icon: Sun, label: 'Light' },
    { id: 'dark', icon: Moon, label: 'Dark' },
    { id: 'system', icon: Monitor, label: 'System' }
  ];

  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 space-x-1">
      {themes.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => handleThemeChange(id)}
          className={`
            relative flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200
            ${themeMode === id
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }
          `}
          title={`Switch to ${label.toLowerCase()} mode`}
        >
          <Icon className="h-4 w-4 mr-1.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
};

export default DarkModeToggle;
