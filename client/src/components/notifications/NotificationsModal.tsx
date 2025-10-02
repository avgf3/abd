import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Bell, MessageCircle, Heart, UserPlus, Gift, 
  AtSign, AlertCircle, Check, CheckCheck 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/queryClient';
import { getImageSrc } from '@/utils/imageUtils';
import ProfileFrame from '@/components/profile/ProfileFrame';

export interface Notification {
  id: number;
  userId: number;
  type: 'message' | 'like' | 'comment' | 'friend' | 'gift' | 'mention' | 'system';
  senderId?: number;
  senderUsername?: string;
  senderAvatar?: string;
  senderLevel?: number;
  content: string;
  data?: any; // بيانات إضافية
  isRead: boolean;
  createdAt: Date | string;
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: number;
}

export default function NotificationsModal({ 
  isOpen, 
  onClose,
  currentUserId 
}: NotificationsModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'all' | Notification['type']>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, activeTab]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = activeTab === 'all' ? {} : { type: activeTab };
      const response = await api.get('/api/notifications', { params });
      
      const notifData = Array.isArray(response.data) 
        ? response.data 
        : response.data?.notifications || [];
      
      setNotifications(notifData);
      setUnreadCount(notifData.filter((n: Notification) => !n.isRead).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast({
        title: 'خطأ',
        description: 'فشل تحميل الإشعارات',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      
      toast({
        title: 'تم',
        description: 'تم تعليم جميع الإشعارات كمقروءة'
      });
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast({
        title: 'خطأ',
        description: 'فشل تحديث الإشعارات',
        variant: 'destructive'
      });
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await api.delete(`/api/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      
      toast({
        title: 'تم الحذف',
        description: 'تم حذف الإشعار'
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast({
        title: 'خطأ',
        description: 'فشل حذف الإشعار',
        variant: 'destructive'
      });
    }
  };

  const getIcon = (type: Notification['type']) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'message': return <MessageCircle className={`${iconClass} text-blue-400`} />;
      case 'like': return <Heart className={`${iconClass} text-red-400`} />;
      case 'comment': return <MessageCircle className={`${iconClass} text-green-400`} />;
      case 'friend': return <UserPlus className={`${iconClass} text-purple-400`} />;
      case 'gift': return <Gift className={`${iconClass} text-pink-400`} />;
      case 'mention': return <AtSign className={`${iconClass} text-yellow-400`} />;
      case 'system': return <AlertCircle className={`${iconClass} text-orange-400`} />;
      default: return <Bell className={`${iconClass} text-gray-400`} />;
    }
  };

  const getCount = (type: 'all' | Notification['type']) => {
    if (type === 'all') return notifications.length;
    return notifications.filter(n => n.type === type).length;
  };

  const getTypeLabel = (type: Notification['type']) => {
    switch (type) {
      case 'message': return 'رسائل';
      case 'like': return 'إعجابات';
      case 'comment': return 'تعليقات';
      case 'friend': return 'صداقة';
      case 'gift': return 'هدايا';
      case 'mention': return 'إشارات';
      case 'system': return 'النظام';
      default: return '';
    }
  };

  const filteredNotifications = activeTab === 'all'
    ? notifications
    : notifications.filter(n => n.type === activeTab);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-3xl mx-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900/50">
            <div className="flex items-center gap-3">
              <Bell className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-bold text-white">الإشعارات</h2>
              {unreadCount > 0 && (
                <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-3 py-1.5 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded-lg transition-all flex items-center gap-1"
                >
                  <CheckCheck className="w-4 h-4" />
                  تعليم الكل
                </button>
              )}
              
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 p-3 border-b border-gray-700 overflow-x-auto bg-gray-900/30">
            <TabButton
              active={activeTab === 'all'}
              onClick={() => setActiveTab('all')}
              icon={<Bell className="w-4 h-4" />}
              count={getCount('all')}
            >
              الكل
            </TabButton>
            
            <TabButton
              active={activeTab === 'message'}
              onClick={() => setActiveTab('message')}
              icon={<MessageCircle className="w-4 h-4" />}
              count={getCount('message')}
            >
              رسائل
            </TabButton>
            
            <TabButton
              active={activeTab === 'like'}
              onClick={() => setActiveTab('like')}
              icon={<Heart className="w-4 h-4" />}
              count={getCount('like')}
            >
              إعجابات
            </TabButton>
            
            <TabButton
              active={activeTab === 'comment'}
              onClick={() => setActiveTab('comment')}
              icon={<MessageCircle className="w-4 h-4" />}
              count={getCount('comment')}
            >
              تعليقات
            </TabButton>
            
            <TabButton
              active={activeTab === 'friend'}
              onClick={() => setActiveTab('friend')}
              icon={<UserPlus className="w-4 h-4" />}
              count={getCount('friend')}
            >
              صداقة
            </TabButton>
            
            <TabButton
              active={activeTab === 'gift'}
              onClick={() => setActiveTab('gift')}
              icon={<Gift className="w-4 h-4" />}
              count={getCount('gift')}
            >
              هدايا
            </TabButton>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Bell className="w-16 h-16 mb-3 opacity-30" />
                <p className="text-lg">لا توجد إشعارات</p>
                <p className="text-sm mt-1">ستظهر هنا جميع إشعاراتك</p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {filteredNotifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex gap-3 p-4 rounded-lg transition-all cursor-pointer group relative ${
                        notification.isRead
                          ? 'bg-gray-800/30 hover:bg-gray-800/50'
                          : 'bg-blue-900/20 hover:bg-blue-900/30 border-r-4 border-blue-500'
                      }`}
                      onClick={() => !notification.isRead && markAsRead(notification.id)}
                    >
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {getIcon(notification.type)}
                      </div>

                      {/* Avatar (إذا كان من مستخدم) */}
                      {notification.senderId && (
                        <div className="flex-shrink-0">
                          <ProfileFrame 
                            level={notification.senderLevel || 0} 
                            size="small"
                            showBadge={false}
                          >
                            <img
                              src={getImageSrc(notification.senderAvatar || '/default_avatar.svg')}
                              alt={notification.senderUsername}
                              className="w-full h-full object-cover"
                            />
                          </ProfileFrame>
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 leading-relaxed">
                          {notification.senderUsername && (
                            <span className="font-semibold text-white">
                              {notification.senderUsername}
                            </span>
                          )}
                          {' '}
                          {notification.content}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-gray-400">
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                          
                          {!notification.isRead && (
                            <span className="text-xs text-blue-400 font-medium">
                              • جديد
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Unread indicator */}
                      {!notification.isRead && (
                        <div className="flex-shrink-0 flex items-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        </div>
                      )}

                      {/* Delete button (on hover) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="absolute top-2 left-2 p-1 bg-red-500/80 hover:bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className="p-4 border-t border-gray-700 bg-gray-900/50 text-center">
              <button
                onClick={() => {
                  // حذف جميع الإشعارات المقروءة
                  const readIds = notifications.filter(n => n.isRead).map(n => n.id);
                  if (readIds.length === 0) {
                    toast({
                      title: 'تنبيه',
                      description: 'لا توجد إشعارات مقروءة للحذف'
                    });
                    return;
                  }
                  
                  if (window.confirm(`هل تريد حذف ${readIds.length} إشعار مقروء؟`)) {
                    Promise.all(readIds.map(id => api.delete(`/api/notifications/${id}`)))
                      .then(() => {
                        setNotifications(prev => prev.filter(n => !n.isRead));
                        toast({
                          title: 'تم',
                          description: 'تم حذف الإشعارات المقروءة'
                        });
                      })
                      .catch(() => {
                        toast({
                          title: 'خطأ',
                          description: 'فشل حذف بعض الإشعارات',
                          variant: 'destructive'
                        });
                      });
                  }
                }}
                className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
              >
                حذف الإشعارات المقروءة
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Tab Button Component
function TabButton({
  active,
  onClick,
  icon,
  count,
  children
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
        active
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
          : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
      }`}
    >
      {icon}
      <span>{children}</span>
      {count > 0 && (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
          active ? 'bg-white/20' : 'bg-gray-600'
        }`}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const notifDate = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((now.getTime() - notifDate.getTime()) / 1000);
  
  if (seconds < 10) return 'الآن';
  if (seconds < 60) return `منذ ${seconds} ث`;
  if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} د`;
  if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} س`;
  if (seconds < 604800) return `منذ ${Math.floor(seconds / 86400)} يوم`;
  if (seconds < 2592000) return `منذ ${Math.floor(seconds / 604800)} أسبوع`;
  if (seconds < 31536000) return `منذ ${Math.floor(seconds / 2592000)} شهر`;
  return new Date(notifDate).toLocaleDateString('ar');
}
