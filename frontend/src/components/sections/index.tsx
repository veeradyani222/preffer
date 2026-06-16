'use client';

/**
 * Section Component Mapper
 * Maps section.type → Component
 * 
 * This is the single source of truth for type → component mapping.
 * Add new section types here.
 */

import { ReactElement } from 'react';
import { Theme } from '@/themes';
import { PortfolioSection, SectionType } from '@/types/section.types';
import { SectionWrapper } from '@/components/themes/SectionWrapper';

// Import all 14 section components
import { HeroSection } from './HeroSection';
import { AboutSection } from './AboutSection';
import { ServicesSection } from './ServicesSection';
import { SkillsSection } from './SkillsSection';
import { ExperienceSection } from './ExperienceSection';
import { ProjectsSection } from './ProjectsSection';
import { TestimonialsSection } from './TestimonialsSection';
import { ContactSection } from './ContactSection';
import { FaqSection } from './FaqSection';
import { PricingSection } from './PricingSection';
import { TeamSection } from './TeamSection';
import { MenuSection } from './MenuSection';
import { AchievementsSection } from './AchievementsSection';
import { EducationSection } from './EducationSection';

// Export all  components
export {
    HeroSection,
    AboutSection,
    ServicesSection,
    SkillsSection,
    ExperienceSection,
    ProjectsSection,
    TestimonialsSection,
    ContactSection,
    FaqSection,
    PricingSection,
    TeamSection,
    MenuSection,
    AchievementsSection,
    EducationSection
};

// Props interface for all section components
export interface SectionProps {
    section: PortfolioSection;
    theme: Theme;
    aiManagerName?: string;
    aiManagerUrl?: string; // Full URL path
    socialLinks?: any;
}

type SectionComponent = (props: SectionProps) => ReactElement | null;

/**
 * Type → Component mapping
 */
export const SECTION_COMPONENTS: Record<SectionType, SectionComponent> = {
    // All 14 wizard section types with dedicated components
    hero: HeroSection,
    about: AboutSection,
    services: ServicesSection,
    skills: SkillsSection,
    experience: ExperienceSection,
    projects: ProjectsSection,
    testimonials: TestimonialsSection,
    contact: ContactSection,
    faq: FaqSection,
    pricing: PricingSection,
    team: TeamSection,
    menu: MenuSection,
    achievements: AchievementsSection,
    education: EducationSection,
};

/**
 * Get component for a section type
 * Returns undefined for unknown types
 */
export function getSectionComponent(type: string): SectionComponent | undefined {
    return SECTION_COMPONENTS[type as SectionType];
}

/**
 * Render a section with the appropriate component
 */

// ...

/**
 * Render a section with the appropriate component
 */
export function renderSection(section: PortfolioSection, theme: Theme, aiManagerName?: string, aiManagerUrl?: string, socialLinks?: any): ReactElement | null {
    const Component = getSectionComponent(section.type);
    if (!Component) return null;

    return (
        <SectionWrapper theme={theme}>
            <Component section={section} theme={theme} aiManagerName={aiManagerName} aiManagerUrl={aiManagerUrl} socialLinks={socialLinks} />
        </SectionWrapper>
    );
}

/**
 * Check if a section has meaningful content
 */
export function sectionHasContent(section: PortfolioSection): boolean {
    const content = section.content;
    if (!content) return false;

    if (Array.isArray(content)) return content.length > 0;
    if (typeof content === 'object') {
        return Object.values(content).some(v => v && String(v).trim() !== '');
    }
    if (typeof content === 'string') return content.trim() !== '';
    return false;
}
