# Aideo-ZH UI Preview — Ubuntu runner hotfix

Fixes GitHub Actions `Playwright does not support chromium on ubuntu26.04-x64` by pinning the UI preview runner to `ubuntu-24.04`.

- Changes exactly one line in `.github/workflows/aideo-zh-ui-preview.yml`.
- Does not modify Aideo feature source, Playwright dependency, or Windows release workflows.
- PowerShell 5.1 compatible. Read-only preflight, verified backup, and rollback on write verification error.

## Apply

Extract this ZIP over `D:\Aideo-ZH` preserving directory structure. Run `APPLY_UI_PREVIEW_RUNNER_FIX.cmd`. Accept only after `[PASS]`. Review the workflow diff in GitHub Desktop. Commit and Push. Watch `Aideo-ZH UI Preview Test`.

Suggested commit: `ci: pin UI preview runner to Ubuntu 24.04`

This fixes the unsupported Ubuntu 26.04 runner only; the browser layout test has not yet been validated.
