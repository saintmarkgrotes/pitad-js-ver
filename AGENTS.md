This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md


## Git commit messages

# Git Commit Instructions

Always follow **Conventional Commits** and practice **micro-commits** throughout development.

## 1. Commit Message Format

Always use this format:

`<type>: <short description>`

The scope is optional but recommended when applicable.

Examples:

- `feat(auth): add user login functionality`
- `fix(api): resolve authentication error`
- `docs(readme): update installation instructions`
- `style(ui): improve component formatting`
- `refactor(database): simplify query logic`
- `perf(api): optimize database queries`
- `test(auth): add login validation tests`
- `build(deps): update project dependencies`
- `chore(git): update gitignore configuration`

## 2. Allowed Commit Types

Use ONLY the following commit types:

| Type | Purpose |
|---|---|
| `feat` | A new feature for the user |
| `fix` | A bug fix for the user |
| `docs` | Documentation-only changes |
| `style` | Formatting, missing semicolons, or whitespace changes without affecting code logic |
| `refactor` | Code restructuring without adding features or fixing bugs |
| `perf` | Performance improvements |
| `test` | Adding or correcting tests |
| `build` | Changes to the build system or external dependencies |
| `chore` | Routine tasks, maintenance, and other changes |

## 3. Commit Message Rules

- Always use lowercase for the commit type.
- Use imperative mood for the description (e.g., "add", "update", "fix", "remove").
- Keep descriptions short, clear, and meaningful.
- Do not end descriptions with a period.
- Use a scope when it helps identify the affected module, component, or functionality.
- Avoid vague descriptions such as "updates", "changes", "fixes", or "misc".
- Never use generic messages such as "update code" or "final changes".
- Do not include unnecessary explanations in the commit subject.

## 4. Micro-Commit Workflow

Practice micro-commits throughout development.

### Core Principles

- Make small, frequent, and meaningful commits.
- Each commit must represent one logical change.
- Avoid combining unrelated features, fixes, refactoring, or documentation changes into one commit.
- Prefer multiple small commits over one large commit.
- Keep commits understandable, reviewable, and easy to revert.
- Do not wait until an entire feature is completed before organizing its changes into smaller milestones.

### When to Create Separate Commits

Organize larger implementations into logical milestones, such as:

- Adding a new component.
- Creating a new screen or route.
- Implementing a specific functionality.
- Adding or modifying a custom hook.
- Creating or updating database schemas.
- Fixing an isolated bug.
- Adding validation or error handling.
- Improving performance.
- Adding or updating tests.
- Updating project configuration or dependencies.
- Completing a meaningful refactoring task.

### Example: GPS Run Tracking

A GPS tracking implementation could be divided into:

1. `feat(tracking): add location permission handling`
2. `feat(tracking): implement location tracking`
3. `feat(tracking): calculate running distance`
4. `feat(tracking): calculate current running pace`
5. `feat(tracking): add live tracking screen`
6. `feat(tracking): add pause and resume controls`
7. `test(tracking): add distance calculation tests`
8. `fix(tracking): handle location tracking errors`

These are illustrative examples. Choose commit boundaries based on actual changes and dependencies.

### Micro-Commit Rules

- Every commit should contain a focused, logically related change.
- Do not create meaningless commits just to increase commit frequency.
- Avoid committing incomplete or broken code.
- Run relevant tests or checks before committing when practical.
- Stage only files belonging to the intended logical change.
- If changes are unrelated, separate them into different commits when practical.
- Preserve unrelated working-tree changes.

## 5. Before Committing

Whenever I explicitly request a commit:

1. Inspect the current Git status using `git status`.
2. Review changes using `git diff` and `git diff --cached`.
3. Understand the changes before selecting a commit type.
4. Identify separate logical changes that should become individual micro-commits.
5. Select the most appropriate Conventional Commit type and scope.
6. Stage only the relevant files. Never blindly stage everything using `git add .` or `git add -A`.
7. Create concise and descriptive commit messages.
8. Execute the commits in a logical order.
9. Verify successful commits using `git status` and `git log`.

If there are unrelated changes, leave them unstaged unless I explicitly instruct otherwise.

## 6. Multiple Types of Changes

If a task contains multiple unrelated changes, separate them into individual commits.

If changes are closely related and belong to one logical implementation, they may be grouped into one commit.

Always prioritize logical separation over an arbitrary number of commits.

## 7. Authorization and Git Safety

- NEVER create commits without my explicit instruction.
- NEVER automatically commit after every file modification.
- NEVER push changes to a remote repository unless I explicitly ask you to.
- NEVER amend an existing commit unless I explicitly ask you to.
- NEVER squash, rebase, or rewrite Git history without my permission.
- NEVER include unrelated or unreviewed files in a commit.
- NEVER create empty commits.
- If there are no changes to commit, inform me instead.
- If changes are unclear or potentially destructive, ask me before proceeding.

## 8. Expected Behavior

When I say **"commit"**, **"commit changes"**, or explicitly request a Git commit:

1. Independently inspect the working tree.
2. Identify all intended logical changes.
3. Determine whether the changes should be separated into multiple micro-commits.
4. Generate appropriate Conventional Commit messages.
5. Stage only the relevant files for each commit.
6. Execute the commits.
7. Verify the resulting Git history and working-tree status.

Do not ask me what commit message to use unless the changes are genuinely ambiguous.

During development, organize work into small, reviewable milestones, but always wait for my explicit authorization before creating commits.

**Primary goal:** Maintain a clean, consistent, meaningful, and traceable Git history using Conventional Commits and micro-commit practices.