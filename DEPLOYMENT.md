# Free Deployment Guide for Visual Chat Media

This project requires deploying three components:
1. **Next.js Frontend** (port 3000)
2. **Express Backend** (port 4000) with Socket.io
3. **PostgreSQL Database**

## Recommended Free Deployment Stack

### Option 1: Vercel + Railway (Recommended)
- **Frontend**: Vercel (excellent Next.js support, free tier)
- **Backend + Database**: Railway (free tier: $5 credit/month)

### Option 2: Vercel + Render
- **Frontend**: Vercel
- **Backend**: Render (free tier with limitations)
- **Database**: Render PostgreSQL (free tier)

### Option 3: Vercel + Supabase + Railway
- **Frontend**: Vercel
- **Database**: Supabase (free PostgreSQL)
- **Backend**: Railway

---

## Deployment Steps

### Step 1: Deploy PostgreSQL Database

#### Using Railway (Recommended)
1. Go to [railway.app](https://railway.app) and sign up
2. Click "New Project" → "Provision PostgreSQL"
3. Copy the `DATABASE_URL` from the PostgreSQL service
4. Note: Railway gives $5 free credit/month (usually enough for small projects)

#### Using Supabase (Alternative)
1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project
3. Go to Settings → Database → Connection string
4. Copy the connection string (use "URI" format)

#### Using Render (Alternative)
1. Go to [render.com](https://render.com) and sign up
2. Click "New +" → "PostgreSQL"
3. Create a free PostgreSQL instance
4. Copy the Internal Database URL

### Step 2: Run Database Migrations

After setting up the database, run migrations locally or on the deployment platform:

```bash
# Set your DATABASE_URL
export DATABASE_URL="your-postgres-connection-string"

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### Step 3: Deploy Express Backend

#### Using Railway (Recommended)
1. Push your code to GitHub
2. In Railway, click "New" → "GitHub Repo" → select your repo
3. Railway will auto-detect it's a Node.js project
4. Configure the service:
   - **Root Directory**: Leave empty (or set to `server/` if you want to deploy only server)
   - **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy`
   - **Start Command**: `npm run server`
   - **Port**: Railway auto-assigns, but your code uses `API_PORT` env var

5. Add Environment Variables:
   ```
   DATABASE_URL=your-postgres-connection-string
   PORT=4000
   # Note: The server supports both PORT (standard) and API_PORT (legacy)
   FRONTEND_ORIGINS=https://your-vercel-app.vercel.app,https://your-custom-domain.com
   FIREBASE_SERVICE_ACCOUNT_KEY=your-base64-encoded-service-account
   NODE_ENV=production
   ```
   
   **Note**: Railway auto-assigns a `PORT` variable. You can either:
   - Use Railway's auto-assigned `PORT` (recommended - no need to set it)
   - Or set `PORT=4000` explicitly if you prefer

6. Railway will give you a URL like: `https://your-app.up.railway.app`
   - Update `FRONTEND_ORIGINS` to include your Vercel URL

#### Using Render (Alternative)
1. Push code to GitHub
2. In Render, click "New +" → "Web Service"
3. Connect your GitHub repo
4. Configure:
   - **Name**: visual-chat-media-api
   - **Environment**: Node
   - **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy`
   - **Start Command**: `npm run server`
   - **Plan**: Free

5. Add Environment Variables (same as Railway above)
6. Render will give you a URL like: `https://your-app.onrender.com`

**Note**: Render free tier spins down after 15 minutes of inactivity (takes ~30s to wake up)

### Step 4: Deploy Next.js Frontend on Vercel

1. Push your code to GitHub (if not already)
2. Go to [vercel.com](https://vercel.com) and sign up
3. Click "Add New" → "Project"
4. Import your GitHub repository
5. Configure:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (root of repo)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

6. Add Environment Variables:
   ```
   NEXT_PUBLIC_API_BASE_URL=https://your-railway-app.up.railway.app
   NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-firebase-app-id
   ```

7. Click "Deploy"
8. Vercel will give you a URL like: `https://your-app.vercel.app`

### Step 5: Update Firebase Configuration

1. Go to Firebase Console → Authentication → Settings
2. Add your Vercel domain to **Authorized domains**:
   - `your-app.vercel.app`
   - `your-custom-domain.com` (if you add one)

### Step 6: Update Backend CORS

Update the backend's `FRONTEND_ORIGINS` environment variable to include your Vercel URL:
```
FRONTEND_ORIGINS=https://your-app.vercel.app,https://your-custom-domain.com
```

---

## Important Notes

### Socket.io Considerations
- **Railway**: Works well with Socket.io, no special config needed
- **Render**: Works but free tier has cold starts
- **Vercel**: Doesn't support long-lived WebSocket connections for serverless functions
  - Your Socket.io server runs on the Express backend (Railway/Render), so this is fine

### Database Migrations
Run migrations before starting the backend:
```bash
npx prisma migrate deploy
```

### Environment Variables Checklist

**Backend (Railway/Render):**
- ✅ `DATABASE_URL`
- ✅ `PORT` (Railway auto-assigns this, no need to set manually)
- ✅ `FRONTEND_ORIGINS` (comma-separated Vercel URLs)
- ✅ `FIREBASE_SERVICE_ACCOUNT_KEY` (base64 encoded)
- ✅ `NODE_ENV=production`

**Frontend (Vercel):**
- ✅ `NEXT_PUBLIC_API_BASE_URL` (your backend URL)
- ✅ `NEXT_PUBLIC_FIREBASE_API_KEY`
- ✅ `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- ✅ `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- ✅ `NEXT_PUBLIC_FIREBASE_APP_ID`

### Firebase Service Account Key
To base64 encode your service account JSON:
```bash
# On Linux/Mac
cat path/to/service-account.json | base64 -w0

# On Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("path/to/service-account.json"))
```

---

## Cost Breakdown (Free Tier)

| Service | Free Tier Limits |
|---------|-----------------|
| **Vercel** | Unlimited deployments, 100GB bandwidth/month |
| **Railway** | $5 credit/month (usually enough for small projects) |
| **Render** | Free tier with 15min spin-down, 750 hours/month |
| **Supabase** | 500MB database, 2GB bandwidth/month |

---

## Troubleshooting

### Backend can't connect to database
- Check `DATABASE_URL` is correct
- Ensure database is accessible (not blocked by firewall)
- For Railway: Use the connection string from the PostgreSQL service

### CORS errors
- Verify `FRONTEND_ORIGINS` includes your exact Vercel URL (with https://)
- Check browser console for exact error

### Socket.io not working
- Ensure backend URL is accessible
- Check that Socket.io client connects to backend URL, not frontend
- Verify CORS settings allow WebSocket connections

### Firebase authentication fails
- Add Vercel domain to Firebase Authorized domains
- Check Firebase environment variables are correct
- Verify service account key is base64 encoded correctly

---

## Quick Start Commands

After deployment, test locally with production URLs:

```bash
# Update .env.local with production URLs
NEXT_PUBLIC_API_BASE_URL=https://your-backend.railway.app
# ... other vars
```

Then run:
```bash
npm run dev
```

---

## Next Steps

1. Set up custom domain (optional, free on Vercel)
2. Enable Vercel Analytics (optional)
3. Set up monitoring (Railway has built-in metrics)
4. Configure backups for database (Railway has automatic backups on paid plans)

