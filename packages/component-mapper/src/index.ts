import type { DesignNode } from '@d2c/contracts';
import { z } from 'zod';

export const ComponentMappingSchema = z
  .object({
    id: z.string().min(1),
    match: z.object({
      names: z.array(z.string().min(1)).optional(),
      semanticRole: z.string().min(1).optional(),
    }),
    target: z.object({
      framework: z.enum(['react', 'vue', 'html', 'flutter', 'swiftui']),
      component: z.string().min(1),
      import: z.string().min(1),
    }),
    properties: z.record(
      z.string(),
      z.object({
        target: z.string().min(1),
        type: z.enum(['text', 'boolean', 'variant', 'instance-swap', 'slot']),
        values: z.record(z.string(), z.string()).optional(),
      }),
    ),
  })
  .refine(
    (mapping) =>
      Boolean(mapping.match.semanticRole) ||
      Boolean(mapping.match.names && mapping.match.names.length > 0),
    { message: 'A mapping must match by at least one name or semantic role' },
  );

export type ComponentMapping = z.infer<typeof ComponentMappingSchema>;

export class ComponentMappingRegistry {
  readonly #mappings = new Map<string, ComponentMapping>();

  public register(input: unknown): ComponentMapping {
    const mapping = ComponentMappingSchema.parse(input);
    if (this.#mappings.has(mapping.id)) {
      throw new Error('Component mapping already registered: ' + mapping.id);
    }
    this.#mappings.set(mapping.id, mapping);
    return mapping;
  }

  public list(): ComponentMapping[] {
    return [...this.#mappings.values()];
  }

  public find(node: DesignNode): ComponentMapping | null {
    for (const mapping of this.#mappings.values()) {
      const matchesName =
        node.name !== undefined && mapping.match.names?.includes(node.name);
      const matchesRole =
        node.semanticRole !== undefined &&
        mapping.match.semanticRole === node.semanticRole;

      if (matchesName || matchesRole) {
        return mapping;
      }
    }
    return null;
  }
}
