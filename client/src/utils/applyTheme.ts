export function applyThemeById(themeId: string, persist: boolean = false) {
  const themes: Record<string, { cssVars: Record<string, string> }> = {
    default: {
      cssVars: {
        '--primary': '#667eea',
        '--primary-foreground': '#ffffff',
        '--background': '#ffffff',
        '--foreground': '#1a202c',
      },
    },
    dark: {
      cssVars: {
        '--primary': '#2c3e50',
        '--primary-foreground': '#ffffff',
        '--background': '#1a202c',
        '--foreground': '#ffffff',
      },
    },
    ocean: {
      cssVars: {
        '--primary': '#4facfe',
        '--primary-foreground': '#ffffff',
        '--background': '#f0f9ff',
        '--foreground': '#0c4a6e',
      },
    },
    sunset: {
      cssVars: {
        '--primary': '#f093fb',
        '--primary-foreground': '#ffffff',
        '--background': '#fef7ff',
        '--foreground': '#831843',
      },
    },
    forest: {
      cssVars: {
        '--primary': '#11998e',
        '--primary-foreground': '#ffffff',
        '--background': '#f0fdf4',
        '--foreground': '#14532d',
      },
    },
    royal: {
      cssVars: {
        '--primary': '#8b5cf6',
        '--primary-foreground': '#ffffff',
        '--background': '#faf5ff',
        '--foreground': '#581c87',
      },
    },
    fire: {
      cssVars: {
        '--primary': '#ff9a9e',
        '--primary-foreground': '#ffffff',
        '--background': '#fef2f2',
        '--foreground': '#991b1b',
      },
    },
    ice: {
      cssVars: {
        '--primary': '#a8edea',
        '--primary-foreground': '#0f172a',
        '--background': '#f0fdfa',
        '--foreground': '#134e4a',
      },
    },
  };

  const theme = themes[themeId] || themes.default;
  const root = document.documentElement;

  // Apply CSS variables for the selected theme
  Object.entries(theme.cssVars).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });

  // Ensure Tailwind dark: variants and any .dark-based styles work as expected
  const darkThemes = new Set(['dark']);
  if (darkThemes.has(themeId)) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  if (persist) {
    try {
      localStorage.setItem('selectedTheme', themeId);
    } catch {}
  }
}