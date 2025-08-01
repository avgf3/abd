import { Router, Request, Response } from 'express';
import { enhancedRoomService } from '../services/EnhancedRoomService';
import { chatService } from '../services/ChatService';
import { storage } from '../storage';
import { databaseExportImportService } from '../services/DatabaseExportImportService';
import { databaseHealthCheckService } from '../services/DatabaseHealthCheckService';
import {
  authenticateUser,
  requireUserType,
  requireRoomPermission,
  validateCreateRoom,
  validateUpdateRoom,
  validateRoomId,
  validateJoinRoom,
  roomRateLimit,
  checkRoomExists,
  handleRoomError
} from '../middleware/RoomMiddleware';

const router = Router();

// Extend Request interface for TypeScript
interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    userType: string;
    role: string;
  };
  room?: any;
}

// Apply global middleware
router.use(authenticateUser);

// ==================== ROOM MANAGEMENT ====================

// GET /api/enhanced-rooms - Get all rooms with advanced filtering
router.get('/', 
  roomRateLimit(30, 60000), // 30 requests per minute
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        includeInactive = 'false',
        category,
        isBroadcast,
        isPrivate,
        maxUsers,
        tags,
        createdBy,
        isActive,
        search,
        sortBy = 'createdAt',
        sortOrder = 'asc',
        limit = '50',
        offset = '0'
      } = req.query;

      const filters = {
        category: category as string,
        isBroadcast: isBroadcast === 'true',
        isPrivate: isPrivate === 'true',
        maxUsers: maxUsers ? parseInt(maxUsers as string) : undefined,
        tags: tags ? (tags as string).split(',') : undefined,
        createdBy: createdBy ? parseInt(createdBy as string) : undefined,
        isActive: isActive === 'true',
      };

      let rooms;
      if (search) {
        rooms = await enhancedRoomService.searchRooms(search as string, filters);
      } else {
        rooms = await enhancedRoomService.getAllRooms(filters, includeInactive === 'true');
      }

      // Filter rooms based on user permissions
      const filteredRooms = rooms.filter(room => {
        if (room.isActive) return true;
        if (req.user?.userType === 'admin' || req.user?.userType === 'owner') return true;
        if (room.createdBy === req.user?.id) return true;
        return false;
      });

      // Sort rooms
      const sortKey = sortBy as keyof typeof filteredRooms[0];
      filteredRooms.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        return 0;
      });

      // Pagination
      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);
      const paginatedRooms = filteredRooms.slice(offsetNum, offsetNum + limitNum);

      res.json({
        success: true,
        data: paginatedRooms,
        pagination: {
          total: filteredRooms.length,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < filteredRooms.length,
          totalPages: Math.ceil(filteredRooms.length / limitNum)
        },
        message: 'Rooms retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting rooms:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve rooms',
        message: 'An error occurred while fetching rooms'
      });
    }
  }
);

// GET /api/enhanced-rooms/popular - Get popular rooms
router.get('/popular',
  roomRateLimit(20, 60000),
  async (req: AuthRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const rooms = await enhancedRoomService.getPopularRooms(limit);

      res.json({
        success: true,
        data: rooms,
        count: rooms.length,
        message: 'Popular rooms retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting popular rooms:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve popular rooms',
        message: 'An error occurred while fetching popular rooms'
      });
    }
  }
);

// GET /api/enhanced-rooms/categories - Get room categories
router.get('/categories',
  roomRateLimit(20, 60000),
  async (req: AuthRequest, res: Response) => {
    try {
      const categories = await enhancedRoomService.getRoomCategories();

      res.json({
        success: true,
        data: categories,
        count: categories.length,
        message: 'Room categories retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting room categories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve room categories',
        message: 'An error occurred while fetching room categories'
      });
    }
  }
);

// GET /api/enhanced-rooms/:roomId - Get specific room with detailed info
router.get('/:roomId',
  validateRoomId,
  requireRoomPermission('view'),
  async (req: AuthRequest, res: Response) => {
    try {
      const room = req.room; // Set by middleware

      // Get additional room stats
      const stats = await enhancedRoomService.getRoomStats(room.id);
      const onlineUsers = await enhancedRoomService.getOnlineUsersInRoom(room.id);

      res.json({
        success: true,
        data: {
          ...room,
          stats,
          onlineUsers
        },
        message: 'Room retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting room:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve room',
        message: 'An error occurred while fetching room details'
      });
    }
  }
);

// POST /api/enhanced-rooms - Create new room
router.post('/',
  roomRateLimit(5, 300000), // 5 room creations per 5 minutes
  requireUserType('member', 'admin', 'owner', 'moderator'),
  validateCreateRoom,
  async (req: AuthRequest, res: Response) => {
    try {
      const roomData = {
        ...req.body,
        createdBy: req.user!.id
      };

      // Check if room ID already exists
      const existingRoom = await enhancedRoomService.getRoom(roomData.id);
      if (existingRoom) {
        return res.status(409).json({
          success: false,
          error: 'Room already exists',
          message: `A room with ID "${roomData.id}" already exists`
        });
      }

      const newRoom = await enhancedRoomService.createRoom(roomData);

      res.status(201).json({
        success: true,
        data: newRoom,
        message: 'Room created successfully'
      });
    } catch (error) {
      console.error('Error creating room:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create room',
        message: 'An error occurred while creating the room'
      });
    }
  }
);

// PUT /api/enhanced-rooms/:roomId - Update room
router.put('/:roomId',
  validateRoomId,
  requireRoomPermission('edit'),
  validateUpdateRoom,
  roomRateLimit(10, 60000), // 10 updates per minute
  async (req: AuthRequest, res: Response) => {
    try {
      const roomId = req.params.roomId;
      const updates = req.body;

      const updatedRoom = await enhancedRoomService.updateRoom(roomId, updates);

      if (!updatedRoom) {
        return res.status(404).json({
          success: false,
          error: 'Room not found',
          message: 'Room could not be found or updated'
        });
      }

      res.json({
        success: true,
        data: updatedRoom,
        message: 'Room updated successfully'
      });
    } catch (error) {
      console.error('Error updating room:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update room',
        message: 'An error occurred while updating the room'
      });
    }
  }
);

// DELETE /api/enhanced-rooms/:roomId - Delete room
router.delete('/:roomId',
  validateRoomId,
  requireRoomPermission('delete'),
  roomRateLimit(3, 300000), // 3 deletions per 5 minutes
  async (req: AuthRequest, res: Response) => {
    try {
      const roomId = req.params.roomId;
      const deletedBy = req.user!.id;

      if (roomId === 'general') {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete general room',
          message: 'The general room cannot be deleted'
        });
      }

      await enhancedRoomService.deleteRoom(roomId, deletedBy);

      res.json({
        success: true,
        message: 'Room deleted successfully',
        data: { roomId }
      });
    } catch (error) {
      console.error('Error deleting room:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete room',
        message: 'An error occurred while deleting the room'
      });
    }
  }
);

// ==================== ROOM MEMBERSHIP ====================

// POST /api/enhanced-rooms/:roomId/join - Join room
router.post('/:roomId/join',
  validateRoomId,
  checkRoomExists,
  roomRateLimit(30, 60000), // 30 join attempts per minute
  async (req: AuthRequest, res: Response) => {
    try {
      const roomId = req.params.roomId;
      const userId = req.user!.id;
      const { password } = req.body;

      await enhancedRoomService.joinRoom(userId, roomId, password);

      // Get updated room info
      const room = await enhancedRoomService.getRoom(roomId);
      const onlineUsers = await enhancedRoomService.getOnlineUsersInRoom(roomId);

      res.json({
        success: true,
        message: 'Joined room successfully',
        data: {
          roomId,
          room,
          onlineUsers
        }
      });
    } catch (error) {
      console.error('Error joining room:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to join room',
        message: error instanceof Error ? error.message : 'An error occurred while joining the room'
      });
    }
  }
);

// POST /api/enhanced-rooms/:roomId/leave - Leave room
router.post('/:roomId/leave',
  validateRoomId,
  checkRoomExists,
  async (req: AuthRequest, res: Response) => {
    try {
      const roomId = req.params.roomId;
      const userId = req.user!.id;

      if (roomId === 'general') {
        return res.status(400).json({
          success: false,
          error: 'Cannot leave general room',
          message: 'Users cannot leave the general room'
        });
      }

      await enhancedRoomService.leaveRoom(userId, roomId);

      res.json({
        success: true,
        message: 'Left room successfully',
        data: { roomId }
      });
    } catch (error) {
      console.error('Error leaving room:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to leave room',
        message: 'An error occurred while leaving the room'
      });
    }
  }
);

// GET /api/enhanced-rooms/:roomId/users - Get room users
router.get('/:roomId/users',
  validateRoomId,
  requireRoomPermission('view'),
  async (req: AuthRequest, res: Response) => {
    try {
      const roomId = req.params.roomId;
      const onlineOnly = req.query.onlineOnly === 'true';
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      let users;
      if (onlineOnly) {
        users = await enhancedRoomService.getOnlineUsersInRoom(roomId);
      } else {
        const userIds = await enhancedRoomService.getRoomUsers(roomId);
        // Get full user details
        users = await Promise.all(
          userIds.map(async (userId) => {
            try {
              return await storage.getUser(userId);
            } catch (error) {
              console.error(`Error getting user ${userId}:`, error);
              return null;
            }
          })
        );
        users = users.filter(Boolean); // Remove null values
      }

      // Pagination
      const paginatedUsers = users.slice(offset, offset + limit);

      res.json({
        success: true,
        data: paginatedUsers,
        pagination: {
          total: users.length,
          limit,
          offset,
          hasMore: offset + limit < users.length
        },
        message: 'Room users retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting room users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve room users',
        message: 'An error occurred while fetching room users'
      });
    }
  }
);

// ==================== ROOM MESSAGES ====================

// GET /api/enhanced-rooms/:roomId/messages - Get room messages
router.get('/:roomId/messages',
  validateRoomId,
  requireRoomPermission('view'),
  async (req: AuthRequest, res: Response) => {
    try {
      const roomId = req.params.roomId;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      // Validate pagination parameters
      if (limit < 1 || limit > 100) {
        return res.status(400).json({
          success: false,
          error: 'Invalid limit',
          message: 'Limit must be between 1 and 100'
        });
      }

      if (offset < 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid offset',
          message: 'Offset must be non-negative'
        });
      }

      const messages = await chatService.getRoomMessages(roomId, limit, offset);

      res.json({
        success: true,
        data: messages,
        count: messages.length,
        pagination: {
          limit,
          offset,
          hasMore: messages.length === limit
        },
        message: 'Room messages retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting room messages:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve room messages',
        message: 'An error occurred while fetching room messages'
      });
    }
  }
);

// ==================== ROOM STATISTICS ====================

// GET /api/enhanced-rooms/:roomId/stats - Get room statistics
router.get('/:roomId/stats',
  validateRoomId,
  requireRoomPermission('view'),
  async (req: AuthRequest, res: Response) => {
    try {
      const roomId = req.params.roomId;
      const stats = await enhancedRoomService.getRoomStats(roomId);

      res.json({
        success: true,
        data: stats,
        message: 'Room statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting room stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve room statistics',
        message: 'An error occurred while fetching room statistics'
      });
    }
  }
);

// ==================== BROADCAST ROOM FEATURES ====================

// POST /api/enhanced-rooms/:roomId/mic/request - Request microphone access
router.post('/:roomId/mic/request',
  validateRoomId,
  checkRoomExists,
  requireRoomPermission('view'),
  roomRateLimit(10, 60000), // 10 mic requests per minute
  async (req: AuthRequest, res: Response) => {
    try {
      const roomId = req.params.roomId;
      const userId = req.user!.id;

      const room = req.room;
      if (!room.isBroadcast) {
        return res.status(400).json({
          success: false,
          error: 'Not a broadcast room',
          message: 'Microphone requests are only available in broadcast rooms'
        });
      }

      const success = await enhancedRoomService.requestMic(userId, roomId);

      if (!success) {
        return res.status(400).json({
          success: false,
          error: 'Already in queue',
          message: 'You are already in the microphone queue'
        });
      }

      res.json({
        success: true,
        message: 'Microphone request submitted successfully',
        data: { roomId, userId }
      });
    } catch (error) {
      console.error('Error requesting microphone:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to request microphone',
        message: 'An error occurred while requesting microphone access'
      });
    }
  }
);

// POST /api/enhanced-rooms/:roomId/mic/approve - Approve microphone request
router.post('/:roomId/mic/approve',
  validateRoomId,
  requireRoomPermission('manage'),
  async (req: AuthRequest, res: Response) => {
    try {
      const roomId = req.params.roomId;
      const { userId } = req.body;
      const approvedBy = req.user!.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID required',
          message: 'User ID must be provided to approve microphone request'
        });
      }

      const success = await enhancedRoomService.approveMicRequest(roomId, userId, approvedBy);

      if (!success) {
        return res.status(400).json({
          success: false,
          error: 'Approval failed',
          message: 'Failed to approve microphone request'
        });
      }

      res.json({
        success: true,
        message: 'Microphone request approved successfully',
        data: { roomId, userId, approvedBy }
      });
    } catch (error) {
      console.error('Error approving microphone:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to approve microphone',
        message: 'An error occurred while approving microphone request'
      });
    }
  }
);

// POST /api/enhanced-rooms/:roomId/mic/reject - Reject microphone request
router.post('/:roomId/mic/reject',
  validateRoomId,
  requireRoomPermission('manage'),
  async (req: AuthRequest, res: Response) => {
    try {
      const roomId = req.params.roomId;
      const { userId } = req.body;
      const rejectedBy = req.user!.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID required',
          message: 'User ID must be provided to reject microphone request'
        });
      }

      const success = await enhancedRoomService.rejectMicRequest(roomId, userId, rejectedBy);

      if (!success) {
        return res.status(400).json({
          success: false,
          error: 'Rejection failed',
          message: 'Failed to reject microphone request'
        });
      }

      res.json({
        success: true,
        message: 'Microphone request rejected successfully',
        data: { roomId, userId, rejectedBy }
      });
    } catch (error) {
      console.error('Error rejecting microphone:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reject microphone',
        message: 'An error occurred while rejecting microphone request'
      });
    }
  }
);

// POST /api/enhanced-rooms/:roomId/speakers/remove - Remove speaker
router.post('/:roomId/speakers/remove',
  validateRoomId,
  requireRoomPermission('manage'),
  async (req: AuthRequest, res: Response) => {
    try {
      const roomId = req.params.roomId;
      const { userId } = req.body;
      const removedBy = req.user!.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID required',
          message: 'User ID must be provided to remove speaker'
        });
      }

      const success = await enhancedRoomService.removeSpeaker(roomId, userId, removedBy);

      if (!success) {
        return res.status(400).json({
          success: false,
          error: 'Removal failed',
          message: 'Failed to remove speaker'
        });
      }

      res.json({
        success: true,
        message: 'Speaker removed successfully',
        data: { roomId, userId, removedBy }
      });
    } catch (error) {
      console.error('Error removing speaker:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove speaker',
        message: 'An error occurred while removing speaker'
      });
    }
  }
);

// ==================== USER ROOMS ====================

// GET /api/enhanced-rooms/user/my-rooms - Get user's rooms
router.get('/user/my-rooms',
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const roomIds = await enhancedRoomService.getUserRooms(userId);
      
      // Get full room details
      const rooms = await Promise.all(
        roomIds.map(async (roomId) => {
          try {
            return await enhancedRoomService.getRoom(roomId);
          } catch (error) {
            console.error(`Error getting room ${roomId}:`, error);
            return null;
          }
        })
      );

      const validRooms = rooms.filter(Boolean);

      res.json({
        success: true,
        data: validRooms,
        count: validRooms.length,
        message: 'User rooms retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting user rooms:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user rooms',
        message: 'An error occurred while fetching your rooms'
      });
    }
  }
);

// GET /api/enhanced-rooms/user/created-rooms - Get rooms created by user
router.get('/user/created-rooms',
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const rooms = await enhancedRoomService.getAllRooms({ createdBy: userId });

      res.json({
        success: true,
        data: rooms,
        count: rooms.length,
        message: 'User created rooms retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting user created rooms:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user created rooms',
        message: 'An error occurred while fetching your created rooms'
      });
    }
  }
);

// ==================== ROOM SEARCH ====================

// GET /api/enhanced-rooms/search - Search rooms
router.get('/search',
  roomRateLimit(20, 60000),
  async (req: AuthRequest, res: Response) => {
    try {
      const { q: query, ...filters } = req.query;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Query required',
          message: 'Search query is required'
        });
      }

      const searchFilters = {
        category: filters.category as string,
        isBroadcast: filters.isBroadcast === 'true',
        isPrivate: filters.isPrivate === 'true',
        maxUsers: filters.maxUsers ? parseInt(filters.maxUsers as string) : undefined,
        tags: filters.tags ? (filters.tags as string).split(',') : undefined,
        createdBy: filters.createdBy ? parseInt(filters.createdBy as string) : undefined,
        isActive: filters.isActive === 'true',
      };

      const rooms = await enhancedRoomService.searchRooms(query as string, searchFilters);

      res.json({
        success: true,
        data: rooms,
        count: rooms.length,
        query: query,
        filters: searchFilters,
        message: 'Room search completed successfully'
      });
    } catch (error) {
      console.error('Error searching rooms:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search rooms',
        message: 'An error occurred while searching rooms'
      });
    }
  }
);

// ==================== DATABASE HEALTH CHECK ====================

// GET /api/enhanced-rooms/admin/health - Perform health check (Admin only)
router.get('/admin/health',
  requireUserType('admin', 'owner'),
  async (req: AuthRequest, res: Response) => {
    try {
      const healthCheck = await databaseHealthCheckService.performFullHealthCheck();

      res.json({
        success: true,
        data: healthCheck,
        message: 'Health check completed successfully'
      });
    } catch (error) {
      console.error('Error performing health check:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to perform health check',
        message: 'An error occurred while performing health check'
      });
    }
  }
);

// POST /api/enhanced-rooms/admin/fix-orphaned - Fix orphaned data (Admin only)
router.post('/admin/fix-orphaned',
  requireUserType('admin', 'owner'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { fixRoomUsers, fixMessages } = req.body;

      const results: any = {};

      if (fixRoomUsers) {
        results.roomUsers = await databaseHealthCheckService.fixOrphanedRoomUsers();
      }

      if (fixMessages) {
        results.messages = await databaseHealthCheckService.fixOrphanedMessages();
      }

      res.json({
        success: true,
        data: results,
        message: 'Orphaned data fix completed successfully'
      });
    } catch (error) {
      console.error('Error fixing orphaned data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fix orphaned data',
        message: 'An error occurred while fixing orphaned data'
      });
    }
  }
);

// POST /api/enhanced-rooms/admin/cleanup - Cleanup old data (Admin only)
router.post('/admin/cleanup',
  requireUserType('admin', 'owner'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { deleteOldMessages, deleteOldNotifications, messageAgeDays, notificationAgeDays } = req.body;

      const cleanupResult = await databaseHealthCheckService.cleanupOldData({
        deleteOldMessages,
        deleteOldNotifications,
        messageAgeDays,
        notificationAgeDays,
      });

      res.json({
        success: true,
        data: cleanupResult,
        message: 'Cleanup completed successfully'
      });
    } catch (error) {
      console.error('Error cleaning up old data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup old data',
        message: 'An error occurred while cleaning up old data'
      });
    }
  }
);

// ==================== DATABASE BACKUP & RESTORE ====================

// POST /api/enhanced-rooms/admin/backup - Create backup (Admin only)
router.post('/admin/backup',
  requireUserType('admin', 'owner'),
  async (req: AuthRequest, res: Response) => {
    try {
      const config = req.body;
      const backupPath = await databaseExportImportService.createBackup(config);

      res.json({
        success: true,
        data: { backupPath },
        message: 'Backup created successfully'
      });
    } catch (error) {
      console.error('Error creating backup:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create backup',
        message: 'An error occurred while creating backup'
      });
    }
  }
);

// GET /api/enhanced-rooms/admin/backups - List backups (Admin only)
router.get('/admin/backups',
  requireUserType('admin', 'owner'),
  async (req: AuthRequest, res: Response) => {
    try {
      const backups = await databaseExportImportService.listBackups();

      res.json({
        success: true,
        data: backups,
        count: backups.length,
        message: 'Backups listed successfully'
      });
    } catch (error) {
      console.error('Error listing backups:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list backups',
        message: 'An error occurred while listing backups'
      });
    }
  }
);

// POST /api/enhanced-rooms/admin/restore - Restore backup (Admin only)
router.post('/admin/restore',
  requireUserType('admin', 'owner'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { backupPath, options } = req.body;

      if (!backupPath) {
        return res.status(400).json({
          success: false,
          error: 'Backup path required',
          message: 'Backup path must be provided'
        });
      }

      const restoreResult = await databaseExportImportService.restoreBackup(backupPath, options);

      res.json({
        success: true,
        data: restoreResult,
        message: 'Backup restored successfully'
      });
    } catch (error) {
      console.error('Error restoring backup:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to restore backup',
        message: 'An error occurred while restoring backup'
      });
    }
  }
);

// DELETE /api/enhanced-rooms/admin/backup/:filename - Delete backup (Admin only)
router.delete('/admin/backup/:filename',
  requireUserType('admin', 'owner'),
  async (req: AuthRequest, res: Response) => {
    try {
      const filename = req.params.filename;
      const backupPath = `./backups/${filename}`;

      await databaseExportImportService.deleteBackup(backupPath);

      res.json({
        success: true,
        message: 'Backup deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting backup:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete backup',
        message: 'An error occurred while deleting backup'
      });
    }
  }
);

// GET /api/enhanced-rooms/admin/stats - Get database statistics (Admin only)
router.get('/admin/stats',
  requireUserType('admin', 'owner'),
  async (req: AuthRequest, res: Response) => {
    try {
      const stats = await databaseExportImportService.getDatabaseStats();

      res.json({
        success: true,
        data: stats,
        message: 'Database statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting database stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve database statistics',
        message: 'An error occurred while fetching database statistics'
      });
    }
  }
);

// Error handling middleware
router.use(handleRoomError);

export default router;