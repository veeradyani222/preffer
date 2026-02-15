'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import {
    LayoutDashboard,
    Settings,
    Key,
    User as UserIcon,
    Plus,
    ChevronsLeft,
    Search,
    Menu,
    MessageSquare,
    Bot,
    Edit2,
    Check,
    X,
    BarChart3,
} from 'lucide-react';

export default function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [recentChats, setRecentChats] = useState<any[]>([]);
    const [editingChatId, setEditingChatId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && user) {
            apiFetch('/assistant/chats')
                .then((chats: any[]) => setRecentChats(chats.slice(0, 5)))
                .catch(err => console.error('Failed to load recent chats:', err));
        }
    }, [mounted, user]);

    const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

    const startEditing = (chat: any, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingChatId(chat.id);
        setEditTitle(chat.title || 'Untitled Chat');
    };

    const cancelEditing = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setEditingChatId(null);
        setEditTitle('');
    };

    const saveEditing = async (chatId: string, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (!editTitle.trim()) return cancelEditing();

        // Optimistic update
        const originalChats = [...recentChats];
        setRecentChats(prev => prev.map(c => c.id === chatId ? { ...c, title: editTitle } : c));
        setEditingChatId(null);

        try {
            await apiFetch(`/assistant/chats/${chatId}/title`, {
                method: 'PATCH',
                body: JSON.stringify({ title: editTitle })
            });
        } catch (err) {
            console.error('Failed to rename chat:', err);
            // Revert on failure
            setRecentChats(originalChats);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, chatId: string) => {
        if (e.key === 'Enter') {
            saveEditing(chatId);
        } else if (e.key === 'Escape') {
            cancelEditing();
        }
    };

    const navItems = [
        { name: 'Dashboard', href: '/user/dashboard', icon: LayoutDashboard },
        { name: 'Analytics', href: '/user/analytics', icon: BarChart3 },
        { name: 'AI Modules', href: '/user/ai-manager', icon: Bot },
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
                    <div className="mb-4">
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

                        {/* Recent Sessions */}
                        {recentChats.length > 0 && (
                            <div className="px-2 mt-2">
                                <h3 className="px-2 text-xs font-semibold text-[#9B9A97] mb-1 uppercase tracking-wider">Recent</h3>
                                <div className="space-y-0.5">
                                    {recentChats.map((chat) => (
                                        <Link
                                            key={chat.id}
                                            href={`/user/chat?chatId=${chat.id}`}
                                            className={`flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#EFEFED] group text-[#5F5E5B] transition-colors relative pr-8 ${isActive(`/user/chat?chatId=${chat.id}`) ? 'bg-[#EFEFED] text-[#37352f]' : ''
                                                }`}
                                            onClick={(e) => editingChatId === chat.id ? e.preventDefault() : null}
                                        >
                                            {chat.context_type === 'portfolio' ? (
                                                <MessageSquare size={14} className="shrink-0 text-[#9B9A97] group-hover:text-[#5F5E5B]" />
                                            ) : (
                                                <Bot size={14} className="shrink-0 text-[#9B9A97] group-hover:text-[#5F5E5B]" />
                                            )}

                                            {editingChatId === chat.id ? (
                                                <div className="flex items-center flex-1 gap-1 min-w-0" onClick={(e) => e.preventDefault()}>
                                                    <input
                                                        type="text"
                                                        value={editTitle}
                                                        onChange={(e) => setEditTitle(e.target.value)}
                                                        onKeyDown={(e) => handleKeyDown(e, chat.id)}
                                                        className="w-full text-xs px-1 py-0.5 border border-gray-300 rounded focus:outline-none focus:border-gray-500 bg-white"
                                                        autoFocus
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <Check size={12} className="text-green-600 cursor-pointer hover:bg-green-100 rounded" onClick={(e) => saveEditing(chat.id, e)} />
                                                    <X size={12} className="text-red-500 cursor-pointer hover:bg-red-100 rounded" onClick={(e) => cancelEditing(e)} />
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="text-sm truncate flex-1">{chat.title || 'Untitled Chat'}</span>
                                                    <div className="hidden group-hover:flex items-center absolute right-1 bg-[#EFEFED] pl-1">
                                                        <Edit2
                                                            size={12}
                                                            className="text-[#9B9A97] hover:text-[#37352f] cursor-pointer"
                                                            onClick={(e) => startEditing(chat, e)}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="pt-2 border-t border-[#E9E9E7]">
                    {!isCollapsed && <h3 className="px-3 text-xs font-semibold text-[#9B9A97] mb-1 mt-2">Workspace</h3>}
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
