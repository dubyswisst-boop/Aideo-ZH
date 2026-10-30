# Aideo-ZH Cloud UI Preview npm hotfix

Fixes GitHub Actions `Cannot read properties of null (reading 'edgesOut')` during Playwright installation, by installing the CLI in `tools/ui-preview/` with a minimal manifest instead of resolving the complete Aideo repo's dependency graph.

## Changed files

- `.github/workflows/aideo-zh-ui-preview.yml`: modifies **two run commands**, no other CI workflow or product code.
- `tools/ui-preview/package.json`: minimal isolated manifest, npm never touches root package files.
- `tools/aideo-feature-patch/v10-ui-npm-fix.ps1`: PowerShell 5.1 checker/applicator.
- `APPLY_UI_PREVIEW_NPM_FIX.cmd`: double-click launcher.

## Apply

1. Extract ZIP into `D:\Aideo-ZH` while preserving directories.
2. Double-click `APPLY_UI_PREVIEW_NPM_FIX.cmd` and choose Y after the read-only preflight.
3. In GitHub Desktop inspect the two modified YAML commands; commit & push.
4. Verify new automatic `Aideo-ZH UI Preview Test` run. CI outcome is not guaranteed and browser screenshot assertions may expose actual layout problems.

No Windows system policy or installed application changes. Backup is created outside the Git repository in `D:\`, so GitHub Desktop will not include it.
