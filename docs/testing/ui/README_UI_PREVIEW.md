# Aideo-ZH 云端侧栏布局回归测试（独立流程）

## 范围

- 使用真实的 `src/App.css`，浏览器中的结构夹具复现 `.app`、`.app-sidebar`、`.nav-item`、`.app-main`、`.player-bar`。
- Chromium / Playwright 检查三态宽度、展开标签不换行、侧栏覆盖整个窗口和播放栏、主内容无重排、箭头收起与鼠标离开隐藏。
- 导出 `01-hidden.png`、`02-icon-rail.png`、`03-expanded-overlay.png`、`results.json`。

**边界：** 这是 CSS 布局回归夹具，不运行实际 React `App.tsx`、Tauri API、音频播放、Windows 窗口控制。截图反映布局规则，不代表完整应用最终截图。浏览器测试通过不等于 Windows 原生版通过。

## 操作

1. 将补丁解压到 `D:\Aideo-ZH` 根目录，确保 `.github/workflows/aideo-zh-ui-preview.yml` 和 `tools/ui-preview/` 被复制。
2. 在 GitHub Desktop 查看新增文件：四个文件，均与云端测试有关；提交并 Push 到 `fix/full-chinese-localization`。
3. GitHub Actions -> `Aideo-ZH UI Preview Test` -> `Run workflow`，选择 `fix/full-chinese-localization`。
4. 打开 workflow run -> Artifacts -> `aideo-zh-sidebar-layout-report`，下载并查看截图和 `results.json`。
5. 如某项 FAIL，把 `results.json` 和截图传回，不要修改 Windows 安全防护。

## 原则

- 不改 `src/App.css`、`src/App.tsx`、`Sidebar.tsx`，也不改原 Windows 打包 workflow。
- 不包含 git、npm 安装于本机的步骤。所有依赖只装在 GitHub Ubuntu Runner 内。
- 新的 workflow 监听 `src/App.css` 相关变更，也可以手动运行；手动运行避免与原 Windows workflow 混淆。
- 若已有未推送本地变更，先在 GitHub Desktop 核对后推送，避免测试过期的分支。
