# V10 — actual React Sidebar component test

Adds a focused Vitest test importing the production `Sidebar` component, and a separate GitHub Actions job. Existing Playwright geometry testing is unchanged.

## Limits
- React test uses a small state harness, **not the production App.tsx**; therefore it does not prove App event-guard behavior or native Tauri operation.
- No Windows EXE is installed or executed. No app CSS or production component file is changed.
- This is a proposed patch; requires CI validation before acceptance.

## Apply
1. Extract ZIP under `D:\Aideo-ZH` (preserve subfolders).
2. Inspect two files in GitHub Desktop and commit/push.
3. Two jobs should run: `sidebar-layout` and `react-sidebar-component`.
4. Review failures (if any) rather than weakening assertions.
