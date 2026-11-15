# Phase 1 verification

Recorded November 16, 2026 (Asia/Manila). Environment: Windows, Node 24.14.1, npm 11.11.0, Expo SDK 58.0.25. No live Supabase project credentials were provided.

| Check | Result | Scope |
| --- | --- | --- |
| `npm run lint` | Passed | Expo ESLint rules, application and test files |
| `npm run typecheck` | Passed | JavaScript source checked with `tsc --noEmit -p jsconfig.json` |
| `npm test` | 14 passed | Validation, auth restoration races, Unicode sessions, write interruption, concurrent storage access, corrupt metadata recovery |
| `npm run test:database` | 8 passed | Seven policy scenarios plus their parent test, executing the migration in embedded PostgreSQL |
| `npx expo install --check` | Passed | Installed SDK-compatible dependencies |
| `npx expo-doctor` | 20/20 passed | Dependency and project configuration diagnostics |
| `npx expo export --platform all` | Passed | iOS and Android Hermes bytecode; web production bundle |
| `npm run test:e2e` | 4 passed | Microsoft Edge, mobile browser viewports, no configured backend |
| `git diff --check` | Passed | Tracked changes have no whitespace errors |
| `npm audit --json` | 8 moderate findings | Transitive minimatch issue through Expo fingerprinting and ESLint; no high/critical findings |

The initial sandboxed native export could not execute `hermesc.exe`; the authorized run outside the sandbox succeeded. Browser tests found and verified the fix for signed-out root/protected links incorrectly opening the not-found route. Test locators account for hidden screens retained by the navigation stack and the browser's implicit text input type.

## Browser coverage

1. The pitad wordmark and Welcome → registration → login → password reveal → password recovery, with no page runtime errors.
2. Signed-out direct navigation to Home, Explore, Record, Progress, and Profile redirects to Welcome.
3. Missing Supabase configuration displays a setup notice and disables sign-in.
4. Registration remains accessible in dark mode at a 320px viewport without horizontal overflow.

Generated screenshots: `test-results/login-light.png`, `test-results/register-dark.png`. These show the actual rendered browser preview and are ignored by Git. Browser results do not validate native safe areas, platform keyboards, Keychain/Keystore, or actual email/password requests.

## Remaining Phase 1 acceptance checks

After following `README.md` to configure a development Supabase project:

- Apply the migration and email templates; configure SMTP, email confirmation, and the password policy.
- Register two distinct users. Verify code delivery, wrong/expired codes, resend limits, duplicate account handling, and login.
- Complete password recovery and confirm the new password works and the old password no longer works.
- Save profile changes and a unique username, reload, and verify persistence. Attempt a duplicate username with the second account.
- Verify account A cannot access account B's rows through hosted PostgREST, using each account's ordinary JWT.
- Install development builds on real iOS and Android devices. Test keyboard avoidance, safe areas, large system text, light/dark appearance, and screen readers.
- Restart the app and verify native secure session restoration. Test token refresh after foregrounding, network failures, sign-out, back navigation, and an account switch.
- Confirm a failed profile request or mutation leaves a useful error and does not discard an editable draft.
- Replace working bundle identifiers and starter icons before beta distribution.

No hosted migration, live account operation, cloud build, or real-device test was performed. Google/Apple OAuth, avatars, dedicated onboarding/goals, GPS, SQLite, synchronization, analytics, training, and social features remain outside this implementation. Phase 2 must wait for the Phase 1 acceptance checks.
