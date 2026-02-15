'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.replace('/');
            return;
        }
        setReady(true);
    }, [router]);

    if (!ready) return null;

    return (
        <div className="flex min-h-screen bg-white text-gray-900">
            <Sidebar />
            <div className="flex-1 ml-64">
                <main className="p-12 max-w-5xl mx-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
