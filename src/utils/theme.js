// src/utils/theme.js - Dark Mode Optimization Utilities

// =====================================================
// 1. COMMON CLASS COMBINATIONS
// =====================================================

// Base component classes - most commonly used combinations
export const themeClasses = {
  // Cards and containers
  card: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors duration-300",
  cardHover: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md dark:hover:shadow-2xl transition-all duration-300",
  
  // Text styles
  textPrimary: "text-gray-900 dark:text-white transition-colors duration-300",
  textSecondary: "text-gray-600 dark:text-gray-300 transition-colors duration-300",
  textTertiary: "text-gray-500 dark:text-gray-400 transition-colors duration-300",
  textMuted: "text-gray-400 dark:text-gray-500 transition-colors duration-300",
  
  // Backgrounds
  bgPrimary: "bg-white dark:bg-gray-900 transition-colors duration-300",
  bgSecondary: "bg-gray-50 dark:bg-gray-800 transition-colors duration-300",
  bgTertiary: "bg-gray-100 dark:bg-gray-700 transition-colors duration-300",
  
  // Borders
  border: "border-gray-200 dark:border-gray-700",
  borderLight: "border-gray-100 dark:border-gray-800",
  borderHeavy: "border-gray-300 dark:border-gray-600",
  
  // Interactive elements
  hover: "hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200",
  hoverStrong: "hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200",
  
  // Form elements
  input: "bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200",
  label: "text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300",
  
  // Buttons
  btnPrimary: "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200",
  btnSecondary: "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 font-medium px-4 py-2 rounded-lg transition-all duration-200",
  btnGhost: "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 rounded-lg transition-all duration-200",
  
  // Status badges
  badgeSuccess: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800",
  badgeWarning: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800",
  badgeError: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800",
  badgeInfo: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
  badgeGray: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600",
  
  // Navigation
  navItem: "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 rounded-md transition-all duration-200",
  navItemActive: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-md font-medium",
  
  // Modals and overlays
  modal: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl",
  modalOverlay: "bg-black bg-opacity-50 dark:bg-opacity-70",
  
  // Tables
  tableHeader: "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700",
  tableRow: "border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200",
  tableCell: "text-gray-900 dark:text-white",
  tableCellSecondary: "text-gray-600 dark:text-gray-300"
};

// =====================================================
// 2. DYNAMIC CLASS GENERATOR
// =====================================================

/**
 * Generate theme-aware classes dynamically
 * @param {string} component - Component type (card, button, text, etc.)
 * @param {string} variant - Variant (primary, secondary, etc.)
 * @param {string} size - Size (sm, md, lg)
 * @param {object} options - Additional options
 */
export const getThemeClasses = (component, variant = 'default', size = 'md', options = {}) => {
  const baseClasses = {
    card: {
      default: themeClasses.card,
      hover: themeClasses.cardHover,
      flat: "bg-white dark:bg-gray-800 border-0 transition-colors duration-300"
    },
    button: {
      primary: themeClasses.btnPrimary,
      secondary: themeClasses.btnSecondary,
      ghost: themeClasses.btnGhost,
      danger: "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200"
    },
    text: {
      primary: themeClasses.textPrimary,
      secondary: themeClasses.textSecondary,
      tertiary: themeClasses.textTertiary,
      muted: themeClasses.textMuted
    },
    badge: {
      success: themeClasses.badgeSuccess,
      warning: themeClasses.badgeWarning,
      error: themeClasses.badgeError,
      info: themeClasses.badgeInfo,
      gray: themeClasses.badgeGray
    }
  };

  const sizeClasses = {
    button: {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base"
    },
    badge: {
      sm: "px-2 py-0.5 text-xs",
      md: "px-2.5 py-1 text-sm",
      lg: "px-3 py-1.5 text-base"
    }
  };

  let classes = baseClasses[component]?.[variant] || '';
  
  // Add size classes if available
  if (sizeClasses[component]?.[size]) {
    classes = classes.replace(/px-\d+\s+py-[\d.]+|text-\w+/, '') + ' ' + sizeClasses[component][size];
  }
  
  // Add custom classes
  if (options.className) {
    classes += ' ' + options.className;
  }
  
  return classes.trim();
};

// =====================================================
// 3. THEME-AWARE REACT HOOKS
// =====================================================

import { useMemo } from 'react';
import { useDarkMode } from '../hooks/useDarkMode';

/**
 * Hook to get theme-aware classes with memoization
 */
export const useThemeClasses = (component, variant = 'default', size = 'md', deps = []) => {
  const { isDarkMode } = useDarkMode();
  
  return useMemo(() => {
    return getThemeClasses(component, variant, size);
  }, [component, variant, size, isDarkMode, ...deps]);
};

/**
 * Hook to get conditional classes based on theme
 */
export const useThemeConditional = (lightClasses, darkClasses) => {
  const { isDarkMode } = useDarkMode();
  return isDarkMode ? darkClasses : lightClasses;
};

/**
 * Hook to get theme-aware colors as JavaScript values
 */
export const useThemeColors = () => {
  const { isDarkMode } = useDarkMode();
  
  return useMemo(() => ({
    background: {
      primary: isDarkMode ? '#0f172a' : '#ffffff',
      secondary: isDarkMode ? '#1e293b' : '#f9fafb',
      tertiary: isDarkMode ? '#334155' : '#f3f4f6'
    },
    text: {
      primary: isDarkMode ? '#f8fafc' : '#111827',
      secondary: isDarkMode ? '#cbd5e1' : '#6b7280',
      tertiary: isDarkMode ? '#94a3b8' : '#9ca3af'
    },
    border: {
      primary: isDarkMode ? '#334155' : '#e5e7eb',
      secondary: isDarkMode ? '#475569' : '#d1d5db'
    },
    brand: {
      primary: '#3b82f6',
      secondary: '#9333ea',
      success: isDarkMode ? '#34d399' : '#10b981',
      warning: isDarkMode ? '#fbbf24' : '#f59e0b',
      error: isDarkMode ? '#f87171' : '#ef4444'
    }
  }), [isDarkMode]);
};

// =====================================================
// 4. COMPONENT FACTORY FUNCTIONS
// =====================================================

/**
 * Create themed component variants
 */
export const createThemeVariants = (baseComponent, variants) => {
  const ThemedComponent = ({ variant = 'default', size = 'md', className = '', ...props }) => {
    const themeClasses = useThemeClasses(baseComponent, variant, size);
    const combinedClasses = `${themeClasses} ${className}`.trim();
    
    return React.createElement(variants[variant] || 'div', {
      ...props,
      className: combinedClasses
    });
  };
  
  return ThemedComponent;
};

// =====================================================
// 5. PERFORMANCE OPTIMIZATIONS
// =====================================================

/**
 * Memoized theme context value to prevent unnecessary re-renders
 */
export const createMemoizedThemeContext = (isDarkMode, toggleDarkMode, setLightMode, setDarkMode) => {
  return useMemo(() => ({
    isDarkMode,
    toggleDarkMode,
    setLightMode,
    setDarkMode,
    // Add computed values
    theme: isDarkMode ? 'dark' : 'light',
    isLight: !isDarkMode
  }), [isDarkMode, toggleDarkMode, setLightMode, setDarkMode]);
};

/**
 * Preload theme to prevent flash of wrong theme
 */
export const preloadTheme = () => {
  // Check localStorage first
  const saved = localStorage.getItem('darkMode');
  if (saved !== null) {
    const isDark = JSON.parse(saved);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
    return;
  }
  
  // Check system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
  }
};

// =====================================================
// 6. ADVANCED THEME UTILITIES
// =====================================================

/**
 * Theme variants for different use cases
 */
export const themeVariants = {
  default: {
    name: 'Default',
    primary: '#3b82f6',
    secondary: '#9333ea'
  },
  corporate: {
    name: 'Corporate',
    primary: '#475569',
    secondary: '#64748b'
  },
  vibrant: {
    name: 'Vibrant',
    primary: '#e11d48',
    secondary: '#f59e0b'
  },
  nature: {
    name: 'Nature',
    primary: '#059669',
    secondary: '#0d9488'
  }
};

/**
 * Auto theme switching based on time
 */
export const getAutoTheme = () => {
  const hour = new Date().getHours();
  // Dark theme between 7 PM and 7 AM
  return hour >= 19 || hour < 7 ? 'dark' : 'light';
};

/**
 * Accessibility helper for high contrast mode
 */
export const getAccessibilityClasses = (highContrast = false) => {
  if (!highContrast) return '';
  
  return {
    text: 'text-black dark:text-white',
    background: 'bg-white dark:bg-black',
    border: 'border-black dark:border-white border-2'
  };
};

// =====================================================
// 7. COMPONENT SHORTCUTS
// =====================================================

/**
 * Quick component class generators
 */
export const tw = {
  card: (hover = false) => hover ? themeClasses.cardHover : themeClasses.card,
  btn: (variant = 'primary') => themeClasses[`btn${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
  text: (level = 'primary') => themeClasses[`text${level.charAt(0).toUpperCase() + level.slice(1)}`],
  bg: (level = 'primary') => themeClasses[`bg${level.charAt(0).toUpperCase() + level.slice(1)}`],
  badge: (type = 'info') => themeClasses[`badge${type.charAt(0).toUpperCase() + type.slice(1)}`]
};

// =====================================================
// 8. USAGE EXAMPLES (for documentation)
// =====================================================

/*
USAGE EXAMPLES:

// 1. Using predefined classes
import { themeClasses } from '../utils/theme';
<div className={themeClasses.card}>
  <h3 className={themeClasses.textPrimary}>Title</h3>
  <p className={themeClasses.textSecondary}>Description</p>
</div>

// 2. Using dynamic class generator
import { getThemeClasses } from '../utils/theme';
<button className={getThemeClasses('button', 'primary', 'lg')}>
  Click me
</button>

// 3. Using React hooks
import { useThemeClasses } from '../utils/theme';
const MyComponent = () => {
  const cardClasses = useThemeClasses('card', 'hover');
  return <div className={cardClasses}>Content</div>;
};

// 4. Using shortcuts
import { tw } from '../utils/theme';
<div className={tw.card(true)}>
  <span className={tw.badge('success')}>Active</span>
</div>

// 5. Using theme colors in JavaScript
import { useThemeColors } from '../utils/theme';
const MyChart = () => {
  const colors = useThemeColors();
  return <Chart backgroundColor={colors.background.primary} />;
};
*/

export default {
  themeClasses,
  getThemeClasses,
  useThemeClasses,
  useThemeConditional,
  useThemeColors,
  createMemoizedThemeContext,
  preloadTheme,
  themeVariants,
  getAutoTheme,
  getAccessibilityClasses,
  tw
};
