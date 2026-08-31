import React, { useState, useEffect } from 'react';
import ConstructionPlanningInterface from './ConstructionPlanningInterface';
import SystemLogsPage from './SystemLogsPage';
import './App.css';

function App() {
  const [currentPath, setCurrentPath] = useState(() => {
    return window.location.pathname === '/logs' || window.location.hash === '#/logs' ? '/logs' : '/';
  });

  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname === '/logs' || window.location.hash === '#/logs' ? '/logs' : '/';
      setCurrentPath(path);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigateTo = (path) => {
    if (path === '/logs') {
      window.location.hash = '#/logs';
      setCurrentPath('/logs');
    } else {
      window.location.hash = '';
      if (window.location.pathname === '/logs') {
        window.history.pushState({}, '', '/');
      }
      setCurrentPath('/');
    }
  };

  if (currentPath === '/logs') {
    return <SystemLogsPage onNavigateHome={() => navigateTo('/')} />;
  }

  return (
    <ConstructionPlanningInterface onNavigateToLogs={() => navigateTo('/logs')} />
  );
}

export default App;
