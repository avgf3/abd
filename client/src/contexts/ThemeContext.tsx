import React, { createContext, useContext, useState, useEffect } from 'react';

type ThemeType = 'default' | 'arabic-chat';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    const saved = localStorage.getItem('chat-theme');
    return (saved as ThemeType) || 'default';
  });

  useEffect(() => {
    document.documentElement.removeAttribute('data-theme');
    
    if (theme === 'arabic-chat') {
      document.documentElement.setAttribute('data-theme', 'arabic-chat');
    }
    
    localStorage.setItem('chat-theme', theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState(prev => prev === 'default' ? 'arabic-chat' : 'default');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
