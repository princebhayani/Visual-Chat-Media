# Visual Chat

A full-featured, real-time communication platform with AI-powered chat, direct messaging, group conversations, file sharing, audio/video calling, and notifications. Built with a modern monorepo architecture using Next.js 14, Express, Socket.IO, and Google Gemini.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [NPM Scripts](#npm-scripts)
- [REST API Reference](#rest-api-reference)
- [Socket.IO Events](#socketio-events)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Screenshots](#screenshots)

---

## Features

### Core AI Chat
- Real-time AI chat with **token-by-token streaming** responses from Google Gemini 2.0 Flash
- Conversation memory with intelligent **context trimming** (20 messages / 30,000 characters)
- **Message regeneration** — re-generate any AI response with one click
- **Message editing** — edit a user message and automatically re-generate the AI response from that point
- **Stop generation** — abort AI response mid-stream with AbortController
- **Custom system prompts** per conversation for different AI personas
- **Auto-title generation** — AI automatically names conversations based on the first message
- **Prompt suggestions** — 4 clickable starter prompts on empty AI conversations
- **Graceful degradation** — AI features disabled when no valid API key is configured

### Direct Messaging
- **1:1 conversations** between users with real-time message delivery
- **Online presence** — green dot indicators for online users
- **Typing indicators** — "User is typing..." with animated dots
- **Read receipts** — sent / delivered / read status with checkmark icons
- **Message status tracking** — SENT → DELIVERED → READ pipeline
- **Last seen timestamps** — "Last seen 5m ago" for offline users

### Group Chat
- **Create groups** with custom name, description, and member selection
- **Role-based access control** — OWNER, ADMIN, MEMBER roles
- **Member management** — add/remove members (admin-only), change roles (owner-only)
- **System messages** — automatic notifications when members join/leave
- **Group settings** — update group name, description

### Media & File Sharing
- **Image upload** (JPEG, PNG, GIF, WebP, SVG) — max 10 MB with thumbnail generation
- **Video upload** (MP4, WebM, MOV) — max 50 MB
- **Audio upload** (MP3, WAV, OGG, WebM) — max 25 MB
- **Document upload** (PDF, Word, Excel, TXT, CSV, ZIP) — max 25 MB
- **Upload progress** indicator with progress bar
- **Inline media viewer** — images (expandable), video player, audio player, file download links
- **Thumbnail generation** — 200x200 Sharp-generated thumbnails for images

### Audio & Video Calling
- **WebRTC peer-to-peer** audio and video calls
- **Incoming call dialog** with caller info, accept/reject buttons
- **Call controls** — mute microphone, toggle camera, end call
- **Call timer** — live duration display (mm:ss)
- **Call history** — searchable log of past calls
- **ICE candidate queuing** for reliable connection establishment
- **STUN server** support for NAT traversal

### AI in Multi-User Chats
- **@AI mentions** — type `@ai` in any conversation to trigger an AI response (case-insensitive)
- **Conversation summarization** — AI-generated summary of conversation history
- **Smart reply suggestions** — AI suggests 3 contextual reply options
- **Error feedback** — visible error messages in chat when AI fails

### Notifications & Presence
- **Real-time notifications** via Socket.IO push to user rooms
- **Notification popover** with scrollable list and unread count badge
- **Mark as read** — individual or bulk mark-all-read
- **Notification types** — new message, @mention, missed call, group invite, AI complete
- **Online/offline tracking** — Redis-backed presence with multi-device support
- **Presence broadcast** — instant online/offline updates to all connected users

### Messages
- **Markdown rendering** with syntax-highlighted code blocks (Prism.js, oneDark theme)
- **Copy button** on every code block and message
- **Styled tables, blockquotes, lists, and links** with external link indicators
- **Emoji reactions** — toggle reactions on any message with emoji picker
- **Message replies** — quote and reply to specific messages with preview
- **Message editing** with "edited" indicator
- **Soft delete** — messages marked as deleted, content cleared
- **Message types** — TEXT, IMAGE, VIDEO, AUDIO, FILE, SYSTEM, AI_RESPONSE
- Timestamps with hover toolbar (copy, regenerate, edit, reply, react)

### UI & Design
- **Glassmorphism design** with frosted glass panels and backdrop-blur effects
- **Gradient accents** — violet-to-purple-to-cyan gradients on buttons, borders, and highlights
- **Dark-first design** with seamless light mode toggle
- **Framer Motion animations** — page transitions, message entrances, sidebar collapse, button interactions
- **Custom thin scrollbar** matching the theme
- **Responsive mobile layout** with collapsible sidebar
- **Skeleton loading states** with shimmer effects for conversations and messages
- **Conversation type icons** — Bot (AI), MessageSquare (DM), Users (Group)

### Authentication & Security
- **JWT authentication** with access tokens (15 min) and refresh tokens (7 days)
- **Refresh token rotation** stored in Redis for revocation capability
- **Bcrypt password hashing** with 12 salt rounds
- **Rate limiting** — 60 requests/min general, 20 requests/min for AI endpoints
- **Helmet security headers** and CORS protection
- **Zod validation** on all API inputs (shared between frontend and backend)
- **User blocking** — block/unblock users, bidirectional checks on DMs
- **File upload validation** — MIME type whitelist and size limits
- **Gemini API key validation** — format check (`AIzaSy` prefix) and placeholder detection

### Real-Time
- **Socket.IO WebSocket** connection with JWT authentication
- **Room-based isolation** — `conversation:{id}` for chats, `user:{userId}` for personal events
- **Multi-device support** — per-user socket tracking via `Map<userId, Set<socketIds>>`
- Real-time message delivery, typing indicators, reactions, and call signaling
- Connection status indicator (green = connected, red = disconnected)
- Automatic reconnection (5 attempts, 1-5 second delay)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript |
| **Styling** | Tailwind CSS, ShadCN UI (Radix primitives), Framer Motion |
| **State** | Zustand (7 stores: auth, chat, message, ui, call, notification, user) |
| **Backend** | Node.js, Express, TypeScript |
| **Real-Time** | Socket.IO (WebSocket + polling fallback) |
| **AI** | Google Gemini API (`@google/generative-ai`) — optional |
| **Database** | PostgreSQL (via Prisma ORM) — 9 models, 7 enums |
| **Cache** | Redis (via ioredis) — refresh tokens, rate limiting, presence |
| **Auth** | JWT (jsonwebtoken), bcryptjs |
| **Calls** | WebRTC with Socket.IO signaling relay |
| **File Processing** | Multer (upload), Sharp (image thumbnails) |
| **Validation** | Zod (shared schemas between frontend and backend) |
| **Monorepo** | npm workspaces |

---

## Project Structure

```
visual-chat-media2/
├── package.json                          # Root workspace config
├── tsconfig.base.json                    # Shared TypeScript config
├── .env.example                          # Environment template
├── .gitignore
├── README.md                             # This file
├── ARCHITECTURE.md                       # Architecture deep-dive
│
├── packages/
│   └── shared/                           # Shared types, schemas, constants
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                  # Barrel export
│           ├── types/
│           │   ├── user.ts               # User, UserPublic
│           │   ├── message.ts            # Message, Attachment, Reaction, StreamingMessage
│           │   ├── conversation.ts       # Conversation, ConversationMember, ConversationType
│           │   ├── auth.ts               # AuthTokens, LoginResponse
│           │   ├── call.ts               # Call, CallType, CallStatus
│           │   ├── notification.ts       # Notification, NotificationType
│           │   └── socket-events.ts      # Typed client/server event maps
│           ├── schemas/
│           │   ├── auth.schema.ts        # signupSchema, loginSchema
│           │   ├── message.schema.ts     # sendMessageSchema, editMessageSchema
│           │   └── conversation.schema.ts # createConversation, updateConversation
│           └── constants/
│               └── socket-events.ts      # SOCKET_EVENTS constant object
│
├── apps/
│   ├── backend/                          # Express + Socket.IO + Prisma
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── prisma/
│   │   │   └── schema.prisma            # 9 models, 7 enums
│   │   ├── uploads/                     # User uploaded files (gitignored)
│   │   └── src/
│   │       ├── index.ts                 # HTTP server + Socket.IO + Redis entry
│   │       ├── app.ts                   # Express app factory
│   │       ├── config/
│   │       │   ├── env.ts               # Zod-validated environment
│   │       │   ├── database.ts          # Prisma singleton
│   │       │   ├── redis.ts             # ioredis client
│   │       │   └── gemini.ts            # Gemini AI client (nullable)
│   │       ├── lib/
│   │       │   ├── api-error.ts         # Custom ApiError class
│   │       │   ├── async-handler.ts     # Async route wrapper
│   │       │   ├── logger.ts            # Structured console logger
│   │       │   └── socket-io.ts         # Socket.IO singleton (setIO/getIO)
│   │       ├── middleware/
│   │       │   ├── auth.middleware.ts    # JWT verification + AuthRequest
│   │       │   ├── rate-limit.middleware.ts # Rate limiting
│   │       │   ├── error.middleware.ts   # Global error handler
│   │       │   └── validate.middleware.ts # Zod validation
│   │       ├── features/
│   │       │   ├── auth/                # Signup, login, refresh, logout
│   │       │   ├── chat/                # Conversations, messages, groups, reactions, export
│   │       │   ├── ai/                  # Context manager, streaming, summarize, smart replies
│   │       │   ├── user/                # Search, profile, blocking, presence
│   │       │   ├── upload/              # Multer + Sharp file processing
│   │       │   ├── call/                # Call initiate, accept, reject, end, history
│   │       │   └── notification/        # Create, list, unread count, mark read
│   │       └── socket/
│   │           ├── socket.handler.ts    # Auth, user rooms, presence tracking
│   │           ├── chat.socket.ts       # Chat events, @AI detection, notifications
│   │           └── call.socket.ts       # WebRTC signaling (offer/answer/ICE)
│   │
│   └── frontend/                         # Next.js 14 App Router
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.mjs
│       ├── tailwind.config.ts
│       ├── postcss.config.js
│       ├── components.json              # ShadCN config
│       └── src/
│           ├── styles/
│           │   └── globals.css          # CSS vars, glassmorphism, animations
│           ├── lib/
│           │   ├── utils.ts             # cn(), formatRelativeTime, helpers
│           │   ├── constants.ts         # API_URL, SOCKET_URL, shortcuts
│           │   ├── api-client.ts        # Fetch wrapper with auto-refresh + upload
│           │   └── socket-client.ts     # Socket.IO singleton
│           ├── store/
│           │   ├── auth-store.ts        # Auth state + localStorage
│           │   ├── chat-store.ts        # Conversations state
│           │   ├── message-store.ts     # Messages + streaming state
│           │   ├── ui-store.ts          # Sidebar, search, modals, settings
│           │   ├── call-store.ts        # Call state, streams, mute/camera
│           │   ├── notification-store.ts # Notifications + unread count
│           │   └── user-store.ts        # Online users + profile cache
│           ├── providers/
│           │   ├── theme-provider.tsx    # next-themes wrapper
│           │   ├── auth-provider.tsx     # Token validation on mount
│           │   ├── socket-provider.tsx   # Socket.IO lifecycle
│           │   └── call-provider.tsx     # Call UI (incoming dialog + active call)
│           ├── hooks/
│           │   ├── use-socket.ts        # Socket context wrapper
│           │   ├── use-conversations.ts # Conversation CRUD (DM/Group/AI)
│           │   ├── use-messages.ts      # Message fetching + listeners
│           │   ├── use-streaming.ts     # AI stream handlers + error feedback
│           │   ├── use-call.ts          # WebRTC peer connection management
│           │   ├── use-typing.ts        # Typing indicators
│           │   ├── use-presence.ts      # Online/offline tracking
│           │   ├── use-notifications.ts # Real-time notifications
│           │   ├── use-file-upload.ts   # File upload with progress
│           │   ├── use-message-status.ts # Read receipts
│           │   ├── use-keyboard-shortcuts.ts # Global shortcuts
│           │   ├── use-clipboard.ts     # Copy with feedback
│           │   └── use-media-query.ts   # Responsive detection
│           ├── components/
│           │   ├── ui/                  # ShadCN base components (10 files)
│           │   ├── auth/                # Auth components (3 files)
│           │   ├── chat/                # Chat components (15 files)
│           │   ├── call/                # Call components (4 files)
│           │   └── layout/              # Layout components (8 files)
│           └── app/
│               ├── layout.tsx           # Root layout with providers
│               ├── page.tsx             # Home redirect
│               ├── (auth)/
│               │   ├── layout.tsx       # Gradient background
│               │   ├── login/page.tsx
│               │   └── signup/page.tsx
│               └── (main)/
│                   ├── layout.tsx       # AuthGuard + Socket + Call + Settings
│                   ├── chat/page.tsx    # New conversation view
│                   └── chat/[conversationId]/page.tsx # Chat view
│
└── docs/
    ├── FRONTEND.md                       # Frontend documentation
    └── BACKEND.md                        # Backend documentation
```

---

## Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Node.js** | >= 18.0.0 | JavaScript runtime |
| **npm** | >= 9.0.0 | Package manager (ships with Node) |
| **PostgreSQL** | >= 14 | Primary database |
| **Redis** | >= 6 | Refresh tokens, rate limiting, presence |
| **Google Gemini API Key** | — | AI features (optional — app works without it) |

---

## Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd visual-chat-media2

# 2. Install all dependencies (root + all workspaces)
npm install

# 3. Copy the environment template
cp .env.example .env

# 4. Fill in your .env values (see Environment Variables section below)

# 5. Generate the Prisma client
npm run db:generate

# 6. Push the schema to your PostgreSQL database
npm run db:push

# 7. Start the development servers
npm run dev
```

The `npm run dev` command starts both servers concurrently:
- **Frontend** — `http://localhost:3000`
- **Backend** — `http://localhost:4000`

---

## Environment Variables

Create a `.env` file in the project root with these variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string. Format: `postgresql://USER:PASS@HOST:PORT/DB?schema=public` |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection URL |
| `JWT_SECRET` | Yes | — | Secret key for signing access tokens. **Minimum 32 characters** |
| `JWT_REFRESH_SECRET` | Yes | — | Secret key for signing refresh tokens. **Minimum 32 characters** |
| `GEMINI_API_KEY` | No | `""` | Google AI Studio API key. **Optional** — AI features are disabled if empty or invalid. Must start with `AIzaSy`. Get one at [aistudio.google.com](https://aistudio.google.com/) |
| `GEMINI_MODEL` | No | `gemini-2.0-flash` | Gemini model identifier |
| `PORT` | No | `4000` | Backend server port |
| `FRONTEND_URL` | No | `http://localhost:3000` | Frontend URL for CORS configuration |
| `NODE_ENV` | No | `development` | Environment: `development`, `production`, or `test` |
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:4000` | Backend API URL (accessible from browser) |
| `NEXT_PUBLIC_SOCKET_URL` | No | `http://localhost:4000` | Socket.IO server URL (accessible from browser) |

**Example `.env` file:**

```env
# Database
DATABASE_URL="postgresql://postgres:mypassword@localhost:5432/visual_chat?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT (use long random strings — at least 32 characters)
JWT_SECRET="your-super-secret-jwt-key-at-least-32-characters-long"
JWT_REFRESH_SECRET="your-refresh-token-secret-at-least-32-characters-long"

# Google Gemini AI (optional — leave empty to disable AI features)
GEMINI_API_KEY="AIza..."
GEMINI_MODEL="gemini-2.0-flash"

# Server
PORT=4000
FRONTEND_URL="http://localhost:3000"

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:4000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:4000"
```

---

## Database Setup

The application uses **PostgreSQL** with **Prisma ORM**. The database has 9 models and 7 enums:

**Models:** User, Conversation, ConversationMember, Message, Attachment, Reaction, Block, Call, Notification

**Enums:** ConversationType, MemberRole, MessageType, MessageStatus, CallType, CallStatus, NotificationType

```bash
# Generate the Prisma client (TypeScript types from schema)
npm run db:generate

# Push the schema to your database (creates/updates tables)
npm run db:push

# Open Prisma Studio (visual database browser)
npm run db:studio
```

**Important:** Make sure your PostgreSQL server is running and the `DATABASE_URL` in `.env` is correct before running these commands.

---

## Running the Application

### Development

```bash
# Start both frontend and backend concurrently
npm run dev

# Or start them individually:
npm -w apps/frontend run dev    # Frontend on http://localhost:3000
npm -w apps/backend run dev     # Backend on http://localhost:4000
```

### Production Build

```bash
# Build all packages
npm run build

# The frontend builds to apps/frontend/.next/
# The backend compiles to apps/backend/dist/
```

---

## NPM Scripts

Run from the project root:

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start frontend + backend concurrently (hot reload) |
| `build` | `npm run build` | Build both frontend and backend for production |
| `db:generate` | `npm run db:generate` | Generate Prisma client from schema |
| `db:push` | `npm run db:push` | Push Prisma schema to database |
| `db:studio` | `npm run db:studio` | Open Prisma Studio GUI |

---

## REST API Reference

Base URL: `http://localhost:4000`

### Health Check

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | Returns `{ status: "ok" }` |

### Authentication (`/api/auth`)

| Method | Path | Auth | Request Body | Description |
|--------|------|------|-------------|-------------|
| `POST` | `/api/auth/signup` | No | `{ name, email, password }` | Create a new account |
| `POST` | `/api/auth/login` | No | `{ email, password }` | Login with credentials |
| `POST` | `/api/auth/refresh` | No | `{ refreshToken }` | Exchange refresh token for new pair |
| `POST` | `/api/auth/logout` | Yes | — | Revoke refresh token |
| `GET` | `/api/auth/me` | Yes | — | Get current user profile |

### Conversations (`/api/conversations`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/conversations` | Yes | List all conversations (search via `?search=`) |
| `POST` | `/api/conversations` | Yes | Create conversation (AI_CHAT, DIRECT, or GROUP) |
| `GET` | `/api/conversations/:id` | Yes | Get a single conversation with metadata |
| `PATCH` | `/api/conversations/:id` | Yes | Update title, pin, system prompt, group settings |
| `DELETE` | `/api/conversations/:id` | Yes | Delete conversation (owner-only) |
| `GET` | `/api/conversations/:id/messages` | Yes | Get messages with cursor-based pagination |
| `GET` | `/api/conversations/:id/export` | Yes | Export as JSON or Markdown (`?format=`) |
| `POST` | `/api/conversations/:id/members` | Yes | Add group member (admin-only) |
| `DELETE` | `/api/conversations/:id/members/:userId` | Yes | Remove group member |
| `PATCH` | `/api/conversations/:id/members/:userId/role` | Yes | Change member role (owner-only) |
| `POST` | `/api/conversations/:id/summarize` | Yes | AI-generated conversation summary |
| `GET` | `/api/conversations/:id/smart-replies` | Yes | AI-suggested reply options |

### Users (`/api/users`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/users/search` | Yes | Search users by name/email (`?q=`) |
| `GET` | `/api/users/:id` | Yes | Get user profile |
| `PATCH` | `/api/users/profile` | Yes | Update own profile (name, bio, status, avatar) |
| `POST` | `/api/users/block/:id` | Yes | Block a user |
| `DELETE` | `/api/users/block/:id` | Yes | Unblock a user |
| `GET` | `/api/users/blocked` | Yes | List blocked users |

### Upload (`/api/upload`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/upload` | Yes | Upload file (multipart/form-data, field: `file`) |

### Calls (`/api/calls`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/calls` | Yes | Get call history |
| `GET` | `/api/calls/:id` | Yes | Get single call record |

### Notifications (`/api/notifications`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/notifications` | Yes | Get notifications (paginated) |
| `GET` | `/api/notifications/unread-count` | Yes | Get unread notification count |
| `PATCH` | `/api/notifications/:id/read` | Yes | Mark notification as read |
| `PATCH` | `/api/notifications/read-all` | Yes | Mark all notifications as read |

---

## Socket.IO Events

Connect with: `io("http://localhost:4000", { auth: { token: "jwt-access-token" } })`

### Client to Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join-conversation` | `{ conversationId }` | Join a conversation room |
| `leave-conversation` | `{ conversationId }` | Leave a conversation room |
| `send-message` | `{ content, conversationId, replyToId?, type?, attachments? }` | Send a message |
| `edit-message` | `{ messageId, content }` | Edit a message |
| `delete-message` | `{ messageId, conversationId }` | Soft-delete a message |
| `message-reaction` | `{ messageId, emoji, conversationId }` | Toggle emoji reaction |
| `message-read` | `{ conversationId, messageIds }` | Mark messages as read |
| `typing-start` | `{ conversationId }` | Start typing indicator |
| `typing-stop` | `{ conversationId }` | Stop typing indicator |
| `stop-generation` | `{ conversationId }` | Abort AI generation mid-stream |
| `regenerate-response` | `{ conversationId }` | Delete last AI message and regenerate |
| `call-initiate` | `{ conversationId, calleeId, type }` | Start audio/video call |
| `call-accept` | `{ callId }` | Accept incoming call |
| `call-reject` | `{ callId }` | Reject incoming call |
| `call-end` | `{ callId }` | End active call |
| `call-offer` | `{ callId, offer }` | Send WebRTC SDP offer |
| `call-answer` | `{ callId, answer }` | Send WebRTC SDP answer |
| `call-ice-candidate` | `{ callId, candidate }` | Send ICE candidate |

### Server to Client

| Event | Payload | Description |
|-------|---------|-------------|
| `new-message` | `{ message }` | A new message was saved |
| `message-updated` | `{ message }` | A message was edited |
| `message-deleted` | `{ messageId, conversationId }` | A message was deleted |
| `message-reaction-updated` | `{ messageId, reactions }` | Reactions changed on a message |
| `message-status-update` | `{ messageId, status }` | Message delivery/read status changed |
| `typing` | `{ conversationId, userId, userName, isTyping }` | Typing indicator update |
| `ai-stream-start` | `{ messageId, conversationId }` | AI started generating |
| `ai-stream-chunk` | `{ chunk, conversationId }` | AI response token |
| `ai-stream-end` | `{ content, conversationId, savedMessageId }` | AI finished generating |
| `ai-stream-error` | `{ error, conversationId }` | AI generation failed |
| `conversation-updated` | `{ conversation }` | Conversation metadata changed |
| `call-ringing` | `{ call }` | Incoming call alert |
| `call-accepted` | `{ callId }` | Call was accepted |
| `call-rejected` | `{ callId }` | Call was rejected |
| `call-ended` | `{ callId }` | Call ended |
| `call-offer` | `{ callId, offer }` | WebRTC SDP offer received |
| `call-answer` | `{ callId, answer }` | WebRTC SDP answer received |
| `call-ice-candidate` | `{ callId, candidate }` | ICE candidate received |
| `user-online` | `{ userId }` | A user came online |
| `user-offline` | `{ userId }` | A user went offline |
| `group-member-added` | `{ conversationId, userId }` | Member added to group |
| `group-member-removed` | `{ conversationId, userId }` | Member removed from group |
| `group-updated` | `{ conversation }` | Group settings changed |
| `new-notification` | `{ notification }` | New notification received |
| `error` | `{ message }` | General socket error |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open conversation search |
| `Ctrl/Cmd + N` | Create new conversation |
| `Ctrl/Cmd + Shift + S` | Toggle sidebar collapse |
| `Ctrl/Cmd + Shift + D` | Toggle dark/light theme |
| `?` | Show keyboard shortcuts dialog |
| `Escape` | Stop AI generation / Close modals |
| `Enter` | Send message |
| `Shift + Enter` | New line in message input |

---

## Screenshots

> Screenshots will be added here once the application is running.

| View | Description |
|------|-------------|
| Login | Glassmorphic login form with gradient branding |
| Chat | Main chat interface with sidebar and message bubbles |
| Group Chat | Group conversation with member list and roles |
| Direct Message | 1:1 chat with typing indicators and read receipts |
| AI Chat | Streaming AI responses with prompt suggestions |
| Video Call | Active video call with local/remote video and controls |
| File Sharing | Image/video/audio/document attachments in messages |
| Notifications | Notification popover with unread badge |
| Dark Mode | Full dark theme with luminous accents |
| Mobile | Responsive mobile layout with slide-out sidebar |

---

## License

This project is private and not licensed for public distribution.
