import * as assert from 'node:assert';
import {
  buildBasicAuthHeader,
  buildProxyConfig,
  mergeProxyConfig,
  needsProxyConfigInAngularJson,
  addProxyConfigToAngularJson,
  buildConnectGitignoreAdditions,
} from '../../protheusProxy';

describe('buildBasicAuthHeader', () => {
  it('base64-encodes user:password with the Basic prefix', () => {
    const header = buildBasicAuthHeader('admin', 'senha123');
    assert.strictEqual(header, `Basic ${Buffer.from('admin:senha123').toString('base64')}`);
  });
});

describe('buildProxyConfig', () => {
  it('builds a /rest target without auth headers when auth is none', () => {
    const config = buildProxyConfig('http://192.168.1.10:8086');
    assert.deepStrictEqual(config, {
      '/rest': {
        target: 'http://192.168.1.10:8086',
        secure: false,
        changeOrigin: true,
        logLevel: 'info',
      },
    });
  });

  it('includes the Authorization header when provided', () => {
    const config = buildProxyConfig('http://192.168.1.10:8086', 'Bearer abc123');
    assert.deepStrictEqual(config['/rest'].headers, { Authorization: 'Bearer abc123' });
  });
});

describe('mergeProxyConfig', () => {
  it('returns the new config as-is when no proxy.conf.json existed before', () => {
    const merged = mergeProxyConfig(undefined, buildProxyConfig('http://x:8086'));
    const parsed = JSON.parse(merged);
    assert.strictEqual(parsed['/rest'].target, 'http://x:8086');
  });

  it('merges the /rest entry into an existing proxy.conf.json without dropping other entries', () => {
    const existing = JSON.stringify({ '/outro': { target: 'http://outro:9000' } }, null, 2);
    const merged = mergeProxyConfig(existing, buildProxyConfig('http://x:8086'));
    const parsed = JSON.parse(merged);
    assert.strictEqual(parsed['/outro'].target, 'http://outro:9000');
    assert.strictEqual(parsed['/rest'].target, 'http://x:8086');
  });

  it('overwrites a pre-existing /rest entry', () => {
    const existing = JSON.stringify({ '/rest': { target: 'http://antigo:1000' } });
    const merged = mergeProxyConfig(existing, buildProxyConfig('http://novo:2000'));
    const parsed = JSON.parse(merged);
    assert.strictEqual(parsed['/rest'].target, 'http://novo:2000');
  });
});

describe('needsProxyConfigInAngularJson / addProxyConfigToAngularJson', () => {
  it('detects a missing serve.options.proxyConfig', () => {
    const angularJson = { projects: { x: { architect: { serve: { options: {} } } } } };
    assert.strictEqual(needsProxyConfigInAngularJson(angularJson, 'x'), true);
  });

  it('detects an already-configured proxyConfig', () => {
    const angularJson = { projects: { x: { architect: { serve: { options: { proxyConfig: 'proxy.conf.json' } } } } } };
    assert.strictEqual(needsProxyConfigInAngularJson(angularJson, 'x'), false);
  });

  it('adds proxyConfig without disturbing the rest of angular.json', () => {
    const angularJson = {
      projects: { x: { architect: { serve: { options: { port: 4200 } }, build: { options: {} } } } },
    };
    const fixed = addProxyConfigToAngularJson(angularJson, 'x');
    assert.strictEqual(fixed.projects.x.architect.serve.options.proxyConfig, 'proxy.conf.json');
    assert.strictEqual(fixed.projects.x.architect.serve.options.port, 4200);
  });
});

describe('buildConnectGitignoreAdditions', () => {
  it('adds proxy.conf.json when not already present', () => {
    const additions = buildConnectGitignoreAdditions('node_modules/\n');
    assert.ok(additions.includes('proxy.conf.json'));
  });

  it('returns an empty string when proxy.conf.json is already ignored', () => {
    assert.strictEqual(buildConnectGitignoreAdditions('proxy.conf.json\n'), '');
  });
});
