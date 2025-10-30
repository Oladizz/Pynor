import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { User, UserRole, LandingPageContent, AnimationStyle } from '../types';
import { useAppSettings } from '../hooks/useAppSettings';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { Spinner } from './Spinner';
import { UserIcon } from './icons/UserIcon';
import { Cog6ToothIcon } from './icons/Cog6ToothIcon';
import { Squares2X2Icon } from './icons/Squares2X2Icon';
import { DoughnutChart } from './charts/DoughnutChart';
import { BarChart } from './charts/BarChart';


type AdminView = 'dashboard' | 'users' | 'settings';

const StatCard: React.FC<{ label: string; value: string | number; }> = ({ label, value }) => (
    <div className="bg-light-bg border border-slate-700 p-4 rounded-lg text-center shadow-lg flex flex-col justify-center">
        <p className="text-xs sm:text-sm text-text-secondary uppercase tracking-wider">{label}</p>
        <p className="text-2xl sm:text-3xl font-bold font-mono mt-2 text-text-main">{value}</p>
    </div>
);

const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
    const roleClasses = {
        admin: 'bg-red-500/20 text-red-400',
        premium: 'bg-yellow-500/20 text-yellow-400',
        user: 'bg-blue-500/20 text-blue-400',
    };
    return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleClasses[role]}`}>
            {role}
        </span>
    );
};

const BottomNavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center gap-1 w-full pt-2 pb-1 transition-colors ${
            isActive ? 'text-primary' : 'text-text-secondary hover:text-text-main'
        }`}
    >
        {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
        <span className="text-xs font-medium">{label}</span>
    </button>
);


export const AdminPage: React.FC<{ onNavigate: (page: 'dashboard') => void }> = ({ onNavigate }) => {
    const { getAllUsers, deleteUser, updateUserRole, getAllPingResults } = useAuth();
    const { settings, updateLogoUrl, updateLandingContent, updateAnimationStyle } = useAppSettings();

    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [adminView, setAdminView] = useState<AdminView>('dashboard');

    // State for settings form
    const [logoUrl, setLogoUrl] = useState(settings.logoUrl);
    const [landingContent, setLandingContent] = useState<LandingPageContent>(settings.landingContent);
    const [animationStyle, setAnimationStyle] = useState<AnimationStyle>(settings.animationStyle);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const users = getAllUsers();
        setAllUsers(users);
    }, [getAllUsers, refreshTrigger]);
    
    useEffect(() => {
        setLogoUrl(settings.logoUrl);
        setLandingContent(settings.landingContent);
        setAnimationStyle(settings.animationStyle);
    }, [settings]);

    const stats = useMemo(() => {
        const allPingResults = getAllPingResults();
        const pingCount = allPingResults.length;

        const usersByRole = allUsers.reduce((acc, user) => {
            acc[user.role] = (acc[user.role] || 0) + 1;
            return acc;
        }, { admin: 0, premium: 0, user: 0 } as Record<UserRole, number>);

        const siteCounts = allPingResults
            .reduce((acc, result) => {
                acc[result.url] = (acc[result.url] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

        const topSites = Object.entries(siteCounts)
            .sort((a, b) => (b[1] as number) - (a[1] as number))
            .slice(0, 5)
            .map(([url, count]) => ({ url, count }));
        
        const onlinePings = allPingResults.filter(p => p.status === 'Online').length;
        const successRate = pingCount > 0 ? (onlinePings / pingCount) * 100 : 100;
        
        // Uptime is essentially the success rate of pings in this app's context
        const averageUptime = successRate;

        return {
            totalUsers: allUsers.length,
            pingCount,
            usersByRole,
            topSites,
            successRate: successRate.toFixed(1) + '%',
            averageUptime: averageUptime.toFixed(2) + '%',
        };
    }, [allUsers, getAllPingResults]);

    const userRoleData = useMemo(() => {
        const roleColors: Record<UserRole, string> = {
            admin: '#ef4444', // red-500
            premium: '#eab308', // yellow-500
            user: '#3b82f6', // blue-500
        };
        return (Object.entries(stats.usersByRole) as [UserRole, number][])
            .filter(([, count]) => count > 0)
            .map(([role, count]) => ({
                label: role,
                value: count,
                color: roleColors[role] || '#64748b' // slate-500
            }));
    }, [stats.usersByRole]);

    const topSitesData = useMemo(() => {
        return stats.topSites.map(site => ({
            label: site.url.replace(/^https?:\/\//, ''), // clean up url for display
            value: site.count,
        }));
    }, [stats.topSites]);
    
    const handleRoleChange = (userId: string, currentRole: UserRole) => {
        const roles: UserRole[] = ['user', 'premium']; // Admin cannot be assigned
        const nextRoleIndex = (roles.indexOf(currentRole) + 1) % roles.length;
        updateUserRole(userId, roles[nextRoleIndex]);
        setRefreshTrigger(t => t + 1);
    };

    const handleDeleteUser = (userId: string, userEmail: string) => {
        if(userEmail === 'admin@pynor.com') {
            alert("Cannot delete the root admin user.");
            return;
        }
        if(window.confirm(`Are you sure you want to delete user: ${userEmail}?`)) {
            deleteUser(userId);
            setRefreshTrigger(t => t + 1);
        }
    };

    const handleSettingsSave = () => {
        setIsSaving(true);
        updateLogoUrl(logoUrl);
        updateLandingContent(landingContent);
        updateAnimationStyle(animationStyle);
        setTimeout(() => setIsSaving(false), 1000); // Simulate save
    };
    
    const handleContentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setLandingContent(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const renderDashboard = () => (
        <div className="animate-entry mt-8 space-y-8">
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <StatCard label="Total Users" value={stats.totalUsers} />
                <StatCard label="Total Pings" value={stats.pingCount} />
                <StatCard label="Success Rate" value={stats.successRate} />
                <StatCard label="Avg Uptime" value={stats.averageUptime} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-light-bg border border-slate-700 p-6 rounded-lg min-h-[250px] flex flex-col">
                    <h3 className="font-semibold mb-4 text-text-main text-center lg:text-left">Top Monitored Sites</h3>
                    <div className="flex-grow flex flex-col justify-center">
                        <BarChart data={topSitesData} />
                    </div>
                </div>
                 <div className="bg-light-bg border border-slate-700 p-6 rounded-lg min-h-[250px] flex flex-col">
                    <h3 className="font-semibold mb-4 text-text-main text-center lg:text-left">Users by Role</h3>
                    <div className="flex-grow flex items-center justify-center">
                        <DoughnutChart data={userRoleData} />
                    </div>
                </div>
            </div>
        </div>
    );
    
    const renderUsers = () => (
        <div className="animate-entry mt-8">
            <h2 className="text-3xl font-bold text-text-main mb-6">Manage Users</h2>
            <div className="bg-light-bg border border-slate-700 p-4 rounded-lg">
                <div className="max-h-[65vh] overflow-y-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 bg-light-bg">
                            <tr>
                                <th className="p-2 text-text-secondary font-medium">Email</th>
                                <th className="p-2 text-text-secondary font-medium">Role</th>
                                <th className="p-2 text-text-secondary font-medium text-center">Sites</th>
                                <th className="p-2 text-text-secondary font-medium text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allUsers.map(user => (
                                <tr key={user.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                    <td className="p-2 text-text-main truncate max-w-[150px]" title={user.email}>{user.email}</td>
                                    <td className="p-2"><RoleBadge role={user.role} /></td>
                                    <td className="p-2 text-text-main text-center font-mono">{user.pingedSites.length}</td>
                                    <td className="p-2 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => handleRoleChange(user.id, user.role)} title="Change Role" className="text-slate-400 hover:text-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed" disabled={user.email === 'admin@pynor.com'}>
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteUser(user.id, user.email)} title="Delete User" className="text-slate-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed" disabled={user.email === 'admin@pynor.com'}>
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
    
    const renderSettings = () => (
         <div className="animate-entry mt-8">
             <h2 className="text-3xl font-bold text-text-main mb-6">Site Settings</h2>
             <div className="space-y-8 max-w-4xl bg-light-bg border border-slate-700 p-8 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-lg font-semibold text-text-main mb-2">Site Logo</h3>
                        <input 
                            type="text"
                            placeholder="Enter image URL for logo"
                            value={logoUrl}
                            onChange={(e) => setLogoUrl(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-text-main placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                     <div>
                        <h3 className="text-lg font-semibold text-text-main mb-2">UI Animation Style</h3>
                        <select
                            value={animationStyle}
                            onChange={(e) => setAnimationStyle(e.target.value as AnimationStyle)}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="fade">Fade</option>
                            <option value="slide">Slide</option>
                            <option value="none">None</option>
                        </select>
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-text-main mb-4">Landing Page Content</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-text-secondary">Hero Title
                                <input type="text" name="heroTitle" value={landingContent.heroTitle} onChange={handleContentChange} className="mt-1 w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-text-main"/>
                            </label>
                            <label className="block text-sm font-medium text-text-secondary">Hero Subtitle
                                <textarea name="heroSubtitle" value={landingContent.heroSubtitle} onChange={handleContentChange} rows={3} className="mt-1 w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-text-main"/>
                            </label>
                        </div>
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-text-secondary">Feature 1 Title
                                <input type="text" name="feature1Title" value={landingContent.feature1Title} onChange={handleContentChange} className="mt-1 w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-text-main"/>
                            </label>
                            <label className="block text-sm font-medium text-text-secondary">Feature 1 Description
                                <textarea name="feature1Description" value={landingContent.feature1Description} onChange={handleContentChange} rows={2} className="mt-1 w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-text-main"/>
                            </label>
                            <label className="block text-sm font-medium text-text-secondary">Feature 2 Title
                                <input type="text" name="feature2Title" value={landingContent.feature2Title} onChange={handleContentChange} className="mt-1 w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-text-main"/>
                            </label>
                            <label className="block text-sm font-medium text-text-secondary">Feature 2 Description
                                <textarea name="feature2Description" value={landingContent.feature2Description} onChange={handleContentChange} rows={2} className="mt-1 w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-text-main"/>
                            </label>
                            <label className="block text-sm font-medium text-text-secondary">Feature 3 Title
                                <input type="text" name="feature3Title" value={landingContent.feature3Title} onChange={handleContentChange} className="mt-1 w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-text-main"/>
                            </label>
                            <label className="block text-sm font-medium text-text-secondary">Feature 3 Description
                                <textarea name="feature3Description" value={landingContent.feature3Description} onChange={handleContentChange} rows={2} className="mt-1 w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-text-main"/>
                            </label>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleSettingsSave}
                        disabled={isSaving}
                        className="bg-secondary text-slate-900 font-bold py-2 px-6 rounded-lg hover:bg-emerald-400 transition-colors disabled:bg-slate-600 w-32 flex items-center justify-center"
                    >
                        {isSaving ? <Spinner /> : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );


    const renderContent = () => {
        switch(adminView) {
            case 'users': return renderUsers();
            case 'settings': return renderSettings();
            case 'dashboard':
            default:
                return renderDashboard();
        }
    };

    return (
       <>
        <div className="min-h-screen bg-dark-bg text-text-main font-sans flex justify-center p-4 sm:p-6 lg:p-8 pb-24">
            <div className="w-full max-w-7xl">
                <header className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
                    <h1 className="text-4xl font-bold text-text-main">Admin Panel</h1>
                    <button
                        onClick={() => onNavigate('dashboard')}
                        className="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors font-semibold self-start md:self-center"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                        <span>Back to Pynor</span>
                    </button>
                </header>

                <main>
                    {renderContent()}
                </main>
            </div>
        </div>
        <nav className="fixed bottom-0 left-0 right-0 bg-light-bg border-t border-slate-700 shadow-t-lg flex justify-around z-50">
            <BottomNavItem 
                icon={<Squares2X2Icon />}
                label="Dashboard"
                isActive={adminView === 'dashboard'}
                onClick={() => setAdminView('dashboard')}
            />
            <BottomNavItem 
                icon={<UserIcon />}
                label="Users"
                isActive={adminView === 'users'}
                onClick={() => setAdminView('users')}
            />
            <BottomNavItem 
                icon={<Cog6ToothIcon />}
                label="Settings"
                isActive={adminView === 'settings'}
                onClick={() => setAdminView('settings')}
            />
        </nav>
      </>
    );
};