# Aideo-ZH V10 Stage 2 — Sidebar layout hotfix

Fixes the expanded sidebar label wrapping and extends the overlay to the full application height, including above the player bar. The main content does not reflow. The existing hidden -> icon rail -> full navigation logic remains unchanged.

## Install
1. Extract the whole ZIP to `D:\Aideo-ZH` preserving directories.
2. Run `APPLY_V10_S2_LAYOUT.cmd`.
3. Confirm read-only preflight PASS, then choose Y.
4. Inspect `src/App.css` diff in GitHub Desktop before commit/push.

Only source file modified: `src/App.css`. The backup is outside the repository, SHA-256 verified. It does not modify the native theater-wallpaper behavior, lyrics, Rust or signing.

**Not yet CI/build/runtime verified**. No executable installation package is included.
