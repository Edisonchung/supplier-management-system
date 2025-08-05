// src/components/common/AdvancedDarkModeToggle.jsx - Enhanced with Theme Variants and Auto Theme
import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, Palette, Clock, Eye, Settings, Check, ChevronDown } from 'lucide-react';
import { useDarkMode, useThemeVariant, useAutoTheme, useAccessibility } from '../../hooks/useDarkMode';
import { themeClasses, tw } from '../../utils/theme';

const AdvancedDarkModeToggle = ({ variant = 'button', showLabel = false, showAdvanced = true }) => {
  const { isDarkMode, toggleDarkMode, theme, effectiveTheme } = useDarkMode();
  const { themeVariant, changeThemeVariant, availableVariants, currentVariant } = useThemeVariant();
  const { autoTheme, toggleAutoTheme } = useAutoTheme();
  const { highContrast, toggleHighContrast } = useAccessibility();
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [showThemeVariants, setShowThemeVariants] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
        setShowThemeVariants(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Simple button variant
  if (variant === 'button' && !showAdvanced) {
    return (
      <button
        onClick={toggleDarkMode}
        className="dark-mode-toggle group relative"
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
  }

  // Advanced dropdown variant
  if (variant === 'dropdown' || showAdvanced) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`${tw.btn('secondary')} flex items-center space-x-2 min-w-[120px] justify-between`}
          aria-label="Theme settings"
        >
          <div className="flex items-center space-x-2">
            {autoTheme ? (
              <Clock className="h-4 w-4" />
            ) : isDarkMode ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">
              {autoTheme ? 'Auto' : isDarkMode ? 'Dark' : 'Light'}
            </span>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        {showDropdown && (
          <div className={`${themeClasses.modal} absolute right-0 mt-2 w-80 z-50 p-1`}>
            {/* Theme Mode Section */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className={`${themeClasses.textPrimary} text-sm font-semibold mb-3 flex items-center`}>
                <Sun className="h-4 w-4 mr-2" />
                Theme Mode
              </h3>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => {
                    toggleAutoTheme();
                    if (!autoTheme) setShowDropdown(false);
                  }}
                  className={`${
                    !autoTheme && !isDarkMode
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500'
                      : themeClasses.hover
                  } p-3 rounded-lg text-center transition-all duration-200 flex flex-col items-center space-y-1`}
                >
                  <Sun className="h-5 w-5" />
                  <span className="text-xs font-medium">Light</span>
                </button>
                
                <button
                  onClick={() => {
                    toggleAutoTheme();
                    if (!autoTheme) setShowDropdown(false);
                  }}
                  className={`${
                    !autoTheme && isDarkMode
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500'
                      : themeClasses.hover
                  } p-3 rounded-lg text-center transition-all duration-200 flex flex-col items-center space-y-1`}
                >
                  <Moon className="h-5 w-5" />
                  <span className="text-xs font-medium">Dark</span>
                </button>
                
                <button
                  onClick={() => {
                    if (!autoTheme) toggleAutoTheme();
                    setShowDropdown(false);
                  }}
                  className={`${
                    autoTheme
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500'
                      : themeClasses.hover
                  } p-3 rounded-lg text-center transition-all duration-200 flex flex-col items-center space-y-1`}
                >
                  <Clock className="h-5 w-5" />
                  <span className="text-xs font-medium">Auto</span>
                </button>
              </div>
              
              {autoTheme && (
                <div className={`${themeClasses.bgTertiary} mt-2 p-2 rounded-lg`}>
                  <p className={`${themeClasses.textSecondary} text-xs flex items-center`}>
                    <Clock className="h-3 w-3 mr-1" />
                    Currently: {effectiveTheme === 'dark' ? 'Dark (7PM-7AM)' : 'Light (7AM-7PM)'}
                  </p>
                </div>
              )}
            </div>

            {/* Theme Variants Section */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowThemeVariants(!showThemeVariants)}
                className={`${themeClasses.textPrimary} w-full text-sm font-semibold mb-2 flex items-center justify-between hover:${themeClasses.textSecondary}`}
              >
                <div className="flex items-center">
                  <Palette className="h-4 w-4 mr-2" />
                  Theme Variant
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showThemeVariants ? 'rotate-180' : ''}`} />
              </button>
              
              <div className="flex items-center space-x-2 mb-2">
                <div 
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: currentVariant?.primary }}
                />
                <span className={`${themeClasses.textSecondary} text-sm`}>
                  {currentVariant?.name}
                </span>
              </div>

              {showThemeVariants && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {availableVariants.map((variantKey) => {
                    const variant = require('../../hooks/useDarkMode').themeVariants[variantKey];
                    const isActive = themeVariant === variantKey;
                    
                    return (
                      <button
                        key={variantKey}
                        onClick={() => {
                          changeThemeVariant(variantKey);
                          setShowThemeVariants(false);
                        }}
                        className={`${
                          isActive 
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                            : themeClasses.hover
                        } w-full p-2 rounded-lg flex items-center space-x-3 transition-all duration-200`}
                      >
                        <div className="flex space-x-1">
                          <div 
                            className="w-3 h-3 rounded-full border border-white shadow-sm"
                            style={{ backgroundColor: variant.primary }}
                          />
                          <div 
                            className="w-3 h-3 rounded-full border border-white shadow-sm"
                            style={{ backgroundColor: variant.secondary }}
                          />
                        </div>
                        <span className="text-sm font-medium flex-1 text-left">
                          {variant.name}
                        </span>
                        {isActive && <Check className="h-4 w-4" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Accessibility Section */}
            <div className="p-3">
              <h3 className={`${themeClasses.textPrimary} text-sm font-semibold mb-3 flex items-center`}>
                <Eye className="h-4 w-4 mr-2" />
                Accessibility
              </h3>
              
              <button
                onClick={() => {
                  toggleHighContrast();
                  setShowDropdown(false);
                }}
                className={`${
                  highContrast
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : themeClasses.hover
                } w-full p-2 rounded-lg flex items-center justify-between transition-all duration-200`}
              >
                <div className="flex items-center space-x-2">
                  <Eye className="h-4 w-4" />
                  <span className="text-sm font-medium">High Contrast</span>
                </div>
                {highContrast && <Check className="h-4 w-4" />}
              </button>
              
              <p className={`${themeClasses.textTertiary} text-xs mt-2`}>
                Enhances contrast for better visibility
              </p>
            </div>

            {/* Quick Actions */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    if (autoTheme) toggleAutoTheme();
                    if (isDarkMode) toggleDarkMode();
                    setShowDropdown(false);
                  }}
                  className={`${tw.btn('ghost')} flex-1 text-xs`}
                >
                  Reset to Light
                </button>
                <button
                  onClick={() => setShowDropdown(false)}
                  className={`${tw.btn('primary')} flex-1 text-xs`}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Segmented control variant
  if (variant === 'segmented') {
    return (
      <div className={`${themeClasses.bgTertiary} flex items-center rounded-lg p-1 space-x-1`}>
        <button
          onClick={() => {
            if (autoTheme) toggleAutoTheme();
            if (isDarkMode) toggleDarkMode();
          }}
          className={`${
            !autoTheme && !isDarkMode
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          } relative flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200`}
        >
          <Sun className="h-4 w-4 mr-1.5" />
          <span className="hidden sm:inline">Light</span>
        </button>
        
        <button
          onClick={() => {
            if (autoTheme) toggleAutoTheme();
            if (!isDarkMode) toggleDarkMode();
          }}
          className={`${
            !autoTheme && isDarkMode
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          } relative flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200`}
        >
          <Moon className="h-4 w-4 mr-1.5" />
          <span className="hidden sm:inline">Dark</span>
        </button>
        
        <button
          onClick={() => {
            if (!autoTheme) toggleAutoTheme();
          }}
          className={`${
            autoTheme
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          } relative flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200`}
        >
          <Monitor className="h-4 w-4 mr-1.5" />
          <span className="hidden sm:inline">Auto</span>
        </button>
      </div>
    );
  }

  // Default to simple toggle
  return (
    <button
      onClick={toggleDarkMode}
      className="dark-mode-toggle group"
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="relative w-5 h-5">
        <Sun 
          className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${
            isDarkMode 
              ? 'opacity-0 rotate-90 scale-75' 
              : 'opacity-100 rotate-0 scale-100'
          }`}
        />
        <Moon 
          className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${
            isDarkMode 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 -rotate-90 scale-75'
          }`}
        />
      </div>
    </button>
  );
};

// Simple toggle for minimal use cases
export const SimpleDarkModeToggle = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  
  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDarkMode ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
};

// Theme variant selector
export const ThemeVariantSelector = () => {
  const { themeVariant, changeThemeVariant, availableVariants } = useThemeVariant();
  
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Theme Variant
      </label>
      <div className="grid grid-cols-2 gap-2">
        {availableVariants.map((variantKey) => {
          const variant = require('../../hooks/useDarkMode').themeVariants[variantKey];
          const isActive = themeVariant === variantKey;
          
          return (
            <button
              key={variantKey}
              onClick={() => changeThemeVariant(variantKey)}
              className={`${
                isActive 
                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              } p-3 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-200`}
            >
              <div className="flex items-center space-x-2 mb-1">
                <div 
                  className="w-3 h-3 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: variant.primary }}
                />
                <div 
                  className="w-3 h-3 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: variant.secondary }}
                />
              </div>
              <span className="text-sm font-medium">{variant.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AdvancedDarkModeToggle;
