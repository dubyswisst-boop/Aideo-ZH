# Aideo-ZH Lyrics P0 Batch 2.2 — Save Protocol Hardening

Only apply **after Batch 2 and Batch 2.1** are already applied locally. Keep existing 11 changes uncommitted.

The patch changes `src/store/metadataSlice.ts` and `src/store/types.ts` only. It adds the original manual epoch as an explicit token for automatic saves and returns a boolean indicating whether a write was committed. Skipped saves cannot continue to lyric readback or offset adjustment from `autoFetchLyricsOnline`.

Unzip at `D:\Aideo-ZH`; run `APPLY_LYRICS_P0_BATCH22.cmd`. Inspect source diff and preserve backup. Do **not** commit or push before typecheck + asynchronous regression tests.

**Limitations:** This does not validate native file I/O, every direct backend write path, or permanent manual preference storage. A manual selection that occurs while an earlier auto backend write is in progress cannot cancel that in-flight write; the queue ensures the subsequent manual write runs last. Same-track playback session identity and cross-process writes still need tests. 
