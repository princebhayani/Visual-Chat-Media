# AI Chat Application

A production-ready, real-time AI-powered chat application built with a modern monorepo architecture. Features token-by-token streaming responses from Google Gemini, glassmorphic UI design, and comprehensive conversation management.

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

### Core Chat
- Real-time AI chat with **token-by-token streaming** responses from Google Gemini
- Conversation memory with intelligent **context trimming** (20 messages / 30,000 characters)
- **Message regeneration** — re-generate any AI response with one click
- **Message editing** — edit a user message and automatically re-generate the AI response from that point
- **Stop generation** — abort AI response mid-stream with AbortController

### Conversation Management
- Create, rename, and delete conversations
- **Pin conversations** to the top of the sidebar
- **Search conversations** by title or message content (case-insensitive)
- **Export conversations** as JSON or Markdown files
- **Custom system prompts** per conversation for different AI personas
- **Auto-title generation** — AI automatically names conversations based on the first message

### UI & Design
- **Glassmorphism design** with frosted glass panels and backdrop-blur effects
- **Gradient accents** — violet-to-purple-to-cyan gradients on buttons, borders, and highlights
- **Dark-first design** with seamless light mode toggle
- **Framer Motion animations** — page transitions, message entrances, sidebar collapse, button interactions
- **Custom thin scrollbar** matching the theme
- **Responsive mobile layout** with collapsible sidebar
- **Skeleton loading states** with shimmer effects for conversations and messages

### Messages
- **Markdown rendering** with syntax-highlighted code blocks (Prism.js, oneDark theme)
- **Copy button** on every code block and message
- **Styled tables, blockquotes, lists, and links** with external link indicators
- User messages with gradient backgrounds, AI messages with muted glass backgrounds
- Timestamps with "edited" indicators
- Hover toolbar with copy, regenerate, and edit actions

### Authentication & Security
- **JWT authentication** with access tokens (15 min) and refresh tokens (7 days)
- **Refresh token rotation** stored in Redis for revocation capability
- **Bcrypt password hashing** with 12 salt rounds
- **Rate limiting** — 60 requests/min general, 20 requests/min for AI endpoints
- **Helmet security headers** and CORS protection
- **Zod validation** on all API inputs (shared between frontend and backend)

### Real-Time
- **Socket.IO WebSocket** connection with JWT authentication
- Room-based conversation isolation
- Real-time message delivery and stream events
- Connection status indicator (green = connected, red = disconnected)
- Automatic reconnection (5 attempts, 1-5 second delay)

### Extras
- **Keyboard shortcuts** for power users (Ctrl+K search, Ctrl+N new chat, Ctrl+Shift+D theme toggle)
- **Prompt suggestions** on empty conversations (4 clickable starter prompts)
- **Toast notifications** for all actions (success, error, info)
- **Character count** indicator with warning near the 10,000 character limit

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript |
| **Styling** | Tailwind CSS, ShadCN UI (Radix primitives), Framer Motion |
| **State** | Zustand (4 stores: auth, chat, message, ui) |
| **Backend** | Node.js, Express, TypeScript |
| **Real-Time** | Socket.IO (WebSocket + polling fallback) |
| **AI** | Google Gemini API (`@google/generative-ai`) |
| **Database** | PostgreSQL (via Prisma ORM) |
| **Cache** | Redis (via ioredis) — refresh tokens, rate limiting |
| **Auth** | JWT (jsonwebtoken), bcryptjs |
| **Validation** | Zod (shared schemas between frontend and backend) |
| **Monorepo** | npm workspaces |

---

## Project Structure

```
visual-chat-media2/
├── package.json                          # Root workspace config
├── tsconfig.base.json                    # Shared TypeScript config
├── .env.example                          # Environment template
├── .gitignore                            # Git ignore rules
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
│           │   ├── message.ts            # Message, MessageRole, StreamingMessage
│           │   ├── conversation.ts       # Conversation, ConversationWithMessages
│           │   ├── auth.ts               # AuthTokens, LoginResponse, payloads
│           │   └── socket-events.ts      # Typed Socket.IO events
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
│   │   │   └── schema.prisma            # Database models
│   │   └── src/
│   │       ├── index.ts                  # HTTP server + Socket.IO entry
│   │       ├── app.ts                    # Express app factory
│   │       ├── config/
│   │       │   ├── env.ts               # Zod-validated environment
│   │       │   ├── database.ts          # Prisma singleton
│   │       │   ├── redis.ts             # ioredis client
│   │       │   └── gemini.ts            # Gemini AI client + system prompt
│   │       ├── lib/
│   │       │   ├── api-error.ts         # Custom ApiError class
│   │       │   ├── async-handler.ts     # Async route wrapper
│   │       │   └── logger.ts            # Structured console logger
│   │       ├── middleware/
│   │       │   ├── auth.middleware.ts    # JWT verification
│   │       │   ├── rate-limit.middleware.ts # Rate limiting
│   │       │   ├── error.middleware.ts   # Global error handler
│   │       │   └── validate.middleware.ts # Zod validation
│   │       ├── features/
│   │       │   ├── auth/
│   │       │   │   ├── jwt.service.ts   # Sign/verify JWTs
│   │       │   │   ├── auth.service.ts  # Signup, login, refresh, logout
│   │       │   │   ├── auth.controller.ts # Route handlers
│   │       │   │   └── auth.router.ts   # Auth routes
│   │       │   ├── chat/
│   │       │   │   ├── chat.service.ts  # Conversation + message CRUD
│   │       │   │   ├── chat.controller.ts # Route handlers
│   │       │   │   └── chat.router.ts   # Chat routes
│   │       │   └── ai/
│   │       │       ├── context-manager.ts # Context trimming algorithm
│   │       │       └── ai.service.ts    # Gemini streaming service
│   │       └── socket/
│   │           ├── socket.handler.ts    # Socket.IO auth + setup
│   │           └── chat.socket.ts       # Chat event handlers
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
│           │   ├── api-client.ts        # Fetch wrapper with auto-refresh
│           │   └── socket-client.ts     # Socket.IO singleton
│           ├── store/
│           │   ├── auth-store.ts        # Auth state + localStorage
│           │   ├── chat-store.ts        # Conversations state
│           │   ├── message-store.ts     # Messages + streaming state
│           │   └── ui-store.ts          # Sidebar, search, modals
│           ├── providers/
│           │   ├── theme-provider.tsx    # next-themes wrapper
│           │   ├── auth-provider.tsx     # Token validation on mount
│           │   └── socket-provider.tsx   # Socket.IO lifecycle
│           ├── hooks/
│           │   ├── use-socket.ts        # Socket context wrapper
│           │   ├── use-conversations.ts # Conversations CRUD
│           │   ├── use-messages.ts      # Message fetching + listeners
│           │   ├── use-streaming.ts     # AI stream event handlers
│           │   ├── use-keyboard-shortcuts.ts # Global shortcuts
│           │   ├── use-clipboard.ts     # Copy with feedback
│           │   └── use-media-query.ts   # Responsive detection
│           ├── components/
│           │   ├── ui/                  # ShadCN base components
│           │   │   ├── button.tsx       # Variants: default, gradient, ghost, etc.
│           │   │   ├── input.tsx
│           │   │   ├── avatar.tsx
│           │   │   ├── scroll-area.tsx
│           │   │   ├── skeleton.tsx
│           │   │   ├── dropdown-menu.tsx
│           │   │   ├── dialog.tsx
│           │   │   ├── tooltip.tsx
│           │   │   └── separator.tsx
│           │   ├── auth/
│           │   │   ├── auth-guard.tsx   # Protected route wrapper
│           │   │   ├── login-form.tsx   # Email/password login
│           │   │   └── signup-form.tsx  # Registration form
│           │   ├── chat/
│           │   │   ├── sidebar.tsx      # Glassmorphic collapsible sidebar
│           │   │   ├── conversation-item.tsx # Conversation list item
│           │   │   ├── message-bubble.tsx # User/AI message bubbles
│           │   │   ├── message-list.tsx # Scrollable message container
│           │   │   ├── message-input.tsx # Auto-resize textarea + send
│           │   │   ├── markdown-renderer.tsx # Markdown + code highlighting
│           │   │   ├── streaming-indicator.tsx # AI thinking dots
│           │   │   └── empty-state.tsx  # Welcome + prompt suggestions
│           │   └── layout/
│           │       ├── app-header.tsx   # Top bar + controls
│           │       ├── user-menu.tsx    # Avatar dropdown
│           │       ├── theme-toggle.tsx # Dark/light switch
│           │       ├── connection-status.tsx # WebSocket indicator
│           │       ├── keyboard-shortcuts.tsx # Shortcuts dialog
│           │       └── confirm-dialog.tsx # Reusable confirmation
│           └── app/
│               ├── layout.tsx           # Root layout with providers
│               ├── page.tsx             # Home redirect
│               ├── (auth)/
│               │   ├── layout.tsx       # Gradient background
│               │   ├── login/page.tsx
│               │   └── signup/page.tsx
│               └── (main)/
│                   ├── layout.tsx       # AuthGuard + Sidebar + Header
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
| **Redis** | >= 6 | Refresh token storage, rate limiting |
| **Google Gemini API Key** | — | AI response generation |

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
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection URL. Supports `redis://` and `rediss://` (TLS) |
| `JWT_SECRET` | Yes | — | Secret key for signing access tokens. **Minimum 32 characters** |
| `JWT_REFRESH_SECRET` | Yes | — | Secret key for signing refresh tokens. **Minimum 32 characters** |
| `GEMINI_API_KEY` | Yes | — | Google AI Studio API key. Get one at [aistudio.google.com](https://aistudio.google.com/) |
| `GEMINI_MODEL` | No | `gemini-2.0-flash` | Gemini model identifier. Options: `gemini-2.0-flash`, `gemini-1.5-pro`, `gemini-1.5-flash`, etc. |
| `PORT` | No | `4000` | Backend server port |
| `FRONTEND_URL` | No | `http://localhost:3000` | Frontend URL for CORS configuration |
| `NODE_ENV` | No | `development` | Environment: `development`, `production`, or `test` |
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:4000` | Backend API URL (accessible from browser) |
| `NEXT_PUBLIC_SOCKET_URL` | No | `http://localhost:4000` | Socket.IO server URL (accessible from browser) |

**Example `.env` file:**

```env
# Database
DATABASE_URL="postgresql://postgres:mypassword@localhost:5432/ai_chat?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT (use long random strings — at least 32 characters)
JWT_SECRET="your-super-secret-jwt-key-at-least-32-characters-long"
JWT_REFRESH_SECRET="your-refresh-token-secret-at-least-32-characters-long"

# Google Gemini AI
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

The application uses **PostgreSQL** with **Prisma ORM**. The database has 3 models: `User`, `Conversation`, and `Message`.

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
| `POST` | `/api/auth/signup` | No | `{ name, email, password }` | Create a new account. Returns `{ user, tokens }` |
| `POST` | `/api/auth/login` | No | `{ email, password }` | Login with credentials. Returns `{ user, tokens }` |
| `POST` | `/api/auth/refresh` | No | `{ refreshToken }` | Exchange refresh token for new token pair |
| `POST` | `/api/auth/logout` | Yes | — | Revoke refresh token (deletes from Redis) |
| `GET` | `/api/auth/me` | Yes | — | Get current user profile |

### Conversations (`/api/conversations`)

| Method | Path | Auth | Request Body / Params | Description |
|--------|------|------|----------------------|-------------|
| `GET` | `/api/conversations` | Yes | Query: `?search=term` | List all conversations (pinned first, then by date) |
| `POST` | `/api/conversations` | Yes | `{ title?, systemPrompt? }` | Create a new conversation |
| `GET` | `/api/conversations/:id` | Yes | — | Get a single conversation with metadata |
| `PATCH` | `/api/conversations/:id` | Yes | `{ title?, isPinned?, systemPrompt? }` | Update conversation properties |
| `DELETE` | `/api/conversations/:id` | Yes | — | Delete a conversation and all its messages |
| `GET` | `/api/conversations/:id/messages` | Yes | Query: `?cursor=id&limit=50` | Get messages with cursor-based pagination |
| `GET` | `/api/conversations/:id/export` | Yes | Query: `?format=markdown\|json` | Export conversation as file |

### Response Format

**Success:**
```json
{
  "id": "uuid",
  "title": "My Chat",
  "isPinned": false,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "messages": [...]
}
```

**Error:**
```json
{
  "message": "Error description",
  "errors": {
    "email": ["Invalid email format"],
    "password": ["Must be at least 8 characters"]
  }
}
```

---

## Socket.IO Events

Connect with: `io("http://localhost:4000", { auth: { token: "jwt-access-token" } })`

### Client to Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join-conversation` | `{ conversationId }` | Join a conversation room |
| `leave-conversation` | `{ conversationId }` | Leave a conversation room |
| `send-message` | `{ content, conversationId }` | Send a message (triggers AI response) |
| `stop-generation` | `{ conversationId }` | Abort AI generation mid-stream |
| `regenerate-response` | `{ conversationId }` | Delete last AI message and regenerate |
| `edit-message` | `{ messageId, content }` | Edit a user message (deletes subsequent messages, regenerates AI) |

### Server to Client

| Event | Payload | Description |
|-------|---------|-------------|
| `new-message` | `{ id, content, role, conversationId, createdAt }` | A new message was saved |
| `ai-stream-start` | `{ messageId, conversationId }` | AI has started generating a response |
| `ai-stream-chunk` | `{ chunk, conversationId }` | A chunk of the AI response (token-by-token) |
| `ai-stream-end` | `{ content, conversationId, savedMessageId }` | AI finished generating. Full content + saved message ID |
| `ai-stream-error` | `{ error, conversationId }` | AI generation failed |
| `message-deleted` | `{ messageId, conversationId }` | A message was deleted |
| `message-updated` | `{ message }` | A message was edited |
| `conversation-updated` | `{ conversation }` | Conversation metadata changed (title, pin status) |
| `error` | `{ message }` | General socket error |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open conversation search |
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
| Dark Mode | Full dark theme with luminous accents |
| Mobile | Responsive mobile layout with slide-out sidebar |
| Streaming | Token-by-token AI response with typing indicator |
| Code Block | Syntax-highlighted code with copy button |

---

## License

This project is private and not licensed for public distribution.
