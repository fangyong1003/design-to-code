import { describe, expect, it } from 'vitest';

import { ComponentMappingRegistry } from './index.js';

describe('ComponentMappingRegistry', () => {
  it('matches a node through its semantic role', () => {
    const registry = new ComponentMappingRegistry();
    registry.register({
      id: 'button',
      match: { names: ['Button'], semanticRole: 'button' },
      target: {
        framework: 'react',
        component: 'Button',
        import: '@/components/ui/button',
      },
      properties: {},
    });

    const mapping = registry.find({
      id: 'node-1',
      type: 'frame',
      sourceRef: { adapterId: 'test' },
      bounds: { x: 0, y: 0, width: 100, height: 40 },
      semanticRole: 'button',
      children: [],
    });

    expect(mapping?.id).toBe('button');
  });
});
