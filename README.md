## Visual Chat Media

Visual Chat Media uses **Firebase Authentication** for Google sign-in plus an **Express + Prisma + PostgreSQL** backend that powers conversations and messages. The Next.js UI calls the local API, so make sure the backend is running when you work on the app.

---

## Prerequisites

- Node.js 18+
- PostgreSQL (local or remote)
- A Firebase project with Authentication enabled (Google provider)
- A Firebase service-account JSON (used by the Express server to verify ID tokens)

---

## Environment Variables

Both the Next.js app and the Express server read from `.env.local` at the project root. Create the file and add:

```bash
# Frontend (Next.js)
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_FIREBASE_API_KEY=<firebase web api key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<firebase auth domain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<firebase project id>
NEXT_PUBLIC_FIREBASE_APP_ID=<firebase app id>

# Backend (Express + Prisma)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/visual_chat_media
API_PORT=4000
FRONTEND_ORIGINS=http://localhost:3000

# Service account (base64 encode your JSON: cat sa.json | base64 -w0)
FIREBASE_SERVICE_ACCOUNT_KEY=<base64 encoded service-account json>
```

### Firebase setup checklist

1. Enable **Google** provider in Firebase Authentication.
2. Create a Web app to get the API key/auth domain/project ID/app ID.
3. Download a service-account JSON (Project Settings → Service accounts) and base64 encode it for `FIREBASE_SERVICE_ACCOUNT_KEY`.

### Database setup

1. Start PostgreSQL and update `DATABASE_URL` if needed.
2. Generate the Prisma client and run migrations:

```bash
npx prisma migrate dev --name init
```

---

## Running the app

In one terminal start the API server:

```bash
npm run server
```

In another terminal start the Next.js dev server:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to sign in with Google. The login screen triggers Firebase Authentication, then the Express API syncs the profile into Postgres and marks users online so chats can begin immediately.

---

## Call Features

The app supports both **video** and **audio-only** calls:

- **Video Calls**: Full video and audio communication with screen sharing support
- **Audio Calls**: Voice-only calls for lower bandwidth usage
- **Screen Sharing**: Share your screen during video calls (video calls only)
- **Call Controls**: Mute/unmute audio, enable/disable video, and end calls
- **Call Notifications**: Receive incoming call notifications with caller information

### How to Use Calls

1. **Start a Call**: Click the video icon in the conversation header to see options:
   - Select "Video Call" for video communication
   - Select "Audio Call" for voice-only communication

2. **During a Call**:
   - **Mute/Unmute**: Toggle your microphone
   - **Video On/Off**: Toggle your camera (video calls only)
   - **Screen Share**: Share your screen (video calls only)
   - **End Call**: Hang up and close the call window

3. **Receiving Calls**: When someone calls you, a notification appears with:
   - Caller's name and avatar
   - Call type (video or audio)
   - Accept or Decline options

## Documentation

For comprehensive documentation covering architecture, features, deployment, and best practices, see **[DOCUMENTATION.md](./DOCUMENTATION.md)**.

## Notes for Contributors

- `server/src` contains the Express API plus Prisma database layer.
- `prisma/schema.prisma` defines the `User`, `Conversation`, and `Message` models.
- `src/lib/firebase.ts` and `src/providers/firebase-auth-provider.tsx` expose the Firebase client setup used across the app.
- `src/lib/chat-mappers.ts` converts backend responses into the shape expected by the existing UI (no Convex code remains).
- `src/components/video-call/` contains the video call room and notification components.
- `server/src/socket/socket-handler.ts` handles WebRTC signaling for calls.
- Image/video messages are stored as base64 strings for now; swap in a real file store if you need to handle large assets.
