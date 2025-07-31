# Enhanced Chat and Room System - Complete Guide

## 🏗️ Architecture Overview

The enhanced chat and room system has been completely restructured for better scalability, maintainability, and performance. The new architecture follows a service-oriented approach with clear separation of concerns.

### Key Components

1. **RoomService** - Handles all room-related operations
2. **ChatService** - Manages messaging and conversations
3. **SocketManager** - Advanced WebSocket connection management
4. **Middleware Layer** - Authentication, authorization, and validation
5. **REST API** - Complete HTTP API for room management
6. **Caching System** - In-memory caching for performance

## 🚀 Getting Started

### Using the Enhanced System

Replace your current routes setup with the enhanced version:

```typescript
import { setupRoutesEnhanced, setupHealthCheck, setupApiDocs } from './server/routes-enhanced';

const app = express();

// Setup health check and documentation
setupHealthCheck(app);
setupApiDocs(app);

// Initialize enhanced system
const { httpServer, io, socketManager } = setupRoutesEnhanced(app);

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Enhanced server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`❤️ Health Check: http://localhost:${PORT}/api/health`);
});
```

### Backward Compatibility

The system maintains backward compatibility with the existing WebSocket events and database schema. No migration is required for basic functionality.

## 📡 WebSocket Events (Enhanced)

### Client Events

```typescript
// Authentication (enhanced with connection limits)
socket.emit('authenticate', {
  username: 'اسم_المستخدم',
  userType: 'guest' // 'guest', 'member', 'owner', 'admin', 'moderator'
});

// Alternative auth with user ID
socket.emit('auth', {
  userId: 123,
  username: 'اسم_المستخدم'
});

// Send message (enhanced with rate limiting)
socket.emit('message', {
  type: 'message',
  content: 'مرحبا بالجميع',
  messageType: 'text' // 'text' or 'image'
});

// Send private message
socket.emit('message', {
  type: 'private',
  content: 'رسالة خاصة',
  receiverId: 456,
  messageType: 'text'
});

// Join room (enhanced with validation)
socket.emit('joinRoom', {
  roomId: 'general'
});

// Leave room
socket.emit('leaveRoom', {
  roomId: 'room_id'
});

// Typing indicator
socket.emit('typing', {
  isTyping: true
});
```

### Server Events

```typescript
// Authentication success
socket.on('authenticated', (data) => {
  console.log('Connected:', data.user);
});

// Receive message
socket.on('message', (data) => {
  if (data.type === 'message') {
    console.log('New message:', data.message);
  } else if (data.type === 'onlineUsers') {
    console.log('Users online:', data.users);
  } else if (data.type === 'userJoinedRoom') {
    console.log('User joined:', data.username);
  }
});

// Private message
socket.on('privateMessage', (data) => {
  console.log('Private message:', data.message);
});

// Typing indicator
socket.on('userTyping', (data) => {
  console.log(`${data.username} is typing: ${data.isTyping}`);
});

// System warnings
socket.on('warning', (data) => {
  console.log('Warning:', data.message);
});

// Kicked from server
socket.on('kicked', (data) => {
  console.log('Kicked:', data.reason);
});

// Connection errors
socket.on('error', (error) => {
  console.error('Error:', error.message);
});
```

## 🔌 REST API Endpoints

### Authentication

All API endpoints require authentication:

```bash
# Header format
Authorization: Bearer <userId>
```

### Room Management

```bash
# Get all rooms
GET /api/rooms
GET /api/rooms?includeInactive=true

# Get specific room with stats
GET /api/rooms/general

# Create new room
POST /api/rooms
Content-Type: application/json
{
  "id": "my-room",
  "name": "غرفتي الخاصة",
  "description": "وصف الغرفة",
  "isBroadcast": false
}

# Update room
PUT /api/rooms/my-room
Content-Type: application/json
{
  "name": "اسم جديد",
  "description": "وصف محدث"
}

# Delete room
DELETE /api/rooms/my-room

# Join room
POST /api/rooms/general/join

# Leave room
POST /api/rooms/my-room/leave

# Get room users
GET /api/rooms/general/users
GET /api/rooms/general/users?onlineOnly=true

# Get room messages
GET /api/rooms/general/messages
GET /api/rooms/general/messages?limit=20&offset=0

# Get room statistics
GET /api/rooms/general/stats

# Get user's rooms
GET /api/rooms/user/my-rooms
```

### Broadcast Room Features

```bash
# Request microphone access
POST /api/rooms/broadcast-room/mic/request

# Approve mic request (requires manage permission)
POST /api/rooms/broadcast-room/mic/approve
Content-Type: application/json
{
  "userId": 123
}

# Reject mic request
POST /api/rooms/broadcast-room/mic/reject
Content-Type: application/json
{
  "userId": 123
}

# Remove speaker
POST /api/rooms/broadcast-room/speakers/remove
Content-Type: application/json
{
  "userId": 123
}
```

### System Information

```bash
# Health check
GET /api/health

# Socket connection stats
GET /api/socket/stats

# Chat statistics
GET /api/chat/stats

# API documentation
GET /api/docs
```

## 🔒 Permissions & Roles

### User Types

- **guest**: Basic chat access
- **member**: Can create rooms, enhanced features
- **moderator**: Can manage rooms, kick users
- **admin**: Full system access
- **owner**: System owner privileges

### Room Permissions

- **view**: Can see room and join (if active)
- **edit**: Can modify room settings
- **delete**: Can delete room
- **manage**: Can manage users, approve mic requests

### Permission Matrix

| Action | Guest | Member | Moderator | Admin | Owner |
|--------|-------|--------|-----------|-------|-------|
| Join public rooms | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create rooms | ❌ | ✅ | ✅ | ✅ | ✅ |
| Edit own rooms | ❌ | ✅ | ✅ | ✅ | ✅ |
| Delete own rooms | ❌ | ✅ | ✅ | ✅ | ✅ |
| Manage any room | ❌ | ❌ | ✅ | ✅ | ✅ |
| View inactive rooms | ❌ | ❌ | ❌ | ✅ | ✅ |
| Kick users | ❌ | ❌ | ✅ | ✅ | ✅ |

## 🚦 Rate Limiting

### Default Limits

- **Message sending**: 30 messages per minute
- **Room creation**: 5 rooms per 5 minutes
- **Room updates**: 10 updates per minute
- **Room deletion**: 3 deletions per 5 minutes
- **Join attempts**: 30 per minute
- **Mic requests**: 10 per minute
- **API requests**: 20 per minute

### Spam Detection

- **Threshold**: 10 messages in 10 seconds
- **Action**: Temporary warning, rate limit increase
- **Events**: Emits 'spam_detected' event

## 💾 Caching System

### Room Cache

- Automatic caching of room information
- Cache invalidation on updates
- Maximum 1000 rooms in cache
- Cleanup every 5 minutes

### Message Cache

- Caches first page of recent messages
- Separate caches for room and private messages
- Maximum 100 conversation caches
- Cleanup every 10 minutes

### User Cache

- Caches user-room relationships
- Room user lists
- Automatic cache updates on join/leave

## 📊 Monitoring & Statistics

### Real-time Stats

```typescript
import { utils } from './server/routes-enhanced';

// Get comprehensive system stats
const stats = await utils.getSystemStats();
console.log(stats);
// {
//   rooms: { totalRooms: 5, activeRooms: 4, broadcastRooms: 1, ... },
//   chat: { totalMessages: 1250, todayMessages: 45, ... },
//   timestamp: "2024-01-15T10:30:00.000Z"
// }

// Test all services
const health = await utils.testServices();
console.log(health);
// { roomService: true, chatService: true, database: true }
```

### Socket Statistics

```bash
curl http://localhost:3000/api/socket/stats
```

```json
{
  "success": true,
  "data": {
    "totalConnections": 25,
    "uniqueUsers": 20,
    "roomCounts": {
      "general": 15,
      "room1": 5,
      "room2": 3
    }
  }
}
```

## 🔧 Advanced Features

### Event System

The enhanced system uses EventEmitter for cross-service communication:

```typescript
import { roomService, chatService } from './server/routes-enhanced';

// Listen to room events
roomService.on('room_created', (room) => {
  console.log(`New room: ${room.name}`);
});

roomService.on('user_joined_room', ({ userId, roomId }) => {
  console.log(`User ${userId} joined ${roomId}`);
});

// Listen to chat events
chatService.on('message_created', (message) => {
  console.log(`New message from ${message.senderId}`);
});

chatService.on('spam_detected', ({ userId, content }) => {
  console.log(`Spam from user ${userId}`);
});
```

### Custom Room Types

```typescript
// Create a broadcast room
const broadcastRoom = await roomService.createRoom({
  id: 'live-show',
  name: 'عرض مباشر',
  description: 'بث صوتي مباشر',
  createdBy: userId,
  isBroadcast: true,
  hostId: userId
});

// Create a private room
const privateRoom = await roomService.createRoom({
  id: 'private-meeting',
  name: 'اجتماع خاص',
  description: 'غرفة خاصة للفريق',
  createdBy: userId,
  isBroadcast: false
});
```

### Message Operations

```typescript
// Create message with validation
const message = await chatService.createMessage({
  senderId: userId,
  content: 'مرحبا بالجميع',
  messageType: 'text',
  isPrivate: false,
  roomId: 'general'
});

// Edit message
const editedMessage = await chatService.editMessage(
  messageId,
  'محتوى محدث',
  userId
);

// Delete message
await chatService.deleteMessage(messageId, userId);

// Get conversation
const messages = await chatService.getPrivateMessages(userId1, userId2, 50);
```

## 🔄 Migration Guide

### From Old System

1. **No immediate changes required** - The enhanced system maintains backward compatibility
2. **Gradually adopt new features** - Start using REST API endpoints
3. **Monitor performance** - Use health check and statistics endpoints
4. **Update client code** - Enhanced error handling and events

### Database Changes

The enhanced system uses the existing database schema with improved queries:

- ✅ Existing tables remain unchanged
- ✅ New indexes for better performance
- ✅ Enhanced data validation
- ✅ Better error handling

## 🛠️ Troubleshooting

### Common Issues

**Authentication Errors**
```bash
# Check user exists
curl -H "Authorization: Bearer 123" http://localhost:3000/api/health

# Response for invalid user:
{
  "error": "User not found",
  "message": "The user associated with this token does not exist"
}
```

**Rate Limiting**
```bash
# Check rate limit headers
curl -I -H "Authorization: Bearer 123" http://localhost:3000/api/rooms

# Headers:
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 19
X-RateLimit-Reset: 2024-01-15T10:31:00.000Z
```

**Socket Connection Issues**
```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error);
  // Handle specific error types
  if (error.message.includes('Authentication')) {
    // Re-authenticate
  } else if (error.message.includes('Rate limit')) {
    // Wait and retry
  }
});
```

### Performance Optimization

1. **Enable caching** - Already enabled by default
2. **Use pagination** - For message and user lists
3. **Monitor connections** - Use socket statistics
4. **Database indexing** - Ensure proper indexes exist

## 📈 Performance Benchmarks

### Expected Performance

- **Message throughput**: 1000+ messages/second
- **Concurrent users**: 1000+ simultaneous connections
- **Room capacity**: 100+ users per room
- **API response time**: <100ms average
- **Memory usage**: ~50MB base + 1MB per 100 users

### Scaling Recommendations

- **Horizontal scaling**: Multiple server instances with load balancer
- **Database optimization**: Read replicas for message history
- **Redis integration**: For distributed caching and sessions
- **CDN**: For file uploads and static content

## 🔐 Security Features

### Built-in Protection

1. **Rate limiting** - Prevents spam and abuse
2. **Input validation** - All data validated with Zod schemas
3. **Permission system** - Role-based access control
4. **Connection limits** - Max connections per user
5. **Spam detection** - Automatic detection and mitigation
6. **SQL injection prevention** - Parameterized queries
7. **XSS protection** - Input sanitization

### Security Best Practices

1. **Use HTTPS** in production
2. **Implement proper JWT** tokens instead of user ID
3. **Enable CORS** properly for your domain
4. **Monitor logs** for suspicious activity
5. **Regular updates** of dependencies
6. **Implement 2FA** for admin accounts

## 📚 API Response Examples

### Success Response
```json
{
  "success": true,
  "data": {
    "id": "general",
    "name": "الغرفة العامة",
    "userCount": 25,
    "onlineUserCount": 15
  },
  "message": "Room retrieved successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Room not found",
  "message": "Room with ID 'invalid' does not exist"
}
```

### Validation Error
```json
{
  "error": "Validation error",
  "message": "Invalid room data provided",
  "details": [
    {
      "field": "name",
      "message": "String must contain at least 1 character(s)",
      "code": "too_small"
    }
  ]
}
```

## 🎯 Next Steps

1. **Test the enhanced system** with your current setup
2. **Monitor performance** using the built-in tools
3. **Gradually migrate** client code to use new features
4. **Implement additional features** as needed
5. **Scale horizontally** when user base grows

The enhanced chat and room system provides a solid foundation for scalable, maintainable chat applications with advanced features and excellent performance.