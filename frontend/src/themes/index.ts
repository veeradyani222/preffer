/**
 * Theme Token Types
 * Themes control styling (colors, fonts, spacing) NOT layout
 */

export interface ColorScheme {
    name: string;
    colors: string[]; // [darkest, dark, medium, lightest]
}

export interface Theme {
    name: string;
    variant: 'minimal' | 'techie' | 'elegant';
    colors: {
        darkest: string;    // Main text, strong accents
        dark: string;       // Secondary text, soft accents
        medium: string;     // Borders, muted elements
        lightest: string;   // Backgrounds, light surfaces
    };
    typography: {
        fontFamilyHeading: string;
        fontFamilyBody: string;
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
        padding: string; // Unified padding token
    };
    radius: {
        small: string;
        medium: string;
        large: string;
        full: string; // Ensure full radius is always available
    };
    shadows: {
        card: string;
        hover: string;
        active: string; // Added active state
    };
}

/**
 * Generate Minimal Theme (formerly Modern)
 * Philosophy: Clean, open, soft, airy, sophisticated
 * Typography: Serif Headings, Sans-Serif Body
 */
export function generateMinimalTheme(colorScheme: ColorScheme): Theme {
    const [darkest, dark, medium, lightest] = colorScheme.colors;

    return {
        name: colorScheme.name,
        variant: 'minimal',
        colors: {
            darkest,   // Headings, Primary Actions
            dark,      // Body Text
            medium,    // Borders, Secondary Elements
            lightest,  // Backgrounds
        },
        typography: {
            fontFamilyHeading: 'var(--font-poppins), sans-serif',
            fontFamilyBody: 'var(--font-poppins), sans-serif',
            heading: {
                size: '2.5rem',
                weight: '700',
            },
            body: {
                size: '1.125rem',
                lineHeight: '1.8',
            },
            small: {
                size: '0.875rem',
            },
        },
        spacing: {
            section: '3rem',
            card: '2rem',
            element: '1.5rem',
            padding: '2rem',
        },
        radius: {
            small: '0.75rem',
            medium: '1.5rem',
            large: '2rem',
            full: '9999px',
        },
        shadows: {
            card: '0 4px 20px -2px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.02)',
            hover: '0 20px 40px -4px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.02)',
            active: '0 0 0 4px rgba(0,0,0,0.05)',
        },
    };
}

/**
 * Generate Techie Theme
 * Philosophy: Bold, sharp, geometric, technical, impactful
 * Typography: Sans-Serif Headings, Monospace Details
 */
export function generateTechieTheme(colorScheme: ColorScheme): Theme {
    const [darkest, dark, medium, lightest] = colorScheme.colors;

    return {
        name: colorScheme.name,
        variant: 'techie',
        colors: {
            darkest,    // Text, Borders
            dark,       // Muted Text
            medium,     // Grid lines, dividers
            lightest,   // Background
        },
        typography: {
            fontFamilyHeading: 'var(--font-inter), system-ui, sans-serif',
            fontFamilyBody: 'var(--font-jetbrains), monospace',
            heading: {
                size: '2.25rem',
                weight: '800',
            },
            body: {
                size: '0.95rem',
                lineHeight: '1.6',
            },
            small: {
                size: '0.875rem',
            },
        },
        spacing: {
            section: '3rem',
            card: '1.5rem',
            element: '1rem',
            padding: '1.5rem',
        },
        radius: {
            small: '0px',
            medium: '2px',
            large: '4px',
            full: '9999px',
        },
        shadows: {
            card: '4px 4px 0px 0px rgba(0,0,0,1)', // Hard shadow will be replaced by darker color in usage
            hover: '8px 8px 0px 0px rgba(0,0,0,1)',
            active: '2px 2px 0px 0px rgba(0,0,0,1)',
        },
    };
}

// ... (previous code)

/**
 * Generate Elegant Theme
 * Philosophy: Sophisticated, timeless, luxurious, editorial
 * Typography: Serif Headings, Serif Body (or high contrast sans)
 */
export function generateElegantTheme(colorScheme: ColorScheme): Theme {
    const [darkest, dark, medium, lightest] = colorScheme.colors;

    return {
        name: colorScheme.name,
        variant: 'elegant', // We need to update the Theme interface to accept this
        colors: {
            darkest,
            dark,
            medium,
            lightest,
        },
        typography: {
            fontFamilyHeading: 'var(--font-playfair), serif',
            fontFamilyBody: 'var(--font-lora), serif',
            heading: {
                size: '3rem',
                weight: '400', // Lighter weight for elegance
            },
            body: {
                size: '1.05rem',
                lineHeight: '1.9',
            },
            small: {
                size: '0.875rem',
            },
        },
        spacing: {
            section: '3.5rem',
            card: '3rem',
            element: '2rem',
            padding: '2.5rem',
        },
        radius: {
            small: '2px',
            medium: '4px',
            large: '8px',
            full: '9999px',
        },
        shadows: {
            card: '0 10px 30px -10px rgba(0,0,0,0.08)',
            hover: '0 20px 40px -10px rgba(0,0,0,0.12)',
            active: '0 5px 15px -5px rgba(0,0,0,0.08)',
        },
    };
}

/**
 * Get theme for a portfolio based on theme name and color scheme
 */
export function getThemeForPortfolio(
    themeName: string,
    colorScheme?: ColorScheme
): Theme {
    // Default color scheme if none provided (Minimal)
    // [Darkest, Dark, Medium, Lightest]
    const defaultColorScheme: ColorScheme = {
        name: 'Default',
        colors: ['#1a1a1a', '#4a4a4a', '#e5e5e5', '#ffffff'],
    };

    const scheme = colorScheme || defaultColorScheme;

    switch (themeName) {
        case 'techie':
        case 'sleek': // Legacy support
            return generateTechieTheme(scheme);
        case 'elegant':
            return generateElegantTheme(scheme);
        case 'modern': // Legacy support
        case 'minimal':
        default:
            return generateMinimalTheme(scheme);
    }
}

// Export default theme for backwards compatibility
export const defaultTheme: Theme = generateMinimalTheme({
    name: 'Default',
    colors: ['#1a1a1a', '#4a4a4a', '#e5e5e5', '#ffffff'],
});

/**
 * Invert color scheme for Dark/Light mode toggle
 * Swaps the palette: [darkest, dark, medium, lightest] -> [lightest, medium, dark, darkest]
 * This is a simplistic inversion, but works because our themes are built on this 4-color structure.
 */
export function invertColorScheme(colorScheme: ColorScheme): ColorScheme {
    return {
        name: colorScheme.name,
        colors: [...colorScheme.colors].reverse()
    };
}
