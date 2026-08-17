import type { DesignAdapter } from '@d2c/adapter-sdk';
import { describe, expect, it } from 'vitest';

import { AdapterRegistry } from './adapter-registry.js';

function createAdapter(id: string, confidence: number): DesignAdapter {
  return {
    manifest: {
      id,
      displayName: id,
      supportedExtensions: [],
      supportedMimeTypes: [],
      capabilities: {
        layers: false,
        text: false,
        vectors: false,
        components: false,
        tokens: false,
        constraints: false,
        interactions: false,
        referenceRender: false,
      },
    },
    async detect() {
      return { confidence, reasons: [] };
    },
    async parse() {
      throw new Error('Not required by this test');
    },
  };
}

describe('AdapterRegistry', () => {
  it('selects the adapter with the highest confidence', async () => {
    const registry = new AdapterRegistry([
      createAdapter('low', 0.2),
      createAdapter('high', 0.9),
    ]);

    const match = await registry.detect({
      kind: 'buffer',
      name: 'sample.bin',
      data: new Uint8Array(),
    });

    expect(match.adapter.manifest.id).toBe('high');
  });
});
