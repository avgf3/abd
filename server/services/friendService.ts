import { eq, desc, and, or } from "drizzle-orm";
import { db } from "../database-adapter";
import { friends, users, type Friend, type InsertFriend, type User } from "../../shared/schema";
import { notificationService } from "./notificationService";
import { pointsService } from "./pointsService";

export interface FriendRequestResult {
  success: boolean;
  error?: string;
  request?: any;
}

export interface FriendshipData {
  id: number;
  senderId: number;
  receiverId: number;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Date;
  sender?: any;
  receiver?: any;
}

export class FriendService {
  // إرسال طلب صداقة مع التحقق الشامل
  async sendFriendRequest(senderId: number, receiverId: number): Promise<FriendRequestResult> {
    try {
      // التحقق من صحة البيانات
      if (!senderId || !receiverId || senderId === receiverId) {
        return { success: false, error: 'بيانات غير صالحة' };
      }

      // التحقق من وجود المستخدمين
      const [sender, receiver] = await Promise.all([
        db.select().from(users).where(eq(users.id, senderId)).limit(1),
        db.select().from(users).where(eq(users.id, receiverId)).limit(1)
      ]);

      if (sender.length === 0) {
        return { success: false, error: 'المرسل غير موجود' };
      }

      if (receiver.length === 0) {
        return { success: false, error: 'المستقبل غير موجود' };
      }

      // التحقق من عدم وجود طلب مسبق
      const existingRequest = await this.getFriendship(senderId, receiverId);
      if (existingRequest) {
        const statusMessage = {
          'pending': 'طلب الصداقة معلق بالفعل',
          'accepted': 'أنتما أصدقاء بالفعل',
          'blocked': 'لا يمكن إرسال طلب صداقة'
        };
        return { success: false, error: statusMessage[existingRequest.status] || 'طلب موجود مسبقاً' };
      }

      // إنشاء طلب الصداقة
      const [newRequest] = await db
        .insert(friends)
        .values({
          userId: senderId,
          friendId: receiverId,
          status: 'pending'
        } as InsertFriend)
        .returning();

      // إرسال إشعار للمستقبل
      await notificationService.createNotification({
        userId: receiverId,
        type: 'friend_request',
        title: 'طلب صداقة جديد! 👥',
        message: `${sender[0].username} أرسل لك طلب صداقة`,
        data: {
          senderId,
          senderUsername: sender[0].username,
          requestId: newRequest.id
        }
      });

      return {
        success: true,
        request: {
          id: newRequest.id,
          senderId,
          receiverId,
          status: 'pending',
          createdAt: newRequest.createdAt,
          sender: {
            id: sender[0].id,
            username: sender[0].username,
            profileImage: sender[0].profileImage,
            userType: sender[0].userType,
            usernameColor: sender[0].usernameColor
          }
        }
      };

    } catch (error) {
      console.error('خطأ في إرسال طلب الصداقة:', error);
      return { success: false, error: 'خطأ في الخادم' };
    }
  }

  // قبول طلب صداقة
  async acceptFriendRequest(requestId: number, userId: number): Promise<FriendRequestResult> {
    try {
      // البحث عن طلب الصداقة
      const [request] = await db
        .select()
        .from(friends)
        .where(eq(friends.id, requestId))
        .limit(1);

      if (!request) {
        return { success: false, error: 'طلب الصداقة غير موجود' };
      }

      // التحقق من أن المستخدم هو المستقبل
      if (request.friendId !== userId) {
        return { success: false, error: 'ليس لديك صلاحية لقبول هذا الطلب' };
      }

      // التحقق من حالة الطلب
      if (request.status !== 'pending') {
        return { success: false, error: 'طلب الصداقة ليس معلقاً' };
      }

      // تحديث حالة الطلب
      await db
        .update(friends)
        .set({ status: 'accepted' })
        .where(eq(friends.id, requestId));

      // الحصول على بيانات المرسل والمستقبل
      const [sender, receiver] = await Promise.all([
        db.select().from(users).where(eq(users.id, request.userId)).limit(1),
        db.select().from(users).where(eq(users.id, request.friendId)).limit(1)
      ]);

      // إرسال إشعار للمرسل
      if (sender.length > 0) {
        await notificationService.createNotification({
          userId: request.userId,
          type: 'friend_accepted',
          title: 'تم قبول طلب الصداقة! 🎉',
          message: `${receiver[0]?.username || 'مستخدم'} قبل طلب صداقتك`,
          data: {
            friendId: userId,
            friendUsername: receiver[0]?.username
          }
        });

        // إضافة نقاط للمرسل
        await pointsService.addFriendPoints(request.userId);
      }

      // إضافة نقاط للمستقبل
      await pointsService.addFriendPoints(userId);

      // فحص إنجاز أول صديق
      await Promise.all([
        pointsService.checkAchievement(request.userId, 'FIRST_FRIEND'),
        pointsService.checkAchievement(userId, 'FIRST_FRIEND')
      ]);

      return { success: true };

    } catch (error) {
      console.error('خطأ في قبول طلب الصداقة:', error);
      return { success: false, error: 'خطأ في الخادم' };
    }
  }

  // رفض طلب صداقة
  async rejectFriendRequest(requestId: number, userId: number): Promise<FriendRequestResult> {
    try {
      // البحث عن طلب الصداقة
      const [request] = await db
        .select()
        .from(friends)
        .where(eq(friends.id, requestId))
        .limit(1);

      if (!request) {
        return { success: false, error: 'طلب الصداقة غير موجود' };
      }

      // التحقق من أن المستخدم هو المستقبل
      if (request.friendId !== userId) {
        return { success: false, error: 'ليس لديك صلاحية لرفض هذا الطلب' };
      }

      // التحقق من حالة الطلب
      if (request.status !== 'pending') {
        return { success: false, error: 'طلب الصداقة ليس معلقاً' };
      }

      // حذف طلب الصداقة
      await db
        .delete(friends)
        .where(eq(friends.id, requestId));

      return { success: true };

    } catch (error) {
      console.error('خطأ في رفض طلب الصداقة:', error);
      return { success: false, error: 'خطأ في الخادم' };
    }
  }

  // إلغاء طلب صداقة مرسل
  async cancelFriendRequest(requestId: number, userId: number): Promise<FriendRequestResult> {
    try {
      // البحث عن طلب الصداقة
      const [request] = await db
        .select()
        .from(friends)
        .where(eq(friends.id, requestId))
        .limit(1);

      if (!request) {
        return { success: false, error: 'طلب الصداقة غير موجود' };
      }

      // التحقق من أن المستخدم هو المرسل
      if (request.userId !== userId) {
        return { success: false, error: 'ليس لديك صلاحية لإلغاء هذا الطلب' };
      }

      // التحقق من حالة الطلب
      if (request.status !== 'pending') {
        return { success: false, error: 'طلب الصداقة ليس معلقاً' };
      }

      // حذف طلب الصداقة
      await db
        .delete(friends)
        .where(eq(friends.id, requestId));

      return { success: true };

    } catch (error) {
      console.error('خطأ في إلغاء طلب الصداقة:', error);
      return { success: false, error: 'خطأ في الخادم' };
    }
  }

  // إزالة صديق
  async removeFriend(userId: number, friendId: number): Promise<FriendRequestResult> {
    try {
      if (userId === friendId) {
        return { success: false, error: 'لا يمكنك إزالة نفسك' };
      }

      // البحث عن الصداقة
      const friendship = await this.getFriendship(userId, friendId);
      if (!friendship || friendship.status !== 'accepted') {
        return { success: false, error: 'لا توجد صداقة بينكما' };
      }

      // حذف الصداقة
      await db
        .delete(friends)
        .where(eq(friends.id, friendship.id));

      return { success: true };

    } catch (error) {
      console.error('خطأ في إزالة الصديق:', error);
      return { success: false, error: 'خطأ في الخادم' };
    }
  }

  // حظر مستخدم
  async blockUser(userId: number, targetId: number): Promise<FriendRequestResult> {
    try {
      if (userId === targetId) {
        return { success: false, error: 'لا يمكنك حظر نفسك' };
      }

      // البحث عن علاقة موجودة
      const existingRelation = await this.getFriendship(userId, targetId);
      
      if (existingRelation) {
        // تحديث العلاقة الموجودة إلى حظر
        await db
          .update(friends)
          .set({ status: 'blocked' })
          .where(eq(friends.id, existingRelation.id));
      } else {
        // إنشاء علاقة حظر جديدة
        await db
          .insert(friends)
          .values({
            userId,
            friendId: targetId,
            status: 'blocked'
          } as InsertFriend);
      }

      return { success: true };

    } catch (error) {
      console.error('خطأ في حظر المستخدم:', error);
      return { success: false, error: 'خطأ في الخادم' };
    }
  }

  // إلغاء حظر مستخدم
  async unblockUser(userId: number, targetId: number): Promise<FriendRequestResult> {
    try {
      // البحث عن علاقة الحظر
      const blockRelation = await this.getFriendship(userId, targetId);
      
      if (!blockRelation || blockRelation.status !== 'blocked') {
        return { success: false, error: 'المستخدم غير محظور' };
      }

      // حذف علاقة الحظر
      await db
        .delete(friends)
        .where(eq(friends.id, blockRelation.id));

      return { success: true };

    } catch (error) {
      console.error('خطأ في إلغاء حظر المستخدم:', error);
      return { success: false, error: 'خطأ في الخادم' };
    }
  }

  // الحصول على العلاقة بين مستخدمين
  async getFriendship(userId1: number, userId2: number): Promise<Friend | undefined> {
    try {
      const [friendship] = await db
        .select()
        .from(friends)
        .where(
          or(
            and(eq(friends.userId, userId1), eq(friends.friendId, userId2)),
            and(eq(friends.userId, userId2), eq(friends.friendId, userId1))
          )
        )
        .limit(1);

      return friendship;
    } catch (error) {
      console.error('خطأ في الحصول على العلاقة:', error);
      return undefined;
    }
  }

  // الحصول على قائمة أصدقاء المستخدم
  async getUserFriends(userId: number): Promise<any[]> {
    try {
      const friendsList = await db
        .select({
          id: friends.id,
          userId: friends.userId,
          friendId: friends.friendId,
          status: friends.status,
          createdAt: friends.createdAt,
          // بيانات الصديق
          friendUsername: users.username,
          friendProfileImage: users.profileImage,
          friendUserType: users.userType,
          friendUsernameColor: users.usernameColor,
          friendIsOnline: users.isOnline,
          friendLastSeen: users.lastSeen
        })
        .from(friends)
        .leftJoin(users, or(
          and(eq(friends.friendId, users.id), eq(friends.userId, userId)),
          and(eq(friends.userId, users.id), eq(friends.friendId, userId))
        ))
        .where(
          and(
            or(eq(friends.userId, userId), eq(friends.friendId, userId)),
            eq(friends.status, 'accepted')
          )
        )
        .orderBy(desc(users.isOnline), desc(friends.createdAt));

      return friendsList.map(friend => ({
        id: friend.id,
        friendshipDate: friend.createdAt,
        friend: {
          id: friend.userId === userId ? friend.friendId : friend.userId,
          username: friend.friendUsername,
          profileImage: friend.friendProfileImage,
          userType: friend.friendUserType,
          usernameColor: friend.friendUsernameColor,
          isOnline: friend.friendIsOnline,
          lastSeen: friend.friendLastSeen
        }
      }));

    } catch (error) {
      console.error('خطأ في جلب قائمة الأصدقاء:', error);
      return [];
    }
  }

  // الحصول على طلبات الصداقة الواردة
  async getIncomingFriendRequests(userId: number): Promise<any[]> {
    try {
      const incomingRequests = await db
        .select({
          id: friends.id,
          userId: friends.userId,
          friendId: friends.friendId,
          status: friends.status,
          createdAt: friends.createdAt,
          // بيانات المرسل
          senderUsername: users.username,
          senderProfileImage: users.profileImage,
          senderUserType: users.userType,
          senderUsernameColor: users.usernameColor,
          senderIsOnline: users.isOnline
        })
        .from(friends)
        .leftJoin(users, eq(friends.userId, users.id))
        .where(
          and(
            eq(friends.friendId, userId),
            eq(friends.status, 'pending')
          )
        )
        .orderBy(desc(friends.createdAt));

      return incomingRequests.map(req => ({
        id: req.id,
        senderId: req.userId,
        receiverId: req.friendId,
        status: req.status,
        createdAt: req.createdAt,
        sender: {
          id: req.userId,
          username: req.senderUsername,
          profileImage: req.senderProfileImage,
          userType: req.senderUserType,
          usernameColor: req.senderUsernameColor,
          isOnline: req.senderIsOnline
        }
      }));
    } catch (error) {
      console.error('خطأ في الحصول على طلبات الصداقة الواردة:', error);
      return [];
    }
  }

  // الحصول على طلبات الصداقة الصادرة
  async getOutgoingFriendRequests(userId: number): Promise<any[]> {
    try {
      const outgoingRequests = await db
        .select({
          id: friends.id,
          userId: friends.userId,
          friendId: friends.friendId,
          status: friends.status,
          createdAt: friends.createdAt,
          // بيانات المستقبل
          receiverUsername: users.username,
          receiverProfileImage: users.profileImage,
          receiverUserType: users.userType,
          receiverUsernameColor: users.usernameColor,
          receiverIsOnline: users.isOnline
        })
        .from(friends)
        .leftJoin(users, eq(friends.friendId, users.id))
        .where(
          and(
            eq(friends.userId, userId),
            eq(friends.status, 'pending')
          )
        )
        .orderBy(desc(friends.createdAt));

      return outgoingRequests.map(req => ({
        id: req.id,
        senderId: req.userId,
        receiverId: req.friendId,
        status: req.status,
        createdAt: req.createdAt,
        receiver: {
          id: req.friendId,
          username: req.receiverUsername,
          profileImage: req.receiverProfileImage,
          userType: req.receiverUserType,
          usernameColor: req.receiverUsernameColor,
          isOnline: req.receiverIsOnline
        }
      }));
    } catch (error) {
      console.error('خطأ في الحصول على طلبات الصداقة الصادرة:', error);
      return [];
    }
  }

  // الحصول على المستخدمين المحظورين
  async getBlockedUsers(userId: number): Promise<any[]> {
    try {
      const blockedUsers = await db
        .select({
          id: friends.id,
          blockedUserId: users.id,
          blockedUsername: users.username,
          blockedProfileImage: users.profileImage,
          blockedUserType: users.userType,
          blockedAt: friends.createdAt
        })
        .from(friends)
        .leftJoin(users, eq(friends.friendId, users.id))
        .where(
          and(
            eq(friends.userId, userId),
            eq(friends.status, 'blocked')
          )
        )
        .orderBy(desc(friends.createdAt));

      return blockedUsers.map(blocked => ({
        id: blocked.id,
        blockedAt: blocked.blockedAt,
        user: {
          id: blocked.blockedUserId,
          username: blocked.blockedUsername,
          profileImage: blocked.blockedProfileImage,
          userType: blocked.blockedUserType
        }
      }));

    } catch (error) {
      console.error('خطأ في جلب المستخدمين المحظورين:', error);
      return [];
    }
  }

  // التحقق من حالة الصداقة
  async getFriendshipStatus(userId: number, targetId: number): Promise<string> {
    try {
      if (userId === targetId) return 'self';

      const friendship = await this.getFriendship(userId, targetId);
      if (!friendship) return 'none';

      return friendship.status;
    } catch (error) {
      console.error('خطأ في فحص حالة الصداقة:', error);
      return 'none';
    }
  }

  // إحصائيات الأصدقاء
  async getFriendshipStatistics(userId: number) {
    try {
      const [friendsCount, incomingCount, outgoingCount, blockedCount] = await Promise.all([
        db.select().from(friends).where(
          and(
            or(eq(friends.userId, userId), eq(friends.friendId, userId)),
            eq(friends.status, 'accepted')
          )
        ),
        db.select().from(friends).where(
          and(eq(friends.friendId, userId), eq(friends.status, 'pending'))
        ),
        db.select().from(friends).where(
          and(eq(friends.userId, userId), eq(friends.status, 'pending'))
        ),
        db.select().from(friends).where(
          and(eq(friends.userId, userId), eq(friends.status, 'blocked'))
        )
      ]);

      return {
        friendsCount: friendsCount.length,
        incomingRequestsCount: incomingCount.length,
        outgoingRequestsCount: outgoingCount.length,
        blockedUsersCount: blockedCount.length
      };

    } catch (error) {
      console.error('خطأ في جلب إحصائيات الأصدقاء:', error);
      return {
        friendsCount: 0,
        incomingRequestsCount: 0,
        outgoingRequestsCount: 0,
        blockedUsersCount: 0
      };
    }
  }
}

export const friendService = new FriendService();