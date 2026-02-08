# Frontend Documentation

Complete reference for every file in the Next.js 14 frontend application (`apps/frontend/`).

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
- [Components — Layout](#components--layout)
- [Hooks](#hooks)
- [Stores (Zustand)](#stores-zustand)
- [Providers](#providers)
- [Lib Utilities](#lib-utilities)

---

## Overview

The frontend is a **Next.js 14** application using the **App Router** with TypeScript. It features a glassmorphic dark-first design, real-time AI chat via Socket.IO, and client-side state management with Zustand.

The app is split into two route groups:
- `(auth)` — Login and signup pages with gradient backgrounds (unauthenticated)
- `(main)` — Chat interface with sidebar, header, and real-time messaging (authenticated)

---

## Tech Stack

| Category | Libraries |
|----------|----------|
| **Framework** | Next.js 14 (App Router), React 18 |
| **Language** | TypeScript (strict mode) |
| **Styling** | Tailwind CSS, tailwindcss-animate, CSS custom properties |
| **Components** | ShadCN UI (Radix UI primitives), custom components |
| **State** | Zustand (4 stores) |
| **Animations** | Framer Motion |
| **Real-Time** | Socket.IO Client |
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
    │   ├── api-client.ts        # HTTP client with token auto-refresh
    │   └── socket-client.ts     # Socket.IO singleton
    │
    ├── store/
    │   ├── auth-store.ts        # Auth state (persisted to localStorage)
    │   ├── chat-store.ts        # Conversations state
    │   ├── message-store.ts     # Messages + streaming state
    │   └── ui-store.ts          # UI state (sidebar, modals)
    │
    ├── providers/
    │   ├── theme-provider.tsx   # next-themes wrapper
    │   ├── auth-provider.tsx    # Token validation on mount
    │   └── socket-provider.tsx  # Socket.IO lifecycle manager
    │
    ├── hooks/
    │   ├── use-socket.ts        # Socket context consumer
    │   ├── use-conversations.ts # Conversation CRUD operations
    │   ├── use-messages.ts      # Message fetching + socket listeners
    │   ├── use-streaming.ts     # AI stream event handlers
    │   ├── use-keyboard-shortcuts.ts # Global keyboard shortcut handler
    │   ├── use-clipboard.ts     # Copy to clipboard with feedback
    │   └── use-media-query.ts   # Responsive breakpoint detection
    │
    ├── components/
    │   ├── ui/                  # ShadCN base components (9 files)
    │   ├── auth/                # Auth components (3 files)
    │   ├── chat/                # Chat components (8 files)
    │   └── layout/              # Layout components (6 files)
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

- **`transpilePackages`**: Tells Next.js to compile the `@ai-chat/shared` workspace package (since it uses TypeScript source directly, not pre-built output).

### `tailwind.config.ts`

- **Dark mode**: `class` strategy (controlled by `next-themes`)
- **Content paths**: `./src/**/*.{ts,tsx}`
- **Custom colors**: All mapped from CSS custom properties (`--background`, `--foreground`, `--primary`, `--sidebar`, etc.)
- **Custom keyframes**:
  - `accordion-down` / `accordion-up` — expand/collapse animations
  - `shimmer` — loading skeleton gradient sweep
  - `pulse-dot` — streaming indicator dot bounce
  - `gradient-shift` — background gradient animation
  - `sparkle` — AI avatar sparkle effect
- **Plugin**: `tailwindcss-animate` for utility animation classes

### `tsconfig.json`

- **Extends**: `../../tsconfig.base.json` (strict, ES2022)
- **Module**: ESNext with bundler module resolution
- **JSX**: `preserve` (Next.js handles compilation)
- **Path aliases**: `@/*` maps to `./src/*`
- **Incremental**: `true` for faster rebuilds

### `components.json`

ShadCN UI configuration:
- **Style**: default
- **RSC**: `true` (React Server Components enabled)
- **Tailwind base color**: `zinc`
- **CSS variables**: enabled
- **Aliases**: `@/components`, `@/lib/utils`

### `postcss.config.js`

Standard PostCSS with `tailwindcss` and `autoprefixer` plugins.

### `.eslintrc.json`

Extends `next/core-web-vitals` for Next.js best practices.

---

## Styles

### `src/styles/globals.css`

#### CSS Custom Properties

The file defines a complete color system with CSS variables for light and dark themes:

**Light theme (`:root`):**
- `--background`, `--foreground` — page base colors
- `--card`, `--card-foreground` — card component colors
- `--primary`, `--primary-foreground` — primary action colors (violet)
- `--secondary`, `--secondary-foreground` — secondary colors
- `--muted`, `--muted-foreground` — muted/disabled colors
- `--accent`, `--accent-foreground` — accent highlights
- `--destructive`, `--destructive-foreground` — danger/error colors
- `--border`, `--input`, `--ring` — form element colors
- `--sidebar-background`, `--sidebar-foreground` — sidebar-specific colors
- `--radius` — global border radius (`0.75rem`)

**Dark theme (`.dark`):**
All variables are redefined with dark-appropriate values.

#### Custom Utility Classes

| Class | What It Does |
|-------|-------------|
| `.scrollbar-thin` | Thin custom scrollbar (6px) with themed colors. Uses `::-webkit-scrollbar` for Chrome/Safari and `scrollbar-width: thin` for Firefox |
| `.glass` | Light glassmorphism: `backdrop-blur-xl` + semi-transparent background + subtle border |
| `.glass-strong` | Heavy glassmorphism: stronger `backdrop-blur` + more opaque background |
| `.gradient-text` | Text with `background-clip: text` gradient (violet → purple → cyan) |
| `.gradient-border` | Gradient border using `::before` pseudo-element with conic gradient and mask technique |
| `.glow` | Large box-shadow glow effect (violet) |
| `.glow-sm` | Small box-shadow glow effect |

#### Keyframe Animations

Defined in Tailwind config and referenced in `globals.css`:
- **shimmer** — horizontal gradient sweep for skeleton loading
- **pulse-dot** — y-axis bounce for streaming dots
- **gradient-shift** — background position animation for gradient elements
- **sparkle** — scale + rotate for AI avatar

---

## App Pages & Layouts

### `src/app/layout.tsx` — Root Layout

The root layout wraps the entire application:

- **Font**: Inter (Google Fonts) loaded via `next/font/google`
- **Metadata**: Title "AI Chat", description about Gemini-powered conversations
- **Provider stack** (outer to inner):
  1. `ThemeProvider` — dark theme by default, class-based switching, `suppressHydrationWarning`
  2. `TooltipProvider` — Radix tooltip context
  3. `AuthProvider` — validates stored tokens on mount
  4. `Toaster` — react-hot-toast container
- **Body classes**: `font-sans antialiased` with Inter variable font

### `src/app/page.tsx` — Home Page

Client component that acts as a redirect router:
- If `isAuthenticated` → redirect to `/chat`
- If not loading and not authenticated → redirect to `/login`
- Shows a loading spinner while auth state is being determined

### `src/app/(auth)/layout.tsx` — Auth Layout

Layout for login and signup pages:
- **Background**: Dark gradient with two animated blur circles (violet and cyan) for visual depth
- **Centering**: Flexbox centered content, full viewport height
- **No sidebar or header** — clean, focused auth experience

### `src/app/(auth)/login/page.tsx`

Renders the `<LoginForm />` component. No additional logic.

### `src/app/(auth)/signup/page.tsx`

Renders the `<SignupForm />` component. No additional logic.

### `src/app/(main)/layout.tsx` — Main Layout

The authenticated application shell:
- **AuthGuard** — wraps everything, redirects to `/login` if not authenticated
- **SocketProvider** — manages Socket.IO connection lifecycle
- **Layout structure**:
  ```
  <div className="flex h-screen overflow-hidden">
    <Sidebar />
    <main className="flex-1 flex flex-col overflow-hidden">
      <AppHeader />
      {children}          ← Chat pages render here
    </main>
  </div>
  ```
- **Keyboard shortcuts** hook is initialized here
- **KeyboardShortcutsDialog** is rendered (controlled by ui-store)

### `src/app/(main)/chat/page.tsx` — New Conversation

Shows when no conversation is selected (`/chat` without an ID):
- Animated gradient AI logo
- "Start a New Conversation" heading
- "New Chat" button that creates a conversation and navigates to it

### `src/app/(main)/chat/[conversationId]/page.tsx` — Chat View

The main chat interface for an active conversation:

**Hooks used:**
- `useMessages(conversationId)` — fetches messages, listens for real-time updates
- `useStreaming(conversationId)` — handles AI stream events
- `useSocket()` — Socket.IO connection
- `useChatStore()` — sets active conversation ID

**Effects:**
- On mount: emits `join-conversation` socket event
- On unmount: emits `leave-conversation` socket event
- Updates `activeConversationId` in chat store

**Handlers:**
- `handleRegenerate()` — emits `regenerate-response` socket event
- `handleEditMessage(messageId, content)` — emits `edit-message` socket event

**Render:**
- `<MessageList>` with messages, streaming state, loading indicator, regenerate/edit handlers
- `<MessageInput>` with conversation ID, streaming state, stop handler

---

## Components — UI (ShadCN)

All UI components are based on **Radix UI primitives** with custom Tailwind styling. They follow the ShadCN pattern of being manually created (not CLI-generated).

### `button.tsx`

**Exports:** `Button` component, `buttonVariants` function

**Variants** (via class-variance-authority):

| Variant | Styling |
|---------|---------|
| `default` | Primary background with foreground text |
| `destructive` | Red background for dangerous actions |
| `outline` | Bordered with transparent background |
| `secondary` | Muted background |
| `ghost` | Transparent, shows background on hover |
| `link` | Underlined text, no background |
| `gradient` | Violet-to-purple gradient with white text, glow on hover |

**Sizes:**

| Size | Dimensions |
|------|-----------|
| `default` | `h-10 px-4 py-2` |
| `sm` | `h-9 px-3` |
| `lg` | `h-11 px-8` |
| `icon` | `h-10 w-10` |
| `icon-sm` | `h-8 w-8` |

**Features:**
- `active:scale-[0.97]` for press feedback
- Supports Radix `Slot` for polymorphic rendering (`asChild` prop)
- `forwardRef` for ref forwarding

### `input.tsx`

**Exports:** `Input` component

- Styled `<input>` with rounded borders, focus ring, and placeholder support
- File input styling for upload fields
- Disabled state with reduced opacity
- Transition animations on focus

### `avatar.tsx`

**Exports:** `Avatar`, `AvatarImage`, `AvatarFallback`

- Based on `@radix-ui/react-avatar`
- `Avatar`: Container with `rounded-full overflow-hidden`
- `AvatarImage`: `object-cover` image fill
- `AvatarFallback`: Centered fallback content (initials, icons)

### `scroll-area.tsx`

**Exports:** `ScrollArea`, `ScrollBar`

- Based on `@radix-ui/react-scroll-area`
- Custom thin scrollbar matching theme colors
- Supports vertical and horizontal orientations
- Smooth hover transitions on scrollbar thumb

### `skeleton.tsx`

**Exports:** `Skeleton` component

- `animate-pulse` base with rounded corners
- **Shimmer overlay**: Additional `::after` pseudo-element with animated gradient sweep
- Used for loading states in conversations list and messages

### `dropdown-menu.tsx`

**Exports:** `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuGroup`, `DropdownMenuPortal`, `DropdownMenuSub`, and sub-menu components

- Based on `@radix-ui/react-dropdown-menu`
- Content uses `glass-strong` class for glassmorphic appearance
- Open/close animations (fade + scale from top)
- Portal rendering for proper z-index stacking
- Items have focus and hover states with accent colors

### `dialog.tsx`

**Exports:** `Dialog`, `DialogPortal`, `DialogOverlay`, `DialogClose`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`

- Based on `@radix-ui/react-dialog`
- **Overlay**: `backdrop-blur-sm` with semi-transparent black background
- **Content**: `glass-strong` styling, centered with `2xl` shadow
- Open/close animations (fade + zoom from 95% to 100%)
- Close button (X) in top-right corner
- `DialogHeader` and `DialogFooter` for consistent layout

### `tooltip.tsx`

**Exports:** `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`

- Based on `@radix-ui/react-tooltip`
- Content styled with popover colors
- Configurable `sideOffset` (default: 4px)
- Fade-in animation with zoom effect

### `separator.tsx`

**Exports:** `Separator` component

- Based on `@radix-ui/react-separator`
- Supports horizontal and vertical orientations
- Uses border color from theme

---

## Components — Auth

### `auth-guard.tsx`

**File:** `src/components/auth/auth-guard.tsx`

**Props:** `{ children: React.ReactNode }`

**Logic:**
1. Reads `isAuthenticated` and `isLoading` from `auth-store`
2. While loading: shows a centered spinning loader
3. If not authenticated: redirects to `/login` via `useRouter().push()`
4. If authenticated: renders `{children}`

**Used in:** `(main)/layout.tsx` to protect all chat routes.

### `login-form.tsx`

**File:** `src/components/auth/login-form.tsx`

**State:** `email`, `password`, `showPassword`, `isLoading`

**UI Structure:**
1. Animated gradient AI logo (violet-to-cyan, 16x16 square with "AI" text)
2. "Welcome back" heading + subtitle
3. Glassmorphic card (`glass-strong`) containing:
   - Email input with `Mail` icon overlay
   - Password input with `Lock` icon overlay + show/hide toggle (`Eye`/`EyeOff`)
   - Gradient submit button with loading spinner
4. Link to signup page

**Flow:**
1. User fills in email and password
2. On submit: `POST /api/auth/login` via API client
3. On success: `setAuth(user, tokens)` → toast "Welcome back!" → navigate to `/chat`
4. On error: toast with error message

**Animations:** Framer Motion `initial={{ opacity: 0, y: 20 }}` entrance, spring scale on logo.

### `signup-form.tsx`

**File:** `src/components/auth/signup-form.tsx`

**State:** `name`, `email`, `password`, `showPassword`, `isLoading`

**Identical structure to login-form with additions:**
- Name input with `User` icon overlay (min length: 2)
- Password has `minLength={8}` validation
- Calls `POST /api/auth/signup`
- Toast: "Account created successfully!"
- Links to login page

---

## Components — Chat

### `sidebar.tsx`

**File:** `src/components/chat/sidebar.tsx`

**Dependencies:** `useChatStore`, `useUIStore`, `useConversations`, `useIsMobile`

**Features:**
- **Glassmorphic panel**: `backdrop-blur-xl bg-sidebar/60` with subtle border
- **Collapsible**: Animates between 300px (expanded) and 64px (collapsed) using Framer Motion `animate={{ width }}`
- **New Chat button**: Gradient button at the top. In collapsed mode, shows only the icon
- **Search bar**: Text input that filters conversations via the `search` query parameter
- **Conversation groups**: Conversations are grouped by date using `groupConversationsByDate()`:
  - Today
  - Yesterday
  - Previous 7 Days
  - Older
- **Pinned first**: Pinned conversations always appear at the top
- **Loading state**: Shows `Skeleton` loaders while conversations are being fetched
- **Mobile**: Hides when `isSidebarOpen` is false on mobile

**Interaction:**
- Click "+" creates a new conversation and navigates to it
- Click a conversation navigates to `/chat/{id}`
- Conversations pass `onDelete`, `onRename`, `onTogglePin` handlers to `ConversationItem`

### `conversation-item.tsx`

**File:** `src/components/chat/conversation-item.tsx`

**Props:**
```typescript
{
  conversation: Conversation;
  isActive: boolean;
  isCollapsed: boolean;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onTogglePin: (id: string) => void;
}
```

**Features:**
- **Active indicator**: Framer Motion `layoutId="active-conversation"` creates a shared animated left border that slides between items
- **Pin indicator**: Shows a pin icon for pinned conversations
- **Inline rename**: Click the rename button → input field appears → Enter to confirm, Escape to cancel
- **Hover actions**: Three icon buttons appear on hover:
  - Pin/unpin (Pin icon)
  - Rename (Pencil icon)
  - Delete (Trash icon) — opens `ConfirmDialog`
- **Timestamp**: Relative time display (e.g., "2h ago") using `formatRelativeTime()`
- **Collapsed mode**: Shows only an avatar with the first letter of the title + tooltip with full title
- **Animations**: `motion.div` with layout animations for smooth reordering

### `message-bubble.tsx`

**File:** `src/components/chat/message-bubble.tsx`

**Props:**
```typescript
{
  message: Message;
  isStreaming?: boolean;
  streamContent?: string;
  onRegenerate?: () => void;
  onEdit?: (messageId: string, content: string) => void;
  userAvatar?: string | null;
  userName?: string;
}
```

**Styling by role:**

| | User Messages | AI Messages |
|---|---|---|
| **Alignment** | Right-aligned (`justify-end`) | Left-aligned (`justify-start`) |
| **Background** | Gradient (violet → purple) | Muted with `backdrop-blur` |
| **Max width** | 80% | 80% |
| **Avatar** | User initial in gradient circle | Bot icon with gradient background + sparkle animation |
| **Text color** | White | Foreground |

**Features:**
- **Hover toolbar** (appears on mouse hover):
  - **Copy**: Copies message content to clipboard with toast
  - **Regenerate** (AI messages only): Calls `onRegenerate()`
  - **Edit** (User messages only): Calls `onEdit(messageId, content)`
- **Timestamp**: Relative time, shown below message
- **Edited indicator**: Shows "(edited)" label if `message.isEdited` is true
- **Streaming cursor**: When `isStreaming` is true, shows a blinking `|` cursor at the end
- **Markdown rendering**: AI messages are rendered through `<MarkdownRenderer />`
- **Entrance animation**: `initial={{ opacity: 0, y: 10 }}` with Framer Motion

### `message-list.tsx`

**File:** `src/components/chat/message-list.tsx`

**Props:**
```typescript
{
  messages: Message[];
  streamingMessage: StreamingMessage | null;
  isLoading: boolean;
  onRegenerate: () => void;
  onEditMessage: (messageId: string, content: string) => void;
}
```

**Features:**
- **Auto-scroll**: Scrolls to bottom when new messages arrive or during streaming
  - Uses `useRef` on a bottom sentinel element
  - Calls `scrollIntoView({ behavior: 'smooth' })` on updates
- **Scroll-to-bottom FAB**: A floating action button appears when the user scrolls up
  - Shows at bottom-right of the message container
  - Framer Motion entrance/exit animation
  - Click smoothly scrolls to the latest message
- **Skeleton loading**: 3 skeleton message placeholders while loading
- **Empty state handling**: Renders nothing if no messages (parent handles empty state)
- **Streaming message**: Renders the in-progress AI message at the bottom with `isStreaming={true}`
- **StreamingIndicator**: Shows animated typing dots while AI is generating but no chunks received yet
- **AnimatePresence**: Wraps messages for smooth enter/exit animations
- **Message rendering**: Maps through messages, passing appropriate handlers for user vs AI messages

### `message-input.tsx`

**File:** `src/components/chat/message-input.tsx`

**Props:**
```typescript
{
  conversationId: string;
  isStreaming: boolean;
  onStop: () => void;
}
```

**State:** `message` (text content)

**Features:**
- **Auto-resizing textarea**: Dynamically adjusts height based on content (max 200px)
  - Uses `useRef` + `useEffect` to measure `scrollHeight`
  - Resets height on each keystroke then sets to `scrollHeight`
- **Keyboard handling**:
  - `Enter` → sends message (if not empty and not streaming)
  - `Shift+Enter` → inserts newline
  - `Escape` → calls `onStop()` to abort generation
- **Send/Stop button**: Animated transition between states
  - Send: `ArrowUp` icon in gradient button (visible when not streaming)
  - Stop: `Square` icon in destructive button (visible when streaming)
  - Uses `AnimatePresence` for cross-fade animation
- **Character count**: Shows `{length}/10000` near the limit
  - Appears when character count exceeds 9000
  - Text turns yellow at 9000+, red at 10000 (submit disabled)
- **Gradient border on focus**: Uses `gradient-border` CSS class when textarea is focused
- **Socket emission**: Emits `SOCKET_EVENTS.SEND_MESSAGE` with `{ content, conversationId }`
- **Glassmorphic styling**: Semi-transparent background with backdrop blur

### `markdown-renderer.tsx`

**File:** `src/components/chat/markdown-renderer.tsx`

**Props:** `{ content: string }`

**Dependencies:** `react-markdown`, `remark-gfm`, `react-syntax-highlighter` (Prism, oneDark theme)

**Custom element renderers:**

| Element | Rendering |
|---------|-----------|
| **Code blocks** | `CodeBlock` component with syntax highlighting (Prism + oneDark), language label, copy button with animated checkmark |
| **Inline code** | Accent background with rounded corners and smaller font |
| **Links** | Primary color, `target="_blank"`, `rel="noopener noreferrer"`, external link icon |
| **Tables** | Full-width with border, header background, striped rows |
| **Blockquotes** | Left border (primary color) + italic text + muted background |
| **Unordered lists** | Disc markers with proper spacing |
| **Ordered lists** | Decimal markers with proper spacing |
| **Headings** (h1-h6) | Proper sizing with bottom margin |
| **Paragraphs** | Leading-relaxed with bottom margin |

**CodeBlock sub-component:**
- Shows language label (top-left of block)
- Copy button (top-right) with `Check` icon feedback
- Syntax highlighting via `SyntaxHighlighter` with `oneDark` theme
- Transparent background (uses parent's muted styling)
- Overflow-x auto for long lines

### `streaming-indicator.tsx`

**File:** `src/components/chat/streaming-indicator.tsx`

A self-contained loading indicator shown while AI is generating:

- **3 bouncing dots**: Each dot has a `pulse-dot` animation with staggered delays (0s, 0.2s, 0.4s)
- **AI avatar**: Gradient circle with bot icon + sparkle animation
- **Label**: "AI is thinking..." with pulse opacity animation
- **Layout**: Aligned left to match AI message positioning

### `empty-state.tsx`

**File:** `src/components/chat/empty-state.tsx`

**Props:** `{ conversationId: string }`

Shown when a conversation has no messages yet:

- **Animated logo**: Large gradient AI icon (48x48) with scale-up spring animation
- **Heading**: "How can I help you today?" with `gradient-text` class
- **Subtitle**: Descriptive text about AI capabilities
- **4 suggestion chips**: Clickable prompt starters
  - "Explain a concept" (Lightbulb icon, amber accent)
  - "Write some code" (Code icon, emerald accent)
  - "Help me brainstorm" (Sparkles icon, violet accent)
  - "Summarize content" (FileText icon, cyan accent)
- **Staggered animation**: Each chip enters with increasing delay
- **On click**: Emits the suggestion text as a `send-message` socket event

---

## Components — Layout

### `app-header.tsx`

**File:** `src/components/layout/app-header.tsx`

The top navigation bar of the authenticated layout:

- **Mobile menu button**: Hamburger icon that toggles sidebar (visible only on mobile via `useIsMobile()`)
- **Connection status**: `<ConnectionStatus />` showing WebSocket state
- **Theme toggle**: `<ThemeToggle />` for dark/light switching
- **User menu**: `<UserMenu />` with avatar dropdown
- **Styling**: `glass` class with bottom border, padding, and flex layout

### `user-menu.tsx`

**File:** `src/components/layout/user-menu.tsx`

**Dependencies:** `useAuthStore`, `useUIStore`, `useRouter`, `api` client, `disconnectSocket`

**UI:**
- **Trigger**: User avatar with green online status dot (ring indicator)
  - Shows user initial in gradient fallback if no avatar URL
- **Dropdown content**:
  - User name and email (header section)
  - "Settings" menu item (opens settings)
  - "Keyboard Shortcuts" menu item (opens shortcuts dialog)
  - Separator
  - "Log Out" menu item (destructive styling)

**Logout flow:**
1. Calls `POST /api/auth/logout` via API client
2. Disconnects Socket.IO
3. Clears auth store (tokens + user)
4. Navigates to `/login`
5. Toast: "Logged out"

### `theme-toggle.tsx`

**File:** `src/components/layout/theme-toggle.tsx`

- Ghost icon button toggling between dark and light themes
- **Sun icon** (light mode): visible when theme is dark
- **Moon icon** (dark mode): visible when theme is light
- **Rotation animation**: Icon rotates on theme change via `transform rotate` transition
- Uses `useTheme()` from `next-themes`

### `connection-status.tsx`

**File:** `src/components/layout/connection-status.tsx`

- **Connected**: Green dot with `shadow-emerald-500/50` glow
- **Disconnected**: Red dot with animation
- **Text label**: "Connected" / "Connecting..." (hidden on small screens)
- **Tooltip**: Shows detailed status on hover
- Uses `useSocket()` hook for `isConnected` state

### `keyboard-shortcuts.tsx`

**File:** `src/components/layout/keyboard-shortcuts.tsx`

- **Dialog** component showing all available keyboard shortcuts
- **Platform detection**: Shows `Cmd` for Mac, `Ctrl` for Windows/Linux
- **Data source**: `KEYBOARD_SHORTCUTS` constant from `lib/constants.ts`
- **Layout**: Grid of shortcut key + description pairs
- **Controlled by**: `isShortcutsOpen` in `ui-store`

### `confirm-dialog.tsx`

**File:** `src/components/layout/confirm-dialog.tsx`

**Props:**
```typescript
{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;    // Default: "Confirm"
  cancelLabel?: string;     // Default: "Cancel"
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
}
```

A reusable confirmation modal:
- Dialog with title and description
- Cancel button (outline variant)
- Confirm button (variant-aware: `default` or `destructive`)
- Calls `onConfirm()` and closes on confirmation
- Used for conversation deletion, message editing, etc.

---

## Hooks

### `use-socket.ts`

**Returns:** `{ socket: Socket | null, isConnected: boolean }`

Simple wrapper around `useContext(SocketContext)` from `socket-provider.tsx`. Throws error if used outside provider.

### `use-conversations.ts`

**Returns:**
```typescript
{
  conversations: Conversation[];
  isLoadingConversations: boolean;
  createConversation: () => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}
```

**Logic:**
- **Fetch**: `GET /api/conversations` with optional `?search=` query parameter (from `chat-store.searchQuery`)
- **Create**: `POST /api/conversations` → adds to store → navigates to new conversation
- **Delete**: `DELETE /api/conversations/:id` → removes from store → clears messages → navigates away if active
- **Rename**: `PATCH /api/conversations/:id` with `{ title }` → updates in store
- **Toggle pin**: `PATCH /api/conversations/:id` with `{ isPinned: !current }` → updates in store → refetch for reorder
- **Auto-fetch**: Triggers on mount and when `searchQuery` changes

### `use-messages.ts`

**Returns:**
```typescript
{
  messages: Message[];
  isLoading: boolean;
  refetch: () => Promise<void>;
}
```

**Logic:**
- **Fetch**: `GET /api/conversations/:id/messages` — skips if already cached in message-store
- **Socket listeners** (set up on mount):
  - `NEW_MESSAGE` → adds message to store (if for this conversation)
  - `MESSAGE_DELETED` → removes message from store
  - `MESSAGE_UPDATED` → updates message in store
- **Cleanup**: Removes socket listeners on unmount
- **Loading state**: Uses `loadingConversations` Set in message-store to prevent duplicate fetches

### `use-streaming.ts`

**Returns:**
```typescript
{
  streamingMessage: StreamingMessage | null;
  isStreaming: boolean;
  stopGeneration: () => void;
}
```

**Socket listeners:**
- `AI_STREAM_START` → creates streaming message placeholder in store (`{ id, conversationId, role: 'assistant', content: '', isStreaming: true }`)
- `AI_STREAM_CHUNK` → appends chunk text to streaming message content
- `AI_STREAM_END` → finalizes stream (clears streaming state, adds completed message to messages array with saved ID)
- `AI_STREAM_ERROR` → clears streaming state, shows error toast

**`stopGeneration()`:** Emits `STOP_GENERATION` socket event with `{ conversationId }`

### `use-keyboard-shortcuts.ts`

**Global keyboard shortcut handler** (attached to `window.addEventListener('keydown')`):

| Shortcut | Action | Condition |
|----------|--------|-----------|
| `Ctrl/Cmd + K` | Toggle search open | Always |
| `Ctrl/Cmd + Shift + S` | Toggle sidebar collapse | Always |
| `Ctrl/Cmd + Shift + D` | Toggle dark/light theme | Always |
| `?` | Toggle keyboard shortcuts dialog | Not in input/textarea |

**Features:**
- Platform-aware: Checks `metaKey` on Mac, `ctrlKey` on Windows
- Prevents default browser behavior for captured shortcuts
- Ignores shortcuts when typing in input fields (except `?` which checks `tagName`)
- Cleanup: Removes listener on unmount

### `use-clipboard.ts`

**Returns:**
```typescript
{
  copy: (text: string) => Promise<void>;
  hasCopied: boolean;
}
```

- Uses `navigator.clipboard.writeText()` API
- Shows toast notification: "Copied to clipboard"
- `hasCopied` state resets to `false` after 2000ms (configurable)
- Used by message copy buttons and code block copy buttons

### `use-media-query.ts`

**Exports:**
- `useMediaQuery(query: string): boolean` — generic media query hook
  - Creates `matchMedia` listener
  - Returns current match state
  - Cleans up listener on unmount
- `useIsMobile(): boolean` — pre-configured for `(max-width: 768px)`

---

## Stores (Zustand)

### `auth-store.ts`

**State:**
```typescript
{
  user: UserPublic | null;
  tokens: { accessToken: string; refreshToken: string } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

**Actions:**
| Action | Description |
|--------|-------------|
| `setAuth(user, tokens)` | Set both user and tokens, mark as authenticated |
| `setTokens(tokens)` | Update tokens only (used after refresh) |
| `setUser(user)` | Update user profile only |
| `logout()` | Clear all state, remove from localStorage |
| `setLoading(loading)` | Set loading state |

**Persistence:**
- Tokens stored in `localStorage` under key `ai-chat-tokens`
- User stored in `localStorage` under key `ai-chat-user`
- On store initialization: reads from localStorage to restore session
- On logout: removes both localStorage keys

### `chat-store.ts`

**State:**
```typescript
{
  conversations: Conversation[];
  activeConversationId: string | null;
  isLoadingConversations: boolean;
  searchQuery: string;
}
```

**Actions:**
| Action | Description |
|--------|-------------|
| `setConversations(convos)` | Replace entire conversations array |
| `addConversation(convo)` | Prepend a new conversation to the list |
| `removeConversation(id)` | Remove by ID. Auto-clears `activeConversationId` if it was the removed one |
| `setActiveConversation(id)` | Set the currently viewed conversation |
| `updateConversation(id, data)` | Partial update (title, isPinned, etc.) |
| `setLoadingConversations(loading)` | Set loading flag |
| `setSearchQuery(query)` | Update search filter (triggers refetch in hook) |

**No persistence** — conversations are fetched from the API on each session.

### `message-store.ts`

**State:**
```typescript
{
  messages: Record<string, Message[]>;  // Keyed by conversationId
  streamingMessage: StreamingMessage | null;
  isStreaming: boolean;
  loadingConversations: Set<string>;
}
```

**Actions:**
| Action | Description |
|--------|-------------|
| `setMessages(convId, msgs)` | Set messages for a specific conversation |
| `addMessage(convId, msg)` | Append a message to a conversation |
| `removeMessage(convId, msgId)` | Remove a specific message |
| `updateMessage(convId, msgId, data)` | Partial update a message |
| `clearMessages(convId)` | Clear all messages for a conversation |
| `setStreamingMessage(msg)` | Set the in-progress streaming message |
| `appendStreamChunk(chunk)` | Append text to streaming message content |
| `finalizeStream(savedId, content)` | Move streaming message to messages array with final content and ID |
| `setIsStreaming(streaming)` | Update streaming flag |
| `setLoadingConversation(convId, loading)` | Track which conversations are being loaded |
| `isConversationLoading(convId)` | Check if a conversation's messages are being fetched |

**Key design:** Messages are keyed by `conversationId` in a `Record<string, Message[]>`. This allows efficient per-conversation access and avoids re-fetching when switching between conversations.

### `ui-store.ts`

**State:**
```typescript
{
  isSidebarOpen: boolean;       // Mobile sidebar visibility
  isSidebarCollapsed: boolean;  // Desktop collapsed mode
  isSearchOpen: boolean;        // Search bar visibility
  isShortcutsOpen: boolean;     // Keyboard shortcuts dialog
  isSettingsOpen: boolean;      // Settings panel
}
```

**Actions:**
| Action | Description |
|--------|-------------|
| `toggleSidebar()` | Toggle mobile sidebar |
| `setSidebarOpen(open)` | Set mobile sidebar state |
| `toggleSidebarCollapsed()` | Toggle desktop collapsed mode |
| `setSearchOpen(open)` | Toggle search bar |
| `setShortcutsOpen(open)` | Toggle shortcuts dialog |
| `setSettingsOpen(open)` | Toggle settings panel |

---

## Providers

### `theme-provider.tsx`

**File:** `src/providers/theme-provider.tsx`

Simple re-export wrapper around `next-themes`'s `ThemeProvider`. Passes all props through. Used in root layout with:
- `defaultTheme="dark"`
- `attribute="class"` (toggles `.dark` class on `<html>`)
- `enableSystem` for system preference detection

### `auth-provider.tsx`

**File:** `src/providers/auth-provider.tsx`

**Lifecycle:**

1. **Configure API client** (runs once on mount):
   - `getTokens` → reads from auth store
   - `onSetTokens` → updates auth store
   - `onLogout` → calls auth store logout

2. **Validate token on mount**:
   - If no access token → set loading false, done
   - If access token exists → `GET /api/auth/me`
     - Success → update user in store
     - 401 error → try `POST /api/auth/refresh`
       - Refresh success → update tokens and user
       - Refresh failure → logout (clear everything)
   - Set loading false when done

### `socket-provider.tsx`

**File:** `src/providers/socket-provider.tsx`

**Context:** `SocketContext` providing `{ socket: Socket | null, isConnected: boolean }`

**Lifecycle:**
1. **Connect** (when access token becomes available):
   - Creates Socket.IO connection via `connectSocket(token)`
   - Sets up event listeners: `connect`, `disconnect`, `connect_error`
   - Updates `isConnected` state on connect/disconnect
2. **Disconnect** (when access token is cleared / component unmounts):
   - Calls `disconnectSocket()`
   - Resets `isConnected` to false

**Socket configuration** (from `socket-client.ts`):
- URL: `SOCKET_URL` (default: `http://localhost:4000`)
- Auth: `{ token: accessToken }` in handshake
- Transports: `['websocket', 'polling']`
- Reconnection: 5 attempts, 1000ms initial delay, 5000ms max delay

---

## Lib Utilities

### `utils.ts`

**File:** `src/lib/utils.ts`

**Exports:**

| Function | Signature | Description |
|----------|-----------|-------------|
| `cn(...inputs)` | `(...inputs: ClassValue[]) => string` | Combines `clsx` (conditional classes) and `twMerge` (deduplicates Tailwind classes). Used throughout all components |
| `formatRelativeTime(dateString)` | `(dateString: string) => string` | Converts ISO date string to human-readable relative time. Returns: "just now" (< 1min), "Xm ago" (< 1hr), "Xh ago" (< 24hr), "Xd ago" (< 7d), formatted date (older) |
| `groupConversationsByDate(conversations)` | `(convos: Conversation[]) => GroupedConversations` | Groups conversations into `{ today, yesterday, previous7Days, older }` arrays based on `updatedAt` timestamp |
| `truncate(str, length)` | `(str: string, length: number) => string` | Truncates string with "..." suffix if longer than `length` |

### `constants.ts`

**File:** `src/lib/constants.ts`

**Exports:**

| Constant | Value | Description |
|----------|-------|-------------|
| `API_URL` | `process.env.NEXT_PUBLIC_API_URL \|\| 'http://localhost:4000'` | Backend REST API base URL |
| `SOCKET_URL` | `process.env.NEXT_PUBLIC_SOCKET_URL \|\| 'http://localhost:4000'` | Socket.IO server URL |
| `PROMPT_SUGGESTIONS` | Array of 4 objects | Each has `title`, `description`, `icon`, `color`, and `prompt` text |
| `KEYBOARD_SHORTCUTS` | Array of shortcut objects | Each has `key`, `description`, `windows`, `mac` key labels |

**Prompt Suggestions:**
1. "Explain a concept" → "Explain quantum computing in simple terms..."
2. "Write some code" → "Write a Python function that..."
3. "Help me brainstorm" → "Help me brainstorm ideas for..."
4. "Summarize content" → "Summarize the key points of..."

### `api-client.ts`

**File:** `src/lib/api-client.ts`

**Exports:**

| Export | Description |
|--------|-------------|
| `configureApiClient(config)` | Sets up token management callbacks (called once by AuthProvider) |
| `api.get<T>(path)` | GET request with auth |
| `api.post<T>(path, body)` | POST request with auth |
| `api.patch<T>(path, body)` | PATCH request with auth |
| `api.delete(path)` | DELETE request with auth |

**Internal functions:**
- `fetchWithAuth(path, options)` — Core fetch wrapper that:
  1. Attaches `Authorization: Bearer <token>` header
  2. On 401: attempts token refresh via `POST /api/auth/refresh`
  3. On successful refresh: retries original request with new token
  4. On refresh failure: calls logout callback
  5. Parses JSON response and returns typed data
  6. Throws error with message from response on non-OK status

### `socket-client.ts`

**File:** `src/lib/socket-client.ts`

**Exports:**

| Function | Description |
|----------|-------------|
| `connectSocket(token)` | Creates Socket.IO connection with JWT auth. Returns socket instance. Singleton pattern — returns existing socket if already connected |
| `getSocket()` | Returns current socket instance (or `null`) |
| `disconnectSocket()` | Disconnects and clears the singleton reference |

**Configuration:**
- Auto-connect: `true`
- Reconnection: `true`
- Max reconnection attempts: `5`
- Reconnection delay: `1000ms` (initial)
- Max reconnection delay: `5000ms`
- Transports: `['websocket', 'polling']`
