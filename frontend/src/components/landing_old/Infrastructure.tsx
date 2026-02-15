'use client';

import { motion } from 'framer-motion';
import { Network, ShieldCheck, Activity } from 'lucide-react';

export default function Infrastructure() {
    return (
        <section className="py-24 bg-gray-900 text-white overflow-hidden relative">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>

            <div className="container mx-auto px-4 max-w-6xl relative z-10">
                <div className="flex flex-col lg:flex-row gap-16 items-center">

                    {/* Text Content */}
                    <motion.div
                        className="flex-1"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">
                            Powered by <span className="text-[#FFD54F]">Archestra</span> & <span className="text-blue-400">MCP</span>
                        </h2>
                        <p className="text-gray-300 text-lg mb-8 leading-relaxed">
                            Your AI representative doesn't just chat — it can use real tools. Connect services like GitHub, Google Drive, or calendars so your professional page updates automatically and client actions happen safely.
                        </p>

                        <ul className="space-y-6">
                            {[
                                { icon: <Network className="text-[#FFD54F]" />, title: "Multi-Tool Integration", desc: "Connects to your favorite apps instantly." },
                                { icon: <ShieldCheck className="text-[#FFD54F]" />, title: "Safe Approval Gates", desc: "You approve every critical action." },
                                { icon: <Activity className="text-[#FFD54F]" />, title: "Live Action Logs", desc: "See exactly what your AI is doing in real-time." }
                            ].map((item, idx) => (
                                <li key={idx} className="flex gap-4">
                                    <div className="p-2 bg-white/10 rounded-lg h-fit">{item.icon}</div>
                                    <div>
                                        <h4 className="font-bold text-lg">{item.title}</h4>
                                        <p className="text-gray-400 text-sm">{item.desc}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Visual Flow Diagram */}
                    <motion.div
                        className="flex-1 w-full"
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm relative">
                            <div className="flex flex-col items-center gap-6">

                                {/* User */}
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
                                        <span className="font-bold text-xl">User</span>
                                    </div>
                                </div>

                                {/* Arrow Down */}
                                <div className="h-8 w-0.5 bg-gray-600 relative">
                                    <motion.div
                                        className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#FFD54F] rounded-full"
                                        animate={{ y: [0, 32], opacity: [0, 1, 0] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                    />
                                </div>

                                {/* AI Representative */}
                                <div className="w-full bg-white/10 border border-white/20 p-4 rounded-xl text-center">
                                    <div className="font-bold text-[#FFD54F] mb-1">AI Representative</div>
                                    <div className="text-xs text-gray-400">Processes request & decides tools</div>
                                </div>

                                {/* Arrow Down */}
                                <div className="h-8 w-0.5 bg-gray-600 relative">
                                    <motion.div
                                        className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#FFD54F] rounded-full"
                                        animate={{ y: [0, 32], opacity: [0, 1, 0] }}
                                        transition={{ repeat: Infinity, duration: 2, delay: 1 }}
                                    />
                                </div>

                                {/* Archestra & Tools */}
                                <div className="flex gap-4 w-full">
                                    <div className="flex-1 bg-white/5 border border-white/10 p-4 rounded-xl text-center text-sm">
                                        Github
                                    </div>
                                    <div className="flex-1 bg-white/5 border border-white/10 p-4 rounded-xl text-center text-sm">
                                        Calendar
                                    </div>
                                    <div className="flex-1 bg-white/5 border border-white/10 p-4 rounded-xl text-center text-sm">
                                        Drive
                                    </div>
                                </div>

                            </div>
                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
