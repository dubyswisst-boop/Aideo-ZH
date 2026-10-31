# V10 Stage 2 collapse-guard interaction fix

Apply from repository root `D:\Aideo-ZH` with `APPLY_V10_S2_COLLAPSE_GUARD.cmd`.

Changes precisely three existing source/test files:
- `src/App.tsx`: a collapse-induced `mouseleave` is ignored; the next actual pointer movement either keeps the rail open (within its bounds) or hides it (outside).
- `tools/ui-preview/fixture.html`: mirror the real app guard for the CSS fixture.
- `tools/ui-preview/test-sidebar.mjs`: clarifies the real mouse movement assertion, without relaxing it.

Preserves CSS, sidebar widths, native build workflows, and strict assertions. Requires exact baseline matching; first phase is read-only; apply makes SHA-256 verified backups and restores on write failure. Not yet tested in CI or installed Windows application.

Expected commit: `fix: keep sidebar rail visible on collapse (V10 S2)`.


## PS5.1 hotfix
Corrected PowerShell pair enumeration during read-only preflight. Previous failure `got 32` was caused by scalar character comparisons instead of exact anchor strings. Run the CMD from repository root after replacing files.
