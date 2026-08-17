import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import { SketchAdapter } from './index.js';

function createSketchFixture(): Uint8Array {
  return zipSync({
    'meta.json': strToU8(JSON.stringify({ pagesAndArtboards: {} })),
    'document.json': strToU8(JSON.stringify({ _class: 'document' })),
    'pages/page-1.json': strToU8(
      JSON.stringify({
        _class: 'page',
        do_objectID: 'page-1',
        name: 'Home',
        layers: [
          {
            _class: 'artboard',
            do_objectID: 'artboard-1',
            name: 'Hero',
            frame: { x: 0, y: 0, width: 1440, height: 700 },
            layers: [
              {
                _class: 'text',
                do_objectID: 'title-1',
                name: 'Title',
                frame: { x: 32, y: 48, width: 300, height: 32 },
                attributedString: {
                  string: 'Hello Sketch',
                  attributes: [
                    {
                      attributes: {
                        MSAttributedStringFontAttribute: {
                          attributes: { name: 'Inter', size: 24 },
                        },
                        MSAttributedStringColorAttribute: {
                          red: 0.1,
                          green: 0.2,
                          blue: 0.3,
                          alpha: 1,
                        },
                      },
                    },
                  ],
                },
              },
              {
                _class: 'bitmap',
                do_objectID: 'image-1',
                name: 'Product image',
                frame: { x: 32, y: 100, width: 240, height: 160 },
                image: { _ref: 'image-asset' },
              },
            ],
          },
          {
            _class: 'symbolMaster',
            do_objectID: 'button-master',
            name: 'Button',
            frame: { x: 0, y: 0, width: 100, height: 40 },
            layers: [],
          },
        ],
      }),
    ),
    'images/image-asset': new Uint8Array([137, 80, 78, 71]),
  });
}

describe('SketchAdapter', () => {
  it('maps Sketch pages, layers, text, image references and symbols to Design IR', async () => {
    const adapter = new SketchAdapter();
    const document = await adapter.parse(
      {
        kind: 'buffer',
        name: 'fixture.sketch',
        data: createSketchFixture(),
      },
      { jobId: 'test-job', workspaceDir: '.' },
    );

    expect(document.source.adapterId).toBe('sketch');
    expect(document.pages).toHaveLength(1);
    expect(document.pages[0]?.nodes).toHaveLength(2);
    expect(document.pages[0]?.nodes[0]?.type).toBe('frame');
    expect(document.pages[0]?.nodes[0]?.children[0]?.content).toEqual({
      kind: 'text',
      value: 'Hello Sketch',
    });
    expect(document.pages[0]?.nodes[0]?.children[1]?.content).toEqual({
      kind: 'image',
      assetId: 'sketch-image-0',
    });
    expect(document.assets).toHaveLength(1);
    expect(document.components).toEqual([
      { id: 'button-master', name: 'Button', rootNodeId: 'button-master' },
    ]);
  });

  it('recognizes .sketch input by filename', async () => {
    const adapter = new SketchAdapter();
    const result = await adapter.detect({
      kind: 'buffer',
      name: 'fixture.sketch',
      data: new Uint8Array(),
    });

    expect(result.confidence).toBeGreaterThan(0.9);
  });
});
