# V10 歌词工具栏与搜索窗口中文化

仅修改 `src/components/LyricsPanel.tsx` 的可见文案，不修改歌词异步逻辑、事件处理、组件布局或 CSS。

将压缩包完整解压至 `D:\Aideo-ZH`，运行 `APPLY_LYRICS_ZH_COPY.cmd`。先做只读 SHA-256 校验和文案定位校验，再输入 Y，生成外置备份并修改。

该补丁对源文件的 SHA-256 有严格要求。如与基线不一致，脚本自动停止，不要尝试强制套用。

执行后在 GitHub Desktop 查看 `LyricsPanel.tsx` 差异；不要在 TypeScript 检查前直接合并。
