'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
    LayoutDashboard,
    Settings,
    Key,
    User as UserIcon,
    Plus,
    ChevronsLeft,
    Search,
    Menu
} from 'lucide-react';

export default function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isActive = (path: string) => pathname === path;

    const navItems = [
        { name: 'Dashboard', href: '/user/dashboard', icon: LayoutDashboard },
        { name: 'Settings', href: '/user/settings', icon: Settings },
        { name: 'Credentials', href: '/user/credentials', icon: Key },
        { name: 'My Account', href: '/user/account', icon: UserIcon },
    ];

    if (!mounted) return null;

    return (
        <aside
            className={`fixed inset-y-0 left-0 bg-[#F7F7F5] border-r border-[#E9E9E7] flex flex-col z-30 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-12' : 'w-64'
                }`}
        >
            {/* User / Workspace Switcher */}
            <div className={`h-12 flex items-center px-3 hover:bg-[#EFEFED] transition-colors cursor-pointer m-2 rounded-md ${isCollapsed ? 'justify-center' : ''}`}>
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-5 h-5 rounded bg-orange-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        {user?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    {!isCollapsed && (
                        <span className="text-sm font-medium text-[#37352f] truncate">
                            {user?.username}'s Workspace
                        </span>
                    )}
                </div>
                {!isCollapsed && <div className="ml-auto text-[#9B9A97]"><ChevronsLeft size={14} className="hover:text-[#37352f]" onClick={(e) => { e.stopPropagation(); setIsCollapsed(true); }} /></div>}
            </div>

            {isCollapsed && (
                <div className="flex justify-center mb-2 cursor-pointer" onClick={() => setIsCollapsed(false)}>
                    <Menu size={16} className="text-[#9B9A97] hover:text-[#37352f]" />
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
                {!isCollapsed && (
                    <div className="px-2 py-1 mb-2">
                        <div className="flex items-center gap-2 text-[#9B9A97] px-2 py-1 rounded hover:bg-[#EFEFED] cursor-pointer">
                            <Search size={14} />
                            <span className="text-sm">Search</span>
                        </div>
                        <div className="flex items-center gap-2 text-[#9B9A97] px-2 py-1 rounded hover:bg-[#EFEFED] cursor-pointer mt-1">
                            <Plus size={14} />
                            <Link href="/user/chat" className="text-sm">New Chat</Link>
                        </div>
                    </div>
                )}

                <div className="pt-2">
                    {!isCollapsed && <h3 className="px-3 text-xs font-semibold text-[#9B9A97] mb-1">Private</h3>}
                    {navItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-2.5 px-3 py-1 rounded-md transition-colors group min-h-[28px] ${active
                                    ? 'bg-[#EFEFED] text-[#37352f]'
                                    : 'text-[#5F5E5B] hover:bg-[#EFEFED]'
                                    } ${isCollapsed ? 'justify-center' : ''}`}
                                title={isCollapsed ? item.name : undefined}
                            >
                                <item.icon
                                    size={16}
                                    className={`shrink-0 ${active ? 'text-[#37352f]' : 'text-[#9B9A97] group-hover:text-[#5F5E5B]'}`}
                                />
                                {!isCollapsed && <span className="text-sm font-medium truncate">{item.name}</span>}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Bottom Actions */}
            {!isCollapsed && (
                <div className="p-2 border-t border-[#E9E9E7]">
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 px-3 py-1 text-sm text-[#5F5E5B] hover:bg-[#EFEFED] rounded-md text-left"
                    >
                        <span className="text-[#9B9A97]">Log out</span>
                    </button>
                    <div className="flex items-center gap-2 px-3 py-2 mt-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-xs text-[#9B9A97]">Online</span>
                    </div>
                </div>
            )}
        </aside>
    );
}
