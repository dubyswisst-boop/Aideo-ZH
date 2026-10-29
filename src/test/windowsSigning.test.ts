import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const run = (script: string, args: string[] = []) => spawnSync('pwsh', [
  '-NoProfile', '-NonInteractive', '-File', script, ...args,
], { encoding: 'utf8', timeout: 60_000, env: { ...process.env, WINDOWS_SIGNING_PROVIDER: '', GITHUB_ACTIONS: '' } });

describe('Windows release gates', () => {
  it('requires a separate signing overlay without changing edition identity or updater settings', () => {
    const config = JSON.parse(readFileSync('src-tauri/tauri.windows-signing.conf.json', 'utf8'));
    expect(Object.keys(config)).toEqual(['bundle']);
    expect(config.bundle.windows.signCommand.args).toContain('%1');
    expect(config.bundle.windows.signCommand.args).toContain('../scripts/sign-windows.ps1');
    const zh = JSON.parse(readFileSync('src-tauri/tauri.zh.conf.json', 'utf8'));
    expect(zh.identifier).toBe('com.aideo.community.zh');
    expect(zh.plugins.updater.endpoints).toEqual([]);
    expect(zh.bundle.createUpdaterArtifacts).toBe(false);
  });

  it.skipIf(process.platform !== 'win32')('rejects release signing without a configured provider', () => {
    const result = run('scripts/sign-windows.ps1', ['-CheckConfiguration']);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('WINDOWS_SIGNING_PROVIDER');
  });

  it.skipIf(process.platform !== 'win32')('rejects a directory with no installer or payload', () => {
    const result = run('scripts/verify-windows-release.ps1', [
      '-Installer', 'package.json', '-PayloadDirectory', 'locales',
      '-ReportPath', 'temp/signing-tests/no-installer.json', '-ExpectedPublisher', 'not-a-publisher',
    ]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('PE');
  });

  it.skipIf(process.platform !== 'win32')('refuses an installation smoke test on the user workstation', () => {
    const result = run('scripts/test-windows-install.ps1', [
      '-Installer', 'package.json', '-ExpectedPublisher', 'not-a-publisher',
      '-ReportDirectory', 'temp/signing-tests/no-install',
    ]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('disposable GitHub Actions runner');
  });

  // This local fixture is a downloaded, hash-verified real Actions artifact, never required on CI.
  it.skipIf(process.platform !== 'win32' || !existsSync('temp/signing-audit/current-payload/aideo.exe'))(
    'rejects a real unsigned NSIS package and records all seven payload PEs', () => {
      const report = 'temp/signing-tests/unsigned.json';
      const result = run('scripts/verify-windows-release.ps1', [
        '-Installer', 'temp/signing-audit/current/nsis/Aideo 中文版_0.9.12_x64-setup.exe',
        '-PayloadDirectory', 'temp/signing-audit/current-payload',
        '-ReportPath', report, '-ExpectedPublisher', 'not-a-publisher',
      ]);
      expect(result.status).not.toBe(0);
      const data = JSON.parse(readFileSync(report, 'utf8'));
      expect(data.passed).toBe(false);
      expect(data.files).toHaveLength(8);
      expect(data.files.every((file: { status: string }) => file.status === 'NotSigned')).toBe(true);
    }, 60_000,
  );

  it('uploads release artifacts only from the verified staging directory', () => {
    const workflow = readFileSync('.github/workflows/build-zh.yml', 'utf8');
    expect(workflow).toContain('release-signed');
    expect(workflow).toContain('test-unsigned');
    expect(workflow).toContain('environment: windows-signing');
    expect(workflow).toContain('verify-windows-release.ps1');
    expect(workflow).toContain('scan-windows-release.ps1');
    expect(workflow).toContain('path: release-verified/');
    expect(workflow).not.toContain('continue-on-error: true');
    expect(workflow).not.toContain('if: always()');
  });

  it('does not select a paid signing provider by default for the confirmed Chinese individual publisher', () => {
    const workflow = readFileSync('.github/workflows/build-zh.yml', 'utf8');
    expect(workflow).toContain('WINDOWS_SIGNING_PROVIDER: ${{ vars.WINDOWS_SIGNING_PROVIDER }}');
    expect(workflow).not.toContain('WINDOWS_SIGNING_PROVIDER: artifact-signing');
    expect(workflow).toContain("./scripts/sign-windows.ps1 -CheckConfiguration");
  });
});
