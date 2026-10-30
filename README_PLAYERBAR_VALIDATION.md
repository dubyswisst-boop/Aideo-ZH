# V10 播放栏自动隐藏候选代码验证

将本 ZIP 解压到 `D:\Aideo-ZH` 根目录，保留目录结构。当前 5 个修改文件不要丢弃。

先从当前 `fix/full-chinese-localization` 创建分支 `test/playerbar-autohide-validation`，选择 **Bring my changes**。

解压后应新增 3 个文件。Commit / Publish **只在该隔离测试分支**进行。GitHub Actions 工作流 `Aideo-ZH Playerbar Auto-hide Preview` 会执行 TypeScript 和浏览器测试。

测试使用实际 `src/App.css` + 精简的 HTML 夹具，复现 `App.tsx` 的鼠标逻辑，不等于真实完整 React/Tauri App 的端到端测试。涉及 5 种设计、底边触发、离开隐藏与内容区域矩形不变。Windows 原生验收仍需另行完成。

若失败，请保留日志，不要跳过断言或直接合并。
