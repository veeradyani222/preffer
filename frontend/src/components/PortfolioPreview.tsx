'use client';

interface Portfolio {
    headline: string | null;
    bio: string | null;
    skills: string[];
    experience: any[];
    projects: any[];
    education: any[];
    social_links: any;
}

interface User {
    displayName?: string;
    username: string;
    profilePicture?: string;
}

interface PortfolioPreviewProps {
    portfolio: Portfolio | null;
    user: User;
}

export default function PortfolioPreview({ portfolio, user }: PortfolioPreviewProps) {
    if (!portfolio) {
        return (
            <div className="p-8 text-center text-gray-500">
                <p>Loading portfolio...</p>
            </div>
        );
    }

    const hasContent = portfolio.headline || portfolio.bio ||
        portfolio.skills?.length > 0 || portfolio.projects?.length > 0 ||
        portfolio.experience?.length > 0 || portfolio.education?.length > 0;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2 text-violet-600 mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span className="text-sm font-medium">Live Preview</span>
                </div>
                <p className="text-xs text-gray-500">This is how your portfolio will look</p>
            </div>

            {!hasContent ? (
                <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </div>
                    <h3 className="text-gray-900 font-medium mb-1">Your portfolio is empty</h3>
                    <p className="text-gray-500 text-sm">Chat with the AI to start building it!</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Profile Section */}
                    <div className="text-center">
                        {user.profilePicture ? (
                            <img
                                src={user.profilePicture}
                                alt={user.displayName || user.username}
                                className="w-20 h-20 rounded-full mx-auto mb-4 object-cover ring-4 ring-violet-100"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-full mx-auto mb-4 bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                                {(user.displayName || user.username).charAt(0).toUpperCase()}
                            </div>
                        )}
                        <h2 className="text-xl font-bold text-gray-900">{user.displayName || user.username}</h2>
                        {portfolio.headline && (
                            <p className="text-violet-600 font-medium mt-1">{portfolio.headline}</p>
                        )}
                    </div>

                    {/* Bio */}
                    {portfolio.bio && (
                        <div className="bg-gray-50 rounded-xl p-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">About</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">{portfolio.bio}</p>
                        </div>
                    )}

                    {/* Skills */}
                    {portfolio.skills && portfolio.skills.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Skills</h3>
                            <div className="flex flex-wrap gap-2">
                                {portfolio.skills.map((skill, index) => (
                                    <span
                                        key={index}
                                        className="px-3 py-1 bg-violet-100 text-violet-700 text-sm rounded-full font-medium"
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Experience */}
                    {portfolio.experience && portfolio.experience.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Experience</h3>
                            <div className="space-y-4">
                                {portfolio.experience.map((exp, index) => (
                                    <div key={index} className="border-l-2 border-violet-200 pl-4">
                                        <h4 className="font-medium text-gray-900">{exp.role}</h4>
                                        <p className="text-sm text-violet-600">{exp.company}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {exp.startDate} - {exp.endDate || 'Present'}
                                        </p>
                                        {exp.description && (
                                            <p className="text-sm text-gray-600 mt-2">{exp.description}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Projects */}
                    {portfolio.projects && portfolio.projects.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Projects</h3>
                            <div className="space-y-4">
                                {portfolio.projects.map((project, index) => (
                                    <div key={index} className="bg-gray-50 rounded-xl p-4">
                                        <h4 className="font-medium text-gray-900">{project.name}</h4>
                                        <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                                        {project.technologies && project.technologies.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {project.technologies.map((tech: string, i: number) => (
                                                    <span key={i} className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
                                                        {tech}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {project.url && (
                                            <a
                                                href={project.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-violet-600 hover:underline mt-2 inline-block"
                                            >
                                                View Project →
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Education */}
                    {portfolio.education && portfolio.education.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Education</h3>
                            <div className="space-y-4">
                                {portfolio.education.map((edu, index) => (
                                    <div key={index} className="border-l-2 border-violet-200 pl-4">
                                        <h4 className="font-medium text-gray-900">{edu.degree} in {edu.field}</h4>
                                        <p className="text-sm text-violet-600">{edu.institution}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {edu.startDate} - {edu.endDate || 'Present'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Social Links */}
                    {portfolio.social_links && Object.keys(portfolio.social_links).some(k => portfolio.social_links[k]) && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Connect</h3>
                            <div className="flex flex-wrap gap-2">
                                {portfolio.social_links.github && (
                                    <a href={portfolio.social_links.github} target="_blank" rel="noopener noreferrer"
                                        className="px-3 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors">
                                        GitHub
                                    </a>
                                )}
                                {portfolio.social_links.linkedin && (
                                    <a href={portfolio.social_links.linkedin} target="_blank" rel="noopener noreferrer"
                                        className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                                        LinkedIn
                                    </a>
                                )}
                                {portfolio.social_links.twitter && (
                                    <a href={portfolio.social_links.twitter} target="_blank" rel="noopener noreferrer"
                                        className="px-3 py-2 bg-sky-500 text-white text-sm rounded-lg hover:bg-sky-600 transition-colors">
                                        Twitter
                                    </a>
                                )}
                                {portfolio.social_links.website && (
                                    <a href={portfolio.social_links.website} target="_blank" rel="noopener noreferrer"
                                        className="px-3 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition-colors">
                                        Website
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
