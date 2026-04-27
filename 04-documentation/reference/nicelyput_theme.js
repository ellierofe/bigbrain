export const theme = {
  colors: {
    // Primary colors
    terracotta: '#c8553d  ',
    gold: '#c59b6c',

    // Secondary colors
    sage: '#78a883',

    // Neutral colors
    bone: '#eae6e1',
    charcoal: '#2c2c2c',
    blueMidGrey: '#939393',

    // Semantic mappings
    text: '#1e1e1e', // Bone for main text
    background: '#eae6e1', // Charcoal for background
    primary: '#c8553d', // Terracotta
    secondary: '#a5c4b2', // Sage
    accent: '#c59b6c', // Gold

    // Interaction states
    primaryHover: '#c16648',
    primaryPressed: '#aa5539',
    textLight: '#939393', // Blue Mid Grey
    backgroundAlt: '#ffffff', // White
    border: '#939393',

    dark: {
      background: '#2d303d',
      text: '#eae6e1',
      border: 'rgba(249, 246, 238, 0.2)',
    }
  },
  typography: {
    heading: {
      fontFamily: '"Recoleta", serif',
      fontWeight: 700,
    },
    highlight: {
      fontFamily: '"etna", serif',
      fontWeight: 800,
      fontStyle: 'italic',
    },
    body: {
      fontFamily: '"IBM Plex Sans", sans-serif',
      fontWeight: 400,
    },

    sizes: {
      h1: '3rem',      // 48px
      h2: '2.5rem',    // 40px
      h3: '2rem',      // 32px
      h4: '1.5rem',    // 24px
      h5: '1.25rem',   // 20px
      h6: '1rem',      // 16px
      body: '1rem',     // 16px
      bodyMid: '1.25rem', //18px
      bodyLarge: '1.5rem', // 20px
      bodySmall: '0.875rem', // 14px
      caption: '0.75rem',    // 12px
      disclaimer: '0.65rem',
    },
    lineHeights: {
      heading: 1.1,
      body: 1.5,
    },
  },
  spacing: {
    maxWidth: '80rem', // 1280px
    containerPadding: '2rem',
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    xxl: '3rem',    // 48px
    xxxl: '5rem',   // 80px
  },
  radii: {
    button: '1rem',    // Pill buttons
    card: '0.5rem',    // Card corners
    sm: '0.5rem',      // Small radius
    md: '1rem',        // Medium radius
    lg: '1.5rem',      // Large radius
    round: '100vh'
  },
  borders: {
    widths: {
      thin: '1px',
      medium: '2px',
      thick: '4px',
    },
    styles: {
      solid: 'solid',
      dashed: 'dashed',
      dotted: 'dotted',
    },
  },
  icons: {
    sm: '1rem',      // 16px
    md: '1.5rem',    // 24px
    lg: '2rem',      // 32px
  },
  breakpoints: {
    mobile: '480px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1440px',
  },
  transitions: {
    default: '0.2s ease',
    fast: '0.1s ease',
    slow: '0.3s ease',
  },
  shadows: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.07)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  },
  lists: {
    bullet: {
      spacing: '1rem', // Space between list items
      fontSize: '1.125rem',
      lineHeight: '1.6',
      bulletColor: 'var(--color-text-primary)',
      style: {
        listStyleType: 'disc',
        paddingLeft: '1.5rem',
      }
    }
  },
};

export default theme; 