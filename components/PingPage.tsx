import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAppSettings } from '../hooks/useAppSettings';
import type { PingResult } from '../types';
import { PingForm } from './PingForm';
import { SiteListCard } from './SiteListCard';
import { SiteDetailView } from './SiteDetailView';
import { LogOut, ShieldCheck, Sun, Moon } from 'lucide-react';
import { Logo } from './Logo';

const USER_LIMIT = 5;
const PREMIUM_LIMIT = 20;

interface PingPageProps {
    onNavigate: (page: 'admin') => void;
}

export const PingPage: React.FC<PingPageProps> = ({ onNavigate }) => {
    const { user, logout, updateUserPings, removeUserPing, savePingResult } = useAuth();
    const { settings, toggleTheme } = useAppSettings();
    const [url, setUrl] = useState('');
    const [groupedResults, setGroupedResults] = useState<Record<string, PingResult[]>>({});
    const [isPinging, setIsPinging] = useState(false);
    const [selectedSite, setSelectedSite] = useState<string | null>(null);


    // Sync initial sites from user profile
    useEffect(() => {
        if (user?.pingedSites.length && Object.keys(groupedResults).length === 0) {
            const initialGroup: Record<string, PingResult[]> = {};
            user.pingedSites.forEach(site => {
                initialGroup[site] = [];
            });
            setGroupedResults(initialGroup);
        }
    }, [user, groupedResults]);


    const handlePing = useCallback(async (targetUrl: string) => {
        if (!user) return;

        let formattedUrl = targetUrl;
        if (!/^https?:\/\//i.test(formattedUrl)) {
            formattedUrl = `https://` + formattedUrl;
        }

        setIsPinging(true);
        const startTime = Date.now();
        let result: PingResult;

        try {
            // Using 'no-cors' allows the request but we can't inspect the response.
            // A successful fetch means the server is reachable.
            await fetch(formattedUrl, { mode: 'no-cors', cache: 'no-cache' });
            
            const responseTime = Date.now() - startTime;

            result = {
                id: crypto.randomUUID(),
                url: formattedUrl,
                status: 'Online',
                responseTime: responseTime,
                timestamp: new Date(),
                statusCode: null, // Cannot be determined with no-cors
                statusText: 'Response received',
            };
            
            if(!user.pingedSites.includes(formattedUrl)) {
              updateUserPings(user.id, formattedUrl);
            }

        } catch (error) {
            const responseTime = Date.now() - startTime;
            result = {
                id: crypto.randomUUID(),
                url: formattedUrl,
                status: 'Error',
                responseTime,
                timestamp: new Date(),
                statusCode: null,
                statusText: 'Network error or DNS failure.',
            };
        }

        savePingResult(result);

        setGroupedResults(prev => ({
            ...prev,
            [formattedUrl]: [result, ...(prev[formattedUrl] || [])]
        }));
        setSelectedSite(formattedUrl);
        setIsPinging(false);
    }, [user, updateUserPings, savePingResult]);
    
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (url.trim() && !isPinging) {
            handlePing(url.trim());
        }
    };

    const handleSiteSelect = (siteUrl: string) => {
        setSelectedSite(siteUrl);
        setUrl(siteUrl);
    };

    const handleRemoveSite = (siteUrl: string) => {
        if (!user) return;
        
        removeUserPing(user.id, siteUrl);

        setGroupedResults(prev => {
            const newResults = { ...prev };
            delete newResults[siteUrl];
            return newResults;
        });

        if (selectedSite === siteUrl) {
            setSelectedSite(null);
            setUrl('');
        }
    };

    const disabledReason = useMemo(() => {
        if (!user) return "You must be logged in.";
        const isExistingSite = user.pingedSites.includes(url) || user.pingedSites.includes(`https://${url}`);
        if (user.role === 'user' && !isExistingSite && user.pingedSites.length >= USER_LIMIT) {
            return `Free users can only track ${USER_LIMIT} unique sites.`;
        }
        if (user.role === 'premium' && !isExistingSite && user.pingedSites.length >= PREMIUM_LIMIT) {
            return `Premium users can track up to ${PREMIUM_LIMIT} sites.`;
        }
        return null;
    }, [user, url]);
    
    const sites = user?.pingedSites || [];

    return (
       <>
        <div className="min-h-screen bg-dark-bg text-text-main font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8 transition-colors duration-300">
            <header className="w-full max-w-7xl mx-auto flex justify-between items-center mb-8">
                 <div className="flex items-center gap-2">
                    <Logo />
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={toggleTheme}
                        className="p-2 text-text-secondary hover:text-primary transition-colors"
                        title={settings.theme === 'cyber' ? 'Switch to Classic' : 'Switch to Cyber'}
                    >
                        {settings.theme === 'cyber' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                    <span className="text-text-secondary hidden sm:inline font-mono text-sm border-r border-slate-700 pr-4">{user?.email}</span>
                    {user?.role === 'admin' && (
                         <button
                            onClick={() => onNavigate('admin')}
                            className="flex items-center gap-2 text-text-secondary hover:text-secondary transition-colors"
                            title="Admin Panel"
                        >
                            <ShieldCheck className="w-5 h-5" />
                            <span className="hidden md:inline uppercase text-xs font-bold tracking-wider">Admin</span>
                        </button>
                    )}
                     <button
                        onClick={logout}
                        className="flex items-center gap-2 text-text-secondary hover:text-red-500 transition-colors"
                        title="Logout"
                    >
                        <LogOut className="w-5 h-5" />
                         <span className="hidden md:inline uppercase text-xs font-bold tracking-wider">Logout</span>
                    </button>
                </div>
            </header>

            <main className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
                <div className="lg:w-1/3 flex flex-col gap-8">
                   <SiteListCard 
                    sites={sites}
                    onSiteSelect={handleSiteSelect}
                    onRemoveSite={handleRemoveSite}
                    userRole={user?.role || 'user'}
                    selectedSite={selectedSite}
                    results={groupedResults}
                    />
                </div>
                 <div className="lg:w-2/3 flex flex-col gap-6">
                    <PingForm
                        url={url}
                        setUrl={setUrl}
                        handleSubmit={handleSubmit}
                        isPinging={isPinging}
                        disabledReason={disabledReason}
                    />
                    {selectedSite ? (
                        <SiteDetailView 
                            key={selectedSite} // Re-mount component on site change
                            siteUrl={selectedSite} 
                            results={groupedResults[selectedSite] || []}
                        />
                    ) : (
                        <div className="bg-light-bg border border-slate-700/50 rounded-lg p-8 h-full flex flex-col justify-center items-center text-center shadow-[0_0_15px_rgba(0,0,0,0.3)]">
                            <h2 className="text-2xl font-bold text-text-main tracking-tight uppercase">Ready to Monitor</h2>
                            <p className="text-text-secondary mt-2 max-w-md">
                                Select a site from the list to view live statistics or input a new URL above to initiate a ping sequence.
                            </p>
                        </div>
                    )}
                 </div>
            </main>
        </div>
        </>
    );
};