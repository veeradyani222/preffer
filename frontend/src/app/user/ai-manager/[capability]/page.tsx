'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, 
    Database, 
    Activity, 
    CheckCircle2, 
    Clock, 
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    Brain,
    XCircle,
    Sparkles,
    MessageSquare,
    AlertCircle,
    BarChart3
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

const CAPABILITY_COLORS: Record<string, string> = {
    lead_capture: '#E3F2FD',
    appointment_requests: '#F3E5F5',
    order_quote_requests: '#E8F5E9',
    support_escalation: '#FFF3E0',
    faq_unknown_escalation: '#FFF9C4',
    follow_up_requests: '#E8EAF6',
    feedback_reviews: '#FCE4EC',
};

interface PortfolioItem {
    id: string;
    name: string;
}

interface CapabilityConfig {
    capability_key: string;
    enabled: boolean;
}

const RECORD_HIDDEN_KEYS = new Set([
    'id',
    'portfolio_id',
    'updated_at',
    'created_at',
    'idempotency_key',
]);

function stringify(value: any): string {
    if (value === null || value === undefined) return 'Not specified';
    if (typeof value === 'string') return value.trim() ? value : 'Not specified';
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function isPresent(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
}

function labelize(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function getRecordTitle(record: any): string {
    return record.name || record.topic || record.issue_title || record.question || record.item_or_service || record.message || record.intent_summary || 'Record';
}

function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        new: 'bg-slate-100 text-slate-700 border-slate-200',
        open: 'bg-stone-100 text-stone-700 border-stone-200',
        in_progress: 'bg-zinc-100 text-zinc-700 border-zinc-200',
        resolved: 'bg-neutral-100 text-neutral-700 border-neutral-200',
        closed: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[status] || colors.new;
}

function getStatusIcon(status: string) {
    const icons: Record<string, any> = {
        new: Sparkles,
        open: MessageSquare,
        in_progress: Activity,
        resolved: CheckCircle2,
        closed: XCircle,
    };
    return icons[status] || Sparkles;
}

export default function CapabilityDetailPage() {
    const params = useParams<{ capability: string }>();
    const searchParams = useSearchParams();
    const capability = String(params?.capability || '');
    const initialPortfolioId = searchParams.get('portfolioId') || '';

    const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
    const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>(initialPortfolioId);
    const [capabilityEnabled, setCapabilityEnabled] = useState<boolean>(false);
    const [records, setRecords] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showEventsSection, setShowEventsSection] = useState(false);
    const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        (async () => {
            try {
                const data = await apiFetch('/portfolio/all');
                const items = (data || []) as PortfolioItem[];
                setPortfolios(items);
                if (!initialPortfolioId && items.length > 0) {
                    setSelectedPortfolioId(items[0].id);
                }
            } catch (err: any) {
                setError(err.message || 'Failed to load portfolios');
            } finally {
                setLoading(false);
            }
        })();
    }, [initialPortfolioId]);

    useEffect(() => {
        if (!selectedPortfolioId || !capability) return;

        (async () => {
            try {
                setError(null);
                const [cfgResp, recordsResp, eventsResp] = await Promise.all([
                    apiFetch(`/portfolio/${selectedPortfolioId}/ai-capabilities`),
                    apiFetch(`/portfolio/${selectedPortfolioId}/ai-capabilities/${capability}/records?limit=100`).catch(() => ({ records: [] })),
                    apiFetch(`/portfolio/${selectedPortfolioId}/ai-tool-events?capability=${capability}&limit=100`).catch(() => ({ events: [] })),
                ]);

                const capabilities = (cfgResp.capabilities || []) as CapabilityConfig[];
                const current = capabilities.find((c) => c.capability_key === capability);
                setCapabilityEnabled(Boolean(current?.enabled));
                setRecords(Array.isArray(recordsResp.records) ? recordsResp.records : []);
                setEvents(Array.isArray(eventsResp.events) ? eventsResp.events : []);
            } catch (err: any) {
                setError(err.message || 'Failed to load capability details');
            }
        })();
    }, [selectedPortfolioId, capability]);

    const capabilityLabel = useMemo(
        () => CAPABILITY_LABELS[capability] || capability,
        [capability]
    );

    const capabilityColor = useMemo(
        () => CAPABILITY_COLORS[capability] || '#F7F7F5',
        [capability]
    );

    const updateStatus = async (recordId: string, status: string) => {
        if (!selectedPortfolioId) return;
        await apiFetch(`/portfolio/${selectedPortfolioId}/ai-capabilities/${capability}/records/${recordId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
        setRecords((prev) => prev.map((r) => (r.id === recordId ? { ...r, status } : r)));
    };

    const toggleEventExpansion = (eventId: string) => {
        setExpandedEventIds((prev) => {
            const next = new Set(prev);
            if (next.has(eventId)) {
                next.delete(eventId);
            } else {
                next.add(eventId);
            }
            return next;
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-100">
                <div className="text-center">
                    <div className="inline-block p-3 bg-[#F7F7F5] rounded-full mb-3">
                        <Activity className="w-6 h-6 text-[#9B9A97] animate-pulse" />
                    </div>
                    <p className="text-xs text-[#9B9A97]">Loading capability details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="space-y-3">
                <Link 
                    href="/user/ai-manager" 
                    className="inline-flex items-center gap-2 text-xs text-[#9B9A97] hover:text-[#37352f] transition-colors group"
                >
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                    Back to AI modules
                </Link>
                
                <div className="border border-[#E9E9E7] rounded-lg overflow-hidden">
                    <div className="p-4" style={{ backgroundColor: capabilityColor }}>
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-4 h-4 text-[#37352f]" />
                            <h1 className="text-lg font-semibold text-[#37352f]">{capabilityLabel}</h1>
                        </div>
                        <p className="text-xs text-[#37352f] opacity-75">
                            Monitor captured records and analyze AI intent detection performance
                        </p>
                    </div>
                </div>
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

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                        <p className="text-xs text-red-700">{error}</p>
                    </div>
                </div>
            )}

            {/* Capability Not Enabled */}
            {!capabilityEnabled ? (
                <div className="text-center py-12 border border-[#E9E9E7] rounded-lg" style={{ backgroundColor: capabilityColor }}>
                    <div className="inline-block p-3 bg-white rounded-full mb-3">
                        <AlertCircle className="w-6 h-6 text-[#9B9A97]" />
                    </div>
                    <p className="text-sm text-[#37352f] font-medium">This capability is not enabled</p>
                    <p className="text-xs text-[#37352f] opacity-75 mt-1">Enable it in your portfolio wizard to start capturing data.</p>
                </div>
            ) : (
                <>
                    {/* Stats Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-[#9B9A97]">Captured Records</p>
                                    <p className="text-2xl font-semibold text-[#37352f] mt-1">{records.length}</p>
                                </div>
                                <div className="p-2 rounded" style={{ backgroundColor: capabilityColor }}>
                                    <Database className="w-5 h-5 text-[#37352f]" />
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-[#9B9A97]">AI Intent Events</p>
                                    <p className="text-2xl font-semibold text-[#37352f] mt-1">{events.length}</p>
                                </div>
                                <div className="p-2 rounded" style={{ backgroundColor: capabilityColor }}>
                                    <Brain className="w-5 h-5 text-[#37352f]" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Captured Records Section */}
                    <div className="bg-white border border-[#E9E9E7] rounded-lg overflow-hidden">
                        <div className="px-4 py-3 border-b border-[#E9E9E7]" style={{ backgroundColor: capabilityColor }}>
                            <div className="flex items-center gap-2">
                                <Database className="w-4 h-4 text-[#37352f]" />
                                <h2 className="text-sm font-semibold text-[#37352f]">Captured Records</h2>
                                <span className="ml-auto px-2 py-0.5 bg-white text-[#37352f] text-xs rounded">
                                    {records.length}
                                </span>
                            </div>
                        </div>
                        <div className="p-4">
                            {records.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="inline-block p-3 rounded-full mb-2" style={{ backgroundColor: capabilityColor }}>
                                        <Database className="w-6 h-6 text-[#37352f]" />
                                    </div>
                                    <p className="text-xs text-[#9B9A97]">No records captured yet.</p>
                                    <p className="text-xs text-[#9B9A97] mt-1">Records will appear here when visitors interact with your AI assistant.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {records.map((record, idx) => {
                                        const visibleFields = Object.entries(record).filter(([key, value]) => {
                                            if (RECORD_HIDDEN_KEYS.has(key)) return false;
                                            if (key === 'status') return false;
                                            if (key === 'email') return true;
                                            return isPresent(value);
                                        });

                                        const statusColor = getStatusColor(record.status || 'new');
                                        const StatusIcon = getStatusIcon(record.status || 'new');

                                        return (
                                            <div
                                                key={record.id}
                                                className="border border-[#E9E9E7] hover:border-[#37352f] rounded-lg p-3 bg-white hover:shadow-sm transition-all"
                                            >
                                                <div className="flex items-start justify-between gap-3 mb-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <StatusIcon className="w-3.5 h-3.5 text-[#9B9A97] shrink-0" />
                                                            <h3 className="text-sm font-medium text-[#37352f] truncate">
                                                                {getRecordTitle(record)}
                                                            </h3>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs text-[#9B9A97]">
                                                            <Clock className="w-3 h-3" />
                                                            <span>{record.created_at ? new Date(record.created_at).toLocaleString() : 'Not specified'}</span>
                                                        </div>
                                                    </div>
                                                    <select
                                                        value={record.status || 'new'}
                                                        onChange={(e) => updateStatus(record.id, e.target.value)}
                                                        className={`border rounded px-2 py-1 text-xs focus:outline-none ${statusColor}`}
                                                    >
                                                        <option value="new">New</option>
                                                        <option value="open">Open</option>
                                                        <option value="in_progress">In Progress</option>
                                                        <option value="resolved">Resolved</option>
                                                        <option value="closed">Closed</option>
                                                    </select>
                                                </div>

                                                {visibleFields.length > 0 ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-[#F7F7F5] rounded p-3 border border-[#E9E9E7]">
                                                        {visibleFields.map(([key, value]) => (
                                                            <div key={key} className="wrap-break-word">
                                                                <p className="text-xs font-semibold text-[#9B9A97] uppercase tracking-wide mb-0.5">
                                                                    {labelize(key)}
                                                                </p>
                                                                <p className="text-xs text-[#37352f]">
                                                                    {stringify(value)}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-[#9B9A97] italic">No additional captured fields.</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Intent Events Section */}
                    <div className="bg-white border border-[#E9E9E7] rounded-lg overflow-hidden">
                        <div 
                            onClick={() => setShowEventsSection(!showEventsSection)}
                            className="px-4 py-3 border-b border-[#E9E9E7] cursor-pointer hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: capabilityColor }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Brain className="w-4 h-4 text-[#37352f]" />
                                    <h2 className="text-sm font-semibold text-[#37352f]">AI Intent Detection</h2>
                                    <span className="px-2 py-0.5 bg-white text-[#37352f] text-xs rounded">
                                        {events.length}
                                    </span>
                                </div>
                                <ChevronDown 
                                    className={`w-4 h-4 text-[#37352f] transition-transform ${showEventsSection ? 'rotate-180' : ''}`}
                                />
                            </div>
                        </div>
                        
                        {showEventsSection && (
                            <div className="p-4">
                                {events.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="inline-block p-3 rounded-full mb-2" style={{ backgroundColor: capabilityColor }}>
                                            <Brain className="w-6 h-6 text-[#37352f]" />
                                        </div>
                                        <p className="text-xs text-[#9B9A97]">No AI intent events yet.</p>
                                        <p className="text-xs text-[#9B9A97] mt-1">Intent detection events will appear as the AI processes conversations.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {events.map((evt, idx) => {
                                            const extracted = evt?.payload_json?.extracted_action || {};
                                            const extractedFields = extracted?.extracted_fields && typeof extracted.extracted_fields === 'object'
                                                ? Object.entries(extracted.extracted_fields)
                                                : [];
                                            const isExpanded = expandedEventIds.has(evt.id);

                                            return (
                                                <div
                                                    key={evt.id}
                                                    className="border border-[#E9E9E7] hover:border-[#37352f] rounded-lg overflow-hidden bg-white hover:shadow-sm transition-all"
                                                >
                                                    <div 
                                                        onClick={() => toggleEventExpansion(evt.id)}
                                                        className="p-3 cursor-pointer"
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    {isExpanded ? (
                                                                        <ChevronDown className="w-3.5 h-3.5 text-[#9B9A97] shrink-0" />
                                                                    ) : (
                                                                        <ChevronRight className="w-3.5 h-3.5 text-[#9B9A97] shrink-0" />
                                                                    )}
                                                                    <h3 className="text-sm font-medium text-[#37352f]">
                                                                        {stringify(extracted.intent_label)}
                                                                    </h3>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 text-xs text-[#9B9A97] ml-5">
                                                                    <Clock className="w-3 h-3" />
                                                                    <span>{evt.created_at ? new Date(evt.created_at).toLocaleString() : 'Not specified'}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {evt.status === 'error' ? (
                                                                    <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded border border-red-200">
                                                                        Error
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded border border-green-200">
                                                                        Success
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {isExpanded && (
                                                        <div className="border-t border-[#E9E9E7] p-3 bg-[#F7F7F5] space-y-3">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                <div>
                                                                    <p className="text-xs font-semibold text-[#9B9A97] uppercase tracking-wide mb-0.5">Confidence</p>
                                                                    <p className="text-xs text-[#37352f]">{stringify(extracted.confidence)}</p>
                                                                </div>
                                                                {extractedFields.map(([key, value]) => (
                                                                    <div key={key}>
                                                                        <p className="text-xs font-semibold text-[#9B9A97] uppercase tracking-wide mb-0.5">{labelize(key)}</p>
                                                                        <p className="text-xs text-[#37352f]">{stringify(value)}</p>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            <div>
                                                                <p className="text-xs font-semibold text-[#9B9A97] uppercase tracking-wide mb-0.5">Intent Summary</p>
                                                                <p className="text-xs text-[#37352f]">{stringify(extracted.intent_summary)}</p>
                                                            </div>

                                                            <div>
                                                                <p className="text-xs font-semibold text-[#9B9A97] uppercase tracking-wide mb-0.5">AI Reasoning</p>
                                                                <p className="text-xs text-[#37352f]">{stringify(extracted.reasoning)}</p>
                                                            </div>

                                                            {extracted.missing_fields && (
                                                                <div>
                                                                    <p className="text-xs font-semibold text-[#9B9A97] uppercase tracking-wide mb-0.5">Missing Fields</p>
                                                                    <p className="text-xs text-[#37352f]">{stringify(extracted.missing_fields)}</p>
                                                                </div>
                                                            )}

                                                            <div className="pt-2 border-t border-[#E9E9E7]">
                                                                <p className="text-xs font-semibold text-[#9B9A97] uppercase tracking-wide mb-2">Conversation Context</p>
                                                                <div className="space-y-2">
                                                                    <div className="bg-white border border-[#E9E9E7] rounded p-2">
                                                                        <p className="text-xs font-semibold text-[#9B9A97] mb-1">Visitor Message</p>
                                                                        <p className="text-xs text-[#37352f]">{stringify(evt?.payload_json?.visitor_message)}</p>
                                                                    </div>
                                                                    <div className="bg-white border border-[#E9E9E7] rounded p-2">
                                                                        <p className="text-xs font-semibold text-[#9B9A97] mb-1">AI Reply</p>
                                                                        <p className="text-xs text-[#37352f]">{stringify(evt?.payload_json?.ai_reply)}</p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {evt.error_message && (
                                                                <div className="bg-red-50 border border-red-200 p-2 rounded">
                                                                    <p className="text-xs font-semibold text-red-700 mb-1">Error Message</p>
                                                                    <p className="text-xs text-red-900">{evt.error_message}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
