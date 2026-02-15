'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

interface Project {
    id: string;
    title: string;
    description: string;
    image?: string;
    link?: string;
    tags?: string[];
}

interface ProjectRevealProps {
    projects: Project[];
}

export function ProjectReveal({ projects }: ProjectRevealProps) {
    const [activeProject, setActiveProject] = useState<Project | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const springConfig = { damping: 20, stiffness: 300 };
    const springX = useSpring(x, springConfig);
    const springY = useSpring(y, springConfig);

    const handleMouseMove = (e: React.MouseEvent) => {
        // Position relative to the container
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            // Center the image on the cursor
            // We want fixed positioning for the image, so use clientX/Y
            x.set(e.clientX);
            y.set(e.clientY);
        }
    };

    return (
        <div
            ref={ref}
            className="relative py-12 flex flex-col gap-6"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setActiveProject(null)}
        >
            {projects.map((project) => {
                const Wrapper = project.link ? 'a' : 'div';
                const wrapperProps = project.link ? {
                    href: project.link,
                    target: "_blank",
                    rel: "noopener noreferrer",
                    className: "group border-b border-stone-200 pb-6 flex items-baseline justify-between cursor-none transition-colors hover:border-stone-900"
                } : {
                    className: "group border-b border-stone-200 pb-6 flex items-baseline justify-between cursor-default transition-colors hover:border-stone-500"
                };

                return (
                    <Wrapper
                        key={project.id}
                        {...wrapperProps}
                        onMouseEnter={() => setActiveProject(project)}
                    >
                        <div className="flex items-baseline gap-4">
                            <h3 className="text-4xl font-bold text-stone-300 transition-colors group-hover:text-stone-900 duration-300">
                                {project.title}
                            </h3>
                            <p className="text-sm text-stone-500 opacity-0 transform translate-y-2 transition-all group-hover:opacity-100 group-hover:translate-y-0 duration-300 delay-75">
                                {project.description}
                            </p>
                        </div>
                        {project.link && (
                            <div className="text-stone-300 group-hover:text-stone-900 transition-colors duration-300">
                                <ArrowUpRight className="w-6 h-6 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </div>
                        )}
                    </Wrapper>
                );
            })}

            {/* Floating Image Cursor */}
            <motion.div
                className="fixed top-0 left-0 pointer-events-none z-50 overflow-hidden rounded-lg shadow-xl"
                style={{
                    x: springX,
                    y: springY,
                    translateX: '-50%',
                    translateY: '-50%',
                    width: 300,
                    height: 200,
                }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{
                    opacity: activeProject && activeProject.image ? 1 : 0,
                    scale: activeProject && activeProject.image ? 1 : 0.5
                }}
                transition={{ duration: 0.2 }}
            >
                {activeProject?.image && (
                    <img
                        src={activeProject.image}
                        alt={activeProject.title}
                        className="w-full h-full object-cover"
                    />
                )}
            </motion.div>
        </div>
    );
}
