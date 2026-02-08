# Backend Documentation

Complete reference for the Express + Socket.IO backend application (`apps/backend/`).

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Directory Structure](#directory-structure)
- [Configuration](#configuration)
- [Prisma Database Schema](#prisma-database-schema)
- [Middleware](#middleware)
- [Lib Utilities](#lib-utilities)
- [Feature: Auth](#feature-auth)
- [Feature: Chat](#feature-chat)
- [Feature: AI](#feature-ai)
- [Feature: User](#feature-user)
- [Feature: Upload](#feature-upload)
- [Feature: Call](#feature-call)
- [Feature: Notification](#feature-notification)
- [Socket.IO](#socketio)
- [App Entry Points](#app-entry-points)
- [REST API Reference](#rest-api-reference)
- [Socket.IO Event Reference](#socketio-event-reference)

---

## Overview

The backend is a **Node.js** server built with **Express** for REST APIs and **Socket.IO** for real-time WebSocket communication. It connects to **PostgreSQL** (via Prisma ORM), **Redis** (via ioredis), and optionally **Google Gemini** (via `@google/generative-ai`) for AI-powered streaming responses.

The codebase follows a **feature-based folder structure** with the **Service → Controller → Router** pattern. All business logic lives in services, HTTP concerns in controllers, and route definitions in routers. Real-time events are handled by socket handlers.

---

## Tech Stack

| Category | Library | Version |
|----------|---------|---------|
| **Server** | Express | ^4.21.1 |
| **Real-Time** | Socket.IO | ^4.8.1 |
| **ORM** | Prisma Client | ^5.22.0 |
| **AI** | @google/generative-ai | ^0.21.0 |
| **Cache** | ioredis | ^5.4.1 |
| **Auth** | jsonwebtoken | ^9.0.2 |
| **Hashing** | bcryptjs | ^2.4.3 |
| **Validation** | Zod | ^3.23.8 |
| **Security** | Helmet | ^8.0.0 |
| **Rate Limiting** | express-rate-limit | ^7.4.1 |
| **File Upload** | Multer | ^1.4.5 |
| **Image Processing** | Sharp | ^0.33.x |
| **Environment** | dotenv | ^16.4.7 |
| **Dev Server** | tsx | ^4.19.2 |

---

## Directory Structure

```
apps/backend/
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript config (CommonJS output)
├── prisma/
│   └── schema.prisma           # 9 models, 7 enums
├── uploads/                    # User uploaded files (gitignored)
│
└── src/
    ├── index.ts                # Server entry: HTTP + Socket.IO + Redis
    ├── app.ts                  # Express app factory with middleware
    │
    ├── config/
    │   ├── env.ts              # Zod-validated environment variables
    │   ├── database.ts         # Prisma client singleton
    │   ├── redis.ts            # ioredis client + connection
    │   └── gemini.ts           # Gemini AI model (nullable) + system prompt
    │
    ├── lib/
    │   ├── api-error.ts        # Custom ApiError class
    │   ├── async-handler.ts    # Async route error wrapper
    │   ├── logger.ts           # Structured console logger
    │   └── socket-io.ts        # Socket.IO singleton (setIO/getIO)
    │
    ├── middleware/
    │   ├── auth.middleware.ts   # JWT verification + AuthRequest
    │   ├── rate-limit.middleware.ts  # Rate limiting (general + AI)
    │   ├── error.middleware.ts  # Global error handler
    │   └── validate.middleware.ts   # Zod validation factory
    │
    ├── features/
    │   ├── auth/
    │   │   ├── jwt.service.ts      # Sign/verify JWTs
    │   │   ├── auth.service.ts     # Signup, login, refresh, logout
    │   │   ├── auth.controller.ts  # HTTP handlers
    │   │   └── auth.router.ts      # Auth routes
    │   ├── chat/
    │   │   ├── chat.service.ts     # Conversations + messages + groups
    │   │   ├── chat.controller.ts  # HTTP handlers
    │   │   └── chat.router.ts      # Chat routes
    │   ├── ai/
    │   │   ├── context-manager.ts  # Context trimming algorithm
    │   │   ├── ai.service.ts       # Gemini streaming (with null guard)
    │   │   └── ai.controller.ts    # Summarize + smart replies
    │   ├── user/
    │   │   ├── user.service.ts     # Search, profile, blocking, presence
    │   │   ├── user.controller.ts  # HTTP handlers
    │   │   └── user.router.ts      # User routes
    │   ├── upload/
    │   │   ├── upload.service.ts   # Multer + Sharp processing
    │   │   └── upload.controller.ts # Upload endpoint
    │   ├── call/
    │   │   ├── call.service.ts     # Call initiate/accept/reject/end/history
    │   │   ├── call.controller.ts  # HTTP handlers
    │   │   └── call.router.ts      # Call routes
    │   └── notification/
    │       ├── notification.service.ts  # Create, list, unread count, mark read
    │       ├── notification.controller.ts # HTTP handlers
    │       └── notification.router.ts    # Notification routes
    │
    └── socket/
        ├── socket.handler.ts   # Socket.IO auth + user rooms + presence
        ├── chat.socket.ts      # Chat event handlers + @AI detection
        └── call.socket.ts      # WebRTC signaling relay
```

---

## Configuration

### `env.ts` — Environment Variables

Zod-validated environment schema. Throws on startup if required values are missing:

| Variable | Type | Default | Required |
|----------|------|---------|----------|
| `PORT` | number | `4000` | No |
| `DATABASE_URL` | string | — | Yes |
| `REDIS_URL` | string | `redis://localhost:6379` | No |
| `JWT_SECRET` | string (min 32) | — | Yes |
| `JWT_REFRESH_SECRET` | string (min 32) | — | Yes |
| `GEMINI_API_KEY` | string | `""` | No |
| `GEMINI_MODEL` | string | `gemini-2.0-flash` | No |
| `FRONTEND_URL` | string | `http://localhost:3000` | No |
| `NODE_ENV` | enum | `development` | No |

### `database.ts` — Prisma Client

Singleton Prisma client instance. Exported as `prisma` for use across all services.

### `redis.ts` — Redis Client

ioredis client with connection/error logging. Used for refresh token storage, rate limiting, and user presence tracking.

### `gemini.ts` — Gemini AI Client

Exports `geminiModel` which can be **null** if AI is not configured:

- Checks `GEMINI_API_KEY` against a `KNOWN_PLACEHOLDERS` array
- Validates key format: must start with `AIzaSy`
- If invalid: logs warning, exports `null`
- If valid: creates `GoogleGenerativeAI` instance and exports the model
- Also exports `SYSTEM_PROMPT` constant for AI personality

### `socket-io.ts` — Socket.IO Singleton

Provides `setIO(server)` and `getIO()` for accessing the Socket.IO instance from services (e.g., notification service broadcasting to user rooms).

---

## Prisma Database Schema

### Enums (7)

| Enum | Values |
|------|--------|
| `ConversationType` | `DIRECT`, `GROUP`, `AI_CHAT` |
| `MemberRole` | `OWNER`, `ADMIN`, `MEMBER` |
| `MessageType` | `TEXT`, `IMAGE`, `VIDEO`, `AUDIO`, `FILE`, `SYSTEM`, `AI_RESPONSE` |
| `MessageStatus` | `SENT`, `DELIVERED`, `READ` |
| `CallType` | `AUDIO`, `VIDEO` |
| `CallStatus` | `RINGING`, `ACTIVE`, `ENDED`, `MISSED`, `REJECTED` |
| `NotificationType` | `NEW_MESSAGE`, `MENTION`, `CALL_MISSED`, `GROUP_INVITE`, `AI_COMPLETE` |

### Models (9)

#### User

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK, auto-generated |
| `email` | String | Unique |
| `name` | String | Display name |
| `avatarUrl` | String? | Profile picture URL |
| `passwordHash` | String | bcrypt hashed |
| `bio` | String? | User biography |
| `status` | String? | Custom status text |
| `isOnline` | Boolean | Default: false |
| `lastSeenAt` | DateTime? | Last activity timestamp |

**Relations:** memberships[], sentMessages[], blocks[], blockedBy[], callerCalls[], calleeCalls[], notifications[]

#### Conversation

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `type` | ConversationType | Default: AI_CHAT |
| `title` | String | Default: "New Chat" |
| `groupName` | String? | For GROUP type |
| `description` | String? | Group description |
| `systemPrompt` | String? | Custom AI system prompt |
| `createdBy` | String | Creator's userId |

**Relations:** members[], messages[], calls[]
**Index:** updatedAt

#### ConversationMember

| Field | Type | Notes |
|-------|------|-------|
| `conversationId` | String | FK → Conversation (CASCADE) |
| `userId` | String | FK → User |
| `role` | MemberRole | Default: MEMBER |
| `isPinned` | Boolean | Default: false |
| `isMuted` | Boolean | Default: false |
| `joinedAt` | DateTime | Auto-set |

**Composite PK:** [conversationId, userId]
**Unique:** [conversationId, userId]

#### Message

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `content` | String | Message text |
| `type` | MessageType | Default: TEXT |
| `status` | MessageStatus | Default: SENT |
| `conversationId` | String | FK → Conversation (CASCADE) |
| `senderId` | String? | FK → User (SET NULL) |
| `replyToId` | String? | FK → Message self-ref (SET NULL) |
| `isEdited` | Boolean | Default: false |
| `isDeleted` | Boolean | Default: false |
| `tokenCount` | Int? | AI token count |

**Relations:** attachments[], reactions[], replyTo?, replies[]
**Index:** [conversationId, createdAt]

#### Attachment

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `messageId` | String | FK → Message (CASCADE) |
| `fileUrl` | String | Path to uploaded file |
| `thumbnailUrl` | String? | Path to thumbnail |
| `fileName` | String | Original filename |
| `fileSize` | Int | Size in bytes |
| `mimeType` | String | MIME type |
| `width` | Int? | Image/video width |
| `height` | Int? | Image/video height |
| `duration` | Float? | Audio/video duration |

#### Reaction

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `messageId` | String | FK → Message (CASCADE) |
| `userId` | String | FK → User (CASCADE) |
| `emoji` | String | Emoji character |

**Unique:** [messageId, userId, emoji]

#### Block

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `blockerId` | String | FK → User (CASCADE) |
| `blockedId` | String | FK → User (CASCADE) |

**Unique:** [blockerId, blockedId]

#### Call

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `conversationId` | String | FK → Conversation (CASCADE) |
| `callerId` | String | FK → User (CASCADE) |
| `calleeId` | String | FK → User (CASCADE) |
| `type` | CallType | AUDIO or VIDEO |
| `status` | CallStatus | Default: RINGING |
| `startedAt` | DateTime? | When call was accepted |
| `endedAt` | DateTime? | When call ended |
| `duration` | Int? | Duration in seconds |

#### Notification

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `userId` | String | FK → User (CASCADE) |
| `type` | NotificationType | Event type |
| `title` | String | Display title |
| `body` | String | Display body |
| `data` | Json? | Additional metadata |
| `isRead` | Boolean | Default: false |

**Index:** [userId, isRead]

---

## Middleware

### `auth.middleware.ts`

- Extracts `Bearer` token from `Authorization` header
- Verifies JWT signature and expiration using `JWT_SECRET`
- Attaches decoded payload to `req.user` as `{ userId, email }`
- Returns 401 if token is missing, expired, or invalid
- Extends Express `Request` as `AuthRequest` with typed `user` property

### `rate-limit.middleware.ts`

Two rate limiters exported:

| Limiter | Window | Max Requests | Applied To |
|---------|--------|--------------|------------|
| `generalLimiter` | 1 minute | 60 | All routes |
| `aiLimiter` | 1 minute | 20 | AI endpoints only |

### `validate.middleware.ts`

Factory function that accepts a Zod schema and returns Express middleware:
- Validates `req.body` against the schema
- On failure: returns 400 with field-level error details
- On success: replaces `req.body` with parsed (sanitized) data

### `error.middleware.ts`

Global error handler (4-arg Express middleware):
- `ApiError` instances → returns `{ message, errors? }` with appropriate status code
- Zod validation errors → returns 400 with formatted field errors
- Unknown errors → returns 500 with generic message
- Logs errors via structured logger

---

## Lib Utilities

### `api-error.ts`

Custom error class extending `Error`:
- `statusCode: number` — HTTP status
- `errors?: Record<string, string[]>` — field-level validation errors
- `isOperational: boolean` — distinguishes expected from unexpected errors

### `async-handler.ts`

Wraps async route handlers to catch rejected promises and forward to error middleware. Eliminates try/catch boilerplate in controllers.

### `logger.ts`

Structured console logger with methods:
- `info(message, data?)` — blue prefix
- `warn(message, data?)` — yellow prefix
- `error(message, data?)` — red prefix
- `debug(message, data?)` — gray prefix (dev only)

Includes timestamp and optional JSON data payload.

### `socket-io.ts`

Socket.IO singleton pattern:
- `setIO(server)` — called once during server initialization
- `getIO()` — returns the Socket.IO instance from anywhere in the app
- Used by notification service to broadcast to user rooms without passing `io` around

---

## Feature: Auth

### `jwt.service.ts`

| Function | Description |
|----------|-------------|
| `generateAccessToken(payload)` | Signs JWT with `JWT_SECRET`, expires in 15 minutes |
| `generateRefreshToken(payload)` | Signs JWT with `JWT_REFRESH_SECRET`, expires in 7 days |
| `verifyAccessToken(token)` | Verifies and decodes access token |
| `verifyRefreshToken(token)` | Verifies and decodes refresh token |

Payload: `{ userId: string, email: string }`

### `auth.service.ts`

| Function | Description |
|----------|-------------|
| `signup(name, email, password)` | Hash password (bcrypt, 12 rounds), create user, generate tokens, store refresh in Redis |
| `login(email, password)` | Find user, verify password, generate tokens, store refresh in Redis |
| `refreshTokens(refreshToken)` | Verify token, check exists in Redis, generate new pair, rotate in Redis |
| `logout(userId)` | Delete refresh token from Redis |
| `getProfile(userId)` | Return user without passwordHash |

### `auth.router.ts`

| Method | Path | Auth | Validation |
|--------|------|------|------------|
| `POST` | `/api/auth/signup` | No | signupSchema |
| `POST` | `/api/auth/login` | No | loginSchema |
| `POST` | `/api/auth/refresh` | No | — |
| `POST` | `/api/auth/logout` | Yes | — |
| `GET` | `/api/auth/me` | Yes | — |

---

## Feature: Chat

### Conversation Types

| Type | Description | Members |
|------|-------------|---------|
| `AI_CHAT` | User chats with AI | 1 user (OWNER) |
| `DIRECT` | 1:1 private messaging | 2 users |
| `GROUP` | Multi-user group chat | 2+ users with roles |

### `chat.service.ts` — Conversation Functions

| Function | Description |
|----------|-------------|
| `listConversations(userId, search?)` | List with unread counts, member info, sorted by pinned → updatedAt. Search filters by title/content (case-insensitive) |
| `createConversation(userId, data)` | Create AI_CHAT (single member), DIRECT (with participantId, deduplication), or GROUP (with groupName, memberIds) |
| `getConversation(id, userId)` | Get with membership check |
| `updateConversation(id, userId, data)` | Update title/groupName/description/systemPrompt. Admin check for groups |
| `deleteConversation(id, userId)` | Owner-only (or user's own AI_CHAT) |
| `togglePin(conversationId, userId)` | Toggle per-user pinning on ConversationMember |

### `chat.service.ts` — Message Functions

| Function | Description |
|----------|-------------|
| `getMessages(conversationId, userId, cursor?, limit?)` | Cursor-based pagination (default 50). Includes attachments, reactions, replyTo, sender |
| `saveMessage(data)` | Create message with optional attachments array, replyToId, type. Returns with relations |
| `editMessage(messageId, userId, content)` | Ownership check, sets isEdited=true |
| `softDeleteMessage(messageId, userId)` | Sets isDeleted=true, clears content |
| `deleteLastAssistantMessage(conversationId)` | Deletes last AI_RESPONSE message for regeneration |
| `toggleReaction(messageId, userId, emoji)` | Add if not exists, remove if exists. Unique per [messageId, userId, emoji] |

### `chat.service.ts` — Group Functions

| Function | Description |
|----------|-------------|
| `addGroupMember(conversationId, userId, targetUserId)` | Admin-only. Creates SYSTEM message: "User joined the group" |
| `removeGroupMember(conversationId, userId, targetUserId)` | Admin or self-leave. Creates SYSTEM message |
| `updateMemberRole(conversationId, userId, targetUserId, role)` | Owner-only. Can promote to ADMIN or demote to MEMBER |

### `chat.service.ts` — Export

| Function | Description |
|----------|-------------|
| `exportConversation(id, userId, format)` | Export as `json` (full data) or `markdown` (formatted text with timestamps) |

### `chat.router.ts`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/conversations` | List conversations |
| `POST` | `/api/conversations` | Create conversation |
| `GET` | `/api/conversations/:id` | Get single conversation |
| `PATCH` | `/api/conversations/:id` | Update conversation |
| `DELETE` | `/api/conversations/:id` | Delete conversation |
| `GET` | `/api/conversations/:id/messages` | Get messages (cursor pagination) |
| `GET` | `/api/conversations/:id/export` | Export conversation |
| `POST` | `/api/conversations/:id/members` | Add group member |
| `DELETE` | `/api/conversations/:id/members/:userId` | Remove group member |
| `PATCH` | `/api/conversations/:id/members/:userId/role` | Change member role |

---

## Feature: AI

### `context-manager.ts`

Builds conversation context for Gemini chat sessions:
- Takes recent messages from the conversation
- Trims to fit within limits: **20 messages** or **30,000 characters**
- Formats as Gemini-compatible message history (user/model roles)
- Supports custom system prompts per conversation

### `ai.service.ts`

| Function | Description |
|----------|-------------|
| `streamAIResponse(conversationId, userMessage, callbacks, abortSignal?, systemPrompt?)` | Streams response from Gemini with token-by-token callbacks |

**Null guard:** If `geminiModel` is null, immediately calls `onError` with a descriptive message.

**Callbacks:**
- `onChunk(text)` — emitted for each streamed token
- `onComplete(fullContent)` — emitted when generation finishes
- `onError(error)` — emitted on failure

**Abort support:** Accepts an `AbortSignal` to cancel generation mid-stream.

### `ai.controller.ts`

| Function | Endpoint | Description |
|----------|----------|-------------|
| `summarizeConversation` | `POST /api/conversations/:id/summarize` | Fetches last 100 messages, asks Gemini to generate a summary |
| `getSmartReplies` | `GET /api/conversations/:id/smart-replies` | Fetches last 5 messages, asks Gemini for 3 short reply suggestions |

Both endpoints check for `geminiModel` and throw `ApiError(503)` if AI is not configured.

---

## Feature: User

### `user.service.ts`

| Function | Description |
|----------|-------------|
| `searchUsers(query, currentUserId)` | Search by name or email (case-insensitive). Excludes self and blocked users |
| `getUserProfile(userId)` | Get user by ID (without passwordHash) |
| `updateProfile(userId, data)` | Update name, bio, status, avatarUrl |
| `setUserOnline(userId)` | Set `isOnline=true` in DB + create Redis presence key |
| `setUserOffline(userId)` | Set `isOnline=false` + `lastSeenAt=now()` in DB + delete Redis key |
| `isUserOnline(userId)` | Check Redis key for presence |
| `blockUser(blockerId, blockedId)` | Create Block record |
| `unblockUser(blockerId, blockedId)` | Delete Block record |
| `getBlockedUsers(userId)` | List all users blocked by caller |
| `isBlocked(userId1, userId2)` | Bidirectional check — returns true if either has blocked the other |

### `user.router.ts`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/users/search` | Search users (`?q=`) |
| `GET` | `/api/users/:id` | Get user profile |
| `PATCH` | `/api/users/profile` | Update own profile |
| `POST` | `/api/users/block/:id` | Block user |
| `DELETE` | `/api/users/block/:id` | Unblock user |
| `GET` | `/api/users/blocked` | List blocked users |

---

## Feature: Upload

### `upload.service.ts`

**Storage:** Multer disk storage in `uploads/` directory with UUID-based filenames.

**Allowed MIME Types:**

| Category | Types | Max Size |
|----------|-------|----------|
| Images | JPEG, PNG, GIF, WebP, SVG | 10 MB |
| Videos | MP4, WebM, MOV | 50 MB |
| Audio | MP3, WAV, OGG, WebM | 25 MB |
| Documents | PDF, Word, Excel, TXT, CSV, ZIP | 25 MB |

**Processing:**
- Images get a **200x200 thumbnail** generated via Sharp
- Metadata extraction: width/height for images, duration for audio/video
- Returns: `{ fileUrl, thumbnailUrl?, fileName, fileSize, mimeType }`

### Upload Endpoint

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/upload` | Upload file (multipart/form-data, field: `file`) |

---

## Feature: Call

### `call.service.ts`

| Function | Description |
|----------|-------------|
| `initiateCall(conversationId, callerId, calleeId, type)` | Create Call record (RINGING). Verifies both users are conversation members. Prevents concurrent calls in same conversation |
| `acceptCall(callId, userId)` | Verify callee, set status=ACTIVE + startedAt |
| `rejectCall(callId, userId)` | Verify callee, set status=REJECTED + endedAt |
| `endCall(callId, userId)` | Set status=ENDED + endedAt, calculate duration in seconds |
| `getCallHistory(userId, limit?)` | Paginated list of calls initiated or received by user |
| `getCall(callId)` | Get single call record with caller/callee info |

### `call.router.ts`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/calls` | Get call history |
| `GET` | `/api/calls/:id` | Get single call |

---

## Feature: Notification

### `notification.service.ts`

| Function | Description |
|----------|-------------|
| `createNotification(userId, type, title, body, data?)` | Create in DB + broadcast `NEW_NOTIFICATION` to `user:{userId}` room via Socket.IO |
| `getNotifications(userId, limit?, offset?)` | Paginated list with total count |
| `getUnreadCount(userId)` | Count where `isRead=false` |
| `markAsRead(notificationId, userId)` | Mark single notification as read |
| `markAllAsRead(userId)` | Mark all user notifications as read |

### `notification.router.ts`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/notifications` | Get notifications |
| `GET` | `/api/notifications/unread-count` | Get unread count |
| `PATCH` | `/api/notifications/:id/read` | Mark as read |
| `PATCH` | `/api/notifications/read-all` | Mark all as read |

---

## Socket.IO

### `socket.handler.ts` — Main Handler

**Authentication:**
- JWT token extracted from `socket.handshake.auth.token`
- Verified using `verifyAccessToken()`
- Rejected connections get `connection_error` event

**Multi-Device Tracking:**
- `userSockets: Map<string, Set<string>>` — maps userId to Set of socketIds
- Allows multiple browser tabs/devices per user

**Connection Lifecycle:**
```
On connect:
  1. Verify JWT token
  2. Add socketId to userSockets[userId]
  3. Join room: user:{userId}
  4. Join rooms for all user's conversations
  5. Set user online (DB + Redis)
  6. Broadcast USER_ONLINE to all connected users

On disconnect:
  1. Remove socketId from userSockets[userId]
  2. If no more sockets for user:
     a. Set user offline (DB + Redis + lastSeenAt)
     b. Broadcast USER_OFFLINE to all connected users
```

**Handler Registration:**
- Calls `chatSocketHandler(socket, io, userId)` for chat events
- Calls `callSocketHandler(socket, io, userId)` for call events

### `chat.socket.ts` — Chat Events

**Client → Server Events:**

| Event | Handler Logic |
|-------|--------------|
| `SEND_MESSAGE` | Save message to DB (with attachments, replyTo). Broadcast `NEW_MESSAGE` to conversation room. For AI_CHAT: auto-title on first message, then stream AI response. For non-AI: detect `@ai` mentions (case-insensitive) and trigger AI if found. Create notifications for offline members. Detect `@username` mentions for MENTION notifications. |
| `EDIT_MESSAGE` | Edit message in DB. Broadcast `MESSAGE_UPDATED`. For AI_CHAT: delete subsequent AI messages and regenerate |
| `DELETE_MESSAGE` | Soft-delete message. Broadcast `MESSAGE_DELETED` |
| `MESSAGE_REACTION` | Toggle reaction. Broadcast `MESSAGE_REACTION_UPDATED` with full reactions list |
| `MESSAGE_READ` | Update message status to READ. Broadcast `MESSAGE_STATUS_UPDATE` to sender |
| `TYPING_START` | Broadcast `TYPING` to conversation room (excluding sender) |
| `TYPING_STOP` | Broadcast `TYPING` to conversation room (excluding sender) |
| `STOP_GENERATION` | Abort the active AI generation via AbortController |
| `REGENERATE_RESPONSE` | Delete last AI message, then re-stream AI response |

**AI Streaming Helper (`streamToClient`):**
1. Creates `AbortController` stored per conversation
2. Emits `AI_STREAM_START` to room
3. On each chunk: emits `AI_STREAM_CHUNK`
4. On complete: saves AI message to DB, emits `AI_STREAM_END` with saved message ID
5. On error: emits `AI_STREAM_ERROR`
6. Cleans up AbortController reference

### `call.socket.ts` — Call Events

**Client → Server Events:**

| Event | Handler Logic |
|-------|--------------|
| `CALL_INITIATE` | Create call record via call.service. Emit `CALL_RINGING` to callee's `user:{calleeId}` room |
| `CALL_ACCEPT` | Update call status to ACTIVE. Emit `CALL_ACCEPTED` to caller's `user:{callerId}` room |
| `CALL_REJECT` | Update call status to REJECTED. Emit `CALL_REJECTED` to caller's room |
| `CALL_END` | Update call status to ENDED (with duration). Emit `CALL_ENDED` to other participant's room |
| `CALL_OFFER` | Relay SDP offer to other participant's room |
| `CALL_ANSWER` | Relay SDP answer to other participant's room |
| `CALL_ICE_CANDIDATE` | Relay ICE candidate to other participant's room |

**In-memory tracking:** Participant socketIds tracked per callId for targeted signaling relay.

---

## App Entry Points

### `app.ts` — Express App Factory

Creates and configures the Express application:

```
Middleware stack:
1. Helmet (security headers)
2. CORS (configurable origin from FRONTEND_URL)
3. Express JSON parser (1MB limit)
4. Cookie parser
5. General rate limiter (60 req/min)
6. Static file serving: /uploads → express.static('uploads')

Registered routes:
  GET  /health            → { status: "ok" }
  USE  /api/auth          → authRouter
  USE  /api/conversations → authMiddleware → chatRouter
  USE  /api/users         → authMiddleware → userRouter
  USE  /api/upload        → authMiddleware → uploadRouter
  USE  /api/calls         → authMiddleware → callRouter
  USE  /api/notifications → authMiddleware → notificationRouter

Error handler (last):
  errorMiddleware
```

### `index.ts` — Server Entry

1. Creates HTTP server from Express app
2. Initializes Socket.IO with CORS config
3. Calls `setIO(io)` to make Socket.IO accessible globally
4. Connects to Redis
5. Registers socket handler (`setupSocketHandler`)
6. Starts listening on `PORT`

---

## REST API Reference

### Authentication

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| `POST` | `/api/auth/signup` | No | `{ name, email, password }` | `{ user, tokens }` |
| `POST` | `/api/auth/login` | No | `{ email, password }` | `{ user, tokens }` |
| `POST` | `/api/auth/refresh` | No | `{ refreshToken }` | `{ tokens }` |
| `POST` | `/api/auth/logout` | Yes | — | `{ message }` |
| `GET` | `/api/auth/me` | Yes | — | `{ user }` |

### Conversations

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|-------------|----------|
| `GET` | `/api/conversations` | Yes | `?search=` | `Conversation[]` |
| `POST` | `/api/conversations` | Yes | `{ type?, title?, participantId?, groupName?, memberIds?, systemPrompt? }` | `Conversation` |
| `GET` | `/api/conversations/:id` | Yes | — | `Conversation` |
| `PATCH` | `/api/conversations/:id` | Yes | `{ title?, isPinned?, systemPrompt?, groupName?, description? }` | `Conversation` |
| `DELETE` | `/api/conversations/:id` | Yes | — | `{ message }` |
| `GET` | `/api/conversations/:id/messages` | Yes | `?cursor=&limit=50` | `{ messages, nextCursor }` |
| `GET` | `/api/conversations/:id/export` | Yes | `?format=json|markdown` | File download |
| `POST` | `/api/conversations/:id/members` | Yes | `{ userId }` | `{ member }` |
| `DELETE` | `/api/conversations/:id/members/:userId` | Yes | — | `{ message }` |
| `PATCH` | `/api/conversations/:id/members/:userId/role` | Yes | `{ role }` | `{ member }` |
| `POST` | `/api/conversations/:id/summarize` | Yes | — | `{ summary }` |
| `GET` | `/api/conversations/:id/smart-replies` | Yes | — | `{ replies: string[] }` |

### Users

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|-------------|----------|
| `GET` | `/api/users/search` | Yes | `?q=` | `UserPublic[]` |
| `GET` | `/api/users/:id` | Yes | — | `UserPublic` |
| `PATCH` | `/api/users/profile` | Yes | `{ name?, bio?, status?, avatarUrl? }` | `UserPublic` |
| `POST` | `/api/users/block/:id` | Yes | — | `{ message }` |
| `DELETE` | `/api/users/block/:id` | Yes | — | `{ message }` |
| `GET` | `/api/users/blocked` | Yes | — | `UserPublic[]` |

### Upload

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| `POST` | `/api/upload` | Yes | FormData (`file`) | `{ fileUrl, thumbnailUrl?, fileName, fileSize, mimeType }` |

### Calls

| Method | Path | Auth | Response |
|--------|------|------|----------|
| `GET` | `/api/calls` | Yes | `Call[]` |
| `GET` | `/api/calls/:id` | Yes | `Call` |

### Notifications

| Method | Path | Auth | Response |
|--------|------|------|----------|
| `GET` | `/api/notifications` | Yes | `{ notifications, total }` |
| `GET` | `/api/notifications/unread-count` | Yes | `{ count }` |
| `PATCH` | `/api/notifications/:id/read` | Yes | `{ notification }` |
| `PATCH` | `/api/notifications/read-all` | Yes | `{ message }` |

---

## Socket.IO Event Reference

### Client → Server (17 events)

| Event | Payload | Description |
|-------|---------|-------------|
| `JOIN_CONVERSATION` | `{ conversationId }` | Join conversation room |
| `LEAVE_CONVERSATION` | `{ conversationId }` | Leave conversation room |
| `SEND_MESSAGE` | `{ content, conversationId, replyToId?, type?, attachments? }` | Send message |
| `EDIT_MESSAGE` | `{ messageId, content }` | Edit message |
| `DELETE_MESSAGE` | `{ messageId, conversationId }` | Soft-delete message |
| `MESSAGE_REACTION` | `{ messageId, emoji, conversationId }` | Toggle reaction |
| `MESSAGE_READ` | `{ conversationId, messageIds }` | Mark as read |
| `TYPING_START` | `{ conversationId }` | Start typing |
| `TYPING_STOP` | `{ conversationId }` | Stop typing |
| `STOP_GENERATION` | `{ conversationId }` | Abort AI |
| `REGENERATE_RESPONSE` | `{ conversationId }` | Regenerate AI |
| `CALL_INITIATE` | `{ conversationId, calleeId, type }` | Start call |
| `CALL_ACCEPT` | `{ callId }` | Accept call |
| `CALL_REJECT` | `{ callId }` | Reject call |
| `CALL_END` | `{ callId }` | End call |
| `CALL_OFFER` | `{ callId, offer }` | SDP offer |
| `CALL_ANSWER` | `{ callId, answer }` | SDP answer |
| `CALL_ICE_CANDIDATE` | `{ callId, candidate }` | ICE candidate |

### Server → Client (24 events)

| Event | Payload | Description |
|-------|---------|-------------|
| `NEW_MESSAGE` | `{ message }` | New message saved |
| `MESSAGE_UPDATED` | `{ message }` | Message edited |
| `MESSAGE_DELETED` | `{ messageId, conversationId }` | Message deleted |
| `MESSAGE_REACTION_UPDATED` | `{ messageId, reactions }` | Reactions changed |
| `MESSAGE_STATUS_UPDATE` | `{ messageId, status }` | Status changed |
| `TYPING` | `{ conversationId, userId, userName, isTyping }` | Typing indicator |
| `AI_STREAM_START` | `{ messageId, conversationId }` | AI started |
| `AI_STREAM_CHUNK` | `{ chunk, conversationId }` | AI token |
| `AI_STREAM_END` | `{ content, conversationId, savedMessageId }` | AI finished |
| `AI_STREAM_ERROR` | `{ error, conversationId }` | AI failed |
| `CONVERSATION_UPDATED` | `{ conversation }` | Conversation changed |
| `CALL_RINGING` | `{ call }` | Incoming call |
| `CALL_ACCEPTED` | `{ callId }` | Call accepted |
| `CALL_REJECTED` | `{ callId }` | Call rejected |
| `CALL_ENDED` | `{ callId }` | Call ended |
| `CALL_OFFER` | `{ callId, offer }` | SDP offer relay |
| `CALL_ANSWER` | `{ callId, answer }` | SDP answer relay |
| `CALL_ICE_CANDIDATE` | `{ callId, candidate }` | ICE relay |
| `USER_ONLINE` | `{ userId }` | User came online |
| `USER_OFFLINE` | `{ userId }` | User went offline |
| `GROUP_MEMBER_ADDED` | `{ conversationId, userId }` | Member added |
| `GROUP_MEMBER_REMOVED` | `{ conversationId, userId }` | Member removed |
| `GROUP_UPDATED` | `{ conversation }` | Group settings changed |
| `NEW_NOTIFICATION` | `{ notification }` | New notification |
| `ERROR` | `{ message }` | Socket error |
