// Re-export everything from services
export * from './services/databaseService';
export * from './services/userService';
export * from './services/pointsService';
export * from './services/notificationService';
export * from './services/friendService';
export * from './services/roomService';
export * from './services/roomMessageService';

// Legacy compatibility layer
import { databaseService } from './services/databaseService';
import { userService } from './services/userService';
import { pointsService } from './services/pointsService';
import { notificationService } from './services/notificationService';
import { friendService } from './services/friendService';

// Points functions (redirect to pointsService)
export const addPoints = pointsService.grantPoints.bind(pointsService);
export const deductPoints = pointsService.deductPoints.bind(pointsService);
export const getPointsHistory = pointsService.getPointsHistory.bind(pointsService);
export const getTopUsersByPoints = pointsService.getTopUsers.bind(pointsService);
export const getUserLevel = async (userId: number) => {
  const stats = await pointsService.getUserStats(userId);
  return stats?.level || 0;
};

// User functions (redirect to userService)
export const createUser = userService.createUser.bind(userService);
export const getUserById = userService.getUserById.bind(userService);
export const getUser = getUserById; // Alias for compatibility
export const updateUser = userService.updateUser.bind(userService);
export const deleteUser = userService.deleteUser.bind(userService);
export const getAllUsers = userService.getAllUsers.bind(userService);
export const validateUserCredentials = userService.validateCredentials.bind(userService);

// Database status
export const getDatabaseStatus = () => databaseService.getStatus();
export const getStats = async () => {
  const users = await userService.getAllUsers();
  const messages = await databaseService.getAllMessages();
  return {
    users: users.length,
    messages: messages.length,
  };
};

// Notifications (redirect to notificationService)
export const createNotification = notificationService.createNotification.bind(notificationService);
export const getUserNotifications = notificationService.getUserNotifications.bind(notificationService);
export const markNotificationAsRead = notificationService.markAsRead.bind(notificationService);

// Friends (redirect to friendService)
export const getFriends = friendService.getFriends.bind(friendService);
export const sendFriendRequest = friendService.sendFriendRequest.bind(friendService);
export const acceptFriendRequest = friendService.acceptFriendRequest.bind(friendService);
export const rejectFriendRequest = friendService.rejectFriendRequest.bind(friendService);
export const removeFriend = friendService.removeFriend.bind(friendService);

// Block functions
export const blockDevice = databaseService.blockDevice.bind(databaseService);
export const isDeviceBlocked = databaseService.isDeviceBlocked.bind(databaseService);
export const getAllBlockedDevices = databaseService.getAllBlockedDevices.bind(databaseService);
export const getBlockedDevices = getAllBlockedDevices; // Alias for compatibility
export const createBlockedDevice = blockDevice; // Alias for compatibility
export const deleteBlockedDevice = async (deviceId: string) => {
  // Implementation needed in databaseService
  throw new Error('deleteBlockedDevice not implemented');
};

// Message functions
export const getMessages = databaseService.getMessages.bind(databaseService);
export const createMessage = databaseService.createMessage.bind(databaseService);
export const deleteMessage = databaseService.deleteMessage.bind(databaseService);
export const getMessageCount = async () => {
  const messages = await databaseService.getAllMessages();
  return messages.length;
};

// Room functions
export const getRooms = databaseService.getRooms.bind(databaseService);
export const getRoom = databaseService.getRoom.bind(databaseService);
export const createRoom = databaseService.createRoom.bind(databaseService);
export const updateRoom = databaseService.updateRoom.bind(databaseService);
export const deleteRoom = databaseService.deleteRoom.bind(databaseService);

// Private messages
export const getPrivateMessages = databaseService.getPrivateMessages.bind(databaseService);
export const createPrivateMessage = databaseService.createPrivateMessage.bind(databaseService);
export const markPrivateMessagesAsRead = databaseService.markPrivateMessagesAsRead.bind(databaseService);

// The storage object for legacy compatibility
export const storage = {
  // Points
  addPoints,
  deductPoints,
  getPointsHistory,
  getTopUsersByPoints,
  getUserLevel,
  
  // Users
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  getAllUsers,
  validateUserCredentials,
  
  // Database
  getDatabaseStatus,
  getStats,
  
  // Notifications
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  
  // Friends
  getFriends,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  
  // Blocks
  blockDevice,
  isDeviceBlocked,
  getAllBlockedDevices,
  
  // Messages
  getMessages,
  createMessage,
  deleteMessage,
  getMessageCount,
  
  // Rooms
  getRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  
  // Private messages
  getPrivateMessages,
  createPrivateMessage,
  markPrivateMessagesAsRead,
};