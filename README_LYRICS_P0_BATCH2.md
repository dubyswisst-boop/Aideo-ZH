# Aideo-ZH Lyrics P0 Batch 2

Applies three-file guarded changes to metadataSlice.ts, LyricsPanel.tsx and store/types.ts.

- Automatically fetched lyrics cannot overtake a newer manual selection or unrelated track; per-request version check.
- Manual save defaults to `manual`; automated save uses `auto`.
- Search results and pick operations become stale on track change.
- No Rust, CSS, installer, or Windows security changes.

Run APPLY_LYRICS_P0_BATCH2.cmd from D:\Aideo-ZH. Read-only preflight runs first; requires explicit Y and SHA-256 verified external backup.

IMPORTANT: This is a candidate fix, not CI verified. Before merging verify `npm run lint`, focused Vitest and relevant existing tests with GitHub Actions; check replay of rapid track changes and manual override. Stale writes already issued to backend cannot be cancelled.

Commit: `fix: guard lyric auto-fetch and manual search races`
