# Spotify Clone Backend

Express + Mongoose backend for auth and songs APIs.

## Setup

1. Copy env file:
   - `cp .env.example .env`
   - On Windows PowerShell: `Copy-Item .env.example .env`
2. Set these values in `.env`:
   - `JWT_SECRET`
   - `MONGODB_URI` (local or Atlas connection string)
   - Optional: `AUDIUS_API_KEY` or `AUDIUS_BEARER_TOKEN` for higher Audius API limits
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `SMTP_FROM`
   - Or use Gmail app password with `GMAIL_USER` and `GMAIL_PASSWORD`
   - `APP_URL` (for example `http://localhost:5173`)
3. Install dependencies:
   - `npm install`

## Run

- Dev mode: `npm run dev`
- Production mode: `npm start`

Server runs on `http://localhost:5000` by default.

## API Endpoints

- `GET /api/health`
- `POST /api/auth/register` `{ name, email, password }`
- `POST /api/auth/login` `{ email, password }`
- `GET /api/auth/me` (Bearer token)
- `GET /api/songs`
- `GET /api/songs/search?q=term`
- `GET /api/songs/search?q=term&language=English&sort=likes`
- `GET /api/songs/library` (Bearer token)
- `POST /api/songs/library/:songId` (Bearer token)
- `DELETE /api/songs/library/:songId` (Bearer token)
- `GET /api/songs/artist/my` (Bearer token, artist only)
- `GET /api/songs/recent` (Bearer token)
- `GET /api/songs/continue` (Bearer token)
- `POST /api/songs/:songId/progress` (Bearer token)
- `GET /api/songs/liked/songs` (Bearer token)
- `POST /api/songs` (Bearer token, artist only)
- `GET /api/playlists` (Bearer token)
- `POST /api/playlists` (Bearer token)
- `PUT /api/playlists/:playlistId` (Bearer token)
- `DELETE /api/playlists/:playlistId` (Bearer token)
- `GET /api/playlists/:playlistId` (Bearer token)
- `POST /api/playlists/:playlistId/songs/:songId` (Bearer token)
- `DELETE /api/playlists/:playlistId/songs/:songId` (Bearer token)

## Data Storage

- MongoDB via Mongoose (`users`, `songs` collections)
- App removes old demo songs and syncs online Audius tracks for streaming
- `users` have role: `user` or `artist`
- Basic in-memory rate limiting on auth/forgot-password routes
- Forgot-password now sends a 6-digit OTP to the user's email and OTP expires in 10 minutes
