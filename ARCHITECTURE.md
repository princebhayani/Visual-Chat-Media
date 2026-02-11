# Architecture Guide

A comprehensive deep-dive into the system architecture of the Visual Chat platform.

---

## Table of Contents

- [High-Level Architecture](#high-level-architecture)
- [Monorepo Design](#monorepo-design)
- [Data Flow Diagrams](#data-flow-diagrams)
- [Database Schema](#database-schema)
- [Backend Architecture](#backend-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Shared Package](#shared-package)
- [Security Architecture](#security-architecture)
- [Design System](#design-system)

---

## High-Level Architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                                │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                      Next.js 14 (App Router)                        │  │
│  │                                                                     │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────┐  │  │
│  │  │  Zustand     │  │  Socket.IO   │  │  API Client  │  │ WebRTC  │  │  │
│  │  │  Stores (7)  │  │  Client      │  │  (fetch +    │  │ Peer    │  │  │
│  │  │             │  │              │  │   refresh)   │  │ Conn.   │  │  │
│  │  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘  └────┬────┘  │  │
│  └─────────┼────────────────┼──────────────────┼───────────────┼───────┘  │
│            │                │                  │               │          │
└────────────┼────────────────┼──────────────────┼───────────────┼──────────┘
             │           WebSocket           HTTP REST       P2P Media
             │           (wss://)            (https://)      (SRTP/DTLS)
             │                │                  │               │
┌────────────┼────────────────┼──────────────────┼───────────────┼──────────┐
│            │          SERVER (Node.js)         │               │          │
│            │                │                  │               │          │
│  ┌─────────┼────────────────┼──────────────────┼───────────────┼───────┐  │
│  │         │         ┌──────┴───────┐   ┌──────┴────────────┐  │       │  │
│  │         │         │  Socket.IO   │   │   Express Server  │  │       │  │
│  │         │         │  Server      │   │                   │  │       │  │
│  │         │         │  ┌─────────┐ │   │  ┌──────────────┐ │  │       │  │
│  │         │         │  │ Rooms:  │ │   │  │  Middleware   │ │  │       │  │
│  │         │         │  │ conv:id │ │   │  │  Pipeline     │ │  │       │  │
│  │         │         │  │ user:id │ │   │  └──────────────┘ │  │       │  │
│  │         │         │  └─────────┘ │   │  ┌──────────────┐ │  │       │  │
│  │         │         │  ┌─────────┐ │   │  │  Features:   │ │  │       │  │
│  │         │         │  │Handlers:│ │   │  │  auth        │ │  │       │  │
│  │         │         │  │ chat    │ │   │  │  chat        │ │  │       │  │
│  │         │         │  │ call    │ │   │  │  ai          │ │  │       │  │
│  │         │         │  └─────────┘ │   │  │  user        │ │  │       │  │
│  │         │         └──────┬───────┘   │  │  upload      │ │  │       │  │
│  │         │                │           │  │  call        │ │  │       │  │
│  │         │                │           │  │  notification│ │  │       │  │
│  │         │                │           │  └──────────────┘ │  │       │  │
│  │         │                │           └────────┬──────────┘  │       │  │
│  │         │         ┌──────┴────────────────────┴──────────┐  │       │  │
│  │         │         │            AI Service                │  │       │  │
│  │         │         │  ┌──────────────┐  ┌──────────────┐  │  │       │  │
│  │         │         │  │   Context    │  │   Gemini     │  │  │       │  │
│  │         │         │  │   Manager    │──│   Streaming  │  │  │       │  │
│  │         │         │  └──────────────┘  └──────────────┘  │  │       │  │
│  │         │         └──────────────────────────────────────┘  │       │  │
│  └─────────┼──────────────────────────────────────────────────┘       │  │
│            │                                                          │  │
└────────────┼──────────────────────────────────────────────────────────┘  │
             │                                                             │
    ┌────────┼─────────────────────────────────────────────────┐           │
    │        │             DATA LAYER                          │           │
    │  ┌─────┴──────┐   ┌───────────────┐   ┌─────────────┐   │           │
    │  │ PostgreSQL  │   │    Redis       │   │   File      │   │           │
    │  │             │   │               │   │   Storage   │   │           │
    │  │ 9 Models    │   │ - Refresh     │   │             │   │           │
    │  │ 7 Enums     │   │   Tokens      │   │ - Images    │   │           │
    │  │             │   │ - Rate Limits │   │ - Videos    │   │           │
    │  │ - Users     │   │ - Presence    │   │ - Audio     │   │           │
    │  │ - Convos    │   │               │   │ - Documents │   │           │
    │  │ - Messages  │   │               │   │             │   │           │
    │  │ - Calls     │   │               │   │ (Multer +   │   │           │
    │  │ - Notifs    │   │               │   │  Sharp)     │   │           │
    │  └─────────────┘   └───────────────┘   └─────────────┘   │           │
    └──────────────────────────────────────────────────────────┘           │
                                                                           │
    ┌──────────────────────────────┐                                        │
    │      STUN/TURN Servers       │◄───────────────────────────────────────┘
    │  (ICE Candidate Discovery)   │
    └──────────────────────────────┘
```

---

## Monorepo Design

```
visual-chat-media2/                   # npm workspaces root
├── packages/shared/                  # @ai-chat/shared — types, schemas, constants
├── apps/backend/                     # @ai-chat/backend — Express + Socket.IO
└── apps/frontend/                    # @ai-chat/frontend — Next.js 14
```

### Workspace Dependencies

```
@ai-chat/frontend ──depends──► @ai-chat/shared
@ai-chat/backend  ──depends──► @ai-chat/shared
```

### Build Chain

1. `packages/shared` — pure TypeScript, no build step (consumed as source via `transpilePackages`)
2. `apps/backend` — compiled by `tsx` (dev) or `tsc` (production) to CommonJS
3. `apps/frontend` — compiled by Next.js (webpack/turbopack) to optimized bundles

### Shared Configuration

- `tsconfig.base.json` — common TS config (strict mode, ES2022, path aliases)
- `.env` — single environment file at root, consumed by both apps
- `.gitignore` — shared ignore rules (node_modules, dist, .next, uploads)

---

## Data Flow Diagrams

### 1. Authentication Flow

```
┌────────┐         ┌─────────┐         ┌──────────┐         ┌───────┐
│ Client │         │ Express │         │ Auth     │         │ Redis │
│        │         │         │         │ Service  │         │       │
└───┬────┘         └────┬────┘         └────┬─────┘         └───┬───┘
    │  POST /auth/login  │                  │                   │
    │───────────────────►│  login(creds)     │                   │
    │                    │─────────────────►│                   │
    │                    │                  │ verify password    │
    │                    │                  │ (bcrypt compare)   │
    │                    │                  │                   │
    │                    │                  │ generate tokens    │
    │                    │                  │                   │
    │                    │                  │  store refresh     │
    │                    │                  │─────────────────►│
    │                    │                  │                   │
    │  { user, tokens }  │  { user, tokens} │                   │
    │◄───────────────────│◄─────────────────│                   │
    │                    │                  │                   │
    │  Store in Zustand  │                  │                   │
    │  + localStorage    │                  │                   │
```

### 2. Real-Time Chat Message Flow

```
┌──────────┐       ┌───────────┐       ┌──────────┐       ┌──────────┐
│ Sender   │       │ Socket.IO │       │ Chat     │       │ Other    │
│ Client   │       │ Server    │       │ Service  │       │ Clients  │
└────┬─────┘       └─────┬─────┘       └────┬─────┘       └────┬─────┘
     │  SEND_MESSAGE      │                  │                   │
     │───────────────────►│  saveMessage()   │                   │
     │                    │─────────────────►│                   │
     │                    │                  │ Save to DB         │
     │                    │                  │ + attachments      │
     │                    │  saved message   │                   │
     │                    │◄─────────────────│                   │
     │                    │                  │                   │
     │                    │  Detect @ai?     │                   │
     │                    │  (case-insensitive)                  │
     │                    │                  │                   │
     │                    │  NEW_MESSAGE     │                   │
     │◄───────────────────│─────────────────────────────────────►│
     │                    │                  │                   │
     │                    │  Offline users?  │                   │
     │                    │  → Create notification               │
     │                    │  → Emit to user:{userId} room        │
```

### 3. AI Streaming Flow

```
┌──────────┐       ┌───────────┐       ┌──────────┐       ┌──────────┐
│ Client   │       │ Socket.IO │       │ AI       │       │ Gemini   │
│          │       │ Server    │       │ Service  │       │ API      │
└────┬─────┘       └─────┬─────┘       └────┬─────┘       └────┬─────┘
     │  SEND_MESSAGE      │                  │                   │
     │  (AI_CHAT or @ai)  │                  │                   │
     │───────────────────►│                  │                   │
     │                    │  streamAIResponse │                   │
     │                    │─────────────────►│                   │
     │                    │                  │ Build context      │
     │                    │                  │ (trim to limits)   │
     │                    │                  │                   │
     │  AI_STREAM_START   │                  │  sendMessageStream │
     │◄───────────────────│                  │──────────────────►│
     │                    │                  │                   │
     │  AI_STREAM_CHUNK   │  onChunk(text)   │  stream chunk     │
     │◄───────────────────│◄─────────────────│◄──────────────────│
     │  ...               │  ...             │  ...              │
     │                    │                  │                   │
     │  AI_STREAM_END     │  onComplete()    │  stream end       │
     │◄───────────────────│◄─────────────────│◄──────────────────│
     │                    │  Save to DB      │                   │
```

### 4. WebRTC Call Flow

```
┌──────────┐       ┌───────────┐       ┌──────────┐       ┌──────────┐
│ Caller   │       │ Socket.IO │       │ Call     │       │ Callee   │
│ Client   │       │ Server    │       │ Service  │       │ Client   │
└────┬─────┘       └─────┬─────┘       └────┬─────┘       └────┬─────┘
     │  CALL_INITIATE     │                  │                   │
     │───────────────────►│  initiateCall()  │                   │
     │                    │─────────────────►│                   │
     │                    │                  │ Create Call record │
     │                    │                  │ (status: RINGING)  │
     │                    │  CALL_RINGING    │                   │
     │                    │────────────────────────────────────►│
     │                    │                  │                   │
     │                    │  CALL_ACCEPT     │                   │
     │                    │◄───────────────────────────────────│
     │                    │  acceptCall()     │                   │
     │                    │─────────────────►│ status: ACTIVE    │
     │  CALL_ACCEPTED     │                  │                   │
     │◄───────────────────│                  │                   │
     │                    │                  │                   │
     │  CALL_OFFER (SDP)  │      relay       │                   │
     │───────────────────►│────────────────────────────────────►│
     │                    │  CALL_ANSWER     │                   │
     │◄───────────────────│◄───────────────────────────────────│
     │  ICE_CANDIDATE     │      relay       │  ICE_CANDIDATE   │
     │◄──────────────────►│◄────────────────────────────────►│
     │                    │                  │                   │
     │  ═══ P2P Media Stream Established ═══                    │
     │◄════════════════════════════════════════════════════════►│
```

### 5. File Upload Flow

```
┌──────────┐       ┌───────────┐       ┌──────────┐
│ Client   │       │ Express   │       │ Upload   │
│          │       │ + Multer  │       │ Service  │
└────┬─────┘       └─────┬─────┘       └────┬─────┘
     │  POST /api/upload  │                  │
     │  (FormData + XHR)  │                  │
     │───────────────────►│  processUpload() │
     │                    │─────────────────►│
     │                    │                  │ Save file (UUID name)
     │                    │                  │ Generate thumbnail
     │                    │                  │ (Sharp 200x200)
     │  { fileUrl,        │                  │
     │    thumbnailUrl }  │                  │
     │◄───────────────────│◄─────────────────│
     │                    │                  │
     │  Then: SEND_MESSAGE with attachments  │
     │  via Socket.IO                        │
```

### 6. Read Receipts Flow

```
┌──────────┐       ┌───────────┐       ┌──────────┐       ┌──────────┐
│ Reader   │       │ Socket.IO │       │ Chat     │       │ Sender   │
│ Client   │       │ Server    │       │ Service  │       │ Client   │
└────┬─────┘       └─────┬─────┘       └────┬─────┘       └────┬─────┘
     │  MESSAGE_READ      │                  │                   │
     │  { messageIds }    │                  │                   │
     │───────────────────►│  updateStatus()  │                   │
     │                    │─────────────────►│                   │
     │                    │                  │ Set status: READ   │
     │                    │                  │                   │
     │                    │  MSG_STATUS_UPDATE                   │
     │                    │────────────────────────────────────►│
     │                    │                  │   (blue checks)   │
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────────┐       ┌─────────────────────────────┐
│       User          │       │       Conversation           │
├─────────────────────┤       ├─────────────────────────────┤
│ id          UUID PK │       │ id          UUID PK          │
│ email       unique  │◄──┐  │ type        ConversationType │
│ name        String  │   │  │ title       String            │
│ avatarUrl   String? │   │  │ groupName   String?           │
│ passwordHash String │   │  │ description String?           │
│ bio         String? │   │  │ systemPrompt String?          │
│ status      String? │   │  │ createdBy   String            │
│ isOnline    Boolean │   │  │ createdAt   DateTime          │
│ lastSeenAt  DateTime?│  │  │ updatedAt   DateTime          │
│ createdAt   DateTime│   │  └──────┬──────────────┬────────┘
│ updatedAt   DateTime│   │         │              │
└──┬──┬──┬──┬────────┘   │         │              │
   │  │  │  │             │  ┌──────┴──────────────┴──┐
   │  │  │  │             │  │  ConversationMember     │
   │  │  │  │             │  ├────────────────────────┤
   │  │  │  └────────────►│  │ conversationId  FK     │
   │  │  │                │  │ userId          FK     │
   │  │  │                   │ role    MemberRole     │
   │  │  │                   │ isPinned   Boolean     │
   │  │  │                   │ isMuted    Boolean     │
   │  │  │                   │ joinedAt  DateTime     │
   │  │  │                   └────────────────────────┘
   │  │  │                   @@unique([conversationId, userId])
   │  │  │
   │  │  │  ┌────────────────────────────────┐
   │  │  │  │         Message                │
   │  │  │  ├────────────────────────────────┤
   │  │  └─►│ id             UUID PK         │
   │  │     │ content        String           │
   │  │     │ type           MessageType      │
   │  │     │ status         MessageStatus    │
   │  │     │ conversationId FK               │
   │  │     │ senderId       FK (nullable)    │
   │  │     │ replyToId      FK (self-ref)    │
   │  │     │ isEdited       Boolean          │
   │  │     │ isDeleted      Boolean          │
   │  │     │ tokenCount     Int?             │
   │  │     │ createdAt      DateTime         │
   │  │     └──┬─────────────┬───────────────┘
   │  │        │             │
   │  │  ┌─────┴────┐ ┌─────┴──────────┐
   │  │  │Attachment │ │   Reaction     │
   │  │  ├──────────┤ ├────────────────┤
   │  │  │ id    PK │ │ id         PK  │
   │  │  │ msgId FK │ │ messageId  FK  │
   │  │  │ fileUrl  │ │ userId     FK  │
   │  │  │ thumbUrl │ │ emoji     Str  │
   │  │  │ fileName │ │ createdAt      │
   │  │  │ fileSize │ └────────────────┘
   │  │  │ mimeType │ @@unique([msgId, userId, emoji])
   │  │  │ width?   │
   │  │  │ height?  │
   │  │  │ duration?│
   │  │  └──────────┘
   │  │
   │  │  ┌───────────────────┐
   │  │  │      Block        │
   │  │  ├───────────────────┤
   │  └─►│ id        UUID PK │
   │     │ blockerId FK      │
   │     │ blockedId FK      │
   │     │ createdAt DateTime│
   │     └───────────────────┘
   │     @@unique([blockerId, blockedId])
   │
   │  ┌──────────────────────┐    ┌──────────────────────┐
   │  │        Call          │    │     Notification      │
   │  ├──────────────────────┤    ├──────────────────────┤
   ├─►│ id         UUID PK  │ ┌─►│ id       UUID PK     │
   │  │ convId     FK       │ │  │ userId   FK          │
   │  │ callerId   FK       │ │  │ type  NotificationType│
   │  │ calleeId   FK       │ │  │ title    String      │
   │  │ type    CallType    │ │  │ body     String      │
   │  │ status  CallStatus  │ │  │ data     Json?       │
   │  │ startedAt DateTime? │ │  │ isRead   Boolean     │
   │  │ endedAt   DateTime? │ │  │ createdAt DateTime   │
   │  │ duration  Int?      │ │  └──────────────────────┘
   │  │ createdAt DateTime  │ │  @@index([userId, isRead])
   │  └──────────────────────┘ │
   └───────────────────────────┘
```

### Enums

| Enum | Values |
|------|--------|
| `ConversationType` | `DIRECT`, `GROUP`, `AI_CHAT` |
| `MemberRole` | `OWNER`, `ADMIN`, `MEMBER` |
| `MessageType` | `TEXT`, `IMAGE`, `VIDEO`, `AUDIO`, `FILE`, `SYSTEM`, `AI_RESPONSE` |
| `MessageStatus` | `SENT`, `DELIVERED`, `READ` |
| `CallType` | `AUDIO`, `VIDEO` |
| `CallStatus` | `RINGING`, `ACTIVE`, `ENDED`, `MISSED`, `REJECTED` |
| `NotificationType` | `NEW_MESSAGE`, `MENTION`, `CALL_MISSED`, `GROUP_INVITE`, `AI_COMPLETE` |

### Cascade Behavior

| Relation | On Delete |
|----------|-----------|
| Conversation → Messages | CASCADE |
| Conversation → Members | CASCADE |
| Conversation → Calls | CASCADE |
| Message → Attachments | CASCADE |
| Message → Reactions | CASCADE |
| Message → Sender (User) | SET NULL |
| Message → ReplyTo (Message) | SET NULL |
| User → Blocks | CASCADE |
| User → Notifications | CASCADE |
| User → Calls | CASCADE |
| User → Reactions | CASCADE |

---

## Backend Architecture

### Feature-Based Structure

```
src/features/
├── auth/           # JWT authentication
│   ├── jwt.service.ts      → Sign/verify tokens (access 15m, refresh 7d)
│   ├── auth.service.ts     → Signup, login, refresh, logout, getProfile
│   ├── auth.controller.ts  → HTTP handlers
│   └── auth.router.ts      → Routes
│
├── chat/           # Conversations + messages + groups
│   ├── chat.service.ts     → 3 conversation types, messages, groups,
│   │                          reactions, soft-delete, export
│   ├── chat.controller.ts  → HTTP handlers
│   └── chat.router.ts      → Routes
│
├── ai/             # AI integration (optional)
│   ├── context-manager.ts  → Build context, trim to 20 msgs / 30k chars
│   ├── ai.service.ts       → Gemini streaming (null guard if no key)
│   └── ai.controller.ts    → Summarize + smart replies (503 if no key)
│
├── user/           # Profiles + blocking + presence
│   ├── user.service.ts     → Search, profile, blocking, Redis presence
│   ├── user.controller.ts  → HTTP handlers
│   └── user.router.ts      → Routes
│
├── upload/         # File upload
│   ├── upload.service.ts   → Multer + Sharp thumbnails
│   └── upload.controller.ts → Upload endpoint
│
├── call/           # Audio/video calls
│   ├── call.service.ts     → Initiate, accept, reject, end, history
│   ├── call.controller.ts  → HTTP handlers
│   └── call.router.ts      → Routes
│
└── notification/   # Notifications
    ├── notification.service.ts  → Create + broadcast, list, mark read
    ├── notification.controller.ts → HTTP handlers
    └── notification.router.ts     → Routes
```

### Middleware Pipeline

```
Request → Helmet → CORS → JSON Parser → Cookie Parser → Rate Limiter
       → [Auth Middleware] → [Validate Middleware] → Route Handler
       → Error Middleware → Response
```

| Middleware | Purpose |
|-----------|---------|
| `auth.middleware.ts` | Verify JWT, attach `req.user` = `{ userId, email }` |
| `rate-limit.middleware.ts` | General: 60 req/min. AI: 20 req/min |
| `validate.middleware.ts` | Zod schema validation factory |
| `error.middleware.ts` | Catches ApiError + unhandled errors → JSON |

### Socket.IO Architecture

```
socket.handler.ts
├── JWT Auth Middleware (handshake)
├── userSockets: Map<userId, Set<socketId>>
├── On connect:
│   ├── Join room: user:{userId}
│   ├── Broadcast: USER_ONLINE
│   └── Set online in DB + Redis
├── On disconnect:
│   ├── If last socket → USER_OFFLINE + set offline
│   └── Remove socketId from tracking
├── Register: chatSocketHandler
└── Register: callSocketHandler
```

### Config Layer

| File | Purpose |
|------|---------|
| `env.ts` | Zod-validated env. GEMINI_API_KEY defaults to `""` |
| `database.ts` | Prisma client singleton |
| `redis.ts` | ioredis client |
| `gemini.ts` | Nullable Gemini model. Validates `AIzaSy` prefix |
| `socket-io.ts` | Socket.IO singleton (setIO/getIO) |

---

## Frontend Architecture

### Provider Hierarchy

```
Root Layout (app/layout.tsx):
  ThemeProvider (dark default, class-based)
    TooltipProvider
      AuthProvider (token validation + API client config)
        Toaster (react-hot-toast)

Main Layout (app/(main)/layout.tsx):
  AuthGuard
    SocketProvider
      CallProvider (IncomingCallDialog + CallView)
        ┌──────────────────────────────────────┐
        │  Sidebar │ AppHeader                 │
        │          │ {children}                │
        │          │ SettingsDialog             │
        │          │ KeyboardShortcutsDialog    │
        └──────────────────────────────────────┘
        usePresence()  ← side-effect hook
```

### State Management (7 Zustand Stores)

| Store | Key State | Persistence |
|-------|-----------|-------------|
| `auth-store` | user, tokens, isAuthenticated | localStorage |
| `chat-store` | conversations[], activeConversationId, searchQuery | None |
| `message-store` | messages (by convId), streamingMessage, isStreaming | None |
| `ui-store` | isSidebarOpen, isSettingsOpen, isShortcutsOpen | None |
| `call-store` | activeCall, callStatus, localStream, remoteStream | None |
| `notification-store` | notifications[], unreadCount | None |
| `user-store` | onlineUsers (Set), userProfiles (cache) | None |

### Hooks (13)

| Hook | Purpose | Socket Events |
|------|---------|--------------|
| `use-socket` | Socket context consumer | — |
| `use-conversations` | Conversation CRUD | — |
| `use-messages` | Messages + real-time | NEW_MESSAGE, UPDATED, DELETED, REACTION, STATUS |
| `use-streaming` | AI stream + errors | AI_STREAM_* |
| `use-call` | WebRTC management | CALL_* |
| `use-typing` | Typing indicators | TYPING_* |
| `use-presence` | Online tracking | USER_ONLINE/OFFLINE |
| `use-notifications` | Notifications | NEW_NOTIFICATION |
| `use-file-upload` | Upload + progress | — |
| `use-message-status` | Read receipts | MESSAGE_READ |
| `use-keyboard-shortcuts` | Key handlers | — |
| `use-clipboard` | Copy feedback | — |
| `use-media-query` | Responsive | — |

### Component Architecture

```
components/
├── ui/          # ShadCN (10): button, input, avatar, dialog,
│                  dropdown, scroll-area, skeleton, tooltip, separator, badge
├── auth/        # Auth (3): auth-guard, login-form, signup-form
├── chat/        # Chat (15): sidebar, conversation-item, message-list,
│                  message-bubble, message-input, markdown-renderer,
│                  streaming-indicator, empty-state, reply-preview,
│                  file-upload-button, upload-progress, media-viewer,
│                  reaction-picker, typing-indicator, message-status
├── call/        # Call (4): call-view, incoming-call-dialog,
│                  call-controls, call-timer
└── layout/      # Layout (8): app-header, user-menu, theme-toggle,
                   connection-status, keyboard-shortcuts, confirm-dialog,
                   settings-dialog, notification-popover
```

---

## Shared Package

```
packages/shared/src/
├── types/           # TypeScript interfaces
│   ├── user.ts, message.ts, conversation.ts, auth.ts, call.ts, notification.ts
│   └── socket-events.ts  → ServerToClientEvents, ClientToServerEvents
├── schemas/         # Zod validation
│   └── auth, message, conversation schemas
└── constants/
    └── socket-events.ts  → SOCKET_EVENTS (35+ event names)
```

---

## Security Architecture

### Rate Limiting

| Tier | Limit | Window | Applied To |
|------|-------|--------|------------|
| General | 60 requests | 1 minute | All endpoints |
| AI | 20 requests | 1 minute | AI endpoints |

### File Upload Security

| Check | Implementation |
|-------|---------------|
| MIME whitelist | Images, videos, audio, documents only |
| Size limits | 10MB images, 50MB videos, 25MB audio/docs |
| Filename sanitization | UUID-based names |
| Storage isolation | `uploads/` via `express.static` |

### Role-Based Access (Groups)

| Action | OWNER | ADMIN | MEMBER |
|--------|-------|-------|--------|
| Update group settings | Yes | Yes | No |
| Add member | Yes | Yes | No |
| Remove member | Yes | Yes (not owner) | Self only |
| Change role | Yes | No | No |
| Delete conversation | Yes | No | No |

### Gemini API Key Validation

1. Check non-empty
2. Check against KNOWN_PLACEHOLDERS
3. Validate `AIzaSy` prefix
4. If invalid → `geminiModel = null` → AI disabled
5. AI endpoints return 503

---

## Design System

### Color Tokens

CSS custom properties with light/dark variants:

| Token | Purpose |
|-------|---------|
| `--background` / `--foreground` | Page base |
| `--primary` / `--primary-foreground` | Actions (violet) |
| `--muted` / `--muted-foreground` | Subtle elements |
| `--destructive` | Danger/error |
| `--sidebar-*` | Sidebar-specific |

### Glassmorphism

- `.glass` — `backdrop-blur-xl` + semi-transparent + subtle border
- `.glass-strong` — stronger blur + more opaque

### Gradient System

- **Primary**: `violet-500 → purple-500 → cyan-500`
- **Text gradient**: `background-clip: text`
- **Border gradient**: `conic-gradient` with mask via `::before`
- **Glow**: `box-shadow` with violet hue

### Animations

| Animation | Usage |
|-----------|-------|
| `shimmer` | Skeleton loading |
| `pulse-dot` | Streaming indicator dots |
| `gradient-shift` | Background gradient animation |
| `sparkle` | AI avatar effect |
| Framer `layout` | Conversation reordering |
| Framer `AnimatePresence` | Message transitions |
