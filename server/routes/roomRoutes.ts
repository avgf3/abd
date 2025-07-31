import { Router, Request, Response } from 'express';
import { roomService } from '../services/RoomService';
import { chatService } from '../services/ChatService';
import { storage } from '../storage';
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

// GET /api/rooms - Get all rooms
router.get('/', 
  roomRateLimit(20, 60000), // 20 requests per minute
  async (req: AuthRequest, res: Response) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const rooms = await roomService.getAllRooms(includeInactive);

      // Filter rooms based on user permissions
      const filteredRooms = rooms.filter(room => {
        if (room.isActive) return true;
        if (req.user?.userType === 'admin' || req.user?.userType === 'owner') return true;
        if (room.createdBy === req.user?.id) return true;
        return false;
      });

      res.json({
        success: true,
        data: filteredRooms,
        count: filteredRooms.length,
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

// GET /api/rooms/:roomId - Get specific room
router.get('/:roomId',
  validateRoomId,
  requireRoomPermission('view'),
  async (req: AuthRequest, res: Response) => {
    try {
      const room = req.room; // Set by middleware

      // Get additional room stats
      const stats = await roomService.getRoomStats(room.id);
      const onlineUsers = await roomService.getOnlineUsersInRoom(room.id);

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

// POST /api/rooms - Create new room
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
      const existingRoom = await roomService.getRoom(roomData.id);
      if (existingRoom) {
        return res.status(409).json({
          success: false,
          error: 'Room already exists',
          message: `A room with ID "${roomData.id}" already exists`
        });
      }

      const newRoom = await roomService.createRoom(roomData);

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

// PUT /api/rooms/:roomId - Update room
router.put('/:roomId',
  validateRoomId,
  requireRoomPermission('edit'),
  validateUpdateRoom,
  roomRateLimit(10, 60000), // 10 updates per minute
  async (req: AuthRequest, res: Response) => {
    try {
      const roomId = req.params.roomId;
      const updates = req.body;

      const updatedRoom = await roomService.updateRoom(roomId, updates);

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

// DELETE /api/rooms/:roomId - Delete room
router.delete('/:roomId',
  validateRoomId,
  requireRoomPermission('delete'),
  roomRateLimit(3, 300000), // 3 deletions per 5 minutes
  async (req: AuthRequest, res: Response) => {
    try {
      const roomId = req.params.roomId;

      if (roomId === 'general') {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete general room',
          message: 'The general room cannot be deleted'
        });
      }

      await roomService.deleteRoom(roomId);

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

// POST /api/rooms/:roomId/join - Join room
router.post('/:roomId/join',
  validateRoomId,
  checkRoomExists,
  roomRateLimit(30, 60000), // 30 join attempts per minute
  async (req: AuthRequest, res: Response) => {
    try {
      const roomId = req.params.roomId;
      const userId = req.user!.id;

      await roomService.joinRoom(userId, roomId);

      // Get updated room info
      const room = await roomService.getRoom(roomId);
      const onlineUsers = await roomService.getOnlineUsersInRoom(roomId);

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
        message: 'An error occurred while joining the room'
      });
    }
  }
);

// POST /api/rooms/:roomId/leave - Leave room
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

      await roomService.leaveRoom(userId, roomId);

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

// GET /api/rooms/:roomId/users - Get room users
router.get('/:roomId/users',
  validateRoomId,
  requireRoomPermission('view'),
  async (req: AuthRequest, res: Response) => {
    try {
      const roomId = req.params.roomId;
      const onlineOnly = req.query.onlineOnly === 'true';

      let users;
      if (onlineOnly) {
        users = await roomService.getOnlineUsersInRoom(roomId);
      } else {
        const userIds = await roomService.getRoomUsers(roomId);
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

      res.json({
        success: true,
        data: users,
        count: users.length,
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

// GET /api/rooms/:roomId/messages - Get room messages
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

// GET /api/rooms/:roomId/stats - Get room statistics
router.get('/:roomId/stats',
  validateRoomId,
  requireRoomPermission('view'),
  async (req: AuthRequest, res: Response) => {
    try {
      const roomId = req.params.roomId;
      const stats = await roomService.getRoomStats(roomId);

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

// Broadcast room specific endpoints

// POST /api/rooms/:roomId/mic/request - Request microphone access
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

      const success = await roomService.requestMic(userId, roomId);

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

// POST /api/rooms/:roomId/mic/approve - Approve microphone request
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

      const success = await roomService.approveMicRequest(roomId, userId, approvedBy);

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

// POST /api/rooms/:roomId/mic/reject - Reject microphone request
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

      const success = await roomService.rejectMicRequest(roomId, userId, rejectedBy);

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

// POST /api/rooms/:roomId/speakers/remove - Remove speaker
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

      const success = await roomService.removeSpeaker(roomId, userId, removedBy);

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

// User's rooms endpoint
router.get('/user/my-rooms',
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const roomIds = await roomService.getUserRooms(userId);
      
      // Get full room details
      const rooms = await Promise.all(
        roomIds.map(async (roomId) => {
          try {
            return await roomService.getRoom(roomId);
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

// Error handling middleware
router.use(handleRoomError);

export default router;