'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import {
    MessageSquare,
    Bot,
    FileText,
    ArrowLeft,
    Send,
    Plus,
    Clock,
    MoreHorizontal,
    Sparkles,
    Layout
} from 'lucide-react';

interface ContextOptions {
    portfolios: Array<{
        portfolioId: string;
        name: string;
        status: string;
        updatedAt: string;
    }>;
    aiManagers: Array<{
        portfolioId: string;
        portfolioName: string;
        managerName: string;
        finalized: boolean;
        updatedAt: string;
    }>;
}

interface AssistantChat {
    id: string;
    context_type: 'portfolio' | 'ai_manager';
    portfolio_id: string;
    title: string;
    updated_at: string;
    portfolio_name?: string;
    ai_manager_name?: string;
}

interface AssistantMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    metadata?: Record<string, any>;
    created_at: string;
}

export default function AssistantChatPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center h-[50vh]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#37352f]"></div>
                </div>
            }
        >
            <AssistantChatPageContent />
        </Suspense>
    );
}

function AssistantChatPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [view, setView] = useState<'selection' | 'chat'>('selection');
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [sending, setSending] = useState(false);
    const [approvingMessageId, setApprovingMessageId] = useState<string | null>(null);

    const [contextOptions, setContextOptions] = useState<ContextOptions>({ portfolios: [], aiManagers: [] });
    const [chats, setChats] = useState<AssistantChat[]>([]);
    const [selectedChat, setSelectedChat] = useState<AssistantChat | null>(null);
    const [messages, setMessages] = useState<AssistantMessage[]>([]);

    // Selection State
    const [contextType, setContextType] = useState<'portfolio' | 'ai_manager'>('portfolio');
    const [selectedPortfolioId, setSelectedPortfolioId] = useState('');
    const [input, setInput] = useState('');
    const [error, setError] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const availableTargets = useMemo(() => {
        if (contextType === 'portfolio') {
            return contextOptions.portfolios.map((p) => ({ id: p.portfolioId, label: p.name }));
        }
        return contextOptions.aiManagers.map((m) => ({ id: m.portfolioId, label: `${m.managerName} (${m.portfolioName})` }));
    }, [contextType, contextOptions]);

    useEffect(() => {
        const chatId = searchParams.get('chatId');
        if (chatId) {
            loadChat(chatId);
        } else {
            loadInitial();
        }
    }, [searchParams]);

    useEffect(() => {
        if (!selectedPortfolioId && availableTargets.length > 0) {
            setSelectedPortfolioId(availableTargets[0].id);
        }
    }, [availableTargets, selectedPortfolioId]);

    useEffect(() => {
        if (view === 'chat') {
            scrollToBottom();
        }
    }, [messages, view]);

    useEffect(() => {
        // Auto-focus input field when in chat view
        if (view === 'chat' && inputRef.current) {
            inputRef.current.focus();
        }
    }, [view, sending]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadInitial = async () => {
        setLoading(true);
        setError(null);
        setView('selection');
        setSelectedChat(null);
        setMessages([]);
        try {
            const [contexts, chatList] = await Promise.all([
                apiFetch('/assistant/context-options'),
                apiFetch('/assistant/chats')
            ]);

            setContextOptions(contexts);
            setChats(chatList);
        } catch (err: any) {
            setError(err.message || 'Failed to load assistant workspace');
        } finally {
            setLoading(false);
        }
    };

    const loadChat = async (chatId: string) => {
        try {
            const data = await apiFetch(`/assistant/chats/${chatId}/messages`);
            setSelectedChat(data.chat);
            setMessages(data.messages || []);
            setView('chat');
        } catch (err: any) {
            setError(err.message || 'Failed to load chat');
        }
    };

    const handleStartChat = async (e?: FormEvent) => {
        if (e) e.preventDefault();
        if (!selectedPortfolioId) return;

        setCreating(true);
        setError(null);
        try {
            const payload: Record<string, any> = {
                contextType,
                portfolioId: selectedPortfolioId
            };

            const result = await apiFetch('/assistant/chats', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            const newChat = result.chat as AssistantChat;
            setChats((prev) => [newChat, ...prev]);
            setSelectedChat(newChat);
            setMessages([result.initialMessage]);
            setInput('');
            setView('chat');
        } catch (err: any) {
            setError(err.message || 'Failed to create chat');
        } finally {
            setCreating(false);
        }
    };

    const handleSend = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedChat || !input.trim() || sending) return;

        const messageText = input.trim();
        setInput('');
        setSending(true);
        setError(null);

        const optimistic: AssistantMessage = {
            id: `tmp-${Date.now()}`,
            role: 'user',
            content: messageText,
            created_at: new Date().toISOString()
        };
        setMessages((prev) => [...prev, optimistic]);

        try {
            const data = await apiFetch(`/assistant/chats/${selectedChat.id}/messages`, {
                method: 'POST',
                body: JSON.stringify({ message: messageText })
            });

            setMessages((prev) => [
                ...prev.filter((m) => m.id !== optimistic.id),
                data.userMessage,
                data.assistantMessage
            ]);

            setChats((prev) => prev.map((chat) => chat.id === selectedChat.id ? { ...chat, updated_at: new Date().toISOString() } : chat));
            if (data.chat) {
                setSelectedChat(data.chat);
                setChats((prev) =>
                    prev.map((chat) =>
                        chat.id === selectedChat.id
                            ? { ...chat, title: data.chat.title, updated_at: data.chat.updated_at || new Date().toISOString() }
                            : chat
                    )
                );
            }
        } catch (err: any) {
            setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
            setError(err.message || 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleApprove = async (proposalMessageId: string) => {
        if (!selectedChat || approvingMessageId) return;
        setApprovingMessageId(proposalMessageId);
        setError(null);

        try {
            const data = await apiFetch(`/assistant/chats/${selectedChat.id}/approve`, {
                method: 'POST',
                body: JSON.stringify({ proposalMessageId })
            });

            setMessages((prev) => {
                const resolved = prev.map((message) => {
                    if (message.id !== proposalMessageId) return message;
                    return {
                        ...message,
                        metadata: {
                            ...(message.metadata || {}),
                            resolved: true
                        }
                    };
                });
                return [...resolved, data.assistantMessage];
            });
        } catch (err: any) {
            setError(err.message || 'Failed to approve proposal');
        } finally {
            setApprovingMessageId(null);
        }
    };

    const handleBack = () => {
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('chatId');
        router.push('/user/chat');

        setView('selection');
        setSelectedChat(null);
        setMessages([]);
        loadInitial(); // Refresh list to update timestamps
    };

    if (loading && view === 'selection') {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#37352f]"></div>
            </div>
        );
    }

    // --- SELECTION VIEW ---
    if (view === 'selection') {
        return (
            <div className="max-w-4xl mx-auto space-y-12">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-[#37352f]">How can I help you today?</h1>
                    <p className="text-[#9B9A97]">Select a context to start a new session or continue a previous one.</p>
                </div>

                {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 mx-auto max-w-2xl">
                        {error}
                    </div>
                )}

                {/* Main Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                    {/* Portfolio Card */}
                    <button
                        onClick={() => setContextType('portfolio')}
                        className={`relative group p-6 rounded-xl border-2 text-left transition-all ${contextType === 'portfolio'
                            ? 'border-[#37352f] bg-[#F7F7F5]'
                            : 'border-[#E9E9E7] bg-white hover:border-[#D0D0CE]'
                            }`}
                    >
                        <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#EFEFED] text-[#37352f] group-hover:scale-110 transition-transform">
                            <Layout size={24} />
                        </div>
                        <h3 className="text-lg font-semibold text-[#37352f] mb-1">Edit Portfolio</h3>
                        <p className="text-sm text-[#9B9A97]">Update content, change sections, or refine the design of your portfolios.</p>

                        {contextType === 'portfolio' && (
                            <div className="absolute top-4 right-4 text-[#37352f]">
                                <div className="w-4 h-4 rounded-full bg-[#37352f]" />
                            </div>
                        )}
                    </button>

                    {/* AI Manager Card */}
                    <button
                        onClick={() => setContextType('ai_manager')}
                        className={`relative group p-6 rounded-xl border-2 text-left transition-all ${contextType === 'ai_manager'
                            ? 'border-[#37352f] bg-[#F7F7F5]'
                            : 'border-[#E9E9E7] bg-white hover:border-[#D0D0CE]'
                            }`}
                    >
                        <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#EFEFED] text-[#37352f] group-hover:scale-110 transition-transform">
                            <Bot size={24} />
                        </div>
                        <h3 className="text-lg font-semibold text-[#37352f] mb-1">Manage AI Agent</h3>
                        <p className="text-sm text-[#9B9A97]">Configure behavior, tone, and knowledge for your portfolio's AI assistant.</p>

                        {contextType === 'ai_manager' && (
                            <div className="absolute top-4 right-4 text-[#37352f]">
                                <div className="w-4 h-4 rounded-full bg-[#37352f]" />
                            </div>
                        )}
                    </button>
                </div>

                {/* Configuration & Start */}
                <div className="bg-white rounded-xl border border-[#E9E9E7] p-6 max-w-2xl mx-auto shadow-sm">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-[#9B9A97] mb-2">
                                Select {contextType === 'portfolio' ? 'Portfolio' : 'AI Manager'}
                            </label>
                            <select
                                value={selectedPortfolioId}
                                onChange={(e) => setSelectedPortfolioId(e.target.value)}
                                className="w-full rounded-lg border border-[#E9E9E7] px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#37352f]/10"
                            >
                                {availableTargets.length === 0 && <option value="">No targets available</option>}
                                {availableTargets.map((target) => (
                                    <option key={target.id} value={target.id}>{target.label}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => handleStartChat()}
                            disabled={creating || !selectedPortfolioId}
                            className="w-full md:w-auto px-6 py-2.5 bg-[#37352f] text-white rounded-lg font-medium hover:bg-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {creating ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Start Session</span>
                                    <MessageSquare size={16} />
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Recent Chats */}
                {chats.length > 0 && (
                    <div className="max-w-2xl mx-auto pt-8 border-t border-[#E9E9E7]">
                        <div className="flex items-center gap-2 mb-4 text-[#9B9A97]">
                            <Clock size={16} />
                            <h2 className="text-xs font-semibold uppercase tracking-wider">Recent Sessions</h2>
                        </div>
                        <div className="space-y-2">
                            {chats.slice(0, 5).map((chat) => (
                                <button
                                    key={chat.id}
                                    onClick={() => loadChat(chat.id)}
                                    className="w-full p-3 rounded-lg hover:bg-[#F7F7F5] border border-transparent hover:border-[#E9E9E7] transition-all flex items-center gap-3 group text-left"
                                >
                                    <div className="w-8 h-8 rounded bg-[#EFEFED] flex items-center justify-center text-[#37352f]">
                                        {chat.context_type === 'portfolio' ? <Layout size={14} /> : <Bot size={14} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-[#37352f] truncate">{chat.title}</p>
                                        <p className="text-xs text-[#9B9A97]">
                                            {chat.context_type === 'portfolio' ? 'Portfolio' : 'AI Manager'} • Last active {new Date(chat.updated_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <ArrowLeft className="rotate-180 opacity-0 group-hover:opacity-100 transition-opacity text-[#9B9A97]" size={16} />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // --- CHAT VIEW ---
    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] -my-6">
            {/* Header */}
            <header className="flex-none border-b border-[#E9E9E7] bg-white px-6 py-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="p-2 hover:bg-[#F7F7F5] rounded-full text-[#5F5E5B] transition-colors"
                        title="Back to selection"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="font-semibold text-[#37352f] flex items-center gap-2">
                            {selectedChat?.title || 'Chat Session'}
                        </h2>
                        <div className="flex items-center gap-2 text-xs text-[#9B9A97]">
                            <span className={`inline-block w-2 h-2 rounded-full ${selectedChat?.context_type === 'portfolio' ? 'bg-blue-400' : 'bg-purple-400'}`} />
                            {selectedChat?.context_type === 'portfolio' ? 'Editing Portfolio' : 'Managing AI Agent'}
                        </div>
                    </div>
                </div>

                {selectedChat && (
                    <div className="text-xs text-[#9B9A97] bg-[#F7F7F5] px-3 py-1 rounded-full border border-[#E9E9E7]">
                        {selectedChat.context_type === 'portfolio' ? selectedChat.portfolio_name : selectedChat.ai_manager_name || selectedChat.portfolio_name}
                    </div>
                )}
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto bg-[#FCFCFB]">
                <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
                    {messages.length === 0 && (
                        <div className="text-center py-12 text-[#9B9A97]">
                            <Sparkles size={32} className="mx-auto mb-4 opacity-50" />
                            <p>Start the conversation by typing below.</p>
                        </div>
                    )}

                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex gap-6 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {message.role === 'assistant' && (
                                <div className="w-10 h-10 rounded-full bg-[#EFEFED] flex items-center justify-center flex-none mt-1 shadow-sm">
                                    <Bot size={20} className="text-[#37352f]" />
                                </div>
                            )}

                            <div className={`max-w-[85%] space-y-2`}>
                                <div
                                    className={`text-base leading-relaxed ${message.role === 'user'
                                        ? 'bg-zinc-800 text-white px-6 py-4 rounded-2xl rounded-tr-sm shadow-md'
                                        : 'px-2 py-1 text-[#37352f]'
                                        }`}
                                >
                                    {message.role === 'assistant' ? (
                                        <div className="assistant-markdown">
                                            <ReactMarkdown
                                                components={{
                                                    p: ({ children }) => <p className="mb-3 last:mb-0 leading-loose">{children}</p>,
                                                    strong: ({ children }) => <strong className="font-semibold text-black">{children}</strong>,
                                                    em: ({ children }) => <em className="italic">{children}</em>,
                                                    ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                                                    ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                                                    li: ({ children }) => <li className="leading-relaxed pl-1">{children}</li>,
                                                    h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4 text-black">{children}</h1>,
                                                    h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3 text-black">{children}</h2>,
                                                    h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-2 text-black">{children}</h3>,
                                                    code: ({ children }) => <code className="bg-[#F0F0EE] px-1.5 py-0.5 rounded text-sm font-mono text-red-600">{children}</code>,
                                                    hr: () => <hr className="my-6 border-[#E9E9E7]" />,
                                                    blockquote: ({ children }) => <blockquote className="border-l-4 border-[#E9E9E7] pl-4 italic text-[#5F5E5B] my-4">{children}</blockquote>,
                                                }}
                                            >
                                                {message.content}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <span className="whitespace-pre-wrap">{message.content}</span>
                                    )}
                                </div>

                                {message.role === 'assistant' &&
                                    message.metadata?.status === 'pending_portfolio_proposal' &&
                                    message.metadata?.resolved !== true && (
                                        <div className="bg-white border border-[#E9E9E7] rounded-xl p-4 shadow-sm ml-2 max-w-md">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="text-sm text-[#5F5E5B]">
                                                    <p className="font-medium text-[#37352f]">Proposal Ready</p>
                                                    <p>Review changes before applying.</p>
                                                </div>
                                                <button
                                                    onClick={() => handleApprove(message.id)}
                                                    disabled={approvingMessageId === message.id}
                                                    className="flex-none rounded-lg bg-[#37352f] px-4 py-2 text-xs font-medium text-white disabled:opacity-50 hover:bg-black transition-colors shadow-sm"
                                                >
                                                    {approvingMessageId === message.id ? 'Applying...' : 'Approve Changes'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                            </div>

                            {message.role === 'user' && (
                                <div className="hidden" /> /* Hidden user avatar for alignment if needed, or remove */
                            )}
                        </div>
                    ))}
                    {sending && (
                        <div className="flex gap-6 justify-start">
                            <div className="w-10 h-10 rounded-full bg-[#EFEFED] flex items-center justify-center flex-none mt-1 shadow-sm">
                                <Bot size={20} className="text-[#37352f]" />
                            </div>
                            <div className="px-2 py-1">
                                <div className="flex gap-1.5 pt-3 pl-1">
                                    <span className="w-2 h-2 bg-[#9B9A97] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-2 h-2 bg-[#9B9A97] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-2 h-2 bg-[#9B9A97] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} className="h-4" />
                </div>
            </div>

            {/* Input Area */}
            <div className="flex-none bg-white border-t border-[#E9E9E7] p-6">
                <div className="max-w-3xl mx-auto relative">
                    <form onSubmit={handleSend} className="relative">
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={selectedChat?.context_type === 'portfolio' ? 'Ask to change sections, update text, or redesign...' : 'Instruct your AI manager on how to behave...'}
                            className="w-full rounded-xl border border-[#E9E9E7] bg-[#F7F7F5] pl-4 pr-12 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#37352f]/10 transition-shadow"
                        />
                        <button
                            type="submit"
                            disabled={sending || !input.trim()}
                            className="absolute right-2 top-2 p-1.5 bg-[#37352f] text-white rounded-lg hover:bg-black transition-colors disabled:opacity-50 disabled:bg-[#E9E9E7] disabled:text-[#9B9A97]"
                        >
                            <Send size={16} />
                        </button>
                    </form>
                    <p className="text-[10px] text-center text-[#9B9A97] mt-2">
                        AI can make mistakes. Please review generated changes.
                    </p>
                </div>
            </div>
        </div>
    );
}
