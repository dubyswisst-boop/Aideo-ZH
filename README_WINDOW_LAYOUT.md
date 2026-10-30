# Aideo-ZH — Now Playing titlebar overlap and drag-surface patch

Only `src/components/NowPlayingView.tsx` is changed by the patch tool.

1. Moves the upper-left floating control group from `top: 24` to `top: 48`, avoiding the 34px window drag bar.
2. Adds `data-tauri-drag-region` to the `.np-left` container so direct empty-background pointer hits can drag the native window. Child controls and album artwork do not receive the marker; the original top titlebar drag area is retained.

This does not modify `.window-chrome-drag`, the 3-state sidebar, native Tauri permissions, or lyric functionality. Drag behavior and toolbar positioning require Tauri runtime verification; cloud CSS-fixture tests alone cannot verify native dragging.

Unzip into `D:\Aideo-ZH`, preserve directory structure. Run `APPLY_WINDOW_LAYOUT.cmd`; review preflight output, confirm Y, review `src/components/NowPlayingView.tsx` changes in GitHub Desktop, commit and Push. Suggested commit: `fix: separate Now Playing toolbar from titlebar drag region`.

Backups are stored outside the repository at `D:\Aideo-ZH-WINDOW-LAYOUT-PREPATCH-...`.
