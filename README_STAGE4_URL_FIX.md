# Aideo-ZH Stage 4 — Vitest file URL hotfix

This patch addresses `ERR_INVALID_URL_SCHEME` / `The URL must be of scheme file` in `src/test/sidebarAppWiring.test.ts`.

Changes one target file only: uses `resolve(process.cwd(), 'src/App.tsx')` and `resolve(process.cwd(), 'src/App.css')` instead of relative `new URL(..., import.meta.url)`, and adds Node `path.resolve` import.

Extract ZIP to `D:\Aideo-ZH` preserving directories and run `APPLY_STAGE4_URL_FIX.cmd`. The script preflights first, requires Y confirmation, creates SHA-256-verified backup, applies the fix and verifies changed strings. Commit script and documentation along with test file as desired. It does not change application source or UI CSS. Run CI and inspect results; success not guaranteed.
