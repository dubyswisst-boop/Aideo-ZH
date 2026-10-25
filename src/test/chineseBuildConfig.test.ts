import { describe, expect, it } from 'vitest';
import original from '../../src-tauri/tauri.conf.json';
import chinese from '../../src-tauri/tauri.zh.conf.json';
import { readFileSync } from 'node:fs';

describe('separate Chinese edition packaging', () => {
  it('does not overwrite the original app or accept upstream automatic updates', () => {
    expect(chinese.identifier).not.toBe(original.identifier);
    expect(chinese.productName).toContain('中文');
    expect(chinese.plugins.updater.endpoints).toHaveLength(0);
    expect(chinese.bundle.createUpdaterArtifacts).toBe(false);
    expect(chinese.plugins['deep-link'].desktop.schemes).not.toContain('aideo');
  });

  it('offers a manual Windows packaging workflow that uploads installers but does not publish', () => {
    const workflow = readFileSync('.github/workflows/build-zh.yml', 'utf8');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('windows-latest');
    expect(workflow).toContain('tauri.zh.conf.json');
    expect(workflow).toContain('actions/upload-artifact');
    expect(workflow).not.toContain('gh release');
  });
});
