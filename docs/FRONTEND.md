# Frontend Documentation

Complete reference for the Next.js 14 frontend application (`apps/frontend/`).

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Directory Structure](#directory-structure)
- [Configuration Files](#configuration-files)
- [Styles](#styles)
- [App Pages & Layouts](#app-pages--layouts)
- [Components — UI (ShadCN)](#components--ui-shadcn)
- [Components — Auth](#components--auth)
- [Components — Chat](#components--chat)
- [Components — Call](#components--call)
- [Components — Layout](#components--layout)
- [Hooks](#hooks)
- [Stores (Zustand)](#stores-zustand)
- [Providers](#providers)
- [Lib Utilities](#lib-utilities)

---

## Overview

The frontend is a **Next.js 14** application using the **App Router** with TypeScript. It features a glassmorphic dark-first design, real-time messaging via Socket.IO, WebRTC audio/video calling, file sharing, and client-side state management with Zustand.

The app is split into two route groups:
- `(auth)` — Login and signup pages with gradient backgrounds (unauthenticated)
- `(main)` — Full communication interface with sidebar, header, chat, calling, and notifications (authenticated)

---

## Tech Stack

| Category | Libraries |
|----------|----------|
| **Framework** | Next.js 14 (App Router), React 18 |
| **Language** | TypeScript (strict mode) |
| **Styling** | Tailwind CSS, tailwindcss-animate, CSS custom properties |
| **Components** | ShadCN UI (Radix UI primitives), custom components |
| **State** | Zustand (7 stores: auth, chat, message, ui, call, notification, user) |
| **Animations** | Framer Motion |
| **Real-Time** | Socket.IO Client |
| **Calling** | WebRTC (RTCPeerConnection) |
| **Markdown** | react-markdown, remark-gfm, react-syntax-highlighter |
| **Icons** | Lucide React |
| **Theme** | next-themes (class-based dark mode) |
| **Notifications** | react-hot-toast |
| **Utilities** | clsx, tailwind-merge, date-fns, class-variance-authority |

---

## Directory Structure

```
apps/frontend/
├── .eslintrc.json               # ESLint config (next/core-web-vitals)
├── components.json              # ShadCN UI configuration
├── next.config.mjs              # Next.js configuration
├── next-env.d.ts                # Next.js TypeScript declarations
├── package.json                 # Dependencies and scripts
├── postcss.config.js            # PostCSS with Tailwind + autoprefixer
├── tailwind.config.ts           # Tailwind theme + animations
├── tsconfig.json                # TypeScript config (extends base)
│
└── src/
    ├── styles/
    │   └── globals.css          # CSS variables, utilities, animations
    │
    ├── lib/
    │   ├── utils.ts             # cn(), formatRelativeTime, helpers
    │   ├── constants.ts         # API URLs, prompt suggestions, shortcuts
    │   ├── api-client.ts        # HTTP client with token auto-refresh + upload
    │   └── socket-client.ts     # Socket.IO singleton
    │
    ├── store/
    │   ├── auth-store.ts        # Auth state (persisted to localStorage)
    │   ├── chat-store.ts        # Conversations state
    │   ├── message-store.ts     # Messages + streaming state
    │   ├── ui-store.ts          # UI state (sidebar, modals, settings)
    │   ├── call-store.ts        # Call state, streams, mute/camera
    │   ├── notification-store.ts # Notifications + unread count
    │   └── user-store.ts        # Online users + profile cache
    │
    ├── providers/
    │   ├── theme-provider.tsx   # next-themes wrapper
    │   ├── auth-provider.tsx    # Token validation on mount
    │   ├── socket-provider.tsx  # Socket.IO lifecycle manager
    │   └── call-provider.tsx    # Call UI (incoming dialog + active call)
    │
    ├── hooks/
    │   ├── use-socket.ts        # Socket context consumer
    │   ├── use-conversations.ts # Conversation CRUD (DM/Group/AI)
    │   ├── use-messages.ts      # Message fetching + socket listeners
    │   ├── use-streaming.ts     # AI stream handlers + error feedback
    │   ├── use-call.ts          # WebRTC peer connection management
    │   ├── use-typing.ts        # Typing indicators
    │   ├── use-presence.ts      # Online/offline tracking
    │   ├── use-notifications.ts # Real-time notifications
    │   ├── use-file-upload.ts   # File upload with progress
    │   ├── use-message-status.ts # Read receipts
    │   ├── use-keyboard-shortcuts.ts # Global keyboard handlers
    │   ├── use-clipboard.ts     # Copy to clipboard with feedback
    │   └── use-media-query.ts   # Responsive breakpoint detection
    │
    ├── components/
    │   ├── ui/                  # ShadCN base components (10 files)
    │   ├── auth/                # Auth components (3 files)
    │   ├── chat/                # Chat components (15 files)
    │   ├── call/                # Call components (4 files)
    │   └── layout/              # Layout components (8 files)
    │
    └── app/
        ├── layout.tsx           # Root layout
        ├── page.tsx             # Home redirect
        ├── (auth)/              # Unauthenticated routes
        │   ├── layout.tsx
        │   ├── login/page.tsx
        │   └── signup/page.tsx
        └── (main)/              # Authenticated routes
            ├── layout.tsx
            ├── chat/page.tsx
            └── chat/[conversationId]/page.tsx
```

---

## Configuration Files

### `next.config.mjs`

```js
const nextConfig = {
  transpilePackages: ['@ai-chat/shared'],
};
```

Tells Next.js to compile the `@ai-chat/shared` workspace package (TypeScript source, not pre-built).

### `tailwind.config.ts`

- **Dark mode**: `class` strategy (controlled by `next-themes`)
- **Content paths**: `./src/**/*.{ts,tsx}`
- **Custom colors**: All mapped from CSS custom properties
- **Custom keyframes**: `accordion-down/up`, `shimmer`, `pulse-dot`, `gradient-shift`, `sparkle`
- **Plugin**: `tailwindcss-animate`

### `tsconfig.json`

- **Extends**: `../../tsconfig.base.json` (strict, ES2022)
- **Module**: ESNext with bundler resolution
- **Path aliases**: `@/*` maps to `./src/*`

### `components.json`

ShadCN UI config: default style, RSC enabled, zinc base color, CSS variables enabled.

### `postcss.config.js`

Standard PostCSS with `tailwindcss` and `autoprefixer`.

---

## Styles

### `src/styles/globals.css`

#### CSS Custom Properties

Complete color system with light/dark variants:
- `--background`, `--foreground` — page base
- `--card`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive` — component tokens
- `--border`, `--input`, `--ring` — form elements
- `--sidebar-background`, `--sidebar-foreground` — sidebar-specific
- `--radius` — global border radius (`0.75rem`)

#### Custom Utility Classes

| Class | Description |
|-------|-------------|
| `.scrollbar-thin` | Thin 6px scrollbar with themed colors |
| `.glass` | Light glassmorphism: `backdrop-blur-xl` + semi-transparent |
| `.glass-strong` | Heavy glassmorphism: stronger blur + more opaque |
| `.gradient-text` | Text with gradient (violet → purple → cyan) via `background-clip: text` |
| `.gradient-border` | Gradient border via `::before` pseudo-element with conic gradient |
| `.glow` | Large violet box-shadow glow |
| `.glow-sm` | Small violet box-shadow glow |

#### Keyframe Animations

- **shimmer** — horizontal gradient sweep for skeleton loading
- **pulse-dot** — y-axis bounce for streaming dots
- **gradient-shift** — background position animation
- **sparkle** — scale + rotate for AI avatar

---

## App Pages & Layouts

### `src/app/layout.tsx` — Root Layout

- **Font**: Inter (Google Fonts) via `next/font/google`
- **Provider stack** (outer to inner):
  1. `ThemeProvider` — dark theme default, class-based
  2. `TooltipProvider` — Radix tooltip context
  3. `AuthProvider` — validates stored tokens on mount
  4. `Toaster` — react-hot-toast container

### `src/app/page.tsx` — Home Page

Redirect router: authenticated → `/chat`, not authenticated → `/login`.

### `src/app/(auth)/layout.tsx` — Auth Layout

Dark gradient background with two animated blur circles (violet and cyan). No sidebar or header.

### `src/app/(auth)/login/page.tsx` & `signup/page.tsx`

Render `<LoginForm />` and `<SignupForm />` respectively.

### `src/app/(main)/layout.tsx` — Main Layout

The authenticated application shell:

- **AuthGuard** — redirects to `/login` if not authenticated
- **SocketProvider** — manages Socket.IO connection
- **CallProvider** — renders IncomingCallDialog + CallView
- **usePresence()** — side-effect hook for online/offline tracking
- **Layout structure**:
  ```
  <div className="flex h-screen overflow-hidden">
    <Sidebar />
    <main className="flex-1 flex flex-col overflow-hidden">
      <AppHeader />
      {children}
    </main>
  </div>
  <SettingsDialog />
  <KeyboardShortcutsDialog />
  ```

### `src/app/(main)/chat/page.tsx` — New Conversation

Shows when no conversation is selected:
- Animated gradient AI logo
- "Start a New Conversation" heading
- Dropdown with options: AI Chat, Direct Message, Group Chat

### `src/app/(main)/chat/[conversationId]/page.tsx` — Chat View

The main chat interface:

**Hooks used:** `useMessages`, `useStreaming`, `useSocket`, `useChatStore`, `useTyping`, `useMessageStatus`

**State:** `replyToMessage` for reply-to threading

**Effects:**
- On mount: emits `join-conversation`
- On unmount: emits `leave-conversation`
- Updates `activeConversationId` in chat store

**Render:**
- `<MessageList>` with messages, streaming, reactions, reply, regenerate/edit handlers
- `<TypingIndicator>` showing who is typing
- `<MessageInput>` with file upload, reply preview, @ai indicator

---

## Components — UI (ShadCN)

All based on **Radix UI primitives** with Tailwind styling:

### `button.tsx`

**Variants** (via class-variance-authority):

| Variant | Styling |
|---------|---------|
| `default` | Primary background |
| `destructive` | Red background |
| `outline` | Bordered, transparent |
| `secondary` | Muted background |
| `ghost` | Transparent, hover background |
| `link` | Underlined text |
| `gradient` | Violet-to-purple gradient with glow |

**Sizes:** `default` (h-10), `sm` (h-9), `lg` (h-11), `icon` (h-10 w-10), `icon-sm` (h-8 w-8)

### `input.tsx`

Styled `<input>` with rounded borders, focus ring, file input styling.

### `avatar.tsx`

`Avatar`, `AvatarImage`, `AvatarFallback` — based on `@radix-ui/react-avatar`.

### `scroll-area.tsx`

`ScrollArea`, `ScrollBar` — custom thin scrollbar matching theme.

### `skeleton.tsx`

`animate-pulse` with shimmer overlay gradient sweep.

### `dropdown-menu.tsx`

Full dropdown system with `glass-strong` appearance, portal rendering, sub-menus.

### `dialog.tsx`

Dialog with `backdrop-blur-sm` overlay, `glass-strong` content, open/close animations.

### `tooltip.tsx`

Tooltip with configurable offset, fade-in animation.

### `separator.tsx`

Horizontal/vertical separator using border color.

### `badge.tsx`

Badge component for notification counts and status indicators.

---

## Components — Auth

### `auth-guard.tsx`

Reads auth state, shows spinner while loading, redirects to `/login` if not authenticated, renders children if authenticated.

### `login-form.tsx`

- Animated gradient AI logo
- Email + password inputs with icon overlays
- Show/hide password toggle
- Gradient submit button
- Flow: `POST /api/auth/login` → `setAuth(user, tokens)` → navigate to `/chat`

### `signup-form.tsx`

Same as login with additional name field and `POST /api/auth/signup`.

---

## Components — Chat

### `sidebar.tsx`

**Features:**
- Glassmorphic panel with `backdrop-blur-xl`
- Collapsible: 300px → 64px with Framer Motion
- **New Chat dropdown**: Options for AI Chat, Direct Message, Group Chat
- **Conversation type icons**: Bot (AI_CHAT), MessageSquare (DIRECT), Users (GROUP)
- **Unread count badges** on conversation items
- Search bar filtering conversations
- Grouped by date: Today, Yesterday, Previous 7 Days, Older
- Pinned conversations always at top
- Skeleton loading states

### `conversation-item.tsx`

**Props:** `conversation`, `isActive`, `isCollapsed`, action handlers

**Features:**
- Active indicator with Framer Motion `layoutId`
- **Type icon** (Bot/MessageSquare/Users)
- **Unread badge** showing count
- Pin indicator
- Inline rename with Enter/Escape
- Hover actions: pin, rename, delete
- Relative timestamps
- Collapsed mode: avatar with tooltip

### `message-bubble.tsx`

**Props:** `message`, `isStreaming?`, `streamContent?`, `onRegenerate?`, `onEdit?`, `onReply?`, `userAvatar?`, `userName?`

**User vs AI styling:** Right-aligned gradient (user) vs left-aligned muted (AI)

**Features:**
- **Reactions display**: Emoji chips at bottom of message with counts
- **Reply indicator**: Shows quoted reply-to message content
- **Status icons**: Single check (SENT), double check (DELIVERED), blue double check (READ)
- **Attachment rendering**: Inline images (expandable), video player, audio player, file download links
- **Hover toolbar**: Copy, Reply, React, Regenerate (AI), Edit (own), Delete (own)
- **Edited indicator**: "(edited)" label
- **Streaming cursor**: Blinking `|` when streaming
- **Markdown rendering**: AI messages via `<MarkdownRenderer />`
- Framer Motion entrance animation

### `message-list.tsx`

**Props:** `messages`, `streamingMessage`, `isLoading`, `onRegenerate`, `onEditMessage`, `onReply`

**Features:**
- Auto-scroll on new messages and during streaming
- Scroll-to-bottom floating action button
- Skeleton loading (3 placeholders)
- Streaming message at bottom
- StreamingIndicator when generating but no chunks yet
- AnimatePresence for enter/exit animations

### `message-input.tsx`

**Props:** `conversationId`, `isStreaming`, `onStop`, `replyToMessage?`, `onCancelReply?`

**Features:**
- Auto-resizing textarea (max 200px)
- **FileUploadButton** (paperclip icon) for file selection
- **UploadProgress** bar during upload
- **ReplyPreview** banner when replying to a message
- **@ai indicator**: Green "AI will respond" text when `@ai` detected (case-insensitive)
- **Typing emission**: Calls `emitTyping` on keystroke
- Send/Stop animated button toggle
- Character count near 10,000 limit
- Gradient border on focus
- Keyboard: Enter send, Shift+Enter newline, Escape stop

### `markdown-renderer.tsx`

**Custom renderers:**

| Element | Rendering |
|---------|-----------|
| Code blocks | Prism.js + oneDark theme, language label, copy button |
| Inline code | Accent background, rounded, smaller font |
| Links | Primary color, `target="_blank"`, external icon |
| Tables | Full-width, bordered, striped rows |
| Blockquotes | Left border, italic, muted background |
| Lists | Disc/decimal markers with spacing |
| Headings | Proper sizing with margins |

### `streaming-indicator.tsx`

3 bouncing dots with staggered animation, AI avatar, "AI is thinking..." label.

### `empty-state.tsx`

**Props:** `conversationId`, `conversationType?`

Per-conversation-type empty states:
- **AI_CHAT**: Large AI icon, "How can I help you today?", 4 suggestion chips
- **DIRECT**: "Send a message to start chatting"
- **GROUP**: "Send a message to the group"

### `reply-preview.tsx`

**Props:** `message`, `onCancel`

Shows the message being replied to with author name, truncated content, and dismiss (X) button. Displayed above the message input.

### `file-upload-button.tsx`

Paperclip icon button that triggers a hidden `<input type="file">`. Accepts images, videos, audio, and documents.

### `upload-progress.tsx`

**Props:** `fileName`, `progress`, `onCancel?`

Progress bar with filename display during file upload. Shows percentage.

### `media-viewer.tsx`

**Props:** `attachment`

Renders attachments inline based on MIME type:
- **Images**: Thumbnail with click-to-expand
- **Video**: HTML5 video player with controls
- **Audio**: HTML5 audio player
- **Documents**: File icon with download link, size display

### `reaction-picker.tsx`

**Props:** `onSelect`, `messageId`

Emoji picker popover for adding reactions to messages. Shows common emojis for quick selection.

### `typing-indicator.tsx`

**Props:** `typingUsers`

"User is typing..." with animated dots. Shows multiple users if applicable.

### `message-status.tsx`

**Props:** `status`

Checkmark icons:
- **SENT**: Single gray check
- **DELIVERED**: Double gray checks
- **READ**: Double blue checks

---

## Components — Call

### `call-view.tsx`

Full-screen active call UI:
- **Remote video**: Large main view
- **Local video**: Small picture-in-picture overlay
- **Audio-only**: Shows avatar when camera is off
- **CallControls** at bottom
- **CallTimer** display

### `incoming-call-dialog.tsx`

Modal dialog for incoming calls:
- Caller avatar and name
- Call type indicator (Audio/Video)
- **Accept button** (green, phone icon)
- **Reject button** (red, phone-off icon)
- Ringing animation

### `call-controls.tsx`

Bottom bar during active calls:

| Button | Action |
|--------|--------|
| Mute/Unmute | Toggle microphone |
| Camera On/Off | Toggle video |
| End Call | Hang up (red) |

### `call-timer.tsx`

**Props:** `startTime`

Displays call duration in `mm:ss` format, updating every second.

---

## Components — Layout

### `app-header.tsx`

Top navigation bar:
- Mobile menu button (hamburger, mobile only)
- **Phone icon button** — start audio call (visible in DIRECT conversations)
- **Video icon button** — start video call (visible in DIRECT conversations)
- **NotificationPopover** — bell icon with unread badge
- Connection status indicator
- Theme toggle
- User menu

### `user-menu.tsx`

Avatar dropdown with:
- User name and email
- "Settings" → opens SettingsDialog
- "Keyboard Shortcuts" → opens shortcuts dialog
- "Log Out" → API logout + disconnect socket + clear store + navigate

### `theme-toggle.tsx`

Ghost button toggling Sun/Moon icons with rotation animation.

### `connection-status.tsx`

- **Connected**: Green dot with glow
- **Disconnected**: Red dot with animation
- Text label (hidden on small screens)

### `keyboard-shortcuts.tsx`

Dialog showing all shortcuts with platform-aware key labels (Cmd vs Ctrl).

### `confirm-dialog.tsx`

**Props:** `open`, `onOpenChange`, `title`, `description`, `confirmLabel?`, `cancelLabel?`, `variant?`, `onConfirm`

Reusable confirmation modal with default/destructive variants.

### `settings-dialog.tsx`

Profile settings dialog:
- **Avatar upload**: Click to change profile picture
- **Name field**: Editable display name
- **Bio field**: Editable biography textarea
- **Status field**: Custom status text
- Save button calls `PATCH /api/users/profile`

### `notification-popover.tsx`

Bell icon button with unread count badge. Popover contains:
- Scrollable notification list
- Each notification: icon, title, body, relative time
- "Mark all as read" button
- Click notification to navigate to relevant conversation

---

## Hooks

### `use-socket.ts`

**Returns:** `{ socket: Socket | null, isConnected: boolean }`

Wrapper around `useContext(SocketContext)`. Throws if used outside provider.

### `use-conversations.ts`

**Returns:** `{ conversations, isLoadingConversations, createConversation, deleteConversation, renameConversation, togglePin, refetch }`

- **Fetch**: `GET /api/conversations` with optional `?search=` from chat-store
- **Create**: Supports `type` parameter:
  - `AI_CHAT` — single user conversation
  - `DIRECT` — requires `participantId`
  - `GROUP` — requires `groupName` and `memberIds`
- **Delete**: `DELETE /api/conversations/:id`
- **Rename**: `PATCH /api/conversations/:id` with `{ title }`
- **Toggle pin**: `PATCH /api/conversations/:id` with `{ isPinned }`
- Auto-fetch on mount and when `searchQuery` changes

### `use-messages.ts`

**Returns:** `{ messages, isLoading, refetch }`

- **Fetch**: `GET /api/conversations/:id/messages` (skips if cached)
- **Socket listeners:**
  - `NEW_MESSAGE` → adds to store
  - `MESSAGE_DELETED` → removes from store
  - `MESSAGE_UPDATED` → updates in store
  - `MESSAGE_REACTION_UPDATED` → updates reactions on message
  - `MESSAGE_STATUS_UPDATE` → updates status (sent/delivered/read)
- Cursor-based pagination support

### `use-streaming.ts`

**Returns:** `{ streamingMessage, isStreaming, aiError, stopGeneration }`

- **Socket listeners:**
  - `AI_STREAM_START` → creates streaming message placeholder
  - `AI_STREAM_CHUNK` → appends text to streaming content
  - `AI_STREAM_END` → finalizes stream, adds completed message
  - `AI_STREAM_ERROR` → clears streaming, **adds visible error message** to chat via `addMessage` (shows as `⚠️ **AI Error:** ...`)
- **`stopGeneration()`**: Emits `STOP_GENERATION` with `{ conversationId }`
- Returns `aiError` state for UI display

### `use-call.ts`

**Returns:** `{ initiateCall, acceptCall, rejectCall, endCall }`

- **WebRTC setup**: Creates `RTCPeerConnection` with STUN servers
- **Media**: `getUserMedia` for local audio/video stream
- **Socket listeners:**
  - `CALL_RINGING` → set call status, show incoming dialog
  - `CALL_ACCEPTED` → create offer, begin WebRTC handshake
  - `CALL_REJECTED` → reset call state
  - `CALL_ENDED` → close peer connection, stop streams
  - `CALL_OFFER` → set remote description, create answer
  - `CALL_ANSWER` → set remote description
  - `CALL_ICE_CANDIDATE` → add ICE candidate (with queuing)
- **ICE candidate queuing**: Candidates arriving before remote description is set are queued and flushed once ready
- **Stream management**: Sets local/remote streams in call-store
- **Cleanup**: Closes peer connection, stops media tracks on end

### `use-typing.ts`

**Returns:** `{ typingUsers, emitTyping }`

- **Emit**: Debounced `TYPING_START`/`TYPING_STOP` emission
- **Listen**: `TYPING` events from other users
- Returns Set/array of typing user names for display
- Auto-clears typing state after timeout

### `use-presence.ts`

**Returns:** nothing (side-effect hook)

- Listens for `USER_ONLINE` → adds userId to user-store `onlineUsers` Set
- Listens for `USER_OFFLINE` → removes userId from `onlineUsers` Set
- Called once in main layout

### `use-notifications.ts`

**Returns:** `{ notifications, unreadCount, markRead, markAllRead }`

- **Fetch**: `GET /api/notifications` on mount
- **Unread count**: `GET /api/notifications/unread-count`
- **Socket listener**: `NEW_NOTIFICATION` → adds to store, increments count, shows toast
- **markRead**: `PATCH /api/notifications/:id/read`
- **markAllRead**: `PATCH /api/notifications/read-all`

### `use-file-upload.ts`

**Returns:** `{ upload, isUploading, progress, error, reset }`

- **upload(file)**: `POST /api/upload` with FormData
- Uses `XMLHttpRequest` for progress tracking (0-100%)
- Returns: `{ fileUrl, thumbnailUrl?, fileName, fileSize, mimeType }`
- `reset()` clears upload state

### `use-message-status.ts`

**Returns:** `{ markAsRead }`

- Emits `MESSAGE_READ` socket event with `{ conversationId, messageIds }`
- Called when user views/scrolls to unread messages
- Updates message status to READ

### `use-keyboard-shortcuts.ts`

Global keyboard handler attached to `window`:

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Toggle search |
| `Ctrl/Cmd + N` | New conversation |
| `Ctrl/Cmd + Shift + S` | Toggle sidebar |
| `Ctrl/Cmd + Shift + D` | Toggle theme |
| `?` | Toggle shortcuts dialog (not in input) |

### `use-clipboard.ts`

**Returns:** `{ copy, hasCopied }`

- `copy(text)` → `navigator.clipboard.writeText()` + toast
- `hasCopied` resets after 2000ms

### `use-media-query.ts`

- `useMediaQuery(query): boolean` — generic media query hook
- `useIsMobile(): boolean` — pre-configured for `(max-width: 768px)`

---

## Stores (Zustand)

### `auth-store.ts`

**State:**
- `user: UserPublic | null`
- `tokens: { accessToken, refreshToken } | null`
- `isAuthenticated: boolean`
- `isLoading: boolean`

**Actions:** `setAuth`, `setTokens`, `setUser`, `logout`, `setLoading`

**Persistence:** Tokens in `localStorage` (`ai-chat-tokens`), user in `localStorage` (`ai-chat-user`). Restored on store initialization.

### `chat-store.ts`

**State:**
- `conversations: Conversation[]`
- `activeConversationId: string | null`
- `isLoadingConversations: boolean`
- `searchQuery: string`

**Actions:** `setConversations`, `addConversation`, `removeConversation`, `setActiveConversation`, `updateConversation`, `setLoadingConversations`, `setSearchQuery`

No persistence — fetched from API each session.

### `message-store.ts`

**State:**
- `messages: Record<string, Message[]>` — keyed by conversationId
- `streamingMessage: StreamingMessage | null`
- `isStreaming: boolean`
- `loadingConversations: Set<string>`

**Actions:**

| Action | Description |
|--------|-------------|
| `setMessages(convId, msgs)` | Set messages for conversation |
| `addMessage(convId, msg)` | Append message (also used for AI error messages) |
| `removeMessage(convId, msgId)` | Remove specific message |
| `updateMessage(convId, msgId, data)` | Partial update |
| `clearMessages(convId)` | Clear all for conversation |
| `setStreamingMessage(msg)` | Set in-progress stream |
| `appendStreamChunk(chunk)` | Append text to stream |
| `finalizeStream(savedId, content)` | Move stream to messages array |
| `setIsStreaming(bool)` | Update streaming flag |

### `ui-store.ts`

**State:**
- `isSidebarOpen: boolean` — mobile sidebar
- `isSidebarCollapsed: boolean` — desktop collapsed
- `isSearchOpen: boolean`
- `isShortcutsOpen: boolean`
- `isSettingsOpen: boolean`

**Actions:** Toggle/set methods for each state.

### `call-store.ts`

**State:**
- `activeCall: Call | null` — current call record
- `callStatus: 'idle' | 'ringing' | 'connecting' | 'active' | 'ended'`
- `isMuted: boolean`
- `isCameraOff: boolean`
- `callDuration: number` — seconds
- `localStream: MediaStream | null`
- `remoteStream: MediaStream | null`

**Actions:** `setActiveCall`, `setCallStatus`, `toggleMute`, `toggleCamera`, `setCallDuration`, `setLocalStream`, `setRemoteStream`, `resetCall`

### `notification-store.ts`

**State:**
- `notifications: Notification[]`
- `unreadCount: number`

**Actions:** `setNotifications`, `addNotification`, `markRead`, `markAllRead`, `setUnreadCount`

### `user-store.ts`

**State:**
- `onlineUsers: Set<string>` — set of online userIds
- `userProfiles: Record<string, UserPublic>` — profile cache

**Actions:** `setUserOnline`, `setUserOffline`, `cacheProfile`, `cacheProfiles`, `isOnline(userId)`, `getProfile(userId)`

---

## Providers

### `theme-provider.tsx`

Wrapper around `next-themes` ThemeProvider:
- `defaultTheme="dark"`
- `attribute="class"` (toggles `.dark` on `<html>`)
- `enableSystem` for system preference detection

### `auth-provider.tsx`

**Lifecycle:**
1. Configure API client with token management callbacks
2. Validate token on mount:
   - No token → done
   - Token exists → `GET /api/auth/me`
     - Success → update user
     - 401 → try refresh → update or logout

### `socket-provider.tsx`

**Context:** `{ socket: Socket | null, isConnected: boolean }`

- Connects when access token becomes available
- Disconnects when token cleared or unmount
- Socket config: websocket + polling, 5 reconnection attempts, 1-5s delay

### `call-provider.tsx`

**Renders:**
- `<IncomingCallDialog />` when `callStatus === 'ringing'`
- `<CallView />` when `callStatus === 'connecting' | 'active'`

Integrates with `useCall` hook for WebRTC management.

---

## Lib Utilities

### `utils.ts`

| Function | Description |
|----------|-------------|
| `cn(...inputs)` | Combines `clsx` + `twMerge` for Tailwind class deduplication |
| `formatRelativeTime(dateString)` | ISO string → "just now", "Xm ago", "Xh ago", "Xd ago", or formatted date |
| `groupConversationsByDate(conversations)` | Groups into `{ today, yesterday, previous7Days, older }` |
| `truncate(str, length)` | Truncates with "..." if longer than length |

### `constants.ts`

| Constant | Description |
|----------|-------------|
| `API_URL` | Backend REST API URL (env or `http://localhost:4000`) |
| `SOCKET_URL` | Socket.IO server URL (env or `http://localhost:4000`) |
| `PROMPT_SUGGESTIONS` | 4 starter prompts with title, description, icon, color |
| `KEYBOARD_SHORTCUTS` | Shortcut definitions with windows/mac key labels |

### `api-client.ts`

| Export | Description |
|--------|-------------|
| `configureApiClient(config)` | Set up token management callbacks |
| `api.get<T>(path)` | GET with auth |
| `api.post<T>(path, body)` | POST with auth |
| `api.patch<T>(path, body)` | PATCH with auth |
| `api.delete(path)` | DELETE with auth |
| `api.upload<T>(path, formData)` | POST FormData with auth (for file uploads) |

**Auto-refresh:** On 401, attempts token refresh. On success, retries original request. On failure, triggers logout.

### `socket-client.ts`

| Function | Description |
|----------|-------------|
| `connectSocket(token)` | Create Socket.IO connection with JWT auth (singleton) |
| `getSocket()` | Get current socket instance |
| `disconnectSocket()` | Disconnect and clear singleton |

**Config:** Auto-connect, 5 reconnection attempts, 1-5s delay, websocket + polling transports.
