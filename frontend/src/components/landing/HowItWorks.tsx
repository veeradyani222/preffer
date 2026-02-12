'use client';

import { motion } from 'framer-motion';
import { MessageSquare, LayoutTemplate, Bot } from 'lucide-react';

export default function HowItWorks() {
    const steps = [
        {
            icon: <MessageSquare size={40} />,
            title: "1. Tell the AI About You",
            description: "Chat with our AI manager. Share your skills, projects, and goals in a simple conversation."
        },
        {
            icon: <LayoutTemplate size={40} />,
            title: "2. AI Builds Your Page",
            description: "Watch as your portfolio is generated instantly with professional themes and sections."
        },
        {
            icon: <Bot size={40} />,
            title: "3. AI Manages It 24/7",
            description: "Your AI representative stays active, answering visitors and scheduling meetings even when you sleep."
        }
    ];

    return (
        <section className="py-24 bg-white">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
                    <p className="text-lg text-gray-600">Three simple steps to your professional online identity.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-12 relative">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gray-100 -z-0"></div>

                    {steps.map((step, idx) => (
                        <motion.div
                            key={idx}
                            className="relative z-10 flex flex-col items-center text-center"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.2, duration: 0.5 }}
                        >
                            <div className="w-24 h-24 rounded-2xl bg-white border border-gray-100 shadow-xl flex items-center justify-center text-[#FFD54F] mb-6 transform hover:scale-110 transition-transform duration-300">
                                {step.icon}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                            <p className="text-gray-600 leading-relaxed max-w-xs mx-auto">
                                {step.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
