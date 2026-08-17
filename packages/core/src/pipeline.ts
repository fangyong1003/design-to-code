import type {
  DesignAdapter,
  InputSource,
  ParseContext,
} from '@d2c/adapter-sdk';
import type { DesignDocument } from '@d2c/contracts';

import { AdapterRegistry } from './adapter-registry.js';

export interface AnalysisContext {
  jobId: string;
  workspaceDir: string;
  signal?: AbortSignal;
}

export interface DesignPass {
  readonly id: string;
  run(
    document: DesignDocument,
    context: AnalysisContext,
  ): Promise<DesignDocument>;
}

export interface ParseResult {
  adapter: DesignAdapter;
  document: DesignDocument;
}

export class ConversionPipeline {
  public constructor(
    private readonly adapters: AdapterRegistry,
    private readonly passes: DesignPass[] = [],
  ) {}

  public async parse(
    source: InputSource,
    context: ParseContext,
  ): Promise<ParseResult> {
    const match = await this.adapters.detect(source);
    const document = await match.adapter.parse(source, context);
    return { adapter: match.adapter, document };
  }

  public async analyze(
    initialDocument: DesignDocument,
    context: AnalysisContext,
  ): Promise<DesignDocument> {
    let document = initialDocument;
    for (const pass of this.passes) {
      document = await pass.run(document, context);
    }
    return document;
  }
}
