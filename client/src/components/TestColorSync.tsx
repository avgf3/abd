import React from 'react';
import { buildProfileBackgroundGradient, extractFirstHexColor, getUserListItemStyles } from '@/utils/themeUtils';

interface TestColorSyncProps {
  profileBackgroundColor?: string;
  profileEffect?: string;
}

export default function TestColorSync({ profileBackgroundColor, profileEffect }: TestColorSyncProps) {
  const hexColor = profileBackgroundColor ? extractFirstHexColor(profileBackgroundColor) : '#3c0d0d';
  const gradient = buildProfileBackgroundGradient(hexColor);
  const userStyles = getUserListItemStyles({ profileBackgroundColor: hexColor, profileEffect });

  return (
    <div className="fixed bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-50 text-black">
      <h3 className="font-bold mb-2">🎨 اختبار تزامن الألوان</h3>
      
      <div className="space-y-2 text-sm">
        <div>
          <strong>اللون المدخل:</strong> 
          <code className="ml-2 bg-gray-100 px-1 rounded">{profileBackgroundColor || 'غير محدد'}</code>
        </div>
        
        <div>
          <strong>HEX المستخرج:</strong> 
          <code className="ml-2 bg-gray-100 px-1 rounded">{hexColor}</code>
        </div>
        
        <div>
          <strong>التدرج المبني:</strong> 
          <code className="ml-2 bg-gray-100 px-1 rounded text-xs block">{gradient}</code>
        </div>
        
        <div>
          <strong>التأثير:</strong> 
          <code className="ml-2 bg-gray-100 px-1 rounded">{profileEffect || 'none'}</code>
        </div>
      </div>
      
      <div className="mt-3 space-y-2">
        <div>
          <strong>معاينة البروفايل:</strong>
          <div 
            className="h-20 rounded-lg mt-1 border"
            style={{ background: gradient }}
          />
        </div>
        
        <div>
          <strong>معاينة قائمة المتصلين:</strong>
          <div 
            className={`h-12 rounded-lg mt-1 border p-2 ${profileEffect || ''}`}
            style={userStyles}
          >
            <span>اسم المستخدم</span>
          </div>
        </div>
      </div>
      
      <div className="mt-3 text-xs text-gray-600">
        {gradient === userStyles.background ? (
          <span className="text-green-600">✅ الألوان متطابقة!</span>
        ) : (
          <span className="text-red-600">❌ الألوان غير متطابقة</span>
        )}
      </div>
    </div>
  );
}