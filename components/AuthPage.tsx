import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserIcon } from './icons/UserIcon';
import { LockClosedIcon } from './icons/LockClosedIcon';
import { Spinner } from './Spinner';
import { EyeIcon } from './icons/EyeIcon';
import { EyeSlashIcon } from './icons/EyeSlashIcon';
import { LandingPage } from './LandingPage';
import { CheckIcon } from './icons/CheckIcon';
import { Logo } from './Logo';

export const AuthPage: React.FC = () => {
    const [view, setView] = useState<'landing' | 'login' | 'signup'>('landing');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const { login, signup } = useAuth();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        if (isSuccess) return;
        setLoading(true);

        try {
            if (view === 'login') {
                await login(email, password);
            } else {
                await signup(email, password);
            }
            setIsSuccess(true);
            // Redirection is handled by App.tsx state change.
            // No need to setLoading(false) on success as the component unmounts.
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unexpected error occurred.');
            }
            setLoading(false); // Only set loading to false on error.
        }
    };
    
    const handleAdminLogin = async () => {
        setError(null);
        setLoading(true);
        try {
            await login('admin@pynor.com', 'admin123');
            // Success is handled by App.tsx redirecting the user
        } catch (err) {
             if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unexpected error occurred during admin login.');
            }
            setLoading(false);
        }
    };


    const switchForm = (targetView: 'login' | 'signup') => {
        setView(targetView);
        setError(null);
        setEmail('');
        setPassword('');
        setShowPassword(false);
        setIsSuccess(false);
    };

    if (view === 'landing') {
        return <LandingPage onLoginClick={() => switchForm('login')} onGetStartedClick={() => switchForm('signup')} onAdminClick={handleAdminLogin} />;
    }

    const isLoginView = view === 'login';

    return (
        <div className="min-h-screen bg-dark-bg text-text-main font-sans flex flex-col justify-center items-center p-4">
             <header className="text-center mb-10 cursor-pointer" onClick={() => setView('landing')}>
                 <div className="flex items-center justify-center gap-2">
                    <Logo />
                </div>
                <p className="text-text-secondary mt-2 text-lg">
                    A simple, fast, and elegant service to ping any website.
                </p>
            </header>
            <div className="w-full max-w-sm bg-light-bg p-8 rounded-xl shadow-2xl border border-slate-700">
                <h2 className="text-3xl font-bold text-center text-text-main mb-2">
                    {isLoginView ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="text-center text-text-secondary mb-8">
                    {isLoginView ? 'Sign in to continue' : 'Get started with Pynor'}
                </p>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative">
                        <UserIcon className="w-5 h-5 text-slate-500 absolute top-1/2 left-3 -translate-y-1/2" />
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 pl-10 text-text-main placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                        />
                    </div>
                    <div className="relative">
                        <LockClosedIcon className="w-5 h-5 text-slate-500 absolute top-1/2 left-3 -translate-y-1/2" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 pl-10 pr-10 text-text-main placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                        </button>
                    </div>
                     <div className="flex justify-end -mt-4">
                        {isLoginView && (
                             <button type="button" onClick={() => alert('Password reset functionality is not implemented in this demo.')} className="text-sm text-primary hover:text-blue-400 font-semibold">
                                Forgot Password?
                            </button>
                        )}
                    </div>
                     {error && <p className="text-red-400 text-center text-sm">{error}</p>}
                    <button
                        type="submit"
                        disabled={loading || isSuccess}
                        className={`w-full font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                            isSuccess
                                ? 'bg-secondary text-slate-900 cursor-default'
                                : 'bg-primary text-white hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed'
                        }`}
                    >
                       {isSuccess ? (
                            <>
                                <CheckIcon className="w-5 h-5" />
                                <span>Success! Redirecting...</span>
                            </>
                        ) : (
                            <>
                                {loading && <Spinner />}
                                <span>{isLoginView ? 'Login' : 'Sign Up'}</span>
                            </>
                        )}
                    </button>
                </form>
                <p className="text-center text-text-secondary mt-6 text-sm">
                    {isLoginView ? "Don't have an account?" : 'Already have an account?'}
                    <button onClick={() => switchForm(isLoginView ? 'signup' : 'login')} className="font-semibold text-primary hover:text-blue-400 ml-1">
                        {isLoginView ? 'Sign Up' : 'Login'}
                    </button>
                </p>
            </div>
             <footer className="text-center text-slate-600 py-8 mt-8">
                <p>
                    Pynor by{' '}
                    <a
                        href="https://twitter.com/Oladizz01"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-primary transition-colors"
                    >
                        𝕆𝕃𝔸𝔻𝕀ℤℤ
                    </a>
                </p>
            </footer>
        </div>
    );
};