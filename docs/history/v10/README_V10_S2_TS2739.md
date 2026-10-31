# Aideo-ZH V10 Stage 2 — TS2739 hotfix

Fixes the GitHub Actions TypeScript error in `src/test/i18nUi.test.tsx` where existing test code renders `<Sidebar />` with no props.

One source file changed: `src/components/Sidebar.tsx`. New optional props defaults: `expanded = true`, `onToggleExpansion = () => {}`; production App keeps passing its controlled props. Nothing else is changed.

Extract the ZIP with directory structure into `D:\Aideo-ZH`. Double-click `APPLY_V10_S2_TS2739_FIX.cmd`. Confirm read-only preflight PASS; input Y. Verified pre-patch backup is made outside repo. Idempotent when applied already. No Git commit/push or build automatically.

The fix only resolves the reported TypeScript interface incompatibility. It does not establish CI or runtime pass, nor does it change theater wallpaper lock behavior.
