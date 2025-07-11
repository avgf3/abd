# Overview

This is a full-stack Arabic chat application built with React (frontend) and Express.js (backend). The application provides real-time messaging capabilities with WebSocket support, user authentication (guest and member modes), private messaging, and a comprehensive user management system. The UI is designed with Arabic language support (RTL layout) and uses a modern dark theme.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state, React hooks for local state
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Build Tool**: Vite for development and production builds
- **Font**: Google Fonts (Cairo) for Arabic text support
- **Language Support**: Right-to-left (RTL) layout for Arabic interface

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Real-time Communication**: WebSocket server using 'ws' library
- **Module System**: ESM (ES Modules)
- **Development**: tsx for TypeScript execution in development
- **Production**: esbuild for server bundling

### Database & ORM
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: Configured for PostgreSQL (likely Neon Database based on dependencies)
- **Migrations**: Drizzle-kit for schema management
- **Schema Location**: Shared schema definitions in `/shared/schema.ts`

## Key Components

### Authentication System
- **Guest Mode**: Quick access with username only, temporary accounts
- **Member Mode**: Registered users with username/password authentication
- **Google OAuth**: Social login integration (configured but implementation not shown)
- **User Types**: Three-tier system (guest, member, owner) with different privileges

### Real-time Communication
- **WebSocket Server**: Custom implementation at `/ws` endpoint
- **Message Types**: Text and image support
- **Public Chat**: General chat room for all users
- **Private Messaging**: One-to-one conversations between users
- **Typing Indicators**: Real-time typing status updates
- **User Presence**: Online/offline status tracking

### User Management
- **User Profiles**: Comprehensive profile system with personal information
- **Friend System**: Add friends, manage relationships, blocking functionality
- **User Ranks**: Visual badges for different user types (owner, member, guest)
- **Search**: Real-time user search functionality

### UI Components
- **Chat Interface**: Modern dark theme with glass-effect styling
- **Responsive Design**: Mobile-first approach with responsive breakpoints
- **Modal System**: Profile editing, settings, and authentication modals
- **Sidebar**: User list with search and status indicators
- **Message Area**: Scrollable message history with timestamp formatting

## Data Flow

### Authentication Flow
1. User selects login method (guest, member, or Google)
2. Frontend sends credentials to `/api/auth/{method}` endpoint
3. Backend validates and creates/retrieves user record
4. User data returned to frontend and stored in local state
5. WebSocket connection established with user credentials

### Message Flow
1. User types message in chat input
2. Frontend sends message via WebSocket with type and content
3. Backend processes message and stores in database
4. Message broadcasted to appropriate recipients (public or private)
5. All connected clients receive and display the message

### User Presence
1. WebSocket connection establishes user as online
2. Backend tracks connected users and broadcasts updates
3. Users see real-time online/offline status changes
4. Disconnect events update user status automatically

## External Dependencies

### Frontend Dependencies
- **React Ecosystem**: React 18, React DOM, React Query
- **UI Framework**: Radix UI primitives with shadcn/ui components
- **Styling**: Tailwind CSS, clsx for conditional classes
- **Form Handling**: React Hook Form with Zod validation
- **Date Handling**: date-fns for formatting
- **Icons**: Lucide React icon library

### Backend Dependencies
- **Core**: Express.js, WebSocket (ws), TypeScript
- **Database**: Drizzle ORM, @neondatabase/serverless
- **Session Management**: connect-pg-simple for PostgreSQL sessions
- **Validation**: Zod for schema validation
- **Development**: tsx for TypeScript execution

### Shared Dependencies
- **Validation**: Zod schemas shared between frontend and backend
- **Types**: TypeScript interfaces for type safety across stack

## Deployment Strategy

### Development Environment
- **Frontend**: Vite dev server with HMR (Hot Module Replacement)
- **Backend**: tsx for TypeScript execution with nodemon-like restart
- **Database**: Development database with Drizzle push for schema updates
- **Integration**: Vite proxy configuration for API routes

### Production Build
- **Frontend**: Vite build to static assets in `dist/public`
- **Backend**: esbuild bundling to single Node.js file in `dist`
- **Static Serving**: Express serves frontend build from `dist/public`
- **Environment**: NODE_ENV=production for optimized builds

### Database Management
- **Schema**: Drizzle schema defined in shared folder
- **Migrations**: Generated in `/migrations` folder  
- **Deployment**: `db:push` command for schema deployment
- **Connection**: Environment variable DATABASE_URL for database connection
- **Mixed Storage**: PostgreSQL for member data persistence, in-memory for temporary guest data

### Recent Changes (January 10, 2025)
- **Database Integration**: Successfully implemented PostgreSQL database for member data persistence
- **Mixed Storage System**: Guests stored in memory (temporary), members stored in database (persistent)
- **Profile Picture Upload**: Fixed upload restrictions - now available for members and owners only
- **User Registration**: Added comprehensive registration form with all required fields
- **Data Persistence**: Member accounts now persist between sessions, guest accounts remain temporary
- **Download System**: Added multiple download options for complete project code
- **Code Backup**: Created comprehensive code backup with all latest updates and fixes

### Latest Updates (January 10, 2025)
- **Spam Protection System**: Complete filtering system with 25+ banned words, duplicate message prevention, and message length limits
- **Reporting System**: Full reporting functionality for messages and users with admin review panel
- **Admin Panel**: Created temporary admin account "عبود" (password: 22333) for system management
- **Notifications**: Working notification system for friend requests and private messages
- **Friends System**: Complete friends management with online status and private messaging
- **Public Chat Fix**: Resolved Enter key issue - public messages now send properly
- **No Scoring System**: Removed automatic scoring/rating system per user request
- **UI Enhancements**: Added notification badges, friend counters, and admin controls

### Final Updates (January 10, 2025)
- **Hierarchical Admin System**: Complete admin hierarchy with specific permissions
  - **Moderator**: Mute users only (prevents them from sending public messages)
  - **Admin**: Can mute + kick users for 15 minutes with countdown timer
  - **Owner (عبود)**: Full control - can mute, kick, permanently ban by IP/device, promote users to admin, and remove any user
- **Friend Request Management**: Full system with ignore, decline, accept, and cancel options
- **Friend Removal Confirmation**: Added confirmation dialogs for removing friends
- **Real-time Moderation**: Instant enforcement of mutes, kicks, and bans via WebSocket
- **IP and Device Tracking**: Permanent bans track IP addresses and device IDs
- **Enhanced Friend Requests Panel**: Separate panel for managing incoming/outgoing friend requests
- **Complete Admin Controls**: Full moderation panel with all hierarchical permissions implemented

### Smart Private Messaging System (January 10, 2025)
- **Intelligent Conversation Detection**: System automatically detects existing conversation history
- **Smart User Click Behavior**: 
  - If conversation exists → Opens chat directly with history count notification
  - If no conversation → Shows "Start Conversation" popup menu
- **Automatic Conversation Creation**: New conversations appear in "المحادثات" panel after first message
- **Professional UI**: Fixed React key conflicts, improved visual feedback, smart conversation counters
- **Real-time Notifications**: Sound and browser notifications for new private messages
- **Conversation Status Indicators**: Shows message count, new/existing conversation status

### Performance and Security Enhancements (January 10, 2025)
- **Message Speed Optimization**: Implemented message batching and rate limiting (500ms between messages)
- **Enhanced Connection Stability**: Smart reconnection with network status detection and heartbeat system
- **Mobile Experience Improvements**: Touch-optimized buttons, responsive text sizes, iOS zoom prevention
- **Advanced Security System**: 
  - Content sanitization and validation
  - Enhanced username restrictions (3-20 chars, no special symbols)
  - Password strength requirements (minimum 6 chars + 1 number)
  - IP-based rate limiting for auth (5 attempts per 15 minutes)
  - Message content filtering for suspicious links and banned words
  - Real-time content validation before database storage
- **Performance Optimization Library**: Created dedicated performance utilities for smooth scrolling and optimized updates

### Professional Enhancement System (January 11, 2025)
- **Advanced Analytics System**: Complete chat analytics with user activity tracking, message patterns, and real-time insights
- **Enterprise Security Framework**: Advanced threat detection, IP monitoring, suspicious activity analysis, and automated security responses
- **Performance Optimization Engine**: Memory management, network latency monitoring, FPS tracking, and smart caching systems
- **Professional Admin Tools**: Security panels, analytics dashboards, performance monitors, and comprehensive reporting
- **Optimization Libraries**: Message caching, virtual scrolling, network request optimization, and smart memory cleanup
- **Enhanced User Experience**: Intelligent notifications, performance indicators, and professional UI components

### Latest System Status (January 11, 2025) - INTELLIGENT AI OVERHAUL COMPLETE
- **Smart Notification System**: Complete intelligent categorization system (messages, friends, admin, system) with real-time updates
- **Code Quality Enhancement**: Removed ALL duplicate code and white sections from ProfileModal
- **Clean Profile Management**: Integrated CleanProfileUpload with streamlined picture upload system
- **All Core Features Working**: Authentication, messaging, moderation, and friend systems fully functional
- **WebSocket Connection**: Stable and reliable real-time communication with advanced optimization
- **Enhanced Moderation System**: Complete permissions system with IP/device blocking capabilities
- **Admin Hierarchy Protection**: Admins cannot moderate other admins, only members and guests
- **Mute System Fixed**: Muted users cannot send public messages but can use private messages
- **File Sharing System**: Complete file upload capability for private messages (images, videos, documents)
- **Smart Notification System**: Real-time notifications for promotions and moderation actions
- **Report Protection**: Admin/Moderator/Owner roles cannot be reported by other users
- **Admin Access Controls**: Reports and Actions logs accessible by Admin ⭐ and Owner 👑 only
- **Role System**: Owner 👑 (all powers), Admin ⭐ (mute/kick/block), Moderator 🛡️ (mute only)
- **Action Logs Panel**: Dedicated interface for viewing all moderation actions with timestamps
- **Reports Log System**: Dedicated panel for viewing and managing user reports
- **Friend System**: Complete friendship management with real-time connectivity
- **System Notifications**: Public moderation announcements + private user notifications
- **UI Design**: Modern dark theme with glass effects, Arabic RTL support, and specialized panels
- **Database Integration**: Mixed storage system working perfectly for guests and members
- **Professional Grade**: Enterprise-level moderation, security, performance monitoring, and reporting
- **LAUNCH READY**: All intelligent systems integrated and optimized for production deployment

### Final Launch Preparation (January 11, 2025)
- **Real Database Notifications**: Complete notification system with PostgreSQL database integration
- **Welcome Notifications**: Automatic welcome messages for new users (guests and members)
- **Friend System Integration**: Complete notifications for friend requests and acceptances
- **Profile Modal Cleanup**: Removed duplicate white sections, showing only essential profile information
- **Clean Profile View**: Other users only see basic info, profile image, and banner - no editing controls
- **Code Optimization**: Removed duplicate code, integrated all system components
- **Launch-Ready System**: All features connected, notifications working, clean interface design
- **Complete Integration**: Authentication, messaging, friends, notifications, and moderation fully connected

### Username Color System (January 11, 2025)
- **Comprehensive Color Implementation**: Username colors now appear in ALL interface locations:
  - Public chat messages (NewMessageArea)
  - User sidebar list (UserSidebar)
  - Private message boxes (PrivateMessageBox)
  - Profile modal username display (ProfileModal)
  - User list in other sidebars (NewUserSidebar)
  - Moderation panels username display (ModerationPanel)
  - Promotion panels user lists (PromoteUserPanel)
- **Color Picker Interface**: Beautiful 30-color grid in profile settings under "🎨 الألوان" tab
- **Real-time Updates**: Color changes broadcast instantly via WebSocket to all connected users
- **Database Persistence**: Username colors saved to database for member accounts
- **Default Color Support**: White default color for new users, customizable for all user types
- **Performance Optimized**: Efficient color rendering with CSS inline styles for instant display

### Profile Picture System (January 11, 2025)
- **Dual Image System**: 
  - **Profile Banner**: Large cover image at top of profile modal with camera/upload functionality
  - **Avatar Image**: Traditional circular profile picture for chat and sidebar display
- **Professional Upload Interface**: 
  - Camera capture functionality for both image types
  - File upload with drag-and-drop support
  - Real-time preview before upload confirmation
  - Automatic image compression and optimization
- **Smart Storage**: 
  - Members and owners can upload custom images
  - Guests restricted to default avatars for security
  - Automatic cleanup of old images when updated
- **Database Integration**: Full schema support with profileBanner and profileImage fields
- **API Endpoints**: 
  - `/api/upload/profile-image` for avatar images
  - `/api/upload/profile-banner` for cover images
- **Enhanced UI Layout**: Profile modal redesigned with banner on top, avatar and info below

### Modern Profile Interface (January 11, 2025)
- **Instagram-Style Profile Design**: Complete redesign matching professional social media layouts
- **Large Banner Background**: Full-width cover image with gradient overlays and professional styling
- **Floating Profile Image**: Circular avatar positioned on the right with online status indicator
- **Action Buttons**: Modern floating buttons (Report, Ignore, Private Message) with proper spacing
- **Information Panel**: Dual-column layout with personal info and profile link sections
- **Professional Gradient**: Teal-to-blue gradient background for information sections
- **Responsive Design**: Mobile-optimized layout with proper spacing and typography
- **Smart Image Display**: Proper fallback handling and error management for profile images
- **Upload Controls**: Contextual upload buttons only visible to profile owners
- **Real-time Status**: Live online/offline indicators with proper styling

### Premium User Theme System - Adaptive Golden Gradient (January 11, 2025)
- **Owner-Only Golden Theme**: Exclusive beautiful gradient background (yellow-400 to yellow-600) with animated glow for Owner 👑 users only
- **Adaptive Coverage**: 
  - UserSidebar: Full comprehensive coverage for entire user box excluding profile image area
  - ProfileModal: Compact styling with smaller padding for cleaner profile appearance
  - Messages: Standard username area coverage with clean styling
- **Enhanced UserSidebar**: Complete theme coverage for entire user entry box excluding profile picture
- **Smooth Glow Effects**: 2-second golden-glow animation with soft shadow effects without borders
- **Professional Clean Styling**: Black text on golden background with clean appearance, no border frames
- **Universal Application**: Golden theme appears consistently across all components with adaptive sizing
- **CSS Animations**: Custom golden-glow keyframe animation with subtle scaling and shadow enhancement
- **User Preference**: Full theme coverage in user list, compact in profile modal, clean styling without borders

### Comprehensive Theme System - 46 Beautiful Themes (January 11, 2025)
- **Complete Theme Collection**: 46 professionally designed themes with gradient backgrounds and animations
- **Theme Categories**:
  - **Classic Themes**: Default, Golden, Royal, Ocean, Sunset, Forest, Rose, Emerald, Fire, Galaxy, Rainbow
  - **Premium Themes**: Aqua, Crystal, Amber, Coral, Jade, Sapphire, Bronze, Silver, Platinum, Obsidian
  - **Modern Themes**: Mystical, Tropical, Aurora, Phoenix
  - **Cool Themes**: Burgundy, Midnight, Arctic, Wine, Steel, Navy, Slate, Storm, Crimson, Royal Blue
  - **Dark Themes**: Black Gradient, Deep Black, Charcoal
  - **Elegant Themes**: Blush Pink, Lavender, Powder Blue, Soft Mint, Peach, Lilac, Ivory
- **Professional Implementation**: Complete theme system with color picker interface, real-time updates, and database persistence
- **User Interface**: Beautiful 3-column grid layout with emoji indicators and smooth animations
- **Performance Optimized**: Efficient theme application with CSS inline styles and WebSocket broadcasting

### UI Improvements - Optimized User Sidebar (January 11, 2025)
- **Compact Design**: Reduced sidebar width from 320px to 256px for better screen utilization
- **Enhanced Styling**: Changed from dark theme to clean white background with subtle shadows
- **Improved User Boxes**: Expanded padding for better touch interaction while reducing vertical spacing
- **Professional Appearance**: Clean white background with gray borders and proper contrast
- **Optimized Spacing**: Reduced vertical gaps between user entries for more compact display
- **Better Typography**: Improved text contrast and readability with proper color schemes

### Replit Integration
- **Development**: Special Replit plugins for development environment
- **Cartographer**: Replit's code mapping tool integration
- **Runtime Errors**: Replit error overlay for development debugging
- **Banner**: Development banner when running outside Replit environment