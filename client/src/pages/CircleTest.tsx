import { useState } from 'react';
import ProfileImage from '@/components/chat/ProfileImage';
import type { ChatUser } from '@/types/chat';

export default function CircleTest() {
  const [testImage, setTestImage] = useState<string>('/default_avatar.svg');

  // Test user without frame
  const userNoFrame: ChatUser = {
    id: 1,
    username: 'TestUser',
    displayName: 'Test User (No Frame)',
    profileImage: testImage,
    role: 'member',
    isOnline: true,
    userType: 'member',
    gender: 'male',
  } as ChatUser;

  // Test user with frame
  const userWithFrame: ChatUser = {
    id: 2,
    username: 'TestUserFrame',
    displayName: 'Test User (With Frame)',
    profileImage: testImage,
    role: 'member',
    isOnline: true,
    userType: 'member',
    gender: 'female',
    profileFrame: 'frame1',
  } as any;

  return (
    <div style={{ 
      padding: 32, 
      backgroundColor: '#1a1a2e',
      minHeight: '100vh',
      color: 'white' 
    }}>
      <h1 style={{ marginBottom: 24, textAlign: 'center' }}>
        اختبار شكل الصورة: دائرية مع ومن دون إطار
      </h1>
      
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>
          رابط الصورة للاختبار:
        </label>
        <input
          type="text"
          value={testImage}
          onChange={(e) => setTestImage(e.target.value)}
          placeholder="أدخل رابط الصورة"
          style={{ 
            width: '100%', 
            padding: 8, 
            borderRadius: 4,
            fontSize: 14 
          }}
        />
      </div>

      {/* Test grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 32,
        maxWidth: 1200,
        margin: '0 auto',
      }}>
        {/* Without Frame */}
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.05)',
          padding: 24,
          borderRadius: 12,
          textAlign: 'center',
        }}>
          <h2 style={{ marginBottom: 16, fontSize: 18 }}>بدون إطار</h2>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center',
            marginBottom: 16,
          }}>
            <ProfileImage 
              user={userNoFrame} 
              size="large" 
              pixelSize={100}
              disableFrame={true}
            />
          </div>
          <p style={{ fontSize: 14, color: '#aaa' }}>
            يجب أن تكون الصورة <strong>دائرية تماماً</strong>
          </p>
          {/* Visual guide */}
          <div style={{ 
            marginTop: 16,
            display: 'flex',
            justifyContent: 'center',
          }}>
            <div style={{
              width: 100,
              height: 100,
              border: '2px dashed #666',
              borderRadius: '50%',
            }} />
          </div>
          <p style={{ fontSize: 12, color: '#777', marginTop: 8 }}>
            ⬆️ الشكل المطلوب (دائرة مثالية)
          </p>
        </div>

        {/* With Frame */}
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.05)',
          padding: 24,
          borderRadius: 12,
          textAlign: 'center',
        }}>
          <h2 style={{ marginBottom: 16, fontSize: 18 }}>مع إطار</h2>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center',
            marginBottom: 16,
          }}>
            <ProfileImage 
              user={userWithFrame} 
              size="large" 
              pixelSize={100}
            />
          </div>
          <p style={{ fontSize: 14, color: '#aaa' }}>
            يجب أن تكون الصورة <strong>دائرية تماماً</strong>
          </p>
          {/* Visual guide */}
          <div style={{ 
            marginTop: 16,
            display: 'flex',
            justifyContent: 'center',
          }}>
            <div style={{
              width: 100,
              height: 100,
              border: '2px dashed #666',
              borderRadius: '50%',
            }} />
          </div>
          <p style={{ fontSize: 12, color: '#777', marginTop: 8 }}>
            ⬆️ الشكل المطلوب (دائرة مثالية)
          </p>
        </div>
      </div>

      {/* Multiple sizes test */}
      <div style={{ marginTop: 48 }}>
        <h2 style={{ marginBottom: 24, textAlign: 'center' }}>
          اختبار الأحجام المختلفة (بدون إطار)
        </h2>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 32,
          flexWrap: 'wrap',
        }}>
          {[36, 56, 72, 100, 150].map(size => (
            <div key={size} style={{ textAlign: 'center' }}>
              <ProfileImage 
                user={userNoFrame} 
                pixelSize={size}
                disableFrame={true}
              />
              <p style={{ marginTop: 8, fontSize: 12, color: '#aaa' }}>
                {size}px
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Multiple sizes test with frame */}
      <div style={{ marginTop: 48 }}>
        <h2 style={{ marginBottom: 24, textAlign: 'center' }}>
          اختبار الأحجام المختلفة (مع إطار)
        </h2>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 32,
          flexWrap: 'wrap',
        }}>
          {[36, 56, 72, 100, 150].map(size => (
            <div key={size} style={{ textAlign: 'center' }}>
              <ProfileImage 
                user={userWithFrame} 
                pixelSize={size}
              />
              <p style={{ marginTop: 8, fontSize: 12, color: '#aaa' }}>
                {size}px
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Status indicator */}
      <div style={{ 
        marginTop: 48,
        padding: 24,
        backgroundColor: 'rgba(0,255,0,0.1)',
        borderRadius: 12,
        textAlign: 'center',
      }}>
        <h3 style={{ color: '#4ade80', marginBottom: 12 }}>
          ✅ معايير النجاح
        </h3>
        <ul style={{ 
          textAlign: 'right', 
          maxWidth: 600, 
          margin: '0 auto',
          color: '#aaa',
          fontSize: 14,
          lineHeight: 1.8,
        }}>
          <li>جميع الصور يجب أن تكون دائرية تماماً (ليست بيضوية)</li>
          <li>الصور بدون إطار يجب أن تكون نفس شكل الصور مع إطار</li>
          <li>جميع الأحجام يجب أن تحافظ على الشكل الدائري</li>
          <li>نسبة العرض إلى الارتفاع يجب أن تكون 1:1 بالضبط</li>
        </ul>
      </div>
    </div>
  );
}
