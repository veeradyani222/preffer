'use client';

import { FormEvent, useEffect, useMemo, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { ColorScheme, defaultTheme, getThemeForPortfolio, Theme } from '@/themes';
import ReactMarkdown from 'react-markdown';
import { Send, User, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

interface ManagerMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface ManagerMetaResponse {
    portfolio: {
        id: string;
        slug: string;
        name: string;
        theme: string;
        wizard_data?: any;
    };
    aiManager: {
        name: string;
        personality: string;
    };
    greeting: string;
}

export default function AiManagerPage() {
    const params = useParams();
    const slug = params.slug as string;
    const aiManagerName = params.aiManagerName as string;

    const [meta, setMeta] = useState<ManagerMetaResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [messages, setMessages] = useState<ManagerMessage[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const colorScheme: ColorScheme | undefined = meta?.portfolio?.wizard_data?.colorScheme;
    const theme: Theme = useMemo(
        () => meta ? getThemeForPortfolio(meta.portfolio.theme || 'modern', colorScheme) : defaultTheme,
        [meta, colorScheme]
    );

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, sending]);

    useEffect(() => {
        if (!slug || !aiManagerName) return;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/portfolio/slug/${slug}/ai-manager/${encodeURIComponent(aiManagerName)}`
                );

                if (!response.ok) {
                    setError(response.status === 404 ? 'AI manager not found' : 'Failed to load AI manager');
                    setLoading(false);
                    return;
                }

                const data: ManagerMetaResponse = await response.json();
                setMeta(data);
                setMessages([{ role: 'assistant', content: data.greeting }]);
            } catch {
                setError('Failed to load AI manager');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [slug, aiManagerName]);

    const handleSend = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || sending || !meta) return;

        const userMessage = input.trim();
        const updatedMessages = [...messages, { role: 'user' as const, content: userMessage }];
        setMessages(updatedMessages);
        setInput('');
        setSending(true);

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/portfolio/slug/${slug}/ai-manager/${encodeURIComponent(aiManagerName)}/chat`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: userMessage,
                        history: updatedMessages
                    })
                }
            );

            if (!response.ok) {
                setMessages([
                    ...updatedMessages,
                    { role: 'assistant', content: `Sorry, I couldn't respond right now. Please try again.` }
                ]);
                return;
            }

            const data = await response.json();
            setMessages([...updatedMessages, { role: 'assistant', content: data.reply || 'I can help with that.' }]);
        } catch {
            setMessages([
                ...updatedMessages,
                { role: 'assistant', content: `Sorry, I couldn't respond right now. Please try again.` }
            ]);
        } finally {
            setSending(false);
        }
    };

    // --- Loading State ---
    if (loading) {
        return (
            <div
                className="h-screen w-full flex items-center justify-center"
                style={{ backgroundColor: theme.colors.lightest }}
            >
                <div
                    className="w-10 h-10 border-2 rounded-full animate-spin"
                    style={{ borderColor: theme.colors.medium, borderTopColor: theme.colors.darkest }}
                />
            </div>
        );
    }

    // --- Error State ---
    if (error || !meta) {
        return (
            <div
                className="h-screen w-full flex flex-col items-center justify-center p-6 text-center"
                style={{
                    backgroundColor: theme.colors.lightest,
                    color: theme.colors.darkest,
                    fontFamily: theme.typography.fontFamilyBody
                }}
            >
                <AlertCircle className="w-12 h-12 mb-4" style={{ color: theme.colors.dark }} />
                <h1 className="text-2xl font-semibold mb-2" style={{ fontFamily: theme.typography.fontFamilyHeading }}>
                    AI Manager Unavailable
                </h1>
                <p className="opacity-80">{error || 'Not found'}</p>
            </div>
        );
    }

    // --- Main Layout ---
    return (
        <div
            className="flex flex-col h-screen overflow-hidden"
            style={{
                backgroundColor: theme.colors.lightest,
                color: theme.colors.darkest,
                fontFamily: theme.typography.fontFamilyBody
            }}
        >
            {/* --- Header --- */}
            <header
                className="flex-none px-4 py-3 border-b flex items-center justify-between z-10"
                style={{
                    backgroundColor: theme.colors.lightest,
                    borderColor: `${theme.colors.medium}40`
                }}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm"
                        style={{
                            backgroundColor: theme.colors.lightest,
                            border: `1px solid ${theme.colors.medium}40`,
                            color: theme.colors.darkest
                        }}
                    >
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h1
                            className="text-base font-semibold leading-tight"
                            style={{ fontFamily: theme.typography.fontFamilyHeading }}
                        >
                            {meta.aiManager.name}
                        </h1>
                        <p className="text-xs opacity-70">
                            {meta.portfolio.name}
                        </p>
                    </div>
                </div>
            </header>

            {/* --- Chat Area --- */}
            <main className="flex-1 overflow-y-auto w-full">
                <div className="max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-6">
                    {messages.length === 0 && (
                        <div className="text-center py-20 opacity-50">
                            <Sparkles className="w-12 h-12 mx-auto mb-4" />
                            <p>Start a conversation with {meta.aiManager.name}</p>
                        </div>
                    )}

                    {messages.map((message, index) => {
                        const isUser = message.role === 'user';
                        return (
                            <div
                                key={index}
                                className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                            >
                                {/* Avatar */}
                                <div
                                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1"
                                    style={{
                                        backgroundColor: isUser ? theme.colors.darkest : theme.colors.lightest,
                                        border: `1px solid ${theme.colors.medium}40`,
                                        color: isUser ? theme.colors.lightest : theme.colors.darkest
                                    }}
                                >
                                    {isUser ? <User size={16} /> : <Sparkles size={16} />}
                                </div>

                                {/* Message Bubble */}
                                <div
                                    className={`relative max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3 text-[0.95rem] leading-relaxed shadow-sm
                                        ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}
                                    `}
                                    style={{
                                        backgroundColor: isUser ? theme.colors.darkest : theme.colors.lightest,
                                        color: isUser ? theme.colors.lightest : theme.colors.darkest,
                                        border: isUser ? 'none' : `1px solid ${theme.colors.medium}40`
                                    }}
                                >
                                    {isUser ? (
                                        <p className="whitespace-pre-wrap">{message.content}</p>
                                    ) : (
                                        <div className="prose prose-sm max-w-none" style={{
                                            '--tw-prose-body': theme.colors.darkest,
                                            '--tw-prose-headings': theme.colors.darkest,
                                            '--tw-prose-links': theme.colors.dark,
                                            '--tw-prose-bold': theme.colors.darkest,
                                            '--tw-prose-counters': theme.colors.darkest,
                                            '--tw-prose-bullets': theme.colors.darkest,
                                            '--tw-prose-hr': theme.colors.medium,
                                            '--tw-prose-quotes': theme.colors.darkest,
                                            '--tw-prose-quote-borders': theme.colors.medium,
                                            '--tw-prose-code': theme.colors.darkest,
                                            '--tw-prose-pre-bg': `${theme.colors.medium}20`,
                                            '--tw-prose-th-borders': theme.colors.medium,
                                            '--tw-prose-td-borders': theme.colors.medium,
                                        } as React.CSSProperties}>
                                            <ReactMarkdown>{message.content}</ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {sending && (
                        <div className="flex gap-4">
                            <div
                                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1"
                                style={{
                                    backgroundColor: theme.colors.lightest,
                                    border: `1px solid ${theme.colors.medium}40`,
                                    color: theme.colors.darkest
                                }}
                            >
                                <Sparkles size={16} />
                            </div>
                            <div
                                className="px-5 py-3 rounded-2xl rounded-tl-sm"
                                style={{
                                    backgroundColor: theme.colors.lightest,
                                    border: `1px solid ${theme.colors.medium}40`
                                }}
                            >
                                <div className="flex gap-1.5 items-center h-6">
                                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: theme.colors.dark, animationDelay: '0ms' }} />
                                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: theme.colors.dark, animationDelay: '150ms' }} />
                                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: theme.colors.dark, animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* --- Input Area --- */}
            <footer className="flex-none p-4 pb-6 md:pb-8 w-full z-10" style={{ backgroundColor: theme.colors.lightest }}>
                <div className="max-w-3xl mx-auto">
                    <form
                        onSubmit={handleSend}
                        className="relative flex items-end gap-2 rounded-3xl border shadow-sm transition-shadow focus-within:shadow-md"
                        style={{
                            backgroundColor: theme.colors.lightest,
                            borderColor: `${theme.colors.medium}60`
                        }}
                    >
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={`Message ${meta.aiManager.name}...`}
                            className="flex-1 bg-transparent border-none outline-none py-4 pl-5 pr-2 min-h-[56px] max-h-[200px] text-base resize-none"
                            style={{ color: theme.colors.darkest }}
                            disabled={sending}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || sending}
                            className="absolute right-2 bottom-2 p-2 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed transform active:scale-95"
                            style={{
                                backgroundColor: input.trim() ? theme.colors.darkest : theme.colors.medium,
                                color: theme.colors.lightest
                            }}
                        >
                            {sending ? <RefreshCw className="animate-spin" size={20} /> : <Send size={20} />}
                        </button>
                    </form>
                    <p className="text-center text-xs mt-3 opacity-50">
                        AI can make mistakes. Check important info.
                    </p>
                </div>
            </footer>
        </div>
    );
}
