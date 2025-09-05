import { Globe, ChevronDown } from 'lucide-react';
import CountryFlag from '@/components/ui/CountryFlag';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string; // kept for compatibility; we'll render SVG via CountryFlag
  direction: 'ltr' | 'rtl';
}

const languages: Language[] = [
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', direction: 'rtl' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', direction: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', direction: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', direction: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', direction: 'ltr' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', direction: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', direction: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', direction: 'ltr' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', direction: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', direction: 'ltr' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', direction: 'ltr' },
];

interface LanguageSwitcherProps {
  onLanguageChange?: (language: Language) => void;
  compact?: boolean;
  className?: string;
}

export default function LanguageSwitcher({
  onLanguageChange,
  compact = false,
  className = '',
}: LanguageSwitcherProps) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(languages[0]); // Default to Arabic
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Load saved language from localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferred-language');
    if (savedLanguage) {
      const found = languages.find((lang) => lang.code === savedLanguage);
      if (found) {
        setCurrentLanguage(found);
        applyLanguageSettings(found);
      }
    }
  }, []);

  const applyLanguageSettings = (language: Language) => {
    // Update document direction
    document.documentElement.dir = language.direction;
    document.documentElement.lang = language.code;

    // Update body class for RTL/LTR styling
    document.body.classList.remove('rtl', 'ltr');
    document.body.classList.add(language.direction);

    // Save to localStorage
    localStorage.setItem('preferred-language', language.code);
  };

  const handleLanguageChange = async (language: Language) => {
    if (language.code === currentLanguage.code) return;

    setIsTransitioning(true);

    // Smooth transition effect
    const content = document.querySelector('.language-transition-content');
    if (content) {
      content.classList.add('opacity-50', 'scale-95');
    }

    // Wait for animation
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Apply new language
    setCurrentLanguage(language);
    applyLanguageSettings(language);

    if (onLanguageChange) {
      onLanguageChange(language);
    }

    // Complete transition
    setTimeout(() => {
      if (content) {
        content.classList.remove('opacity-50', 'scale-95');
      }
      setIsTransitioning(false);
    }, 100);
  };

  if (compact) {
    return (
      <div className={`${className}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`relative flex items-center gap-2 transition-all duration-200 ${
                isTransitioning ? 'opacity-70' : 'opacity-100'
              }`}
            >
              <CountryFlag country={currentLanguage.flag} size={18} rounded className="mr-1" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {languages.map((language) => (
              <DropdownMenuItem
                key={language.code}
                onClick={() => handleLanguageChange(language)}
                className={`flex items-center gap-3 cursor-pointer ${
                  currentLanguage.code === language.code
                    ? 'bg-blue-50 text-blue-700'
                    : 'hover:bg-gray-50'
                }`}
              >
                <CountryFlag country={language.flag} size={18} rounded className="mr-1" />
                <div className="flex flex-col">
                  <span className="font-medium">{language.nativeName}</span>
                  <span className="text-xs text-gray-500">{language.name}</span>
                </div>
                {currentLanguage.code === language.code && (
                  <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={`flex items-center gap-3 px-4 py-2 transition-all duration-200 ${
              isTransitioning ? 'opacity-70 scale-95' : 'opacity-100 scale-100'
            }`}
          >
            <Globe className="h-4 w-4" />
            <CountryFlag country={currentLanguage.flag} size={18} rounded className="mr-1" />
            <span className="font-medium">{currentLanguage.nativeName}</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="p-2">
            <div className="text-sm font-medium text-gray-700 mb-2 px-2">
              Choose Language / اختر اللغة
            </div>
            {languages.map((language) => (
              <DropdownMenuItem
                key={language.code}
                onClick={() => handleLanguageChange(language)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-150 ${
                  currentLanguage.code === language.code
                    ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <CountryFlag country={language.flag} size={20} rounded className="mr-1" />
                <div className="flex flex-col flex-1">
                  <span className="font-medium">{language.nativeName}</span>
                  <span className="text-sm text-gray-500">{language.name}</span>
                </div>
                <div className="text-xs text-gray-400">{language.direction.toUpperCase()}</div>
                {currentLanguage.code === language.code && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                )}
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Context for managing language state globally
import { createContext, useContext } from 'react';

interface LanguageContextType {
  currentLanguage: Language;
  changeLanguage: (language: Language) => void;
  isTransitioning: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(languages[0]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const changeLanguage = async (language: Language) => {
    if (language.code === currentLanguage.code) return;

    setIsTransitioning(true);

    // Apply language settings
    document.documentElement.dir = language.direction;
    document.documentElement.lang = language.code;
    document.body.classList.remove('rtl', 'ltr');
    document.body.classList.add(language.direction);
    localStorage.setItem('preferred-language', language.code);

    setCurrentLanguage(language);

    setTimeout(() => setIsTransitioning(false), 300);
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage, isTransitioning }}>
      <div
        className={`language-transition-content transition-all duration-300 ${
          isTransitioning ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        {children}
      </div>
    </LanguageContext.Provider>
  );
}
