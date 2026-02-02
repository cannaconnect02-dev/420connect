
export const NanoTheme = {
    colors: {
        background: '#000000',      // Pure Black for OLED
        backgroundAlt: '#121212',   // Deep Grey for cards
        primary: '#00FF00',         // Electric Green
        primaryDim: 'rgba(0, 255, 0, 0.2)',
        text: '#FFFFFF',
        textSecondary: '#A0A0A0',
        error: '#FF4444',
        border: '#333333',
    },
    typography: {
        heading: {
            fontSize: 32,
            fontWeight: 'bold',
            letterSpacing: 0.5,
        },
        subheading: {
            fontSize: 18,
            fontWeight: '600',
            color: '#A0A0A0',
        },
        body: {
            fontSize: 16,
            color: '#FFFFFF',
        },
        hero: {
            fontSize: 48,
            fontWeight: '800',
            color: '#00FF00', // Electric Green
        }
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },
    borderRadius: {
        sm: 8,
        md: 16,
        lg: 24,
        full: 9999,
    }
};
