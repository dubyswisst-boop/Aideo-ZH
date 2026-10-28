# Aideo 中文语言包

本项目是 Aideo Music Player 的非官方社区汉化，保留原作者 Alirul 的署名和 GPL-3.0-or-later 许可。需要重新编译；仅把 JSON 复制到官方英文 EXE 旁边，不能改变未经修改的程序。

## 覆盖范围

中文词典包含 2,463 个键。覆盖主页各布局、导航、音乐库、专辑、搜索、正在播放、播放器、迷你模式、剧院模式、桌面歌词、排行榜、收听分析、下载界面、标签编辑、设置、首次设置向导、音频控制中心、Aideo Lab、通知和弹窗。品牌、编码格式、单位、文件路径和用户内容按原样显示。

构建转换器处理静态 JSX、条件文字、模板字符串、界面配置中的标签，以及 `title`、`placeholder`、`aria-label`、`aria-description`、`aria-valuetext` 和静态 `alt`。通过 React 订阅更新文字，语言切换不需要重载页面。表单值、事件处理函数、歌曲元数据和用户歌单名称不作为翻译源。

下载进度和通知仅在显示时翻译；原始状态、数值、IPC 消息、通知去重和诊断详情保持原值。原生托盘、桌面歌词窗口标题、手机遥控页使用编译时中文词典；这些原生文字目前不跟随前端的 English 选项或外部语言包热重载。

## 构建和安装语言文件

```text
npm ci
npm run check:locales
npm test
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri -- build --config src-tauri/tauri.zh.conf.json --bundles nsis
```

`check:locales` 需要支持类型剥离的 Node.js 22 版本；工作流使用 Node.js 22。

独立中文版配置使用 `com.aideo.community.zh` 标识和 `aideozh://` 深链，禁用上游自动更新源，NSIS 安装界面使用简体中文。工作流只生成 NSIS EXE，不发布 GitHub Release。

`src-tauri/tauri.zh.conf.json` 将 `../locales/zh-CN.json` 明确映射为资源目录下的 `locales/zh-CN.json`，与 Rust 读取路径一致。只使用基础 `tauri.conf.json` 构建不会包含这个外部覆盖文件，但内置中文词典仍可使用。

```text
应用资源目录/
  locales/
    zh-CN.json
```

更换语言文件后，在“设置 → 外观 → 界面语言”点击“重新加载语言包”。安装目录需要写入权限时，可先将文件复制到可写位置编辑，再替换安装文件。不要使用官方自动更新覆盖此社区修改版。

## 语言包格式

文件为 UTF-8 JSON，顶层是“英文文案 → 中文翻译”的平面字符串映射。例如：

```json
{
  "Settings": "设置",
  "Library": "音乐库",
  "Exported {count} tracks to {file}": "已将 {count} 首歌曲导出到 {file}"
}
```

占位符名称必须完整保留，可调整顺序。自动转换的模板使用 `{value0}`、`{value1}` 等名称。丢失或新增占位符的外部覆盖项会被忽略，继续使用内置翻译。译文按文本渲染，不执行 HTML。

Rust 只读取固定名称，文件最大 2 MiB。文件缺失时使用内置词典；重新加载发生读取或解析错误时保留上次有效词典。字典未收录的第三方错误和技术诊断会回退原文。

## 维护规则和验证边界

- 新增普通 JSX 文字或已支持的显示属性后，运行 `npm run check:locales`，补齐所有缺失键。
- 来自函数、状态变量或动态数据的界面文案，需要显式调用 `useTranslation().t(...)`。不能根据变量名假定用户内容可翻译。
- 用户播放列表、歌曲标题、歌手、文件名和输入值保持原样；系统生成的混合歌单标题与用户歌单分别处理。
- 下拉选项应始终显式提供稳定的 `value`。动态标签同时作为隐式值时，转换器保留原表达式，避免重复求值或更改提交值。
- 显示属性后存在 JSX 展开属性时，转换器保留原覆盖顺序；这类默认文案请显式调用 `t(...)`。
- 新的应用通知模板应加入 `src/i18n/notificationTemplates.json`，并在 JSON 中添加对应译文。模板替换只用于通知显示，不翻译原始业务数据。
- 自动覆盖检查衡量已识别的显示入口，不代表所有运行时数据均有中文译文。

前端测试涵盖动态文字、辅助功能属性、实体字符、选项值、引用和回调、用户内容保护、语言切换、通知模板、占位符，以及语言文件打包映射。原生读取器与遥控显示有 Rust 测试；Windows 原生编译、NSIS 安装和真实设备运行需要在具备 Rust/MSVC 的环境中验证。
