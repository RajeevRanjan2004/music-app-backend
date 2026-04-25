<<<<<<< HEAD
# Musicfy Frontend

This frontend uses React + Vite for the web app and Capacitor for the Android wrapper.

## Web Development

```bash
npm install
npm run dev
```

## Android Setup

```bash
npm install
npm run build
npm run cap:sync
npm run android:open
```

Run `npm run build` first, then `npm run cap:sync` to copy the latest `dist` output into the Android project.

This Capacitor/Android setup builds with Java 21. If your terminal or Android Studio still shows an older Java version after setup, restart it once so the updated `JAVA_HOME` is picked up.

## Backend URL for Android

The browser build uses `VITE_API_BASE_URL`.

The Android build prefers `VITE_ANDROID_API_BASE_URL`:

- Android emulator: `http://10.0.2.2:5000/api`
- Real device: use your computer's LAN IP, for example `http://192.168.1.20:5000/api`

If you change either env value, run `npm run build` and `npm run cap:sync` again so the native project gets the updated build.

## Netlify Deploy

The repository root includes a `netlify.toml` configured for this monorepo:

- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `dist`
- SPA redirect: `/* -> /index.html`

Set this environment variable in Netlify before deploying:

```bash
VITE_API_BASE_URL=https://your-render-backend.onrender.com/api
```

You can use `frontend/.env.production.example` as the reference for production values.

## Render Deploy

The repository root includes a `render.yaml` blueprint for the backend web service.

Important deployment notes:

- Set `CLIENT_ORIGIN` to your Netlify site URL
- Set `APP_URL` to your Netlify site URL
- Keep MongoDB on Atlas using `MONGODB_URI`
- The backend writes uploads to `UPLOADS_DIR`
- Render Free works for auth/API, but uploaded files are ephemeral on restarts/redeploys
- If you want persistent uploads on Render, move the backend to a paid plan and attach a disk mounted at `/opt/render/project/src/backend/uploads`

## Build Debug APK

After opening the Android project in Android Studio:

1. Let Gradle finish syncing.
2. Go to `Build > Build Bundle(s) / APK(s) > Build APK(s)`.
3. The debug APK is usually generated in `android/app/build/outputs/apk/debug/`.

You can also build from the terminal inside `frontend/android` with:

```bash
.\gradlew.bat assembleDebug
```

## Install Debug APK

If a device or emulator is connected and USB debugging is enabled:

```bash
C:\Users\PC\AppData\Local\Android\Sdk\platform-tools\adb.exe install -r app\build\outputs\apk\debug\app-debug.apk
```

Run the command from `frontend/android`.

## Signed Release Setup

Add a file named `keystore.properties` inside `frontend/android` based on `keystore.properties.example`.

Then place your `.jks` keystore in `frontend/android` and update the values:

```properties
storeFile=release-keystore.jks
storePassword=your-store-password
keyAlias=your-key-alias
keyPassword=your-key-password
```

After that you can build:

```bash
.\gradlew.bat assembleRelease
.\gradlew.bat bundleRelease
```

Without `keystore.properties`, the project can still build an unsigned release artifact for testing.
=======
# Spotify Clone Backend

Express + Mongoose backend for auth and songs APIs.

## Setup

1. Copy env file:
   - `cp .env.example .env`
   - On Windows PowerShell: `Copy-Item .env.example .env`
2. Set these values in `.env`:
   - `JWT_SECRET`
   - `MONGODB_URI` (local or Atlas connection string)
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
- Songs auto-seed on first server start if songs collection is empty
- `users` have role: `user` or `artist`
- Basic in-memory rate limiting on auth/forgot-password routes
- Forgot-password now sends a 6-digit OTP to the user's email and OTP expires in 10 minutes
>>>>>>> 8f9562d3ef26070d332ca1da36fe1b57f9bb2ee0
