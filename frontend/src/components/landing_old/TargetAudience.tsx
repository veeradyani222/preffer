'use client';

import { motion } from 'framer-motion';
import { Briefcase, Paintbrush, Code, Store, Lightbulb, Video } from 'lucide-react';

export default function TargetAudience() {
    const audiences = [
        { icon: <Briefcase />, title: "Freelancers", desc: "Showcase services & get hired." },
        { icon: <Paintbrush />, title: "Artists", desc: "A gallery that sells for you." },
        { icon: <Code />, title: "Developers", desc: "GitHub projects → Portfolio instantly." },
        { icon: <Store />, title: "Small Businesses", desc: "Online presence without the headache." },
        { icon: <Lightbulb />, title: "Consultants", desc: "Book calls & manage clients on autopilot." },
        { icon: <Video />, title: "Creators", desc: "One hub for all your content & links." }
    ];

    return (
        <section className="py-24 bg-white">
            <div className="container mx-auto px-4 max-w-6xl text-center">
                <h2 className="text-4xl font-bold text-gray-900 mb-16">Built for Everyone Who Needs an Online Presence</h2>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12">
                    {audiences.map((item, idx) => (
                        <motion.div
                            key={idx}
                            className="flex flex-col items-center"
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1, duration: 0.4 }}
                        >
                            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-800 mb-4 hover:bg-[#FFD54F] hover:text-black transition-colors duration-300">
                                {item.icon}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                            <p className="text-gray-500 text-sm">{item.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
