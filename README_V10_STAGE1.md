# Aideo-ZH V10 Stage 1 — conservative UI patch

This ZIP **does not complete all ten V10 requirements**. It is an opt-in, isolated CSS change that targets the compact icon rail, expanded-sidebar stacking, settings reachability and offline Chinese font fallback. It does **not** claim to fix lyrics, maximize/restore, window dragging, theater top controls, or bottom player autohide. No repository content or user library data is included in the ZIP.

Extract all ZIP files to `D:\Aideo-ZH`, run `APPLY_V10_STAGE1.cmd`, review and test before committing. First invocation performs read-only preflight. Applying creates a verified SHA-256 backup in the parent of the repository. Re-running is idempotent.

**Known risks:** CSS behavior requires desktop verification; existing app shell grid and hover behavior may cause visual regressions. Do not commit or push before reviewing the UI and your GitHub Desktop changes. If the result is not acceptable, restore `src/App.css` from the reported backup directory.

Target: `src/App.css` only. Changes to Tauri signature/release workflow, lyric store, Rust files and user data: **none**.
