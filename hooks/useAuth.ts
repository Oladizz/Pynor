import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { User, UserRole, PingResult } from '../types';

// Mock database in localStorage
const DB_KEY = 'pynor_users_db';
const SESSION_KEY = 'pynor_session';
const PING_RESULTS_KEY = 'pynor_ping_results';


const initializeDB = () => {
    if (!localStorage.getItem(DB_KEY)) {
        const adminUser: User = {
            id: 'admin-user-01',
            email: 'admin@pynor.com',
            passwordHash: 'admin123',
            role: 'admin',
            pingedSites: [],
            createdAt: new Date().toISOString(),
        };

        const users: Record<string, User> = {
            [adminUser.id]: adminUser,
        };

        localStorage.setItem(DB_KEY, JSON.stringify(users));
    }
};

initializeDB();

// Define the shape of the context value
interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password_: string) => Promise<User>;
    signup: (email: string, password_: string) => Promise<User>;
    logout: () => void;
    updateUserPings: (userId: string, newSite: string) => void;
    removeUserPing: (userId: string, siteToRemove: string) => void;
    getAllUsers: () => User[];
    deleteUser: (userId: string) => void;
    updateUserRole: (userId: string, newRole: UserRole) => void;
    savePingResult: (result: PingResult) => void;
    getAllPingResults: () => PingResult[];
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);


// Create the Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        try {
            const session = localStorage.getItem(SESSION_KEY);
            if (session) {
                const db = JSON.parse(localStorage.getItem(DB_KEY) || '{}');
                const loggedInUser = db[session];
                if(loggedInUser) {
                    setUser(loggedInUser);
                } else {
                     // Clear invalid session
                    localStorage.removeItem(SESSION_KEY);
                }
            }
        } catch (error) {
            console.error("Failed to load session:", error);
        } finally {
            setLoading(false);
        }
    }, []);
    
    const login = useCallback(async (email: string, password_: string): Promise<User> => {
        return new Promise((resolve, reject) => {
            setTimeout(() => { // Simulate network delay
                const db: Record<string, User> = JSON.parse(localStorage.getItem(DB_KEY) || '{}');
                const foundUser = Object.values(db).find(u => u.email === email);

                if (foundUser && foundUser.passwordHash === password_) {
                    localStorage.setItem(SESSION_KEY, foundUser.id);
                    setUser(foundUser);
                    resolve(foundUser);
                } else {
                    reject(new Error('Invalid email or password.'));
                }
            }, 500);
        });
    }, []);
    
    const signup = useCallback(async (email: string, password_: string): Promise<User> => {
        return new Promise((resolve, reject) => {
             setTimeout(() => { // Simulate network delay
                const db: Record<string, User> = JSON.parse(localStorage.getItem(DB_KEY) || '{}');
                const existingUser = Object.values(db).some(u => u.email === email);

                if (existingUser) {
                    return reject(new Error('User with this email already exists.'));
                }

                const newUser: User = {
                    id: crypto.randomUUID(),
                    email,
                    passwordHash: password_,
                    role: 'user',
                    pingedSites: [],
                    createdAt: new Date().toISOString(),
                };

                db[newUser.id] = newUser;
                localStorage.setItem(DB_KEY, JSON.stringify(db));
                localStorage.setItem(SESSION_KEY, newUser.id);
                setUser(newUser);
                resolve(newUser);
            }, 500);
        });
    }, []);
    
    const logout = useCallback(() => {
        localStorage.removeItem(SESSION_KEY);
        setUser(null);
    }, []);

    const updateUserPings = useCallback((userId: string, newSite: string) => {
        const db: Record<string, User> = JSON.parse(localStorage.getItem(DB_KEY) || '{}');
        const userToUpdate = db[userId];
        if (userToUpdate && !userToUpdate.pingedSites.includes(newSite)) {
            userToUpdate.pingedSites.push(newSite);
            db[userId] = userToUpdate;
            localStorage.setItem(DB_KEY, JSON.stringify(db));
            if(user?.id === userId) setUser({...userToUpdate}); // Update state to trigger re-render
        }
    }, [user]);

    const removeUserPing = useCallback((userId: string, siteToRemove: string) => {
        const db: Record<string, User> = JSON.parse(localStorage.getItem(DB_KEY) || '{}');
        const userToUpdate = db[userId];
        if (userToUpdate) {
            userToUpdate.pingedSites = userToUpdate.pingedSites.filter(site => site !== siteToRemove);
            db[userId] = userToUpdate;
            localStorage.setItem(DB_KEY, JSON.stringify(db));
            if(user?.id === userId) setUser({...userToUpdate}); // Update state to trigger re-render
        }
    }, [user]);

    const getAllUsers = useCallback(() => {
        const db: Record<string, User> = JSON.parse(localStorage.getItem(DB_KEY) || '{}');
        return Object.values(db);
    }, []);

    const savePingResult = useCallback((result: PingResult) => {
        const allResults: PingResult[] = JSON.parse(localStorage.getItem(PING_RESULTS_KEY) || '[]');
        allResults.unshift(result);
        const MAX_RESULTS = 500;
        if (allResults.length > MAX_RESULTS) {
            allResults.length = MAX_RESULTS;
        }
        localStorage.setItem(PING_RESULTS_KEY, JSON.stringify(allResults));
    }, []);

    const getAllPingResults = useCallback((): PingResult[] => {
        const results: PingResult[] = JSON.parse(localStorage.getItem(PING_RESULTS_KEY) || '[]');
        // Revive date objects from JSON strings
        return results.map(r => ({ ...r, timestamp: new Date(r.timestamp) }));
    }, []);

    const deleteUser = useCallback((userId: string) => {
        const db: Record<string, User> = JSON.parse(localStorage.getItem(DB_KEY) || '{}');
        delete db[userId];
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    }, []);

    const updateUserRole = useCallback((userId: string, newRole: UserRole) => {
        const db: Record<string, User> = JSON.parse(localStorage.getItem(DB_KEY) || '{}');
        const userToUpdate = db[userId];
        if (userToUpdate) {
            if (userToUpdate.email === 'admin@pynor.com' || newRole === 'admin') {
                console.warn("Operation not permitted: Cannot change root admin's role or promote others to admin.");
                return;
            }
            userToUpdate.role = newRole;
            db[userId] = userToUpdate;
            localStorage.setItem(DB_KEY, JSON.stringify(db));
        }
    }, []);


    const value = { user, loading, login, signup, logout, updateUserPings, removeUserPing, getAllUsers, deleteUser, updateUserRole, savePingResult, getAllPingResults };

    // FIX: Replaced JSX with React.createElement because JSX is not valid in a .ts file. This was causing parsing errors.
    return React.createElement(AuthContext.Provider, { value: value }, children);
};


// Create the consumer hook
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};