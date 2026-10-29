# Windows Code signing policy（待启用）

目前没有配置可用的公众信任代码签名身份。本项目不声称已获 SignPath Foundation 批准或资助。未签名测试包只供诊断，不能作为已通过发布门禁的正式安装包。

已由发布者确认：主体为中国个人，没有可信代码签名证书或获批服务；任何付费申请／采购均需另行批准。此信息已用于当前方案选择，无须再次询问。

## 构建模式

`.github/workflows/build-zh.yml` 仅支持人工触发，不创建公开 Release：

- `test-unsigned`：默认模式，产物名以 `UNSIGNED-TEST-ONLY` 开头，显式 `--no-sign`。
- `release-signed`：仅在受保护的 `windows-signing` environment 中构建。没有已批准的身份、有效签名、可信时间戳、完整 PE 检查、Defender 扫描或安装冒烟检查时，不上传候选包。

正式候选产物只能从 `release-verified/` 上传，名称为 `SIGNED-VERIFIED-aideo-zh-windows-x64`，含最终 EXE、SHA256SUMS、逐 PE 签名报告、扫描和安装冒烟报告。GitHub artifact ZIP 的摘要与内部 EXE 的摘要是两个不同的值。重新压缩不应修改 EXE；下载后仍应校验 SHA256SUMS 和 Authenticode。

保留汉化产品名、应用标识、协议、数据目录和关闭的更新端点。Tauri updater 的 minisign 私钥不是 Authenticode 凭证，不能代用。

## 当前可用与不可用的路线

详见 [审计报告](WINDOWS_INSTALLER_REVIEW.md)。SignPath Foundation 当前资格有明确障碍，未发起申请。Microsoft Store 的免费 MSIX 签名是另一个分发路线，不会免费签署此处的原始 NSIS EXE。没有购买或启用任何付费服务。

已准备的云签名适配是微软 Artifact Signing（原 Trusted Signing），只有用户另行批准服务和外部身份审核后才可启用。公众信任身份的地区限制必须先核实，不能仅因能创建 Azure 账号就认为有资格。中国大陆个人不在当前公布的个人 Public Trust 地区名单中。

因此该适配当前只保留为未启用接口，不是本发布者可直接采用的方案。工作流不再默认选择任何签名提供者；`release-signed` 在未配置、未批准时会停止。当前优先事项是由发布者审阅并亲自提交 [SignPath 资格核实材料](SIGNPATH_ELIGIBILITY.md)，而不是开通 Azure 付费账号。

脚本另支持已通过系统证书库／硬件密钥提供者配置的代码签名证书。该模式供已有合法证书的环境使用，不导入 PFX、不生成自签名证书、不保存私钥；不是当前 GitHub 托管 runner 的开箱即用方案。

## 用户批准外部服务后的配置

1. 先核实身份地区和法律主体资格、价格及证书 Public Trust 类型，再由用户决定是否申请。不得使用 Private Trust 测试证书冒充公众信任签名。
   以下 Azure 操作仅供未来确实具备受支持主体和批准服务的情况参考；当前中国个人不能据此取得 Public Trust 证书。
2. Azure 中配置已验证身份和 Public Trust certificate profile，保留证书真实 subject；为 Entra 工作负载配置 OIDC，并仅授予该 profile 的 Artifact Signing Certificate Profile Signer 权限。
3. OIDC subject 必须限定本仓库和 `environment:windows-signing`，避免授权其他仓库／环境；关闭不必要的其他身份入口。
4. 仓库 Settings → Environments 创建 `windows-signing`，配置实际审批人、禁止自审批和管理员绕过、限定经过审查的发布分支／标签。提交者、审查者及批准者应使用 MFA；人员名单由仓库所有者确定，当前尚未指定。
5. 在该 environment 设置以下 **variables**（这些是标识和配置，不是私钥）：
   - `WINDOWS_SIGNING_APPROVED=true`：仅在服务、主体、成本和权限均获得用户批准后设置。
   - `WINDOWS_SIGNING_PROVIDER=artifact-signing`：没有默认值；当前发布者不具备其个人 Public Trust 资格，不应设置以冒充已通过身份审核。
   - `WINDOWS_SIGNING_PUBLISHER`：实际批准证书的完整 Subject，精确匹配，不自行编造。
   - `ARTIFACT_SIGNING_ENDPOINT`、`ARTIFACT_SIGNING_ACCOUNT`、`ARTIFACT_SIGNING_PROFILE`。
   - `AZURE_SIGNING_CLIENT_ID`、`AZURE_SIGNING_TENANT_ID`、`AZURE_SIGNING_SUBSCRIPTION_ID`。
6. 工作流通过 Azure OIDC 登录，临时安装 `Microsoft.ArtifactSigning.Client` 1.0.146 和 .NET 8，调用 x64 SignTool 的 dlib 接口。私钥留在服务中，不需要客户端密码。metadata 仅含账号、profile、endpoint。
7. 审阅并批准 workflow/environment 后运行 `release-signed`。下载 **SIGNED-VERIFIED** 产物。检查报告中的实际发布者与时间戳、最终 SHA-256、签名链、扫描及安装结果；失败时先调查，不能绕过门禁或改传 unsigned 产物。

本地已有证书时可配置 `WINDOWS_SIGNING_PROVIDER=certificate-store`、`WINDOWS_SIGNING_THUMBPRINT`、`WINDOWS_SIGNING_PUBLISHER`、`WINDOWS_TIMESTAMP_URL`。SHA1 格式的 thumbprint 仅用于选择证书；文件摘要和 RFC3161 时间戳摘要始终为 SHA-256。可选 `WINDOWS_SIGNTOOL_PATH` 指定已安装的 SDK 工具。

## 签名范围与第三方文件

Tauri 2.12.1 的 `signCommand` 钩子在打包内部调用，覆盖主程序、NSIS 插件、生成的卸载器和最终安装器。配置位于独立 overlay `src-tauri/tauri.windows-signing.conf.json`，按 `tauri.zh.conf.json`、签名 overlay 的顺序合并。

`sign-windows.ps1` 保留已有有效签名，不覆盖无效／不受信任签名；先失败并调查。未签名第三方文件只有名称和官方源 SHA-256 同时匹配 `windows-signing-policy.json` 才能使用用户批准的自有身份签署。当前清单是 NSIS 3.11 的 4 个插件及 nsis_tauri_utils 0.5.3，已直接与 Tauri 官方固定下载源逐字节核对。

此第三方签名策略不能直接移植到 SignPath Foundation 证书：Foundation 禁止用其项目证书签署不属于该项目的上游二进制。未来若获得 SignPath 接受，必须先取得上游签名／明确批准并重新设计多层产物传递，不能只对外层 NSIS 提交签名。

验证器按 PE 文件头枚举所有文件，包括非 `.exe`／`.dll` 扩展名；要求主程序是 x64、主程序和卸载器存在且唯一。每个 PE 均检查 Windows Authenticode、SignTool `/pa /all /v /tw`、嵌入式 SHA-256 摘要及时间戳。主程序、卸载器和安装器必须是批准的发布者；第三方可保留原有有效发布者。

正式流程对最终安装包与解包内容分别运行 Defender 自定义扫描。`-DisableRemediation` 只防止审计扫描自动处置文件，不关闭实时防护。扫描不可用或失败时阻止发布。

安装／启动冒烟检查只允许在一次性 GitHub runner 上执行；普通用户工作站会被脚本拒绝。检查实际安装后的主程序和卸载器签名，并观察进程启动 15 秒。它不代表 Windows 11 SAC、互联网下载信誉、交互播放功能或所有安全策略已通过。

## 验证边界

- Authenticode 有效说明签名与 Windows 信任验证通过，不保证 SmartScreen 已有信誉。
- SAC 判定涉及所有执行／加载的代码，不能只签外层安装器。
- Defender 本次无检测不证明永远无恶意代码或今后定义库也无检测。
- 安装后按需下载的 yt-dlp、FFmpeg 及其运行时加载库不在 NSIS 签名范围。此次已发现 yt-dlp 的 `_wrapper.pyd` 曾被 SAC 拦截；需单独处理上游签名和分发，不应宣称整个播放器已全面兼容 SAC。
- 企业 App Control／AppLocker 可以实施更严格策略。

不要关闭安全保护、导入自签名根、修改系统执行策略或伪造发布者。若有 Defender/PUA 检测，先核对样本哈希和检测名，调查后才考虑 [微软官方样本申诉](https://www.microsoft.com/en-us/wdsi/filesubmission)。

官方参考：[Tauri Windows 签名](https://v2.tauri.app/distribute/sign/windows/)、[Artifact Signing 集成](https://learn.microsoft.com/en-us/azure/artifact-signing/how-to-signing-integrations)、[SignPath 条款](https://signpath.org/terms.html)、[SignPath GitHub 集成](https://docs.signpath.io/trusted-build-systems/github)。
