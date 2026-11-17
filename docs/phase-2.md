# Phase 2: GPS recording

Implemented November 17, 2026 using Expo SDK 58 and JavaScript. The user confirmed the Phase 1 authentication/profile and native-build gate. Phase 2 background GPS still requires real-device acceptance; no device run or cloud build was performed by this implementation.

## Setup

Install dependencies with `npm ci`. Preserve your existing `.env` and Supabase configuration. New packages, installed through `npx expo install`: `expo-location`, `expo-task-manager`, `expo-sqlite`, `expo-crypto`, and `react-native-maps`.

Create and install a **new** native development build; the Phase 1 binary lacks the new modules and permissions:

```sh
npx eas-cli@latest build --platform android --profile development
npx eas-cli@latest build --platform ios --profile development
npx expo start --dev-client
```

Use an already configured EAS project and its development environment with the Supabase public variables. iOS requires signing and device provisioning. No manual native-folder changes are needed. `app.json` configures location permission descriptions, iOS background location, and the Android location foreground service. Background recording needs a development build, foreground permission, then background permission. Android may redirect to Settings; the screen explains this before requesting access. See [SDK 58 Location](https://docs.expo.dev/versions/v58.0.0/sdk/location/) and [TaskManager](https://docs.expo.dev/versions/v58.0.0/sdk/task-manager/).

Android street-map tiles are optional. Create a Google Cloud project, enable Maps SDK for Android, and create a key restricted to that API plus the app's Android package and signing-certificate SHA-1. Add `GOOGLE_MAPS_ANDROID_API_KEY` to `.env` and the matching EAS build environment, then rebuild. Use the correct development or release certificate restriction for each binary. `app.config.js` passes the key to the maps config plugin. Native map keys are embedded in the binary, so restrictions matter. Follow [Expo's SDK 58 Android maps setup](https://docs.expo.dev/versions/v58.0.0/sdk/map-view/#android). iOS uses Apple Maps. Without an Android key, the app renders actual recorded coordinates without street tiles; tracking remains available.

In Record, check GPS outdoors with precise location enabled. Enable background recording for screen-lock use, or turn it off for foreground-only mode. Start, pause/resume, and finish. Home lists the account's latest 50 finished local runs, each opening its summary. Browser preview and Expo Go do not record runs.

## Implementation and file map

| Area | Files | Behavior |
| --- | --- | --- |
| Calculations | `src/features/tracking/engine.js`, `format.js`, `routeGeometry.js` | Pure location reducer, metrics, splits, units, bounded route rendering |
| Persistence | `src/database/local/` | Versioned SQLite migration; atomic points and state; owner-scoped history, titles, recovery |
| Sensors | `src/services/locationService.js`, `locationTask.js` | GPS readiness, foreground watcher, global background task, native service cleanup |
| Lifecycle | `src/features/tracking/controller.js`, `TrackingProvider.js` | Serialized controls; recovery; account-switch and foreground-only interruption handling |
| Recording UI | `src/features/tracking/RecordScreen.js`, `RunMetrics.js`, `src/hooks/useRecording.js` | Permissions, actual GPS status, timers, maps, controls, error recovery |
| Summary/history | `src/features/activities/`, `src/app/run/[id].js` | Saved metrics, kilometer splits, title editing, estimated calories, recent runs |
| Maps | `src/components/maps/` | Native route map and coordinate preview; gaps and pauses drawn separately |
| Integration | `src/app/_layout.js`, `(tabs)/record.js`, dashboard and authentication modules | Global task registration, protected summary route, saved runs, unfinished-run sign-out guard |
| Configuration/tests | `app.json`, `app.config.js`, `.env.example`, package files, `tests/tracking/`, browser route test | SDK-compatible native configuration and regression coverage |

Sensors live outside screen components, so navigating tabs does not stop a recording. The background task is registered at module scope. SQLite uses a dedicated connection, WAL, serialized operations, and `BEGIN IMMEDIATE` transactions before reading state for writes. Each accepted batch commits its points and metrics together. Duplicate timestamps cannot add distance twice. Only one unfinished recording can exist per device. Public reads and mutations are scoped to the signed-in account; internal background ingestion continues the persisted run. Signing out with your unfinished run is blocked until it is finished.

Minimal SQLite storage was brought forward from Phase 3 because recording recovery requires durable local state. Runs remain local, without cloud upload or a synchronization queue. SQLite is app-private storage, not an encrypted database or a server authorization boundary. Uninstalling/clearing app data loses these recordings; the summary communicates this. Cloud backup, retention/deletion controls, and sync are later work. A stopped native service is recovered as paused at the last saved fix, avoiding invented running time after interruption. Resume starts a new route segment. A live registered background task is allowed to continue.

## Metric definitions and limits

- Haversine distance uses meters. Reject invalid coordinates/timestamps, mocked locations, reported accuracy worse than 25 m, and observed or reported speed above 12 m/s. Duplicate/out-of-order fixes are ignored. A displacement threshold based on reported accuracy suppresses jitter; reliable reported speed below 0.7 m/s re-anchors without adding distance.
- A gap longer than 15 seconds breaks the route. Missing distance is not filled in. Conservative filtering can undercount tight turns, slow movement, or poor signal; it needs outdoor calibration against a known course.
- Current pace uses 10 seconds of accepted history; rolling and best sustained pace use 30 seconds. Boundaries are interpolated, and less than 5 m of movement or insufficient history produces an unavailable pace. Live pace becomes unavailable after 10 seconds without a reliable fix.
- Run time counts the recording state, excluding manual/automatic pauses. Moving time counts accepted movement intervals. Elapsed time includes pauses. Average pace uses run time. Kilometer splits interpolate the exact distance crossing; the summary includes the final partial kilometer. Distance/pace honor the profile's km/mile choice; splits are explicitly kilometers.
- Elevation gain uses reliable GPS altitude, smoothing, a 3 m threshold, and vertical-speed filtering. It is an estimate, not terrain-corrected elevation. Calories are labeled as a rough distance/weight estimate; weight defaults to an editable 70 kg and is not stored.
- Full accepted point history stays in SQLite; rendering uses approximately 600 representative points, preserving segment boundaries. Calculation history is bounded. Polling pauses in the background; finished summaries do not keep a timer running.
- Foreground-only mode pauses when the app becomes inactive. Background mode requests native updates, but force quit, OS termination, permissions, battery restrictions, and manufacturer policies can stop delivery. No guaranteed tracking after force quit is claimed. An offline signed-in session can record; street-map tiles may require connectivity.

## Automated verification

| Check | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed; JavaScript checked without adding TypeScript application source |
| `npm test` | 41 passed: 14 existing and 27 tracking tests |
| `npm run test:database` | 8 passed against embedded PostgreSQL |
| `npx expo install --check` | SDK-compatible dependencies |
| `npx expo-doctor` | 20/20 checks passed |
| Native config introspection | Expected iOS location background mode and Android foreground/background service permissions |
| `npx expo export --platform all` | Passed: iOS/Android Hermes bundles and web production bundle |
| `npm run test:e2e` | 4 passed in Microsoft Edge, including signed-out protection for `/run/private-run` |
| `git diff --check` | Passed for tracked changes |

Tracking tests use clearly labeled synthetic fixtures, injected sensor controls, and a real SQLite engine through the production repository adapter. They cover known distances, GPS noise/teleports, pace windows, split interpolation, pause/resume, signal gaps, moving time, elevation filtering, owner isolation, duplicate delivery, atomic rollback, disk reopen recovery, permission/start/stop failures, background-mode behavior, and sensor interruption. These do not test native GPS hardware or permission dialogs. PostgreSQL tests cover the existing foundation schema; no activity cloud schema is claimed.

Browser smoke tests use an export with no configured backend. To keep your real `.env` intact, create that export with process-local overrides in PowerShell:

```powershell
$env:EXPO_NO_DOTENV='1'
$env:EXPO_PUBLIC_SUPABASE_URL=''
$env:EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=''
npx expo export --platform all
npm run test:e2e
```

Run these in a separate shell; close it afterward so normal development loads `.env` again. Native export verifies bundling, not installation or GPS delivery.

## Pending real-device acceptance

Run on both iOS and Android; record device model, OS, build, route, duration, and observed result:

- Deny location, deny background access, disable precise location, disable GPS, and permanently block permission. Confirm understandable errors, Settings recovery, and no phantom recording.
- Start outdoors with an accurate fix. Compare a known 1 km course against distance and split timing; stand still before/after to measure drift. Repeat curves, poor sky visibility, and signal loss/recovery.
- Background mode: record at least 15 minutes with the screen locked and while switching apps. Verify continued route delivery, Android service notification/iOS indicator, and sensible battery use. Repeat under battery saver and manufacturer restrictions.
- Foreground-only mode: lock/switch apps and verify paused state. Walk while manually paused, resume, and verify no connecting distance across the pause.
- Record without network after signing in. Finish and restart the app; confirm route, splits, title, and metrics persist. Do not expect cloud upload or offline street tiles.
- Force-stop/terminate during a run, then relaunch. Confirm saved points survive, missing time/distance is not fabricated, and Resume/Finish work. Force quit is not a supported continuous-recording scenario.
- Interrupt/revoke permissions during recording. Confirm recovery/error behavior, retry controls, and sensor shutdown after Finish. Check calls/temporary inactivity and low-storage conditions.
- Verify sign-out is blocked for the current unfinished run. After finishing, switch accounts and verify no previous account's titles, routes, or summaries appear; return to the original account to recover its history.
- Check small screens, large text, light/dark modes, screen readers, real native maps, and long recordings. Verify Start/Pause/Resume/Finish do not duplicate operations.

## Review and commit boundaries

Phase 2 is organized into focused Conventional Commits: native dependencies/config; pure tracking engine with tests; SQLite repository with tests; location lifecycle with tests; route rendering; recording interface; summary/history and navigation; unfinished-run sign-out protection; browser coverage; documentation. Unrelated `AGENTS.md` and Supabase CLI configuration changes are excluded.
