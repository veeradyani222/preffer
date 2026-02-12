'use client';

import { useEffect, Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function AuthCallback() {
    return (
        <Suspense fallback={<LoadingState />}>
            <CallbackHandler />
        </Suspense>
    );
}

function CallbackHandler() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { setToken } = useAuth();
    const [status, setStatus] = useState('Authenticating secure session...');

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            setToken(token);
            // Small delay to ensure state updates or just for UX smoothness
            setTimeout(() => {
                router.push('/user/dashboard');
            }, 500);
        } else {
            console.error('No token found in callback URL');
            setStatus('Authentication failed. Redirecting...');
            setTimeout(() => {
                router.push('/login?error=no_token');
            }, 1500);
        }
    }, [searchParams, router, setToken]);

    return <LoadingState message={status} />;
}

function LoadingState({ message = 'Authenticating secure session...' }: { message?: string }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-6">
                <div className="w-12 h-12 border-[3px] border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium tracking-wide text-sm uppercase">{message}</p>
            </div>
        </div>
    );
}
