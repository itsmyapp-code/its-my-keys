"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { ProfileSetup } from "@/components/auth/ProfileSetup";
import { useAuth } from "@/contexts/AuthContext";

export function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, profile, loading, organization } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    if (!user) {
        // Basic Login Screen if not authenticated
        // In a real app, we'd redirect to /login page
        return <LoginScreen />;
    }

    if (!loading && !profile) {
        // User is authenticated but has no profile (Firestore doc)
        return <ProfileSetup />;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Mobile Header */}
            <div className="flex items-center justify-between border-b bg-white p-4 shadow-sm sm:hidden dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <span className="font-semibold text-lg text-gray-800 dark:text-white">Its My Keys</span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.jpg" alt="Logo" className="h-8 w-auto rounded-md" />
            </div>

            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="p-4 sm:ml-64">
                {/* Pilot Banner */}
                {organization?.accountType === 'TRIAL_PILOT' && (
                    <div className="mb-4 rounded-lg bg-indigo-50 p-4 text-indigo-800 border border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🚀</span>
                            <div>
                                <h3 className="font-bold text-sm">Pilot Mode Active</h3>
                                <p className="text-xs">Your account is limited to 30 keys. Enjoy the concierge onboarding!</p>
                            </div>
                        </div>
                        <a href="mailto:support@itsmyapp.co.uk" className="text-xs font-semibold underline hover:text-indigo-900 dark:hover:text-indigo-200">
                            Give Feedback
                        </a>
                    </div>
                )}
                {children}

                {/* Authenticated Footer */}
                <footer className="mt-12 border-t border-gray-200 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <div className="flex items-center gap-2">
                            <span>Produced by </span>
                            <a href="https://itsmyapp.co.uk" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
                                itsmyapp.co.uk
                            </a>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/itsmyapp_logo.png" alt="ItsMyApp Logo" className="h-6 w-auto" />
                        </div>
                        <p>&copy; 2026 Its My Keys. All rights reserved.</p>
                        <p>
                            Need more help? Contact support at <a href="mailto:support@itsmyapp.co.uk" className="text-blue-600 hover:underline">support@itsmyapp.co.uk</a>.
                        </p>
                    </div>
                </footer>
            </div>
        </div>
    );
}

function LoginScreen() {
    const { signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
    const [view, setView] = useState<'login' | 'signup' | 'reset'>('login');
    const [email, setEmail] = useState("");
    const [pass, setPass] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);
        try {
            if (view === 'login') {
                await signInWithEmail(email, pass);
            } else if (view === 'signup') {
                await signUpWithEmail(email, pass);
            } else if (view === 'reset') {
                await resetPassword(email);
                setSuccess("Password reset email sent. Please check your inbox.");
            }
        } catch (err: any) {
            console.error(err);
            // Simple error mapping
            if (err.code === 'auth/invalid-credential') setError("Invalid email or password.");
            else if (err.code === 'auth/email-already-in-use') setError("Email already in use.");
            else if (err.code === 'auth/weak-password') setError("Password should be at least 6 chars.");
            else if (err.code === 'auth/user-not-found') setError("No account found with this email.");
            else setError(err.message || "Failed to authenticate.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800">
                <div className="mb-6 flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/logo.jpg"
                        alt="ItsMyKeys Logo"
                        className="h-20 w-auto rounded-xl shadow-lg"
                    />
                </div>
                <h1 className="mb-6 text-center text-2xl font-bold dark:text-white">
                    {view === 'login' && "Welcome Back"}
                    {view === 'signup' && "Create Account"}
                    {view === 'reset' && "Reset Password"}
                </h1>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                        <input
                            type="email"
                            required
                            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            placeholder="name@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    {view !== 'reset' && (
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 pr-10 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    placeholder="••••••••"
                                    value={pass}
                                    onChange={(e) => setPass(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    {showPassword ? (
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {view === 'login' && (
                                <div className="mt-1 text-right">
                                    <button
                                        type="button"
                                        onClick={() => { setView('reset'); setError(""); }}
                                        className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="rounded bg-red-50 p-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-300">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="rounded bg-green-50 p-2 text-sm text-green-600 dark:bg-green-900/30 dark:text-green-300">
                            {success}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-blue-600 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
                    >
                        {loading ? "Processing..." : (
                            view === 'login' ? "Sign In" :
                                view === 'signup' ? "Sign Up" :
                                    "Send Reset Email"
                        )}
                    </button>
                </form>

                <div className="mt-4 text-center text-sm">
                    <button
                        type="button"
                        onClick={() => {
                            if (view === 'login') setView('signup');
                            else setView('login');
                            setError("");
                            setSuccess("");
                        }}
                        className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                        {view === 'login' && "Need an account? Sign Up"}
                        {view === 'signup' && "Already have an account? Sign In"}
                        {view === 'reset' && "Back to Login"}
                    </button>
                </div>

                {/* Login Screen Footer */}
                <div className="mt-8 border-t border-gray-100 pt-6 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <div className="flex items-center gap-2">
                            <span>Produced by </span>
                            <a href="https://itsmyapp.co.uk" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
                                itsmyapp.co.uk
                            </a>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/itsmyapp_logo.png" alt="ItsMyApp Logo" className="h-5 w-auto" />
                        </div>
                        <p>&copy; 2026 Its My Keys</p>
                        <p>
                            Contact: <a href="mailto:support@itsmyapp.co.uk" className="hover:underline">support@itsmyapp.co.uk</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
