import { eq, desc, and, or } from "drizzle-orm";
import { db } from "../database-adapter";
import { friends, users, type Friend, type InsertFriend, type User } from "../../shared/schema";

export class FriendService {
  // إنشاء طلب صداقة
  async createFriendRequest(senderId: number, receiverId: number): Promise<Friend> {
    try {
      // التحقق من عدم وجود طلب مسبق
      const existingRequest = await this.getFriendship(senderId, receiverId);
      if (existingRequest) {
        throw new Error('طلب الصداقة موجود مسبقاً');
      }

      const [newRequest] = await db
        .insert(friends)
        .values({
          userId: senderId,
          friendId: receiverId,
          status: 'pending'
        })
        .returning();

      return newRequest;
    } catch (error) {
      console.error('خطأ في إنشاء طلب الصداقة:', error);
      throw error;
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

  // الحصول على طلب صداقة (بين مستخدمين) بحالة pending
  async getFriendRequest(senderId: number, receiverId: number): Promise<Friend | undefined> {
    try {
      const [request] = await db
        .select()
        .from(friends)
        .where(
          and(
            or(
              and(eq(friends.userId, senderId), eq(friends.friendId, receiverId)),
              and(eq(friends.userId, receiverId), eq(friends.friendId, senderId))
            ),
            eq(friends.status, 'pending')
          )
        )
        .limit(1);

      return request;
    } catch (error) {
      console.error('خطأ في الحصول على طلب الصداقة:', error);
      return undefined;
    }
  }

  // الحصول على طلب صداقة بواسطة المعرف
  async getFriendRequestById(requestId: number): Promise<Friend | undefined> {
    try {
      const [request] = await db
        .select()
        .from(friends)
        .where(eq(friends.id, requestId))
        .limit(1);

      return request;
    } catch (error) {
      console.error('خطأ في الحصول على طلب الصداقة بالمعرف:', error);
      return undefined;
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
          senderUsernameColor: users.usernameColor
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
        userId: req.userId,
        friendId: req.friendId,
        status: req.status,
        createdAt: req.createdAt,
        user: {
          id: req.userId,
          username: req.senderUsername,
          profileImage: req.senderProfileImage,
          userType: req.senderUserType,
          usernameColor: req.senderUsernameColor
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
          receiverUsernameColor: users.usernameColor
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
        userId: req.userId,
        friendId: req.friendId,
        status: req.status,
        createdAt: req.createdAt,
        user: {
          id: req.friendId,
          username: req.receiverUsername,
          profileImage: req.receiverProfileImage,
          userType: req.receiverUserType,
          usernameColor: req.receiverUsernameColor
        }
      }));
    } catch (error) {
      console.error('خطأ في الحصول على طلبات الصداقة الصادرة:', error);
      return [];
    }
  }

  // قبول طلب الصداقة
  async acceptFriendRequest(requestId: number): Promise<boolean> {
    try {
      const [updatedRequest] = await db
        .update(friends)
        .set({ status: 'accepted' })
        .where(eq(friends.id, requestId))
        .returning();

      return !!updatedRequest;
    } catch (error) {
      console.error('خطأ في قبول طلب الصداقة:', error);
      return false;
    }
  }

  // رفض طلب الصداقة
  async declineFriendRequest(requestId: number): Promise<boolean> {
    try {
      const [updatedRequest] = await db
        .update(friends)
        .set({ status: 'declined' })
        .where(eq(friends.id, requestId))
        .returning();

      return !!updatedRequest;
    } catch (error) {
      console.error('خطأ في رفض طلب الصداقة:', error);
      return false;
    }
  }

  // تجاهل طلب الصداقة
  async ignoreFriendRequest(requestId: number): Promise<boolean> {
    try {
      const [updatedRequest] = await db
        .update(friends)
        .set({ status: 'ignored' })
        .where(eq(friends.id, requestId))
        .returning();

      return !!updatedRequest;
    } catch (error) {
      console.error('خطأ في تجاهل طلب الصداقة:', error);
      return false;
    }
  }

  // حذف طلب الصداقة
  async deleteFriendRequest(requestId: number): Promise<boolean> {
    try {
      await db.delete(friends).where(eq(friends.id, requestId));
      return true;
    } catch (error) {
      console.error('خطأ في حذف طلب الصداقة:', error);
      return false;
    }
  }

  // الحصول على قائمة الأصدقاء
  async getFriends(userId: number): Promise<User[]> {
    try {
      const friendsList = await db
        .select({
          // بيانات الصديق
          id: users.id,
          username: users.username,
          userType: users.userType,
          profileImage: users.profileImage,
          profileBanner: users.profileBanner,
          profileBackgroundColor: users.profileBackgroundColor,
          status: users.status,
          gender: users.gender,
          age: users.age,
          country: users.country,
          relation: users.relation,
          bio: users.bio,
          isOnline: users.isOnline,
          isHidden: users.isHidden,
          lastSeen: users.lastSeen,
          joinDate: users.joinDate,
          createdAt: users.createdAt,
          usernameColor: users.usernameColor,
          userTheme: users.userTheme,
          // حقول أخرى مطلوبة
          role: users.role,
          isMuted: users.isMuted,
          isBanned: users.isBanned,
          isBlocked: users.isBlocked,
          ignoredUsers: users.ignoredUsers
        })
        .from(friends)
        .leftJoin(users, 
          or(
            and(eq(friends.userId, userId), eq(users.id, friends.friendId)),
            and(eq(friends.friendId, userId), eq(users.id, friends.userId))
          )
        )
        .where(
          and(
            or(eq(friends.userId, userId), eq(friends.friendId, userId)),
            eq(friends.status, 'accepted')
          )
        )
        .orderBy(desc(users.lastSeen));

      return friendsList as User[];
    } catch (error) {
      console.error('خطأ في الحصول على قائمة الأصدقاء:', error);
      return [];
    }
  }

  // إزالة صديق
  async removeFriend(userId: number, friendId: number): Promise<boolean> {
    try {
      await db
        .delete(friends)
        .where(
          or(
            and(eq(friends.userId, userId), eq(friends.friendId, friendId)),
            and(eq(friends.userId, friendId), eq(friends.friendId, userId))
          )
        );

      return true;
    } catch (error) {
      console.error('خطأ في إزالة الصديق:', error);
      return false;
    }
  }

  // حظر مستخدم
  async blockUser(userId: number, blockedUserId: number): Promise<boolean> {
    try {
      // حذف أي علاقة صداقة موجودة
      await this.removeFriend(userId, blockedUserId);

      // إنشاء علاقة حظر
      await db
        .insert(friends)
        .values({
          userId: userId,
          friendId: blockedUserId,
          status: 'blocked'
        });

      return true;
    } catch (error) {
      console.error('خطأ في حظر المستخدم:', error);
      return false;
    }
  }

  // إلغاء حظر مستخدم
  async unblockUser(userId: number, blockedUserId: number): Promise<boolean> {
    try {
      await db
        .delete(friends)
        .where(
          and(
            eq(friends.userId, userId),
            eq(friends.friendId, blockedUserId),
            eq(friends.status, 'blocked')
          )
        );

      return true;
    } catch (error) {
      console.error('خطأ في إلغاء حظر المستخدم:', error);
      return false;
    }
  }

  // الحصول على قائمة المستخدمين المحظورين
  async getBlockedUsers(userId: number): Promise<User[]> {
    try {
      const blockedUsers = await db
        .select({
          // بيانات المستخدم المحظور
          id: users.id,
          username: users.username,
          userType: users.userType,
          profileImage: users.profileImage,
          profileBanner: users.profileBanner,
          profileBackgroundColor: users.profileBackgroundColor,
          status: users.status,
          gender: users.gender,
          age: users.age,
          country: users.country,
          relation: users.relation,
          bio: users.bio,
          isOnline: users.isOnline,
          isHidden: users.isHidden,
          lastSeen: users.lastSeen,
          joinDate: users.joinDate,
          createdAt: users.createdAt,
          usernameColor: users.usernameColor,
          userTheme: users.userTheme,
          role: users.role,
          isMuted: users.isMuted,
          isBanned: users.isBanned,
          isBlocked: users.isBlocked,
          ignoredUsers: users.ignoredUsers
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

      return blockedUsers as User[];
    } catch (error) {
      console.error('خطأ في الحصول على قائمة المستخدمين المحظورين:', error);
      return [];
    }
  }

  // إضافة صداقة/تأكيدها بين مستخدمين
  async addFriend(userId: number, friendId: number): Promise<Friend> {
    const existing = await this.getFriendship(userId, friendId);
    if (existing) {
      if (existing.status !== 'accepted') {
        const [updated] = await db
          .update(friends)
          .set({ status: 'accepted' })
          .where(eq(friends.id, existing.id))
          .returning();
        return updated as Friend;
      }
      return existing;
    }

    const [created] = await db
      .insert(friends)
      .values({ userId, friendId, status: 'accepted' })
      .returning();
    return created as Friend;
  }
}

// إنشاء مثيل واحد من الخدمة
export const friendService = new FriendService();