/**
 * Wing Frame Demo Component
 * مكون عرض توضيحي لإطار الجناح الاحترافي
 * 
 * هذا المكون يوضح كيفية استخدام إطار الجناح في التطبيق
 */

import ProfileImage from '@/components/chat/ProfileImage';
import type { ChatUser } from '@/types/chat';

export default function WingFrameDemo() {
  // مستخدم تجريبي مع إطار الجناح
  const demoUser: ChatUser = {
    id: 'demo',
    username: 'مستخدم VIP',
    profileImage: '/default_avatar.svg',
    profileFrame: 'frame7', // 🪽 إطار الجناح
    usernameColor: '#FFD700',
    points: 10000,
    level: 50,
    gender: 'male',
  };

  return (
    <div className="p-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">
        🪽 عرض توضيحي لإطار الجناح الاحترافي
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center justify-items-center">
        {/* Small Size */}
        <div className="text-center">
          <ProfileImage 
            user={demoUser}
            size="small"
          />
          <p className="mt-3 text-sm text-gray-400">حجم صغير</p>
          <p className="text-xs text-gray-500">36px</p>
        </div>

        {/* Medium Size */}
        <div className="text-center">
          <ProfileImage 
            user={demoUser}
            size="medium"
          />
          <p className="mt-3 text-sm text-gray-400">حجم متوسط</p>
          <p className="text-xs text-gray-500">56px</p>
        </div>

        {/* Large Size */}
        <div className="text-center">
          <ProfileImage 
            user={demoUser}
            size="large"
          />
          <p className="mt-3 text-sm text-gray-400">حجم كبير</p>
          <p className="text-xs text-gray-500">72px</p>
        </div>
      </div>

      {/* Animation Info */}
      <div className="mt-8 p-4 bg-slate-800/50 rounded-lg border border-yellow-500/20">
        <h3 className="text-lg font-semibold text-yellow-400 mb-3">
          ✨ الحركات المتضمنة
        </h3>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-center gap-2">
            <span className="text-yellow-400">🦋</span>
            <span>رفرفة الجناح الاحترافية (3 ثواني)</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-yellow-400">✨</span>
            <span>توهج ذهبي نابض (2 ثانية)</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-yellow-400">🎈</span>
            <span>حركة طفو أنيقة (4 ثواني)</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-yellow-400">💫</span>
            <span>تأثير لمعان دوار (3 ثواني)</span>
          </li>
        </ul>
      </div>

      {/* Usage Code */}
      <div className="mt-6 p-4 bg-slate-950 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-400 mb-3">
          📝 كود الاستخدام
        </h3>
        <pre className="text-xs text-green-400 overflow-x-auto" dir="ltr">
{`// تعيين الإطار للمستخدم
user.profileFrame = "frame7";

// في SQL
UPDATE users 
SET profileFrame = 'frame7' 
WHERE user_id = YOUR_ID;`}
        </pre>
      </div>
    </div>
  );
}