import type { DesignDocument } from '@d2c/contracts';
import { describe, expect, it } from 'vitest';

import { ReactGenerator } from './index.js';

const document: DesignDocument = {
  irVersion: '1.0',
  source: { adapterId: 'test', name: 'Card' },
  pages: [
    {
      id: 'home',
      name: 'Home',
      nodes: [
        {
          id: 'card',
          sourceRef: { adapterId: 'test' },
          type: 'frame',
          bounds: { x: 10, y: 20, width: 320, height: 180 },
          layout: { mode: 'flex', direction: 'column', gap: 12 },
          style: { backgroundColor: '#ffffff', borderRadius: 12 },
          children: [
            {
              id: 'title',
              sourceRef: { adapterId: 'test' },
              type: 'text',
              bounds: { x: 0, y: 0, width: 240, height: 28 },
              style: { fontSize: 20, fontWeight: 600 },
              content: { kind: 'text', value: 'Hello React' },
              children: [],
            },
          ],
        },
      ],
    },
  ],
  components: [],
  tokens: { colors: {}, spacing: {}, radii: {}, typography: {} },
  assets: [],
  diagnostics: [],
};

describe('ReactGenerator', () => {
  it('generates a React page and CSS Modules styles from Design IR', async () => {
    const generator = new ReactGenerator();
    const plan = await generator.plan(document, {
      projectRoot: '.',
      target: {
        framework: 'react',
        language: 'typescript',
        styling: 'css-modules',
      },
    });
    const artifacts = await generator.generate(plan, {
      projectRoot: '.',
      outputDir: './output',
      document,
    });

    const page = artifacts.find(
      (artifact) => artifact.path === 'src/pages/HomePage.tsx',
    );
    const css = artifacts.find(
      (artifact) => artifact.path === 'src/App.module.css',
    );

    expect(page?.content).toContain('Hello React');
    expect(page?.content).toContain("styles['node-page-home']");
    expect(css?.content).toContain('display: flex');
    expect(css?.content).toContain('border-radius: 12px');
  });
});
