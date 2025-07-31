import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as IOServer } from "socket.io";
import { SocketManager } from "./services/SocketManager";
import { roomService } from "./services/RoomService";
import { chatService } from "./services/ChatService";
import roomRoutes from "./routes/roomRoutes";

// Re-export the original setupRoutes for backward compatibility
export { setupRoutes as setupRoutesOriginal } from "./routes";

// Enhanced setup function with new services
export function setupRoutesEnhanced(app: Express): { httpServer: Server; io: IOServer; socketManager: SocketManager } {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Create Socket.IO server with enhanced configuration
  const io = new IOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB
    allowEIO3: true
  });

  // Create socket manager
  const socketManager = new SocketManager(io);

  // Setup REST API routes for room management
  app.use('/api/rooms', roomRoutes);

  // Basic API endpoints for backward compatibility
  app.get('/api/chat/stats', async (req, res) => {
    try {
      const stats = await chatService.getMessageStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Error getting chat stats:', error);
      res.status(500).json({ success: false, error: 'Failed to get chat statistics' });
    }
  });

  app.get('/api/rooms-list', async (req, res) => {
    try {
      const rooms = await roomService.getAllRooms();
      res.json({ success: true, data: rooms });
    } catch (error) {
      console.error('Error getting rooms list:', error);
      res.status(500).json({ success: false, error: 'Failed to get rooms list' });
    }
  });

  // Socket.IO connection stats endpoint
  app.get('/api/socket/stats', (req, res) => {
    try {
      const stats = socketManager.getConnectionStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Error getting socket stats:', error);
      res.status(500).json({ success: false, error: 'Failed to get socket statistics' });
    }
  });

  // Initialize services
  initializeServices();

  console.log('✅ Enhanced routes and services initialized successfully');

  return { httpServer, io, socketManager };
}

// Initialize services with proper error handling
async function initializeServices() {
  try {
    // Ensure general room exists
    await roomService.ensureGeneralRoom();
    console.log('✅ General room initialized');

    // Set up service event handlers
    setupServiceEventHandlers();
    console.log('✅ Service event handlers initialized');

  } catch (error) {
    console.error('❌ Error initializing services:', error);
  }
}

// Set up cross-service event handlers
function setupServiceEventHandlers() {
  // Room service events
  roomService.on('room_created', (room) => {
    console.log(`📊 Room created: ${room.name} (${room.id})`);
  });

  roomService.on('room_deleted', ({ roomId, room }) => {
    console.log(`📊 Room deleted: ${roomId}`);
    // Clean up chat messages for the deleted room
    chatService.deleteMessagesByRoom(roomId).catch(console.error);
  });

  roomService.on('user_joined_room', ({ userId, roomId }) => {
    console.log(`📊 User ${userId} joined room ${roomId}`);
  });

  roomService.on('user_left_room', ({ userId, roomId }) => {
    console.log(`📊 User ${userId} left room ${roomId}`);
  });

  // Chat service events
  chatService.on('message_created', (message) => {
    console.log(`📊 Message created by user ${message.senderId} in ${message.isPrivate ? 'private' : `room ${message.roomId}`}`);
  });

  chatService.on('spam_detected', ({ userId, content }) => {
    console.log(`🚨 Spam detected from user ${userId}: ${content.substring(0, 50)}...`);
  });

  chatService.on('message_edited', (message) => {
    console.log(`📊 Message ${message.id} edited by user ${message.senderId}`);
  });

  chatService.on('message_deleted', ({ messageId, userId }) => {
    console.log(`📊 Message ${messageId} deleted by user ${userId}`);
  });
}

// Export services for external use
export { roomService, chatService };

// Utility functions for migration and testing
export const utils = {
  // Get comprehensive system stats
  async getSystemStats() {
    try {
      const [roomStats, chatStats] = await Promise.all([
        getRoomSystemStats(),
        chatService.getMessageStats()
      ]);

      return {
        rooms: roomStats,
        chat: chatStats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting system stats:', error);
      throw error;
    }
  },

  // Test all services
  async testServices() {
    const results = {
      roomService: false,
      chatService: false,
      database: false
    };

    try {
      // Test room service
      const rooms = await roomService.getAllRooms();
      results.roomService = Array.isArray(rooms);

      // Test chat service
      const messages = await chatService.getRoomMessages('general', 1);
      results.chatService = Array.isArray(messages);

      // Test database connectivity
      await roomService.ensureGeneralRoom();
      results.database = true;

    } catch (error) {
      console.error('Service test error:', error);
    }

    return results;
  },

  // Migrate old data to new system
  async migrateData() {
    // This would contain migration logic from the old system
    // to the new service-based architecture
    console.log('Data migration not implemented yet');
    return { migrated: 0, errors: 0 };
  }
};

// Helper function to get room system statistics
async function getRoomSystemStats() {
  try {
    const allRooms = await roomService.getAllRooms(true);
    
    const stats = {
      totalRooms: allRooms.length,
      activeRooms: allRooms.filter(r => r.isActive).length,
      broadcastRooms: allRooms.filter(r => r.isBroadcast).length,
      totalUsers: 0,
      onlineUsers: 0
    };

    // Calculate total users across all rooms
    for (const room of allRooms) {
      stats.totalUsers += room.userCount;
      stats.onlineUsers += room.onlineUserCount;
    }

    return stats;
  } catch (error) {
    console.error('Error getting room system stats:', error);
    return {
      totalRooms: 0,
      activeRooms: 0,
      broadcastRooms: 0,
      totalUsers: 0,
      onlineUsers: 0
    };
  }
}

// Health check endpoint
export function setupHealthCheck(app: Express) {
  app.get('/api/health', async (req, res) => {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        services: await utils.testServices()
      };

      const allServicesHealthy = Object.values(health.services).every(Boolean);
      
      if (!allServicesHealthy) {
        health.status = 'degraded';
        return res.status(503).json(health);
      }

      res.json(health);
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      });
    }
  });
}

// Documentation endpoint
export function setupApiDocs(app: Express) {
  app.get('/api/docs', (req, res) => {
    const docs = {
      title: 'Enhanced Chat Room API',
      version: '2.0.0',
      description: 'Robust chat room and messaging system with advanced features',
      endpoints: {
        rooms: {
          'GET /api/rooms': 'Get all rooms',
          'POST /api/rooms': 'Create new room',
          'GET /api/rooms/:roomId': 'Get specific room',
          'PUT /api/rooms/:roomId': 'Update room',
          'DELETE /api/rooms/:roomId': 'Delete room',
          'POST /api/rooms/:roomId/join': 'Join room',
          'POST /api/rooms/:roomId/leave': 'Leave room',
          'GET /api/rooms/:roomId/users': 'Get room users',
          'GET /api/rooms/:roomId/messages': 'Get room messages',
          'GET /api/rooms/:roomId/stats': 'Get room statistics'
        },
        broadcast: {
          'POST /api/rooms/:roomId/mic/request': 'Request microphone access',
          'POST /api/rooms/:roomId/mic/approve': 'Approve mic request',
          'POST /api/rooms/:roomId/mic/reject': 'Reject mic request',
          'POST /api/rooms/:roomId/speakers/remove': 'Remove speaker'
        },
        system: {
          'GET /api/health': 'System health check',
          'GET /api/socket/stats': 'Socket connection statistics',
          'GET /api/chat/stats': 'Chat message statistics'
        }
      },
      authentication: {
        type: 'Bearer Token',
        header: 'Authorization: Bearer <userId>',
        note: 'In production, use proper JWT tokens'
      },
      websocket: {
        events: {
          'connection': 'Client connects to server',
          'authenticate': 'User authentication',
          'message': 'Send/receive messages',
          'joinRoom': 'Join a room',
          'leaveRoom': 'Leave a room',
          'typing': 'Typing indicators'
        }
      }
    };

    res.json(docs);
  });
}