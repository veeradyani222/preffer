'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function CTA() {
    const { loginWithGoogle } = useAuth();

    return (
        <section className="py-24 bg-gray-50 border-t border-gray-100">
            <div className="container mx-auto px-4 text-center max-w-4xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 leading-tight">
                        Your Digital Identity Should Work For You — <br className="hidden md:block" /> Even When You’re Offline.
                    </h2>

                    <div className="flex flex-col items-center gap-4">
                        <button
                            onClick={loginWithGoogle}
                            className="inline-flex items-center justify-center px-10 py-5 text-lg font-bold text-black bg-[#FFD54F] rounded-full hover:bg-[#FFC107] transition-all transform hover:scale-105 shadow-xl hover:shadow-2xl"
                        >
                            Create My AI Manager
                            <ArrowRight className="ml-2 w-6 h-6" />
                        </button>
                        <p className="text-gray-500 font-medium">No coding. No setup. Just chat.</p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
