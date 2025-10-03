import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface ComposerStyleContextType {
  textColor: string;
  bold: boolean;
  setTextColor: (color: string) => void;
  toggleBold: () => void;
  palette: string[];
}

const DEFAULT_PALETTE: string[] = [
  '#000000', '#3f3f46', '#52525b', '#64748b', '#475569', '#334155',
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#fb7185', '#111827',
];

const STORAGE_KEYS = {
  color: 'composer.textColor',
  bold: 'composer.bold',
};

const ComposerStyleContext = createContext<ComposerStyleContextType | undefined>(undefined);

export function ComposerStyleProvider({ children }: { children: React.ReactNode }) {
  const [textColor, setTextColorState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.color) || '#000000';
    } catch {
      return '#000000';
    }
  });

  const [bold, setBold] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.bold) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.color, textColor);
    } catch {}
  }, [textColor]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.bold, bold ? '1' : '0');
    } catch {}
  }, [bold]);

  const setTextColor = useCallback((color: string) => {
    setTextColorState(color);
  }, []);

  const toggleBold = useCallback(() => {
    setBold((b) => !b);
  }, []);

  const value = useMemo<ComposerStyleContextType>(() => ({
    textColor,
    bold,
    setTextColor,
    toggleBold,
    palette: DEFAULT_PALETTE,
  }), [textColor, bold, setTextColor, toggleBold]);

  return (
    <ComposerStyleContext.Provider value={value}>{children}</ComposerStyleContext.Provider>
  );
}

export function useComposerStyle(): ComposerStyleContextType {
  const ctx = useContext(ComposerStyleContext);
  if (!ctx) throw new Error('useComposerStyle must be used within ComposerStyleProvider');
  return ctx;
}