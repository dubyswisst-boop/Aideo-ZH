# Lyrics P0 — isolated race validation

For branch `test/lyrics-p0-race-validation` only. Do NOT merge into the main development branch yet.

## Scope
- Test the **actual** `createMetadataSlice` using Zustand's vanilla store and controlled Tauri IPC mocks.
- Check manual vs auto, FIFO same-path writes, rejection of stale saves, track-switch isolation and failed requests.
- TypeScript compile via `npx tsc --noEmit` on Ubuntu 24.04 / Node 22.
- No executable, installer, Rust, Tauri build, code-signing or Windows Smart App Control change.

## Apply
Extract this ZIP to `D:\Aideo-ZH` preserving directories. It adds **three** files only, and does not touch the current 15 pending changes. Confirm GitHub Desktop shows 18 changes in total.

Check that the active branch is `test/lyrics-p0-race-validation` and commit these 18 files **on this isolated branch only**. Push / Publish branch. GitHub Actions runs automatically.

Expected job: `typecheck-and-race`. If TypeScript fails, tests will not run: inspect the TypeScript diagnostic and do not merge. If a race assertion fails, preserve the logs and do not weaken assertions merely to get green.

## Limitations
These tests mock backend file IO, so they validate the frontend Store's sequencing, not real Windows native writes. Search UI (LyricsPanel) and other code paths require later dedicated integration tests. The test suite must pass before considering merging.
