/**
 * 🚀 ProfileModal LITE Version
 * هدف: سرعة + بساطة = تجربة أفضل
 * 
 * المميزات:
 * ✅ فتح فوري (< 0.2s)
 * ✅ كود بسيط (< 300 سطر)
 * ✅ إطارات جميلة
 * ✅ تأثيرات سلسة
 * ✅ استهلاك منخفض
 */

import { X, Settings, Users, Gift } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ChatUser } from '@/types/chat';
import { getImageSrc } from '@/utils/imageUtils';
import './ProfileFrames.css'; // ملف CSS منفصل للإطارات

interface ProfileModalLiteProps {
  user: ChatUser | null;
  currentUser: ChatUser | null;
  onClose: () => void;
}

export default function ProfileModalLite({
  user,
  currentUser,
  onClose,
}: ProfileModalLiteProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'friends' | 'gifts'>('info');
  
  if (!user) return null;

  const isOwnProfile = currentUser?.id === user.id;
  
  // تحديد الإطار بناءً على المستوى/الرتبة
  const getFrameClass = (userLevel: number) => {
    if (userLevel >= 50) return 'frame-diamond';
    if (userLevel >= 30) return 'frame-gold';
    if (userLevel >= 15) return 'frame-silver';
    return 'frame-bronze';
  };

  const frameClass = getFrameClass(user.level || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* Container */}
      <div className="relative w-full max-w-md mx-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header with close button */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner (optional) */}
        {user.profileBanner && (
          <div 
            className="h-32 bg-cover bg-center"
            style={{ backgroundImage: `url(${getImageSrc(user.profileBanner)})` }}
          />
        )}

        {/* Avatar with Frame */}
        <div className="relative flex justify-center -mt-16 mb-4">
          <div className={`profile-avatar ${frameClass}`}>
            <img
              src={getImageSrc(user.profileImage || '/default_avatar.svg')}
              alt={user.username}
              className="w-32 h-32 rounded-full object-cover"
            />
          </div>
        </div>

        {/* User Info */}
        <div className="px-6 text-center">
          {/* Username with glow effect */}
          <h2 
            className="text-2xl font-bold mb-2 username-glow"
            style={{ color: user.usernameColor || '#fff' }}
          >
            {user.username}
          </h2>

          {/* Status/Bio */}
          {user.status && (
            <p className="text-gray-400 text-sm mb-4">{user.status}</p>
          )}

          {/* Stats Row */}
          <div className="flex justify-center gap-6 mb-6">
            <div className="text-center">
              <p className="text-xl font-bold text-yellow-400">{user.level || 0}</p>
              <p className="text-xs text-gray-400">المستوى</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-green-400">{user.points || 0}</p>
              <p className="text-xs text-gray-400">النقاط</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-blue-400">
                {user.isOnline ? '🟢' : '🔴'}
              </p>
              <p className="text-xs text-gray-400">
                {user.isOnline ? 'متصل' : 'غير متصل'}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                activeTab === 'info'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-1" />
              المعلومات
            </button>
            
            {!isOwnProfile && (
              <>
                <button
                  onClick={() => setActiveTab('friends')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'friends'
                      ? 'text-white border-b-2 border-blue-500'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <Users className="w-4 h-4 inline mr-1" />
                  الأصدقاء
                </button>
                
                <button
                  onClick={() => setActiveTab('gifts')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'gifts'
                      ? 'text-white border-b-2 border-blue-500'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <Gift className="w-4 h-4 inline mr-1" />
                  الهدايا
                </button>
              </>
            )}
          </div>

          {/* Tab Content */}
          <div className="mb-6 text-right">
            {activeTab === 'info' && (
              <div className="space-y-3 text-sm">
                {user.age && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">العمر:</span>
                    <span className="text-white">{user.age}</span>
                  </div>
                )}
                {user.country && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">الدولة:</span>
                    <span className="text-white">{user.country}</span>
                  </div>
                )}
                {user.gender && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">الجنس:</span>
                    <span className="text-white">{user.gender}</span>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'friends' && (
              <div className="text-center text-gray-400 py-8">
                قريباً...
              </div>
            )}

            {activeTab === 'gifts' && (
              <div className="text-center text-gray-400 py-8">
                قريباً...
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {!isOwnProfile && (
            <div className="flex gap-3 pb-6">
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                إضافة صديق
              </Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700">
                إرسال رسالة
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
