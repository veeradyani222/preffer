'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
    LayoutTemplate,
    User,
    Layers,
    PenTool,
    Zap,
    Palette,
    Globe,
    Check,
    ChevronRight,
    Sparkles,
    MessageSquare,
    ArrowLeft,
    Loader2,
    FileText,
    Building2, // Sleek icon for Company
    UserCircle, // Sleek icon for Individual
    ArrowUp,
    AlertCircle,
    Target,
    Crown,
    Rocket,
    PartyPopper,
    Lock,
    Bot // Imported Bot icon
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { buildPortfolioUrl, getPortfolioBaseLabel } from '@/lib/publicUrls';

// ============================================
// TYPES
// ============================================

type SectionType = string; // Relaxed to allow custom sections

interface WizardData {
    portfolioType?: 'individual' | 'company';
    name?: string;
    profession?: string;
    description?: string;
    selectedSections?: SectionType[];
    recommendedSections?: SectionType[];
    sectionContents?: Record<string, any>;
    currentSectionIndex?: number;
    hasAiManager?: boolean;
    aiManagerName?: string;
    aiManagerPersonality?: string;
    aiManagerHasPortfolioAccess?: boolean;
    aiManagerFinalized?: boolean;
    theme?: string;
    colorScheme?: {
        name: string;
        colors: string[];
    };
    slug?: string;
}

interface Section {
    id: string;
    type: SectionType;
    title: string;
    content: any;
    order: number;
}

interface Portfolio {
    slug: string;
    id: string;
    wizardStep: number;
    wizard_step: number;
    wizardData: WizardData;
    wizard_data: WizardData;
    sections: Section[];
    status: string;
}

interface ChatMessage {
    role: 'ai' | 'user';
    content: string;
    timestamp: Date;
}

const SECTION_LABELS: Record<string, { label: string; description: string; icon: string }> = {
    hero: { label: 'Hero', description: 'Eye-catching introduction', icon: '🎯' },
    about: { label: 'About', description: 'Tell your story', icon: '👤' },
    services: { label: 'Services', description: 'What you offer', icon: '💼' },
    skills: { label: 'Skills', description: 'Your expertise', icon: '⚡' },
    experience: { label: 'Experience', description: 'Work history', icon: '📈' },
    projects: { label: 'Projects', description: 'Showcase work', icon: '🚀' },
    testimonials: { label: 'Testimonials', description: 'Social proof', icon: '💬' },
    contact: { label: 'Contact', description: 'Get in touch', icon: '📧' },
    faq: { label: 'FAQ', description: 'Q&A', icon: '❓' },
    pricing: { label: 'Pricing', description: 'Costs', icon: '💰' },
    team: { label: 'Team', description: 'Members', icon: '👥' },
    menu: { label: 'Menu', description: 'Offerings', icon: '📋' },
    achievements: { label: 'Achievements', description: 'Awards', icon: '🏆' },
    education: { label: 'Education', description: 'Background', icon: '🎓' },
};

const THEMES = [
    { id: 'minimal', name: 'Minimal', description: 'Clean and contemporary design', icon: Sparkles },
    { id: 'techie', name: 'Techie', description: 'Bold and futuristic aesthetic', icon: Target },
    { id: 'elegant', name: 'Elegant', description: 'Sophisticated and timeless', icon: Crown },
];

const COLOR_SCHEMES = [
    {
        id: 'warm',
        name: 'Warm',
        colors: ['#2D1810', '#8D6E63', '#D7CCC8', '#FFFCF9'] // Dark brown to almost white
    },
    {
        id: 'forest',
        name: 'Forest',
        colors: ['#052010', '#1B4D3E', '#5D8C7B', '#F4FBF7'] // Deep green to mint white
    },
    {
        id: 'ocean',
        name: 'Ocean',
        colors: ['#0B1120', '#1E3A8A', '#93C5FD', '#F8FAFC'] // Deep navy to ice white
    },
    {
        id: 'luxury',
        name: 'Luxury',
        colors: ['#1E1B2E', '#5B21B6', '#DDD6FE', '#FAF9FE'] // Deep violet to lavender white
    },
    {
        id: 'berry',
        name: 'Berry',
        colors: ['#2A0A18', '#BE185D', '#FBCFE8', '#FFF5F7'] // Deep wine to rose white
    },
    {
        id: 'terra',
        name: 'Terra',
        colors: ['#2C1810', '#9A3412', '#FED7AA', '#FFF7ED'] // Deep rust to orange white
    },
    {
        id: 'teal',
        name: 'Teal',
        colors: ['#042F2E', '#0D9488', '#99F6E4', '#F0FDFA'] // Deep teal to mint white
    },
    {
        id: 'slate',
        name: 'Slate',
        colors: ['#0F172A', '#475569', '#CBD5E1', '#F8FAFC'] // Deep slate to ghost white
    },
    {
        id: 'monochrome',
        name: 'Monochrome',
        colors: ['#000000', '#404040', '#A3A3A3', '#FAFAFA'] // Pitch black to pure white
    }
];

// Helper function to format content for display (fallback if backend doesn't provide displayContent)
function formatContentForDisplay(content: any): string {
    if (!content) return '';

    const lines: string[] = [];

    const formatValue = (key: string, value: any): void => {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());

        if (Array.isArray(value)) {
            lines.push(`**${label}:**`);
            value.forEach((item, idx) => {
                if (typeof item === 'object' && item !== null) {
                    const itemTitle = item.name || item.title || item.question || item.role || item.degree || `Item ${idx + 1}`;
                    lines.push(`**${idx + 1}. ${itemTitle}**`);
                    Object.entries(item).forEach(([k, v]) => {
                        if (k !== 'name' && k !== 'title' && k !== 'icon' && k !== 'role' && v) {
                            const sublabel = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                            if (typeof v === 'string' && v.length > 50) {
                                lines.push(`${v}`);
                            } else if (Array.isArray(v)) {
                                const primitiveValues = v.filter(val => typeof val !== 'object' || val === null);
                                const objectValues = v.filter(val => typeof val === 'object' && val !== null);

                                if (primitiveValues.length > 0) {
                                    lines.push(`${sublabel}: ${primitiveValues.join(', ')}`);
                                }

                                if (objectValues.length > 0) {
                                    lines.push(`${sublabel}:`);
                                    objectValues.forEach((nested: any, nestedIdx: number) => {
                                        const nestedTitle = nested.name || nested.title || nested.question || nested.role || `Item ${nestedIdx + 1}`;
                                        const details = Object.entries(nested)
                                            .filter(([nestedKey, nestedValue]) =>
                                                nestedKey !== 'name' &&
                                                nestedKey !== 'title' &&
                                                nestedKey !== 'icon' &&
                                                nestedKey !== 'role' &&
                                                nestedValue
                                            )
                                            .map(([nestedKey, nestedValue]) => {
                                                const nestedLabel = nestedKey.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                                                if (Array.isArray(nestedValue)) {
                                                    return `${nestedLabel}: ${(nestedValue as any[]).join(', ')}`;
                                                }
                                                return `${nestedLabel}: ${nestedValue}`;
                                            });

                                        lines.push(`- ${nestedTitle}${details.length ? ` (${details.join(' | ')})` : ''}`);
                                    });
                                }
                            } else {
                                lines.push(`${sublabel}: ${v}`);
                            }
                        }
                    });
                } else {
                    lines.push(`• ${item}`);
                }
            });
        } else if (typeof value === 'object' && value !== null) {
            lines.push(`**${label}:**`);
            Object.entries(value).forEach(([k, v]) => {
                formatValue(k, v);
            });
        } else if (value) {
            lines.push(`**${label}:** ${value}`);
        }
    };

    Object.entries(content).forEach(([key, value]) => {
        formatValue(key, value);
    });

    // Use double newlines for proper Markdown paragraph breaks
    return lines.join('\n\n');
}

// ============================================
// MAIN WIZARD COMPONENT
// ============================================

export default function WizardPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading, logout } = useAuth();
    const portfolioId = params.id as string;
    const isNew = portfolioId === 'new';

    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [loading, setLoading] = useState(!isNew);
    const [currentStep, setCurrentStep] = useState(1);
    const [tempWizardData, setTempWizardData] = useState<WizardData>({});
    const [maxSections, setMaxSections] = useState(7); // Default: 5 custom + hero + contact

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/');
        } else if (user && !isNew) {
            fetchPortfolio();
        } else if (user && isNew) {
            setLoading(false);
        }
    }, [user, authLoading, isNew]);

    const fetchPortfolio = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/wizard/${portfolioId}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (response.status === 401 || response.status === 404) {
                logout();
                router.push('/');
                return;
            }

            if (response.ok) {
                const data = await response.json();
                setPortfolio(data.portfolio);

                // If portfolio is already published, go to Theme step (first editable step)
                if (data.portfolio.status === 'published') {
                    setCurrentStep(6);
                } else {
                    const step = data.wizardStep || data.portfolio.wizard_step || 2;
                    setCurrentStep(step);
                }

            } else {
                router.push('/user/dashboard');
            }
        } catch (error) {
            console.error('Error fetching portfolio:', error);
            router.push('/user/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const updateWizardStep = async (step: number, data: Partial<WizardData>) => {
        const token = localStorage.getItem('token');
        if (!token || !portfolio) return;

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/wizard/${portfolio.id}/step/${step}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                }
            );

            if (response.ok) {
                const result = await response.json();
                setPortfolio(result.portfolio);
            }
        } catch (error) {
            console.error('Error updating wizard step:', error);
        }
    };

    const createPortfolio = async (portfolioType: 'individual' | 'company') => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/wizard/start`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ portfolioType, name: 'New Portfolio' })
            });

            if (response.ok) {
                const data = await response.json();
                const updatedPortfolio = {
                    ...data.portfolio,
                    wizardData: { ...data.portfolio.wizard_data, portfolioType },
                    wizard_data: { ...data.portfolio.wizard_data, portfolioType }
                };
                setPortfolio(updatedPortfolio);
                setTempWizardData({ portfolioType });
                router.replace(`/user/wizard/${data.portfolioId}`);
                return updatedPortfolio;
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to create portfolio');
            }
        } catch (error) {
            console.error('Error creating portfolio:', error);
            alert('An error occurred. Please try again.');
        }
    };

    const nextStep = () => {
        if (currentStep < 7) setCurrentStep(currentStep + 1);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    if (authLoading || loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-stone-50">
                <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
            </div>
        );
    }

    if (!portfolio && !isNew) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-stone-50">
                <div className="text-center">
                    <h2 className="text-xl font-medium text-stone-900 mb-2">Portfolio not found</h2>
                    <button
                        onClick={() => router.push('/user/dashboard')}
                        className="text-sm text-stone-600 hover:text-stone-900 underline"
                    >
                        Return to dashboard
                    </button>
                </div>
            </div>
        );
    }

    const wizardData = portfolio?.wizardData || portfolio?.wizard_data || tempWizardData;

    const steps = [
        { num: 1, name: 'Type', icon: LayoutTemplate },
        { num: 2, name: 'About', icon: User },
        { num: 3, name: 'Sections', icon: Layers },
        { num: 4, name: 'Content', icon: PenTool },
        { num: 5, name: 'Features', icon: Zap },
        { num: 6, name: 'Theme', icon: Palette },
        { num: 7, name: 'Publish', icon: Globe }
    ];

    return (
        <div className="min-h-screen bg-white flex items-start justify-center p-4 pt-4 lg:p-8 font-sans">
            {/* Centered Dynamic Height Container */}
            <div className="w-full max-w-6xl min-h-[600px] bg-white rounded-xl border border-stone-200 overflow-hidden flex flex-col lg:flex-row relative">

                {/* Left Sidebar Navigation */}
                <aside className="w-full lg:w-64 border-r border-stone-100 bg-stone-50/50 flex flex-col p-6 overflow-y-auto">
                    <button
                        onClick={() => router.push('/user/dashboard')}
                        className="flex items-center gap-2 text-xs font-medium text-stone-500 hover:text-stone-800 mb-8 transition-colors group"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                        Back to Dashboard
                    </button>

                    <div className="space-y-1">
                        <h3 className="px-3 text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-3">
                            Steps
                        </h3>
                        {steps.map((step) => {
                            const Icon = step.icon;
                            const isActive = currentStep === step.num;
                            const isCompleted = currentStep > step.num;
                            const isPublished = portfolio?.status === 'published';
                            const isLockedStep = isPublished && step.num <= 5;
                            const canNavigate = isCompleted || isPublished; // Allow navigation if completed or published

                            return (
                                <button
                                    key={step.num}
                                    onClick={() => canNavigate && setCurrentStep(step.num)}
                                    disabled={!canNavigate}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all text-left ${isActive
                                        ? 'bg-stone-200 text-stone-900 font-medium'
                                        : canNavigate
                                            ? 'text-stone-700 hover:bg-stone-100 cursor-pointer'
                                            : 'text-stone-400 cursor-default'
                                        }`}
                                >
                                    <div className={`w-5 h-5 flex items-center justify-center rounded ${isActive ? 'text-stone-900' : isCompleted ? 'text-stone-700' : 'text-stone-300'
                                        }`}>
                                        {isLockedStep ? <Lock className="w-3.5 h-3.5 text-stone-400" /> : isCompleted ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                                    </div>
                                    <span className="text-sm">{step.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col relative overflow-hidden bg-white">
                    <div className="flex-1 overflow-y-auto overflow-x-hidden">
                        <div className="h-full w-full max-w-3xl mx-auto p-8 lg:p-12 flex flex-col">
                            {/* Step Components */}
                            <div className="flex-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {currentStep === 1 && (
                                    portfolio?.status === 'published' ? <StepLocked stepName="Type" /> :
                                        <StepType
                                            wizardData={wizardData}
                                            onNext={async (type) => {
                                                if (isNew) {
                                                    const newPortfolio = await createPortfolio(type);
                                                    if (newPortfolio) nextStep();
                                                } else {
                                                    await updateWizardStep(2, { portfolioType: type });
                                                    nextStep();
                                                }
                                            }}
                                        />
                                )}

                                {currentStep === 2 && (
                                    portfolio?.status === 'published' ? <StepLocked stepName="About" /> :
                                        <StepAbout
                                            wizardData={wizardData}
                                            onNext={async (data) => {
                                                await updateWizardStep(3, data);
                                                nextStep();
                                            }}
                                            onBack={prevStep}
                                        />
                                )}

                                {currentStep === 3 && portfolio && (
                                    portfolio.status === 'published' ? <StepLocked stepName="Sections" /> :
                                        <StepSections
                                            portfolio={portfolio}
                                            wizardData={wizardData}
                                            maxSections={maxSections}
                                            onNext={async (sections) => {
                                                const token = localStorage.getItem('token');
                                                await fetch(`${process.env.NEXT_PUBLIC_API_URL}/wizard/${portfolio.id}/sections`, {
                                                    method: 'POST',
                                                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ sections })
                                                });
                                                setTempWizardData(prev => ({ ...prev, selectedSections: sections }));

                                                // Directly move to Step 4 after saving sections
                                                await updateWizardStep(4, {});
                                                await fetchPortfolio();
                                                nextStep();
                                            }}
                                            onBack={prevStep}
                                            setMaxSections={setMaxSections}
                                        />
                                )}

                                {currentStep === 4 && portfolio && (
                                    portfolio.status === 'published' ? <StepLocked stepName="Content" /> :
                                        <StepContent
                                            portfolio={portfolio}
                                            wizardData={wizardData}
                                            onNext={async () => {
                                                await updateWizardStep(5, {});
                                                await fetchPortfolio();
                                                nextStep();
                                            }}
                                            onBack={prevStep}
                                            refreshPortfolio={fetchPortfolio}
                                        />
                                )}

                                {currentStep === 5 && portfolio && (
                                    portfolio.status === 'published' ? <StepLocked stepName="Features" /> :
                                        <StepFeatures
                                            wizardData={wizardData}
                                            onNext={async (featuresData) => {
                                                await updateWizardStep(6, featuresData);
                                                nextStep();
                                            }}
                                            onBack={prevStep}
                                        />
                                )}

                                {currentStep === 6 && portfolio && (
                                    <StepTheme
                                        wizardData={wizardData}
                                        onNext={async (theme: string, colorScheme: { name: string; colors: string[] }) => {
                                            await updateWizardStep(7, { theme, colorScheme });
                                            nextStep();
                                        }}
                                        onBack={prevStep}
                                    />
                                )}

                                {currentStep === 7 && portfolio && (
                                    <StepPublish
                                        portfolio={portfolio}
                                        wizardData={wizardData}
                                        onBack={prevStep}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

// ============================================
// LOCKED STEP (for published portfolios)
// ============================================

function StepLocked({ stepName }: { stepName: string }) {
    const router = useRouter();

    return (
        <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-6">
                <Lock className="w-7 h-7 text-stone-400" />
            </div>
            <h2 className="text-2xl font-serif text-stone-900 mb-3">
                {stepName} is locked
            </h2>
            <p className="text-stone-500 max-w-md mb-8 leading-relaxed">
                Right now you can only update your website through chat. Start a new conversation to make changes to your portfolio content.
            </p>
            <button
                onClick={() => router.push('/user/chat')}
                className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 text-white text-sm font-medium rounded-full hover:bg-stone-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
            >
                <MessageSquare className="w-4 h-4" />
                Go to Chat
            </button>
        </div>
    );
}

// ============================================
// STEP 1: TYPE SELECTION
// ============================================

function StepType({ wizardData, onNext }: {
    wizardData: WizardData;
    onNext: (type: 'individual' | 'company') => void
}) {
    const [selected, setSelected] = useState<'individual' | 'company'>(
        wizardData?.portfolioType || 'individual'
    );

    return (
        <div className="flex flex-col h-full justify-center">
            <div className="mb-10 text-center">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Step 1</span>
                <h2 className="text-4xl font-serif text-stone-900 mt-3 mb-4">Who is this portfolio for?</h2>
                <p className="text-stone-500 max-w-md mx-auto">Choose the structure that best fits your needs. This helps us customize the sections.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 max-w-2xl mx-auto w-full">
                <button
                    onClick={() => setSelected('individual')}
                    className={`group p-8 rounded-xl border text-left transition-all duration-300 relative overflow-hidden ${selected === 'individual'
                        ? 'border-stone-900 bg-stone-50'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                        }`}
                >
                    <div className={`w-12 h-12 rounded-full border flex items-center justify-center mb-6 transition-colors ${selected === 'individual' ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-200 text-stone-600'
                        }`}>
                        <UserCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-medium text-stone-900 mb-2">For Myself</h3>
                    <p className="text-sm text-stone-500 leading-relaxed">
                        Showcase your personal work, skills, and experience as a freelancer or professional.
                    </p>
                </button>

                <button
                    onClick={() => setSelected('company')}
                    className={`group p-8 rounded-xl border text-left transition-all duration-300 relative overflow-hidden ${selected === 'company'
                        ? 'border-stone-900 bg-stone-50'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                        }`}
                >
                    <div className={`w-12 h-12 rounded-full border flex items-center justify-center mb-6 transition-colors ${selected === 'company' ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-200 text-stone-600'
                        }`}>
                        <Building2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-medium text-stone-900 mb-2">For a Company</h3>
                    <p className="text-sm text-stone-500 leading-relaxed">
                        Establish an online presence for your business, startup, or agency.
                    </p>
                </button>
            </div>

            <div className="flex justify-center">
                <button
                    onClick={() => onNext(selected)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 text-white text-sm font-medium rounded-full hover:bg-stone-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
                >
                    Continue <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

// ============================================
// STEP 2: ABOUT FORM
// ============================================

function StepAbout({ wizardData, onNext, onBack }: {
    wizardData: WizardData;
    onNext: (data: Partial<WizardData>) => void;
    onBack: () => void;
}) {
    const [name, setName] = useState(wizardData?.name || '');
    const [profession, setProfession] = useState(wizardData?.profession || '');
    const [description, setDescription] = useState(wizardData?.description || '');

    const isCompany = wizardData?.portfolioType === 'company';
    const isValid = name.trim() && description.trim().length >= 200;

    return (
        <div>
            {/* Header Inline with Back Button */}
            <div className="flex items-center justify-between mb-10 border-b border-stone-100 pb-4">
                <div>
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Step 2</span>
                    <h2 className="text-2xl font-serif text-stone-900 mt-1">
                        Basic Details
                    </h2>
                </div>
                {/* Visual indicator of step */}
                <div className="text-right">
                    <p className="text-xs text-stone-400">Tell us about {isCompany ? 'your company' : 'yourself'}</p>
                </div>
            </div>

            <div className="space-y-8 mb-10 max-w-lg mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                            {isCompany ? 'Company Name' : 'Full Name'}
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={isCompany ? "Acme Inc." : "Jane Doe"}
                            className="w-full px-0 py-2 border-b-2 border-stone-200 focus:border-stone-900 focus:outline-none bg-transparent transition-colors text-lg placeholder:text-stone-300 font-medium"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                            {isCompany ? 'Industry' : 'Profession'}
                        </label>
                        <input
                            type="text"
                            value={profession}
                            onChange={(e) => setProfession(e.target.value)}
                            placeholder={isCompany ? "Software Development" : "Visual Designer"}
                            className="w-full px-0 py-2 border-b-2 border-stone-200 focus:border-stone-900 focus:outline-none bg-transparent transition-colors text-lg placeholder:text-stone-300 font-medium"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                        {isCompany ? 'About the Company' : 'About Yourself'}
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="I specialize in building..."
                        rows={6}
                        maxLength={2000}
                        className="w-full p-4 rounded-lg border border-stone-200 focus:border-stone-900 focus:ring-0 focus:outline-none bg-stone-50 transition-colors placeholder:text-stone-300 text-sm leading-relaxed font-sans min-h-[120px] max-h-[400px] overflow-y-auto resize-y [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-stone-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-stone-300"
                    />
                    <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-stone-400">Min 200 chars</span>
                        <span className={`text-xs ${description.length >= 2000 ? 'text-red-500 font-bold' : 'text-stone-400'}`}>
                            {description.length}/2000
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center pt-6 border-t border-stone-100">
                <button
                    onClick={onBack}
                    className="text-stone-500 hover:text-stone-900 text-sm font-medium px-4 py-2"
                >
                    Back
                </button>
                <button
                    onClick={() => onNext({ name, profession, description })}
                    disabled={!isValid}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all shadow-md active:scale-95 ${isValid
                        ? 'bg-stone-900 text-white hover:bg-stone-800 hover:shadow-lg hover:-translate-y-0.5'
                        : 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'
                        }`}
                >
                    Continue <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

// ============================================
// STEP 3: AI SECTION SUGGESTIONS
// ============================================

function StepSections({ portfolio, wizardData, maxSections, onNext, onBack, setMaxSections }: {
    portfolio: Portfolio;
    wizardData: WizardData;
    maxSections: number;
    onNext: (sections: SectionType[]) => void;
    onBack: () => void;
    setMaxSections: (n: number) => void;
}) {
    const [isThinking, setIsThinking] = useState(false);
    const [aiReasoning, setAiReasoning] = useState('');
    const [recommendedSections, setRecommendedSections] = useState<SectionType[]>([]);
    const [selectedSections, setSelectedSections] = useState<SectionType[]>(
        wizardData?.selectedSections || []
    );
    const [hasRecommended, setHasRecommended] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (!hasRecommended && wizardData?.description) {
            getAIRecommendations();
        }
    }, []);

    const getAIRecommendations = async () => {
        setIsThinking(true);
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/wizard/${portfolio.id}/recommend`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ description: wizardData.description })
                }
            );

            if (response.ok) {
                const data = await response.json();
                setRecommendedSections(data.sections);
                setSelectedSections(data.sections);
                setMaxSections(data.maxSections || 7); // Default: 5 custom + hero + contact
                setAiReasoning(data.reasoning);
                setHasRecommended(true);
            } else {
                const fallback: SectionType[] = ['hero', 'about', 'services', 'projects', 'testimonials', 'experience', 'contact'];
                setRecommendedSections(fallback);
                setSelectedSections(fallback);
                setMaxSections(7); // 5 custom + hero + contact
                setHasRecommended(true);
                setAiReasoning("Based on general best practices, I've selected these essential sections for you.");
            }
        } catch (error) {
            console.error('AI recommendation error:', error);
        } finally {
            setIsThinking(false);
        }
    };

    const toggleSection = (section: SectionType) => {
        // Hero and Contact are mandatory - cannot be deselected
        if ((section === 'hero' || section === 'contact') && selectedSections.includes(section)) {
            return; // Do nothing - mandatory sections cannot be removed
        }

        if (selectedSections.includes(section)) {
            setSelectedSections(selectedSections.filter(s => s !== section));
        } else if (selectedSections.length < maxSections) {
            setSelectedSections([...selectedSections, section]);
        }
    };

    const allSections = Object.keys(SECTION_LABELS) as SectionType[];

    return (
        <div>
            <div className="mb-8">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Step 3</span>
                <h2 className="text-3xl font-serif text-stone-900 mt-2 mb-2">Select Sections</h2>
                <p className="text-stone-500">Choose up to {maxSections - 2} custom sections for your portfolio. Hero and Contact are always included.</p>
            </div>

            {/* AI Feedback Area */}
            <div className="mb-8">
                {isThinking ? (
                    <div className="flex items-center gap-3 text-stone-500 bg-stone-50 p-4 rounded-lg border border-stone-100 animate-pulse">
                        <span className="text-sm font-medium">Thinking...</span>
                    </div>
                ) : hasRecommended ? (
                    <div className="bg-stone-50 rounded-lg border border-stone-100 overflow-hidden">
                        <div className="p-4 bg-white/50">
                            <p className="text-stone-900 font-medium text-sm">
                                I have selected these sections for you.
                            </p>
                        </div>

                        {aiReasoning && (
                            <div className="border-t border-stone-200">
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
                                >
                                    <span>Thought Process</span>
                                    <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                </button>
                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-2 text-sm text-stone-600 font-sans prose prose-sm max-w-none">
                                        <ReactMarkdown>{aiReasoning}</ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : null}
            </div>

            {/* Section Selection */}
            {hasRecommended && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex items-center justify-between mb-4 border-b border-stone-100 pb-2">
                        <span className="text-sm font-medium text-stone-900">
                            Selected: <span className="text-stone-500">{selectedSections.length}/{maxSections} total</span>
                            <span className="text-xs text-stone-400 ml-2">({maxSections - 2} custom + Hero + Contact)</span>
                        </span>
                        {selectedSections.length >= maxSections && (
                            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                                Max limit reached
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-8">
                        {allSections.map((section) => {
                            const info = SECTION_LABELS[section];
                            const isSelected = selectedSections.includes(section);
                            const isRecommended = recommendedSections.includes(section);
                            const isMandatory = section === 'hero' || section === 'contact';
                            const canSelect = isSelected || selectedSections.length < maxSections;

                            return (
                                <button
                                    key={section}
                                    onClick={() => canSelect && toggleSection(section)}
                                    disabled={(!canSelect && !isSelected) || (isMandatory && isSelected)}
                                    className={`relative px-3 py-2 rounded-lg border text-xs font-medium transition-all text-center ${isSelected
                                        ? isMandatory
                                            ? 'border-blue-200 bg-blue-50 text-blue-900 cursor-default'
                                            : 'border-yellow-200 bg-yellow-100 text-yellow-900 shadow-sm'
                                        : canSelect
                                            ? 'border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50 bg-white'
                                            : 'border-stone-100 text-stone-300 cursor-not-allowed bg-stone-50/50'
                                        }`}
                                >
                                    {info.label}
                                    {isMandatory && (
                                        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[8px] font-bold px-1 rounded shadow-sm border border-blue-600">
                                            Required
                                        </span>
                                    )}
                                    {!isMandatory && isRecommended && (
                                        <span className="absolute -top-1 -right-1 bg-stone-900 text-white text-[8px] font-bold px-1 rounded shadow-sm border border-stone-900">
                                            AI
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-stone-100">
                <button
                    onClick={onBack}
                    className="text-stone-500 hover:text-stone-900 px-4 py-2 text-sm font-medium transition-colors"
                >
                    Back
                </button>
                <button
                    onClick={() => onNext(selectedSections)}
                    disabled={
                        selectedSections.length === 0 ||
                        isThinking ||
                        !selectedSections.includes('hero') ||
                        !selectedSections.includes('contact')
                    }
                    className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 text-white text-sm font-medium rounded-full hover:bg-stone-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                >
                    Continue <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}



// ============================================
// STEP 4: CONTENT GENERATION (with Approval Flow)
// ============================================

// Typewriter Component for animated text - prevents re-typing on re-renders
const Typewriter = ({ text, speed = 10, onComplete, onUpdate }: { text: string; speed?: number; onComplete?: () => void; onUpdate?: () => void }) => {
    const [displayedText, setDisplayedText] = useState('');
    const hasStartedRef = useRef(false);
    const onUpdateRef = useRef(onUpdate);

    useEffect(() => {
        onUpdateRef.current = onUpdate;
    }, [onUpdate]);

    useEffect(() => {
        if (hasStartedRef.current && text === displayedText) return; // Prevent re-run if already done

        setDisplayedText(''); // Reset on new text
        hasStartedRef.current = true;

        let i = 0;
        const timer = setInterval(() => {
            if (i < text.length) {
                setDisplayedText(text.substring(0, i + 1));
                if (onUpdateRef.current) onUpdateRef.current();
                i++;
            } else {
                clearInterval(timer);
                if (onComplete) onComplete();
            }
        }, speed);
        return () => clearInterval(timer);
    }, [text, speed]);

    return <ReactMarkdown>{displayedText}</ReactMarkdown>;
};

function StepContent({ portfolio, wizardData, onNext, onBack, refreshPortfolio }: {
    portfolio: Portfolio;
    wizardData: WizardData;
    onNext: () => void;
    onBack: () => void;
    refreshPortfolio: () => Promise<void>;
}) {
    const sections = portfolio.sections || [];
    const [currentIdx, setCurrentIdx] = useState(0);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [proposedContent, setProposedContent] = useState<any>(null);
    const [displayContent, setDisplayContent] = useState<string>('');
    const [isContentSaved, setIsContentSaved] = useState(false); // Track if current content is already approved/saved
    const [savedSections, setSavedSections] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        sections.forEach(s => {
            if (s.content && Object.keys(s.content).length > 0) {
                initial[s.id] = true;
            }
        });
        return initial;
    });
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const draftContentRef = useRef<HTMLDivElement>(null);
    const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
    const [showBackConfirm, setShowBackConfirm] = useState(false);

    const currentSection = sections[currentIdx];

    const scrollToBottom = () => {
        if (chatContainerRef.current && !isUserScrolledUp) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    const handleScroll = () => {
        if (chatContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
            // If user is not at the bottom (with a small buffer), they are scrolled up
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
            setIsUserScrolledUp(!isAtBottom);
        }
    };

    // Auto-scroll on new messages only if not scrolled up
    useEffect(() => {
        if (!isUserScrolledUp) {
            scrollToBottom();
        }
    }, [chatMessages, isGenerating]);

    // Scroll to draft content when it appears
    useEffect(() => {
        if (proposedContent && draftContentRef.current) {
            setTimeout(() => {
                draftContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [proposedContent]);

    // Initialize chat when switching sections - load history from backend
    useEffect(() => {
        if (!currentSection) return;

        const loadChatHistory = async () => {
            const token = localStorage.getItem('token');
            const sectionInfo = SECTION_LABELS[currentSection.type as SectionType];
            const hasContent = savedSections[currentSection.id];
            const savedContent = currentSection.content;

            // Reset states
            setProposedContent(null);
            setDisplayContent('');
            setIsContentSaved(false);

            // If section already has saved content, display it with "Saved" indicator
            if (hasContent && savedContent && Object.keys(savedContent).length > 0) {
                setProposedContent(savedContent);
                setDisplayContent(formatContentForDisplay(savedContent));
                setIsContentSaved(true);
            }

            try {
                // Fetch chat history from backend
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/wizard/${portfolio.id}/history/${currentSection.id}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                );

                if (response.ok) {
                    const data = await response.json();

                    if (data.history && data.history.length > 0) {
                        // Has existing conversation - show it
                        const messages: ChatMessage[] = data.history.map((msg: any) => ({
                            role: msg.role,
                            content: msg.content,
                            timestamp: new Date(msg.timestamp)
                        }));
                        setChatMessages(messages);
                        setConversationHistory(messages);

                        // If we have saved content and the last message doesn't indicate it was saved,
                        // add a helpful message showing they can modify it
                        if (hasContent) {
                            const lastMsg = messages[messages.length - 1];
                            const alreadyHasApprovalMsg = lastMsg?.content?.includes('approved and saved') ||
                                lastMsg?.content?.includes('section approved');
                            if (!alreadyHasApprovalMsg) {
                                setChatMessages(prev => [...prev, {
                                    role: 'ai',
                                    content: `✅ This section has been **approved and saved**. You can modify it by chatting with me or regenerate entirely.`,
                                    timestamp: new Date()
                                }]);
                            }
                        }
                        return;
                    }
                }
            } catch (error) {
                console.error('Failed to load chat history:', error);
            }

            // No history found - show welcome message
            setConversationHistory([]);
            setChatMessages([{
                role: 'ai',
                content: hasContent
                    ? `The **${sectionInfo?.label || currentSection.type}** section is complete! You can ask me to modify it or regenerate entirely.`
                    : `Let's make your **${sectionInfo?.label || currentSection.type}** section, tell me what you want it like!`,
                timestamp: new Date()
            }]);
        };

        loadChatHistory();
    }, [currentIdx, portfolio.id]);

    // Chat with AI
    const handleSendMessage = async () => {
        if (!userInput.trim() || !currentSection) return;

        const message = userInput.trim();
        setUserInput('');

        const userMsg: ChatMessage = { role: 'user', content: message, timestamp: new Date() };
        setChatMessages(prev => [...prev, userMsg]);
        setConversationHistory(prev => [...prev, userMsg]);
        setIsGenerating(true);

        const token = localStorage.getItem('token');
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/wizard/${portfolio.id}/chat`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        sectionId: currentSection.id,
                        message,
                        conversationHistory
                    })
                }
            );

            if (response.ok) {
                const data = await response.json();

                const aiMsg: ChatMessage = { role: 'ai', content: data.message, timestamp: new Date() };
                setChatMessages(prev => [...prev, aiMsg]);
                setConversationHistory(prev => [...prev, aiMsg]);

                // If AI proposed content, show it for approval
                if (data.proposedContent) {
                    setProposedContent(data.proposedContent);
                    setDisplayContent(data.displayContent || formatContentForDisplay(data.proposedContent));
                    setIsContentSaved(false); // New content needs approval
                    setChatMessages(prev => [...prev, {
                        role: 'ai',
                        content: "⬇️ I've created a draft. Review it below and click **Approve & Save** if you're happy with it!",
                        timestamp: new Date()
                    }]);
                }

                // If complete (user approved), save and move on
                if (data.isComplete && data.action === 'ready') {
                    if (proposedContent) {
                        await handleApprove();
                    }
                }
            } else {
                setChatMessages(prev => [...prev, {
                    role: 'ai',
                    content: "Sorry, I had trouble with that. Please try again or give me more details.",
                    timestamp: new Date()
                }]);
            }
        } catch (error) {
            console.error('Chat error:', error);
            setChatMessages(prev => [...prev, {
                role: 'ai',
                content: "An error occurred. Please try again.",
                timestamp: new Date()
            }]);
        } finally {
            setIsGenerating(false);
        }
    };

    // Auto-generate content
    const handleAutoGenerate = async () => {
        if (!currentSection) return;

        setChatMessages(prev => [...prev, {
            role: 'ai',
            content: "✨ Generating content based on your profile...",
            timestamp: new Date()
        }]);
        setIsGenerating(true);

        const token = localStorage.getItem('token');
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/wizard/${portfolio.id}/generate`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ sectionId: currentSection.id })
                }
            );

            if (response.ok) {
                const data = await response.json();
                setProposedContent(data.proposedContent);
                setDisplayContent(data.displayContent || formatContentForDisplay(data.proposedContent));
                setIsContentSaved(false); // New content needs approval

                setChatMessages(prev => [...prev, {
                    role: 'ai',
                    content: data.message || "Done! Review the content below and click **Approve & Save** if you're happy with it!",
                    timestamp: new Date()
                }]);
            } else {
                const error = await response.json();
                setChatMessages(prev => [...prev, {
                    role: 'ai',
                    content: error.error || "I'd love to help! Tell me more about what you want in this section.",
                    timestamp: new Date()
                }]);
            }
        } catch (error) {
            console.error('Auto-generate error:', error);
            setChatMessages(prev => [...prev, {
                role: 'ai',
                content: "An error occurred. Please try again.",
                timestamp: new Date()
            }]);
        } finally {
            setIsGenerating(false);
        }
    };

    // Approve and save content
    const handleApprove = async () => {
        if (!currentSection || !proposedContent) return;

        setIsGenerating(true);
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/wizard/${portfolio.id}/approve`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        sectionId: currentSection.id,
                        content: proposedContent
                    })
                }
            );

            if (response.ok) {
                setSavedSections(prev => ({ ...prev, [currentSection.id]: true }));
                setIsContentSaved(true); // Mark content as saved

                setChatMessages(prev => [...prev, {
                    role: 'ai',
                    content: "✅ **Saved!** Moving to next section...",
                    timestamp: new Date()
                }]);

                await refreshPortfolio();

                // AUTO-ADVANCE: Move to next section after short delay
                setTimeout(() => {
                    if (currentIdx < sections.length - 1) {
                        setCurrentIdx(currentIdx + 1);
                        setChatMessages([]);
                        setProposedContent(null);
                        setDisplayContent('');
                    }
                }, 1000);
            } else {
                setChatMessages(prev => [...prev, {
                    role: 'ai',
                    content: "Failed to save. Please try again.",
                    timestamp: new Date()
                }]);
            }
        } catch (error) {
            console.error('Approve error:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    // Request changes to proposed content
    const handleRequestChanges = async (feedback: string) => {
        if (!currentSection || !feedback.trim()) return;

        setIsGenerating(true);
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/wizard/${portfolio.id}/improve`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        sectionId: currentSection.id,
                        feedback
                    })
                }
            );

            if (response.ok) {
                const data = await response.json();
                setProposedContent(data.proposedContent);
                setDisplayContent(data.displayContent || formatContentForDisplay(data.proposedContent));
                setIsContentSaved(false); // Improved content needs approval

                setChatMessages(prev => [...prev, {
                    role: 'ai',
                    content: data.message || "I've made the changes! Check the updated content below.",
                    timestamp: new Date()
                }]);
            }
        } catch (error) {
            console.error('Improve error:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const goToNextSection = () => {
        if (currentIdx < sections.length - 1) {
            setCurrentIdx(currentIdx + 1);
        }
    };

    const goToPrevSection = () => {
        if (currentIdx > 0) {
            setCurrentIdx(currentIdx - 1);
        }
    };

    const isCurrentSectionComplete = currentSection && savedSections[currentSection.id];
    const completedCount = sections.filter(s => savedSections[s.id]).length;

    if (sections.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-stone-600 mb-6">No sections selected.</p>
                <button onClick={onBack} className="px-6 py-2 border border-stone-300 rounded-lg bg-white">Back</button>
            </div>
        );
    }



    const sectionInfo = SECTION_LABELS[currentSection?.type as SectionType];

    return (
        <div className="flex flex-col h-full">
            {/* Header Area */}
            <div className="flex items-end justify-between mb-6">
                <div>
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Step 4</span>
                    <h2 className="text-3xl font-serif text-stone-900 mt-2">
                        Build Content - {sectionInfo?.label || currentSection?.type}
                    </h2>
                    <p className="text-sm text-stone-500 mt-1">Talk to AI to get help or generate content.</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-stone-500">
                    <span>{completedCount}/{sections.length} Completed</span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="flex gap-1 mb-2">
                {sections.map((section, idx) => (
                    <button
                        key={section.id}
                        onClick={() => setCurrentIdx(idx)}
                        className={`group relative flex-1 h-1 rounded-full transition-all duration-300 ${savedSections[section.id]
                            ? 'bg-stone-900'
                            : idx === currentIdx
                                ? 'bg-stone-400'
                                : 'bg-stone-100 hover:bg-stone-200'
                            }`}
                    >
                        <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-medium text-stone-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-2 py-0.5 shadow-sm rounded border border-stone-100 whitespace-nowrap z-10 pointer-events-none">
                            {SECTION_LABELS[section.type as SectionType]?.label || section.type}
                        </span>
                    </button>
                ))}
            </div>

            {/* Chat Interface - Flexible Height */}
            <div className="flex justify-center mb-2">
                <p className="bg-yellow-200 text-gray-500 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-none inline-block">
                    Talk to me below, I'll help you build great content for the {sectionInfo?.label || currentSection?.type} section
                </p>
            </div>
            {/* Chat Interface - Fixed Box */}
            <div className="rounded-2xl border border-stone-200 bg-white h-[350px] flex flex-col overflow-hidden mb-6 shadow-sm relative">
                <div
                    ref={chatContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-6 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
                >
                    {chatMessages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-stone-400">
                            <MessageSquare className="w-8 h-8 mb-2 opacity-20" />
                            <p className="text-sm">Start a conversation to build this section.</p>
                        </div>
                    )}
                    {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                            {/* Message Bubble */}
                            <div className={`max-w-[85%] ${msg.role === 'user'
                                ? 'bg-stone-100 text-stone-900 px-4 py-3 rounded-2xl rounded-tr-sm'
                                : 'text-stone-800 px-0 py-2'
                                }`}>
                                <div className={`prose prose-sm prose-p:text-xs prose-li:text-xs max-w-none ${msg.role === 'user' ? 'prose-p:m-0' : ''}`}>
                                    {msg.role === 'ai' && idx === chatMessages.length - 1 ? (
                                        <Typewriter
                                            text={msg.content}
                                            speed={10}
                                            onUpdate={scrollToBottom}
                                        />
                                    ) : (
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isGenerating && (
                        <div className="flex justify-start">
                            <div className="text-stone-400 text-sm flex items-center gap-1.5 h-8 px-0">
                                <span className="w-1 h-1 bg-stone-400 rounded-full animate-bounce" />
                                <span className="w-1 h-1 bg-stone-400 rounded-full animate-bounce delay-75" />
                                <span className="w-1 h-1 bg-stone-400 rounded-full animate-bounce delay-150" />
                            </div>
                        </div>
                    )}
                    <div />
                </div>
                <div className="border-t border-stone-100 bg-stone-50 p-2">
                    <div className="relative flex items-end gap-2 bg-white p-1.5 rounded-xl border border-stone-200 transition-all shadow-sm focus-within:ring-1 focus-within:ring-stone-300">
                        <textarea
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder={isContentSaved ? "Request changes to saved content..." : proposedContent ? "Request changes..." : "Type instruction..."}
                            className="w-full max-h-32 min-h-[44px] py-2 pl-3 pr-2 bg-transparent border-none focus:ring-0 focus:outline-none text-stone-900 placeholder:text-stone-400 text-sm resize-none"
                            rows={1}
                            disabled={isGenerating}
                        />
                        <div className="flex gap-1 pb-1 pr-1">
                            {!proposedContent && (
                                <button
                                    onClick={handleAutoGenerate}
                                    disabled={isGenerating}
                                    className="p-1.5 text-stone-400 hover:text-stone-900 transition-colors rounded-lg hover:bg-stone-100"
                                    title="Auto-generate"
                                >
                                    <Sparkles className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={handleSendMessage}
                                disabled={!userInput.trim() || isGenerating}
                                className="p-1.5 bg-yellow-400 text-stone-900 rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:bg-yellow-200 transition-all shadow-sm"
                            >
                                <ArrowUp className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Proposed Content Preview (Clean White Card) */}
            {proposedContent && (
                <div ref={draftContentRef} className="mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className={`rounded-xl border shadow-sm overflow-hidden bg-white ${isContentSaved ? 'border-green-200' : 'border-stone-200'}`}>
                        <div className={`px-4 py-3 border-b flex items-center justify-between ${isContentSaved ? 'bg-green-50/50 border-green-100' : 'bg-stone-50/50 border-stone-100'}`}>
                            <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isContentSaved ? 'text-green-600' : 'text-stone-500'}`}>
                                {isContentSaved ? (
                                    <>
                                        <Check className="w-3 h-3" />
                                        Content Approved & Saved
                                    </>
                                ) : (
                                    'Draft Content'
                                )}
                            </span>
                            {!isContentSaved && (
                                <button
                                    onClick={handleApprove}
                                    disabled={isGenerating}
                                    className="flex items-center gap-2 px-4 py-1.5 bg-yellow-400 text-stone-900 text-xs font-bold rounded-full hover:bg-yellow-500 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    Approve & Save <Check className="w-3 h-3" />
                                </button>
                            )}
                            {isContentSaved && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleAutoGenerate}
                                        disabled={isGenerating}
                                        className="flex items-center gap-1 px-3 py-1.5 text-stone-500 text-xs font-medium rounded-full hover:bg-stone-100 transition-colors disabled:opacity-50"
                                    >
                                        <Sparkles className="w-3 h-3" /> Regenerate
                                    </button>
                                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Saved
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="p-6 max-h-80 overflow-y-auto custom-scrollbar bg-white">
                            <div className="prose prose-sm max-w-none text-stone-600">
                                <ReactMarkdown>
                                    {displayContent || formatContentForDisplay(proposedContent)}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Back Confirmation Modal */}
            {showBackConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-stone-900">Leave Content Builder?</h3>
                            </div>
                            <p className="text-stone-600 mb-6">
                                Going back will take you to section selection. Your approved and saved sections and conversation history will remain, but any <strong>unsaved drafts</strong> in the current view will be lost.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowBackConfirm(false)}
                                    className="px-4 py-2 text-stone-600 hover:text-stone-900 font-medium transition-colors"
                                >
                                    Stay Here
                                </button>
                                <button
                                    onClick={() => {
                                        setShowBackConfirm(false);
                                        onBack();
                                    }}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition-colors"
                                >
                                    Yes, Go Back
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mt-6 pt-4 border-t border-stone-100">
                <div className="flex gap-4">
                    <button
                        onClick={() => setShowBackConfirm(true)}
                        className="text-stone-500 hover:text-stone-900 text-sm font-medium transition-colors"
                    >
                        Back
                    </button>
                </div>

                <div className="flex gap-4">
                    {currentIdx > 0 && (
                        <button
                            onClick={goToPrevSection}
                            className="text-stone-400 hover:text-stone-900 text-sm font-medium transition-colors"
                        >
                            Previous
                        </button>
                    )}

                    {currentIdx < sections.length - 1 ? (
                        <button
                            onClick={goToNextSection}
                            className="text-stone-900 hover:text-stone-700 text-sm font-medium transition-colors flex items-center gap-1"
                        >
                            Next <ChevronRight className="w-3 h-3" />
                        </button>
                    ) : (
                        <button
                            onClick={onNext}
                            disabled={completedCount < sections.length}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all shadow-md ${completedCount < sections.length
                                ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                                : 'bg-stone-900 text-white hover:bg-stone-800 hover:shadow-lg'
                                }`}
                        >
                            Finish <Check className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div >
    );
}

// ============================================
// STEP 5: AI FEATURES
// ============================================

function StepFeatures({ wizardData, onNext, onBack }: {
    wizardData: WizardData;
    onNext: (featuresData: Partial<WizardData>) => void;
    onBack: () => void;
}) {
    const PERSONALITIES = [
        { id: 'professional', label: 'Professional', description: 'Clear, polished, and business-focused.' },
        { id: 'friendly', label: 'Friendly', description: 'Warm, approachable, and easy to talk to.' },
        { id: 'concise', label: 'Concise', description: 'Short, direct answers with minimal fluff.' },
        { id: 'storyteller', label: 'Storyteller', description: 'Narrative style with context.' },
    ];

    const [hasAiManager, setHasAiManager] = useState(wizardData?.hasAiManager || false);
    const [aiManagerName, setAiManagerName] = useState(wizardData?.aiManagerName || '');
    const [aiManagerPersonality, setAiManagerPersonality] = useState(wizardData?.aiManagerPersonality || '');
    const [aiManagerHasPortfolioAccess, setAiManagerHasPortfolioAccess] = useState(
        wizardData?.aiManagerHasPortfolioAccess || false
    );
    const [aiManagerFinalized, setAiManagerFinalized] = useState(wizardData?.aiManagerFinalized || false);

    useEffect(() => {
        if (!hasAiManager) {
            setAiManagerFinalized(false);
        }
    }, [hasAiManager]);

    const canFinalize = Boolean(
        hasAiManager &&
        aiManagerName.trim() &&
        aiManagerPersonality &&
        aiManagerHasPortfolioAccess
    );

    const handleContinue = () => {
        onNext({
            hasAiManager,
            aiManagerName: hasAiManager ? aiManagerName.trim() : '',
            aiManagerPersonality: hasAiManager ? aiManagerPersonality : '',
            aiManagerHasPortfolioAccess: hasAiManager ? aiManagerHasPortfolioAccess : false,
            aiManagerFinalized: hasAiManager ? aiManagerFinalized : false
        });
    };

    return (
        <div>
            <div className="mb-8">
                <span className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Step 5</span>
                <h2 className="text-3xl font-bold text-stone-900 mt-1 mb-2">Add your AI Manager</h2>
                <p className="text-stone-600">Set up an AI manager that answers visitors on your behalf like a real manager.</p>
            </div>

            <div
                onClick={() => {
                    const nextState = !hasAiManager;
                    setHasAiManager(nextState);

                    if (!nextState) {
                        setAiManagerName('');
                        setAiManagerPersonality('');
                        setAiManagerHasPortfolioAccess(false);
                        setAiManagerFinalized(false);
                    }
                }}
                className={`group relative p-6 rounded-xl border transition-all cursor-pointer ${hasAiManager
                    ? 'bg-purple-50 border-purple-200 shadow-sm'
                    : 'bg-white border-stone-200 hover:border-stone-300 hover:shadow-sm'
                    }`}
            >
                <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-colors ${hasAiManager ? 'bg-purple-100 text-purple-600' : 'bg-stone-100 text-stone-400'
                        }`}>
                        AI
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className={`text-lg font-bold transition-colors ${hasAiManager ? 'text-purple-900' : 'text-stone-900'
                                }`}>
                                AI Chat Manager
                            </h3>
                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${hasAiManager ? 'bg-purple-600 border-purple-600' : 'border-stone-300 bg-white'
                                }`}>
                                {hasAiManager && <Check className="w-4 h-4 text-white" />}
                            </div>
                        </div>
                        <p className={`text-sm leading-relaxed mb-4 transition-colors ${hasAiManager ? 'text-purple-700' : 'text-stone-600'
                            }`}>
                            It can answer all portfolio-related questions, retain context you share, and continue until you ask it to forget.
                        </p>

                        <div className="flex items-center gap-4 text-xs font-medium">
                            <span className={`px-2 py-1 rounded ${hasAiManager ? 'bg-purple-100 text-purple-700' : 'bg-stone-100 text-stone-600'
                                }`}>
                                150 additional credits
                            </span>
                            <span className={hasAiManager ? 'text-purple-600' : 'text-stone-500'}>
                                Acts like your manager in chat
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {hasAiManager && (
                <div className="mt-6 space-y-5 rounded-xl border border-purple-200 bg-purple-50/50 p-5">
                    <div>
                        <label className="block text-sm font-semibold text-stone-700 mb-2">Give it a name</label>
                        <input
                            value={aiManagerName}
                            onChange={(e) => {
                                setAiManagerName(e.target.value);
                                if (aiManagerFinalized) setAiManagerFinalized(false);
                            }}
                            placeholder="e.g. Alex, Nora, Orion"
                            className="w-full px-4 py-2.5 rounded-lg border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                        />
                    </div>

                    <div>
                        <p className="text-sm font-semibold text-stone-700 mb-2">Choose personality</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {PERSONALITIES.map((personality) => (
                                <button
                                    key={personality.id}
                                    onClick={() => {
                                        setAiManagerPersonality(personality.id);
                                        if (aiManagerFinalized) setAiManagerFinalized(false);
                                    }}
                                    className={`text-left rounded-lg border p-3 transition-all ${aiManagerPersonality === personality.id
                                        ? 'border-purple-500 bg-white shadow-sm'
                                        : 'border-stone-200 bg-white hover:border-stone-300'
                                        }`}
                                >
                                    <p className="text-sm font-semibold text-stone-900">{personality.label}</p>
                                    <p className="text-xs text-stone-600 mt-1">{personality.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-lg border border-stone-200 bg-white p-4">
                        <p className="text-sm text-stone-700 mb-3">
                            Give it access to your portfolio&apos;s data you have shared so far.
                        </p>
                        <button
                            onClick={() => {
                                setAiManagerHasPortfolioAccess(true);
                                if (aiManagerFinalized) setAiManagerFinalized(false);
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${aiManagerHasPortfolioAccess
                                ? 'bg-green-100 text-green-700'
                                : 'bg-stone-900 text-white hover:bg-stone-800'
                                }`}
                        >
                            {aiManagerHasPortfolioAccess ? 'Access Granted' : 'Yes, Give Access'}
                        </button>
                    </div>

                    <div className="flex items-center justify-between gap-4 rounded-lg border border-dashed border-purple-300 bg-white p-4">
                        <p className="text-sm text-stone-600">Finalize this AI agent for your portfolio.</p>
                        <button
                            onClick={() => setAiManagerFinalized(true)}
                            disabled={!canFinalize}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${canFinalize
                                ? 'bg-purple-600 text-white hover:bg-purple-700'
                                : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                                }`}
                        >
                            {aiManagerFinalized ? 'Finalised' : 'Finalize AI Manager'}
                        </button>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center pt-8 border-t border-stone-100 mt-8">
                <button
                    onClick={onBack}
                    className="text-stone-500 hover:text-stone-900 px-4 py-2 text-sm font-medium transition-colors"
                >
                    Back
                </button>
                <button
                    onClick={handleContinue}
                    disabled={hasAiManager && !aiManagerFinalized}
                    className={`flex items-center gap-2 px-6 py-2.5 font-medium rounded-lg transition-all shadow-sm ${hasAiManager && !aiManagerFinalized
                        ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                        : 'bg-stone-900 text-white hover:bg-stone-800 hover:shadow active:scale-95'
                        }`}
                >
                    Continue <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
// ============================================
// STEP 6: THEME SELECTION
// ============================================

function StepTheme({ wizardData, onNext, onBack }: {
    wizardData: WizardData;
    onNext: (theme: string, colorScheme: { name: string; colors: string[] }) => void;
    onBack: () => void;
}) {
    const [selectedTheme, setSelectedTheme] = useState(wizardData?.theme || '');
    const [selectedColorScheme, setSelectedColorScheme] = useState<string>(
        wizardData?.colorScheme?.name || ''
    );

    const isValid = selectedTheme && selectedColorScheme;

    const handleContinue = () => {
        if (!isValid) return;
        const scheme = COLOR_SCHEMES.find(s => s.id === selectedColorScheme);
        if (scheme) {
            onNext(selectedTheme, { name: scheme.name, colors: scheme.colors });
        }
    };

    return (
        <div>
            <div className="mb-8">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Step 6</span>
                <h2 className="text-3xl font-serif text-stone-900 mt-2 mb-2">Choose Your Style</h2>
                <p className="text-stone-500">Select a theme and color scheme for your portfolio.</p>
            </div>

            {/* Theme Selection */}
            <div className="mb-8">
                <h3 className="text-sm font-bold text-stone-700 mb-4 uppercase tracking-wider">Portfolio Theme</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {THEMES.map((theme) => (
                        <button
                            key={theme.id}
                            onClick={() => setSelectedTheme(theme.id)}
                            className={`group p-6 rounded-xl border text-left transition-all duration-300 ${selectedTheme === theme.id
                                ? 'border-stone-900 bg-stone-50 shadow-md'
                                : 'border-stone-200 hover:border-stone-300 bg-white hover:shadow-sm'
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-colors ${selectedTheme === theme.id
                                    ? 'bg-stone-900 text-white'
                                    : 'bg-stone-100 text-stone-400 group-hover:bg-stone-200'
                                    }`}>
                                    <theme.icon className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="text-lg font-semibold text-stone-900">{theme.name}</h4>
                                        {selectedTheme === theme.id && (
                                            <div className="w-5 h-5 bg-stone-900 rounded-full flex items-center justify-center">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm text-stone-500">{theme.description}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Color Scheme Selection - Only show when theme is selected */}
            {selectedTheme && (
                <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className="text-sm font-bold text-stone-700 mb-4 uppercase tracking-wider">Color Scheme</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {COLOR_SCHEMES.map((scheme) => (
                            <button
                                key={scheme.id}
                                onClick={() => setSelectedColorScheme(scheme.id)}
                                className={`group relative rounded-xl border overflow-hidden transition-all ${selectedColorScheme === scheme.id
                                    ? 'border-stone-900 ring-2 ring-stone-900 shadow-lg'
                                    : 'border-stone-200 hover:border-stone-300 hover:shadow-md'
                                    }`}
                            >
                                {/* Stacked Color Boxes */}
                                <div className="h-32 flex flex-col">
                                    {scheme.colors.map((color, idx) => (
                                        <div
                                            key={idx}
                                            className="flex-1"
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>

                                {/* Label */}
                                <div className="p-3 bg-white border-t border-stone-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-stone-700">{scheme.name}</span>
                                        {selectedColorScheme === scheme.id && (
                                            <div className="w-4 h-4 bg-stone-900 rounded-full flex items-center justify-center">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center pt-6 border-t border-stone-100">
                <button
                    onClick={onBack}
                    className="text-stone-500 hover:text-stone-900 px-4 py-2 text-sm font-medium transition-colors"
                >
                    Back
                </button>
                <button
                    onClick={handleContinue}
                    disabled={!isValid}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all shadow-md active:scale-95 ${isValid
                        ? 'bg-stone-900 text-white hover:bg-stone-800 hover:shadow-lg hover:-translate-y-0.5'
                        : 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'
                        }`}
                >
                    Continue <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

// ============================================
// STEP 7: PUBLISH
// ============================================

function StepPublish({ portfolio, wizardData, onBack }: {
    portfolio: Portfolio;
    wizardData: WizardData;
    onBack: () => void;
}) {
    const [slug, setSlug] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const router = useRouter();
    const isPublished = portfolio.status === 'published';

    const checkSlug = async (value: string) => {
        if (!value.trim()) {
            setIsAvailable(null);
            return;
        }
        // If it's the current slug and we're published, it's valid (available for us)
        if (isPublished && value === portfolio.slug) {
            setIsAvailable(true);
            return;
        }

        setIsChecking(true);
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/wizard/${portfolio.id}/slug-check`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ slug: value.toLowerCase().replace(/[^a-z0-9-]/g, '') })
                }
            );
            if (response.ok) {
                const data = await response.json();
                setIsAvailable(data.available);
            } else {
                setIsAvailable(false);
            }
        } catch (error) {
            console.error('Slug check error:', error);
            setIsAvailable(false);
        } finally {
            setIsChecking(false);
        }
    };

    // Auto-generate slug from name if empty or set if published
    useEffect(() => {
        if (isPublished && portfolio.slug) {
            setSlug(portfolio.slug);
            setIsAvailable(true);
        } else if (!slug && wizardData?.name) {
            const suggested = wizardData.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
            setSlug(suggested);
            checkSlug(suggested);
        }
    }, [wizardData?.name, isPublished, portfolio.slug]);

    const handlePublish = async () => {
        if (!slug || !isAvailable) return;
        setIsPublishing(true);

        const token = localStorage.getItem('token');
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/wizard/${portfolio.id}/publish`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        slug,
                        hasAiManager: wizardData?.hasAiManager || false
                    })
                }
            );

            if (response.ok) {
                const data = await response.json();
                router.push('/user/dashboard');
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to publish');
            }
        } catch (error) {
            console.error('Publish error:', error);
            alert('An error occurred. Please try again.');
        } finally {
            setIsPublishing(false);
        }
    };

    const portfolioUrl = buildPortfolioUrl(slug);

    return (
        <div>
            <div className="mb-8">
                <span className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Final Step</span>
                <h2 className="text-3xl font-bold text-stone-900 mt-1 mb-2">
                    {isPublished ? 'Portfolio is Live!' : 'Claim your link'}
                </h2>
                <p className="text-stone-600">
                    {isPublished ? 'Your portfolio is up and running.' : 'Choose a unique URL for your portfolio.'}
                </p>
            </div>

            <div className="bg-stone-50 p-8 rounded-xl border border-stone-200 text-center mb-8">
                <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-sm mb-4">
                    {isPublished ? <PartyPopper className="w-8 h-8 text-purple-600" /> : <Rocket className="w-8 h-8 text-stone-900" />}
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-2">
                    {isPublished ? 'Congratulations!' : "You're almost there!"}
                </h3>
                <p className="text-stone-600 mb-6 max-w-sm mx-auto">
                    {isPublished
                        ? 'Your portfolio has been published successfully.'
                        : 'Your portfolio is ready to go live. Just pick your username.'}
                </p>

                {isPublished ? (
                    <div className="max-w-md mx-auto relative mb-6">
                        <div className="flex items-center justify-center bg-white border border-stone-300 rounded-lg p-3 shadow-sm group hover:border-purple-300 transition-colors cursor-pointer" onClick={() => window.open(portfolioUrl, '_blank')}>
                            <span className="text-stone-400 mr-2">🔗</span>
                            <span className="text-purple-600 font-semibold hover:underline truncate">
                                {portfolioUrl}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-xs mx-auto relative">
                        <div className="flex items-center bg-white border border-stone-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-stone-900 focus-within:border-stone-900 transition-all shadow-sm">
                            <span className="pl-3 pr-1 text-stone-400 text-sm font-medium">{getPortfolioBaseLabel()}</span>
                            <input
                                type="text"
                                value={slug}
                                onChange={(e) => {
                                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                    setSlug(val);
                                    setIsAvailable(null);
                                }}
                                onBlur={() => checkSlug(slug)}
                                className="w-full py-2 pr-3 border-none focus:ring-0 text-stone-900 font-medium placeholder:text-stone-300"
                                placeholder="username"
                            />
                        </div>
                        {isChecking && (
                            <div className="absolute right-3 top-2.5">
                                <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                            </div>
                        )}
                        {!isChecking && isAvailable === true && slug && (
                            <p className="text-xs text-green-600 font-medium mt-2 flex items-center justify-center gap-1">
                                <Check className="w-3 h-3" /> Available
                            </p>
                        )}
                        {!isChecking && isAvailable === false && slug && (
                            <p className="text-xs text-red-600 font-medium mt-2 flex items-center justify-center gap-1">
                                Taken
                            </p>
                        )}
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-stone-100">
                <button
                    onClick={onBack}
                    className="text-stone-500 hover:text-stone-900 px-4 py-2 text-sm font-medium transition-colors"
                >
                    Back
                </button>
                <button
                    onClick={handlePublish}
                    disabled={!slug || !isAvailable || isChecking || isPublishing}
                    className="flex items-center gap-2 px-8 py-3 bg-stone-900 text-white font-medium rounded-lg hover:bg-stone-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
                >
                    {isPublishing ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {isPublished ? 'Updating...' : 'Publishing...'}
                        </>
                    ) : (
                        <>
                            {isPublished ? '🔄 Update Changes' : '🚀 Publish Now'}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
