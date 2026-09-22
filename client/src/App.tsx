import React, { useEffect } from 'react';
import { AppRouter } from './router/AppRouter.js';
import { useAuthStore } from './stores/authStore.js';

export const App: React.FC = () => {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return <AppRouter />;
};

export default App;
