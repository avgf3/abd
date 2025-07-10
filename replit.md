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

### Replit Integration
- **Development**: Special Replit plugins for development environment
- **Cartographer**: Replit's code mapping tool integration
- **Runtime Errors**: Replit error overlay for development debugging
- **Banner**: Development banner when running outside Replit environment