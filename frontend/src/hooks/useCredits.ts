import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export interface UserCredits {
    credits: number;
    plan: 'free' | 'pro' | 'enterprise';
    portfolioCount: number;
    canCreatePortfolio: boolean;
    maxSections: number;
}

export function useCredits() {
    const { user } = useAuth();
    const [credits, setCredits] = useState<UserCredits | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchCredits = async () => {
            try {
                const data = await apiFetch('/auth/credits');
                setCredits(data);
                setError(null);
            } catch (err: any) {
                setError(err.message || 'Failed to fetch credits');
            } finally {
                setLoading(false);
            }
        };

        fetchCredits();
    }, [user]);

    return { credits, loading, error };
}
