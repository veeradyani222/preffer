'use client';

import { FormEvent, useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ColorScheme, defaultTheme, getThemeForPortfolio, Theme, invertColorScheme } from '@/themes';
import ReactMarkdown from 'react-markdown';
import { Send, User, Sparkles, AlertCircle, RefreshCw, ArrowUp, Home, Moon, Sun } from 'lucide-react';

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
    const router = useRouter();
    const slug = params.slug as string;
    const aiManagerName = params.aiManagerName as string;

    const [meta, setMeta] = useState<ManagerMetaResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [messages, setMessages] = useState<ManagerMessage[]>([]);
    const [isDarkMode, setIsDarkMode] = useState(false); // Default to light mode (or base theme preference)
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const colorScheme: ColorScheme | undefined = meta?.portfolio?.wizard_data?.colorScheme;

    // Use activeTheme everywhere instead of theme
    const currentTheme: Theme = useMemo(() => {
        if (!meta) return defaultTheme;
        let t = getThemeForPortfolio(meta.portfolio.theme || 'modern', colorScheme);
        if (isDarkMode) {
            // Re-generate theme with inverted colors
            const invertedScheme = invertColorScheme(colorScheme || { name: 'Default', colors: ['#1a1a1a', '#4a4a4a', '#e5e5e5', '#ffffff'] });
            t = getThemeForPortfolio(meta.portfolio.theme || 'modern', invertedScheme);
        }
        return t;
    }, [meta, colorScheme, isDarkMode]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, sending]);

    useEffect(() => {
        // Auto-focus input field when component loads or after sending a message
        if (!loading && !error && inputRef.current) {
            inputRef.current.focus();
        }
    }, [loading, error, sending]);

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
                // Don't auto-add greeting to messages list to show empty state designed hero
                // setMessages([{ role: 'assistant', content: data.greeting }]);
            } catch {
                setError('Failed to load AI manager');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [slug, aiManagerName]);

    const handleSend = async (messageText: string) => {
        if (!messageText.trim() || sending || !meta) return;

        const userMessage = messageText.trim();
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

    const handleFormSubmit = (e: FormEvent) => {
        e.preventDefault();
        handleSend(input);
    };

    // --- Loading State ---
    if (loading) {
        return (
            <div
                className="h-screen w-full flex items-center justify-center"
                style={{ backgroundColor: currentTheme.colors.lightest }}
            >
                <div
                    className="w-10 h-10 border-2 rounded-full animate-spin"
                    style={{ borderColor: currentTheme.colors.medium, borderTopColor: currentTheme.colors.darkest }}
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
                    backgroundColor: currentTheme.colors.lightest,
                    color: currentTheme.colors.darkest,
                    fontFamily: currentTheme.typography.fontFamilyBody
                }}
            >
                <AlertCircle className="w-12 h-12 mb-4" style={{ color: currentTheme.colors.dark }} />
                <h1 className="text-2xl font-semibold mb-2" style={{ fontFamily: currentTheme.typography.fontFamilyHeading }}>
                    AI Representative Unavailable
                </h1>
                <p className="opacity-80">{error || 'Not found'}</p>
            </div>
        );
    }

    const portfolioName = meta.portfolio.name;
    const suggestedQuestions = [
        `Tell me about ${portfolioName}`,
        `What are ${portfolioName}'s key skills?`,
        `Show me ${portfolioName}'s projects`,
        `What is ${portfolioName}'s professional background?`,
        `How can I contact ${portfolioName}?`
    ];


    // --- Main Layout ---
    return (
        <div
            className="flex flex-col h-screen overflow-hidden"
            style={{
                backgroundColor: currentTheme.colors.lightest,
                color: currentTheme.colors.darkest,
                fontFamily: currentTheme.typography.fontFamilyBody
            }}
        >
            {/* --- Header --- */}
            <header
                className="flex-none px-6 py-4 flex items-center justify-between z-10"
                style={{
                    backgroundColor: 'transparent'
                }}
            >
                <button
                    onClick={() => router.push(`/${slug}`)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:opacity-80"
                    style={{
                        border: `1px solid ${currentTheme.colors.medium}30`,
                        backgroundColor: 'transparent',
                        color: currentTheme.colors.darkest
                    }}
                >
                    <Home size={18} />
                    <span className="text-sm font-medium">Home</span>
                </button>

                <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="flex items-center justify-center w-10 h-10 rounded-full transition-colors hover:opacity-80"
                    style={{
                        backgroundColor: `${currentTheme.colors.medium}20`,
                        color: currentTheme.colors.darkest
                    }}
                    title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </header>

            {/* --- Chat Area --- */}
            <main className="flex-1 overflow-y-auto w-full flex flex-col">
                <div className="flex-1 w-full max-w-4xl mx-auto px-4 flex flex-col justify-center">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in duration-500">
                            {/* Hero Content */}
                            <div className="space-y-4">
                                <h1
                                    className="text-3xl md:text-5xl font-bold tracking-tight"
                                    style={{ fontFamily: currentTheme.typography.fontFamilyHeading, color: currentTheme.colors.darkest }}
                                >
                                    {meta.aiManager.name}
                                </h1>
                                <p className="text-base md:text-xl opacity-60" style={{ color: currentTheme.colors.darkest }}>
                                    Ask me anything about {meta.portfolio.name}
                                </p>
                            </div>

                            {/* Suggested Questions Grid */}
                            <div className="flex flex-wrap justify-center gap-2 md:gap-3 max-w-2xl px-4">
                                {suggestedQuestions.map((question, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSend(question)}
                                        className="px-4 py-2 md:px-5 md:py-3 rounded-xl text-xs md:text-sm transition-all hover:-translate-y-0.5"
                                        style={{
                                            backgroundColor: `${currentTheme.colors.medium}15`,
                                            color: currentTheme.colors.darkest,
                                            border: `1px solid ${currentTheme.colors.medium}20`,
                                        }}
                                    >
                                        {question}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="py-4 md:py-6 space-y-4 md:space-y-6 w-full">
                            {messages.map((message, index) => {
                                const isUser = message.role === 'user';
                                return (
                                    <div
                                        key={index}
                                        className={`flex gap-3 md:gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                                    >
                                        {/* Message Bubble */}
                                        <div
                                            className={`relative max-w-[90%] md:max-w-[75%] px-4 py-2.5 md:px-5 md:py-3 text-sm md:text-[0.95rem] leading-relaxed
                                                ${isUser ? 'rounded-2xl rounded-tr-sm' : ''}
                                            `}
                                            style={{
                                                backgroundColor: isUser ? currentTheme.colors.darkest : 'transparent',
                                                color: isUser ? currentTheme.colors.lightest : currentTheme.colors.darkest,
                                                paddingLeft: isUser ? '1rem' : '0',
                                            }}
                                        >
                                            {isUser ? (
                                                <p className="whitespace-pre-wrap">{message.content}</p>
                                            ) : (
                                                <div className="prose prose-sm max-w-none" style={{
                                                    '--tw-prose-body': currentTheme.colors.darkest,
                                                    '--tw-prose-headings': currentTheme.colors.darkest,
                                                    '--tw-prose-links': currentTheme.colors.dark,
                                                    '--tw-prose-bold': currentTheme.colors.darkest,
                                                    '--tw-prose-counters': currentTheme.colors.darkest,
                                                    '--tw-prose-bullets': currentTheme.colors.darkest,
                                                    '--tw-prose-hr': currentTheme.colors.medium,
                                                    '--tw-prose-quotes': currentTheme.colors.darkest,
                                                    '--tw-prose-quote-borders': currentTheme.colors.medium,
                                                    '--tw-prose-code': currentTheme.colors.darkest,
                                                    '--tw-prose-pre-bg': `${currentTheme.colors.medium}20`,
                                                    '--tw-prose-th-borders': currentTheme.colors.medium,
                                                    '--tw-prose-td-borders': currentTheme.colors.medium,
                                                    // Responsive text size adjustment for markdown content
                                                    fontSize: 'inherit'
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
                                        className="px-0 py-3"
                                        style={{
                                            // backgroundColor: currentTheme.colors.lightest,
                                            // border: `1px solid ${currentTheme.colors.medium}40`
                                        }}
                                    >
                                        <div className="flex gap-1.5 items-center h-6">
                                            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full animate-bounce" style={{ backgroundColor: currentTheme.colors.dark, animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full animate-bounce" style={{ backgroundColor: currentTheme.colors.dark, animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full animate-bounce" style={{ backgroundColor: currentTheme.colors.dark, animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>
            </main>

            {/* --- Input Area --- */}
            <footer
                className="flex-none p-3 md:p-4 pb-5 md:pb-8 w-full z-10 border-t"
                style={{
                    backgroundColor: currentTheme.colors.lightest,
                    borderColor: `${currentTheme.colors.medium}60`
                }}
            >
                <div className="max-w-3xl mx-auto">
                    <form
                        onSubmit={handleFormSubmit}
                        className="relative flex items-end gap-2 rounded-[2rem] border shadow-sm transition-shadow focus-within:shadow-md"
                        style={{
                            backgroundColor: `${currentTheme.colors.medium}10`, // Very light background for input container
                            borderColor: `${currentTheme.colors.medium}40`
                        }}
                    >
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={`Ask me anything about ${meta.portfolio.name}...`}
                            className="flex-1 bg-transparent border-none outline-none py-3 pl-4 md:py-4 md:pl-6 pr-2 min-h-[48px] md:min-h-[56px] max-h-[150px] md:max-h-[200px] text-sm md:text-base resize-none"
                            style={{ color: currentTheme.colors.darkest }}
                            disabled={sending}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || sending}
                            className="absolute right-2 bottom-2 p-2.5 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed transform active:scale-95"
                            style={{
                                backgroundColor: input.trim() ? currentTheme.colors.darkest : currentTheme.colors.medium,
                                color: currentTheme.colors.lightest
                            }}
                        >
                            {sending ? <RefreshCw className="animate-spin" size={20} /> : <ArrowUp size={20} />}
                        </button>
                    </form>
                </div>
            </footer>
        </div>
    );
}
