# Aideo-ZH V10 Stage 2 — Three-state sidebar

Baseline: `fix/full-chinese-localization`, after V10 Stage 1.

This patch changes exactly three source files: `src/App.tsx`, `src/components/Sidebar.tsx`, `src/App.css`.

- State 0: Entire sidebar hidden by default. A 7 px left-edge hover zone triggers the rail.
- State 1: 50 px icon-only rail, with Settings at bottom and the expand arrow at top.
- State 2: Clicking arrow opens the full sidebar (up to 270 px) as an overlay without moving main content. Clicking arrow again returns to icon rail.
- Leaving sidebar returns to completely hidden. Theater view disables sidebar and trigger.
- Preserves V10 Stage 1 font fallback, prior music playback logic and Windows signing configuration.

## Apply

1. Extract all ZIP contents into `D:\Aideo-ZH`, preserving paths.
2. Double-click `APPLY_V10_STAGE2.cmd`.
3. Confirm `[PASS] ... preflight`, then press Y.
4. Confirm SHA-256-verified backup output; review GitHub Desktop changes.

The patch script does not stage, commit, push or build. GitHub Actions test-unsigned and Windows runtime verification are required. Do not confuse source change with an installed-app update.

Theater wallpaper-mode changes, lyrics, maximize/restore and playback bar changes are deliberately out of scope for this Stage 2 patch.
