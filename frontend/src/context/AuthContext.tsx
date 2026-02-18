'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { API_URL, apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';

export interface User {
    id: string;
    email: string;
    username: string;
    displayName?: string;
    profilePicture?: string;
    apiKey?: string;
}

export interface AuthContextType {
    user: User | null;
    loading: boolean;
    loginWithGoogle: () => void;
    logout: () => void;
    setToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(() => {
        // Initialize user from localStorage if available
        if (typeof window !== 'undefined') {
            const savedUser = localStorage.getItem('user');
            return savedUser ? JSON.parse(savedUser) : null;
        }
        return null;
    });
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const userData = await apiFetch('/auth/me');
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
        } catch (error: any) {

            // Only clear auth for true auth failures.
            if (error?.status === 401 || error?.status === 404) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setUser(null);
            } else {
                // Keep existing session data on transient/server errors.
                const savedUser = localStorage.getItem('user');
                if (savedUser && !user) {
                    setUser(JSON.parse(savedUser));
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const loginWithGoogle = () => {
        // Redirect to backend Google auth endpoint
        window.location.href = `${API_URL}/auth/google`;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        router.push('/');
    };

    const setToken = (token: string) => {
        localStorage.setItem('token', token);
        checkUser(); // Fetch user data immediately
    };

    return (
        <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout, setToken }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
