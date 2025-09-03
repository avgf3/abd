import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import type { ChatLink } from '@/data/countryChats';

interface InRoomSubLinksProps {
  currentRoomName: string;
  chatLink?: ChatLink;
}

export default function InRoomSubLinks({ currentRoomName, chatLink }: InRoomSubLinksProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!chatLink?.subLinks || chatLink.subLinks.length === 0) {
    return null;
  }

  const handleLinkClick = (linkName: string, description?: string) => {
    toast({
      title: linkName,
      description: description || 'جاري تحميل الغرفة...',
    });
  };

  return (
    <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 p-3 border-b border-white/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white/90">
            غرف {currentRoomName.replace('شات ', '')} الفرعية
          </span>
          <span className="text-xs text-white/60">
            ({chatLink.subLinks.length} غرفة)
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          title={isExpanded ? 'إخفاء الغرف الفرعية' : 'عرض الغرف الفرعية'}
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-white/70" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/70" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 flex flex-wrap gap-2">
          {chatLink.subLinks.map((subLink, index) => (
            <button
              key={index}
              onClick={() => handleLinkClick(subLink.name, subLink.description)}
              className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-medium text-white/90 transition-all duration-200 hover:scale-105"
              title={subLink.description}
            >
              {subLink.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}