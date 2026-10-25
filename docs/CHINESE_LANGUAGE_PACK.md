# Aideo 中文外挂语言包（开发中）

本分支给 Aideo 添加了**一次性重编译后**读取外部翻译文件的能力。它不能直接给未经修改的官方 Aideo EXE 汉化。

## 安装方式

1. 使用本分支编译的 Windows 版本安装程序安装 Aideo 中文版。
2. 在该版本的安装目录（与程序资源目录对应的位置）创建 `locales` 文件夹。
3. 将本仓库的 `locales/zh-CN.json` 复制为 `locales/zh-CN.json`，保持 UTF-8 编码。
4. 打开“设置 → 外观 → 界面语言”，选择“简体中文”，点击“重新加载语言包”。

```text
Aideo 中文版安装目录/
  Aideo.exe
  locales/
    zh-CN.json
```

如果安装于 `C:\Program Files`，复制文件可能需要管理员权限。实际位置取决于 NSIS/MSI 的安装模式；Windows 安装版的资源目录仍需实机确认。

## 文件格式

JSON 顶层是简单的“英文源文案 → 中文翻译”映射：

```json
{
  "Settings": "设置",
  "Library": "音乐库",
  "Exported {count} tracks to {file}": "已将 {count} 首歌曲导出到 {file}"
}
```

占位符名称必须原样保留，例如 `{count}`、`{file}`。不要在翻译文件中插入脚本或 HTML。文件最大 2 MiB，只读取固定名称 `zh-CN.json`。

不需要提供 `en-US.json`：英文直接使用原应用的源文案。中文文件缺失时使用内置字典，字典缺少条目时回退英文；因此未完成的翻译不会使界面出现空白。

## 更新和回滚

- 更新中文翻译：替换 `zh-CN.json`，回到设置里点击“重新加载语言包”，无需重启或重新编译。
- 回滚外部翻译：退出应用，移走 `locales/zh-CN.json`；重启后会使用编译时内置的翻译。
- 语言切换：选择 English 后回到原始英文文案，不删除音乐和播放列表。

## 用 GitHub Actions 构建独立中文版（待 Windows 运行验证）

1. 将此分支代码推送到你有权限的 GitHub 仓库；不要推送到未经授权的上游仓库。
2. 在仓库 Actions 页面手动运行 **Build Aideo Chinese Edition (manual)**。
3. 工作流使用 Windows x64 + Rust MSVC 工具链，执行检查后以 `src-tauri/tauri.zh.conf.json` 构建 NSIS EXE 和 MSI。
4. 如果成功，可在该工作流的 Artifacts 下载私有运行产物 `aideo-zh-windows-x64-installers`。这不是 GitHub 正式 Release，文件没有商业代码签名。

中文版覆盖配置采用独立应用标识 `com.aideo.community.zh` 和独立 `aideozh://` 深链，关闭上游更新源，避免覆盖英文原版。但这些配置目前仅通过静态检查，尚未在 Windows 上构建或安装验证。

## 当前状态与限制

- 当前 JSON 仅有首批翻译，尚不是完整中文包。构建转换器能为多数静态 JSX 文字提供后续翻译入口，但动态模板、输入属性、通知和专用控件仍需要显式本地化。
- Rust 语言文件读取函数尚未在 Windows 实机验证；当前 Linux 环境未安装 Rust 工具链。
- **请勿用官方自动更新直接覆盖这份实验性修改版**：原作者的更新没有此语言文件加载接口。单独的中文构建配置已移除上游更新地址；实际打包前仍需在 Windows 上验证配置合并和更新行为。
- 保留原作者版权与 GPL-3.0-or-later 许可。此汉化是非官方社区改动。
