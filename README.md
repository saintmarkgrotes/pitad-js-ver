# pitad

A running app for iOS and Android, built incrementally with Expo SDK 58 and JavaScript. This repository implements **Phase 1: project foundation**. GPS recording is not implemented or enabled.

## Start here

Prerequisites: Node.js 24 LTS, npm, a Supabase project, and an Expo account for development builds. This project uses `package-lock.json`; use npm and `npx`, not Bun. Run commands from the repository root.

```powershell
npm ci
Copy-Item .env.example .env
```

Edit `.env` with your project's **URL** and **publishable key** from Supabase's Connect dialog / Project Settings → API Keys:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_actual_key
```

The client intentionally accepts HTTPS URLs and the current `sb_publishable_` key format. Never put a service-role key, secret key, database password, or signing secret in `EXPO_PUBLIC_*`: these values are included in the app bundle. `.env` is ignored by Git. Restart Expo after editing it. Missing configuration produces a setup notice and disables authentication; it does not create a fake session.

### Configure Supabase

1. Create a project at [Supabase](https://supabase.com/dashboard). Enable the Email provider and email confirmation under Authentication.
2. Set the minimum password length to 12 to match the app. Configure a production SMTP provider before testing with external users; the default email service has delivery restrictions and rate limits.
3. Under Authentication → Email Templates, replace the **Confirm signup** body with the content of `supabase/templates/confirmation.html`, and **Reset password** with `supabase/templates/recovery.html`. These show `{{ .Token }}` as a code to enter in the app. The code flow intentionally does not require email deep-link callbacks. The default link-only templates will not provide the code expected by these screens. [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates).
4. Apply the versioned migration through the Supabase CLI. Use a development project first:

```sh
npx supabase login
npx supabase init
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

`supabase init` is a one-time command to create local CLI configuration. The migration is `supabase/migrations/202611160001_foundation.sql`. Never use an app publishable key as a CLI access token. No database changes have been applied to a hosted project by this implementation.

The migration creates profiles for existing and new auth users, so apply it before testing profile edits. Registration requests a display name; username selection is done in Profile after confirmation. Profile read failures show a retry action instead of inventing data.

### Run

```sh
npx expo start --dev-client
```

For a browser preview:

```sh
npm run web
```

For native verification, create and install a development build. Set unique `ios.bundleIdentifier` and `android.package` values in `app.json` before registering your own app; the current `com.pitad.running` identifiers are working defaults. Existing repository slug `pitad` is preserved; the app display name is pitad.

```sh
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile development
npx eas-cli@latest build --platform ios --profile development
npx expo start --dev-client
```

Link the EAS project when prompted and set the two public Supabase variables in the matching EAS environment. Physical iOS builds require Apple signing and device provisioning. No cloud build has been submitted. Native folders remain generated through Expo configuration. [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction.md).

## Implemented

- Expo Router entry and JavaScript routes under `src/app/`.
- Five tabs: Home, Explore, Record, Progress, Profile; prominent Record icon.
- Reusable typography, spacing, colors, form fields, notices, buttons, and cards. System sans-serif fonts, safe-area layouts, keyboard avoidance, accessible labels, password visibility toggles, and automatic light/dark themes.
- Welcome, login, registration, email verification/resend, and password recovery/update screens with Supabase calls, validation, pending states, and error handling.
- Zustand auth state; session restoration before route selection; protected tabs and signed-out auth routes. Client guards are navigation controls; PostgreSQL RLS is the authorization boundary.
- Native session persistence through Expo SecureStore. Unicode-safe chunking avoids historical small Keychain value limits; serialized writes publish the manifest last, preserve the previous session on write failure, and clean up replaced chunks. Browser preview uses sessionStorage, ending the session when the tab closes.
- Auth event subscription cleanup and native foreground token refresh. Auth state changes clear account-specific TanStack Query data.
- Profile reads/edits: name, unique username, kilometers/miles, and private-profile preference. Local form drafts are not overwritten by a background refetch. Sign-out is scoped to this device.
- PostgreSQL profiles, user_goals, and user_devices with UUIDs, constraints, timestamps, update triggers, owner policies, grants, and cascading account cleanup. Profiles default private; public profile reads will only be added with social privacy rules in Phase 6.

Home and later-phase tabs describe what will arrive next. They do not display fabricated metrics, maps, GPS fixes, clubs, or social activity. The decorative path on Welcome is an illustration, not a recorded route.

## Architecture and changed files

```text
src/
  app/                       # Route entry points only
    _layout.js, index.js      # Providers, auth guards, entry redirect
    (auth)/                  # Welcome, login, register
    (tabs)/                  # Home, explore, record, progress, profile
    verify-email.js, reset-password.js, +not-found.js
  components/common/         # Shared UI and navigation links
  features/
    authentication/          # Screens, API wrapper, session observer, provider
    dashboard/               # Home and clearly labeled upcoming sections
    profile/                 # Editable profile and preferences
  database/supabase/         # Client and profile queries
  hooks/                     # Query and async-action hooks
  services/                  # Query client, native/web auth storage
  store/                     # Zustand auth store
  theme/                     # Design tokens and system appearance
  validation/                # Zod auth/profile schemas
supabase/
  migrations/                # Versioned PostgreSQL foundation
  templates/                 # Confirmation and recovery code emails
tests/
  unit/                      # Validation, session races, storage failures
  integration/               # Real SQL policies in embedded PostgreSQL
  e2e/                       # Browser mobile-viewport smoke tests
scripts/serve-preview.cjs     # Local-only exported SPA test server
```

Root files added: `.env.example`, `jsconfig.json`, `eslint.config.cjs`, `eas.json`, `playwright.config.cjs`, and this README. Updated: `package.json`, `package-lock.json`, `app.json`, `.gitignore`. Removed the unused starter `App.js` and `index.js` after switching to Expo Router. Existing assets and repository instruction files are retained. SQLite, GPS, sync services, and their folders are deferred until their phases.

Application source files are JavaScript. TypeScript is a **development checker only** (`allowJs` + `checkJs`); no application `.ts` or `.tsx` files were added. Small JSDoc annotations describe library boundaries.

## Dependencies installed

All additions used `npx expo install` to preserve Expo compatibility.

| Purpose | Packages |
| --- | --- |
| Navigation and native layout | expo-router, expo-linking, expo-constants, react-native-screens, react-native-safe-area-context |
| Native persistence and builds | expo-secure-store, expo-dev-client, expo-system-ui |
| Data and validation | @supabase/supabase-js, react-native-url-polyfill, zustand, @tanstack/react-query, zod |
| Icons and browser preview | lucide-react-native, react-native-svg, react-dom, react-native-web |
| Development checks | eslint, eslint-config-expo, typescript, @types/react, @types/node, @electric-sql/pglite, @playwright/test |

Expo, React, React Native, and expo-status-bar came from the existing starter. Exact resolved versions are locked in `package-lock.json`. SDK-specific APIs were checked against the [Expo SDK 58 reference](https://docs.expo.dev/versions/v58.0.0/) and [Router installation guide](https://docs.expo.dev/router/installation.md).

## Verification

```sh
npm run lint
npm run typecheck
npm test
npm run test:database
npx expo install --check
npx expo-doctor
npm run export
```

`npm run typecheck` runs `tsc --noEmit -p jsconfig.json`, checking the JavaScript source without converting it to TypeScript.

The database tests execute the actual migration in PGlite (PostgreSQL compiled to WebAssembly). A small auth schema and `auth.uid()` helper represent Supabase's infrastructure. Tests cover owner isolation, forbidden ownership changes, anonymous denial, uniqueness, defaults, triggers, validation, and account deletion. They do not test hosted Supabase Auth, email delivery, PostgREST, or Supabase operational settings.

Browser tests use an exported build with **no Supabase environment configured**, at 390px and 320px widths. Before running, remove these environment variables from the export process (or use an isolated checkout with no `.env`), then:

```sh
npx expo export --platform web
npm run test:e2e
```

The default browser channel is installed Microsoft Edge. Set `PLAYWRIGHT_CHANNEL=chrome` to use Chrome, or install Playwright Chromium and set `PLAYWRIGHT_CHANNEL=chromium`. The preview server binds only to `127.0.0.1:4173`. Screenshots and failure traces are written to ignored `test-results/`.

Initial verification: 14 unit tests and 8 PostgreSQL test results passed; lint and JavaScript typechecking passed; Expo Doctor passed 20/20 checks; SDK compatibility passed; iOS, Android, and web production bundle exports succeeded. Browser results are recorded in `docs/verification.md`. Bundle exports are not native installation or device tests.

Dependency audit currently reports eight moderate findings inherited through Expo fingerprinting and ESLint's `minimatch` dependency, with no high/critical findings. No forced upgrades or SDK downgrade were applied; track compatible upstream fixes before release.

## Phase checklist

- [x] Phase 1 code: Expo initialization, dependencies, feature structure, Router, theme, bottom navigation, welcome/login/registration, Supabase client, auth state, guards, initial migration, environment example, setup documentation.
- [ ] Phase 1 environment verification: configure the hosted Supabase project, deploy the migration and email templates, and test real registration, confirmation, login, password reset, profile save, app restart, and sign-out on both iOS and Android.
- [ ] Replace temporary app identifiers and starter app icons before a beta release.
- [ ] Phase 2: real foreground/background GPS, permissions, filtering, rolling pace, splits, pause/resume, recovery, summary, and real-device tests.
- [ ] Phase 3: SQLite, local activity preservation, durable sync queue, retries/backoff, idempotent uploads.
- [ ] Phase 4: activity details, charts, statistics, personal records.
- [ ] Phase 5: elevation-aware race pacing, training plans, calendar.
- [ ] Phase 6: follow/feed/kudos/comments, clubs/challenges/notifications, full privacy policies.
- [ ] Phase 7: device and security acceptance testing, beta builds and release preparation.

Google/Apple sign-in, avatar uploads, dedicated onboarding/goals screens, account deletion UI, and other broader authentication requirements are not part of the first fifteen foundation deliverables and remain unimplemented. Goals/device tables prepare the database only; no goal or notification feature is implied. Phase 1 is not device-accepted until the environment checklist passes. Do not begin GPS implementation before that gate.
