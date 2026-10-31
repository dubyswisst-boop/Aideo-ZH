# Aideo-ZH lyrics P0: save-scope safeguard

Changes only `src/store/metadataSlice.ts`.

## Problem
`saveLyrics(path,lrc)` formerly persisted the selected track's lyrics to `path`, then also to the **currently playing** `playback.current_track` and `currentTrack.path` if different. A song switch during an awaited asynchronous request can thus poison a different song's lyric cache.

## Change
Persist lyrics to the explicitly supplied `path` only. Readback and existing current-track check remain. Do not alter search ranking, automatic fetching, UI, or lyric offset handling in this stage.

## Apply
Unzip into `D:\Aideo-ZH` preserving folders. Run `APPLY_LYRICS_SAVE_SCOPE.cmd`, confirm read-only preflight, then Y. Verified original is backed up to a sibling directory outside repository. Check GitHub Desktop changes before commit and push.

## Status / limitations
This is a targeted guard, **not a complete fix** for async search races, manual selection priority, or cross-song offset leakage. Cloud compilation, tests, and native Aideo runtime validation remain pending.
