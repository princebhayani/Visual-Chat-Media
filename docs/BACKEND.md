# Backend Documentation

Complete reference for every file in the Express + Socket.IO backend application (`apps/backend/`).

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
- [Socket.IO](#socketio)
- [App Entry Points](#app-entry-points)
- [REST API Reference](#rest-api-reference)
- [Socket.IO Event Reference](#socketio-event-reference)

---

## Overview

The backend is a **Node.js** server built with **Express** for REST APIs and **Socket.IO** for real-time WebSocket communication. It connects to **PostgreSQL** (via Prisma ORM), **Redis** (via ioredis), and **Google Gemini** (via `@google/generative-ai`) for AI-powered streaming responses.

The codebase follows a **feature-based folder structure** with the **Service → Controller → Router** pattern. All business logic lives in services, HTTP concerns in controllers, and route definitions in routers.

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
| **Environment** | dotenv | ^16.4.7 |
| **Dev Server** | tsx | ^4.19.2 |

---

## Directory Structure

```
apps/backend/
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript config (CommonJS output)
├── prisma/
│   └── schema.prisma           # Database models + relations
│
└── src/
    ├── index.ts                # Server entry: HTTP + Socket.IO + Redis
    ├── app.ts                  # Express app factory with middleware
    │
    ├── config/
    │   ├── env.ts              # Zod-validated environment variables
    │   ├── database.ts         # Prisma client singleton
    │   ├── redis.ts            # ioredis client + connection
    │   └── gemini.ts           # Gemini AI model + system prompt
    │
    ├── lib/
    │   ├── api-error.ts        # Custom ApiError class
    │   ├── async-handler.ts    # Async route error wrapper
    │   └── logger.ts           # Structured console logger
    │
    ├── middleware/
    │   ├── auth.middleware.ts   # JWT verification + AuthRequest
    │   ├── rate-limit.middleware.ts  # Rate limiting (general + AI)
    │   ├── error.middleware.ts  # Global error handler
    │   └── validate.middleware.ts   # Zod schema validation
    │
    ├── features/
    │   ├── auth/
    │   │   ├── jwt.service.ts      # Sign/verify JWT tokens
    │   │   ├── auth.service.ts     # Signup, login, refresh, logout
    │   │   ├── auth.controller.ts  # HTTP request handlers
    │   │   └── auth.router.ts      # Route definitions
    │   │
    │   ├── chat/
    │   │   ├── chat.service.ts     # Conversation + message CRUD
    │   │   ├── chat.controller.ts  # HTTP request handlers
    │   │   └── chat.router.ts      # Route definitions
    │   │
    │   └── ai/
    │       ├── context-manager.ts  # Context trimming algorithm
    │       └── ai.service.ts       # Gemini streaming integration
    │
    └── socket/
        ├── socket.handler.ts   # Socket.IO auth + setup
        └── chat.socket.ts      # Real-time chat event handlers
```

---

## Configuration

### `src/config/env.ts`

**Purpose:** Validates all environment variables at startup using Zod. The server will not start if any required variable is missing or invalid.

**Exports:**
- `env` — Validated environment object
- `Env` — TypeScript type (inferred from Zod schema)

**Validated Variables:**

| Variable | Type | Default | Validation |
|----------|------|---------|------------|
| `PORT` | number | `4000` | Coerced from string |
| `DATABASE_URL` | string | — | Required |
| `REDIS_URL` | string | `redis://localhost:6379` | Optional |
| `JWT_SECRET` | string | — | Required, min 32 chars |
| `JWT_REFRESH_SECRET` | string | — | Required, min 32 chars |
| `GEMINI_API_KEY` | string | — | Required |
| `GEMINI_MODEL` | string | `gemini-2.0-flash` | Optional |
| `FRONTEND_URL` | string | `http://localhost:3000` | Optional |
| `NODE_ENV` | enum | `development` | `development`, `production`, `test` |

**Environment file loading:**
1. Loads `.env` from project root (`../../../../.env` relative to the compiled output)
2. Loads `.env.local` with `override: true` (for local overrides)

### `src/config/database.ts`

**Purpose:** Creates a Prisma client singleton to prevent multiple database connections.

**Exports:**
- `prisma` — PrismaClient instance

**Logic:**
- Uses `globalThis` to store the Prisma instance across hot reloads in development
- Logging configuration:
  - Development: `warn` + `error` level logs
  - Production: `error` level logs only

### `src/config/redis.ts`

**Purpose:** Creates and manages the Redis connection.

**Exports:**
- `redis` — ioredis client instance
- `connectRedis()` — Async function to establish the connection

**Configuration:**
- `maxRetriesPerRequest: 3` — limits retry attempts per command
- `lazyConnect: true` — defers connection until `connectRedis()` is called
- Event listeners for `connect` (log success) and `error` (log error)

### `src/config/gemini.ts`

**Purpose:** Initializes the Google Generative AI client and defines the system prompt.

**Exports:**
- `geminiModel` — `GenerativeModel` instance configured with `env.GEMINI_MODEL`
- `SYSTEM_PROMPT` — String constant defining the AI's behavior

**System Prompt:**
The AI is instructed to be a helpful, friendly assistant that:
- Provides clear and concise answers
- Uses markdown formatting for structured responses
- Wraps code in language-tagged code blocks
- Acknowledges when it doesn't know something
- Is conversational yet informative

---

## Prisma Database Schema

**File:** `prisma/schema.prisma`

### User Model

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `id` | String | `@id @default(uuid())` | Primary key, auto-generated UUID |
| `email` | String | `@unique` | User's email address, must be unique |
| `name` | String | — | Display name |
| `avatarUrl` | String? | nullable | Profile picture URL |
| `passwordHash` | String | required | Bcrypt-hashed password (12 salt rounds) |
| `createdAt` | DateTime | `@default(now())` | Account creation timestamp |
| `updatedAt` | DateTime | `@updatedAt` | Last update timestamp |

**Relations:**
- `conversations` → `Conversation[]` (one-to-many)
- `messages` → `Message[]` (one-to-many)

**Indexes:**
- `@@index([email])` — fast email lookup for login

### Conversation Model

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `id` | String | `@id @default(uuid())` | Primary key |
| `title` | String | `@default("New Chat")` | Conversation title (auto-generated or user-set) |
| `userId` | String | FK → User | Owner of the conversation |
| `isPinned` | Boolean | `@default(false)` | Whether pinned to top of sidebar |
| `systemPrompt` | String? | nullable | Custom AI persona/instructions for this conversation |
| `createdAt` | DateTime | `@default(now())` | Creation timestamp |
| `updatedAt` | DateTime | `@updatedAt` | Last activity timestamp |

**Relations:**
- `user` → `User` (many-to-one, `onDelete: Cascade`)
- `messages` → `Message[]` (one-to-many)

**Indexes:**
- `@@index([userId])` — fast user conversation listing
- `@@index([updatedAt])` — ordering by recent activity

### Message Model

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `id` | String | `@id @default(uuid())` | Primary key |
| `content` | String | — | Message text content |
| `role` | MessageRole | enum | `USER` or `ASSISTANT` |
| `conversationId` | String | FK → Conversation | Parent conversation |
| `userId` | String? | FK → User, nullable | Sender (null for AI messages) |
| `isEdited` | Boolean | `@default(false)` | Whether the message was edited |
| `tokenCount` | Int? | nullable | Token count for usage tracking |
| `createdAt` | DateTime | `@default(now())` | Message timestamp |

**Relations:**
- `conversation` → `Conversation` (many-to-one, `onDelete: Cascade`)
- `user` → `User?` (many-to-one, `onDelete: SetNull`)

**Indexes:**
- `@@index([conversationId, createdAt])` — fast message retrieval in chronological order

### Enums

```
MessageRole:
  USER       — Message sent by a human user
  ASSISTANT  — Message generated by the AI
```

### Cascade Behavior

| Deletion | Effect |
|----------|--------|
| Delete a **User** | All their Conversations are deleted (CASCADE). Their Messages have `userId` set to null (SET NULL) |
| Delete a **Conversation** | All its Messages are deleted (CASCADE) |

---

## Middleware

### `src/middleware/auth.middleware.ts`

**Purpose:** Protects routes by verifying JWT access tokens.

**Exports:**
- `authMiddleware` — Express middleware function
- `AuthRequest` — Interface extending `Request` with `userId` and `userEmail`

**Logic:**
1. Extracts token from `Authorization: Bearer <token>` header
2. If no token → throws `ApiError(401, 'Authentication required')`
3. Calls `verifyAccessToken(token)` from JWT service
4. If invalid → throws `ApiError(401, 'Invalid or expired token')`
5. Attaches `userId` and `userEmail` to the request object
6. Calls `next()` to proceed

**Usage:** Applied to all `/api/conversations` routes and `POST /api/auth/logout`, `GET /api/auth/me`.

### `src/middleware/rate-limit.middleware.ts`

**Purpose:** Prevents abuse by limiting request frequency per IP.

**Exports:**
- `rateLimitMiddleware` — General rate limiter (60 req/min)
- `aiRateLimit` — Stricter limiter for AI endpoints (20 req/min)

**Configuration:**

| Limiter | Max Requests | Window | Headers |
|---------|-------------|--------|---------|
| General | 60 | 60 seconds | `RateLimit-*` standard headers |
| AI | 20 | 60 seconds | `RateLimit-*` standard headers |

**Error response:** `{ message: "Too many requests, please try again later." }`

### `src/middleware/error.middleware.ts`

**Purpose:** Global error handler — catches all errors that propagate through the Express pipeline.

**Exports:**
- `errorMiddleware` — Express error handler (4 parameters)

**Logic:**
1. If error is `ApiError` instance:
   - Returns `err.statusCode` with `{ message, errors }` body
2. If error is unexpected:
   - Logs full error to console via logger
   - Returns `500` with `{ message: "Internal server error" }`

### `src/middleware/validate.middleware.ts`

**Purpose:** Factory function that creates validation middleware from Zod schemas.

**Exports:**
- `validate(schema)` — Returns Express middleware

**Logic:**
1. Takes a Zod schema as parameter
2. Calls `schema.safeParse(req.body)` on incoming request
3. If valid → replaces `req.body` with parsed data (strips unknown fields) → calls `next()`
4. If invalid → extracts field-level errors from Zod issues → throws `ApiError(400)` with:
   ```json
   {
     "message": "Validation failed",
     "errors": {
       "email": ["Invalid email format"],
       "password": ["Must be at least 8 characters"]
     }
   }
   ```

---

## Lib Utilities

### `src/lib/api-error.ts`

**Purpose:** Custom error class for API error responses with HTTP status codes.

**Exports:**
- `ApiError` class (extends `Error`)

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `statusCode` | number | HTTP status code (400, 401, 404, 409, 500, etc.) |
| `message` | string | Human-readable error message |
| `errors` | `Record<string, string[]>?` | Optional field-level validation errors |

**Usage:** `throw new ApiError(404, 'Conversation not found')`

### `src/lib/async-handler.ts`

**Purpose:** Wraps async Express route handlers to automatically catch promise rejections and forward them to the error middleware.

**Exports:**
- `asyncHandler(fn)` — Takes an async function, returns a wrapped `RequestHandler`

**Logic:**
```
Without:  async (req, res) => { ... }     ← Unhandled rejection if throws
With:     asyncHandler(async (req, res) => { ... })  ← Error forwarded to next()
```

Eliminates the need for `try-catch` blocks in every route handler.

### `src/lib/logger.ts`

**Purpose:** Simple structured console logger with timestamps.

**Exports:**
- `logger` object with `info()`, `warn()`, `error()`, `debug()` methods

**Format:** `[2024-01-15T10:30:00.000Z] INFO: Server started on port 4000`

**Behavior:**
| Method | Output | Condition |
|--------|--------|-----------|
| `info()` | `console.log` | Always |
| `warn()` | `console.warn` | Always |
| `error()` | `console.error` | Always |
| `debug()` | `console.log` | Only in development (`NODE_ENV !== 'production'`) |

---

## Feature: Auth

### `src/features/auth/jwt.service.ts`

**Purpose:** Handles JWT token signing and verification.

**Exports:**

| Export | Description |
|--------|-------------|
| `TokenPayload` | Interface: `{ userId: string, email: string }` |
| `signAccessToken(payload)` | Signs a JWT with `JWT_SECRET`, expires in `15m`. Returns token string |
| `signRefreshToken(payload)` | Signs a JWT with `JWT_REFRESH_SECRET`, expires in `7d`. Returns token string |
| `verifyAccessToken(token)` | Verifies and decodes access token. Returns `TokenPayload` or `null` on failure |
| `verifyRefreshToken(token)` | Verifies and decodes refresh token. Returns `TokenPayload` or `null` on failure |

**Security design:**
- Access and refresh tokens use **different secrets** to prevent cross-use
- Verify functions return `null` instead of throwing (safe pattern for middleware)
- Short access token TTL (15min) limits the damage window of a stolen token

### `src/features/auth/auth.service.ts`

**Purpose:** Core authentication business logic.

**Exports:**

#### `signup(data: SignupInput): Promise<{ user, tokens }>`

1. Checks if email already exists → throws `ApiError(409, 'Email already registered')`
2. Hashes password with `bcrypt.hash(password, 12)` (12 salt rounds)
3. Creates user in database via Prisma
4. Generates access + refresh token pair
5. Stores refresh token in Redis (`refresh:{userId}`, TTL: 7 days)
6. Returns `{ user: formatUser(user), tokens }`

#### `login(data: LoginInput): Promise<{ user, tokens }>`

1. Finds user by email → throws `ApiError(401, 'Invalid credentials')` if not found
2. Compares password with stored hash via `bcrypt.compare()`
3. If mismatch → throws `ApiError(401, 'Invalid credentials')`
4. Generates tokens and stores refresh in Redis
5. Returns `{ user, tokens }`

#### `refreshTokens(refreshToken: string): Promise<{ user, tokens }>`

1. Verifies the refresh token JWT → throws `ApiError(401)` if invalid
2. Checks if token matches the one stored in Redis (`refresh:{userId}`)
   - If mismatch → throws `ApiError(401, 'Refresh token revoked')` (token was rotated or revoked)
3. Looks up user in database
4. Generates new token pair and replaces refresh token in Redis
5. Returns `{ user, tokens }`

#### `logout(userId: string): Promise<void>`

Deletes the refresh token from Redis (`redis.del('refresh:{userId}')`). This immediately invalidates the refresh token, preventing new access tokens from being issued.

#### `getProfile(userId: string): Promise<UserPublic>`

Fetches user from database by ID. Returns public fields only (id, email, name, avatarUrl).

**Internal helpers:**
- `generateTokens(userId, email)` — Creates both token types
- `storeRefreshToken(userId, token)` — Stores in Redis with 7-day TTL
- `formatUser(user)` — Strips sensitive fields (passwordHash)

### `src/features/auth/auth.controller.ts`

**Purpose:** HTTP request handlers for auth endpoints.

**Exports:** All wrapped with `asyncHandler()` for automatic error catching.

| Handler | HTTP | Logic |
|---------|------|-------|
| `signup` | POST | Calls `authService.signup(req.body)`, returns 201 |
| `login` | POST | Calls `authService.login(req.body)`, returns 200 |
| `refreshToken` | POST | Extracts `refreshToken` from body, calls `authService.refreshTokens()` |
| `logout` | POST | Gets `userId` from `AuthRequest`, calls `authService.logout()` |
| `getProfile` | GET | Gets `userId` from `AuthRequest`, calls `authService.getProfile()` |

### `src/features/auth/auth.router.ts`

**Purpose:** Defines auth route endpoints.

**Routes:**

| Method | Path | Middleware | Handler |
|--------|------|-----------|---------|
| POST | `/signup` | `validate(signupSchema)` | `authController.signup` |
| POST | `/login` | `validate(loginSchema)` | `authController.login` |
| POST | `/refresh` | none | `authController.refreshToken` |
| POST | `/logout` | `authMiddleware` | `authController.logout` |
| GET | `/me` | `authMiddleware` | `authController.getProfile` |

**Mounted at:** `/api/auth` (configured in `app.ts`)

---

## Feature: Chat

### `src/features/chat/chat.service.ts`

**Purpose:** All database operations for conversations and messages.

**Exports (10 functions):**

#### `listConversations(userId, search?): Promise<Conversation[]>`

- Queries all conversations belonging to the user
- If `search` is provided: filters by title OR message content (case-insensitive `contains`)
- **Sort order**: Pinned first (`isPinned: desc`), then by `updatedAt: desc`
- Returns conversation metadata (no messages)

#### `createConversation(userId, title?, systemPrompt?): Promise<Conversation>`

- Creates a new conversation with default title "New Chat"
- Optional custom title and system prompt
- Returns the created conversation

#### `getConversation(id, userId): Promise<ConversationWithMessages>`

- Fetches a single conversation by ID
- **Ownership check**: Verifies `userId` matches → throws `ApiError(404)` if unauthorized
- Returns conversation with metadata (no messages inline — messages are fetched separately)

#### `updateConversation(id, userId, data): Promise<Conversation>`

- Updates conversation properties (title, isPinned, systemPrompt)
- **Ownership check**: Verifies `userId` matches
- Accepts partial data (only updates provided fields)
- Returns updated conversation

#### `deleteConversation(id, userId): Promise<void>`

- Deletes a conversation and all its messages (CASCADE)
- **Ownership check**: Verifies `userId` matches

#### `getMessages(conversationId, userId, cursor?, limit?): Promise<Message[]>`

- Fetches messages for a conversation with **cursor-based pagination**
- **Default limit**: 50 messages
- **Cursor**: If provided, fetches messages before the cursor message (older messages)
- **Sort**: `createdAt: asc` (chronological order)
- **Ownership check**: Verifies the conversation belongs to the user

#### `saveMessage(conversationId, content, role, userId?, tokenCount?): Promise<Message>`

- Creates a new message in the database
- `userId` is optional (null for AI-generated messages)
- `tokenCount` is optional (for future usage tracking)
- Returns the saved message

#### `deleteLastAssistantMessage(conversationId, userId): Promise<Message | null>`

- Finds the most recent ASSISTANT message in the conversation
- Deletes it from the database
- Returns the deleted message (or null if none found)
- Used by the **regenerate** feature to remove the old AI response before generating a new one

#### `editMessage(messageId, userId, content): Promise<Message>`

- Updates the content of a user message
- Sets `isEdited: true` on the message
- **Cascade delete**: Deletes ALL messages that were created AFTER the edited message
  - This removes the old AI response and any subsequent messages
  - The AI will regenerate from the edited message
- Returns the updated message

#### `exportConversation(id, userId, format?): Promise<string | object>`

- Exports a conversation with all its messages
- **Ownership check**: Verifies `userId` matches
- **Formats supported:**
  - `json` — Returns structured JSON object with conversation metadata and messages
  - `markdown` (default) — Returns formatted markdown string:
    ```markdown
    # Conversation Title

    **Created:** 2024-01-15
    **Messages:** 24

    ---

    **User** (10:30 AM):
    Hello, how are you?

    **Assistant** (10:30 AM):
    I'm doing well! How can I help you today?
    ```

### `src/features/chat/chat.controller.ts`

**Purpose:** HTTP handlers with response formatting.

**Response formatting logic:**
- Converts `createdAt` / `updatedAt` timestamps to ISO strings (`.toISOString()`)
- Converts message roles to lowercase (`USER` → `user`, `ASSISTANT` → `assistant`)
- Structures consistent response objects

**Exports:**

| Handler | Logic |
|---------|-------|
| `listConversations` | Calls service with `req.query.search`, formats and returns array |
| `createConversation` | Calls service with body data, returns 201 with formatted conversation |
| `getConversation` | Calls service with `req.params.id`, formats and returns |
| `updateConversation` | Calls service with `req.params.id` + body, formats and returns |
| `deleteConversation` | Calls service with `req.params.id`, returns `{ message: "Deleted" }` |
| `getMessages` | Calls service with cursor/limit from query, formats messages array |
| `exportConversation` | Calls service with format from query. Sets content-type header for downloads |

**Note:** `req.params.id` is cast as `string` due to Express 5 types returning `string | string[]`.

### `src/features/chat/chat.router.ts`

**Purpose:** Chat route definitions.

**Routes:**

| Method | Path | Middleware | Handler |
|--------|------|-----------|---------|
| GET | `/` | none | `chatController.listConversations` |
| POST | `/` | `validate(createConversationSchema)` | `chatController.createConversation` |
| GET | `/:id` | none | `chatController.getConversation` |
| PATCH | `/:id` | `validate(updateConversationSchema)` | `chatController.updateConversation` |
| DELETE | `/:id` | none | `chatController.deleteConversation` |
| GET | `/:id/messages` | none | `chatController.getMessages` |
| GET | `/:id/export` | none | `chatController.exportConversation` |

**Mounted at:** `/api/conversations` with `authMiddleware` applied at the router level (configured in `app.ts`)

---

## Feature: AI

### `src/features/ai/context-manager.ts`

**Purpose:** Trims conversation history to fit within Gemini's context window limits.

**Exports:**
- `buildContext(messages, currentMessage): ContextMessage[]`

**Constants:**
| Constant | Value | Purpose |
|----------|-------|---------|
| `MAX_CONTEXT_MESSAGES` | 20 | Maximum number of historical messages to include |
| `MAX_CONTEXT_CHARS` | 30,000 | Maximum total character count across all context messages |

**Algorithm:**

```
Input: Full message history + current user message

Step 1: Take the most recent 20 messages (slice from end)

Step 2: Character budget check
  - Initialize totalChars = 0
  - Iterate BACKWARDS through the 20 messages:
    - totalChars += message.content.length
    - If totalChars > 30,000:
      - Record the cutoff index
      - Slice array from cutoff to end (keep only recent)
      - Break loop

Step 3: Return trimmed messages in chronological order
  - Each message formatted as: { role: 'user'|'model', parts: [{ text }] }

Result: Most recent messages that fit within both limits
```

**Why backward iteration?** This ensures the most recent messages (which are most relevant to the current conversation context) are always preserved, while older messages are trimmed first.

### `src/features/ai/ai.service.ts`

**Purpose:** Handles streaming AI responses from Google Gemini.

**Exports:**
- `streamAIResponse(conversationId, userMessage, callbacks, abortSignal?, customSystemPrompt?): Promise<string>`

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `conversationId` | string | Conversation to generate for |
| `userMessage` | string | The user's message text |
| `callbacks` | object | `{ onChunk, onComplete, onError }` |
| `abortSignal` | AbortSignal? | For cancellation support |
| `customSystemPrompt` | string? | Override the default system prompt |

**Flow:**

1. **Fetch history**: Queries all messages for the conversation from the database
2. **Build context**: Calls `buildContext()` to trim history to fit Gemini limits
3. **Select system prompt**: Uses `customSystemPrompt` if provided, otherwise `SYSTEM_PROMPT` from config
4. **Initialize Gemini chat**: Calls `geminiModel.startChat({ history: context })`
5. **Stream response**: Calls `chat.sendMessageStream(userMessage)` which returns an async iterable
6. **Emit chunks**: Iterates over the stream:
   - For each chunk: calls `callbacks.onChunk(chunkText)` and appends to accumulator
   - Checks `abortSignal.aborted` between chunks — throws `AbortError` if aborted
7. **Complete**: Calls `callbacks.onComplete(fullContent)` with the accumulated text
8. **Error handling**: Calls `callbacks.onError(error)` on any exception
9. **Returns**: The full accumulated response string

**AbortController integration:**
- The calling code (socket handler) creates an `AbortController` per generation
- The `AbortSignal` is checked between each chunk from Gemini
- When `stop-generation` socket event is received, `controller.abort()` is called
- The AI service catches the abort and stops streaming

---

## Socket.IO

### `src/socket/socket.handler.ts`

**Purpose:** Sets up Socket.IO server with JWT authentication middleware.

**Exports:**
- `AuthenticatedSocket` — Interface extending Socket with `userId: string`
- `setupSocketIO(io)` — Configures authentication and event handling

**Auth Middleware:**

```
Socket connection attempt
  │
  ▼
Extract token from socket.handshake.auth.token
  │
  ├── No token → next(new Error('Authentication required'))
  │
  ▼
verifyAccessToken(token)
  │
  ├── Invalid → next(new Error('Invalid token'))
  │
  ▼
Attach userId to socket object
  │
  ▼
next() → Connection established
```

**Connection handler:**
- Logs connection with userId
- Calls `chatSocketHandler(io, socket)` for chat event registration
- Logs disconnection on `disconnect` event
- Logs errors on `error` event

### `src/socket/chat.socket.ts`

**Purpose:** Handles all real-time chat events. This is the core of the real-time system.

**Exports:**
- `chatSocketHandler(io, socket)` — Registers all event listeners on an authenticated socket

**State:**
- `activeGenerations: Map<string, AbortController>` — Tracks in-flight AI generations by conversationId, enabling cancellation

**Event Handlers:**

#### `JOIN_CONVERSATION`
- **Payload:** `{ conversationId: string }`
- **Action:** `socket.join('conversation:' + conversationId)`
- Adds the socket to the conversation's room for targeted messaging

#### `LEAVE_CONVERSATION`
- **Payload:** `{ conversationId: string }`
- **Action:** `socket.leave('conversation:' + conversationId)`
- Removes the socket from the room

#### `SEND_MESSAGE`
- **Payload:** `{ content: string, conversationId: string }`
- **Flow:**
  1. Save user message to database via `chatService.saveMessage()`
  2. Broadcast `NEW_MESSAGE` event to the room
  3. **Auto-title check**: If conversation title is "New Chat":
     - Uses the first user message content (truncated to 50 chars) as the title
     - Updates conversation in database
     - Emits `CONVERSATION_UPDATED` event
  4. Call `streamToClient()` to start AI generation

#### `STOP_GENERATION`
- **Payload:** `{ conversationId: string }`
- **Action:** Looks up the `AbortController` in `activeGenerations` Map and calls `.abort()`
- The AI service's stream loop detects the abort and stops

#### `REGENERATE_RESPONSE`
- **Payload:** `{ conversationId: string }`
- **Flow:**
  1. Delete the last assistant message via `chatService.deleteLastAssistantMessage()`
  2. Emit `MESSAGE_DELETED` to the room
  3. Find the last user message in the conversation
  4. Call `streamToClient()` with the last user message content

#### `EDIT_MESSAGE`
- **Payload:** `{ messageId: string, content: string }`
- **Flow:**
  1. Edit the message via `chatService.editMessage()` (this also deletes all subsequent messages)
  2. Emit `MESSAGE_UPDATED` to the room
  3. Call `streamToClient()` with the edited content to regenerate the AI response

#### `streamToClient(io, socket, conversationId, userMessage)` (internal helper)

The core streaming function:

1. Create `AbortController` and store in `activeGenerations` Map
2. Emit `AI_STREAM_START` event with a temporary message ID
3. Fetch conversation to check for custom `systemPrompt`
4. Call `aiService.streamAIResponse()` with callbacks:
   - **onChunk**: Emit `AI_STREAM_CHUNK` to the room
   - **onComplete**:
     - Save full AI message to database
     - Emit `AI_STREAM_END` with final content and saved message ID
     - Emit `NEW_MESSAGE` with the saved message
   - **onError**: Emit `AI_STREAM_ERROR` with error message
5. Clean up: Remove from `activeGenerations` Map when done

---

## App Entry Points

### `src/app.ts`

**Purpose:** Express application factory. Creates and configures the Express app with all middleware and routes.

**Exports:**
- `createApp()` — Returns configured Express application

**Middleware stack (in order):**

| Order | Middleware | Purpose |
|-------|-----------|---------|
| 1 | `helmet()` | Security headers |
| 2 | `cors({ origin: env.FRONTEND_URL, credentials: true })` | CORS with frontend origin |
| 3 | `express.json({ limit: '1mb' })` | JSON body parser with 1MB limit |
| 4 | `cookieParser()` | Cookie parsing |
| 5 | `rateLimitMiddleware` | Global rate limiting (60 req/min) |

**Routes:**

| Path | Handler | Auth |
|------|---------|------|
| `GET /health` | Returns `{ status: 'ok' }` | No |
| `/api/auth/*` | `authRouter` | Per-route |
| `/api/conversations/*` | `chatRouter` with `authMiddleware` | Yes (all routes) |

**Error handling:** `errorMiddleware` is registered last to catch all errors.

### `src/index.ts`

**Purpose:** Server entry point. Creates HTTP server, initializes Socket.IO, connects to Redis, and starts listening.

**`main()` function flow:**

```
1. Connect to Redis
   └── await connectRedis()

2. Create Express app
   └── const app = createApp()

3. Create HTTP server
   └── const server = http.createServer(app)

4. Initialize Socket.IO
   └── const io = new Server(server, {
         cors: { origin: env.FRONTEND_URL, credentials: true },
         transports: ['websocket', 'polling']
       })

5. Set up Socket.IO handlers
   └── setupSocketIO(io)

6. Start listening
   └── server.listen(env.PORT)
   └── Log: "Server running on port {PORT}"
   └── Log: "Frontend URL: {FRONTEND_URL}"
   └── Log: "Gemini Model: {GEMINI_MODEL}"
```

**Error handling:** Catches fatal errors, logs them, and exits with code 1.

---

## REST API Reference

### Base URL: `http://localhost:4000`

### Authentication Endpoints

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| `POST` | `/api/auth/signup` | No | `{ name: string, email: string, password: string }` | `201 { user: UserPublic, tokens: { accessToken, refreshToken } }` |
| `POST` | `/api/auth/login` | No | `{ email: string, password: string }` | `200 { user: UserPublic, tokens: { accessToken, refreshToken } }` |
| `POST` | `/api/auth/refresh` | No | `{ refreshToken: string }` | `200 { user: UserPublic, tokens: { accessToken, refreshToken } }` |
| `POST` | `/api/auth/logout` | Yes | — | `200 { message: "Logged out successfully" }` |
| `GET` | `/api/auth/me` | Yes | — | `200 { id, email, name, avatarUrl }` |

### Conversation Endpoints

| Method | Path | Auth | Request / Query | Response |
|--------|------|------|----------------|----------|
| `GET` | `/api/conversations` | Yes | `?search=term` | `200 Conversation[]` (pinned first, then by updatedAt desc) |
| `POST` | `/api/conversations` | Yes | `{ title?: string, systemPrompt?: string }` | `201 Conversation` |
| `GET` | `/api/conversations/:id` | Yes | — | `200 Conversation` |
| `PATCH` | `/api/conversations/:id` | Yes | `{ title?, isPinned?, systemPrompt? }` | `200 Conversation` |
| `DELETE` | `/api/conversations/:id` | Yes | — | `200 { message: "Deleted" }` |
| `GET` | `/api/conversations/:id/messages` | Yes | `?cursor=msgId&limit=50` | `200 Message[]` (chronological) |
| `GET` | `/api/conversations/:id/export` | Yes | `?format=markdown\|json` | `200` markdown string or JSON object |

### Error Responses

| Status | Meaning | Example |
|--------|---------|---------|
| `400` | Validation error | `{ message: "Validation failed", errors: { email: ["Invalid email"] } }` |
| `401` | Authentication error | `{ message: "Invalid or expired token" }` |
| `404` | Not found / unauthorized | `{ message: "Conversation not found" }` |
| `409` | Conflict | `{ message: "Email already registered" }` |
| `429` | Rate limited | `{ message: "Too many requests, please try again later." }` |
| `500` | Server error | `{ message: "Internal server error" }` |

### Validation Rules

**Signup:**
| Field | Rules |
|-------|-------|
| `email` | Valid email format (Zod `.email()`) |
| `password` | Minimum 8 characters |
| `name` | 2-50 characters |

**Login:**
| Field | Rules |
|-------|-------|
| `email` | Valid email format |
| `password` | Minimum 1 character |

**Create Conversation:**
| Field | Rules |
|-------|-------|
| `title` | Optional, 1-200 characters |
| `systemPrompt` | Optional, max 2000 characters |

**Update Conversation:**
| Field | Rules |
|-------|-------|
| `title` | Optional, 1-200 characters |
| `isPinned` | Optional, boolean |
| `systemPrompt` | Optional, max 2000 characters, nullable |

**Send Message:**
| Field | Rules |
|-------|-------|
| `content` | 1-10,000 characters |
| `conversationId` | Valid UUID |

**Edit Message:**
| Field | Rules |
|-------|-------|
| `messageId` | Valid UUID |
| `content` | 1-10,000 characters |

---

## Socket.IO Event Reference

### Connection

```javascript
const socket = io('http://localhost:4000', {
  auth: { token: 'jwt-access-token' },
  transports: ['websocket', 'polling'],
});
```

The server validates the JWT token during the handshake. Invalid tokens are rejected with an error event.

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `join-conversation` | `{ conversationId: string }` | Join a conversation room to receive messages |
| `leave-conversation` | `{ conversationId: string }` | Leave a conversation room |
| `send-message` | `{ content: string, conversationId: string }` | Send a message. Triggers AI response generation |
| `stop-generation` | `{ conversationId: string }` | Abort an in-progress AI generation |
| `regenerate-response` | `{ conversationId: string }` | Delete last AI message and regenerate |
| `edit-message` | `{ messageId: string, content: string }` | Edit a user message. Deletes subsequent messages and regenerates AI response |
| `typing-start` | `{ conversationId: string }` | (Defined but not yet implemented) |
| `typing-stop` | `{ conversationId: string }` | (Defined but not yet implemented) |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `new-message` | `{ id, content, role, conversationId, userId?, isEdited, tokenCount?, createdAt }` | A new message was saved to the database (user or AI) |
| `ai-stream-start` | `{ messageId: string, conversationId: string }` | AI generation has started. `messageId` is a temporary ID |
| `ai-stream-chunk` | `{ chunk: string, conversationId: string }` | A piece of the AI response (token-by-token) |
| `ai-stream-end` | `{ content: string, conversationId: string, savedMessageId: string }` | AI generation complete. `content` is the full response. `savedMessageId` is the database ID |
| `ai-stream-error` | `{ error: string, conversationId: string }` | AI generation failed |
| `message-deleted` | `{ messageId: string, conversationId: string }` | A message was removed (from regeneration or edit cascade) |
| `message-updated` | `{ message: Message }` | A message was edited |
| `conversation-updated` | `{ conversation: Conversation }` | Conversation metadata changed (title, pin) |
| `error` | `{ message: string }` | General socket error |

### Event Flow Examples

**Normal message send:**
```
Client: send-message { content: "Hello", conversationId: "abc" }
Server: new-message { ... user message saved ... }
Server: ai-stream-start { messageId: "tmp-123", conversationId: "abc" }
Server: ai-stream-chunk { chunk: "Hi", conversationId: "abc" }
Server: ai-stream-chunk { chunk: " there", conversationId: "abc" }
Server: ai-stream-chunk { chunk: "!", conversationId: "abc" }
Server: ai-stream-end { content: "Hi there!", savedMessageId: "msg-456", conversationId: "abc" }
Server: new-message { ... AI message saved ... }
```

**Stop generation:**
```
Client: send-message { content: "Write a long essay", conversationId: "abc" }
Server: ai-stream-start { ... }
Server: ai-stream-chunk { chunk: "Sure, " }
Server: ai-stream-chunk { chunk: "here is " }
Client: stop-generation { conversationId: "abc" }
Server: ai-stream-end { content: "Sure, here is ", savedMessageId: "msg-789" }
```

**Regenerate:**
```
Client: regenerate-response { conversationId: "abc" }
Server: message-deleted { messageId: "old-ai-msg" }
Server: ai-stream-start { ... }
Server: ai-stream-chunk { ... }
Server: ai-stream-end { ... new AI response ... }
```

**Edit message:**
```
Client: edit-message { messageId: "msg-123", content: "Updated question" }
Server: message-updated { ... edited message ... }
Server: ai-stream-start { ... }
Server: ai-stream-chunk { ... }
Server: ai-stream-end { ... new AI response for edited message ... }
```
