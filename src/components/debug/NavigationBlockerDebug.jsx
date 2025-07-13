// TEMPORARY DEBUG COMPONENT - Add this to test navigation blocking
// Place this in src/components/debug/NavigationBlockerDebug.jsx

import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const NavigationBlockerDebug = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🔍 NAVIGATION DEBUG - Current location:', location.pathname);
    
    // Test if navigation actually works
    const testNavigation = () => {
      console.log('🚀 Testing programmatic navigation...');
      
      // Try to navigate programmatically
      setTimeout(() => {
        console.log('⏰ Attempting navigation to /dashboard...');
        navigate('/dashboard');
      }, 2000);
    };

    // Run the test
    testNavigation();

    // Listen for beforeunload events
    const handleBeforeUnload = (e) => {
      console.log('⚠️ Before unload triggered');
    };

    // Listen for popstate events
    const handlePopstate = (e) => {
      console.log('🔄 Popstate event triggered:', e);
    };

    // Check for any blocking event listeners
    const checkBlockingListeners = () => {
      console.log('🔍 Checking for blocking listeners...');
      
      // Check for common blocking patterns
      const events = ['beforeunload', 'unload', 'popstate'];
      events.forEach(eventType => {
        const listeners = window.getEventListeners ? window.getEventListeners(window)[eventType] : [];
        if (listeners && listeners.length > 0) {
          console.warn(`⚠️ Found ${eventType} listeners:`, listeners);
        }
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopstate);
    
    checkBlockingListeners();

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopstate);
    };
  }, [location, navigate]);

  return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
      <h2 className="text-xl font-bold text-red-800 mb-4">🔍 Navigation Debug Mode</h2>
      
      <div className="space-y-3 text-sm">
        <p><strong>Current path:</strong> {location.pathname}</p>
        <p><strong>Search:</strong> {location.search || 'none'}</p>
        <p><strong>Hash:</strong> {location.hash || 'none'}</p>
        
        <div className="bg-yellow-100 p-3 rounded border border-yellow-300">
          <p className="font-medium text-yellow-800">Test Instructions:</p>
          <ol className="list-decimal list-inside mt-2 text-yellow-700">
            <li>Watch the browser console for debug messages</li>
            <li>Try clicking navigation links</li>
            <li>Check if automatic navigation happens in 2 seconds</li>
            <li>Use browser back/forward buttons</li>
          </ol>
        </div>

        <div className="flex gap-2 mt-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Test Navigate to Dashboard
          </button>
          <button 
            onClick={() => navigate('/suppliers')}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
          >
            Test Navigate to Suppliers
          </button>
          <button 
            onClick={() => window.history.back()}
            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
          >
            Test Browser Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NavigationBlockerDebug;
