# Aideo-ZH Lyrics UI CI regression repair

Scope: `src/test/localModeOnly.test.tsx` and `locales/zh-CN.json` only. Does not change runtime store or lyric UI behavior.

Reason: the two older tests create no current playback track, which is now rejected by the new lyric request identity guard. Add the localTrack identity in their fixtures while preserving both original assertions. Add three actual display strings to the existing localization dictionary.

Extract into `D:\Aideo-ZH` and run `FIX_LYRICS_ZH_CI.cmd`. First checks anchors, then requests explicit Y before writing. Backups outside the repository with SHA-256 checks. Only run on test/lyrics-ui-zh-validation; keep changes unmerged until CI verifies the full suite. Do not run windows-release.


## v2 修复说明
Windows PowerShell 5.1 的 ConvertFrom-Json 无法解析原字典中的大小写不同键（Playlists / PLAYLISTS）。v2 改为 .NET Framework 自带的 JavaScriptSerializer，在只读预检与修改后 JSON 验证中都使用同一个解析器；保留原 SHA-256 备份及失败回滚。
