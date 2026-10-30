# V10 Stage 4 — 修复两项测试定位误判

## 背景
GitHub Actions 中 `sidebar-layout` 通过，`react-sidebar-component` 的 Stage 4 `sidebarAppWiring.test.ts` 报错：
- `functionBody('toggleSidebarExpansion')` 返回空文本
- `jsxByName('Sidebar')` 返回空数组

实际 `src/App.tsx` 内相关函数及组件存在。本补丁避免 Vitest 转换环境下的 AST 遍历定位问题，将两处改为严格的源码范围检查，并保留 5 项断言。

## 安装
1. 先在 GitHub Desktop 确认工作区干净，且位于 `fix/full-chinese-localization`。
2. 解压本 ZIP，将 `src/test/sidebarAppWiring.test.ts` 复制到 `D:\Aideo-ZH\src\test\`，覆盖同名测试文件。可先复制原测试文件作为备份。
3. GitHub Desktop 应只有 `src/test/sidebarAppWiring.test.ts` 一个**既有文件**发生修改。
4. 检查差异后 Commit & Push；若没有自动触发 UI Preview Test，可手动运行该工作流。

建议提交名：`test: fix Stage 4 source-contract selectors`

不修改 App.tsx / Sidebar.tsx / App.css / 工作流，不放宽断言。只做源码静态契约检查，不是完整 App 运行时验收。
