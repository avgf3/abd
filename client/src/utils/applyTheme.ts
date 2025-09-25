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
    // Modern cool palettes (muted, trendy, not over-saturated)
    orangeCool: {
      cssVars: {
        '--primary': '#ff8a4c', // soft orange
        '--primary-foreground': '#1a1a1a',
        '--background': '#0f1115',
        '--foreground': '#f6f7fb',
      },
    },
    pinkCool: {
      cssVars: {
        '--primary': '#ff85b5', // soft pink
        '--primary-foreground': '#1a1a1a',
        '--background': '#0f1115',
        '--foreground': '#f6f7fb',
      },
    },
    berryCool: {
      cssVars: {
        '--primary': '#7c3aed', // berry violet
        '--primary-foreground': '#ffffff',
        '--background': '#0f0f14',
        '--foreground': '#f1f5f9',
      },
    },
    tealCool: {
      cssVars: {
        '--primary': '#2dd4bf', // cool teal
        '--primary-foreground': '#0b1220',
        '--background': '#0b1220',
        '--foreground': '#e6f4ff',
      },
    },
    grapeMist: {
      cssVars: {
        '--primary': '#a78bfa',
        '--primary-foreground': '#0b0f1a',
        '--background': '#0b0f1a',
        '--foreground': '#eef2ff',
      },
    },
    roseAsh: {
      cssVars: {
        '--primary': '#fda4af',
        '--primary-foreground': '#111827',
        '--background': '#0d1117',
        '--foreground': '#f8fafc',
      },
    },
    midnightBlue: {
      cssVars: {
        '--primary': '#60a5fa',
        '--primary-foreground': '#0a0f1a',
        '--background': '#0a0f1a',
        '--foreground': '#e2e8f0',
      },
    },
    cocoaMint: {
      cssVars: {
        '--primary': '#10b981',
        '--primary-foreground': '#0c0f14',
        '--background': '#0c0f14',
        '--foreground': '#e5e7eb',
      },
    },
    amberFog: {
      cssVars: {
        '--primary': '#f59e0b',
        '--primary-foreground': '#111827',
        '--background': '#0b0f14',
        '--foreground': '#f3f4f6',
      },
    },
    arcticBlue: {
      cssVars: {
        '--primary': '#38bdf8',
        '--primary-foreground': '#0b1020',
        '--background': '#0b1020',
        '--foreground': '#e6edf3',
      },
    },
  };

  const theme = themes[themeId] || themes.default;
  const root = document.documentElement;
  const finalCssVars: Record<string, string> = { ...theme.cssVars };
  // Ensure solid variables exist for Tailwind mappings
  if (finalCssVars['--background'] && !finalCssVars['--background-solid']) {
    finalCssVars['--background-solid'] = finalCssVars['--background'];
  }
  if (finalCssVars['--primary'] && !finalCssVars['--primary-solid']) {
    finalCssVars['--primary-solid'] = finalCssVars['--primary'];
  }

  // Navigation bar tint variables (exclude dark and berryCool as requested)
  if (themeId !== 'dark' && themeId !== 'berryCool') {
    finalCssVars['--nav-tint-start'] = 'color-mix(in srgb, var(--primary-solid) 16%, transparent)';
    finalCssVars['--nav-tint-end'] = 'color-mix(in srgb, var(--primary-solid) 6%, transparent)';
    finalCssVars['--nav-border'] = 'color-mix(in srgb, var(--primary-solid) 22%, rgba(255, 255, 255, 0.10))';
    // Sidebar: force clean white for non-excluded themes
    finalCssVars['--sidebar-background'] = '#ffffff';
    finalCssVars['--sidebar-foreground'] = '#0f172a';
    finalCssVars['--sidebar-border'] = 'rgba(0, 0, 0, 0.08)';
    finalCssVars['--sidebar-accent'] = 'rgba(0, 0, 0, 0.04)';
    finalCssVars['--sidebar-accent-foreground'] = '#0f172a';
    finalCssVars['--sidebar-primary'] = 'var(--primary-solid)';
    finalCssVars['--sidebar-primary-foreground'] = 'var(--primary-foreground)';
    finalCssVars['--sidebar-ring'] = 'var(--ring)';
    // Tabs active background (theme tinted)
    finalCssVars['--tab-active-bg-start'] = 'color-mix(in srgb, var(--primary-solid) 28%, transparent)';
    finalCssVars['--tab-active-bg-end'] = 'color-mix(in srgb, var(--primary-solid) 12%, transparent)';
  } else {
    finalCssVars['--nav-tint-start'] = 'transparent';
    finalCssVars['--nav-tint-end'] = 'transparent';
    finalCssVars['--nav-border'] = 'rgba(255, 255, 255, 0.08)';
    // Sidebar: keep theme-native look for excluded themes
    finalCssVars['--sidebar-background'] = 'var(--background-solid)';
    finalCssVars['--sidebar-foreground'] = 'var(--foreground)';
    finalCssVars['--sidebar-border'] = 'rgba(255, 255, 255, 0.08)';
    finalCssVars['--sidebar-accent'] = 'rgba(255, 255, 255, 0.06)';
    finalCssVars['--sidebar-accent-foreground'] = 'var(--foreground)';
    finalCssVars['--sidebar-primary'] = 'var(--primary-solid)';
    finalCssVars['--sidebar-primary-foreground'] = 'var(--primary-foreground)';
    finalCssVars['--sidebar-ring'] = 'var(--ring)';
    // Tabs active background: neutral
    finalCssVars['--tab-active-bg-start'] = 'transparent';
    finalCssVars['--tab-active-bg-end'] = 'transparent';
  }

  // Special styles for berryCool theme
  if (themeId === 'berryCool') {
    // Wall posts background - pure black for berryCool
    finalCssVars['--wall-post-bg'] = 'rgba(0, 0, 0, 0.6)';
    // Wall border color - pure black for berryCool (walls only)
    finalCssVars['--wall-border'] = '#000000';
    // Richest modal header - pure black like private message header
    finalCssVars['--richest-header-bg'] = '#000000';
    // Settings menu background - solid black only for berryCool
    finalCssVars['--settings-menu-bg'] = '#000000';
    // Background RGB for fallback
    finalCssVars['--background-rgb'] = '15, 15, 20';
    // Tabs list solid background for wall tabs (Public/Friends) should be pure black
    finalCssVars['--tabs-bg'] = '#000000';
    // Friends requests cards background should be pure black on berryCool only
    finalCssVars['--friends-requests-bg'] = '#000000';
  } else {
    // Default wall post background
    finalCssVars['--wall-post-bg'] = 'rgba(255, 255, 255, 0.6)';
    // Default richest header
    finalCssVars['--richest-header-bg'] = 'linear-gradient(90deg, #1f1235, #6c2bd9, #0ea5e9)';
    // Default background RGB
    finalCssVars['--background-rgb'] = '255, 255, 255';
  }
  Object.entries(finalCssVars).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });

  if (persist) {
    try {
      localStorage.setItem('selectedTheme', themeId);
    } catch {}
  }
}
