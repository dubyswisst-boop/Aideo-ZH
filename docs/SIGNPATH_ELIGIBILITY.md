# SignPath Foundation 资格核实材料（尚未提交）

日期：2026-10-29。用途：供仓库所有者审阅后亲自提交资格咨询／申请。未发送任何外部消息，没有创建账号、申请证书或改变仓库关系。

## 已确认事实

- 申请维护者为中国个人，没有可信代码签名证书或获批签名服务。未批准任何付费购买。
- 汉化项目：https://github.com/dubyswisst-boop/Aideo-ZH，公开仓库；GitHub API 再次读取 `fork=false`、`parent=null`。
- 上游：https://github.com/Alirull18/Aideo-Music-Player。
- 许可证：项目声明 GPL-3.0-or-later；源 LICENSE 为 GPLv3，完整依赖和第三方许可审查尚未完成。
- 已有汉化维护提交、README、PRIVACY.md、中文化说明，以及构建成功的 Windows x64 NSIS Actions artifact；汉化仓库公开 Releases 查询为空。工作流尚未产生任何可信签名候选。
- 最新上游 0.9.12 EXE 为 Windows Authenticode NotSigned。其 `.exe.sig` 是密码学验证有效的 Tauri/minisign 更新签名，不能混同 Windows 发布者证书。
- 当前安装包、主程序、卸载器和 5 个 NSIS DLL 均未签名。SAC 实际拦截的哈希已与 Actions 产物关联。
- 发布者未声明长期维护年限、未提供所有者真实姓名／MFA／审批团队名单；不得代填或编造。

## 条款判断

[官方条款](https://signpath.org/terms.html)要求 modified upstream 项目具备上游 signed builds、明显的衍生关系、基于上游通常签名分支的发布分支，以及审查等义务。GitHub fork 功能是条款举例，并未把 REST 字段 fork=true 写成唯一实现方式。因此：

1. 不能说 fork=false 本身必然导致拒绝；应披露该事实，询问是否接受现有导入式仓库的其他可验证来源证据。
2. 当前没有证据证明汉化发布分支继承了上游通常做 Windows 代码签名的发布分支。不能擅自重建仓库、重写历史或改变 fork／所有权来伪造满足条件。
3. 上游只验证到 updater/minisign 签名，没有 Authenticode。不得代替 Foundation 决定其 signed builds 条款是否接受这种情况，也不得把 minisign 包装成 Windows 签名。
4. Foundation 规定项目证书不能随意签署其他项目的二进制。它允许包内保留未签名上游 DLL，但这不保证 SAC 可加载这些 DLL。现有普通证书的第三方 hash 白名单签名接口不能直接用于 Foundation 身份。
5. 公开源代码是必要证据之一，不自动证明持续维护、已有发布、可验证声誉、隐私条款、许可证完整性或安全审查均合格。

**目前结论：有证据缺口和可能的资格障碍，不能启用生产签名；未向 Foundation 申请，未收到正式批准或拒绝。**

## 可由本人提交的事实说明与问题

官方入口：https://signpath.org/apply.html。仅由本人选择是否提交；不要把私钥、口令、GitHub token 或身份证件贴入公开 Issue。

可使用以下说明并补充真实维护者资料：

> Aideo-ZH is a GPL-3.0-or-later Chinese localization derivative of Aideo Music Player. Our public repository is https://github.com/dubyswisst-boop/Aideo-ZH and the upstream is https://github.com/Alirull18/Aideo-Music-Player. The maintainer is an individual in China. The repository was imported and GitHub currently reports fork=false and parent=null. We are disclosing this relationship rather than changing it to imply verified upstream ancestry.
>
> The upstream v0.9.12 Windows installer has no Authenticode signature. Its detached .exe.sig is a valid Tauri/minisign updater signature, verified with the upstream updater public key; it is not a Windows code-signing certificate signature. Our NSIS installer and its payload are also currently unsigned. We have successful GitHub-hosted builds and public documentation, but no public Chinese-edition GitHub Release yet.
>
> Before applying for production signing, could you clarify whether our existing repository provenance can satisfy the visible-fork and upstream-release-branch requirements, whether the upstream updater-only signing meets your signed-builds condition, and what changes or additional evidence you require? We will not claim eligibility or Foundation sponsorship without approval.

还需向其说明：包内存在第三方 NSIS 插件，以及运行时可按需下载 yt-dlp／FFmpeg；请确认可签范围、是否要求上游签名、隐私／许可审查和生产请求批准人的安排。不能要求其允许违反禁止签署上游二进制的政策。

## 获批前本人要做的事

1. 审阅本地改动和此材料，确认愿意向 Foundation 披露真实源代码关系、发布情况和签名状态。
2. 通过官方入口取得资格澄清，提供其要求的真实维护者／声誉／许可证／隐私材料；不要自行宣称已获支持。
3. 若其明确要求上游先发布 Windows 签名版本，需由本人决定与上游维护者沟通；当前代理未代发消息。
4. 若要求公开正式发布才能申请，先取得其对现有 Actions 下载形式的明确答复；当前禁止自动公开 Release 的约束继续有效。
5. 若不能接受现状，保留仓库关系；选择 Store/MSIX 或进一步核实面向中国个人的可信 IV／独资 EV 路线。任何付费方案另行批准。

## 只有获批后才实施的 SignPath 集成

- 创建 Foundation 批准的 organization/project，安装其 GitHub App 并授予本仓库所需访问，设置 GitHub-hosted build 来源校验和受限发布分支。
- 明确作者、审查者、签名批准者和 MFA；在主页／下载页发布真实 code signing policy。获批前不要写“由 Foundation 提供签名”。
- 按批准范围设计多阶段 artifact configuration：应用和卸载器须在嵌入最终 NSIS 前完成适当签名；第三方按其政策处理。最终安装器再签名。不能只签外层。
- 使用官方 `signpath/github-action-submit-signing-request@v3`：先上传 GitHub artifact，传 artifact-id，等待人工批准，显式指定 signed 输出目录；生产分发只从服务返回的目录取文件。
- 对服务返回的完整产物重新执行 Windows Authenticode／SignTool、内部 PE、时间戳、Defender 和安装测试；所有失败阻止上传。上述流程目前仅为批准后的实施要求，**没有部署未获批的占位签名动作**。

官方资料：[条款](https://signpath.org/terms.html)、[GitHub 构建来源与 action](https://docs.signpath.io/trusted-build-systems/github)、[Tauri 更新签名](https://v2.tauri.app/plugin/updater/#signing-updates)。
