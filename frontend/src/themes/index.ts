/**
 * Theme Token Types
 * Themes control styling (colors, fonts, spacing) NOT layout
 */

export interface Theme {
    name: string;
    colors: {
        background: string;
        surface: string;
        text: {
            primary: string;
            secondary: string;
            muted: string;
        };
        accent: string;
        border: string;
    };
    typography: {
        fontFamily: string;
        heading: {
            size: string;
            weight: string;
        };
        body: {
            size: string;
            lineHeight: string;
        };
        small: {
            size: string;
        };
    };
    spacing: {
        section: string;
        card: string;
        element: string;
    };
    radius: {
        small: string;
        medium: string;
        large: string;
    };
    shadows: {
        card: string;
        hover: string;
    };
}

// Default minimal theme
export const defaultTheme: Theme = {
    name: 'default',
    colors: {
        background: '#ffffff',
        surface: '#f9fafb',
        text: {
            primary: '#111827',
            secondary: '#4b5563',
            muted: '#9ca3af',
        },
        accent: '#3b82f6',
        border: '#e5e7eb',
    },
    typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
        heading: {
            size: '1.5rem',
            weight: '600',
        },
        body: {
            size: '1rem',
            lineHeight: '1.75',
        },
        small: {
            size: '0.875rem',
        },
    },
    spacing: {
        section: '4rem',
        card: '1.5rem',
        element: '1rem',
    },
    radius: {
        small: '0.375rem',
        medium: '0.75rem',
        large: '1rem',
    },
    shadows: {
        card: '0 1px 3px rgba(0,0,0,0.1)',
        hover: '0 4px 6px rgba(0,0,0,0.1)',
    },
};

// Dark theme example
export const darkTheme: Theme = {
    name: 'dark',
    colors: {
        background: '#0f172a',
        surface: '#1e293b',
        text: {
            primary: '#f1f5f9',
            secondary: '#94a3b8',
            muted: '#64748b',
        },
        accent: '#38bdf8',
        border: '#334155',
    },
    typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
        heading: {
            size: '1.5rem',
            weight: '600',
        },
        body: {
            size: '1rem',
            lineHeight: '1.75',
        },
        small: {
            size: '0.875rem',
        },
    },
    spacing: {
        section: '4rem',
        card: '1.5rem',
        element: '1rem',
    },
    radius: {
        small: '0.375rem',
        medium: '0.75rem',
        large: '1rem',
    },
    shadows: {
        card: '0 1px 3px rgba(0,0,0,0.3)',
        hover: '0 4px 6px rgba(0,0,0,0.4)',
    },
};
