import { basename } from 'node:path';
import { readFile } from 'node:fs/promises';

import type {
  AdapterManifest,
  DesignAdapter,
  DetectionResult,
  InputSource,
  ParseContext,
} from '@d2c/adapter-sdk';
import {
  DESIGN_IR_VERSION,
  type AssetReference,
  type ComponentDefinition,
  type DesignDocument,
  type DesignNode,
  type DesignNodeType,
  type Diagnostic,
  type StyleSpec,
} from '@d2c/contracts';
import { strFromU8, unzipSync } from 'fflate';

const SKETCH_ADAPTER_ID = 'sketch';
const MAX_INPUT_BYTES = 50 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 5_000;
const MAX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;

type UnknownRecord = Record<string, unknown>;
type SketchArchive = Record<string, Uint8Array>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function sourceName(source: InputSource): string {
  if (source.kind === 'file') return basename(source.path);
  if (source.kind === 'url') return source.url;
  return source.name;
}

function hasZipSignature(data: Uint8Array): boolean {
  return (
    data.length >= 4 &&
    data[0] === 0x50 &&
    data[1] === 0x4b &&
    (data[2] === 0x03 || data[2] === 0x05 || data[2] === 0x07) &&
    (data[3] === 0x04 || data[3] === 0x06 || data[3] === 0x08)
  );
}

async function readSource(source: InputSource): Promise<Uint8Array> {
  if (source.kind === 'file') {
    return new Uint8Array(await readFile(source.path));
  }
  if (source.kind === 'buffer') return source.data;
  throw new Error('The Sketch adapter does not fetch remote URLs');
}

function parseArchive(data: Uint8Array): SketchArchive {
  if (data.byteLength > MAX_INPUT_BYTES) {
    throw new Error('Sketch input exceeds the 50 MiB safety limit');
  }
  if (!hasZipSignature(data)) {
    throw new Error('Sketch input is not a ZIP archive');
  }

  const archive = unzipSync(data);
  const entries = Object.entries(archive);
  if (entries.length > MAX_ARCHIVE_ENTRIES) {
    throw new Error('Sketch archive has too many entries');
  }

  let totalBytes = 0;
  for (const [, entry] of entries) {
    totalBytes += entry.byteLength;
    if (totalBytes > MAX_UNCOMPRESSED_BYTES) {
      throw new Error(
        'Sketch archive exceeds the 100 MiB expanded safety limit',
      );
    }
  }
  return archive;
}

function parseJsonEntry(archive: SketchArchive, path: string): UnknownRecord {
  const entry = archive[path];
  if (!entry) {
    throw new Error('Required Sketch archive entry is missing: ' + path);
  }
  try {
    return asRecord(JSON.parse(strFromU8(entry)) as unknown);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      'Invalid JSON in Sketch archive entry ' + path + ': ' + message,
    );
  }
}

function parseOptionalJsonEntry(
  archive: SketchArchive,
  path: string,
): UnknownRecord | null {
  return archive[path] ? parseJsonEntry(archive, path) : null;
}

function toHexChannel(value: number): string {
  return Math.round(Math.max(0, Math.min(1, value)) * 255)
    .toString(16)
    .padStart(2, '0');
}

function colorToCss(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  const color = asRecord(value);
  const red = asNumber(color.red);
  const green = asNumber(color.green);
  const blue = asNumber(color.blue);
  const alpha = asNumber(color.alpha) ?? 1;
  if (red === undefined || green === undefined || blue === undefined)
    return undefined;
  if (alpha >= 1) {
    return '#' + toHexChannel(red) + toHexChannel(green) + toHexChannel(blue);
  }
  return (
    'rgba(' +
    Math.round(red * 255) +
    ', ' +
    Math.round(green * 255) +
    ', ' +
    Math.round(blue * 255) +
    ', ' +
    alpha +
    ')'
  );
}

function firstEnabledStyleItem(value: unknown): UnknownRecord | null {
  for (const item of asArray(value)) {
    const record = asRecord(item);
    if (asBoolean(record.isEnabled) !== false) return record;
  }
  return null;
}

function textAttributes(layer: UnknownRecord): UnknownRecord {
  const attributedString = asRecord(layer.attributedString);
  for (const item of asArray(attributedString.attributes)) {
    const attributes = asRecord(asRecord(item).attributes);
    if (Object.keys(attributes).length > 0) return attributes;
  }
  return {};
}

function styleFromLayer(layer: UnknownRecord): StyleSpec | undefined {
  const style = asRecord(layer.style);
  const result: StyleSpec = {};
  const fill = firstEnabledStyleItem(style.fills);
  const fillColor = fill ? colorToCss(fill.color) : undefined;
  if (fillColor) result.backgroundColor = fillColor;

  const border = firstEnabledStyleItem(style.borders);
  const borderColor = border ? colorToCss(border.color) : undefined;
  if (borderColor) result.borderColor = borderColor;
  const borderWidth = border ? asNumber(border.thickness) : undefined;
  if (borderWidth !== undefined) result.borderWidth = borderWidth;

  const radius = asNumber(layer.fixedRadius);
  if (radius !== undefined) result.borderRadius = radius;

  const opacity = asNumber(
    style.contextSettings && asRecord(style.contextSettings).opacity,
  );
  if (opacity !== undefined) result.opacity = opacity;

  if (asString(layer._class) === 'text') {
    const attributes = textAttributes(layer);
    const font = asRecord(attributes.MSAttributedStringFontAttribute);
    const fontAttributes = asRecord(font.attributes);
    const fontName = asString(fontAttributes.name);
    const fontSize = asNumber(fontAttributes.size);
    const textColor = colorToCss(attributes.MSAttributedStringColorAttribute);
    if (fontName) result.fontFamily = fontName;
    if (fontSize !== undefined) result.fontSize = fontSize;
    if (textColor) result.color = textColor;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function nodeTypeForClass(rawClass: string | undefined): DesignNodeType {
  switch (rawClass) {
    case 'artboard':
    case 'rectangle':
    case 'oval':
    case 'triangle':
    case 'polygon':
    case 'star':
      return 'frame';
    case 'group':
      return 'group';
    case 'text':
      return 'text';
    case 'bitmap':
      return 'image';
    case 'shapeGroup':
    case 'shapePath':
      return 'vector';
    case 'symbolMaster':
      return 'component';
    case 'symbolInstance':
      return 'instance';
    default:
      return 'unknown';
  }
}

function assetPathForReference(reference: string): string {
  return reference.startsWith('images/') ? reference : 'images/' + reference;
}

function contentFromLayer(
  layer: UnknownRecord,
  assetIdsByPath: Map<string, string>,
): DesignNode['content'] {
  const rawClass = asString(layer._class);
  if (rawClass === 'text') {
    const text = asString(asRecord(layer.attributedString).string);
    return text === undefined ? undefined : { kind: 'text', value: text };
  }
  if (rawClass === 'bitmap') {
    const image = asRecord(layer.image);
    const reference = asString(image._ref);
    if (!reference) return undefined;
    const assetId = assetIdsByPath.get(assetPathForReference(reference));
    return assetId ? { kind: 'image', assetId } : undefined;
  }
  if (rawClass === 'shapeGroup' || rawClass === 'shapePath') {
    return undefined;
  }
  return undefined;
}

function boundsFromLayer(layer: UnknownRecord): DesignNode['bounds'] {
  const frame = asRecord(layer.frame);
  return {
    x: asNumber(frame.x) ?? 0,
    y: asNumber(frame.y) ?? 0,
    width: asNumber(frame.width) ?? 0,
    height: asNumber(frame.height) ?? 0,
  };
}

function mapLayer(
  layer: UnknownRecord,
  path: string,
  assetIdsByPath: Map<string, string>,
): DesignNode {
  const rawClass = asString(layer._class);
  const id = asString(layer.do_objectID) ?? path;
  const properties: Record<string, string | number | boolean> = {};
  const symbolId = asString(layer.symbolID);
  if (symbolId) properties.symbolId = symbolId;

  const children: DesignNode[] = [];
  let index = 0;
  for (const rawChild of asArray(layer.layers)) {
    children.push(
      mapLayer(asRecord(rawChild), path + '/' + index, assetIdsByPath),
    );
    index += 1;
  }

  const node: DesignNode = {
    id,
    sourceRef: {
      adapterId: SKETCH_ADAPTER_ID,
      nodeId: asString(layer.do_objectID),
      rawType: rawClass,
    },
    type: nodeTypeForClass(rawClass),
    name: asString(layer.name),
    bounds: boundsFromLayer(layer),
    visible: asBoolean(layer.isVisible),
    style: styleFromLayer(layer),
    content: contentFromLayer(layer, assetIdsByPath),
    componentRef: rawClass === 'symbolInstance' ? symbolId : undefined,
    properties: Object.keys(properties).length > 0 ? properties : undefined,
    children,
  };
  return node;
}

function collectComponents(nodes: DesignNode[]): ComponentDefinition[] {
  const components = new Map<string, ComponentDefinition>();
  const walk = (node: DesignNode): void => {
    if (node.type === 'component') {
      components.set(node.id, {
        id: node.id,
        name: node.name ?? node.id,
        rootNodeId: node.id,
      });
    }
    for (const child of node.children) walk(child);
  };
  for (const node of nodes) walk(node);
  return [...components.values()];
}

function assetsFromArchive(archive: SketchArchive): {
  assets: AssetReference[];
  idsByPath: Map<string, string>;
} {
  const assets: AssetReference[] = [];
  const idsByPath = new Map<string, string>();
  let index = 0;

  for (const path of Object.keys(archive).sort()) {
    if (!path.startsWith('images/')) continue;
    const id = 'sketch-image-' + index;
    index += 1;
    idsByPath.set(path, id);
    assets.push({
      id,
      kind: 'image',
      path: 'sketch://' + path,
    });
  }
  return { assets, idsByPath };
}

export class SketchAdapter implements DesignAdapter {
  public readonly priority = 100;

  public readonly manifest: AdapterManifest = {
    id: SKETCH_ADAPTER_ID,
    displayName: 'Sketch',
    supportedExtensions: ['.sketch'],
    supportedMimeTypes: ['application/x-sketch', 'application/vnd.sketch'],
    capabilities: {
      layers: true,
      text: true,
      vectors: true,
      components: true,
      tokens: false,
      constraints: false,
      interactions: false,
      referenceRender: false,
    },
  };

  public async detect(source: InputSource): Promise<DetectionResult> {
    const name = sourceName(source).toLowerCase();
    if (name.endsWith('.sketch')) {
      return {
        confidence: 0.95,
        reasons: ['The filename uses the .sketch extension'],
      };
    }
    if (source.kind === 'buffer' && hasZipSignature(source.data)) {
      return {
        confidence: 0.4,
        reasons: ['The input is a ZIP archive, which may be a Sketch file'],
      };
    }
    return { confidence: 0, reasons: [] };
  }

  public async parse(
    source: InputSource,
    _context: ParseContext,
  ): Promise<DesignDocument> {
    const archive = parseArchive(await readSource(source));
    const diagnostics: Diagnostic[] = [];
    const meta = parseOptionalJsonEntry(archive, 'meta.json');
    if (!meta) {
      diagnostics.push({
        level: 'warning',
        code: 'sketch.meta-missing',
        message: 'The Sketch archive does not contain meta.json',
      });
    }

    const { assets, idsByPath } = assetsFromArchive(archive);
    const pagePaths = Object.keys(archive)
      .filter((path) => path.startsWith('pages/') && path.endsWith('.json'))
      .sort();
    if (pagePaths.length === 0) {
      diagnostics.push({
        level: 'warning',
        code: 'sketch.pages-missing',
        message: 'The Sketch archive does not contain any page JSON files',
      });
    }

    const pages = pagePaths.map((path, pageIndex) => {
      const page = parseJsonEntry(archive, path);
      const nodes: DesignNode[] = [];
      let layerIndex = 0;
      for (const rawLayer of asArray(page.layers)) {
        nodes.push(
          mapLayer(
            asRecord(rawLayer),
            path + '/layers/' + layerIndex,
            idsByPath,
          ),
        );
        layerIndex += 1;
      }
      return {
        id: asString(page.do_objectID) ?? path,
        name: asString(page.name) ?? 'Page ' + (pageIndex + 1),
        nodes,
      };
    });

    const components = collectComponents(pages.flatMap((page) => page.nodes));
    return {
      irVersion: DESIGN_IR_VERSION,
      source: {
        adapterId: SKETCH_ADAPTER_ID,
        name: sourceName(source),
      },
      pages,
      components,
      tokens: { colors: {}, spacing: {}, radii: {}, typography: {} },
      assets,
      diagnostics,
    };
  }
}

export { SKETCH_ADAPTER_ID };
