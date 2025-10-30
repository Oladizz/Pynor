import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthPage } from './components/AuthPage';
import { PingPage } from './components/PingPage';
import { Spinner } from './components/Spinner';
import { AdminPage } from './components/AdminPage';


type Page = 'dashboard' | 'admin';

const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  const handleNavigate = (page: Page) => {
    if (page === 'admin' && user?.role !== 'admin') {
      console.warn("Access denied: User is not an admin.");
      return;
    }
    setCurrentPage(page);
  }

  if (loading) {
    return (
       <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center text-text-main">
        <Spinner className="w-10 h-10 text-primary" />
        <p className="mt-4 text-text-secondary">Loading Session...</p>
      </div>
    )
  }
  
  if (!user) {
    return <AuthPage />;
  }
  
  if (currentPage === 'admin' && user.role === 'admin') {
    return <AdminPage onNavigate={handleNavigate} />;
  }

  return <PingPage onNavigate={handleNavigate} />;
};

export default App;