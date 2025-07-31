# Arabic Chat Application

A comprehensive Arabic chat application with modern features including real-time messaging, user management, points system, and broadcast rooms.

## 🌟 Features

- **Real-time Chat**: Instant messaging with Socket.IO
- **User Management**: Registration, authentication, and user profiles
- **Points System**: Gamification with points and levels
- **Broadcast Rooms**: Audio broadcasting capabilities
- **Moderation Tools**: Admin and moderator controls
- **File Sharing**: Image and file upload support
- **Responsive Design**: Mobile-first responsive interface
- **Arabic RTL Support**: Full right-to-left language support

## 🚀 Production Deployment

### Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- Redis (optional, for session storage)

### Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.production .env
   # Edit .env with your production values
   ```

3. **Build and deploy**:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

### Environment Variables

```env
DATABASE_URL=postgresql://username:password@localhost:5432/chat_production
NODE_ENV=production
PORT=5000
SESSION_SECRET=your-secure-secret-key
FRONTEND_URL=https://your-domain.com
```

### Health Check

Monitor application health at: `/health`

### Security Features

- Helmet.js for security headers
- Rate limiting on all endpoints
- CORS protection
- Input validation and sanitization
- File upload restrictions

## 📊 Monitoring

- Health endpoint: `GET /health`
- Memory usage tracking
- Database connection monitoring
- Error logging

## 🔧 Maintenance

- Regular security audits: `npm run test:security`
- Database backups recommended
- Log rotation setup
- SSL/TLS configuration required for production

## 📞 Support

For technical support or questions, please refer to the documentation in the `docs/` directory.

---

*Built with ❤️ for the Arabic community*
