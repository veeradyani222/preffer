'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { 
    UserPlus, 
    Calendar, 
    ShoppingCart, 
    AlertCircle, 
    HelpCircle, 
    Clock, 
    Star,
    Sparkles
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

const CAPABILITY_LABELS: Record<string, string> = {
    lead_capture: 'Lead Capture',
    appointment_requests: 'Appointment Requests',
    order_quote_requests: 'Orders / Quotes',
    support_escalation: 'Support Escalation',
    faq_unknown_escalation: 'FAQ Unknown Escalation',
    follow_up_requests: 'Follow-up Requests',
    feedback_reviews: 'Feedback & Reviews',
};

const CAPABILITY_DESCRIPTIONS: Record<string, string> = {
    lead_capture: 'Detects buyer/hiring intent and captures contact-qualified leads.',
    appointment_requests: 'Captures meeting/demo intent, preferred scheduling details, and contact.',
    order_quote_requests: 'Captures quote/order intent, scope, quantity, budget, and notes.',
    support_escalation: 'Captures unresolved support issues and creates escalation records.',
    faq_unknown_escalation: 'Captures unanswered questions and unknown FAQ gaps for follow-up.',
    follow_up_requests: 'Captures reminders and delayed-contact requests.',
    feedback_reviews: 'Captures praise, complaints, testimonials, and product/service feedback.',
};

const CAPABILITY_ICONS: Record<string, any> = {
    lead_capture: UserPlus,
    appointment_requests: Calendar,
    order_quote_requests: ShoppingCart,
    support_escalation: AlertCircle,
    faq_unknown_escalation: HelpCircle,
    follow_up_requests: Clock,
    feedback_reviews: Star,
};

const CAPABILITY_COLORS: Record<string, string> = {
    lead_capture: '#E3F2FD',
    appointment_requests: '#F3E5F5',
    order_quote_requests: '#E8F5E9',
    support_escalation: '#FFF3E0',
    faq_unknown_escalation: '#FFF9C4',
    follow_up_requests: '#E8EAF6',
    feedback_reviews: '#FCE4EC',
};

const CAPABILITY_HOVER_COLORS: Record<string, string> = {
    lead_capture: '#BBDEFB',
    appointment_requests: '#E1BEE7',
    order_quote_requests: '#C8E6C9',
    support_escalation: '#FFE0B2',
    faq_unknown_escalation: '#FFF59D',
    follow_up_requests: '#C5CAE9',
    feedback_reviews: '#F8BBD0',
};

interface PortfolioItem {
    id: string;
    name: string;
}

interface CapabilityConfig {
    capability_key: string;
    enabled: boolean;
}

export default function AIManagerPage() {
    const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
    const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('');
    const [capabilities, setCapabilities] = useState<CapabilityConfig[]>([]);
    const [stats, setStats] = useState<Record<string, { records: number; events: number }>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const data = await apiFetch('/portfolio/all');
                const items = (data || []) as PortfolioItem[];
                setPortfolios(items);
                if (items.length > 0) setSelectedPortfolioId(items[0].id);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    useEffect(() => {
        if (!selectedPortfolioId) return;

        (async () => {
            const configResp = await apiFetch(`/portfolio/${selectedPortfolioId}/ai-capabilities`);
            const cfg = (configResp.capabilities || []) as CapabilityConfig[];
            setCapabilities(cfg);

            const enabled = cfg.filter((c) => c.enabled);
            const nextStats: Record<string, { records: number; events: number }> = {};

            await Promise.all(
                enabled.map(async (cap) => {
                    const [recordsResp, eventsResp] = await Promise.all([
                        apiFetch(`/portfolio/${selectedPortfolioId}/ai-capabilities/${cap.capability_key}/records?limit=200`)
                            .catch(() => ({ records: [] })),
                        apiFetch(`/portfolio/${selectedPortfolioId}/ai-tool-events?capability=${cap.capability_key}&limit=300`)
                            .catch(() => ({ events: [] })),
                    ]);

                    nextStats[cap.capability_key] = {
                        records: Array.isArray(recordsResp.records) ? recordsResp.records.length : 0,
                        events: Array.isArray(eventsResp.events) ? eventsResp.events.length : 0,
                    };
                })
            );

            setStats(nextStats);
        })();
    }, [selectedPortfolioId]);

    const enabledCapabilities = useMemo(
        () => capabilities.filter((c) => c.enabled),
        [capabilities]
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#37352f]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="space-y-1">
                <h1 className="text-xl font-semibold text-[#37352f]">
                    AI Manager Modules
                </h1>
                <p className="text-[#9B9A97] text-xs">
                    Intelligent capabilities that detect user intent and automatically capture critical business data from conversations.
                </p>
            </div>

            {/* Portfolio Selector */}
            <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#9B9A97] block mb-2">Portfolio</label>
                <select
                    value={selectedPortfolioId}
                    onChange={(e) => setSelectedPortfolioId(e.target.value)}
                    className="w-full max-w-md border border-[#E9E9E7] rounded px-3 py-2 text-sm text-[#37352f]"
                >
                    {portfolios.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Capabilities Grid */}
            {enabledCapabilities.length === 0 ? (
                <div className="text-center py-12">
                    <div className="inline-block p-4 bg-[#F7F7F5] rounded-full mb-4">
                        <AlertCircle className="w-8 h-8 text-[#9B9A97]" />
                    </div>
                    <h3 className="text-[#37352f] font-medium mb-1">No AI capabilities enabled</h3>
                    <p className="text-[#9B9A97] text-sm">Enable capabilities in your portfolio wizard to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {enabledCapabilities.map((cap) => {
                        const key = cap.capability_key;
                        const itemStats = stats[key] || { records: 0, events: 0 };
                        const Icon = CAPABILITY_ICONS[key] || Sparkles;
                        const bgColor = CAPABILITY_COLORS[key] || '#F7F7F5';
                        const hoverColor = CAPABILITY_HOVER_COLORS[key] || '#EFEFED';
                        
                        return (
                            <Link
                                href={`/user/ai-manager/${key}?portfolioId=${selectedPortfolioId}`}
                                key={key}
                                className="group bg-white border border-[#E9E9E7] rounded-lg hover:shadow-md transition-all flex flex-col h-60 relative overflow-hidden"
                            >
                                {/* Color Header with Slide Effect */}
                                <div 
                                    className="h-24 relative flex items-center justify-center border-b border-[#E9E9E7] rounded-t-lg overflow-hidden shrink-0 transition-all duration-300"
                                    style={{ backgroundColor: bgColor }}
                                >
                                    {/* Sliding color overlay on hover - slides from bottom to top */}
                                    <div 
                                        className="absolute inset-0 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"
                                        style={{ backgroundColor: hoverColor }}
                                    />
                                    <div className="relative z-10">
                                        <Icon className="w-8 h-8 text-[#37352f]" />
                                    </div>
                                </div>

                                <div className="p-3 flex-1 flex flex-col">
                                    <h3 className="text-sm font-medium text-[#37352f] truncate hover:underline">
                                        {CAPABILITY_LABELS[key] || key}
                                    </h3>
                                    <p className="text-xs text-[#9B9A97] mt-1 line-clamp-2 flex-1">
                                        {CAPABILITY_DESCRIPTIONS[key] || 'Capability module'}
                                    </p>
                                    <div className="mt-auto flex items-center justify-between text-xs text-[#9B9A97]">
                                        <span>{itemStats.records} records</span>
                                        <span>{itemStats.events} events</span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
