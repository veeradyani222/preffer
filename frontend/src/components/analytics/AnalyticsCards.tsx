'use client';

import { useState } from 'react';
import {
    ChevronDown,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    Zap,
    Lightbulb,
    HelpCircle,
    MessageSquare
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// UTILS
// ============================================

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

// ============================================
// TYPES
// ============================================

interface SessionMessage {
    id: string;
    role: 'visitor' | 'ai';
    content: string;
    created_at: string;
}

interface ConversationSession {
    id: string;
    portfolio_id: string;
    portfolio_name: string;
    portfolio_slug: string;
    visitor_ip: string;
    started_at: string;
    last_message_at: string;
    message_count: number;
    messages: SessionMessage[];
}

interface InterestArea {
    topic: string;
    count: number;
    percentage: number;
}

interface ConversionOpportunity {
    description: string;
    potential: 'high' | 'medium' | 'low';
    action: string;
}

// ============================================
// COMPONENTS
// ============================================

interface StatCardProps {
    label: string;
    value: number | string;
    sub?: string;
    icon: React.ElementType;
    trend?: boolean; // true = up, false = down/neutral
    compact?: boolean;
}

export function StatCard({ label, value, sub, icon: Icon, trend, compact }: StatCardProps) {
    return (
        <div className={cn(
            "bg-white border border-[#E9E9E7] rounded-xl p-4 transition-all hover:shadow-sm",
            compact ? "p-3" : "p-4"
        )}>
            <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 bg-[#F7F7F5] rounded-md">
                    <Icon size={16} className="text-[#37352f]" />
                </div>
                {trend !== undefined && (
                    <div className={cn(
                        "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                        trend ? "text-green-700 bg-green-50" : "text-[#9B9A97] bg-[#F7F7F5]"
                    )}>
                        {trend ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {trend ? "+Up" : "Stable"}
                    </div>
                )}
            </div>
            <p className={cn("font-bold text-[#37352f]", compact ? "text-xl" : "text-2xl")}>
                {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            <p className="text-xs font-medium text-[#9B9A97]">{label}</p>
            {sub && <p className="text-[10px] text-[#C4C4C0] mt-0.5">{sub}</p>}
        </div>
    );
}

export function ConversationItem({ session }: { session: ConversationSession }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="border border-[#E9E9E7] rounded-xl overflow-hidden bg-white transition-all">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAF9] transition-colors text-left"
            >
                <div className="p-1.5 bg-[#F7F7F5] rounded-full shrink-0">
                    {expanded ? <ChevronDown size={14} className="text-[#9B9A97]" /> : <ChevronRight size={14} className="text-[#9B9A97]" />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-[#37352f] truncate">{session.portfolio_name}</span>
                        <span className="text-[10px] font-medium text-[#9B9A97] bg-[#F7F7F5] px-1.5 py-0.5 rounded-full border border-[#E9E9E7]">
                            {session.message_count} msgs
                        </span>
                    </div>
                    <p className="text-xs text-[#9B9A97] truncate pr-4">
                        {session.messages.find(m => m.role === 'visitor')?.content || 'No visitor messages'}
                    </p>
                </div>
                <span className="text-[10px] font-medium text-[#9B9A97] shrink-0 bg-[#F7F7F5] px-2 py-1 rounded-full">
                    {timeAgo(session.last_message_at)}
                </span>
            </button>

            <AnimatePresence>
                {expanded && session.messages.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-[#E9E9E7] bg-[#FAFAF9]"
                    >
                        <div className="px-4 py-4 space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                            {session.messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.role === 'visitor' ? 'justify-start' : 'justify-end'}`}>
                                    <div className={cn(
                                        "max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm",
                                        msg.role === 'visitor'
                                            ? "bg-white border border-[#E9E9E7] text-[#37352f] rounded-bl-sm"
                                            : "bg-[#37352f] text-white rounded-br-sm"
                                    )}>
                                        <p className="text-[10px] font-bold mb-1 opacity-50 uppercase tracking-widest">
                                            {msg.role === 'visitor' ? 'Visitor' : 'AI Assistant'}
                                        </p>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function InsightCard({ title, children, icon: Icon }: { title: string, children: React.ReactNode, icon?: React.ElementType }) {
    return (
        <div className="bg-white border border-[#E9E9E7] rounded-xl p-5 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
                {Icon && <Icon size={14} className="text-[#9B9A97]" />}
                <h4 className="text-[11px] font-bold text-[#9B9A97] uppercase tracking-wider">{title}</h4>
            </div>
            <div className="flex-1">
                {children}
            </div>
        </div>
    );
}

export function InterestBar({ area }: { area: InterestArea }) {
    return (
        <div>
            <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-[#37352f] font-medium truncate">{area.topic}</span>
                <span className="text-xs text-[#9B9A97] ml-2 font-mono">{area.percentage}%</span>
            </div>
            <div className="w-full bg-[#F7F7F5] rounded-full h-2 overflow-hidden">
                <div
                    className="bg-[#37352f] h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${area.percentage}%` }}
                />
            </div>
        </div>
    );
}

export function QuestionItem({ question }: { question: string }) {
    return (
        <div className="flex items-start gap-3 p-3 bg-[#FAFAF9] rounded-lg border border-[#E9E9E7] hover:border-[#D4D4D4] transition-colors">
            <div className="bg-blue-50 p-1 rounded-md shrink-0">
                <HelpCircle size={14} className="text-blue-500" />
            </div>
            <span className="text-sm text-[#37352f] leading-snug">{question}</span>
        </div>
    );
}

export function OpportunityCard({ opp }: { opp: ConversionOpportunity }) {
    const styles = {
        high: 'bg-green-50 border-green-100 text-green-900',
        medium: 'bg-amber-50 border-amber-100 text-amber-900',
        low: 'bg-gray-50 border-gray-100 text-gray-700'
    };

    const iconColors = {
        high: 'text-green-600',
        medium: 'text-amber-600',
        low: 'text-gray-400'
    };

    return (
        <div className={cn("border rounded-lg p-3.5 transition-all", styles[opp.potential])}>
            <div className="flex items-center gap-2 mb-2">
                <Zap size={14} className={iconColors[opp.potential]} />
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{opp.potential} Potential</span>
            </div>
            <p className="text-sm font-semibold mb-1.5">{opp.description}</p>
            <div className="flex items-center gap-1.5 text-xs opacity-75 font-medium">
                <span>Action:</span>
                <span>{opp.action}</span>
            </div>
        </div>
    );
}
