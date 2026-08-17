import type { DesignDocument, DesignNode } from '@d2c/contracts';
import { describe, expect, it } from 'vitest';

import { LayoutInferencePass } from './layout-inference.js';

function node(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  children: DesignNode[] = [],
): DesignNode {
  return {
    id,
    sourceRef: { adapterId: 'test' },
    type: children.length > 0 ? 'frame' : 'text',
    bounds: { x, y, width, height },
    children,
  };
}

function documentWith(nodeValue: DesignNode): DesignDocument {
  return {
    irVersion: '1.0',
    source: { adapterId: 'test', name: 'layout' },
    pages: [{ id: 'page', name: 'Page', nodes: [nodeValue] }],
    components: [],
    tokens: { colors: {}, spacing: {}, radii: {}, typography: {} },
    assets: [],
    diagnostics: [],
  };
}

describe('LayoutInferencePass', () => {
  it('infers a vertically aligned, evenly spaced group as Flex column', async () => {
    const parent = node('parent', 0, 0, 320, 220, [
      node('first', 24, 20, 100, 20),
      node('second', 24, 56, 140, 20),
      node('third', 24, 92, 80, 20),
    ]);
    const result = await new LayoutInferencePass().run(documentWith(parent), {
      jobId: 'test',
      workspaceDir: '.',
    });
    const layout = result.pages[0]?.nodes[0]?.layout;

    expect(layout).toMatchObject({
      mode: 'flex',
      direction: 'column',
      gap: 16,
      align: 'start',
      padding: { top: 20, left: 24 },
    });
  });

  it('keeps overlapping background and content in absolute layout', async () => {
    const parent = node('parent', 0, 0, 320, 220, [
      node('background', 0, 0, 320, 220),
      node('label', 24, 24, 100, 20),
    ]);
    const result = await new LayoutInferencePass().run(documentWith(parent), {
      jobId: 'test',
      workspaceDir: '.',
    });

    expect(result.pages[0]?.nodes[0]?.layout).toBeUndefined();
  });
});
