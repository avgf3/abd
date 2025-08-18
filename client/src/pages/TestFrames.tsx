import { AvatarWithFrame, availableFrames } from '@/components/ui/AvatarWithFrame';

export default function TestFrames() {
  const testImage = '/uploads/6fe965b5-cb66-4b57-a3ca-49e44b8c0f5e_1735417453007_profileImage.jpg';
  
  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-center">اختبار الإطارات</h1>
      
      {/* اختبار الوضع الكامل - الملف الشخصي */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">الوضع الكامل (الملف الشخصي)</h2>
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex flex-wrap gap-8 justify-center">
            {availableFrames.slice(0, 6).map((frame) => (
              <div key={frame.id} className="text-center">
                <AvatarWithFrame
                  src={testImage}
                  alt="Test"
                  fallback="TE"
                  frame={frame.id}
                  size={130}
                  variant="profile"
                />
                <p className="mt-2 text-sm">{frame.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* اختبار الوضع المختصر - قائمة المتصلين */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">الوضع المختصر (قائمة المتصلين)</h2>
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex flex-wrap gap-4">
            {availableFrames.slice(0, 6).map((frame) => (
              <div key={frame.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                <AvatarWithFrame
                  src={testImage}
                  alt="Test"
                  fallback="TE"
                  frame={frame.id}
                  size={40}
                  variant="list"
                />
                <span className="text-sm">{frame.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* مقارنة الأحجام */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">مقارنة الأحجام</h2>
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-medium mb-4">كامل (130px)</h3>
              <div className="flex justify-center">
                <AvatarWithFrame
                  src={testImage}
                  alt="Test"
                  fallback="TE"
                  frame="enhanced-crown-frame"
                  size={130}
                  variant="profile"
                />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">مختصر (40px)</h3>
              <div className="flex justify-center">
                <AvatarWithFrame
                  src={testImage}
                  alt="Test"
                  fallback="TE"
                  frame="enhanced-crown-frame"
                  size={40}
                  variant="list"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}