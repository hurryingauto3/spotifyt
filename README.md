# SpotifyT - AI-Powered Music Sync

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![AI Powered](https://img.shields.io/badge/AI-Gemini%202.0-purple)

Sync your music playlists between Spotify and YouTube Music with AI-powered track matching using Google Gemini.

## ✨ Features

- 🔄 **Bidirectional Sync**: Transfer music from Spotify ↔ YouTube Music
- 🤖 **AI Matching**: Google Gemini 2.0 Flash for intelligent semantic track recognition
- ⚡ **Parallel Processing**: 5 concurrent workers for fast matching
- 🎨 **Beautiful UI**: Dark glassmorphism design with gradient effects
- 📊 **Real-time Progress**: Live matching progress with cancel option
- ✏️ **Custom Playlist Names**: Name your synced playlists
- 🎯 **Smart Filtering**: Review matched, low confidence, and not found tracks
- 🚫 **No Duplicates**: Automatic duplicate detection
- 💾 **Match Caching**: Cached matches for faster repeat syncs (optional)

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack) + TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: iron-session + OAuth2
- **Spotify API**: @spotify/web-api-ts-sdk
- **YouTube**: googleapis (writes) + ytmusic-api (reads/search)
- **AI Matching**: Google Gemini 2.0 Flash
- **Database**: Prisma + SQLite (PostgreSQL for production)
- **Deployment**: Vercel / Docker

## Prerequisites

1. **Spotify Developer Account**
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create a new app
   - Note your Client ID and Client Secret
   - Add redirect URI: `http://localhost:3000/auth/spotify/callback`

2. **Google Cloud Project** (for YouTube)
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable YouTube Data API v3
   - Create OAuth 2.0 credentials (Web application)
   - Add redirect URI: `http://localhost:3000/auth/youtube/callback`
   - Note your Client ID and Client Secret

3. **Google Gemini API** (for AI matching)
   - Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create an API key
   - Note your API key

## Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Edit `.env.local` and fill in your credentials:

   ```env
   # Spotify OAuth
   SPOTIFY_CLIENT_ID=your_spotify_client_id_here
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
   SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/spotify/callback

   # YouTube / Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/youtube/callback

   # Session encryption (generate with: openssl rand -base64 32)
   SESSION_SECRET=your_32_character_or_longer_secret_here

   # App URL
   NEXT_PUBLIC_APP_URL=http://localhost:3000

   # Google Gemini API (for AI matching)
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

   **Generate a secure session secret**:
   ```bash
   openssl rand -base64 32
   ```

3. **Initialize the database**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open the app**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### 1. Connect Your Accounts
- Click "Get Started" on the landing page
- Connect both Spotify and YouTube Music accounts via OAuth
- You must connect both accounts to start syncing

### 2. Start a Sync
- Click "Start Sync" once both accounts are connected
- Choose direction: YouTube → Spotify or Spotify → YouTube

### 3. Select Playlists
- Check the playlists you want to sync
- View total track count

### 4. Preview Matches
- Wait for the matching engine to process all tracks
- Review matched tracks with confidence scores
- Filter by: Matched, Low Confidence, Not Found, Already Exists

### 5. Execute Sync
- Confirm and sync your tracks
- A new playlist is created on the target platform
- View results summary with added/failed counts

## 🎯 How AI Matching Works

The matching engine uses Google Gemini 2.0 Flash AI for intelligent track matching:

1. **Search**: Searches target platform (Spotify/YouTube) for candidate tracks
2. **AI Analysis**: Gemini AI semantically analyzes:
   - Title variations ("Official Video", "Remaster", "Live", etc.)
   - Artist name differences (VEVO suffix, featuring artists, name order)
   - Duration similarity (±10 seconds acceptable)
3. **Parallel Processing**: Processes 5 tracks simultaneously for speed
4. **Confidence Scoring**:
   - ≥70% = Matched (green) - High confidence match
   - <70% = Low Confidence (yellow) - Possible match, review recommended
   - No match = Not Found (red) - Track not available

### Why Gemini AI?
- **Semantic Understanding**: Understands context, not just string similarity
- **Handles Variations**: "Billie Eilish - lovely (with Khalid)" = "lovely - Billie Eilish ft. Khalid"
- **Smart**: Recognizes remasters, live versions, and different editions
- **Fast**: Parallel processing with 5 concurrent workers
- **Cheap**: ~$0.006 per 100 songs (free experimental version currently)

## Database Schema

- **SyncHistory**: Records of all sync operations
- **MatchRecord**: Individual track match details
- **MatchCache**: Cached matches (30-day TTL) for faster repeat syncs

## API Rate Limits

- **Spotify**: 30-second rolling window (handled automatically with retries)
- **YouTube Data API**: 10,000 quota units/day
  - Playlist insert = 50 units (max ~200 adds/day)
  - Search = 100 units (we use ytmusic-api to avoid this)
- **ytmusic-api**: No official limits (unofficial scraper)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # OAuth callbacks
│   ├── dashboard/         # Main dashboard
│   └── sync/              # 4-step sync wizard
├── lib/                   # Core logic
│   ├── spotify/          # Spotify API client
│   ├── youtube/          # YouTube API clients
│   ├── matching/         # Fuzzy matching engine
│   ├── sync/             # Sync utilities
│   ├── session.ts        # iron-session config
│   └── db.ts             # Prisma client
prisma/
└── schema.prisma         # Database schema
```

## Troubleshooting

### "Spotify not connected" error
- Make sure you've filled in `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` in `.env.local`
- Check that the redirect URI in your Spotify app matches exactly

### "YouTube not connected" error
- Verify `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` in `.env.local`
- Ensure YouTube Data API v3 is enabled in Google Cloud Console
- Check redirect URI matches exactly

### Matching finds no results
- The track might not exist on the target platform
- Try with well-known popular tracks first to test
- Check the console for API errors

### YouTube quota exceeded
- YouTube Data API has a 10,000 units/day limit
- Each playlist insert costs 50 units (max ~200 songs/day)
- Wait until the next day or request a quota increase from Google

## Development

Run in development mode:
```bash
npm run dev
```

Build for production:
```bash
npm run build
npm start
```

View database:
```bash
npx prisma studio
```

## 📦 Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment guide.

### Quick Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Important**: Set all environment variables in Vercel Dashboard and update OAuth redirect URIs to your production domain.

### Docker Deployment

```bash
# Build image
docker build -t spotifyt .

# Run container
docker run -p 3000:3000 --env-file .env.production spotifyt
```

### Environment Variables for Production

1. Update all redirect URIs to production domain
2. Generate new SESSION_SECRET for production
3. Add environment variables in your hosting platform
4. Update OAuth apps in Spotify and Google Cloud Console

## 📊 API Costs

### Free Tier (Current)
- **Spotify API**: Free
- **YouTube API**: Free (using ytmusic-api scraper)
- **Gemini AI**: Free experimental version

### Paid Usage (If Scaled)
- **Gemini 2.0 Flash**: ~$0.006 per 100 songs (~$0.06 per 1,000 songs)

## License

MIT

## Credits

Built with:
- [Next.js](https://nextjs.org/)
- [Spotify Web API SDK](https://github.com/spotify/spotify-web-api-ts-sdk)
- [googleapis](https://github.com/googleapis/google-api-nodejs-client)
- [ytmusic-api](https://github.com/sigma67/ytmusicapi)
- [fast-fuzzy](https://github.com/EthanRutherford/fast-fuzzy)
- [Prisma](https://www.prisma.io/)
