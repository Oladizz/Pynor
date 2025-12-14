import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { auth, db } from '../src/firebase';
import {
    GoogleAuthProvider,
    GithubAuthProvider,
    signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { LandingPage } from './LandingPage';
import { Logo } from './Logo';
import { 
    Mail, Lock, User as UserIcon, ArrowRight, Check, AlertCircle, 
    Building2, KeyRound, ShieldCheck, ArrowLeft, Globe, 
    Github, Command, Chrome
} from 'lucide-react';
import { Spinner } from './Spinner';
import type { User } from '../types';

type AuthView = 'landing' | 'login' | 'signup' | 'forgot-password' | 'sso';

export const AuthPage: React.FC = () => {
    const [view, setView] = useState<AuthView>('landing');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    
    // Validation error states
    const [emailValidationError, setEmailValidationError] = useState<string | null>(null);
    const [passwordValidationError, setPasswordValidationError] = useState<string | null>(null);
    const [nameValidationError, setNameValidationError] = useState<string | null>(null);
    const [termsValidationError, setTermsValidationError] = useState<string | null>(null);

    const { login, signup } = useAuth();

    // Helper function for email validation
    const isValidEmail = (email: string) => {
        // Basic email regex, can be improved
        return /\S+@\S+\.\S+/.test(email);
    };

    // Reset state when switching views
    const switchView = (newView: AuthView) => {
        setView(newView);
        setError(null);
        setSuccessMessage(null);
        // We keep email populated for convenience if moving between login/signup
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setEmailValidationError(null);
        setPasswordValidationError(null);

        // Client-side validation
        if (!email) {
            setEmailValidationError('Email is required.');
            return;
        }
        if (!isValidEmail(email)) {
            setEmailValidationError('Please enter a valid email address.');
            return;
        }
        if (!password) {
            setPasswordValidationError('Password is required.');
            return;
        }
        if (password.length < 6) { // Firebase minimum password length
            setPasswordValidationError('Password must be at least 6 characters long.');
            return;
        }

        setIsLoading(true);
        try {
            await login(email, password);
        } catch (err: any) {
            setError(err.message || 'Failed to login');
            setIsLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setEmailValidationError(null);
        setPasswordValidationError(null);
        setNameValidationError(null);
        setTermsValidationError(null);

        // Client-side validation for signup
        if (!name.trim()) {
            setNameValidationError('Full Name is required.');
            return;
        }
        if (!email) {
            setEmailValidationError('Work Email is required.');
            return;
        }
        if (!isValidEmail(email)) {
            setEmailValidationError('Please enter a valid email address.');
            return;
        }
        if (!password) {
            setPasswordValidationError('Password is required.');
            return;
        }
        if (password.length < 6) { 
            setPasswordValidationError('Password must be at least 6 characters long.');
            return;
        }
        // Assuming terms checkbox has 'required' HTML attribute handling.
        const termsCheckbox = document.getElementById('terms') as HTMLInputElement;
        if (!termsCheckbox || !termsCheckbox.checked) {
            setTermsValidationError('You must agree to the Terms and Privacy Policy.');
            return;
        }

        setIsLoading(true);
        try {
            await signup(email, password);
            // Auto-login or show success handled by App state mostly, 
            // but if signup returns user without throwing, we are good.
        } catch (err: any) {
            setError(err.message || 'Failed to create account');
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setEmailValidationError(null);

        if (!email) {
            setEmailValidationError('Email is required.');
            return;
        }
        if (!isValidEmail(email)) {
            setEmailValidationError('Please enter a valid email address.');
            return;
        }

        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            setSuccessMessage(`If an account exists for ${email}, we have sent a reset link.`);
        }, 1500);
    };

    const handleSSO = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setEmailValidationError(null);

        if (!email) {
            setEmailValidationError('Company Email is required.');
            return;
        }
        if (!isValidEmail(email)) {
            setEmailValidationError('Please enter a valid email address.');
            return;
        }

        setIsLoading(true);
        // Simulate SSO lookup
        setTimeout(() => {
            setIsLoading(false);
            if (email.endsWith('@pynor.com')) {
                 setSuccessMessage('Redirecting to Pynor Identity Provider...');
                 setTimeout(() => login('admin@pynor.com', 'admin123'), 1000);
            } else {
                 setError('SSO not configured for this domain. Please contact support.');
            }
        }, 1500);
    };

    const handleSocialLogin = async (provider: 'google' | 'github') => {
        const authProvider = provider === 'google' ? new GoogleAuthProvider() : new GithubAuthProvider();
        setIsLoading(true);
        setError(null);
        try {
            const result = await signInWithPopup(auth, authProvider);
            const firebaseUser = result.user;

            // Check if user exists in Firestore, if not, create them
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                const newAppUser: User = {
                    id: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    role: 'user',
                    pingedSites: [],
                    createdAt: new Date().toISOString(),
                };
                await setDoc(userDocRef, newAppUser);
            }
            // The onAuthStateChanged listener in useAuth will handle setting the user state
        } catch (error: any) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Shared Components for the Auth Layout
    const LeftPanel = () => (
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-black flex-col justify-between p-16 text-white">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary/20 blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-secondary/10 blur-[80px]"></div>
                {/* Grid Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(41,121,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(41,121,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-primary rounded-lg">
                        <Globe className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-2xl font-bold tracking-widest font-sans">PYNOR</span>
                </div>
                <h1 className="text-5xl font-bold leading-tight mb-6 font-sans">
                    Monitor your infrastructure with <span className="text-primary">precision</span>.
                </h1>
                <p className="text-lg text-slate-400 max-w-md">
                    Enterprise-grade uptime monitoring, real-time analytics, and AI-powered insights for modern engineering teams.
                </p>
            </div>

            <div className="relative z-10 bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
                <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map(i => <ShieldCheck key={i} className="w-5 h-5 text-secondary" />)}
                </div>
                <p className="text-slate-300 italic mb-4">"Pynor has revolutionized how we track our microservices. The AI insights are a game changer for our DevOps team."</p>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-secondary"></div>
                    <div>
                        <p className="font-bold font-sans">Alex Chen</p>
                        <p className="text-xs text-slate-400 uppercase tracking-wider">CTO, CyberDyne Systems</p>
                    </div>
                </div>
            </div>
        </div>
    );

    const AuthHeader = ({ title, subtitle }: { title: string, subtitle: string }) => (
        <div className="text-center mb-8">
             <div className="lg:hidden flex justify-center mb-6">
                <Logo />
            </div>
            <h2 className="text-3xl font-bold text-text-main mb-2 font-sans tracking-tight">{title}</h2>
            <p className="text-text-secondary">{subtitle}</p>
        </div>
    );

    const SocialButtons = () => (
        <div className="grid grid-cols-2 gap-4 mb-6">
            <button type="button" onClick={() => handleSocialLogin('github')} className="flex items-center justify-center gap-2 p-2.5 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors text-text-main">
                <Github className="w-5 h-5" />
                <span className="text-sm font-medium">GitHub</span>
            </button>
            <button type="button" onClick={() => handleSocialLogin('google')} className="flex items-center justify-center gap-2 p-2.5 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors text-text-main">
                <Chrome className="w-5 h-5" />
                <span className="text-sm font-medium">Google</span>
            </button>
        </div>
    );

    const Divider = () => (
        <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-dark-bg text-text-secondary uppercase text-xs tracking-wider">Or continue with</span>
            </div>
        </div>
    );

    return view === 'landing' ? (
        <LandingPage
            onLoginClick={() => switchView('login')}
            onGetStartedClick={() => switchView('signup')}
        />
    ) : (
        <div className="flex min-h-screen bg-dark-bg font-sans">
            <LeftPanel />

            {/* Right Panel - Form Container */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 md:p-12 relative">
                <button 
                    onClick={() => switchView('landing')}
                    className="absolute top-6 left-6 md:top-12 md:left-12 flex items-center gap-2 text-text-secondary hover:text-primary transition-colors text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </button>

                <div className="w-full max-w-md animate-entry">
                    
                    {/* --- LOGIN VIEW --- */}
                    {view === 'login' && (
                        <>
                            <AuthHeader title="Welcome Back" subtitle="Sign in to your dashboard" />
                            <SocialButtons />
                            <Divider />
                            <form onSubmit={handleLogin} className="space-y-5">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider ml-1">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input 
                                            type="email" 
                                            required 
                                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 pl-10 text-text-main focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                            placeholder="name@company.com"
                                            value={email}
                                            onChange={(e) => { setEmail(e.target.value); setEmailValidationError(null); }}
                                        />
                                        {emailValidationError && (
                                            <p className="text-red-400 text-xs mt-1 ml-1">{emailValidationError}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Password</label>
                                        <button type="button" onClick={() => switchView('forgot-password')} className="text-xs text-primary hover:text-blue-400">Forgot password?</button>
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input 
                                            type="password" 
                                            required 
                                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 pl-10 text-text-main focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => { setPassword(e.target.value); setPasswordValidationError(null); }}
                                        />
                                        {passwordValidationError && (
                                            <p className="text-red-400 text-xs mt-1 ml-1">{passwordValidationError}</p>
                                        )}
                                    </div>
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-lg text-sm">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        {error}
                                    </div>
                                )}

                                <button 
                                    type="submit" 
                                    disabled={isLoading}
                                    className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? <Spinner className="w-5 h-5" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
                                </button>
                            </form>
                            <div className="mt-8 text-center space-y-4">
                                <p className="text-text-secondary text-sm">
                                    Don't have an account? 
                                    <button onClick={() => switchView('signup')} className="text-primary hover:text-blue-400 font-bold ml-1">Sign Up</button>
                                </p>
                                <button onClick={() => switchView('sso')} className="flex items-center justify-center gap-2 mx-auto text-sm text-text-secondary hover:text-text-main transition-colors">
                                    <Building2 className="w-4 h-4" /> Use Single Sign-On (SSO)
                                </button>
                            </div>
                        </>
                    )}

                    {/* --- SIGN UP VIEW --- */}
                    {view === 'signup' && (
                        <>
                             <AuthHeader title="Create Account" subtitle="Start monitoring in seconds" />
                             <SocialButtons />
                             <Divider />
                             <form onSubmit={handleSignup} className="space-y-5">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider ml-1">Full Name</label>
                                    <div className="relative">
                                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input 
                                            type="text" 
                                            required 
                                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 pl-10 text-text-main focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                            placeholder="John Doe"
                                            value={name}
                                            onChange={(e) => { setName(e.target.value); setNameValidationError(null); }}
                                        />
                                        {nameValidationError && (
                                            <p className="text-red-400 text-xs mt-1 ml-1">{nameValidationError}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider ml-1">Work Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input 
                                            type="email" 
                                            required 
                                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 pl-10 text-text-main focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                            placeholder="name@company.com"
                                            value={email}
                                            onChange={(e) => { setEmail(e.target.value); setEmailValidationError(null); }}
                                        />
                                        {emailValidationError && (
                                            <p className="text-red-400 text-xs mt-1 ml-1">{emailValidationError}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider ml-1">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input 
                                            type="password" 
                                            required 
                                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 pl-10 text-text-main focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                            placeholder="Create a strong password"
                                            value={password}
                                            onChange={(e) => { setPassword(e.target.value); setPasswordValidationError(null); }}
                                        />
                                        {passwordValidationError && (
                                            <p className="text-red-400 text-xs mt-1 ml-1">{passwordValidationError}</p>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex items-start gap-2 pt-2">
                                    <input 
                                        type="checkbox" 
                                        id="terms" 
                                        required 
                                        className="mt-1 bg-slate-900 border-slate-700 rounded text-primary focus:ring-primary" 
                                        onChange={() => setTermsValidationError(null)}
                                    />
                                    <label htmlFor="terms" className="text-xs text-text-secondary">
                                        I agree to the <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
                                    </label>
                                    {termsValidationError && (
                                        <p className="text-red-400 text-xs mt-1 ml-1">{termsValidationError}</p>
                                    )}
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-lg text-sm">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        {error}
                                    </div>
                                )}

                                <button 
                                    type="submit" 
                                    disabled={isLoading}
                                    className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? <Spinner className="w-5 h-5" /> : "Create Account"}
                                </button>
                            </form>
                            <p className="mt-8 text-center text-text-secondary text-sm">
                                Already have an account? 
                                <button onClick={() => switchView('login')} className="text-primary hover:text-blue-400 font-bold ml-1">Sign In</button>
                            </p>
                        </>
                    )}

                    {/* --- FORGOT PASSWORD VIEW --- */}
                    {view === 'forgot-password' && (
                        <>
                            <div className="mb-8 text-center">
                                <div className="inline-flex p-3 bg-slate-800 rounded-full mb-4">
                                    <KeyRound className="w-8 h-8 text-primary" />
                                </div>
                                <h2 className="text-2xl font-bold text-text-main font-sans">Reset Password</h2>
                                <p className="text-text-secondary mt-2">Enter your email and we'll send you a link to reset your password.</p>
                            </div>
                            
                            {successMessage ? (
                                <div className="text-center animate-fade-in-up">
                                    <div className="flex items-center justify-center gap-2 text-green-400 bg-green-400/10 p-4 rounded-lg text-sm mb-6">
                                        <Check className="w-5 h-5 flex-shrink-0" />
                                        {successMessage}
                                    </div>
                                    <button 
                                        onClick={() => switchView('login')}
                                        className="text-primary font-bold hover:underline"
                                    >
                                        Back to Sign In
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleForgotPassword} className="space-y-5">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider ml-1">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                            <input 
                                                type="email" 
                                                required 
                                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 pl-10 text-text-main focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                                placeholder="name@company.com"
                                                value={email}
                                                onChange={(e) => { setEmail(e.target.value); setEmailValidationError(null); }}
                                            />
                                            {emailValidationError && (
                                                <p className="text-red-400 text-xs mt-1 ml-1">{emailValidationError}</p>
                                            )}
                                        </div>
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={isLoading}
                                        className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? <Spinner className="w-5 h-5" /> : "Send Reset Link"}
                                    </button>
                                    
                                    <button 
                                        type="button"
                                        onClick={() => switchView('login')}
                                        className="w-full text-center text-text-secondary hover:text-text-main text-sm"
                                    >
                                        Cancel and go back
                                    </button>
                                </form>
                            )}
                        </>
                    )}

                    {/* --- SSO VIEW --- */}
                    {view === 'sso' && (
                        <>
                             <div className="mb-8 text-center">
                                <div className="inline-flex p-3 bg-slate-800 rounded-full mb-4">
                                    <Building2 className="w-8 h-8 text-primary" />
                                </div>
                                <h2 className="text-2xl font-bold text-text-main font-sans">Single Sign-On</h2>
                                <p className="text-text-secondary mt-2">Enter your company email to log in with your identity provider.</p>
                            </div>

                             <form onSubmit={handleSSO} className="space-y-5">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider ml-1">Company Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input 
                                            type="email" 
                                            required 
                                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 pl-10 text-text-main focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                            placeholder="name@company.com"
                                            value={email}
                                            onChange={(e) => { setEmail(e.target.value); setEmailValidationError(null); }}
                                        />
                                        {emailValidationError && (
                                            <p className="text-red-400 text-xs mt-1 ml-1">{emailValidationError}</p>
                                        )}
                                    </div>
                                </div>
                                
                                {error && (
                                    <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-lg text-sm">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        {error}
                                    </div>
                                )}
                                
                                {successMessage && (
                                     <div className="flex items-center gap-2 text-green-400 bg-green-400/10 p-3 rounded-lg text-sm">
                                        <Check className="w-4 h-4 flex-shrink-0" />
                                        {successMessage}
                                    </div>
                                )}

                                <button 
                                    type="submit" 
                                    disabled={isLoading || !!successMessage}
                                    className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? <Spinner className="w-5 h-5" /> : "Continue with SSO"}
                                </button>
                                
                                <button 
                                    type="button"
                                    onClick={() => switchView('login')}
                                    className="w-full text-center text-text-secondary hover:text-text-main text-sm"
                                >
                                    Log in with password instead
                                </button>
                            </form>
                        </>
                    )}

                </div>
                
                <footer className="absolute bottom-6 w-full text-center text-xs text-slate-600">
                    &copy; {new Date().getFullYear()} Pynor Inc. All rights reserved.
                </footer>
            </div>
        </div>
    );
};



