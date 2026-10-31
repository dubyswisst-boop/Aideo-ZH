# Aideo-ZH V10 — stronger three-state sidebar cloud assertions

This is a **test-only** patch. Applies to branch `fix/full-chinese-localization`.

## Installation (Windows PowerShell 5.1)

1. Extract this ZIP into `D:\Aideo-ZH` preserving the directory structure.
2. Double-click `APPLY_UI_STATE_TEST.cmd`.
3. Read-only preflight must PASS, then answer Y.
4. Inspect `tools/ui-preview/test-sidebar.mjs` diff using GitHub Desktop.
5. Commit and Push; the existing UI Preview workflow triggers automatically.

Suggested commit: `test: assert sidebar rail remains visible after collapse`

## Added assertions

- Clicking the **actual arrow** must leave a visible ~50px rail, with nonzero opacity and correct class names.
- After a **real mouse pointer exit**, sidebar must become fully hidden.
- Add `04-after-arrow-collapse.png` and `05-after-mouse-leave.png` to cloud artifacts.
- Original layout geometry tests remain intact.

**Important:** The new stricter arrow test may initially fail. This would expose a real interaction defect, not an infrastructure failure; do not weaken the assertion just to make CI green. Only the fixture is exercised, not full React/Tauri, so results are limited to that scope.

No source CSS, React components, npm setup, release workflow, or Windows security settings are modified.
