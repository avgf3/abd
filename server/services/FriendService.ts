import type { IStorage } from '../storage';
import { NotificationService } from './NotificationService';

/**
 * خدمة إدارة الأصدقاء - منظمة ومحسنة
 */
export class FriendService {
  constructor(private storage: IStorage) {}
  
  /**
   * إرسال طلب صداقة مع التحقق والإشعارات
   */
  async sendFriendRequest(senderId: number, receiverId: number): Promise<{success: boolean, error?: string, request?: any}> {
    try {
      // التحقق من صحة المعطيات
      if (senderId === receiverId) {
        return { success: false, error: 'لا يمكنك إرسال طلب صداقة لنفسك' };
      }
      
      // التحقق من وجود المستخدمين
      const sender = await this.storage.getUser(senderId);
      const receiver = await this.storage.getUser(receiverId);
      
      if (!sender || !receiver) {
        return { success: false, error: 'المستخدم غير موجود' };
      }
      
      // التحقق من عدم وجود صداقة مسبقة
      const existingFriendship = await this.storage.getFriendship(senderId, receiverId);
      if (existingFriendship) {
        return { success: false, error: 'أنتما أصدقاء بالفعل' };
      }
      
      // التحقق من عدم وجود طلب مسبق
      const existingRequest = await this.storage.getFriendRequest(senderId, receiverId);
      if (existingRequest) {
        return { success: false, error: 'طلب الصداقة مرسل مسبقاً' };
      }
      
      // إنشاء طلب الصداقة
      const request = await this.storage.createFriendRequest(senderId, receiverId);
      
      // إرسال إشعار فوري للمستقبل
      const notification = await this.storage.createNotification({
        userId: receiverId,
        type: 'friend_request',
        title: 'طلب صداقة جديد 👫',
        message: `أرسل ${sender.username} طلب صداقة إليك`,
        data: { requestId: request.id, senderId, senderName: sender.username }
      });
      
      NotificationService.getInstance().sendNotification(receiverId, notification);
      
      return { success: true, request };
      
    } catch (error) {
      console.error('خطأ في إرسال طلب الصداقة:', error);
      return { success: false, error: 'حدث خطأ في إرسال طلب الصداقة' };
    }
  }
  
  /**
   * قبول طلب صداقة مع إشعارات
   */
  async acceptFriendRequest(requestId: number, userId: number): Promise<{success: boolean, error?: string}> {
    try {
      const request = await this.storage.getFriendRequestById(requestId);
      if (!request) {
        return { success: false, error: 'طلب الصداقة غير موجود' };
      }
      
      // التحقق من الصلاحية
      if (request.receiverId !== userId) {
        return { success: false, error: 'غير مسموح لك بقبول هذا الطلب' };
      }
      
      if (request.status !== 'pending') {
        return { success: false, error: 'تم التعامل مع هذا الطلب مسبقاً' };
      }
      
      // قبول الطلب
      await this.storage.acceptFriendRequest(requestId);
      
      // إضافة صداقة متبادلة
      await this.storage.addFriend(request.senderId, request.receiverId);
      await this.storage.addFriend(request.receiverId, request.senderId);
      
      // إشعار للمرسل بالقبول
      const notification = await this.storage.createNotification({
        userId: request.senderId,
        type: 'friend_accepted',
        title: 'تم قبول طلب الصداقة ✅',
        message: `قبل ${request.receiver?.username} طلب صداقتك`,
        data: { friendId: request.receiverId, friendName: request.receiver?.username }
      });
      
      NotificationService.getInstance().sendNotification(request.senderId, notification);
      
      return { success: true };
      
    } catch (error) {
      console.error('خطأ في قبول طلب الصداقة:', error);
      return { success: false, error: 'حدث خطأ في قبول طلب الصداقة' };
    }
  }
  
  /**
   * رفض طلب صداقة
   */
  async declineFriendRequest(requestId: number, userId: number): Promise<{success: boolean, error?: string}> {
    try {
      const request = await this.storage.getFriendRequestById(requestId);
      if (!request) {
        return { success: false, error: 'طلب الصداقة غير موجود' };
      }
      
      if (request.receiverId !== userId) {
        return { success: false, error: 'غير مسموح لك برفض هذا الطلب' };
      }
      
      await this.storage.declineFriendRequest(requestId);
      return { success: true };
      
    } catch (error) {
      console.error('خطأ في رفض طلب الصداقة:', error);
      return { success: false, error: 'حدث خطأ في رفض طلب الصداقة' };
    }
  }
  
  /**
   * إلغاء طلب صداقة مرسل
   */
  async cancelFriendRequest(requestId: number, userId: number): Promise<{success: boolean, error?: string}> {
    try {
      const request = await this.storage.getFriendRequestById(requestId);
      if (!request) {
        return { success: false, error: 'طلب الصداقة غير موجود' };
      }
      
      if (request.senderId !== userId) {
        return { success: false, error: 'غير مسموح لك بإلغاء هذا الطلب' };
      }
      
      await this.storage.deleteFriendRequest(requestId);
      return { success: true };
      
    } catch (error) {
      console.error('خطأ في إلغاء طلب الصداقة:', error);
      return { success: false, error: 'حدث خطأ في إلغاء طلب الصداقة' };
    }
  }
  
  /**
   * حذف صديق مع تأكيد
   */
  async removeFriend(userId: number, friendId: number): Promise<{success: boolean, error?: string}> {
    try {
      const friendship = await this.storage.getFriendship(userId, friendId);
      if (!friendship) {
        return { success: false, error: 'الصداقة غير موجودة' };
      }
      
      const success = await this.storage.removeFriend(userId, friendId);
      if (success) {
        // إشعار للطرف الآخر (اختياري)
        const friend = await this.storage.getUser(friendId);
        const user = await this.storage.getUser(userId);
        
        if (friend && user) {
          const notification = await this.storage.createNotification({
            userId: friendId,
            type: 'friend_removed',
            title: 'تم حذف صديق',
            message: `قام ${user.username} بحذفك من قائمة الأصدقاء`,
            data: { removedBy: userId }
          });
          
          NotificationService.getInstance().sendNotification(friendId, notification);
        }
        
        return { success: true };
      }
      
      return { success: false, error: 'فشل في حذف الصديق' };
      
    } catch (error) {
      console.error('خطأ في حذف الصديق:', error);
      return { success: false, error: 'حدث خطأ في حذف الصديق' };
    }
  }
}