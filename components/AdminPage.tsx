import React, { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { User, UserRole, LandingPageContent, AnimationStyle } from '../types';
import { useAppSettings } from '../hooks/useAppSettings';
import { ArrowLeft, Trash2, Users, Settings, LayoutDashboard, Save, Check, X, Shield, AlertTriangle, Search } from 'lucide-react';
import { DoughnutChart } from './charts/DoughnutChart';
import { BarChart } from './charts/BarChart';

type AdminView = 'dashboard' | 'users' | 'settings';

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode }> = ({ label, value, icon }) => (
    <div className="bg-light-bg border border-slate-700 p-6 rounded-lg shadow-lg flex items-center justify-between">
        <div>
            <p className="text-sm text-text-secondary uppercase tracking-wider font-semibold">{label}</p>
            <p className="text-3xl font-bold font-mono mt-1 text-text-main">{value}</p>
        </div>
        <div className="p-3 bg-slate-800 rounded-full text-primary opacity-80">
            {icon}
        </div>
    </div>
);

const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
    const roleClasses = {
        admin: 'bg-red-500/10 text-red-400 border border-red-500/20',
        premium: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
        user: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    };
    return (
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${roleClasses[role]}`}>
            {role.toUpperCase()}
        </span>
    );
};

export const AdminPage: React.FC<{ onNavigate: (page: 'dashboard') => void }> = ({ onNavigate }) => {
    const { getAllUsers, deleteUser, updateUserRole, getAllPingResults } = useAuth();
    const { settings, updateLogoUrl, updateLandingContent, updateAnimationStyle } = useAppSettings();
    const [currentView, setCurrentView] = useState<AdminView>('dashboard');
    
    // Data Loading
    const allUsers = getAllUsers();
    const allPings = getAllPingResults();

    // Analytics
    const stats = useMemo(() => {
        return {
            totalUsers: allUsers.length,
            activePings: allUsers.reduce((acc, u) => acc + u.pingedSites.length, 0),
            totalPingEvents: allPings.length,
            avgLatency: allPings.length > 0 
                ? Math.round(allPings.reduce((acc, p) => acc + (p.responseTime || 0), 0) / allPings.length) + 'ms' 
                : 'N/A'
        };
    }, [allUsers, allPings]);

    const roleDistribution = useMemo(() => {
        const counts = { user: 0, premium: 0, admin: 0 };
        allUsers.forEach(u => {
            if (counts[u.role] !== undefined) counts[u.role]++;
        });
        return [
            { label: 'Admin', value: counts.admin, color: '#ef4444' }, // Red
            { label: 'Premium', value: counts.premium, color: '#eab308' }, // Yellow
            { label: 'Free', value: counts.user, color: '#3b82f6' }, // Blue
        ].filter(d => d.value > 0);
    }, [allUsers]);

    const sitePopularity = useMemo(() => {
        const counts: Record<string, number> = {};
        allUsers.forEach(u => {
            u.pingedSites.forEach(site => {
                counts[site] = (counts[site] || 0) + 1;
            });
        });
        return Object.entries(counts)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [allUsers]);

    // Users View State
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredUsers = allUsers.filter(u => 
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.id.includes(searchTerm)
    );

    const handleDeleteUser = (id: string, email: string) => {
        if (window.confirm(`Are you sure you want to delete user ${email}? This action cannot be undone.`)) {
            deleteUser(id);
        }
    };

    // Settings View State
    const [localSettings, setLocalSettings] = useState(settings);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    const handleSaveSettings = () => {
        setIsSaving(true);
        setSaveMessage(null);
        updateLogoUrl(localSettings.logoUrl);
        updateLandingContent(localSettings.landingContent);
        updateAnimationStyle(localSettings.animationStyle);
        setTimeout(() => {
            setIsSaving(false);
            setSaveMessage('Settings saved successfully!');
            setTimeout(() => setSaveMessage(null), 3000);
        }, 800);
    };

    const handleContentChange = (key: keyof LandingPageContent, value: string) => {
        setLocalSettings(prev => ({
            ...prev,
            landingContent: { ...prev.landingContent, [key]: value }
        }));
    };

    return (
        <div className="min-h-screen bg-dark-bg text-text-main font-sans flex flex-col md:flex-row">
            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-700 flex flex-col">
                <div className="p-6 border-b border-slate-700 flex items-center gap-2">
                    <Shield className="w-8 h-8 text-secondary" />
                    <span className="text-xl font-bold tracking-tight">Pynor Admin</span>
                </div>
                
                <nav className="flex-grow p-4 space-y-2">
                    <button 
                        onClick={() => setCurrentView('dashboard')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === 'dashboard' ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:bg-slate-800 hover:text-text-main'}`}
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        Dashboard
                    </button>
                    <button 
                        onClick={() => setCurrentView('users')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === 'users' ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:bg-slate-800 hover:text-text-main'}`}
                    >
                        <Users className="w-5 h-5" />
                        Users
                    </button>
                    <button 
                        onClick={() => setCurrentView('settings')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === 'settings' ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:bg-slate-800 hover:text-text-main'}`}
                    >
                        <Settings className="w-5 h-5" />
                        Settings
                    </button>
                </nav>

                <div className="p-4 border-t border-slate-700">
                    <button 
                        onClick={() => onNavigate('dashboard')}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-600 text-text-secondary hover:bg-slate-800 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to App
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-grow p-4 md:p-8 overflow-y-auto max-h-screen">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold capitalize">{currentView}</h1>
                    <p className="text-text-secondary mt-1">Manage your application and view statistics.</p>
                </header>

                {currentView === 'dashboard' && (
                    <div className="space-y-8 animate-entry">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard label="Total Users" value={stats.totalUsers} icon={<Users className="w-6 h-6" />} />
                            <StatCard label="Active Monitors" value={stats.activePings} icon={<Check className="w-6 h-6" />} />
                            <StatCard label="Ping Events" value={stats.totalPingEvents} icon={<LayoutDashboard className="w-6 h-6" />} />
                            <StatCard label="Avg Latency" value={stats.avgLatency} icon={<Settings className="w-6 h-6" />} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-light-bg border border-slate-700 rounded-lg p-6 shadow-lg">
                                <h3 className="text-lg font-semibold mb-6">User Distribution</h3>
                                <DoughnutChart data={roleDistribution} />
                            </div>
                            <div className="bg-light-bg border border-slate-700 rounded-lg p-6 shadow-lg">
                                <h3 className="text-lg font-semibold mb-6">Most Monitored Sites</h3>
                                <BarChart data={sitePopularity} />
                            </div>
                        </div>
                    </div>
                )}

                {currentView === 'users' && (
                    <div className="bg-light-bg border border-slate-700 rounded-lg shadow-lg overflow-hidden animate-entry">
                        <div className="p-4 border-b border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input 
                                    type="text" 
                                    placeholder="Search users..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 pl-9 pr-4 text-sm text-text-main focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <span className="text-sm text-text-secondary">{filteredUsers.length} users found</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-900/50 text-text-secondary text-xs uppercase tracking-wider">
                                        <th className="p-4 font-medium">User</th>
                                        <th className="p-4 font-medium">Role</th>
                                        <th className="p-4 font-medium">Sites Monitored</th>
                                        <th className="p-4 font-medium">Joined</th>
                                        <th className="p-4 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {filteredUsers.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="p-4">
                                                <div className="font-medium text-text-main">{u.email}</div>
                                                <div className="text-xs text-text-secondary font-mono">{u.id}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <RoleBadge role={u.role} />
                                                    {u.role !== 'admin' && (
                                                        <select 
                                                            value={u.role}
                                                            onChange={(e) => updateUserRole(u.id, e.target.value as UserRole)}
                                                            className="bg-transparent text-xs border-b border-dashed border-slate-500 text-text-secondary focus:outline-none focus:text-primary focus:border-primary"
                                                        >
                                                            <option value="user">User</option>
                                                            <option value="premium">Premium</option>
                                                            <option value="admin">Admin</option>
                                                        </select>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-text-secondary">{u.pingedSites.length}</td>
                                            <td className="p-4 text-text-secondary text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
                                            <td className="p-4 text-right">
                                                {u.role !== 'admin' && (
                                                    <button 
                                                        onClick={() => handleDeleteUser(u.id, u.email)}
                                                        className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredUsers.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-text-secondary">
                                                No users found matching "{searchTerm}"
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {currentView === 'settings' && (
                    <div className="space-y-6 animate-entry">
                        <div className="bg-light-bg border border-slate-700 rounded-lg p-6 shadow-lg">
                            <h3 className="text-lg font-semibold mb-4 border-b border-slate-700 pb-2">General Appearance</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">Logo URL</label>
                                    <input 
                                        type="text" 
                                        value={localSettings.logoUrl}
                                        onChange={(e) => setLocalSettings(prev => ({ ...prev, logoUrl: e.target.value }))}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-md p-2.5 text-text-main focus:ring-1 focus:ring-primary focus:outline-none"
                                        placeholder="https://example.com/logo.png"
                                    />
                                    <p className="text-xs text-text-secondary mt-1">Leave empty to use default text logo.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">Animation Style</label>
                                    <select 
                                        value={localSettings.animationStyle}
                                        onChange={(e) => setLocalSettings(prev => ({ ...prev, animationStyle: e.target.value as AnimationStyle }))}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-md p-2.5 text-text-main focus:ring-1 focus:ring-primary focus:outline-none"
                                    >
                                        <option value="fade">Fade In</option>
                                        <option value="slide">Slide Up</option>
                                        <option value="none">None (Performance)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="bg-light-bg border border-slate-700 rounded-lg p-6 shadow-lg">
                            <h3 className="text-lg font-semibold mb-4 border-b border-slate-700 pb-2">Landing Page Content</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs uppercase text-text-secondary mb-1">Hero Title</label>
                                        <input 
                                            type="text"
                                            value={localSettings.landingContent.heroTitle}
                                            onChange={(e) => handleContentChange('heroTitle', e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-text-main focus:ring-1 focus:ring-primary focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase text-text-secondary mb-1">Hero Subtitle</label>
                                        <input 
                                            type="text"
                                            value={localSettings.landingContent.heroSubtitle}
                                            onChange={(e) => handleContentChange('heroSubtitle', e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-text-main focus:ring-1 focus:ring-primary focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-slate-700 pt-4 mt-4">
                                    <p className="text-sm font-medium text-text-secondary mb-3">Feature 1</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <input 
                                            type="text"
                                            value={localSettings.landingContent.feature1Title}
                                            onChange={(e) => handleContentChange('feature1Title', e.target.value)}
                                            className="bg-slate-900 border border-slate-700 rounded-md p-2 text-text-main focus:ring-1 focus:ring-primary focus:outline-none"
                                            placeholder="Title"
                                        />
                                        <input 
                                            type="text"
                                            value={localSettings.landingContent.feature1Description}
                                            onChange={(e) => handleContentChange('feature1Description', e.target.value)}
                                            className="md:col-span-2 bg-slate-900 border border-slate-700 rounded-md p-2 text-text-main focus:ring-1 focus:ring-primary focus:outline-none"
                                            placeholder="Description"
                                        />
                                    </div>
                                </div>
                                
                                <div className="border-t border-slate-700 pt-4">
                                    <p className="text-sm font-medium text-text-secondary mb-3">Feature 2</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <input 
                                            type="text"
                                            value={localSettings.landingContent.feature2Title}
                                            onChange={(e) => handleContentChange('feature2Title', e.target.value)}
                                            className="bg-slate-900 border border-slate-700 rounded-md p-2 text-text-main focus:ring-1 focus:ring-primary focus:outline-none"
                                            placeholder="Title"
                                        />
                                        <input 
                                            type="text"
                                            value={localSettings.landingContent.feature2Description}
                                            onChange={(e) => handleContentChange('feature2Description', e.target.value)}
                                            className="md:col-span-2 bg-slate-900 border border-slate-700 rounded-md p-2 text-text-main focus:ring-1 focus:ring-primary focus:outline-none"
                                            placeholder="Description"
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-slate-700 pt-4">
                                    <p className="text-sm font-medium text-text-secondary mb-3">Feature 3</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <input 
                                            type="text"
                                            value={localSettings.landingContent.feature3Title}
                                            onChange={(e) => handleContentChange('feature3Title', e.target.value)}
                                            className="bg-slate-900 border border-slate-700 rounded-md p-2 text-text-main focus:ring-1 focus:ring-primary focus:outline-none"
                                            placeholder="Title"
                                        />
                                        <input 
                                            type="text"
                                            value={localSettings.landingContent.feature3Description}
                                            onChange={(e) => handleContentChange('feature3Description', e.target.value)}
                                            className="md:col-span-2 bg-slate-900 border border-slate-700 rounded-md p-2 text-text-main focus:ring-1 focus:ring-primary focus:outline-none"
                                            placeholder="Description"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-4">
                            {saveMessage && (
                                <span className="text-secondary text-sm animate-fade-in flex items-center gap-1">
                                    <Check className="w-4 h-4" /> {saveMessage}
                                </span>
                            )}
                            <button
                                onClick={handleSaveSettings}
                                disabled={isSaving}
                                className="flex items-center gap-2 bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {isSaving ? <span className="animate-spin">⌛</span> : <Save className="w-5 h-5" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
