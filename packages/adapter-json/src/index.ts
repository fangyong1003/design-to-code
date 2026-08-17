import { readFile } from 'node:fs/promises';

import type {
  AdapterManifest,
  DesignAdapter,
  DetectionResult,
  InputSource,
  ParseContext,
} from '@d2c/adapter-sdk';
import { parseDesignDocument, type DesignDocument } from '@d2c/contracts';

function sourceName(source: InputSource): string {
  if (source.kind === 'file') return source.path;
  if (source.kind === 'url') return source.url;
  return source.name;
}

async function readSource(source: InputSource): Promise<string> {
  if (source.kind === 'file') {
    return readFile(source.path, 'utf8');
  }
  if (source.kind === 'buffer') {
    return new TextDecoder().decode(source.data);
  }
  throw new Error('The JSON adapter does not fetch remote URLs');
}

export class JsonDesignAdapter implements DesignAdapter {
  public readonly priority = -100;

  public readonly manifest: AdapterManifest = {
    id: 'design-ir-json',
    displayName: 'Design IR JSON',
    supportedExtensions: ['.design.json'],
    supportedMimeTypes: ['application/vnd.d2c.design+json'],
    capabilities: {
      layers: true,
      text: true,
      vectors: true,
      components: true,
      tokens: true,
      constraints: true,
      interactions: false,
      referenceRender: false,
    },
  };

  public async detect(source: InputSource): Promise<DetectionResult> {
    const name = sourceName(source).toLowerCase();
    if (name.endsWith('.design.json')) {
      return {
        confidence: 0.99,
        reasons: ['The filename uses the .design.json IR extension'],
      };
    }
    if (name.endsWith('.json')) {
      return {
        confidence: 0.25,
        reasons: ['The input is JSON and may contain Design IR'],
      };
    }
    return { confidence: 0, reasons: [] };
  }

  public async parse(
    source: InputSource,
    _context: ParseContext,
  ): Promise<DesignDocument> {
    const text = await readSource(source);
    return parseDesignDocument(JSON.parse(text) as unknown);
  }
}
