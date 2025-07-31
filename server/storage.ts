import { db } from './database-adapter';
import { users, messages, friends, notifications, blockedDevices, pointsHistory, levelSettings, rooms, roomUsers, wallPosts, wallReactions } from '../shared/schema';
import { eq, desc, and, or, sql } from 'drizzle-orm';
import type { InsertUser, InsertMessage, InsertFriend, InsertNotification, InsertBlockedDevice, InsertPointsHistory, InsertLevelSettings, InsertRoom, InsertRoomUser, InsertWallPost, InsertWallReaction } from '../shared/schema';
import type { ChatUser, ChatMessage, FriendRequest, Notification, WallPost, WallReaction, ChatRoom } from '../client/src/types/chat';

// Helper function to check if database is connected
function checkDatabase(): void {
  if (!db) {
    throw new Error('Database is not connected');
  }
}

// User operations
export async function getUserById(id: number): Promise<ChatUser | null> {
  try {
    checkDatabase();
    const result = await db!.select().from(users).where(eq(users.id, id));
    return result[0] as ChatUser || null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

export async function getUserByUsername(username: string): Promise<ChatUser | null> {
  try {
    checkDatabase();
    const result = await db!.select().from(users).where(eq(users.username, username));
    return result[0] as ChatUser || null;
  } catch (error) {
    console.error('Error getting user by username:', error);
    return null;
  }
}

export async function createUser(user: InsertUser): Promise<ChatUser | null> {
  try {
    checkDatabase();
    const result = await db!.insert(users).values(user).returning();
    return result[0] as ChatUser || null;
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
}

export async function updateUser(id: number, updates: Partial<InsertUser>): Promise<ChatUser | null> {
  try {
    checkDatabase();
    const result = await db!.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return result[0] as ChatUser || null;
  } catch (error) {
    console.error('Error updating user:', error);
    return null;
  }
}

export async function updateUserOnlineStatus(id: number, isOnline: boolean): Promise<void> {
  try {
    checkDatabase();
    await db!.update(users)
      .set({ 
        isOnline, 
        lastSeen: isOnline ? new Date() : new Date() 
      })
      .where(eq(users.id, id));
  } catch (error) {
    console.error('Error updating user online status:', error);
  }
}

export async function updateUserLastSeen(id: number): Promise<void> {
  try {
    checkDatabase();
    await db!.update(users)
      .set({ lastSeen: new Date() })
      .where(eq(users.id, id));
  } catch (error) {
    console.error('Error updating user last seen:', error);
  }
}

export async function getOnlineUsers(): Promise<ChatUser[]> {
  try {
    checkDatabase();
    return await db!.select().from(users).where(eq(users.isOnline, true));
  } catch (error) {
    console.error('Error getting online users:', error);
    return [];
  }
}

export async function getAllUsers(): Promise<ChatUser[]> {
  try {
    checkDatabase();
    return await db!.select().from(users).orderBy(desc(users.createdAt));
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
}

// Message operations
export async function createMessage(message: InsertMessage): Promise<ChatMessage | null> {
  try {
    checkDatabase();
    const result = await db!.insert(messages).values(message).returning();
    return result[0] as ChatMessage || null;
  } catch (error) {
    console.error('Error creating message:', error);
    return null;
  }
}

export async function getPublicMessages(): Promise<ChatMessage[]> {
  try {
    checkDatabase();
    return await db!.select()
      .from(messages)
      .where(eq(messages.isPrivate, false))
      .orderBy(desc(messages.timestamp));
  } catch (error) {
    console.error('Error getting public messages:', error);
    return [];
  }
}

export async function getPrivateMessages(userId: number): Promise<ChatMessage[]> {
  try {
    checkDatabase();
    return await db!.select()
      .from(messages)
      .where(
        and(
          eq(messages.isPrivate, true),
          or(
            eq(messages.senderId, userId),
            eq(messages.receiverId, userId)
          )
        )
      )
      .orderBy(desc(messages.timestamp));
  } catch (error) {
    console.error('Error getting private messages:', error);
    return [];
  }
}

export async function getMessagesByRoom(roomId: string): Promise<ChatMessage[]> {
  try {
    checkDatabase();
    return await db!.select()
      .from(messages)
      .where(eq(messages.roomId, roomId))
      .orderBy(desc(messages.timestamp));
  } catch (error) {
    console.error('Error getting messages by room:', error);
    return [];
  }
}

// Friend operations
export async function createFriendRequest(request: InsertFriend): Promise<FriendRequest | null> {
  try {
    checkDatabase();
    const result = await db!.insert(friends).values({
      userId: request.userId,
      friendId: request.friendId,
      status: 'pending'
    }).returning();
    return result[0] as FriendRequest || null;
  } catch (error) {
    console.error('Error creating friend request:', error);
    return null;
  }
}

export async function getFriendRequests(userId: number): Promise<FriendRequest[]> {
  try {
    checkDatabase();
    const friendsResult = await db!.select()
      .from(friends)
      .where(
        and(
          eq(friends.friendId, userId),
          eq(friends.status, 'pending')
        )
      );
    return friendsResult as FriendRequest[];
  } catch (error) {
    console.error('Error getting friend requests:', error);
    return [];
  }
}

export async function getFriends(userId: number): Promise<FriendRequest[]> {
  try {
    checkDatabase();
    const friendsResult = await db!.select()
      .from(friends)
      .where(
        and(
          or(
            eq(friends.userId, userId),
            eq(friends.friendId, userId)
          ),
          eq(friends.status, 'accepted')
        )
      );
    return friendsResult as FriendRequest[];
  } catch (error) {
    console.error('Error getting friends:', error);
    return [];
  }
}

export async function updateFriendRequestStatus(requestId: number, status: string): Promise<void> {
  try {
    checkDatabase();
    await db!.update(friends)
      .set({ status })
      .where(eq(friends.id, requestId));
  } catch (error) {
    console.error('Error updating friend request status:', error);
  }
}

export async function getBlockedUsers(userId: number): Promise<number[]> {
  try {
    checkDatabase();
    const blockedResult = await db!.select()
      .from(friends)
      .where(
        and(
          eq(friends.userId, userId),
          eq(friends.status, 'blocked')
        )
      );
    return blockedResult.map(f => f.friendId);
  } catch (error) {
    console.error('Error getting blocked users:', error);
    return [];
  }
}

export async function deleteFriendRequest(requestId: number): Promise<void> {
  try {
    checkDatabase();
    const result = await db!.delete(friends)
      .where(eq(friends.id, requestId))
      .returning();
    console.log('Deleted friend request:', result);
  } catch (error) {
    console.error('Error deleting friend request:', error);
  }
}

export async function checkFriendshipStatus(userId: number, friendId: number): Promise<string | null> {
  try {
    checkDatabase();
    const result = await db!.select()
      .from(friends)
      .where(
        or(
          and(eq(friends.userId, userId), eq(friends.friendId, friendId)),
          and(eq(friends.userId, friendId), eq(friends.friendId, userId))
        )
      );
    return result[0]?.status || null;
  } catch (error) {
    console.error('Error checking friendship status:', error);
    return null;
  }
}

export async function sendFriendRequest(senderId: number, receiverId: number): Promise<FriendRequest | null> {
  try {
    checkDatabase();
    const result = await db!.insert(friends).values({
      userId: senderId,
      friendId: receiverId,
      status: 'pending'
    }).returning();
    return result[0] as FriendRequest || null;
  } catch (error) {
    console.error('Error sending friend request:', error);
    return null;
  }
}

export async function acceptFriendRequest(requestId: number): Promise<void> {
  try {
    checkDatabase();
    const result = await db!.update(friends)
      .set({ status: 'accepted' })
      .where(eq(friends.id, requestId))
      .returning();
    console.log('Accepted friend request:', result);
  } catch (error) {
    console.error('Error accepting friend request:', error);
  }
}

export async function declineFriendRequest(requestId: number): Promise<void> {
  try {
    checkDatabase();
    const result = await db!.update(friends)
      .set({ status: 'rejected' })
      .where(eq(friends.id, requestId))
      .returning();
    console.log('Declined friend request:', result);
  } catch (error) {
    console.error('Error declining friend request:', error);
  }
}

export async function blockUser(userId: number, blockedUserId: number): Promise<void> {
  try {
    checkDatabase();
    const result = await db!.update(friends)
      .set({ status: 'blocked' })
      .where(
        and(
          eq(friends.userId, userId),
          eq(friends.friendId, blockedUserId)
        )
      )
      .returning();
    console.log('Blocked user:', result);
  } catch (error) {
    console.error('Error blocking user:', error);
  }
}

// Wall posts operations
export async function createWallPost(postData: { content: string; userId: number; type?: string; imageUrl?: string }): Promise<WallPost | null> {
  try {
    checkDatabase();
    const [post] = await db!.insert(wallPosts)
      .values({
        content: postData.content,
        userId: postData.userId,
        type: postData.type || 'public',
        imageUrl: postData.imageUrl || null
      })
      .returning();

    if (!post) return null;

    // Get user info for the post
    const user = await getUserById(postData.userId);
    
    return {
      id: post.id,
      userId: post.userId,
      content: post.content,
      imageUrl: post.imageUrl,
      type: post.type as 'friends' | 'public',
      timestamp: post.createdAt || new Date(),
      reactions: [],
      totalLikes: 0,
      totalDislikes: 0,
      totalHearts: 0,
      userProfileImage: user?.profileImage,
      usernameColor: user?.usernameColor || '#FFFFFF'
    };
  } catch (error) {
    console.error('Error creating wall post:', error);
    return null;
  }
}

export async function getWallPosts(type: 'public' | 'friends' = 'public'): Promise<WallPost[]> {
  try {
    checkDatabase();
    const posts = await db!.select()
      .from(wallPosts)
      .where(eq(wallPosts.type, type))
      .orderBy(desc(wallPosts.createdAt));

    return posts.map(post => ({
      id: post.id,
      userId: post.userId,
      content: post.content,
      imageUrl: post.imageUrl,
      type: post.type as 'friends' | 'public',
      timestamp: post.createdAt || new Date(),
      reactions: [],
      totalLikes: 0,
      totalDislikes: 0,
      totalHearts: 0
    }));
  } catch (error) {
    console.error('Error getting wall posts:', error);
    return [];
  }
}

export async function getWallPostsByUser(userId: number): Promise<WallPost[]> {
  try {
    checkDatabase();
    const posts = await db!.select()
      .from(wallPosts)
      .where(eq(wallPosts.userId, userId))
      .orderBy(desc(wallPosts.createdAt));

    return posts.map(post => ({
      id: post.id,
      userId: post.userId,
      content: post.content,
      imageUrl: post.imageUrl,
      type: post.type as 'friends' | 'public',
      timestamp: post.createdAt || new Date(),
      reactions: [],
      totalLikes: 0,
      totalDislikes: 0,
      totalHearts: 0
    }));
  } catch (error) {
    console.error('Error getting wall posts by user:', error);
    return [];
  }
}

export async function deleteWallPost(postId: number): Promise<void> {
  try {
    checkDatabase();
    // Delete reactions first
    await db!.delete(wallReactions)
      .where(eq(wallReactions.postId, postId));
    
    // Delete the post
    await db!.delete(wallPosts)
      .where(eq(wallPosts.id, postId));
  } catch (error) {
    console.error('Error deleting wall post:', error);
  }
}

export async function addWallPostReaction(reactionData: { postId: number; userId: number; type: string }): Promise<void> {
  try {
    checkDatabase();
    // Delete existing reaction by this user
    await db!.delete(wallReactions)
      .where(
        and(
          eq(wallReactions.postId, reactionData.postId),
          eq(wallReactions.userId, reactionData.userId)
        )
      );

    // Add new reaction
    await db!.insert(wallReactions)
      .values({
        postId: reactionData.postId,
        userId: reactionData.userId,
        type: reactionData.type
      });

    // Update post reaction counts
    const reactions = await db!.select()
      .from(wallReactions)
      .where(eq(wallReactions.postId, reactionData.postId));

    const totalLikes = reactions.filter(r => r.type === 'like').length;
    const totalDislikes = reactions.filter(r => r.type === 'dislike').length;
    const totalHearts = reactions.filter(r => r.type === 'heart').length;

    await db!.update(wallPosts)
      .set({
        // Note: These fields don't exist in the schema, so we'll skip this for now
        // totalLikes,
        // totalDislikes,
        // totalHearts
      })
      .where(eq(wallPosts.id, reactionData.postId));
  } catch (error) {
    console.error('Error adding wall post reaction:', error);
  }
}

export async function getWallPostReactions(postId: number): Promise<WallReaction[]> {
  try {
    checkDatabase();
    const reactions = await db!.select()
      .from(wallReactions)
      .where(eq(wallReactions.postId, postId))
      .orderBy(desc(wallReactions.createdAt));

    return reactions.map(reaction => ({
      id: reaction.id,
      postId: reaction.postId,
      userId: reaction.userId,
      type: reaction.type as 'like' | 'dislike' | 'heart',
      timestamp: reaction.createdAt || new Date()
    }));
  } catch (error) {
    console.error('Error getting wall post reactions:', error);
    return [];
  }
}

export async function getWallPostReactionsByUser(userId: number): Promise<WallReaction[]> {
  try {
    checkDatabase();
    const reactions = await db!.select()
      .from(wallReactions)
      .where(eq(wallReactions.userId, userId))
      .orderBy(desc(wallReactions.createdAt));

    return reactions.map(reaction => ({
      id: reaction.id,
      postId: reaction.postId,
      userId: reaction.userId,
      type: reaction.type as 'like' | 'dislike' | 'heart',
      timestamp: reaction.createdAt || new Date()
    }));
  } catch (error) {
    console.error('Error getting wall post reactions by user:', error);
    return [];
  }
}

// Room operations
export async function getRoomById(roomId: string): Promise<ChatRoom | null> {
  try {
    checkDatabase();
    const result = await db!.select().from(rooms).where(eq(rooms.id, roomId));
    
    if (!result[0]) return null;

    const room = result[0];
    return {
      id: room.id,
      name: room.name,
      description: room.description,
      isDefault: room.id === 'general',
      createdBy: room.ownerId || 0,
      createdAt: room.createdAt || new Date(),
      isActive: true,
      userCount: room.currentUsers || 0,
      maxUsers: room.maxUsers,
      type: room.type as 'public' | 'private' | 'broadcast',
      isBroadcast: room.type === 'broadcast',
      hostId: room.ownerId,
      speakers: [],
      micQueue: []
    };
  } catch (error) {
    console.error('Error getting room by ID:', error);
    return null;
  }
}

export async function getAllRooms(): Promise<ChatRoom[]> {
  try {
    checkDatabase();
    const result = await db!.select({
      id: rooms.id,
      name: rooms.name,
      description: rooms.description,
      type: rooms.type,
      ownerId: rooms.ownerId,
      maxUsers: rooms.maxUsers,
      currentUsers: rooms.currentUsers,
      createdAt: rooms.createdAt,
      updatedAt: rooms.updatedAt,
      settings: rooms.settings
    })
    .from(rooms)
    .where(eq(rooms.type, 'public'))
    .orderBy(desc(rooms.createdAt));

    return result.map(room => ({
      id: room.id,
      name: room.name,
      description: room.description,
      isDefault: room.id === 'general',
      createdBy: room.ownerId || 0,
      createdAt: room.createdAt || new Date(),
      isActive: true,
      userCount: room.currentUsers || 0,
      maxUsers: room.maxUsers,
      type: room.type as 'public' | 'private' | 'broadcast',
      isBroadcast: room.type === 'broadcast',
      hostId: room.ownerId,
      speakers: [],
      micQueue: []
    }));
  } catch (error) {
    console.error('Error getting all rooms:', error);
    return [];
  }
}

export async function createRoom(roomData: { id: string; name: string; description?: string; ownerId: number; type?: string }): Promise<ChatRoom | null> {
  try {
    checkDatabase();
    const result = await db!.insert(rooms).values({
      id: roomData.id,
      name: roomData.name,
      description: roomData.description,
      type: roomData.type || 'public',
      ownerId: roomData.ownerId,
      currentUsers: 0,
      isPasswordProtected: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {}
    }).returning();

    if (!result[0]) return null;

    const room = result[0];
    return {
      id: room.id,
      name: room.name,
      description: room.description,
      isDefault: room.id === 'general',
      createdBy: room.ownerId || 0,
      createdAt: room.createdAt || new Date(),
      isActive: true,
      userCount: room.currentUsers || 0,
      maxUsers: room.maxUsers,
      type: room.type as 'public' | 'private' | 'broadcast',
      isBroadcast: room.type === 'broadcast',
      hostId: room.ownerId,
      speakers: [],
      micQueue: []
    };
  } catch (error) {
    console.error('Error creating room:', error);
    return null;
  }
}

export async function deleteRoom(roomId: string): Promise<void> {
  try {
    checkDatabase();
    // Delete room users first
    await db!.delete(roomUsers).where(eq(roomUsers.roomId, roomId));
    
    // Delete the room
    await db!.delete(rooms).where(eq(rooms.id, roomId));
  } catch (error) {
    console.error('Error deleting room:', error);
  }
}

export async function joinRoom(userId: number, roomId: string): Promise<void> {
  try {
    checkDatabase();
    const existing = await db!.select()
      .from(roomUsers)
      .where(
        and(
          eq(roomUsers.userId, userId),
          eq(roomUsers.roomId, roomId)
        )
      );

    if (existing.length === 0) {
      await db!.insert(roomUsers).values({
        userId,
        roomId,
        permission: 'view',
        joinedAt: new Date(),
        isMuted: false
      });
    }
  } catch (error) {
    console.error('Error joining room:', error);
  }
}

export async function leaveRoom(userId: number, roomId: string): Promise<void> {
  try {
    checkDatabase();
    await db!.delete(roomUsers)
      .where(
        and(
          eq(roomUsers.userId, userId),
          eq(roomUsers.roomId, roomId)
        )
      );
  } catch (error) {
    console.error('Error leaving room:', error);
  }
}

export async function getRoomUsers(roomId: string): Promise<number[]> {
  try {
    checkDatabase();
    const result = await db!.select({ userId: roomUsers.userId })
      .from(roomUsers)
      .where(eq(roomUsers.roomId, roomId));
    
    return result.map(r => r.userId);
  } catch (error) {
    console.error('Error getting room users:', error);
    return [];
  }
}

export async function getUserRooms(userId: number): Promise<string[]> {
  try {
    checkDatabase();
    const result = await db!.select({ roomId: roomUsers.roomId })
      .from(roomUsers)
      .where(eq(roomUsers.userId, userId));
    
    return result.map(r => r.roomId);
  } catch (error) {
    console.error('Error getting user rooms:', error);
    return [];
  }
}

// Notification operations
export async function createNotification(notification: InsertNotification): Promise<Notification | null> {
  try {
    checkDatabase();
    const result = await db!.insert(notifications).values(notification).returning();
    return result[0] as Notification || null;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

export async function getUserNotifications(userId: number): Promise<Notification[]> {
  try {
    checkDatabase();
    return await db!.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  } catch (error) {
    console.error('Error getting user notifications:', error);
    return [];
  }
}

export async function markNotificationAsRead(notificationId: number): Promise<void> {
  try {
    checkDatabase();
    await db!.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.id, notificationId));
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

export async function markAllNotificationsAsRead(userId: number): Promise<void> {
  try {
    checkDatabase();
    await db!.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.userId, userId));
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
}

export async function deleteNotification(notificationId: number): Promise<void> {
  try {
    checkDatabase();
    await db!.delete(notifications).where(eq(notifications.id, notificationId));
  } catch (error) {
    console.error('Error deleting notification:', error);
  }
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  try {
    checkDatabase();
    const result = await db!.select({ count: sql`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );
    return Number(result[0]?.count || 0);
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return 0;
  }
}

// Blocked devices operations
export async function blockDevice(blockData: InsertBlockedDevice): Promise<void> {
  try {
    checkDatabase();
    await db!.insert(blockedDevices).values(blockData);
  } catch (error) {
    console.error('Error blocking device:', error);
  }
}

export async function getBlockedDevices(): Promise<any[]> {
  try {
    checkDatabase();
    return await db!.select()
      .from(blockedDevices)
      .orderBy(desc(blockedDevices.blockedAt));
  } catch (error) {
    console.error('Error getting blocked devices:', error);
    return [];
  }
}

export async function isDeviceBlocked(ipAddress: string, deviceId: string): Promise<boolean> {
  try {
    checkDatabase();
    const result = await db!.select({
      id: blockedDevices.id
    })
    .from(blockedDevices)
    .where(
      and(
        eq(blockedDevices.ipAddress, ipAddress),
        eq(blockedDevices.deviceId, deviceId)
      )
    );
    return result.length > 0;
  } catch (error) {
    console.error('Error checking if device is blocked:', error);
    return false;
  }
}