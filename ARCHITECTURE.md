# Architecture Guide

A comprehensive deep-dive into the system architecture of the AI Chat Application.

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
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                            │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Next.js 14 (App Router)                   │   │
│  │                                                              │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐   │   │
│  │  │  Zustand    │  │  Socket.IO   │  │  API Client        │   │   │
│  │  │  Stores (4) │  │  Client      │  │  (fetch + refresh) │   │   │
│  │  └──────┬──────┘  └──────┬───────┘  └────────┬───────────┘   │   │
│  │         │                │                    │               │  │
│  └─────────┼────────────────┼────────────────────┼───────────────┘  │
│            │                │                    │                   │
└────────────┼────────────────┼────────────────────┼───────────────────┘
             │                │                    │
             │          WebSocket              HTTP REST
             │           (wss://)              (https://)
             │                │                    │
┌────────────┼────────────────┼────────────────────┼───────────────────┐
│            │          SERVER (Node.js)           │                   │
│            │                │                    │                   │
│  ┌─────────┼────────────────┼────────────────────┼───────────────┐  │
│  │         │         ┌──────┴───────┐   ┌───────┴────────────┐  │  │
│  │         │         │  Socket.IO   │   │   Express Server   │  │  │
│  │         │         │  Server      │   │                    │  │  │
│  │         │         │  ┌─────────┐ │   │  ┌──────────────┐  │  │  │
│  │         │         │  │ Rooms   │ │   │  │  Middleware  │  │  │  │
│  │         │         │  │ (conv.) │ │   │  │  Pipeline    │  │  │  │
│  │         │         │  └─────────┘ │   │  └──────────────┘  │  │  │
│  │         │         └──────┬───────┘   │  ┌──────────────┐  │  │  │
│  │         │                │           │  │  Features    │  │  │  │
│  │         │                │           │  │  (auth/chat) │  │  │  │
│  │         │                │           │  └──────────────┘  │  │  │
│  │         │                │           └────────┬───────────┘  │  │
│  │         │                │                    │              │  │
│  │         │         ┌──────┴────────────────────┴──────────┐   │  │
│  │         │         │           AI Service                 │   │  │
│  │         │         │  ┌──────────────┐  ┌──────────────┐  │   │  │
│  │         │         │  │   Context    │  │   Gemini     │  │   │  │
│  │         │         │  │   Manager    │──│   Streaming  │  │   │  │
│  │         │         │  └──────────────┘  └──────────────┘  │   │  │
│  │         │         └──────────────────────────────────────┘   │  │
│  └─────────┼───────────────────────────────────────────────────┘   │
│            │                                                       │
└────────────┼───────────────────────────────────────────────────────┘
             │
    ┌────────┼────────────────────────────────────┐
    │        │          DATA LAYER                 │
    │  ┌─────┴──────┐          ┌───────────────┐  │
    │  │ PostgreSQL  │          │    Redis       │  │
    │  │             │          │               │  │
    │  │ - Users     │          │ - Refresh     │  │
    │  │ - Convos    │          │   Tokens      │  │
    │  │ - Messages  │          │ - Rate Limits │  │
    │  └─────────────┘          └───────────────┘  │
    └─────────────────────────────────────────────┘
```

---

## Monorepo Design

### Why npm Workspaces

The project uses **npm workspaces** (native to npm 7+) for monorepo management. This was chosen over alternatives like Turborepo, Nx, or Lerna for simplicity and zero additional tooling.

### Workspace Layout

```
visual-chat-media2/
├── packages/
│   └── shared/          # @ai-chat/shared — types, schemas, constants
└── apps/
    ├── backend/         # @ai-chat/backend — Express + Socket.IO
    └── frontend/        # @ai-chat/frontend — Next.js 14
```

### How Workspaces Connect

```
                    ┌──────────────────┐
                    │  @ai-chat/shared │
                    │                  │
                    │  Types:          │
                    │  - User          │
                    │  - Message       │
                    │  - Conversation  │
                    │  - SocketEvents  │
                    │                  │
                    │  Schemas (Zod):  │
                    │  - signupSchema  │
                    │  - loginSchema   │
                    │  - etc.          │
                    │                  │
                    │  Constants:      │
                    │  - SOCKET_EVENTS │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              │              ▼
   ┌──────────────────┐      │   ┌──────────────────┐
   │ @ai-chat/backend │      │   │ @ai-chat/frontend│
   │                  │◄─────┘   │                  │
   │ import { ... }   │          │ import { ... }   │
   │ from             │          │ from             │
   │ '@ai-chat/shared'│          │ '@ai-chat/shared'│
   └──────────────────┘          └──────────────────┘
```

- **Backend** imports shared types for service/controller type safety, schemas for request validation, and socket event constants.
- **Frontend** imports shared types for store/component type safety, schemas for client-side validation, and socket event constants for listeners.
- Next.js uses `transpilePackages: ['@ai-chat/shared']` to compile the shared package.

### TypeScript Configuration

```
tsconfig.base.json (root)
├── strict: true
├── target: ES2022
├── moduleResolution: bundler
│
├── apps/backend/tsconfig.json
│   ├── extends: ../../tsconfig.base.json
│   ├── module: CommonJS        ← Required for Express/Node
│   └── moduleResolution: node  ← Required for Node packages
│
├── apps/frontend/tsconfig.json
│   ├── extends: ../../tsconfig.base.json
│   ├── module: ESNext          ← Next.js uses ESM
│   ├── jsx: preserve           ← Next.js handles JSX
│   └── paths: @/* → ./src/*   ← Import alias
│
└── packages/shared/tsconfig.json
    └── extends: ../../tsconfig.base.json
```

---

## Data Flow Diagrams

### Authentication Flow

```
┌──────────┐     POST /api/auth/signup       ┌──────────┐
│          │  ──────────────────────────────► │          │
│  Client  │  { name, email, password }       │  Server  │
│          │                                  │          │
│          │  ◄──────────────────────────────  │          │
│          │  { user, tokens: {               │          │
│          │    accessToken (15min),           │          │
│          │    refreshToken (7d)              │          │
│          │  }}                               │          │
└──────────┘                                  └──────────┘
     │                                              │
     │  Store tokens in                             │  Store refresh
     │  localStorage                                │  token in Redis
     │                                              │  key: refresh:{userId}
     ▼                                              ▼

  ─ ─ ─ ─ ─ ─ ─ ─  15 minutes later  ─ ─ ─ ─ ─ ─ ─ ─

┌──────────┐     API call with expired       ┌──────────┐
│          │  ──────────────────────────────► │          │
│  Client  │  Authorization: Bearer <token>   │  Server  │
│          │                                  │          │
│          │  ◄──────────────────────────────  │          │
│          │  401 Unauthorized                │          │
│          │                                  │          │
│          │     POST /api/auth/refresh       │          │
│          │  ──────────────────────────────► │          │
│          │  { refreshToken }                │          │  Verify token exists
│          │                                  │          │  in Redis. Issue new
│          │  ◄──────────────────────────────  │          │  pair. Store new
│          │  { user, tokens (new pair) }      │          │  refresh in Redis.
│          │                                  │          │
│          │     Retry original request       │          │
│          │  ──────────────────────────────► │          │
└──────────┘                                  └──────────┘
```

### Chat Message Flow (Send + AI Stream)

```
 ┌────────┐         ┌────────────┐        ┌─────────┐       ┌────────┐
 │ Client │         │ Socket.IO  │        │ Backend │       │ Gemini │
 │        │         │  Server    │        │ Services│       │  API   │
 └───┬────┘         └─────┬──────┘        └────┬────┘       └───┬────┘
     │                    │                    │                 │
     │  send-message      │                    │                 │
     │  {content, convId} │                    │                 │
     │───────────────────►│                    │                 │
     │                    │                    │                 │
     │                    │  saveMessage()     │                 │
     │                    │───────────────────►│                 │
     │                    │  (save to DB)      │                 │
     │                    │◄───────────────────│                 │
     │                    │                    │                 │
     │   new-message      │                    │                 │
     │◄───────────────────│                    │                 │
     │   (user's msg)     │                    │                 │
     │                    │                    │                 │
     │                    │  Auto-title check  │                 │
     │                    │  (if "New Chat")   │                 │
     │                    │───────────────────►│                 │
     │                    │                    │                 │
     │   ai-stream-start  │                    │                 │
     │◄───────────────────│                    │                 │
     │                    │                    │                 │
     │                    │  streamAIResponse()│                 │
     │                    │───────────────────►│                 │
     │                    │                    │  buildContext() │
     │                    │                    │  (trim to 20    │
     │                    │                    │   msgs/30k ch)  │
     │                    │                    │                 │
     │                    │                    │  startChat()    │
     │                    │                    │────────────────►│
     │                    │                    │                 │
     │                    │                    │  sendMessage    │
     │                    │                    │  Stream()       │
     │                    │                    │────────────────►│
     │                    │                    │                 │
     │                    │                    │  chunk 1        │
     │                    │                    │◄────────────────│
     │   ai-stream-chunk  │   onChunk()        │                 │
     │◄───────────────────│◄───────────────────│                 │
     │   "Hello"          │                    │                 │
     │                    │                    │  chunk 2        │
     │   ai-stream-chunk  │   onChunk()        │◄────────────────│
     │◄───────────────────│◄───────────────────│                 │
     │   ", how"          │                    │                 │
     │                    │                    │  chunk N        │
     │   ai-stream-chunk  │   onChunk()        │◄────────────────│
     │◄───────────────────│◄───────────────────│                 │
     │   " today?"        │                    │                 │
     │                    │                    │  stream end     │
     │                    │                    │◄────────────────│
     │                    │  saveMessage()     │                 │
     │                    │  (full AI content) │                 │
     │                    │───────────────────►│                 │
     │                    │                    │                 │
     │   ai-stream-end    │                    │                 │
     │◄───────────────────│                    │                 │
     │   {content,        │                    │                 │
     │    savedMessageId} │                    │                 │
     │                    │                    │                 │
```

### Stop Generation Flow

```
 Client                   Socket.IO Server              AI Service
   │                            │                            │
   │  stop-generation           │                            │
   │  {conversationId}          │                            │
   │───────────────────────────►│                            │
   │                            │                            │
   │                            │  activeGenerations         │
   │                            │  .get(convId)              │
   │                            │  .abort()                  │
   │                            │───────────────────────────►│
   │                            │                            │
   │                            │        AbortError thrown   │
   │                            │◄───────────────────────────│
   │                            │                            │
   │   ai-stream-end            │  Save partial content      │
   │◄───────────────────────────│  to database               │
   │   {partial content}        │                            │
```

---

## Database Schema

### Entity-Relationship Diagram

```
┌─────────────────────────────────┐
│             User                │
├─────────────────────────────────┤
│ id          String  PK (UUID)   │
│ email       String  UNIQUE      │
│ name        String              │
│ avatarUrl   String? (nullable)  │
│ passwordHash String             │
│ createdAt   DateTime            │
│ updatedAt   DateTime            │
├─────────────────────────────────┤
│ INDEX: email                    │
└───────────┬─────────────────────┘
            │
            │ 1:N (CASCADE delete)
            │
            ▼
┌─────────────────────────────────┐
│         Conversation            │
├─────────────────────────────────┤
│ id           String  PK (UUID)  │
│ title        String  "New Chat" │
│ userId       String  FK → User  │
│ isPinned     Boolean  false     │
│ systemPrompt String? (nullable) │
│ createdAt    DateTime           │
│ updatedAt    DateTime           │
├─────────────────────────────────┤
│ INDEX: userId                   │
│ INDEX: updatedAt                │
└───────────┬─────────────────────┘
            │
            │ 1:N (CASCADE delete)
            │
            ▼
┌─────────────────────────────────┐
│           Message               │
├─────────────────────────────────┤
│ id             String PK (UUID) │
│ content        String           │
│ role           MessageRole ENUM │
│ conversationId String FK→Conv   │
│ userId         String? FK→User  │
│ isEdited       Boolean  false   │
│ tokenCount     Int? (nullable)  │
│ createdAt      DateTime         │
├─────────────────────────────────┤
│ INDEX: (conversationId,         │
│         createdAt)              │
└─────────────────────────────────┘

  ┌───────────────────┐
  │  MessageRole ENUM │
  │  ─────────────    │
  │  USER             │
  │  ASSISTANT        │
  └───────────────────┘
```

### Cascade Behavior

| Parent | Child | On Delete |
|--------|-------|-----------|
| User | Conversation | **CASCADE** — deleting a user deletes all their conversations |
| User | Message | **SET NULL** — deleting a user sets `userId` to null on messages |
| Conversation | Message | **CASCADE** — deleting a conversation deletes all its messages |

### Key Design Decisions

- **`passwordHash` is required** (not nullable) — only email/password auth is supported.
- **`userId` on Message is nullable** — AI-generated messages have no associated user.
- **`systemPrompt` on Conversation** — allows per-conversation AI persona customization.
- **`isPinned` on Conversation** — pinned conversations sort to the top of the sidebar.
- **`isEdited` on Message** — tracks if a user message was edited (shows "edited" indicator in UI).
- **`tokenCount` on Message** — optional field for future token usage tracking.
- **Composite index on `(conversationId, createdAt)`** — optimizes the most common query: fetching messages for a conversation in chronological order.

---

## Backend Architecture

### Feature-Based Folder Structure

```
src/
├── config/       ← App-wide configuration (env, DB, Redis, AI)
├── lib/          ← Shared utilities (errors, logging, async handling)
├── middleware/   ← Express middleware pipeline
├── features/     ← Domain-specific business logic
│   ├── auth/     ← Authentication (signup, login, JWT, refresh)
│   ├── chat/     ← Conversation & message CRUD
│   └── ai/       ← Gemini AI integration
├── socket/       ← Socket.IO event handlers
├── app.ts        ← Express app factory
└── index.ts      ← Server entry point
```

Each feature follows the **Service → Controller → Router** pattern:

```
Router (route definitions + validation middleware)
  └── Controller (HTTP request/response handling)
        └── Service (business logic + database operations)
```

### Express Middleware Pipeline

Requests flow through middleware in this exact order:

```
Request
  │
  ▼
┌──────────────────────┐
│  helmet()            │  Security headers (X-Frame-Options, CSP, etc.)
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  cors()              │  CORS with credentials, frontend origin whitelisted
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  express.json()      │  Parse JSON body (1MB limit)
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  cookieParser()      │  Parse cookies from request
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  rateLimitMiddleware │  60 requests per minute per IP
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  Routes              │
│  ├── /health         │  Public health check
│  ├── /api/auth/*     │  Public auth routes
│  └── /api/convs/*    │  Protected (authMiddleware applied per-route)
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  errorMiddleware     │  Catches ApiError and unhandled errors
└──────────────────────┘
```

### JWT + Redis Token Strategy

```
                    ┌──────────────────────────┐
                    │     Access Token          │
                    │                          │
                    │  Lifetime: 15 minutes    │
                    │  Storage: Client memory  │
                    │  + localStorage          │
                    │  Payload: {userId, email}│
                    │  Signed with: JWT_SECRET │
                    └──────────────────────────┘

                    ┌──────────────────────────┐
                    │     Refresh Token         │
                    │                          │
                    │  Lifetime: 7 days        │
                    │  Storage: Redis          │
                    │  Key: refresh:{userId}   │
                    │  TTL: 604800 seconds     │
                    │  Signed with:            │
                    │    JWT_REFRESH_SECRET    │
                    └──────────────────────────┘
```

**Token Rotation:** Every time a refresh token is used, a new pair (access + refresh) is issued, and the old refresh token is replaced in Redis. This means:
- A stolen refresh token becomes invalid after first use
- Logout immediately revokes the refresh token by deleting the Redis key
- Only one refresh token is valid per user at any time

### Socket.IO Room Architecture

```
                 ┌────────────────────────────┐
                 │       Socket.IO Server      │
                 │                            │
                 │  Auth Middleware:           │
                 │  Verify JWT from           │
                 │  handshake.auth.token      │
                 │                            │
                 │  ┌──────────────────────┐  │
                 │  │  Room: conversation: │  │
                 │  │  abc-123             │  │
                 │  │  ┌────────────────┐  │  │
                 │  │  │ User Socket A  │  │  │
                 │  │  └────────────────┘  │  │
                 │  └──────────────────────┘  │
                 │                            │
                 │  ┌──────────────────────┐  │
                 │  │  Room: conversation: │  │
                 │  │  def-456             │  │
                 │  │  ┌────────────────┐  │  │
                 │  │  │ User Socket B  │  │  │
                 │  │  └────────────────┘  │  │
                 │  └──────────────────────┘  │
                 └────────────────────────────┘
```

- Each conversation is a Socket.IO **room** named `conversation:{id}`
- When a user opens a conversation, their socket joins that room
- Messages and stream events are emitted to the room, ensuring only users viewing that conversation receive updates
- `activeGenerations` Map tracks in-flight AI generations per conversation for abort support

### Context Trimming Algorithm

The context manager ensures Gemini API calls stay within token limits:

```
Input: All messages in conversation + current user message
Output: Trimmed context array for Gemini's startChat() history

Algorithm:
1. Take the most recent MAX_CONTEXT_MESSAGES (20) messages
2. Initialize totalChars = 0
3. Iterate BACKWARDS through the 20 messages:
   a. Add message character count to totalChars
   b. If totalChars > MAX_CONTEXT_CHARS (30,000):
      - Stop adding older messages
      - Slice array to keep only recent ones
4. Return trimmed messages in chronological order

Result: The most recent messages that fit within both the
        20-message count limit and 30,000-character limit
```

### Rate Limiting

| Limiter | Requests | Window | Applied To |
|---------|----------|--------|-----------|
| General | 60 | 60 seconds | All routes |
| AI | 20 | 60 seconds | AI-specific endpoints |

Both use `express-rate-limit` with `standardHeaders: true` and `legacyHeaders: false`.

---

## Frontend Architecture

### Next.js App Router Route Groups

```
app/
├── layout.tsx              ← Root: Inter font, ThemeProvider, AuthProvider, Toaster
├── page.tsx                ← Home: redirects to /chat or /login
│
├── (auth)/                 ← Unauthenticated routes
│   ├── layout.tsx          ← Gradient background with animated blur circles
│   ├── login/page.tsx      ← LoginForm component
│   └── signup/page.tsx     ← SignupForm component
│
└── (main)/                 ← Authenticated routes
    ├── layout.tsx          ← AuthGuard + SocketProvider + Sidebar + Header
    ├── chat/page.tsx       ← Empty state (new conversation view)
    └── chat/
        └── [conversationId]/
            └── page.tsx    ← Full chat view with messages + input
```

**Route groups** `(auth)` and `(main)` provide different layouts without affecting the URL structure:
- `/login` uses the gradient background layout
- `/chat` uses the sidebar + header layout with auth protection

### Provider Hierarchy

```
<html>
  <body>
    <ThemeProvider defaultTheme="dark" attribute="class">
      <TooltipProvider>
        <AuthProvider>           ← Validates tokens on mount
          {children}             ← Pages render here
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </body>
</html>

For (main) routes, additional wrapping:
<AuthGuard>                      ← Redirects to /login if not authenticated
  <SocketProvider>               ← Manages Socket.IO lifecycle
    <div className="flex h-screen">
      <Sidebar />
      <main>
        <AppHeader />
        {children}               ← Chat pages render here
      </main>
    </div>
    <KeyboardShortcutsDialog />
  </SocketProvider>
</AuthGuard>
```

### Zustand Store Architecture

The application uses **4 Zustand stores**, each responsible for a specific domain:

```
┌─────────────────────────────────────────────────────────────┐
│                      Zustand Stores                         │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │  auth-store   │  │  chat-store   │  │  message-store   │ │
│  │              │  │              │  │                  │ │
│  │  user        │  │  convos[]   │  │  messages{}      │ │
│  │  tokens      │  │  activeId   │  │  (by convId)     │ │
│  │  isAuth      │  │  isLoading  │  │  streamingMsg    │ │
│  │  isLoading   │  │  searchQuery│  │  isStreaming      │ │
│  │              │  │              │  │  loadingConvos   │ │
│  │  Persisted   │  │  In-memory  │  │  In-memory       │ │
│  │  (localStorage│  │  only       │  │  only            │ │
│  │  )           │  │              │  │                  │ │
│  └──────────────┘  └──────────────┘  └──────────────────┘ │
│                                                             │
│  ┌──────────────┐                                          │
│  │  ui-store     │                                          │
│  │              │                                          │
│  │  sidebarOpen │                                          │
│  │  sidebarCollapsed                                       │
│  │  searchOpen  │                                          │
│  │  shortcutsOpen                                          │
│  │  settingsOpen│                                          │
│  │              │                                          │
│  │  In-memory   │                                          │
│  │  only        │                                          │
│  └──────────────┘                                          │
└─────────────────────────────────────────────────────────────┘
```

**Key design decisions:**
- Only `auth-store` persists to `localStorage` (tokens + user data survive page refresh)
- `message-store` keys messages by `conversationId` (`Record<string, Message[]>`) for efficient per-conversation access
- `message-store` tracks a `loadingConversations` Set to prevent duplicate fetches
- `chat-store` auto-clears `activeConversationId` when the active conversation is deleted

### API Client Auto-Refresh Pattern

```
┌────────────────────────────────────────────────────────┐
│                    fetchWithAuth()                       │
│                                                         │
│  1. Get access token from auth store                    │
│  2. Make request with Authorization: Bearer <token>     │
│  3. If 200-299 → return response                       │
│  4. If 401 (Unauthorized):                              │
│     a. Get refresh token from auth store                │
│     b. POST /api/auth/refresh { refreshToken }          │
│     c. If success:                                      │
│        - Store new tokens in auth store                 │
│        - Retry original request with new access token   │
│     d. If refresh fails:                                │
│        - Call logout() (clear stores + localStorage)    │
│        - Redirect to /login                             │
│  5. If other error → throw with error message           │
└────────────────────────────────────────────────────────┘
```

### Socket.IO Client Lifecycle

```
Auth Store Change (tokens available)
         │
         ▼
SocketProvider useEffect detects accessToken
         │
         ▼
connectSocket(accessToken)
  │  - io(SOCKET_URL, { auth: { token } })
  │  - transports: ['websocket', 'polling']
  │  - reconnectionAttempts: 5
  │  - reconnectionDelay: 1000
  │  - reconnectionDelayMax: 5000
  │
  ├── on('connect')     → setIsConnected(true)
  ├── on('disconnect')  → setIsConnected(false)
  └── on('connect_error') → log error

Auth Store Change (logout / tokens cleared)
         │
         ▼
disconnectSocket()
  - socket.disconnect()
  - socket = null
```

### Component Composition Pattern

Chat page composition (apps/frontend/src/app/(main)/chat/[conversationId]/page.tsx):

```
ChatConversationPage
├── useMessages(conversationId)        ← Fetches messages + listens for new ones
├── useStreaming(conversationId)        ← Handles AI stream events
├── useSocket()                        ← Socket.IO connection
│
├── Effect: join-conversation room on mount
├── Effect: leave-conversation room on unmount
│
└── Render:
    ├── MessageList                     ← Scrollable message container
    │   ├── Skeleton (loading)
    │   ├── MessageBubble[] (messages)  ← Per-message with actions
    │   │   ├── MarkdownRenderer       ← For AI messages
    │   │   └── Hover Toolbar          ← Copy, regenerate, edit
    │   ├── StreamingIndicator         ← While AI is generating
    │   └── ScrollToBottom FAB         ← When scrolled up
    │
    └── MessageInput                    ← Auto-resize textarea
        ├── Send Button (AnimatePresence toggle with Stop)
        └── Character Count
```

---

## Shared Package

### Type Flow Between Frontend and Backend

```
packages/shared/src/types/message.ts
  │
  │  export interface Message {
  │    id: string;
  │    content: string;
  │    role: MessageRole;
  │    conversationId: string;
  │    isEdited: boolean;
  │    tokenCount: number | null;
  │    createdAt: string;
  │  }
  │
  ├──────────────────────► Backend: chat.service.ts
  │                          Uses Message type for return values
  │                          from database queries
  │
  └──────────────────────► Frontend: message-store.ts
                             Uses Message type for store state
                             and component props

packages/shared/src/schemas/auth.schema.ts
  │
  │  export const signupSchema = z.object({
  │    email: z.string().email(),
  │    password: z.string().min(8),
  │    name: z.string().min(2).max(50),
  │  });
  │
  ├──────────────────────► Backend: auth.router.ts
  │                          validate(signupSchema) middleware
  │                          validates request body
  │
  └──────────────────────► Frontend: (available for client-side
                             validation if needed)

packages/shared/src/constants/socket-events.ts
  │
  │  export const SOCKET_EVENTS = {
  │    SEND_MESSAGE: 'send-message',
  │    AI_STREAM_CHUNK: 'ai-stream-chunk',
  │    ...
  │  };
  │
  ├──────────────────────► Backend: chat.socket.ts
  │                          socket.on(SOCKET_EVENTS.SEND_MESSAGE, ...)
  │                          socket.emit(SOCKET_EVENTS.AI_STREAM_CHUNK, ...)
  │
  └──────────────────────► Frontend: use-streaming.ts
                             socket.on(SOCKET_EVENTS.AI_STREAM_CHUNK, ...)
```

---

## Security Architecture

| Layer | Mechanism | Details |
|-------|-----------|---------|
| **Password Storage** | bcrypt | 12 salt rounds. Passwords are never stored in plain text |
| **Access Tokens** | JWT | 15-minute expiry. Signed with `JWT_SECRET` (min 32 chars) |
| **Refresh Tokens** | JWT + Redis | 7-day expiry. Stored in Redis for revocation. Rotated on each use |
| **Token Revocation** | Redis delete | Logout deletes the refresh token from Redis immediately |
| **HTTP Security** | Helmet | Sets security headers (X-Frame-Options, CSP, X-Content-Type-Options, etc.) |
| **CORS** | Express CORS | Only `FRONTEND_URL` origin allowed. Credentials enabled |
| **Rate Limiting** | express-rate-limit | 60 req/min general, 20 req/min AI endpoints |
| **Input Validation** | Zod | All API inputs validated with Zod schemas before processing |
| **SQL Injection** | Prisma ORM | Parameterized queries by default. No raw SQL |
| **Resource Authorization** | Ownership checks | All conversation/message operations verify `userId` matches the authenticated user |
| **Socket Auth** | JWT handshake | Socket.IO connections require valid JWT in `handshake.auth.token` |
| **Environment** | Zod validation | All environment variables validated at startup. Server refuses to start with invalid config |

---

## Design System

### Glassmorphism

The UI uses frosted glass effects throughout:

```css
/* Light glass (sidebar, cards) */
.glass {
  background: hsl(var(--background) / 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid hsl(var(--border) / 0.5);
}

/* Strong glass (dialogs, dropdowns) */
.glass-strong {
  background: hsl(var(--card) / 0.8);
  backdrop-filter: blur(24px);
  border: 1px solid hsl(var(--border) / 0.3);
}
```

### Gradient System

```
Primary Gradient:  violet-600 → purple-600 → cyan-500
Usage:             Buttons (variant="gradient"), AI logo, active indicators,
                   user message bubbles, focus borders

Text Gradient:     violet-400 → purple-400 → cyan-400
Usage:             .gradient-text class for headings and branding

Border Gradient:   violet-500/50 → purple-500/50 → cyan-500/50
Usage:             .gradient-border pseudo-element with mask technique
```

### Animation System (Framer Motion)

| Animation | Where Used | Effect |
|-----------|-----------|--------|
| Fade + slide up | Message entrance | `initial={{ opacity: 0, y: 20 }}` |
| Scale spring | Login logo, buttons | `initial={{ scale: 0.8 }}` with spring physics |
| Width animation | Sidebar collapse | `animate={{ width: collapsed ? 64 : 300 }}` |
| Layout animation | Active indicator | `layoutId="active-conversation"` for shared element transition |
| AnimatePresence | Send/Stop button | Cross-fade between send arrow and stop square |
| Staggered children | Prompt suggestions | Sequential entrance with increasing delay |
| Rotate | Theme toggle | Sun/Moon icon rotation on theme change |

### Color Tokens (CSS Variables)

The theme uses CSS custom properties for light/dark mode switching:

```
Light Mode:                    Dark Mode:
--background: white            --background: near-black
--foreground: dark gray        --foreground: light gray
--card: white                  --card: dark gray
--primary: violet              --primary: violet
--muted: light gray            --muted: dark gray
--accent: light violet         --accent: dark violet
--destructive: red             --destructive: red
--border: light gray           --border: dark gray
--sidebar: light tint          --sidebar: dark tint
```

Theme switching is handled by `next-themes` with `attribute="class"`, toggling a `dark` class on `<html>` which activates Tailwind's dark mode variants.
