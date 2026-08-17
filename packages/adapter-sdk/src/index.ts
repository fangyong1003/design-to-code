import type { DesignDocument } from '@d2c/contracts';

export type InputSource =
  | { kind: 'file'; path: string; mimeType?: string }
  | { kind: 'url'; url: string; mimeType?: string }
  | { kind: 'buffer'; name: string; data: Uint8Array; mimeType?: string };

export interface DetectionResult {
  confidence: number;
  reasons: string[];
}

export interface AdapterManifest {
  id: string;
  displayName: string;
  supportedExtensions: string[];
  supportedMimeTypes: string[];
  capabilities: {
    layers: boolean;
    text: boolean;
    vectors: boolean;
    components: boolean;
    tokens: boolean;
    constraints: boolean;
    interactions: boolean;
    referenceRender: boolean;
  };
}

export interface ParseContext {
  jobId: string;
  workspaceDir: string;
  signal?: AbortSignal;
}

export interface DesignAdapter {
  readonly manifest: AdapterManifest;
  readonly priority?: number;

  detect(source: InputSource): Promise<DetectionResult>;
  parse(source: InputSource, context: ParseContext): Promise<DesignDocument>;
}

export class AdapterNotFoundError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'AdapterNotFoundError';
  }
}
