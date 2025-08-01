import { Router, Request, Response } from 'express';
import { roomService } from '../services/RoomService';
import { chatService } from '../services/ChatService';
import { storage } from '../storage';

const router = Router();

// Extend Request interface for TypeScript
interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    userType: string;
    role: string;
  };
}

// بسيط - التحقق من المصادقة
const authenticateUser = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please provide a valid authentication token'
      });
    }

    const token = authHeader.substring(7);
    const userId = parseInt(token, 10);

    if (isNaN(userId)) {
      return res.status(401).json({ 
        error: 'Invalid token format',
        message: 'Token must be a valid user ID'
      });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        message: 'The user associated with this token does not exist'
      });
    }

    req.user = {
      id: user.id,
      username: user.username,
      userType: user.userType,
      role: user.role || user.userType,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication failed',
      message: 'An error occurred during authentication'
    });
  }
};

// Apply authentication to all routes
router.use(authenticateUser);

// GET /api/rooms - جلب جميع الغرف
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const rooms = await roomService.getAllRooms(includeInactive);

    // تصفية الغرف حسب صلاحيات المستخدم
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
});

// GET /api/rooms/:roomId - جلب غرفة محددة
router.get('/:roomId', async (req: AuthRequest, res: Response) => {
  try {
    const roomId = req.params.roomId;
    const room = await roomService.getRoom(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found',
        message: `Room with ID ${roomId} does not exist`
      });
    }

    // التحقق من صلاحية الوصول
    if (!room.isActive && room.createdBy !== req.user?.id && 
        !['admin', 'owner'].includes(req.user?.userType || '')) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have permission to view this room'
      });
    }

    const onlineUsers = await roomService.getOnlineUsersInRoom(roomId);

    res.json({
      success: true,
      data: {
        ...room,
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
});

// POST /api/rooms - إنشاء غرفة جديدة
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, icon, isBroadcast } = req.body;

    // التحقق من البيانات الأساسية
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Room name is required'
      });
    }

    // التحقق من صلاحيات إنشاء الغرف
    if (!['admin', 'owner', 'moderator'].includes(req.user?.userType || '')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: 'You do not have permission to create rooms'
      });
    }

    const roomData = {
      name: name.trim(),
      description: description?.trim() || '',
      icon: icon || '',
      createdBy: req.user!.id,
      isBroadcast: isBroadcast || false
    };

    const newRoom = await roomService.createRoom(roomData);

    res.status(201).json({
      success: true,
      data: newRoom,
      message: 'Room created successfully'
    });
  } catch (error) {
    console.error('Error creating room:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: 'Room already exists',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create room',
      message: 'An error occurred while creating the room'
    });
  }
});

// POST /api/rooms/:roomId/join - انضمام لغرفة
router.post('/:roomId/join', async (req: AuthRequest, res: Response) => {
  try {
    const roomId = req.params.roomId;
    const userId = req.user!.id;

    await roomService.joinRoom(userId, roomId);

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
      message: error.message || 'An error occurred while joining the room'
    });
  }
});

// POST /api/rooms/:roomId/leave - مغادرة غرفة
router.post('/:roomId/leave', async (req: AuthRequest, res: Response) => {
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
});

// DELETE /api/rooms/:roomId - حذف غرفة
router.delete('/:roomId', async (req: AuthRequest, res: Response) => {
  try {
    const roomId = req.params.roomId;

    if (roomId === 'general') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete general room',
        message: 'The general room cannot be deleted'
      });
    }

    // التحقق من الصلاحيات
    const room = await roomService.getRoom(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found',
        message: `Room with ID ${roomId} does not exist`
      });
    }

    const isOwner = room.createdBy === req.user?.id;
    const isAdmin = ['admin', 'owner'].includes(req.user?.userType || '');

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: 'You do not have permission to delete this room'
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
});

// GET /api/rooms/:roomId/users - جلب مستخدمي الغرفة
router.get('/:roomId/users', async (req: AuthRequest, res: Response) => {
  try {
    const roomId = req.params.roomId;
    const onlineOnly = req.query.onlineOnly === 'true';

    let users;
    if (onlineOnly) {
      users = await roomService.getOnlineUsersInRoom(roomId);
    } else {
      const userIds = await roomService.getRoomUsers(roomId);
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
      users = users.filter(Boolean);
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
});

// GET /api/rooms/:roomId/messages - جلب رسائل الغرفة
router.get('/:roomId/messages', async (req: AuthRequest, res: Response) => {
  try {
    const roomId = req.params.roomId;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid limit',
        message: 'Limit must be between 1 and 100'
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
});

// GET /api/rooms/:roomId/stats - إحصائيات الغرفة
router.get('/:roomId/stats', async (req: AuthRequest, res: Response) => {
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
});

export default router;