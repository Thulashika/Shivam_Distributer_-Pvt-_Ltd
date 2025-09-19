import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';

export const Login: React.FC = () => {
    const [email, setEmail] = useState('manoj.d@shivamdist.com'); // Default for easy login
    const [password, setPassword] = useState('adminpassword123'); // Default for easy login
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login, currentUser } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await login(email, password);
            navigate('/');
        } catch (err: any) {
            setError(err.message || "Failed to log in.");
        }
    };

    // If user is already logged in, redirect to dashboard
    if (currentUser) {
        return <Navigate to="/" />;
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-lg dark:bg-slate-800">
                <div className="text-center">
                    <div className="flex flex-col items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 102.5 102.5" fill="currentColor" className="h-12 w-12 text-blue-600 dark:text-blue-400 mb-2">
                          <path d="M60.3 75.8c-5.4 0-10.3 1.9-14.4 5.1-4.1-3.2-9-5.1-14.4-5.1-13.4 0-24.2 10.8-24.2 24.2v2.5h77.3v-2.5c-.1-13.4-11-24.2-24.3-24.2zM51.3 0C32.7 0 17.6 15.1 17.6 33.8v10.3c0 18.6 15.1 33.8 33.8 33.8s33.8-15.1 33.8-33.8V33.8C85 15.1 69.9 0 51.3 0zm0 67.8c-13.2 0-24-10.7-24-24V33.8c0-13.2 10.7-24 24-24s24 10.7 24 24v10.3c0 13-10.8 23.7-24 23.7z"/>
                          <path d="M96.7 45.1c-1.3-1-3.2-1.5-5.1-1.5-3.5 0-6.8 1.4-9.2 3.8-3.7-2.9-8.4-4.6-13.5-4.6-5.1 0-9.8 1.7-13.5 4.6-2.4-2.4-5.7-3.8-9.2-3.8-1.9 0-3.8.5-5.1 1.5-6.5 4.9-10.5 12.3-10.5 20.6 0 13.4 10.8 24.2 24.2 24.2 5.4 0 10.3-1.9 14.4-5.1 4.1 3.2 9 5.1 14.4 5.1s10.3-1.9 14.4-5.1c4.1 3.2 9 5.1 14.4 5.1 13.4 0 24.2-10.8 24.2-24.2.1-8.3-3.9-15.7-10.3-20.6zM51.3 75.8c-5.4 0-10.3-1.9-14.4-5.1-4.1 3.2-9 5.1-14.4 5.1-8 0-14.9-3.9-19.1-9.8 4.2-5.9 11.1-9.8 19.1-9.8 5.4 0 10.3 1.9 14.4 5.1 4.1-3.2 9-5.1 14.4-5.1s10.3 1.9 14.4 5.1c4.1-3.2 9-5.1 14.4-5.1 8 0 14.9 3.9 19.1 9.8-4.2 5.9-11.1 9.8-19.1 9.8-5.4 0-10.3-1.9-14.4-5.1-4.1 3.2-9 5.1-14.4 5.1z"/>
                        </svg>
                        <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">Shivam Distributer (Pvt) Ltd</h1>
                    </div>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">Welcome back! Please log in to your account.</p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900 dark:text-red-300" role="alert">
                            {error}
                        </div>
                    )}
                    <div className="space-y-4 rounded-md shadow-sm">
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email address</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="relative block w-full px-3 py-3 text-slate-900 placeholder-slate-500 border border-slate-300 rounded-lg appearance-none bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Email address"
                            />
                        </div>
                        <div className="relative">
                            <label htmlFor="password-login" className="sr-only">Password</label>
                            <input
                                id="password-login"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="relative block w-full px-3 py-3 text-slate-900 placeholder-slate-500 border border-slate-300 rounded-lg appearance-none bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Password"
                            />
                             <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 z-20 flex items-center px-4 text-slate-500 dark:text-slate-400"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074L3.707 2.293zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                        <path d="M2 4.272l4.586 4.586a1 1 0 01-1.414 1.414l-4.586-4.586A1 1 0 012 4.272z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="relative flex justify-center w-full px-4 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg group hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Log In
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};