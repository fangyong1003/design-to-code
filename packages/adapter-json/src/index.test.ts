import { describe, expect, it } from 'vitest';

import { JsonDesignAdapter } from './index.js';

describe('JsonDesignAdapter', () => {
  it('parses a valid Design IR buffer', async () => {
    const adapter = new JsonDesignAdapter();
    const data = new TextEncoder().encode(
      JSON.stringify({
        irVersion: '1.0',
        source: { adapterId: 'test', name: 'buffer' },
        pages: [],
        components: [],
        tokens: { colors: {}, spacing: {}, radii: {}, typography: {} },
        assets: [],
        diagnostics: [],
      }),
    );

    const document = await adapter.parse(
      { kind: 'buffer', name: 'sample.design.json', data },
      { jobId: 'test-job', workspaceDir: '.' },
    );

    expect(document.source.name).toBe('buffer');
  });
});
