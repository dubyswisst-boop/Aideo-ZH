# V8：修复 PowerShell 5.1 中文词典大小写键冲突（2026-10-29）

V7 已通过源码匹配步骤，但在汉化词典更新时遇到 `Playlists` 与 `PLAYLISTS`。Windows PowerShell 5.1 的 `ConvertFrom-Json` 不允许仅大小写不同的键并存。本版对词典采用**按区分大小写的 JSON 键逐条定位、修改或追加**，不再把整个词典加载为 PowerShell 对象，也不合并、删除已有翻译；保留原词典中的两个合法键。另确保 Last.fm API 的 9 处密钥检查具备重复运行保护。

**验证边界：** 包结构、JSON 补丁计划与启动脚本编码已检查；目标分支词典包含不同大小写的两个键，适用此修复；尚未在你的 Windows PowerShell 5.1 与本地仓库运行整套预检或构建。

# V7：精确修复影院显示层提示的两处相同锚点（2026-10-29）

V6 预检失败，原因是完整文案 `detail: { message: `Theater HUD: ${THEATER_HUD_NAMES[nextHud]}`, type: 'info' }` 在 `FullscreenView.tsx` 出现 **2 次**，分别对应键盘 H 快捷键和界面按钮操作。V7 不会随意选其中一处，而是明确要求两个旧文案都存在、两个新文案都不存在，随后**同时汉化两处**。再次运行可识别为已替换；如出现新旧混合或数量异常，安全停止。

此外，已对照 GitHub 目标分支检查 11 个受影响源码文件中的主要锚点：Last.fm 客户端旧调用正好 6 处、两处影院 HUD 提示，以及剩余普通单点锚点；歌词与迷你模式的区域限定锚点分别为 1 处，11 个播放事件区域也各有一个目标保护语句。但由于无法直接执行用户 Windows 本地 PowerShell 5.1 仓库全量预检及编译，**这不是实机成功保证**。V7 仍保留不写入预检和输入 Y 才应用的保护机制。

---

# V6：修复 FullscreenView 提示与启动快捷键锚点（2026-10-29）

V5 预检在“汉化影院显示层切换提示”失败：预期 `THEATER_HUD_NAMES[next]`，而实际项目 `FullscreenView.tsx` 使用 `THEATER_HUD_NAMES[nextHud]`。V6 已在 PowerShell 方案 `patch-ops.json` 与备用 JavaScript `apply.mjs` 中统一修正为 `nextHud`。

同时对照 GitHub `dubyswisst-boop/Aideo-ZH` 的 `fix/full-chinese-localization` 分支，发现另一处必然失败的锚点：`src/App.tsx` 中快捷键初始化的原注释是 `works when app is minimized`，不是原补丁预期的 `works when app is minimized in the system tray`。V6 一并修复，避免下一轮预检再次卡住。

**使用方法：** 将此 ZIP 的全部内容解压到 `D:\Aideo-ZH` 并覆盖原文件；双击 `APPLY_FEATURE_PATCH.cmd`。无须安装 Node.js。预检通过后，仍需选择 Y 才会修改源码，且写入前备份。旧版本失败日志均显示预检阶段未改动源码，因此无需回滚。

**验证范围：** 已按公开 GitHub 分支的相应源码核实上述两处锚点、已通过 `node --check` 验证备用脚本语法、JSON 与 ZIP 完整性检查；未在你的本机 Windows PowerShell 5.1 与完整源码上执行预检、编译或七项功能实测。其他本机源码差异仍可能导致安全预检停止；请勿跳过预检。

---

# V5 修复：Last.fm 6 处客户端匹配（2026-10-29）

V4 预检失败 `Last.fm 使用共享网络客户端 expected 1 anchor, found 6`：这是补丁规则将实际 6 处 `let client = Client::new();` 误设为只能匹配 1 处。V5 现要求准确识别 6 处并一次性替换；发现数量不符或新旧混杂时安全终止。`apply.mjs` 也同步修复，避免另一路执行再次触发相同错误。

**使用 V5 时不需要安装 Node.js**：将 ZIP 全部解压到 `D:\Aideo-ZH`，至少确认覆盖了 `tools\aideo-feature-patch\apply.ps1`、`patch-ops.json` 和 `APPLY_FEATURE_PATCH.cmd`，然后双击 CMD。原有的 UTF-8 BOM 保留，以兼容 Windows PowerShell 5.1。

V4 失败发生在预检阶段，原有仓库源码没有被写入。V5 的匹配规则已做独立核对；因为当前没有用户实际 Windows 仓库的文件副本和 PowerShell 5.1，**不能据此承诺整个预检一定通过，也不能保证 Windows 编译成功**。如再遇到其他失败，提供具体锚点即可定位。不要手工绕过预检。

---

# V4：修复 Windows PowerShell 5.1 中文编码兼容问题（2026-10-29）

V3 失败根因：`apply.ps1` 原来未携带 UTF-8 BOM。Windows PowerShell 5.1 在部分中文 Windows 系统上会按系统 ANSI 代码页解码 `.ps1`，造成脚本中中文文本乱码与引号解析出错，继而连续报出 `&&`、`${{ ... }}` 等误导性语法异常。**V4 已改为 UTF-8 with BOM**；无需 Node.js。

如果终端仍然报出与之前相同的 ParserError，请先确认已将 V4 解压覆盖到 `D:\Aideo-ZH\tools\aideo-feature-patch\apply.ps1`，不要只解压 CMD。可在 PowerShell 中执行：`Format-Hex -Path D:\Aideo-ZH\tools\aideo-feature-patch\apply.ps1 | Select-Object -First 2`，文件前 3 个字节应为 `EF BB BF`。


本版本改用 **Windows 自带的 PowerShell 5.1** 执行补丁预检与应用，**不要求你在 Windows 上安装 Node.js、npm 或 Rust**；这些开发工具仍由 GitHub Actions 的 Windows runner 在构建时安装。

操作：将本 ZIP 的全部内容解压到 `D:\Aideo-ZH` 仓库根目录，覆盖旧的 `APPLY_FEATURE_PATCH.cmd`，然后双击该 CMD。它先运行 PowerShell 预检（不改源码），成功后要求你输入 Y 才应用，且会把受影响源码备份到仓库**外部**的同级目录 `Aideo-ZH-source-backup-日期时间`。不要单独双击 `apply.mjs`，它是 V2 的旧脚本。

如果预检提示 `expected 1 anchor` / `start anchor missing`，表示本地文件与补丁依据的 GitHub 分支不同。**不要强行执行或覆盖**，把具体失败内容发回以生成兼容补丁。

本 ZIP 只解决“本机找不到 node.exe 无法启动补丁”的问题；不代表功能补丁已经在 Windows、Rust 或真实网络上验证通过。确认 GitHub Actions 在你的签名整改分支下构建通过之前，不应公开发布。

---

# Aideo 中文版功能补丁包

目标仓库：`dubyswisst-boop/Aideo-ZH`  
目标分支：`fix/full-chinese-localization`

本 ZIP 不包含整个项目，而是包含一个**本地可审阅的补丁应用器**和新增文件。它会对现有仓库的源码做锚点检查后再统一写入，避免盲目覆盖整个文件。

## 使用步骤（V4 请直接双击 CMD，无需执行下面的 Node 命令）

1. 先备份 `D:\Aideo-ZH`，并在 GitHub Desktop 查看当前分支和未提交修改。
2. 将 ZIP 内容解压到 `D:\Aideo-ZH` 根目录，选择合并文件夹；不要把补丁包里的 `src` 文件夹解压成 `D:\Aideo-ZH\Aideo-ZH-Feature-Patch\src` 后直接运行。
3. 直接双击 `D:\Aideo-ZH\APPLY_FEATURE_PATCH.cmd`。程序会先检查锚点与预备修改，**不写入任何仓库源码**。
4. 预检成功后，在 CMD 中按 `Y` 才会应用，并在仓库外建立源文件备份。

5. 在 GitHub Desktop 审阅 `Changes`，确认没有丢失你现有的签名、工作流或其他修改后，再提交并推送。
6. 在 GitHub Actions 运行已有的中文版构建工作流。构建后先测试，不要直接发布。

如果预检失败，脚本会停止且不会写入任何文件。请把错误原文发回，不要强行替换锚点。

## 本补丁包含的整改

- 前端自动歌词搜索将曲名、歌手、专辑、时长分开传给 Rust 搜索命令，避免后端把“歌手 曲名”误当成一个整体曲名。
- 在线歌词各源搜索超时从 3.5 秒提升到 12 秒。
- BiniLyrics 只有在实际歌词内容下载成功后才显示为可选结果，减少“能搜到但下载失败”的假匹配。
- Last.fm 使用项目共享 HTTP 客户端，并对 HTTP 状态与缺失 API 凭据给出更明确的错误。
- 透明无边框窗口控件、外观变量驱动的按钮颜色、左边缘热区自动显示侧边栏。
- 新增系统级影院锁定快捷键，默认 `Ctrl+Alt+F12`，可在“设置 → 快捷键 → 全局快捷键”重新录制。
- 影院锁定时窗口请求置于底层并启用鼠标穿透；如果锁定前 Aideo 正在前台，Windows 会尝试把焦点交给桌面，避免键盘继续操作播放器。锁定期间也会忽略 Aideo 自身的键盘输入和媒体控制快捷键。相同快捷键解除锁定。
- 新增回归测试与中文文案。

## Last.fm 必需配置

上游代码当前的 Last.fm API key/secret 默认是占位值，不能仅靠改网络超时就让 Last.fm 正常连接。补丁会在 `build-zh.yml` 的 Tauri 构建步骤中传递：

- `LASTFM_API_KEY`
- `LASTFM_API_SECRET`

请在 GitHub 仓库 `Settings → Secrets and variables → Actions → New repository secret` 配置有效的 Last.fm API 凭据，然后重新构建。不要把凭据写入源码、公开 issue 或聊天中。

重要：客户端程序里使用的 Last.fm API secret 最终可能被从二进制中提取。不要把它当作真正保密的服务端密钥，也不要复用其他服务的私密凭据。若不配置，Last.fm 功能会明确报出缺失配置，而不是表现成普通网络故障。

## 签名与 Windows 安全提示

补丁不会删除签名、替换证书、修改 Tauri updater 公钥，也不会把未签名包冒充已签名包。它只向构建步骤添加 Last.fm 环境变量。

**无法保证 Windows Defender、SmartScreen 或 Smart App Control 一定放行。** 当前公开分支的 `build-zh.yml` 与你本地尚未提交的签名整改可能不同。运行 Actions 前必须确认 GitHub 上实际使用的 workflow 是你批准的签名流程；若工作流仍然生成 unsigned EXE，该产物不应当作为正式发布包。

Authenticode 签名、Tauri updater/minisign 签名、SmartScreen 信誉和 Smart App Control 是不同机制。修改后的 EXE 需要重新签名和验证；旧二进制的签名不会自动延续到新构建。

## 验证命令

```powershell
npm run check:locales
npx tsc --noEmit
npm test
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
```

需要在 Windows 真机上手工验证：

1. 歌词自动搜索是否按歌手/曲名匹配，选择结果后是否能实际保存歌词。
2. Last.fm API 凭据已配置时能否正常获取 token、会话及用户信息。
3. 标题栏最小化、最大化、关闭和拖动窗口。
4. 鼠标移至最左侧热区时侧边栏显示，移出后收起。
5. 进入影院全屏后按 `Ctrl+Alt+F12` 锁定，再按同一组合键解锁；锁定期间桌面点击应穿透到后方应用。

影院底层和焦点行为依赖 Windows/Tauri 的窗口管理，必须实际测试。若 Windows 全屏模式仍强制窗口置顶，不能声称此项已完全实现。

## 回滚

先不要清理任何文件。若需要回滚，可在 GitHub Desktop 中逐文件撤销本补丁产生的改动，删除新增的：

- `src/components/WindowChrome.tsx`
- `src/test/featurePatchRegression.test.ts`
- `tools/aideo-feature-patch/`

不要使用 `git reset --hard` 或 `git clean -fd`，以免丢失其他工作。

## 启动器更新（v2：修复 Windows 找不到 Node.js）

如果首次运行出现 `'node' 不是内部或外部命令`，这是电脑没有把 Node.js 加入 PATH，并不是汉化包已写入失败。v2 的 `APPLY_FEATURE_PATCH.cmd` 会自动检查：系统 PATH、常见安装位置、仓库中的 `temp/` 和 `tools/` 便携版本。

若仍找不到，它会提示手动输入现有 `node.exe` 的完整路径（可在文件资源管理器里找到并复制）。也可以从 <https://nodejs.org/en/download> 安装 Node.js 22 或更高版本后重新打开命令窗口再试。启动器**不会自动下载安装软件，也不会关闭 Windows 安全功能**。

验证 Node 是否可执行：在新打开的 CMD 中运行 `node --version`。如果系统命令仍找不到，但已知完整路径，可直接在启动器提示框输入该路径。

**无需重新执行原来已经提交或正在审核的签名改动。** 这个 v2 主要修复补丁启动器，不会触发 Git 操作。
