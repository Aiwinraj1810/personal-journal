# personal-journal

A private, single-user diary app: calendar-based browsing, a rich text editor for entries, mood tagging, inline photos (via Cloudinary), and birthdays/events/reminders with local notifications. Everything you write is stored on-device (SQLite via Drizzle); backups export to a JSON file you control.

Built on Expo SDK 57 / React Native (New Architecture), Expo Router, NativeWind, and TenTap (a Tiptap-based rich text editor).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Add your Cloudinary credentials to a `.env` file (see `.env.example`):

   ```
   EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=
   EXPO_PUBLIC_CLOUDINARY_API_KEY=
   EXPO_PUBLIC_CLOUDINARY_API_SECRET=
   ```

3. This app uses native modules (SQLite, notifications, image picker, the rich
   text editor's WebView, etc.), so it can't run in plain Expo Go — build a
   dev client first:

   ```bash
   npx expo run:android
   # or
   npx expo run:ios
   ```

   After the first native build, `npx expo start` reconnects to that dev
   client for fast-refresh JS development. Any time a new native module is
   added, repeat the `run:android`/`run:ios` step.

## Project structure

- `src/app/` — Expo Router routes (file-based). `(tabs)/` holds the three
  main tabs (Home, Calendar, Settings); `entry/`, `event/`, `day/`,
  `settings/` are stack/modal screens.
- `src/components/` — reusable UI primitives (`ui/`) and feature components
  grouped by area (`home/`, `entry/`, `calendar/`, `event/`, `settings/`).
- `src/db/` — Drizzle schema, SQLite client, and generated migrations.
- `src/lib/` — framework-agnostic logic: Cloudinary upload/destroy,
  notification scheduling, backup export/import, date helpers.
- `src/hooks/` — React hooks wrapping the above for use in components.
- `src/constants/theme.ts` (+ `theme-tokens.js`) — the single source of
  design tokens (colors, spacing, radii), shared between the app and
  `tailwind.config.js`.

## Notes on the current build

- The Cloudinary API key **and secret** are embedded client-side (signed
  uploads/deletes are computed on-device) — a deliberate trade-off since this
  app is private and never distributed. See `src/lib/cloudinary.ts`.
- Backups (`Settings → Backup & restore`) export entries/events/settings as
  JSON; photos stay hosted on Cloudinary and are referenced by URL rather
  than bundled into the export file.
- `AGENTS.md` has Expo-specific guidance for anyone (human or AI) continuing
  work on this project — Expo's APIs change frequently between SDK versions.

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Drizzle + Expo SQLite](https://orm.drizzle.team/docs/sqlite/connect-expo-sqlite)
- [TenTap editor](https://10play.github.io/10tap-editor/docs/intro)
