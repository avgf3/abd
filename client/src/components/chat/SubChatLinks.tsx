import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { ChatLink } from '@/data/countryChats';

interface SubChatLinksProps {
  chatLinks: ChatLink[];
  countryName: string;
}

export default function SubChatLinks({ chatLinks, countryName }: SubChatLinksProps) {
  const [expandedLinks, setExpandedLinks] = useState<Set<number>>(new Set());

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedLinks);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedLinks(newExpanded);
  };

  const handleLinkClick = (link: ChatLink) => {
    // حفظ معلومات الرابط في localStorage
    if (link.subLinks && link.subLinks.length > 0) {
      localStorage.setItem(`room_${link.name}_sublinks`, JSON.stringify(link));
    }
    
    toast({
      title: link.name,
      description: link.description || 'جاري تحميل الغرفة...',
    });
  };

  return (
    <div className="glass-effect p-8 rounded-2xl border border-white/20 mb-8">
      <h2 className="text-3xl font-bold text-center mb-6 text-white">
        غرف دردشة {countryName.replace('شات ', '')} المتخصصة
      </h2>
      <div className="space-y-4">
        {chatLinks.map((link, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center">
              <button
                onClick={() => handleLinkClick(link)}
                className="flex-grow bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 p-4 rounded-xl text-white transition-all duration-300 hover:transform hover:scale-[1.02] border border-white/10 hover:border-white/30 text-right"
              >
                <p className="font-semibold text-lg">{link.name}</p>
                {link.description && (
                  <p className="text-sm text-gray-300 mt-1">{link.description}</p>
                )}
              </button>
              
              {link.subLinks && link.subLinks.length > 0 && (
                <button
                  onClick={() => toggleExpanded(index)}
                  className="mr-2 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  title={expandedLinks.has(index) ? 'إخفاء الروابط الفرعية' : 'عرض الروابط الفرعية'}
                >
                  {expandedLinks.has(index) ? (
                    <ChevronDown className="w-5 h-5 text-white" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-white" />
                  )}
                </button>
              )}
            </div>

            {/* الروابط الفرعية */}
            {link.subLinks && expandedLinks.has(index) && (
              <div className="mr-8 grid grid-cols-2 md:grid-cols-3 gap-3">
                {link.subLinks.map((subLink, subIndex) => (
                  <button
                    key={subIndex}
                    onClick={() => handleLinkClick(subLink.name, subLink.description)}
                    className="bg-gradient-to-r from-purple-600/15 to-pink-600/15 hover:from-purple-600/25 hover:to-pink-600/25 p-3 rounded-lg text-white transition-all duration-300 hover:transform hover:scale-105 border border-white/10 hover:border-white/30"
                  >
                    <p className="font-medium text-sm">{subLink.name}</p>
                    {subLink.description && (
                      <p className="text-xs text-gray-300 mt-1">{subLink.description}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}