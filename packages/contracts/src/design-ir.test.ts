import { describe, expect, it } from 'vitest';

import { DESIGN_IR_VERSION, parseDesignDocument } from './design-ir.js';

describe('DesignDocumentSchema', () => {
  it('accepts the minimal versioned document', () => {
    const document = parseDesignDocument({
      irVersion: DESIGN_IR_VERSION,
      source: { adapterId: 'test', name: 'minimal' },
      pages: [],
      components: [],
      tokens: { colors: {}, spacing: {}, radii: {}, typography: {} },
      assets: [],
      diagnostics: [],
    });

    expect(document.irVersion).toBe('1.0');
  });

  it('rejects documents without a supported IR version', () => {
    expect(() =>
      parseDesignDocument({
        irVersion: '2.0',
        source: { adapterId: 'test', name: 'minimal' },
        pages: [],
        components: [],
        tokens: { colors: {}, spacing: {}, radii: {}, typography: {} },
        assets: [],
        diagnostics: [],
      }),
    ).toThrow();
  });
});
