# Aideo-ZH V9.2 修复补丁

修复 V9.1 apply.ps1 的 PowerShell 大小写不敏感变量冲突：`[switch]$Check` 与 `$check` 冲突。新版本使用 `$writtenText` 读取写入后的文件。

此前 V9.1 报错发生于写入后的校验阶段，回滚日志显示已经恢复原始文件。本次使用严格锚点预检查、修改前备份、SHA-256 验证和失败时回滚校验。

使用方法：解压到 `D:\Aideo-ZH` 根目录（保持文件夹结构）覆盖 `APPLY_V9_FIX.cmd` 和 `tools\aideo-feature-patch\v9-fix.ps1`，双击 CMD。预检查 PASS 后输入 Y。

仅修改 `src/components/WindowChrome.tsx`，不修改 V8 其他功能、测试或签名配置。CI 测试与 Windows 真机运行仍待验证。
