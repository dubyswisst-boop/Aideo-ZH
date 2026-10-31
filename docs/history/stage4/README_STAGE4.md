# V10 Stage 4 — App.tsx sidebar wiring contract

Scope: adds `src/test/sidebarAppWiring.test.ts`, and extends `.github/workflows/aideo-zh-ui-preview.yml` to run this test with the already passing real `Sidebar` component tests.

**Important:** This test parses the actual `src/App.tsx` and checks that sidebar state, collapse guard, pointer cleanup, JSX wiring, and theater CSS are present. It is **not** a mounted App.tsx end-to-end test. Dynamic browser/Windows behavior remains pending. A separate test already mounts the real Sidebar component; the Playwright fixture validates geometry.

Run in CI: `npx vitest run src/test/sidebarAppWiring.test.ts src/test/sidebarComponentState.test.tsx src/test/i18nUi.test.tsx`.

Copy the two files from this ZIP into the repository root, review the workflow diff, commit and Push. No Aideo application source changes. No new local dependencies. If CI fails, review the exact failed assertion rather than weakening it.
