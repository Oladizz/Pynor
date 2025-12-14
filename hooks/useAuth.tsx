import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { auth, db } from '../src/firebase';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User as FirebaseAuthUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs, deleteDoc, updateDoc, addDoc } from 'firebase/firestore'; // Added addDoc
import type { User, UserRole, PingResult, PingSite, PingFrequency } from '../types'; // Import PingSite and PingFrequency

// Define an internal AppUser type to extend Firebase's User info with our custom fields
interface AppUser extends User {
    uid: string; // Firebase Auth UID
}

// Define the shape of the context value
interface AuthContextType {
    user: AppUser | null;
    loading: boolean;
    login: (email: string, password_: string) => Promise<AppUser>;
    signup: (email: string, password_: string) => Promise<AppUser>;
    logout: () => void;
    updateUserPings: (userId: string, newSite: PingSite) => Promise<void>; // Updated to PingSite
    removeUserPing: (userId: string, siteToRemoveUrl: string) => Promise<void>; // Updated to siteToRemoveUrl
    getAllUsers: () => Promise<AppUser[]>;
    deleteUser: (userId: string) => Promise<void>;
    updateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
    savePingResult: (result: PingResult) => Promise<void>;
    getAllPingResults: () => Promise<PingResult[]>;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create the Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Fetch user profile from Firestore
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const appUser = userDoc.data() as User;
                    // Ensure pingedSites is correctly formatted from Firestore (might be string[] from old data)
                    const formattedPingedSites: PingSite[] = appUser.pingedSites.map(site => {
                        // If it's an old string format, convert to PingSite with default frequency
                        if (typeof site === 'string') {
                            return { url: site, frequency: '5min' as PingFrequency };
                        }
                        return site;
                    });
                    setUser({ ...appUser, id: firebaseUser.uid, uid: firebaseUser.uid, pingedSites: formattedPingedSites });
                } else {
                    console.error('User profile not found in Firestore for:', firebaseUser.uid);
                    await signOut(auth); // Sign out if profile is missing
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);
    
    const login = useCallback(async (email: string, password_: string): Promise<AppUser> => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password_);
            const firebaseUser = userCredential.user;

            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const appUser = userDoc.data() as User;
                // Ensure pingedSites is correctly formatted from Firestore (might be string[] from old data)
                const formattedPingedSites: PingSite[] = appUser.pingedSites.map(site => {
                    if (typeof site === 'string') {
                        return { url: site, frequency: '5min' as PingFrequency };
                    }
                    return site;
                });
                const userToSet = { ...appUser, id: firebaseUser.uid, uid: firebaseUser.uid, pingedSites: formattedPingedSites };
                setUser(userToSet);
                return userToSet;
            } else {
                throw new Error('User profile not found in Firestore.');
            }
        } catch (error: any) {
            console.error('Firebase Login Error:', error);
            throw new Error(error.message);
        }
    }, []);
    
    const signup = useCallback(async (email: string, password_: string): Promise<AppUser> => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password_);
            const firebaseUser = userCredential.user;

            const newAppUser: User = {
                id: firebaseUser.uid, // Use Firebase UID as app user ID
                email: firebaseUser.email || email,
                role: 'user', // Default role for new sign-ups
                pingedSites: [], // Initialize as empty PingSite array
                createdAt: new Date().toISOString(),
            };

            const userDocRef = doc(db, 'users', firebaseUser.uid);
            await setDoc(userDocRef, newAppUser);

            const userToSet = { ...newAppUser, id: firebaseUser.uid, uid: firebaseUser.uid };
            setUser(userToSet);
            return userToSet;
        } catch (error: any) {
            console.error('Firebase Signup Error:', error);
            throw new Error(error.message);
        }
    }, []);
    
    const logout = useCallback(async () => {
        try {
            await signOut(auth);
            setUser(null);
        } catch (error: any) {
            console.error('Firebase Logout Error:', error);
            throw new Error(error.message);
        }
    }, []);

    const updateUserPings = useCallback(async (userId: string, newSite: PingSite) => { // Updated newSite to PingSite
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            const currentSites: PingSite[] = userData.pingedSites.map(site => typeof site === 'string' ? { url: site, frequency: '5min' } : site);

            // Check if the URL already exists to avoid duplicates
            const siteExists = currentSites.some(site => site.url === newSite.url);
            let updatedSites: PingSite[];

            if (!siteExists) {
                updatedSites = [...currentSites, newSite];
            } else {
                // If site exists, update its frequency
                updatedSites = currentSites.map(site => 
                    site.url === newSite.url ? newSite : site
                );
            }
            
            await updateDoc(userDocRef, {
                pingedSites: updatedSites,
            });
            if (user?.id === userId) {
                setUser((prevUser) => prevUser ? { ...prevUser, pingedSites: updatedSites } : null);
            }
        }
    }, [user]);

    const removeUserPing = useCallback(async (userId: string, siteToRemoveUrl: string) => { // Updated siteToRemove to siteToRemoveUrl
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            const currentSites: PingSite[] = userData.pingedSites.map(site => typeof site === 'string' ? { url: site, frequency: '5min' } : site);
            const updatedSites = currentSites.filter(site => site.url !== siteToRemoveUrl); // Filter by url property
            await updateDoc(userDocRef, {
                pingedSites: updatedSites,
            });
            if (user?.id === userId) {
                setUser((prevUser) => prevUser ? { ...prevUser, pingedSites: updatedSites } : null);
            }
        }
    }, [user]);

    const getAllUsers = useCallback(async (): Promise<AppUser[]> => {
        const usersCol = collection(db, 'users');
        const userSnapshot = await getDocs(usersCol);
        return userSnapshot.docs.map(d => ({ ...d.data() as User, uid: d.id }));
    }, []);

    const savePingResult = useCallback(async (result: PingResult) => {
        try {
            // Add current user's ID to the ping result for querying
            const resultWithUserId = { ...result, userId: user?.id || 'anonymous' };
            await addDoc(collection(db, "ping_results"), resultWithUserId);
        } catch (error) {
            console.error("Error saving ping result to Firestore:", error);
        }
    }, [user]);

    const getAllPingResults = useCallback(async (): Promise<PingResult[]> => {
        const pingsCol = collection(db, 'ping_results');
        // Only fetch pings for the current user
        const q = user ? query(pingsCol, where("userId", "==", user.id), orderBy("timestamp", "desc"), limit(500)) : query(pingsCol, orderBy("timestamp", "desc"), limit(0));
        const pingsSnapshot = await getDocs(q);
        return pingsSnapshot.docs.map(d => {
            const data = d.data();
            return {
                ...data,
                id: d.id,
                timestamp: (data.timestamp && typeof data.timestamp.toDate === 'function') ? data.timestamp.toDate() : new Date(),
            } as PingResult;
        });
    }, [user]);

    const deleteUser = useCallback(async (userId: string) => {
        await deleteDoc(doc(db, 'users', userId));
        // Note: Deleting a user from Firestore does not delete the Firebase Authentication user.
        // That would typically be handled server-side or by an admin.
    }, []);

    const updateUserRole = useCallback(async (userId: string, newRole: UserRole) => {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, { role: newRole });
        // If the current user's role is updated, refresh their state
        if (user?.id === userId) {
            setUser((prevUser) => prevUser ? { ...prevUser, role: newRole } : null);
        }
    }, [user]);

    const value = { user, loading, login, signup, logout, updateUserPings, removeUserPing, getAllUsers, deleteUser, updateUserRole, savePingResult, getAllPingResults };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};


// Create the consumer hook
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};