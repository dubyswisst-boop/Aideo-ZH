# Aideo-ZH V10: Now Playing bottom player-bar auto-hide

Target branch: `fix/full-chinese-localization`. Works with Windows PowerShell 5.1.

Change scope: `src/App.tsx`, `src/App.css`. All player bar visual styles preserved.

Behavior: hidden except a 6px bottom sliver, reveal when mouse reaches bottom 12px, keep visible while pointer is within the bar, hide when pointer leaves the bar area, and hide on pointer exit from the app. Other pages unaffected. Focus within the bar also reveals it. No dynamic grid-row resizing.

Apply: Extract files at repository root, double-click `APPLY_PLAYERBAR_AUTOHIDE.cmd`, review preflight, confirm Y, review GitHub Desktop. Do NOT commit until preview checks and source review.

Caveat: native Windows runtime behavior not yet tested; floating mode has pointer-events:none on outer bar, pointer movement is tracked at app container. Some overlay stacking interactions and focus behavior require inspection.
