import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Check, Monitor, Globe } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface Theme {
  id: 'default' | 'arabic-chat';
  name: string;
  nameAr: string;
  description: string;
  icon: React.ReactNode;
  preview: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

const THEMES: Theme[] = [
  {
    id: 'default',
    name: 'Default Theme',
    nameAr: 'الثيم الافتراضي',
    description: 'التصميم الأصلي لموقعك مع جميع الميزات المتقدمة',
    icon: <Monitor className="w-6 h-6" />,
    preview: '/previews/default-theme.png',
    colors: {
      primary: '#3b82f6',
      secondary: '#1f2937',
      accent: '#8b5cf6'
    }
  },
  {
    id: 'arabic-chat',
    name: 'Arabic Chat',
    nameAr: 'أرابيك شات',
    description: 'تصميم كلاسيكي مستوحى من arabic.chat بألوان مريحة',
    icon: <Globe className="w-6 h-6" />,
    preview: '/previews/arabic-chat-theme.png',
    colors: {
      primary: '#1ba3e6',
      secondary: '#1a1d24',
      accent: '#8b5cf6'
    }
  }
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* زر فتح اختيار الثيم */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-white"
      >
        <Palette className="w-5 h-5" />
        <span className="hidden sm:inline">الثيمات</span>
      </button>

      {/* Modal اختيار الثيم */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl bg-gray-900 rounded-2xl shadow-2xl z-50 max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500/10 rounded-xl">
                      <Palette className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">اختر الثيم</h2>
                      <p className="text-sm text-gray-400 mt-1">
                        غيّر شكل الموقع بالكامل بضغطة زر
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Themes Grid */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {THEMES.map((themeOption) => (
                    <motion.div
                      key={themeOption.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setTheme(themeOption.id);
                        setTimeout(() => setIsOpen(false), 300);
                      }}
                      className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                        theme === themeOption.id
                          ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      {/* Preview Image */}
                      <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
                        {/* Color Preview */}
                        <div className="flex gap-2">
                          <div
                            className="w-16 h-16 rounded-xl shadow-lg"
                            style={{ background: themeOption.colors.primary }}
                          />
                          <div
                            className="w-16 h-16 rounded-xl shadow-lg"
                            style={{ background: themeOption.colors.secondary }}
                          />
                          <div
                            className="w-16 h-16 rounded-xl shadow-lg"
                            style={{ background: themeOption.colors.accent }}
                          />
                        </div>

                        {/* Selected Badge */}
                        {theme === themeOption.id && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-3 right-3 bg-blue-500 text-white rounded-full p-2 shadow-lg"
                          >
                            <Check className="w-5 h-5" />
                          </motion.div>
                        )}
                      </div>

                      {/* Theme Info */}
                      <div className="p-4 bg-gray-800/50">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-gray-700 rounded-lg">
                            {themeOption.icon}
                          </div>
                          <div>
                            <h3 className="font-bold text-white">
                              {themeOption.nameAr}
                            </h3>
                            <p className="text-xs text-gray-400">
                              {themeOption.name}
                            </p>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-400 leading-relaxed">
                          {themeOption.description}
                        </p>

                        {/* Features */}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {themeOption.id === 'default' && (
                            <>
                              <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs">
                                حديث
                              </span>
                              <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded text-xs">
                                متقدم
                              </span>
                            </>
                          )}
                          {themeOption.id === 'arabic-chat' && (
                            <>
                              <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs">
                                كلاسيكي
                              </span>
                              <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded text-xs">
                                مألوف
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Info Box */}
                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <p className="text-sm text-blue-400 leading-relaxed">
                    💡 <strong>نصيحة:</strong> جميع الثيمات تحافظ على بياناتك وإعداداتك. 
                    يمكنك التبديل بينها في أي وقت دون فقدان أي شيء!
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-700 bg-gray-800/50 flex justify-between items-center">
                <div className="text-sm text-gray-400">
                  الثيم الحالي: <span className="text-white font-semibold">
                    {THEMES.find(t => t.id === theme)?.nameAr}
                  </span>
                </div>
                
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
