import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { roomService } from '../services/RoomService';
import { storage } from '../storage';

// Extend Request interface
interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    userType: string;
    role: string;
  };
  room?: any;
}

// Validation schemas
const createRoomSchema = z.object({
  id: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/, 'Room ID can only contain letters, numbers, hyphens, and underscores'),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  isBroadcast: z.boolean().default(false),
  hostId: z.number().optional(),
});

const updateRoomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
  isBroadcast: z.boolean().optional(),
  hostId: z.number().optional(),
});

const roomIdSchema = z.object({
  roomId: z.string().min(1).max(50),
});

const joinRoomSchema = z.object({
  userId: z.number(),
});

// Authentication middleware
export const authenticateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please provide a valid authentication token'
      });
    }

    // For now, we'll use a simple token format: "Bearer userId"
    // In production, this should be a JWT or similar secure token
    const token = authHeader.substring(7);
    const userId = parseInt(token, 10);

    if (isNaN(userId)) {
      return res.status(401).json({ 
        error: 'Invalid token format',
        message: 'Token must be a valid user ID'
      });
    }

    // Get user from database
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        message: 'The user associated with this token does not exist'
      });
    }

    // Check if user is banned
    if (user.isBanned) {
      const banExpiry = user.banExpiry;
      if (!banExpiry || banExpiry > new Date()) {
        return res.status(403).json({ 
          error: 'User banned',
          message: 'Your account is banned',
          banExpiry: banExpiry
        });
      }
    }

    // Attach user to request
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

// Authorization middleware for different user types
export const requireUserType = (...allowedTypes: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'User authentication is required for this operation'
      });
    }

    const userType = req.user.userType || req.user.role;
    
    if (!allowedTypes.includes(userType)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `This operation requires one of the following user types: ${allowedTypes.join(', ')}`,
        requiredTypes: allowedTypes,
        currentType: userType
      });
    }

    next();
  };
};

// Room ownership/permission middleware
export const requireRoomPermission = (action: 'view' | 'edit' | 'delete' | 'manage') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'User authentication is required for this operation'
        });
      }

      const roomId = req.params.roomId || req.body.roomId;
      if (!roomId) {
        return res.status(400).json({ 
          error: 'Room ID required',
          message: 'Room ID must be provided in the request'
        });
      }

      // Get room information
      const room = await roomService.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ 
          error: 'Room not found',
          message: `Room with ID ${roomId} does not exist`
        });
      }

      req.room = room;

      const user = req.user;
      const isOwner = room.createdBy === user.id;
      const isHost = room.hostId === user.id;
      const isAdmin = ['admin', 'owner'].includes(user.userType);
      const isModerator = ['moderator', 'admin', 'owner'].includes(user.userType);

      // Check permissions based on action
      let hasPermission = false;

      switch (action) {
        case 'view':
          // Everyone can view active rooms
          hasPermission = room.isActive || isOwner || isAdmin;
          break;
        
        case 'edit':
          // Room creator, host, or admin can edit
          hasPermission = isOwner || isHost || isAdmin;
          break;
        
        case 'delete':
          // Only room creator or admin can delete
          hasPermission = isOwner || isAdmin;
          break;
        
        case 'manage':
          // Room creator, host, or moderator can manage
          hasPermission = isOwner || isHost || isModerator;
          break;
      }

      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          message: `You don't have permission to ${action} this room`,
          required: getRequiredPermissions(action),
          current: {
            userType: user.userType,
            isOwner,
            isHost,
          }
        });
      }

      next();
    } catch (error) {
      console.error('Room permission check error:', error);
      res.status(500).json({ 
        error: 'Permission check failed',
        message: 'An error occurred while checking room permissions'
      });
    }
  };
};

// Validation middleware
export const validateCreateRoom = (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createRoomSchema.parse(req.body);
    req.body = validated;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid room data provided',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      });
    }
    
    res.status(500).json({
      error: 'Validation failed',
      message: 'An error occurred during validation'
    });
  }
};

export const validateUpdateRoom = (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = updateRoomSchema.parse(req.body);
    req.body = validated;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid room update data provided',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      });
    }
    
    res.status(500).json({
      error: 'Validation failed',
      message: 'An error occurred during validation'
    });
  }
};

export const validateRoomId = (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = roomIdSchema.parse(req.params);
    req.params = validated;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid room ID format',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      });
    }
    
    res.status(500).json({
      error: 'Validation failed',
      message: 'An error occurred during validation'
    });
  }
};

export const validateJoinRoom = (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = joinRoomSchema.parse(req.body);
    req.body = validated;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid join room data provided',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      });
    }
    
    res.status(500).json({
      error: 'Validation failed',
      message: 'An error occurred during validation'
    });
  }
};

// Rate limiting middleware specific to rooms
export const roomRateLimit = (maxRequests: number, windowMs: number) => {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();

  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'User authentication is required for rate limiting'
      });
    }

    const key = `${req.user.id}:${req.method}:${req.path}`;
    const now = Date.now();
    
    let requestData = requestCounts.get(key);
    
    if (!requestData || now > requestData.resetTime) {
      requestData = {
        count: 1,
        resetTime: now + windowMs
      };
    } else {
      requestData.count++;
    }
    
    requestCounts.set(key, requestData);
    
    if (requestData.count > maxRequests) {
      const resetIn = Math.ceil((requestData.resetTime - now) / 1000);
      
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Try again in ${resetIn} seconds.`,
        resetIn,
        limit: maxRequests,
        window: windowMs / 1000
      });
    }
    
    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': (maxRequests - requestData.count).toString(),
      'X-RateLimit-Reset': new Date(requestData.resetTime).toISOString()
    });
    
    next();
  };
};

// General room existence check
export const checkRoomExists = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const roomId = req.params.roomId;
    
    if (!roomId) {
      return res.status(400).json({ 
        error: 'Room ID required',
        message: 'Room ID must be provided in the request parameters'
      });
    }

    const room = await roomService.getRoom(roomId);
    
    if (!room) {
      return res.status(404).json({ 
        error: 'Room not found',
        message: `Room with ID ${roomId} does not exist`
      });
    }

    req.room = room;
    next();
  } catch (error) {
    console.error('Room existence check error:', error);
    res.status(500).json({ 
      error: 'Room check failed',
      message: 'An error occurred while checking room existence'
    });
  }
};

// Error handling middleware for room operations
export const handleRoomError = (error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Room operation error:', error);

  // Handle specific error types
  if (error.code === 'ROOM_EXISTS') {
    return res.status(409).json({
      error: 'Room already exists',
      message: 'A room with this ID already exists'
    });
  }

  if (error.code === 'ROOM_NOT_FOUND') {
    return res.status(404).json({
      error: 'Room not found',
      message: 'The requested room does not exist'
    });
  }

  if (error.code === 'PERMISSION_DENIED') {
    return res.status(403).json({
      error: 'Permission denied',
      message: error.message || 'You do not have permission to perform this action'
    });
  }

  if (error.code === 'VALIDATION_ERROR') {
    return res.status(400).json({
      error: 'Validation error',
      message: error.message || 'Invalid data provided'
    });
  }

  // Generic error response
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
};

// Helper function to get required permissions description
function getRequiredPermissions(action: string): string[] {
  switch (action) {
    case 'view':
      return ['Active room access', 'Room owner', 'Admin'];
    case 'edit':
      return ['Room owner', 'Room host', 'Admin'];
    case 'delete':
      return ['Room owner', 'Admin'];
    case 'manage':
      return ['Room owner', 'Room host', 'Moderator', 'Admin'];
    default:
      return [];
  }
}

// Cleanup function for rate limiting
setInterval(() => {
  // This would be implemented to clean up old rate limit entries
  // For production, consider using Redis for rate limiting
}, 60000); // Clean up every minute