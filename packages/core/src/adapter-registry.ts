import {
  AdapterNotFoundError,
  type DesignAdapter,
  type DetectionResult,
  type InputSource,
} from '@d2c/adapter-sdk';

export interface AdapterMatch {
  adapter: DesignAdapter;
  detection: DetectionResult;
}

export class AdapterRegistry {
  readonly #adapters = new Map<string, DesignAdapter>();

  public constructor(adapters: DesignAdapter[] = []) {
    for (const adapter of adapters) {
      this.register(adapter);
    }
  }

  public register(adapter: DesignAdapter): void {
    if (this.#adapters.has(adapter.manifest.id)) {
      throw new Error('Adapter already registered: ' + adapter.manifest.id);
    }
    this.#adapters.set(adapter.manifest.id, adapter);
  }

  public list(): DesignAdapter[] {
    return [...this.#adapters.values()];
  }

  public async detect(source: InputSource): Promise<AdapterMatch> {
    const candidates = await Promise.all(
      this.list().map(async (adapter) => ({
        adapter,
        detection: await adapter.detect(source),
      })),
    );

    candidates.sort((left, right) => {
      const confidence = right.detection.confidence - left.detection.confidence;
      if (confidence !== 0) return confidence;
      return (right.adapter.priority ?? 0) - (left.adapter.priority ?? 0);
    });

    const match = candidates[0];
    if (!match || match.detection.confidence <= 0) {
      throw new AdapterNotFoundError(
        'No registered adapter recognized the input source',
      );
    }

    return match;
  }
}
