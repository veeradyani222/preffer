'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import { Menu } from 'lucide-react';

export default function UserLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [ready, setReady] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
        <div className="flex min-h-screen bg-white">
            <Sidebar
                mobileOpen={mobileSidebarOpen}
                onMobileClose={() => setMobileSidebarOpen(false)}
                onNavigate={() => setMobileSidebarOpen(false)}
            />
            {mobileSidebarOpen && (
                <button
                    type="button"
                    aria-label="Close sidebar"
                    className="fixed inset-0 bg-black/30 z-20 md:hidden"
                    onClick={() => setMobileSidebarOpen(false)}
                />
            )}
            <div className="flex-1 md:ml-64">
                <div className="md:hidden sticky top-0 z-10 bg-white border-b border-[#E9E9E7]">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <button
                            type="button"
                            className="p-2 rounded hover:bg-[#F7F7F5] text-[#37352f]"
                            onClick={() => setMobileSidebarOpen(true)}
                            aria-label="Open sidebar"
                        >
                            <Menu size={18} />
                        </button>
                        <span className="text-sm font-medium text-[#37352f]">Dashboard</span>
                    </div>
                </div>
                <main className="p-4 md:p-12 max-w-5xl mx-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
