'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import {
    Key,
    Copy,
    Check,
    RefreshCw,
    Eye,
    EyeOff,
    Terminal,
    AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CredentialsPage() {
    const { user } = useAuth();
    const [apiKey, setApiKey] = useState<string>('');
    const [isVisible, setIsVisible] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConfirmRegenerate, setShowConfirmRegenerate] = useState(false);

    useEffect(() => {
        if (user?.apiKey) {
            setApiKey(user.apiKey);
        }
    }, [user]);

    const handleCopy = async () => {
        if (!apiKey) return;
        try {
            await navigator.clipboard.writeText(apiKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy API key:', err);
        }
    };

    const handleRegenerate = async () => {
        setError(null);
        setIsRegenerating(true);
        try {
            const data = await apiFetch('/auth/regenerate-api-key', {
                method: 'POST',
            });
            if (data.apiKey) {
                setApiKey(data.apiKey);
                setShowConfirmRegenerate(false);
            }
        } catch (err) {
            console.error('Failed to regenerate API key:', err);
            setError('Failed to regenerate API key. Please try again.');
        } finally {
            setIsRegenerating(false);
        }
    };

    return (
        <div className="space-y-12 max-w-4xl mx-auto pb-12">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold text-[#37352f]">Credentials</h1>
                <p className="text-[#9B9A97]">
                    Manage your API keys and connection credentials for external tools.
                </p>
            </div>

            {/* API Key Section */}
            <section className="bg-white rounded-lg border border-[#E9E9E7] p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Key size={20} className="text-[#37352f]" />
                    <div>
                        <h2 className="text-lg font-bold text-[#37352f]">Your API Key</h2>
                        <p className="text-sm text-[#9B9A97]">Use this key to authenticate with MCP tools and other external services.</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-[#F7F7F5] rounded-lg p-4 border border-[#E9E9E7] flex flex-col sm:flex-row items-center gap-4 justify-between">
                        <div className="flex-1 font-mono text-sm break-all w-full text-center sm:text-left text-[#37352f]">
                            {isVisible ? (
                                <span>{apiKey || 'Loading...'}</span>
                            ) : (
                                <span className="text-[#9B9A97]">••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••</span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => setIsVisible(!isVisible)}
                                className="p-2 hover:bg-white hover:shadow-sm rounded text-[#9B9A97] hover:text-[#37352f] transition-all border border-transparent hover:border-[#E9E9E7]"
                                title={isVisible ? "Hide API Key" : "Show API Key"}
                            >
                                {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                            <button
                                onClick={handleCopy}
                                className="p-2 hover:bg-white hover:shadow-sm rounded text-[#9B9A97] hover:text-[#37352f] transition-all border border-transparent hover:border-[#E9E9E7]"
                                title="Copy to clipboard"
                            >
                                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                            </button>
                            <div className="w-px h-6 bg-[#E9E9E7] mx-1" />
                            <button
                                onClick={() => setShowConfirmRegenerate(true)}
                                className="p-2 hover:bg-red-50 hover:text-red-600 rounded text-[#9B9A97] transition-colors"
                                title="Regenerate API Key"
                            >
                                <RefreshCw size={16} />
                            </button>
                        </div>
                    </div>

                    <AnimatePresence>
                        {showConfirmRegenerate && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-red-50 border border-red-100 rounded-lg p-4"
                            >
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
                                    <div className="space-y-3">
                                        <div>
                                            <h4 className="font-semibold text-red-900 text-sm">Regenerate API Key?</h4>
                                            <p className="text-red-700 text-sm mt-1">
                                                This will invalidate your current API key immediately. Any tools or scripts using the old key will stop working until you update them.
                                            </p>
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={handleRegenerate}
                                                disabled={isRegenerating}
                                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors flex items-center gap-2"
                                            >
                                                {isRegenerating ? <RefreshCw className="animate-spin" size={14} /> : null}
                                                Yes, Regenerate Key
                                            </button>
                                            <button
                                                onClick={() => setShowConfirmRegenerate(false)}
                                                className="px-3 py-1.5 bg-white border border-red-200 text-red-700 hover:bg-red-50 text-sm font-medium rounded transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {error && (
                        <div className="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-100">
                            {error}
                        </div>
                    )}
                </div>
            </section>


        </div>
    );
}
