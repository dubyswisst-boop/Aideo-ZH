# Aideo-ZH Lyrics P0 Batch 2.1 — save queue hardening

**Baseline:** local **uncommitted** Batch 2 changes must already be applied, including `lyricManualVersion` and `manualLyricPaths` in `src/store/metadataSlice.ts`.

Changes only that source file. Keeps previous local edits to `LyricsPanel.tsx` and `types.ts` unchanged. Registers manual intent before queuing, serializes writes to each normalized song path, and checks manual epoch before executing a queued write. A manual selection queued after an ongoing automatic write runs last.

1. Extract this ZIP into `D:\Aideo-ZH`.
2. Double-click `APPLY_LYRICS_P0_BATCH21.cmd`. Read-only preflight must PASS before approval; choose Y to apply.
3. Inspect GitHub Desktop diff. **Do not Commit or Push yet.** Obtain TypeScript CI build and deferred-write test verification before releasing.

Known limitations: no persistence across restart; automatically fetched lyrics intentionally stay blocked for paths manually selected in the same session; path keys use slash normalization + lowercase and may need canonical identity handling for unusual aliases; backend/native writes issued outside this store's queue are not serialized. This hotfix is a candidate, not a verified solution.
