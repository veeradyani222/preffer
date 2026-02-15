'use client';

import ReactMarkdown from 'react-markdown';
import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';
import { LuExternalLink } from 'react-icons/lu';
import { ProjectReveal } from '@/components/themes/ui/ProjectReveal';
import { TiltCard } from '@/components/themes/ui/TiltCard';
import useEmblaCarousel from 'embla-carousel-react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { useCallback } from 'react';

interface SectionProps {
    section: PortfolioSection;
    theme: Theme;
}

/**
 * ProjectsSection - Portfolio/projects showcase
 */
export function ProjectsSection({ section, theme }: SectionProps) {
    const content = section.content || {};
    const items = Array.isArray(content.items) ? content.items : [];

    if (items.length === 0) return null;

    // Modern/Minimal Theme: Project Reveal List
    if (theme.variant === 'minimal') {
        const projects = items.map((item: any, idx: number) => ({
            id: String(idx),
            title: item.name,
            description: item.description,
            image: item.image, // Assuming item has image property, even if undefined
            link: item.link,
            tags: item.tags
        }));

        return <div className="max-w-5xl mx-auto"><ProjectReveal projects={projects} /></div>;
    }

    // --- CAROUSEL SETUP FOR OTHER THEMES ---
    const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', loop: false });

    const scrollPrev = useCallback(() => {
        if (emblaApi) emblaApi.scrollPrev();
    }, [emblaApi]);

    const scrollNext = useCallback(() => {
        if (emblaApi) emblaApi.scrollNext();
    }, [emblaApi]);


    const CarouselNavigation = () => (
        <div className="flex justify-end gap-2 mb-4">
            <button
                className="p-3 rounded-full border transition-all hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                onClick={scrollPrev}
                style={{ borderColor: theme.colors.darkest, color: theme.colors.darkest }}
            >
                <LuChevronLeft className="w-5 h-5" />
            </button>
            <button
                className="p-3 rounded-full border transition-all hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                onClick={scrollNext}
                style={{ borderColor: theme.colors.darkest, color: theme.colors.darkest }}
            >
                <LuChevronRight className="w-5 h-5" />
            </button>
        </div>
    );

    const ElegantCard = ({ item, idx }: { item: any, idx: number }) => (
        <div className="min-w-0 flex-[0_0_100%] md:flex-[0_0_80%] pr-8">
            <TiltCard theme={theme} className="h-full block">
                <div
                    className="group flex flex-col md:flex-row gap-8 items-start md:items-center py-8 border-b h-full"
                    style={{ borderColor: `${theme.colors.medium}30` }}
                >
                    <div className="flex-1">
                        <div className="flex items-baseline gap-4 mb-3">
                            <span
                                className="text-xs font-serif italic opacity-60"
                                style={{ color: theme.colors.darkest, fontFamily: theme.typography.fontFamilyBody }}
                            >
                                0{idx + 1}
                            </span>
                            {item.name && (
                                <h3
                                    className="text-2xl md:text-3xl font-medium tracking-tight"
                                    style={{ color: theme.colors.darkest, fontFamily: theme.typography.fontFamilyHeading }}
                                >
                                    {item.name}
                                </h3>
                            )}
                        </div>

                        {item.description && typeof item.description === 'string' && (
                            <div
                                className="prose prose-lg max-w-xl opacity-80 pl-8"
                                style={{ color: theme.colors.dark, fontFamily: theme.typography.fontFamilyBody }}
                            >
                                <ReactMarkdown>{String(item.description)}</ReactMarkdown>
                            </div>
                        )}

                        {Array.isArray(item.tags) && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4 pl-8">
                                {item.tags.map((tag: string, tagIdx: number) => (
                                    <span
                                        key={tagIdx}
                                        className="text-xs uppercase tracking-widest opacity-60"
                                        style={{ color: theme.colors.dark, fontFamily: theme.typography.fontFamilyBody }}
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {item.link && (
                        <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-3 rounded-full text-sm transition-all hover:bg-black hover:text-white self-start md:self-center shrink-0"
                            style={{
                                border: `1px solid ${theme.colors.darkest}`,
                                color: theme.colors.darkest,
                                fontFamily: theme.typography.fontFamilyBody
                            }}
                        >
                            View Project
                        </a>
                    )}
                </div>
            </TiltCard>
        </div>
    );

    const TechieCard = ({ item, idx }: { item: any, idx: number }) => (
        <div className="min-w-0 flex-[0_0_100%] md:flex-[0_0_50%] pr-6">
            <TiltCard theme={theme} tiltMaxAngleX={5} tiltMaxAngleY={5} className="h-full">
                <div
                    className="flex flex-col h-full relative group transition-all duration-300"
                    style={{
                        backgroundColor: theme.colors.lightest,
                        border: `1px solid ${theme.colors.medium}`,
                    }}
                >
                    {/* Header bar */}
                    <div
                        className="px-4 py-2 border-b flex justify-between items-center bg-opacity-50"
                        style={{
                            borderColor: theme.colors.medium, // Default border
                            backgroundColor: `${theme.colors.medium}10`
                        }}
                    >
                        <span
                            className="font-mono text-xs uppercase tracking-wider"
                            style={{
                                color: theme.colors.darkest,
                                fontFamily: theme.typography.fontFamilyBody
                            }}
                        >
                            PRJ-{String(idx + 1).padStart(3, '0')}
                        </span>
                        {item.link && (
                            <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:bg-black hover:text-white transition-colors px-2 py-0.5 text-xs font-bold uppercase flex items-center gap-1"
                                style={{
                                    color: theme.colors.darkest,
                                    fontFamily: theme.typography.fontFamilyBody
                                }}
                            >
                                Open <LuExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </div>

                    <div className="p-6 flex-grow flex flex-col">
                        {item.name && (
                            <h3
                                className="text-xl font-bold mb-4 uppercase tracking-tight"
                                style={{
                                    color: theme.colors.darkest,
                                    fontFamily: theme.typography.fontFamilyHeading
                                }}
                            >
                                {item.name}
                            </h3>
                        )}

                        {item.description && typeof item.description === 'string' && (
                            <div
                                className="prose prose-sm max-w-none mb-6 flex-grow opacity-80"
                                style={{
                                    color: theme.colors.dark,
                                    fontFamily: theme.typography.fontFamilyBody
                                }}
                            >
                                <ReactMarkdown>{String(item.description)}</ReactMarkdown>
                            </div>
                        )}

                        {Array.isArray(item.tags) && item.tags.length > 0 && (
                            <div className="pt-4 border-t border-dashed" style={{ borderColor: theme.colors.medium }}>
                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                    {item.tags.map((tag: string, tagIdx: number) => (
                                        <span
                                            key={tagIdx}
                                            className="text-xs font-mono"
                                            style={{
                                                color: theme.colors.darkest,
                                                fontFamily: theme.typography.fontFamilyBody
                                            }}
                                        >
                                            //{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </TiltCard>
        </div>
    );

    // Render Carousel for non-minimal themes
    const renderContent = () => {
        if (theme.variant === 'elegant') {
            return items.map((item: any, idx: number) => <ElegantCard key={idx} item={item} idx={idx} />);
        }
        // Techie and Default share specific techie card or fallback
        return items.map((item: any, idx: number) => <TechieCard key={idx} item={item} idx={idx} />);
    };

    return (
        <div className="relative max-w-5xl mx-auto">
            <CarouselNavigation />
            <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex">
                    {renderContent()}
                </div>
            </div>
        </div>
    );

}
