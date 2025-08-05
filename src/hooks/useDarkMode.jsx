// src/hooks/useDarkMode.jsx - Optimized with Performance Enhancements
import React, { useState, useEffect, createContext, useContext, useMemo, useCallback } from 'react';

// Create Dark Mode Context
const DarkModeContext = createContext();

// Theme preloader - call this before React renders to prevent flash
export const preloadTheme = () => {
  try {
    // Check localStorage first
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      const isDark = JSON.parse(saved);
      if (isDark) {
        document.documentElement.classList.add('dark');
      }
      return isDark;
    }
    
    // Check system preference
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (systemPrefersDark) {
      document.documentElement.classList.add('dark');
    }
    return systemPrefersDark;
  } catch (error) {
    console.warn('Theme preload failed:', error);
    return false;
  }
};

// Theme variants for advanced theming
export const themeVariants = {
  default: {
    name: 'Default Blue',
    primary: '#3b82f6',
    secondary: '#9333ea',
    accent: '#06b6d4'
  },
  corporate: {
    name: 'Corporate Gray', 
    primary: '#475569',
    secondary: '#64748b',
    accent: '#0f172a'
  },
  vibrant: {
    name: 'Vibrant Red',
    primary: '#e11d48',
    secondary: '#f59e0b',
    accent: '#8b5cf6'
  },
  nature: {
    name: 'Nature Green',
    primary: '#059669',
    secondary: '#0d9488',
    accent: '#84cc16'
  }
};

// Dark Mode Provider Component with Optimizations
export const DarkModeProvider = ({ children }) => {
  // Initialize state with preloaded value to prevent hydration mismatch
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false; // SSR safety
    
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Theme variant state for advanced theming
  const [themeVariant, setThemeVariant] = useState(() => {
    if (typeof window === 'undefined') return 'default';
    return localStorage.getItem('themeVariant') || 'default';
  });

  // Auto theme state for time-based switching
  const [autoTheme, setAutoTheme] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('autoTheme') === 'true';
  });

  // High contrast mode for accessibility
  const [highContrast, setHighContrast] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('highContrast') === 'true';
  });

  // Optimized theme application
  const applyTheme = useCallback((dark, variant = themeVariant, contrast = highContrast) => {
    const root = document.documentElement;
    
    // Apply dark/light mode
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Apply theme variant
    root.setAttribute('data-theme', variant);
    
    // Apply high contrast
    if (contrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Update CSS custom properties for the current variant
    const theme = themeVariants[variant];
    if (theme) {
      root.style.setProperty('--theme-primary', theme.primary);
      root.style.setProperty('--theme-secondary', theme.secondary);
      root.style.setProperty('--theme-accent', theme.accent);
    }
  }, [themeVariant, highContrast]);

  // Auto theme based on time of day
  const getAutoTheme = useCallback(() => {
    const hour = new Date().getHours();
    return hour >= 19 || hour < 7; // Dark between 7 PM and 7 AM
  }, []);

  // Update theme when dependencies change
  useEffect(() => {
    const effectiveTheme = autoTheme ? getAutoTheme() : isDarkMode;
    applyTheme(effectiveTheme, themeVariant, highContrast);
    
    // Save to localStorage
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    localStorage.setItem('themeVariant', themeVariant);
    localStorage.setItem('autoTheme', JSON.stringify(autoTheme));
    localStorage.setItem('highContrast', JSON.stringify(highContrast));
  }, [isDarkMode, themeVariant, autoTheme, highContrast, applyTheme, getAutoTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      // Only auto-switch if user hasn't manually set a preference and auto theme is off
      const saved = localStorage.getItem('darkMode');
      if (saved === null && !autoTheme) {
        setIsDarkMode(e.matches);
      }
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Legacy browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [autoTheme]);

  // Auto theme interval for time-based switching
  useEffect(() => {
    if (!autoTheme) return;

    const checkAutoTheme = () => {
      const shouldBeDark = getAutoTheme();
      if (shouldBeDark !== isDarkMode) {
        setIsDarkMode(shouldBeDark);
      }
    };

    // Check every minute
    const interval = setInterval(checkAutoTheme, 60000);
    return () => clearInterval(interval);
  }, [autoTheme, isDarkMode, getAutoTheme]);

  // Optimized callback functions to prevent unnecessary re-renders
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => !prev);
    setAutoTheme(false); // Disable auto theme when manually toggling
  }, []);

  const setLightMode = useCallback(() => {
    setIsDarkMode(false);
    setAutoTheme(false);
  }, []);

  const setDarkMode = useCallback(() => {
    setIsDarkMode(true);
    setAutoTheme(false);
  }, []);

  const toggleAutoTheme = useCallback(() => {
    setAutoTheme(prev => {
      const newAutoTheme = !prev;
      if (newAutoTheme) {
        // Immediately apply auto theme
        setIsDarkMode(getAutoTheme());
      }
      return newAutoTheme;
    });
  }, [getAutoTheme]);

  const changeThemeVariant = useCallback((variant) => {
    if (themeVariants[variant]) {
      setThemeVariant(variant);
    }
  }, []);

  const toggleHighContrast = useCallback(() => {
    setHighContrast(prev => !prev);
  }, []);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    // Core theme state
    isDarkMode,
    themeVariant,
    autoTheme,
    highContrast,
    
    // Theme actions
    toggleDarkMode,
    setLightMode,
    setDarkMode,
    toggleAutoTheme,
    changeThemeVariant,
    toggleHighContrast,
    
    // Computed values
    theme: isDarkMode ? 'dark' : 'light',
    isLight: !isDarkMode,
    effectiveTheme: autoTheme ? (getAutoTheme() ? 'dark' : 'light') : (isDarkMode ? 'dark' : 'light'),
    
    // Theme variant info
    currentVariant: themeVariants[themeVariant],
    availableVariants: Object.keys(themeVariants),
    
    // Utility functions
    getAutoTheme,
    applyTheme
  }), [
    isDarkMode, 
    themeVariant, 
    autoTheme, 
    highContrast, 
    toggleDarkMode, 
    setLightMode, 
    setDarkMode, 
    toggleAutoTheme, 
    changeThemeVariant, 
    toggleHighContrast,
    getAutoTheme,
    applyTheme
  ]);

  return (
    <DarkModeContext.Provider value={contextValue}>
      {children}
    </DarkModeContext.Provider>
  );
};

// Custom hook to use dark mode with error boundary
export const useDarkMode = () => {
  const context = useContext(DarkModeContext);
  
  if (context === undefined) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  
  return context;
};

// Specialized hooks for specific use cases
export const useTheme = () => {
  const { theme, isDarkMode, isLight } = useDarkMode();
  return { theme, isDarkMode, isLight };
};

export const useThemeVariant = () => {
  const { themeVariant, changeThemeVariant, currentVariant, availableVariants } = useDarkMode();
  return { themeVariant, changeThemeVariant, currentVariant, availableVariants };
};

export const useAutoTheme = () => {
  const { autoTheme, toggleAutoTheme, effectiveTheme, getAutoTheme } = useDarkMode();
  return { autoTheme, toggleAutoTheme, effectiveTheme, getAutoTheme };
};

export const useAccessibility = () => {
  const { highContrast, toggleHighContrast } = useDarkMode();
  return { highContrast, toggleHighContrast };
};

// Theme persistence utility
export const saveThemePreference = (theme, variant = 'default', auto = false, contrast = false) => {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('darkMode', JSON.stringify(theme === 'dark'));
  localStorage.setItem('themeVariant', variant);
  localStorage.setItem('autoTheme', JSON.stringify(auto));
  localStorage.setItem('highContrast', JSON.stringify(contrast));
};

// Theme preference loader
export const loadThemePreference = () => {
  if (typeof window === 'undefined') {
    return { theme: 'light', variant: 'default', auto: false, contrast: false };
  }
  
  try {
    const savedTheme = localStorage.getItem('darkMode');
    const savedVariant = localStorage.getItem('themeVariant');
    const savedAuto = localStorage.getItem('autoTheme');
    const savedContrast = localStorage.getItem('highContrast');
    
    return {
      theme: savedTheme ? (JSON.parse(savedTheme) ? 'dark' : 'light') : 'light',
      variant: savedVariant || 'default',
      auto: savedAuto ? JSON.parse(savedAuto) : false,
      contrast: savedContrast ? JSON.parse(savedContrast) : false
    };
  } catch (error) {
    console.warn('Failed to load theme preference:', error);
    return { theme: 'light', variant: 'default', auto: false, contrast: false };
  }
};

// Export all utilities
export default {
  DarkModeProvider,
  useDarkMode,
  useTheme,
  useThemeVariant,
  useAutoTheme,
  useAccessibility,
  preloadTheme,
  saveThemePreference,
  loadThemePreference,
  themeVariants
};
