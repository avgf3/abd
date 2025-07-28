import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { getEffectColor } from '@/utils/themeUtils';
import type { ChatUser } from '@/types/chat';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatPoints, getLevelInfo } from '@/utils/pointsUtils';
import PointsSentNotification from '@/components/ui/PointsSentNotification';

interface ProfileModalProps {
  user: ChatUser | null;
  currentUser: ChatUser | null;
  onClose: () => void;
  onIgnoreUser?: (userId: number) => void;
  onUpdate?: (user: ChatUser) => void;
  onPrivateMessage?: (user: ChatUser) => void;
  onAddFriend?: (user: ChatUser) => void;
}

export default function ProfileModal({ user, currentUser, onClose, onIgnoreUser, onUpdate, onPrivateMessage, onAddFriend }: ProfileModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentEditType, setCurrentEditType] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [localUser, setLocalUser] = useState<ChatUser | null>(user);
  const [selectedTheme, setSelectedTheme] = useState(user?.userTheme || 'theme-new-gradient');
  const [selectedEffect, setSelectedEffect] = useState(user?.profileEffect || 'none');
  const [previewProfile, setPreviewProfile] = useState<string | null>(null);
  const [sendingPoints, setSendingPoints] = useState(false);
  const [pointsToSend, setPointsToSend] = useState('');
  const [pointsSentNotification, setPointsSentNotification] = useState<{
    show: boolean;
    points: number;
    recipientName: string;
  }>({ show: false, points: 0, recipientName: '' });

  useEffect(() => {
    if (user) {
      setLocalUser(user);
      setSelectedTheme(user.userTheme || 'theme-new-gradient');
      setSelectedEffect(user.profileEffect || 'none');
    }
  }, [user]);

  if (!localUser) return null;

  // دالة ذكية لجلب بيانات المستخدم من السيرفر
  const fetchUser = async (id: number) => {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) throw new Error('فشل في جلب بيانات المستخدم');
    return await res.json();
  };

  // دالة ذكية لتحديث بيانات المستخدم
  const updateUser = async (id: number, updates: any) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('فشل في تحديث البيانات');
      const updated = await fetchUser(id);
      setLocalUser(updated);
      setPreviewProfile(null);
      if (onUpdate) onUpdate(updated);
      toast({ title: 'تم التحديث بنجاح' });
    } catch (e: any) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // دالة ذكية لرفع الصورة الشخصية
  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'خطأ', description: 'يرجى اختيار صورة صحيحة', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'خطأ', description: 'الحجم الأقصى 5 ميجابايت', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      // معاينة
      const reader = new FileReader();
      reader.onload = (ev) => setPreviewProfile(ev.target?.result as string);
      reader.readAsDataURL(file);

      // رفع الصورة
      const formData = new FormData();
      formData.append('profileImage', file);
      formData.append('userId', String(localUser?.id));
      const uploadRes = await fetch('/api/upload/profile-image', { method: 'POST', body: formData });
      const { imageUrl } = await uploadRes.json();
      if (!imageUrl) throw new Error('فشل في رفع الصورة');

      // تحديث بيانات المستخدم بالرابط الجديد
      await updateUser(localUser!.id, { profileImage: imageUrl });
    } catch (e: any) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // دالة ذكية لحفظ أي حقل
  const handleSaveEdit = async () => {
    if (!editValue.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال قيمة صحيحة', variant: 'destructive' });
      return;
    }
    let fieldName = '';
    switch (currentEditType) {
      case 'name': fieldName = 'username'; break;
      case 'status': fieldName = 'status'; break;
      case 'gender': fieldName = 'gender'; break;
      case 'country': fieldName = 'country'; break;
      case 'age': fieldName = 'age'; break;
      case 'socialStatus': fieldName = 'relation'; break;
    }
    if (fieldName) {
      await updateUser(localUser!.id, { [fieldName]: fieldName === 'age' ? parseInt(editValue) : editValue });
      setCurrentEditType(null);
      setEditValue('');
    }
  };

  // دالة ذكية لعرض الصورة
  const getProfileImageSrc = () => {
    if (previewProfile) return previewProfile;
    if (!localUser?.profileImage) return '/default_avatar.svg';
    if (localUser.profileImage.startsWith('http')) return localUser.profileImage;
    return localUser.profileImage;
  };

  const getProfileBannerSrc = () => {
    if (!localUser?.profileBanner || localUser.profileBanner === '') {
      return 'https://i.imgur.com/rJKrUfs.jpeg';
    }
    if (localUser.profileBanner.startsWith('http://') || localUser.profileBanner.startsWith('https://')) {
      return localUser.profileBanner;
    }
    if (localUser.profileBanner.startsWith('/uploads/')) {
      return localUser.profileBanner;
    }
    if (localUser.profileBanner.startsWith('/')) {
      return localUser.profileBanner;
    }
    return `/uploads/banners/${localUser.profileBanner}`;
  };

  const openEditModal = (type: string) => {
    setCurrentEditType(type);
    switch (type) {
      case 'name': setEditValue(localUser?.username || ''); break;
      case 'status': setEditValue(localUser?.status || ''); break;
      case 'gender': setEditValue(localUser?.gender || ''); break;
      case 'country': setEditValue(localUser?.country || ''); break;
      case 'age': setEditValue(localUser?.age?.toString() || ''); break;
      case 'socialStatus': setEditValue(localUser?.relation || ''); break;
    }
  };

  const closeEditModal = () => {
    setCurrentEditType(null);
    setEditValue('');
  };

  const handleSendPoints = async () => {
    const points = parseInt(pointsToSend);
    if (!points || points <= 0) {
      toast({ title: "خطأ", description: "يرجى إدخال عدد صحيح من النقاط", variant: "destructive" });
      return;
    }
    if (points > (currentUser?.points || 0)) {
      toast({ title: "نقاط غير كافية", description: `لديك ${currentUser?.points || 0} نقطة فقط`, variant: "destructive" });
      return;
    }
    try {
      setSendingPoints(true);
      const response = await apiRequest('/api/points/send', {
        method: 'POST',
        body: {
          senderId: currentUser?.id,
          receiverId: localUser?.id,
          points: points,
          reason: `نقاط مُهداة من ${currentUser?.username}`
        }
      });
      if (response.success) {
        setPointsSentNotification({
          show: true,
          points: points,
          recipientName: localUser?.username || ''
        });
        setPointsToSend('');
        setTimeout(() => onClose(), 1000);
      }
    } catch (error: any) {
      toast({ title: "خطأ في الإرسال", description: error.message || "فشل في إرسال النقاط", variant: "destructive" });
    } finally {
      setSendingPoints(false);
    }
  };

  return (
    <>
      <style>{`
        .profile-card {
          width: 100%;
          max-width: 380px;
          border-radius: 16px;
          overflow: hidden;
          background: linear-gradient(135deg, #f57f17, #b71c1c, #6a1b9a);
          box-shadow: 0 8px 32px rgba(0,0,0,0.8);
          position: relative;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          height: fit-content;
        }
        .profile-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.9);
        }
        .profile-cover {
          position: relative;
          aspect-ratio: 3 / 1;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
        .profile-avatar {
          width: 100px;
          height: 100px;
          border-radius: 16px;
          overflow: hidden;
          border: 4px solid rgba(255,255,255,0.9);
          position: absolute;
          top: calc(100% - 50px);
          right: 20px;
          background-color: white;
          box-shadow: 0 6px 20px rgba(0,0,0,0.6);
          z-index: 2;
          transition: transform 0.3s ease;
        }
        .profile-avatar:hover {
          transform: scale(1.05);
        }
        .profile-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .change-avatar-btn {
          position: absolute;
          top: calc(100% - 25px);
          right: 28px;
          background: rgba(0,0,0,0.8);
          border-radius: 50%;
          width: 30px;
          height: 30px;
          text-align: center;
          line-height: 30px;
          font-size: 14px;
          color: #fff;
          cursor: pointer;
          z-index: 3;
          transition: background 0.3s ease, transform 0.2s ease;
          border: none;
        }
        .change-avatar-btn:hover {
          background: rgba(0,0,0,1);
          transform: scale(1.1);
        }
        input[type="file"] {
          display: none;
        }
        .profile-body {
          padding: 60px 20px 16px;
        }
        .profile-info {
          margin-bottom: 12px;
          text-align: center;
          margin-top: -50px;
        }
        .profile-info h3 {
          margin: 0 0 6px 0;
          font-size: 20px;
          font-weight: bold;
          color: #ffc107;
          text-shadow: 0 2px 4px rgba(0,0,0,0.5);
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .profile-info h3:hover {
          color: #fff;
          transform: translateY(-2px);
        }
        .profile-info small {
          display: block;
          font-size: 13px;
          color: #ddd;
          opacity: 0.9;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .profile-info small:hover {
          color: #ffc107;
          transform: translateY(-1px);
        }
        .profile-details {
          padding: 12px;
          font-size: 13px;
          background: rgba(255,255,255,0.08);
          border-radius: 12px;
          margin: 12px 0;
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
        }
        .profile-details p {
          margin: 6px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 8px;
          border-radius: 6px;
          transition: all 0.3s ease;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          cursor: pointer;
        }
        .profile-details p:hover {
          background: rgba(255,255,255,0.05);
          transform: translateX(-3px);
        }
        .profile-details p:last-child {
          border-bottom: none;
        }
        .profile-details span {
          font-weight: bold;
          color: #ffc107;
          text-align: left;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
          padding: 3px 6px;
          border-radius: 4px;
          background: rgba(255,255,255,0.05);
        }
        .edit-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .edit-content {
          background: linear-gradient(135deg, #f57f17, #b71c1c, #6a1b9a);
          padding: 24px;
          border-radius: 16px;
          width: 90%;
          max-width: 350px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.9);
        }
        .edit-content h3 {
          margin: 0 0 16px 0;
          color: #ffc107;
          text-align: center;
          font-size: 18px;
        }
        .edit-field {
          margin-bottom: 16px;
        }
        .edit-field label {
          display: block;
          margin-bottom: 6px;
          color: #fff;
          font-weight: bold;
          font-size: 14px;
        }
        .edit-field input, .edit-field select {
          width: 100%;
          padding: 12px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05));
          color: #fff;
          font-size: 14px;
          font-weight: 500;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
          box-sizing: border-box;
        }
        .edit-field input:focus, .edit-field select:focus {
          outline: none;
          border-color: #ffc107;
          background: linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1));
          box-shadow: 0 0 15px rgba(255,193,7,0.3);
        }
        .edit-buttons {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 16px;
        }
        .edit-buttons button {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s;
          font-size: 13px;
        }
        .save-btn {
          background: #28a745;
          color: white;
        }
        .cancel-btn {
          background: #dc3545;
          color: white;
        }
        .edit-buttons button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
      `}</style>

      <div className="fixed inset-0 z-50 bg-black/80" onClick={onClose} />
      
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-4 px-4 overflow-y-auto">
        <div className="profile-card">
          <button 
            onClick={onClose}
            className="absolute top-2 right-2 z-20 p-2 rounded-full bg-red-500/80 hover:bg-red-600 text-white transition-colors shadow-lg"
          >
            <X size={20} />
          </button>

          <div 
            className="profile-cover"
            style={{ 
              backgroundImage: `url(${getProfileBannerSrc()})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            <div className="profile-avatar">
              <img 
                src={getProfileImageSrc()} 
                alt="الصورة الشخصية"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  transition: 'none',
                  backfaceVisibility: 'hidden',
                  transform: 'translateZ(0)'
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== '/default_avatar.svg') {
                    target.src = '/default_avatar.svg';
                  }
                }}
              />
            </div>
            
            {localUser?.id === currentUser?.id && (
              <>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                  disabled={isLoading}
                />
                <button 
                  className="change-avatar-btn"
                  onClick={() => avatarInputRef.current?.click()}
                  title="تغيير الصورة"
                  disabled={isLoading}
                >
                  📷
                </button>
              </>
            )}
          </div>

          <div className="profile-body">
            <div className="profile-info">
              <h3 
                onClick={() => localUser?.id === currentUser?.id && openEditModal('name')}
                style={{ cursor: localUser?.id === currentUser?.id ? 'pointer' : 'default' }}
              >
                {localUser?.username || 'اسم المستخدم'}
              </h3>
              <small 
                onClick={() => localUser?.id === currentUser?.id && openEditModal('status')}
                style={{ cursor: localUser?.id === currentUser?.id ? 'pointer' : 'default' }}
              >
                {localUser?.status || 'اضغط لإضافة حالة'}
              </small>
            </div>

            {localUser?.id !== currentUser?.id && (
              <div className="profile-buttons">
                <button>🚩 تبليغ</button>
                <button onClick={() => onIgnoreUser?.(localUser?.id || 0)}>🚫 حظر</button>
                <button onClick={() => onPrivateMessage?.(localUser)}>💬 محادثة</button>
                <button onClick={() => onAddFriend?.(localUser)}>👥 اضافة صديق</button>
              </div>
            )}

            <div className="profile-details">
              <p 
                onClick={() => localUser?.id === currentUser?.id && openEditModal('gender')}
                style={{ cursor: localUser?.id === currentUser?.id ? 'pointer' : 'default' }}
              >
                🧍‍♀️ الجنس: <span>{localUser?.gender || 'غير محدد'}</span>
              </p>
              <p 
                onClick={() => localUser?.id === currentUser?.id && openEditModal('country')}
                style={{ cursor: localUser?.id === currentUser?.id ? 'pointer' : 'default' }}
              >
                🌍 البلد: <span>{localUser?.country || 'غير محدد'}</span>
              </p>
              <p 
                onClick={() => localUser?.id === currentUser?.id && openEditModal('age')}
                style={{ cursor: localUser?.id === currentUser?.id ? 'pointer' : 'default' }}
              >
                🎂 العمر: <span>{localUser?.age ? `${localUser.age} سنة` : 'غير محدد'}</span>
              </p>
              <p 
                onClick={() => localUser?.id === currentUser?.id && openEditModal('socialStatus')}
                style={{ cursor: localUser?.id === currentUser?.id ? 'pointer' : 'default' }}
              >
                💍 الحالة الاجتماعية: <span>{localUser?.relation || 'غير محدد'}</span>
              </p>
              <p>
                📅 تاريخ الإنضمام: <span>{localUser?.createdAt ? new Date(localUser.createdAt).toLocaleDateString('ar-SA') : 'غير محدد'}</span>
              </p>
              <p>
                🎁 نقاط الهدايا: <span>{localUser?.points || 0}</span>
              </p>
              {currentUser && currentUser.id !== localUser?.id && (
                <p 
                  onClick={() => setCurrentEditType('sendPoints')}
                  style={{ cursor: 'pointer' }}
                >
                  💰 إرسال النقاط: <span>اضغط للإرسال</span>
                </p>
              )}
              <p>
                🧾 الحالة: <span>{localUser?.isOnline ? 'متصل' : 'غير متصل'}</span>
              </p>
            </div>
          </div>

          {isLoading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl z-30">
              <div className="bg-white/90 backdrop-blur-md rounded-lg p-4 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-700 font-medium">جاري الحفظ...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {currentEditType && (user.id === currentUser?.id || currentEditType === 'sendPoints') && (
        <div className="edit-modal">
          <div className="edit-content">
            <h3>
              {currentEditType === 'name' && 'تعديل الاسم'}
              {currentEditType === 'status' && 'تعديل الحالة'}
              {currentEditType === 'gender' && 'تعديل الجنس'}
              {currentEditType === 'country' && 'تعديل البلد'}
              {currentEditType === 'age' && 'تعديل العمر'}
              {currentEditType === 'socialStatus' && 'تعديل الحالة الاجتماعية'}
              {currentEditType === 'sendPoints' && '💰 إرسال النقاط'}
            </h3>
            
            {currentEditType === 'sendPoints' ? (
              <div>
                <div style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  padding: '12px', 
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '8px' }}>
                    نقاطك الحالية: {formatPoints(currentUser?.points || 0)}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="number"
                      placeholder="عدد النقاط"
                      value={pointsToSend}
                      onChange={(e) => setPointsToSend(e.target.value)}
                      style={{
                        flex: '1',
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: 'rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontSize: '12px'
                      }}
                      min="1"
                      max={currentUser?.points || 0}
                      disabled={sendingPoints}
                      autoFocus
                    />
                    <button
                      onClick={handleSendPoints}
                      disabled={sendingPoints || !pointsToSend || parseInt(pointsToSend) <= 0}
                      style={{
                        background: sendingPoints ? 'rgba(255,193,7,0.5)' : 'linear-gradient(135deg, #ffc107, #ff8f00)',
                        color: '#000',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: sendingPoints ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {sendingPoints ? '⏳' : '🎁'} إرسال
                    </button>
                  </div>
                  
                  <div style={{ fontSize: '10px', color: '#aaa' }}>
                    💡 سيتم خصم النقاط من رصيدك وإضافتها للمستخدم
                  </div>
                </div>
                
                <div className="edit-buttons" style={{ marginTop: '12px' }}>
                  <button className="cancel-btn" onClick={closeEditModal}>
                    ❌ إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="edit-field">
                  <label>
                    {currentEditType === 'name' && 'الاسم الجديد:'}
                    {currentEditType === 'status' && 'الحالة الجديدة:'}
                    {currentEditType === 'gender' && 'الجنس:'}
                    {currentEditType === 'country' && 'البلد:'}
                    {currentEditType === 'age' && 'العمر:'}
                    {currentEditType === 'socialStatus' && 'الحالة الاجتماعية:'}
                  </label>
                  {currentEditType === 'gender' ? (
                    <select value={editValue} onChange={(e) => setEditValue(e.target.value)}>
                      <option value="">اختر...</option>
                      <option value="ذكر">👨 ذكر</option>
                      <option value="أنثى">👩 أنثى</option>
                    </select>
                  ) : currentEditType === 'country' ? (
                    <select value={editValue} onChange={(e) => setEditValue(e.target.value)}>
                      <option value="">اختر...</option>
                      <option value="🇸🇦 السعودية">🇸🇦 السعودية</option>
                      <option value="🇦🇪 الإمارات">🇦🇪 الإمارات</option>
                      <option value="🇪🇬 مصر">🇪🇬 مصر</option>
                      <option value="🇯🇴 الأردن">🇯🇴 الأردن</option>
                      <option value="🇱🇧 لبنان">🇱🇧 لبنان</option>
                      <option value="🇸🇾 سوريا">🇸🇾 سوريا</option>
                      <option value="🇮🇶 العراق">🇮🇶 العراق</option>
                      <option value="🇰🇼 الكويت">🇰🇼 الكويت</option>
                      <option value="🇶🇦 قطر">🇶🇦 قطر</option>
                      <option value="🇧🇭 البحرين">🇧🇭 البحرين</option>
                      <option value="🇴🇲 عمان">🇴🇲 عمان</option>
                      <option value="🇾🇪 اليمن">🇾🇪 اليمن</option>
                      <option value="🇱🇾 ليبيا">🇱🇾 ليبيا</option>
                      <option value="🇹🇳 تونس">🇹🇳 تونس</option>
                      <option value="🇩🇿 الجزائر">🇩🇿 الجزائر</option>
                      <option value="🇲🇦 المغرب">🇲🇦 المغرب</option>
                    </select>
                  ) : currentEditType === 'socialStatus' ? (
                    <select value={editValue} onChange={(e) => setEditValue(e.target.value)}>
                      <option value="">اختر...</option>
                      <option value="أعزب">💚 أعزب</option>
                      <option value="متزوج">💍 متزوج</option>
                      <option value="مطلق">💔 مطلق</option>
                      <option value="أرمل">🖤 أرمل</option>
                    </select>
                  ) : (
                    <input
                      type={currentEditType === 'age' ? 'number' : 'text'}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      autoFocus
                    />
                  )}
                </div>
                <div className="edit-buttons">
                  <button className="save-btn" onClick={handleSaveEdit} disabled={isLoading}>
                    {isLoading ? 'جاري الحفظ...' : '💾 حفظ'}
                  </button>
                  <button className="cancel-btn" onClick={closeEditModal}>
                    ❌ إلغاء
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <PointsSentNotification
        show={pointsSentNotification.show}
        points={pointsSentNotification.points}
        recipientName={pointsSentNotification.recipientName}
        onClose={() => setPointsSentNotification({ show: false, points: 0, recipientName: '' })}
      />
    </>
  );
}