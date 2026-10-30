# Aideo-ZH Window Chrome maximize permission hotfix

Scope: add only `core:window:allow-toggle-maximize` to `src-tauri/capabilities/default.json`.

Current `WindowChrome.tsx` uses `getCurrentWindow().toggleMaximize()`; Tauri v2 requires explicit permission for that command. Existing `allow-maximize` / `allow-unmaximize` are separate permissions.

1. Extract the archive to `D:\Aideo-ZH` preserving its folder structure.
2. Double-click `APPLY_WINDOW_MAXIMIZE_PERMISSION.cmd` (preflight is read-only).
3. Enter `Y` only if preflight passes; the script backs up the original file in `D:\Aideo-ZH-WINDOW-PERMISSION-PREPATCH-...` and validates SHA-256.
4. Review GitHub Desktop: `src-tauri/capabilities/default.json` should show one new permission plus the helper script, launcher and README.
5. Commit and push; run Windows `test-unsigned` CI only when convenient. Note that Smart App Control may still block an unsigned EXE on your main PC. CI cannot fully prove native maximize works.

Recommended commit: `fix: allow Tauri window toggle maximize`

No changes to Windows security policy, signing, React CSS, or window chrome handlers.
