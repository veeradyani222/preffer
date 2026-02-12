'use client';

import { motion } from 'framer-motion';
import { XCircle, CheckCircle } from 'lucide-react';

export default function ProblemSolution() {
    const problems = [
        "No website or online presence",
        "Hard to respond to clients instantly",
        "Time-consuming to keep info updated",
        "Looks unprofessional or outdated"
    ];

    const solutions = [
        "AI builds your page conversationally",
        "AI replies to visitors 24/7",
        "AI updates availability automatically",
        "Instant professional identity"
    ];

    return (
        <section className="py-20 bg-gray-50 border-y border-gray-100">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="grid md:grid-cols-2 gap-8 lg:gap-16">

                    {/* Problem Column */}
                    <motion.div
                        className="bg-white p-8 rounded-3xl shadow-sm border border-red-100"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                            <span className="p-2 bg-red-100 rounded-lg text-red-600">
                                <XCircle size={24} />
                            </span>
                            The Problem
                        </h3>
                        <ul className="space-y-4">
                            {problems.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-gray-600">
                                    <XCircle size={20} className="text-red-400 mt-1 shrink-0" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Solution Column */}
                    <motion.div
                        className="bg-white p-8 rounded-3xl shadow-lg border border-[#FFD54F] relative overflow-hidden"
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD54F]/10 rounded-bl-full -z-0"></div>

                        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3 relative z-10">
                            <span className="p-2 bg-[#FFD54F]/20 rounded-lg text-yellow-700">
                                <CheckCircle size={24} />
                            </span>
                            The Solution
                        </h3>
                        <ul className="space-y-4 relative z-10">
                            {solutions.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-gray-800 font-medium">
                                    <CheckCircle size={20} className="text-[#FFD54F] mt-1 shrink-0 fill-yellow-500 text-white" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
