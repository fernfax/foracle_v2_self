# Foracle Mobile — development

Expo SDK 54 + React Native 0.81 + TypeScript. File-based routing via Expo Router.

## One-time setup

1. **Install dependencies** (uses `--legacy-peer-deps` per project memory):
   ```
   cd mobile
   npm install --legacy-peer-deps
   ```
2. **Copy env file**:
   ```
   cp .env.example .env.local
   ```
   Then fill in `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` from the Clerk dashboard.
3. **Start the web API** in another terminal (mobile hits it):
   ```
   cd ..   # back to repo root
   npm run dev
   ```

## Running the app

### iOS Simulator (Xcode required)
Install Xcode from the Mac App Store (~10 GB) if you haven't yet. Then:
```
npm run ios
```

### Expo Go on a physical iPhone (no Xcode needed)
1. Install **Expo Go** from the iOS App Store.
2. `npm run start` in `mobile/`.
3. Scan the QR code with your iPhone camera.
4. If the API call from the device fails, update `EXPO_PUBLIC_API_URL` in `.env.local` to your dev machine's LAN IP (run `ipconfig getifaddr en0` on macOS).

## Project structure

```
mobile/
  app/                  Expo Router file-based routes
    _layout.tsx         Root: ClerkProvider + QueryClientProvider + theme
    (tabs)/             Tab navigator
      index.tsx         Smoke screen — pings /api/v1/health
      explore.tsx       Default Expo template screen (will be replaced)
  src/
    api/                Typed v1 API endpoint functions
      health.ts
    lib/
      api-client.ts     Fetch wrapper with Bearer-token interceptor
      token-cache.ts    Clerk token cache backed by expo-secure-store
  global.css            Tailwind base — imported in app/_layout.tsx
  tailwind.config.js    Brand tokens transcribed from web's globals.css
  metro.config.js       NativeWind metro adapter
  babel.config.js       NativeWind babel preset
```

## Conventions

- **Auth**: every API call goes through `createApiClient({ getToken })`. The
  token from `useAuth()` is attached as `Authorization: Bearer <jwt>`.
- **Styling**: NativeWind v4 — use `className="..."` on RN primitives. Brand
  tokens live in `tailwind.config.js`; keep them in sync with the web's
  `app/globals.css` when the design tokens change.
- **Data fetching**: TanStack Query. Query keys are `[resource, ...filters]`.
- **No real-DB logic in the mobile bundle**. The mobile app is an API client
  only — all business logic stays in `lib/services/*` on the Next.js server.

## Verifying the bootstrap

After `npm install`:
```
npx tsc --noEmit       # type check
npx expo-doctor        # SDK + dep version sanity
npm run start          # boots Metro
```
Then on the home screen, tap "Ping /api/v1/health" — you should see version
+ commit fields render in a green card.

## Phase A note

When the monorepo migration lands, this directory moves to `apps/mobile/` and
the brand tokens / Zod schemas move to `packages/shared`. The `tailwind.config.js`
will then import its color map from `packages/shared`.
