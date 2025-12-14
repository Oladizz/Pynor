import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAppSettings } from '../hooks/useAppSettings';
import type { PingResult, PingSite, PingFrequency } from '../types';
import { PingForm } from './PingForm';
import { SiteListCard } from './SiteListCard';
import { LogOut, ShieldCheck, Sun, Moon } from 'lucide-react';
import { Logo } from './Logo';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../src/firebase';
import { PingScheduleModal } from './PingScheduleModal';

const USER_LIMIT = 5;
const PREMIUM_LIMIT = 20;

interface PingPageProps {
    onNavigateToAdmin: () => void;
    onNavigateToSite: (siteUrl: string) => void;
}

export const PingPage: React.FC<PingPageProps> = ({ onNavigateToAdmin, onNavigateToSite }) => {
    const { user, logout, updateUserPings, removeUserPing, savePingResult, updateUserRole } = useAuth();
    const { settings, toggleTheme } = useAppSettings();
    const [url, setUrl] = useState('');
    const [isPinging, setIsPinging] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [urlToSchedule, setUrlToSchedule] = useState<string | null>(null);
    const [latestResults, setLatestResults] = useState<Record<string, PingResult>>({});

    // Effect to get the latest ping result for each site for the status dot
    useEffect(() => {
        if (!user || user.pingedSites.length === 0) {
            setLatestResults({});
            return;
        }

        const siteUrls = user.pingedSites.map(s => s.url);
        const q = query(
            collection(db, 'ping_results'),
            where("userId", "==", user.id),
            where("url", "in", siteUrls)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const resultsByUrl: Record<string, PingResult> = {};
            snapshot.forEach(doc => {
                const result = {
                    ...doc.data(),
                    id: doc.id,
                    timestamp: (doc.data().timestamp && doc.data().timestamp.toDate) ? doc.data().timestamp.toDate() : new Date(),
                } as PingResult;

                // If we don't have a result for this URL yet, or if the current one is newer, update it
                if (!resultsByUrl[result.url] || resultsByUrl[result.url].timestamp < result.timestamp) {
                    resultsByUrl[result.url] = result;
                }
            });
            setLatestResults(resultsByUrl);
        });

        return () => unsubscribe();
    }, [user]);

    const functions = getFunctions();
    const callPingFunction = httpsCallable(functions, 'ping');

    const handlePing = useCallback(async (newPingSite: PingSite, isNewSite: boolean) => {
        if (!user) return;

        const targetUrl = newPingSite.url;
        setIsPinging(true);

        try {
            const response = await callPingFunction({ url: targetUrl });
            const data = response.data as PingResult;

            const result: PingResult = {
                id: data.id,
                url: data.url,
                status: data.status,
                responseTime: data.responseTime,
                timestamp: new Date(data.timestamp),
                statusCode: data.statusCode,
                statusText: data.statusText,
            };

            await updateUserPings(user.id, newPingSite);
            await savePingResult(result);
            
            if (isNewSite) {
              onNavigateToSite(targetUrl);
            }

        } catch (error: any) {
            console.error("Error pinging URL via Firebase Function:", error);
            const errorResult: PingResult = {
                id: crypto.randomUUID(),
                url: targetUrl,
                status: 'Error',
                responseTime: null,
                timestamp: new Date(),
                statusCode: null,
                statusText: error.message || 'Unknown error during ping.',
            };
            await savePingResult(errorResult);
            if (isNewSite) {
              await updateUserPings(user.id, newPingSite);
              onNavigateToSite(targetUrl);
            }
        } finally {
            setIsPinging(false);
            setUrl('');
        }
    }, [user, updateUserPings, savePingResult, callPingFunction, onNavigateToSite]);

    const handleInitialPingSubmit = useCallback((submittedUrl: string) => {
        if (!user) return;

        const existingSite = user.pingedSites.find(site => site.url === submittedUrl);

        if (existingSite) {
            handlePing(existingSite, false);
        } else {
            setUrlToSchedule(submittedUrl);
            setShowScheduleModal(true);
        }
    }, [user, handlePing]);

    const handleSaveSchedule = useCallback((frequency: PingFrequency) => {
        if (urlToSchedule && user) {
            const newPingSite: PingSite = { url: urlToSchedule, frequency };
            handlePing(newPingSite, true);
            setUrlToSchedule(null);
            setShowScheduleModal(false);
        }
    }, [urlToSchedule, user, handlePing]);

    const handleRemoveSite = useCallback(async (siteToRemoveUrl: string) => {
        if (!user) return;
        await removeUserPing(user.id, siteToRemoveUrl);
    }, [user, removeUserPing]);

    const disabledReason = useMemo(() => {
        if (!user) return "You must be logged in.";
        const isExistingSite = user.pingedSites.some(site => site.url === url || site.url === `https://${url}`);
        const uniqueSitesCount = user.pingedSites.length;

        if (user.role === 'user' && !isExistingSite && uniqueSitesCount >= USER_LIMIT) {
            return `Free users can only track ${USER_LIMIT} unique sites.`;
        }
        if (user.role === 'premium' && !isExistingSite && uniqueSitesCount >= PREMIUM_LIMIT) {
            return `Premium users can track up to ${PREMIUM_LIMIT} sites.`;
        }
        return null;
    }, [user, url]);

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
                            onClick={onNavigateToAdmin}
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

            <main className="w-full max-w-7xl mx-auto flex flex-col items-center gap-8">
                <div className="w-full text-center">
                    <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-text-secondary mt-2">Monitor your sites with ease.</p>
                </div>

                <PingForm
                    url={url}
                    setUrl={setUrl}
                    onPingSubmit={handleInitialPingSubmit}
                    isPinging={isPinging}
                    disabledReason={disabledReason}
                />
                
                <div className="w-full max-w-4xl">
                   <SiteListCard 
                    sites={user?.pingedSites || []}
                    onSiteSelect={onNavigateToSite}
                    onRemoveSite={handleRemoveSite}
                    userRole={user?.role || 'user'}
                    latestResults={latestResults}
                  />
                </div>
            </main>
            
            <PingScheduleModal
                isOpen={showScheduleModal}
                onClose={() => setShowScheduleModal(false)}
                onSave={handleSaveSchedule}
                initialFrequency={user?.pingedSites.find(s => s.url === urlToSchedule)?.frequency || '5min'}
            />
        </div>
        </>
    );
};