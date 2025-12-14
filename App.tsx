import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthPage } from './components/AuthPage';
import { PingPage } from './components/PingPage';
import { Spinner } from './components/Spinner';
import { AdminPage } from './components/AdminPage';
import ErrorBoundary from './components/ErrorBoundary';
import { SiteDetailPage } from './components/SiteDetailPage';

const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [search, setSearch] = useState(window.location.search);

  useEffect(() => {
    const handlePopState = () => setSearch(window.location.search);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigateToAdmin = () => {
    console.log("Attempting to navigate to admin page...");
    if (user?.role !== 'admin') {
      console.warn("Access denied: User is not an admin.");
      return;
    }
    const params = new URLSearchParams();
    params.set('admin', 'true');
    const newSearch = `?${params.toString()}`;
    window.history.pushState({}, '', newSearch);
    setSearch(newSearch);
  };
  
  const handleNavigateToSite = (siteUrl: string) => {
    const params = new URLSearchParams();
    params.set('site', encodeURIComponent(siteUrl));
    const newSearch = `?${params.toString()}`;
    window.history.pushState({}, '', newSearch);
    setSearch(newSearch);
  };

  const handleNavigateHome = () => {
    window.history.pushState({}, '', window.location.pathname);
    setSearch('');
  };

  const renderContent = () => {
    const params = new URLSearchParams(search);
    const siteFromUrl = params.get('site');
    const isAdminPage = params.get('admin') === 'true';

    if (loading) {
      return (
        <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center text-text-main">
          <Spinner className="w-10 h-10 text-primary" />
          <p className="mt-4 text-text-secondary">Loading Session...</p>
        </div>
      );
    }
    if (!user) {
      return <AuthPage />;
    }
    if (siteFromUrl) {
      return <SiteDetailPage siteUrl={decodeURIComponent(siteFromUrl)} onNavigateBack={handleNavigateHome} />;
    }
    if (isAdminPage && user.role === 'admin') {
      return <AdminPage onNavigate={handleNavigateHome} />;
    }
    return <PingPage onNavigateToAdmin={handleNavigateToAdmin} onNavigateToSite={handleNavigateToSite} />;
  };

  return (
    <ErrorBoundary>
      {renderContent()}
    </ErrorBoundary>
  );
};

export default App;