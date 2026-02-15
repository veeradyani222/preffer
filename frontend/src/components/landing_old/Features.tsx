'use client';

import { motion } from 'framer-motion';
import { Bot, Code2, Globe, Calendar, Import, Sparkles } from 'lucide-react';

export default function Features() {
    const features = [
        {
            icon: <Code2 size={24} />,
            title: "AI Portfolio Builder",
            description: "Chat your way to a website. No drag-and-drop, just conversation."
        },
        {
            icon: <Bot size={24} />,
            title: "24/7 AI Representative",
            description: "Answers client questions instantly, anytime, anywhere."
        },
        {
            icon: <Globe size={24} />,
            title: "Custom Link",
            description: "Claim your unique username (yourname.app) for a professional edge."
        },
        {
            icon: <Calendar size={24} />,
            title: "Smart Availability",
            description: "AI knows when you’re free or booked and schedules accordingly."
        },
        {
            icon: <Import size={24} />,
            title: "Multi-Source Import",
            description: "Pull projects, images, or docs automatically from GitHub or LinkedIn."
        }
    ];

    return (
        <section className="py-24 bg-gray-50">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything You Need</h2>
                    <p className="text-lg text-gray-600">Powerful features to build and manage your online presence.</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, idx) => (
                        <motion.div
                            key={idx}
                            className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 group"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1, duration: 0.5 }}
                        >
                            <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center text-[#FFD54F] mb-6 group-hover:scale-110 transition-transform duration-300">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                            <p className="text-gray-600 leading-relaxed">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}

                    {/* Bonus Card */}
                    <motion.div
                        className="bg-[#FFD54F] p-8 rounded-2xl shadow-lg border border-[#FFC107] flex flex-col justify-center items-center text-center text-black"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                    >
                        <Sparkles size={32} className="mb-4 text-black" />
                        <h3 className="text-xl font-bold mb-2">And much more...</h3>
                        <p className="opacity-90">Constantly evolving with new AI capabilities.</p>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
