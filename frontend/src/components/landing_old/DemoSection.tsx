'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Send, User } from 'lucide-react';

export default function DemoSection() {
    const [messages, setMessages] = useState([
        { role: 'ai', text: "Hi! I'm Veer's AI representative. How can I help you today?" }
    ]);
    const [inputValue, setInputValue] = useState('');

    const handleSend = () => {
        if (!inputValue.trim()) return;
        const newMessages = [...messages, { role: 'user', text: inputValue }];
        setMessages(newMessages);
        setInputValue('');

        // Simulate AI response
        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'ai', text: "Thanks for reaching out! Veer is currently available for new projects. Would you like to schedule a call?" }]);
        }, 1000);
    };

    return (
        <section className="py-24 bg-white overflow-hidden">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">See It In Action</h2>
                    <p className="text-lg text-gray-600">Experience the power of an AI-managed portfolio.</p>
                </div>

                <motion.div
                    className="relative mx-auto rounded-xl shadow-2xl border border-gray-200 bg-gray-50 overflow-hidden max-w-4xl"
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    {/* Browser Toolbar */}
                    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-2">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-400"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                            <div className="w-3 h-3 rounded-full bg-green-400"></div>
                        </div>
                        <div className="flex-1 text-center">
                            <div className="bg-gray-100 rounded-md py-1 px-3 text-xs text-gray-500 inline-block">
                                veer.app
                            </div>
                        </div>
                    </div>

                    {/* Portfolio Content Mockup */}
                    <div className="p-8 h-[500px] overflow-y-auto relative">
                        <div className="max-w-2xl mx-auto space-y-12">
                            <div className="text-center space-y-4 pt-12">
                                <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto" />
                                <h1 className="text-3xl font-bold text-gray-800">Veer Adyani</h1>
                                <p className="text-gray-500">Full Stack Developer & AI Enthusiast</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="h-40 bg-gray-200 rounded-xl" />
                                <div className="h-40 bg-gray-200 rounded-xl" />
                            </div>

                            <div className="h-40 bg-gray-200 rounded-xl" />
                        </div>

                        {/* Live Chat Bubble Overlay */}
                        <div className="absolute bottom-6 right-6 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col h-96">
                            <div className="bg-[#FFD54F] p-4 rounded-t-xl flex items-center gap-3">
                                <div className="bg-white p-1 rounded-full">
                                    <User size={16} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-black">Veer's AI Representative</h4>
                                    <div className="text-xs text-black/80 flex items-center gap-1">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        Online now
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div
                                            className={`max-w-[80%] p-3 rounded-xl text-sm ${msg.role === 'user'
                                                ? 'bg-blue-600 text-white rounded-br-none'
                                                : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                                                }`}
                                        >
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-3 bg-white border-t border-gray-100 rounded-b-xl">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder="Ask something..."
                                        className="flex-1 bg-gray-100 border-0 rounded-full px-4 py-2 text-sm focus:ring-1 focus:ring-[#FFD54F] outline-none"
                                    />
                                    <button
                                        onClick={handleSend}
                                        className="bg-[#FFD54F] hover:bg-[#FFC107] text-black p-2 rounded-full transition-colors"
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </motion.div>
            </div>
        </section>
    );
}
