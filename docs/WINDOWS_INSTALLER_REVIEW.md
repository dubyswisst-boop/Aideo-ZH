# Windows 安装包拦截根因与整改审计

审计日期：2026-10-29，Asia/Shanghai。结论：**实际 SAC 拦截根因已确认；本地流程整改和负向验证已完成，但没有生成可信签名的新安装包，发布目标尚未验收。**

发布者已明确补充：个人、中国、没有可信证书或获批服务；任何付费操作需另行批准。继续保留全部本地修改，不提交、不推送、不发布。

## 基线与保护

分支 `fix/full-chinese-localization`，HEAD `ef2c3d11648d662990b0df859c09f5504ad04276`。开始时 `git status --short` 为空，之前的 6 个汉化修改文件已由用户提交到 ef2c3d1；没有遗留未提交修改需要覆盖。未修改这些文件、播放器功能、词典、原始或中文产品配置、应用标识、数据目录、更新端点、package.json 或锁文件。

远端为 `https://github.com/dubyswisst-boop/Aideo-ZH.git`。本地只有 `build-zh.yml` 工作流；上游 `publish.yml` 从 GitHub 只读取得，文件 SHA 为 `eb8e23f700e24910a2cee63d37fff09c6e79b4c4`。上游使用 `TAURI_SIGNING_PRIVATE_KEY`／PASSWORD，但没有 Windows Authenticode 配置；实际包也没有 Authenticode 签名，不能把 `.sig` 当 Windows 签名。

### 对上游 .exe.sig 的进一步实证

已下载 0.9.12 的 `Aideo_0.9.12_x64-setup.exe.sig` 和 `latest.json`。436 字节的 .sig 文件是 Base64 编码的 minisign 文本，解码后说明为 `signature from tauri secret key`，签名记录算法标识为 `ED`（Ed25519 + BLAKE2b-512）。使用上游 tauri.conf.json 的 updater 公钥，实际验证得到：key ID 一致、安装器签名有效、trusted comment 签名有效、latest.json 的对应 NSIS signature 与 .sig 内容完全一致。上游配置本轮在线读取 SHA 为 `4a294c943ba73987c7770c6f5ef623d04fc67ee4`，公钥与本地原配置一致。

这是有效的 Tauri 更新真实性签名；同一 EXE 再次接受 Windows 检查仍为 NotSigned。trusted comment 内的文本 timestamp 由 updater 密钥签名，既不是 Authenticode 签名，也不是 RFC3161 可信时间戳或受信发布者证书。

可复现命令：`node temp/signing-audit/inspect-upstream-signature.mjs`，退出 0；详细结果已并入 windows-signing-evidence.json。该检查没有生成密钥、恢复 updater 或更改播放器配置。[Tauri 官方更新签名说明](https://v2.tauri.app/plugin/updater/#signing-updates)。

已核实中文配置：productName=`Aideo 中文版`，identifier=`com.aideo.community.zh`，updater.endpoints=[]，createUpdaterArtifacts=false。均保留。

本地 Tauri CLI/API 2.12.1；Cargo.lock tauri 2.12.1、tauri-build 2.7.1；Node 24.22.1。npm 10.9.4 仍使用之前工作区临时工具。Rust/Cargo、系统 npm、NSIS、7-Zip 不在 PATH；Windows SDK x64 SignTool 已安装，版本路径 `C:/Program Files (x86)/Windows Kits/10/bin/10.0.26100.0/x64/signtool.exe`。

仅下载并解包审计工具到 `temp/signing-audit`，没有安装全局工具链。使用官方 7-Zip 26.05 在工作区解包，不运行其安装程序；另使用官方 actionlint Windows 工具检查 YAML。

## 实际拦截证据

本机 CodeIntegrity Operational 日志 2026-10-29 06:29、06:31、06:46（北京时间）有多次事件 3077/3033，明确阻止：

`\Device\HarddiskVolume7\Un-setup\aideo-zh-windows-x64-installers\nsis\Aideo 中文版_0.9.12_x64-setup.exe`

最新 3077 的字段：

- PolicyName：`VerifiedAndReputableDesktop`。
- PolicyGUID：`{0283ac0f-fff1-49ae-ada1-8a933130cad6}`。
- Status：`0xc0e90002`。
- Requested Signing Level=2，Validated Signing Level=1。
- SHA256 Flat Hash：`997F2CC9D0B663ED6FC4816E7F0DA689EB1B31F9961E225E0C0B95A243C2B497`。
- 注册表只读查询 `VerifiedAndReputablePolicyState=1`，即 SAC 已开启。

该平面哈希与下载的最新 Actions 安装包 SHA-256 完全相同，建立了日志到具体样本的直接关联，不只是同文件名推测。结论为 **Smart App Control／Windows Code Integrity 的签名／信誉要求未满足，且样本确实未签名**。

| 机制 | 此次判断 |
| --- | --- |
| SmartScreen 信誉 | 未获得本次 SmartScreen 提示证据；信誉未知，不能替代 SAC 结论 |
| Smart App Control | 已确认实际阻止当前安装包；未签名、未满足策略要求 |
| Defender Malware / PUA | 查看的记录无 Aideo 匹配；样本与 payload 自定义扫描未报告威胁，不表示永远安全 |
| Authenticode | 当前、历史及上游安装包均 NotSigned，无发布者、无时间戳 |
| 企业策略／安装器错误 | 已见内置 VerifiedAndReputableDesktop 策略；未取得其他策略或安装器自身错误的证据 |

事件日志查询范围为最近 14 天、最多 2000 条；不是对所有历史日志无界扫描。CiTool 列举策略返回 Access denied，即使沙箱外调用也没有管理员权限，没有修改策略或提权绕过。完整原始事件含本机元数据，留在被 Git 忽略的 `temp/signing-audit/codeintegrity-events.json`，只将必要字段写入可提交证据文件。

另有 2026-10-28 的 3077：上游 Aideo 目录下的 `yt-dlp.exe` 加载其临时解包的 `curl_cffi/_wrapper.pyd` 被同一策略拒绝。本机该 yt-dlp.exe 为 NotSigned。这是独立的运行时第三方代码限制，未被 NSIS 包签名修复；此次没有改动播放器下载行为。

## 实际构建产物与签名对比

复用现有成功构建，无需为了审计重建相同二进制。下载 ZIP 均核对 GitHub artifact digest：

| 样本 | 来源 | EXE SHA-256 | Authenticode |
| --- | --- | --- | --- |
| 当前汉化版 | run 40777209424、artifact 12854759352，HEAD ef2c3d1 | `997f2cc9d0b663ed6fc4816e7f0da689eb1b31f9961e225e0c0b95a243c2b497` | NotSigned |
| 历史汉化版 | run 40250786928、artifact 12620858568，2358e04 | `561806743b9fd0a3e85a33fdb70bb22f42fc8c47a7f9bdde089bffe8dd174328` | NotSigned |
| 上游 0.9.12 | 官方 Release Aideo_0.9.12_x64-setup.exe | `e8ffa3aec16f62f7dfddbc517cec93349e1ad58c9297657f76ba481360f2fbc5` | NotSigned |
| 整改后正式签名包 | 尚不存在 | 不适用，不能编造 | 未生成／未验证 |

ZIP 摘要分别为当前 `b2be1f441710dd8f00c7fd4ab161bb068bbf02bdb85ecd1d1c428e57cce2f876`、历史 `156257a53ceb18a9b15c2f650f356304d03334a598ccbd04c4e505a0c8155158`。它们不是 EXE 摘要。

当前包路径：`D:/Aideo-ZH/temp/signing-audit/current/nsis/Aideo 中文版_0.9.12_x64-setup.exe`，8338035 字节。它仍是未签名诊断样本，不是整改后的正式安装包。

当前包包含 7 个 payload PE：aideo.exe、uninstall.exe、nsDialogs.dll、nsis_tauri_utils.dll、NSISdl.dll、StartMenu.dll、System.dll，全部 NotSigned。连同外层安装器共 8 个 PE。历史、上游包也各有相同 7 类 payload PE，均未签名。

当前主程序 SHA-256：`fbbe8b1bc42c3252ba5a2f87dcae61583c68dd96388f417e1d1af836e11196cf`；卸载器 `1b65d3c88dbe7787b1d2cf93c158db4219827565dbb8f1cfc90b12c71a57a385`。完整逐 PE 表见 [机器可读证据](windows-signing-evidence.json)；各文件均无签名发布者、有效期、摘要签名或时间戳可供验证。

实际运行 Get-AuthenticodeSignature 和 `signtool verify /pa /all /v`：当前安装器为 NotSigned，SignTool 退出 1，No signature found。新验证器使用更严格的 `/pa /all /v /tw`，同样拒绝当前包全部 8 个 PE。正向对照是本机 Microsoft 签名的 SDK SignTool：Valid、SHA-256、Microsoft 时间戳、SignTool 退出 0；未使用自签名根。

## 免费路线与资格判断

优先阅读 [SignPath Foundation 官方条款](https://signpath.org/terms.html) 和 [GitHub 集成](https://docs.signpath.io/trusted-build-systems/github)。结论是 **当前不能按符合资格的项目启用 Foundation 签名**，最终接受权仍在 Foundation，不代表已经提交申请并收到拒绝。

| 条件 | 当前证据 |
| --- | --- |
| 公开 OSS 项目 | 公开仓库，主许可证 GPL-3.0-or-later；未完成所有组件许可证／无专有组件的完整合规审计 |
| 持续维护 | 有近期维护提交，但仓库创建于 2026-10-25，尚不能证明长期声誉 |
| 已发布、文档 | 有可下载的成功 Actions 产物和 README、PRIVACY.md；汉化仓库公开 Releases 查询为空，是否满足 released 条款需 Foundation 审核 |
| 衍生项目 | GitHub fork=false，parent=null；这是可验证关系的证据缺口，不能仅凭 false 就认定自动失格。条款要求 visibly uses a fork，GitHub fork 功能只是示例；本地尚无已验证的上游通常签名发布分支继承证据 |
| 上游已发布签名版本 | 上游 .exe.sig 是验证有效的 Tauri 更新签名，EXE 则没有 Authenticode；不能用它证明上游已经发布 Windows 代码签名版本。该事实是否满足 Foundation 对 signed builds 的条款解释仍需其正式确认 |
| 审批和账户 | 未配置 SignPath organization、GitHub App、artifact configuration、生产 policy、审批角色、MFA 证明或签名令牌 |
| 第三方二进制 | Foundation 不允许用本项目证书随意签上游插件；必须先解决原项目签名和多层打包问题 |

没有更改 fork 关系、所有权或历史，也未联系外部人员／提交申请。今后符合资格时，当前官方集成为先 upload artifact，再 `signpath/github-action-submit-signing-request@v3` 以 artifact-id 提交，等待人工批准并下载到独立 signed 目录；只能验证并分发服务返回的签名产物。不能仅给已经装入 unsigned 主程序／卸载器的外层 NSIS 签名，更不能复用本次第三方签名清单冒充 Foundation 许可。

其他正规方案：

- **Microsoft Store/MSIX**：微软官方说明提供免费 MSIX 签名和托管，个人和公司注册已取消费用（仍需身份、地区及商店审核）。这不会给 GitHub 下载的原始 NSIS EXE 免费签名；调整分发形式需另行决定，不擅改应用标识或更新方式。[官方个人注册说明](https://blogs.windows.com/windowsdeveloper/2025/09/10/free-developer-registration-for-individual-developers-on-microsoft-store/)、[公司说明](https://blogs.windows.com/windowsdeveloper/2026/05/07/publish-to-microsoft-store-as-a-company-now-with-free-registration-and-faster-onboarding/)。
- **Azure Artifact Signing**：为保留 NSIS 的 CI 正规方案准备适配，但尚未获批准或配置。官方当前 Public Trust 仅支持列出的国家／地区组织，个人仅美国／加拿大；不能假定中国大陆个人可申请。服务起价约 US$9.99/月，币种、税费、区域和实时计价需申请时核实；未购买。[资格](https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart)、[微软分发说明](https://learn.microsoft.com/windows/apps/package-and-deploy/smartscreen-reputation)。
- **传统 OV + HSM/token／合法云托管**：可以保留 NSIS，但需要实际法律主体审核、受保护私钥和 CI 可用的硬件／服务；DigiCert 官方示例 token 方案列价 US$54/月/证书，非本项目报价，不含所有可能的附加成本。已有合规证书可使用本次 certificate-store 接口；未采购。[官方比较](https://www.digicert.com/signing/compare-code-signing-certificates)。

当前免费原始 NSIS 签名没有已可使用的服务，不等于所有免费分发方案都不可能。也没有因免费服务尚不可用就擅自订阅付费服务。

针对已确认的中国个人主体：Azure Public Trust 个人验证当前仅限美国／加拿大，排除为本人的直接申请路线；已移除工作流中的默认 provider，不能靠更换 endpoint、使用 VPN、Private Trust 或虚假身份解决。传统 OV 需要组织主体，不是无组织个人的直接方案。个人付费候选应改查合法 IV 或个人／独资 EV 及 HSM／云签名，例如 [SSL.com 官方 IV 产品](https://www.ssl.com/products/software-integrity/code-signing/iv/) 当前列出个人验证和 US$129/年起的证书价格，但云签名订阅／硬件额外计费，中国证件接受范围、地区和最终审批尚未确认。这里只记录合规候选，未联系厂商、未购买。

SignPath 待人工确认的具体条款和申请材料已整理在 [资格核实包](SIGNPATH_ELIGIBILITY.md)。fork=false 不是孤立的一票否决结论；整个项目当前是“未获批准、尚未证明符合条件”，不是“已被 Foundation 拒绝”。

## 本地整改文件

| 文件 | 修改目的 |
| --- | --- |
| `.github/workflows/build-zh.yml` | 分离 unsigned 测试与受保护 signed 路径、OIDC 云签名适配、原生检查失败即停、完整 PE/Defender/安装门禁，仅上传验证后的目录 |
| `README.md` | 链接真实签名政策和审计报告，避免将测试包描述为正式签名包 |
| `src-tauri/tauri.windows-signing.conf.json` | 独立的 Tauri 签名 overlay，不改中文产品和更新配置 |
| `scripts/WindowsSigning.psm1` | PE 文件识别、SHA-256 签名摘要解析、Windows 信任和时间戳验证、凭证配置检查 |
| `scripts/sign-windows.ps1` | Tauri 签名钩子，保留有效已有签名、拒绝未审查文件、签名后立即验证 |
| `scripts/windows-signing-policy.json` | 对允许处理的 unsigned 第三方插件固定官方源和 SHA-256 |
| `scripts/verify-windows-release.ps1` | 对安装器和每个 payload PE 失败关闭；验证自有发布者和 x64 主程序，输出逐文件证据 |
| `scripts/scan-windows-release.ps1` | 实际 Defender 自定义扫描，失败／不可用则阻止正式上传 |
| `scripts/test-windows-install.ps1` | 仅一次性 runner 的安装与 15 秒进程启动检查，验证实际安装后的签名 |
| `src/test/windowsSigning.test.ts` | 拒绝缺少配置、无效输入、真实未签名包、用户工作站安装，并检查产物上传边界 |
| `docs/WINDOWS_SIGNING.md` | 真实签名状态、审批要求、配置变量、运行手册和验证边界 |
| `docs/windows-signing-evidence.json` | 无凭证的实际样本与日志证据 |
| `docs/SIGNPATH_ELIGIBILITY.md` | 面向真实中国个人发布者的资格核实材料、证据和需本人完成的申请步骤 |
| 本报告 | 根因、改变、验证、限制与尚缺外部步骤 |

## 实际执行与结果

以下 npm 使用实际路径 `node temp/localization-tools/package/bin/npm-cli.js` 调用：

| 检查／命令 | 实际结果 | 退出码 |
| --- | --- | --- |
| git status / branch / log / remote | 初始干净；分支和远端正确 | 0 |
| node …npm-cli.js run lint | TypeScript 类型检查通过 | 0 |
| node …npm-cli.js test | 发布者信息修正后最终 149 文件、1441 测试全部通过；日志 frontend-tests-publisher-update.log | 0 |
| node …npm-cli.js run build | tsc && vite 生产构建成功；存在包体大小／动态导入提示 | 0 |
| node node_modules/vitest/vitest.mjs run src/test/windowsSigning.test.ts src/test/chineseBuildConfig.test.ts | 最终集中验证 2 文件、10 测试通过 | 0 |
| actionlint.exe .github/workflows/build-zh.yml | 工作流语法／表达式检查通过 | 0 |
| PowerShell Parser 对 5 个 .ps1/.psm1 | 语法通过 | 0 |
| sign-windows.ps1 -CheckConfiguration | 缺少 provider 正确拒绝，无 unsigned fallback | 非 0，预期 |
| verify-windows-release.ps1 对当前实物包 | 8 PE 均 NotSigned，生成报告后正确拒绝 | 1，预期 |
| SignTool 对 SDK 自身的正向对照 | Valid、SHA-256、可信时间戳、证书链验证通过 | 0 |
| Defender 对当前 NSIS | signatures 1.463.16.0，实际输出 found no threats | 0 |
| Defender 对当前 payload | 实际输出 found no threats | 0 |
| 5 个 NSIS DLL 与官方固定下载源 | 名称、SHA-256 全部匹配 | 0 |
| node node_modules/@tauri-apps/cli/tauri.js build --config src-tauri/tauri.zh.conf.json --bundles nsis --target x86_64-pc-windows-msvc --ci | cargo metadata: program not found | 1，环境缺少 Cargo |
| Rust check/test | 本机无 Cargo/rustc，未运行 | 不适用 |
| 整改后可信签名、时间戳、正式包 SHA-256 | 无签名服务身份和凭证，未生成；不能称已通过 | 不适用 |
| 实际安装与启动 | 没有可用 Windows Sandbox／干净本地测试环境，未在用户系统安装；新 CI 冒烟步骤尚未运行 | 不适用 |
| git diff --check | 通过 | 0 |

旧成功 run 40777209424 的日志证明原生检查和构建当时通过：Rust 1.99.1，451 个原生测试通过、5 个忽略，生成 x64 NSIS。这只是旧 HEAD 的历史证据，不是此次修改后的原生验证。

回归测试先运行过红灯，确认新增配置、脚本和上传保护缺失会失败，随后实现并转绿。沙箱内读取安全日志被拒绝后经授权只读重试；没有修改防护策略。未把无凭证的签名调用或未执行安装报告为成功。

完整本地证据在 `temp/signing-audit/`；完整差异将在同目录 `changes.diff` 保存。没有提交、推送、创建 Release、改变 Git 历史、购买服务或联系任何外部人员。

## 尚未完成的外部步骤与验收限制

1. 用户选择可申请的正规签名路线。若希望继续 Foundation 免费路线，先解决上游 signed builds／可验证来源和维护文档条件，再由所有者向 Foundation 说明当前衍生项目关系，接受其审核；不得伪造 fork。
2. 对本人当前中国个人身份，Azure Public Trust 已确认不可直接申请，无须重复提供地区信息。如果 Foundation 未接受当前项目，保留 NSIS 的下一步是核实面向中国个人的正规 IV／个人 EV 服务资格、实际总价及 CI 签名能力；本人批准前不采购。Store/MSIX 是另一条免费分发路线，需要另行决定，不自动修改产品形态。
3. 配置 `windows-signing` environment 审批人和限制、变量，实际运行 signed 构建；这需要先由用户批准本地 diff 并提交／推送，此次没有代执行。
4. 必须取得新的实际安装器、主程序、卸载器、插件签名报告、最终 EXE 哈希、扫描和安装结果，再判断发布候选是否合格。
5. 在开启 SAC 的干净 Windows 11 上重新下载、安装、启动和测试按需插件；单独核查 `_wrapper.pyd` 等未来运行时组件。当前未获得 SAC 放行或 SmartScreen 信誉结论。

签名有效、SmartScreen 信誉、SAC 放行、Defender 未检测到威胁是四项独立结论。微软也明确有效签名不保证新文件没有 SmartScreen 提示；企业策略还可能施加额外限制。[微软官方信誉说明](https://learn.microsoft.com/windows/apps/package-and-deploy/smartscreen-reputation)、[SAC 开发者说明](https://learn.microsoft.com/en-us/windows/apps/develop/smart-app-control/overview)。
