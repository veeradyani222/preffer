'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function AuthCallback() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { setToken } = useAuth();

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            setToken(token);
            router.push('/user/dashboard');
        } else {
            console.error('No token found in callback URL');
            router.push('/login?error=no_token');
        }
    }, [searchParams, router, setToken]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-6">
                <div className="w-12 h-12 border-[3px] border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium tracking-wide text-sm uppercase">Authenticating secure session...</p>
            </div>
        </div>
    );
}
