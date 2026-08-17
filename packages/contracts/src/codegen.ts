import { z } from 'zod';

export const TargetEnvironmentSchema = z.object({
  framework: z.enum(['react', 'vue', 'html', 'flutter', 'swiftui']),
  language: z.enum(['typescript', 'javascript', 'dart', 'swift']),
  styling: z.enum(['css-modules', 'css', 'tailwind', 'styled-components']),
});

export type TargetEnvironment = z.infer<typeof TargetEnvironmentSchema>;

export interface ComponentPlan {
  id: string;
  name: string;
  sourceNodeIds: string[];
  outputPath: string;
  mappingId?: string;
  children: ComponentPlan[];
}

export const ComponentPlanSchema: z.ZodType<ComponentPlan> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    sourceNodeIds: z.array(z.string().min(1)).min(1),
    outputPath: z.string().min(1),
    mappingId: z.string().optional(),
    children: z.array(ComponentPlanSchema),
  }),
);

export const CodegenPlanSchema = z.object({
  version: z.literal('1.0'),
  target: TargetEnvironmentSchema,
  components: z.array(ComponentPlanSchema),
  entrypoints: z.array(z.string().min(1)),
});

export type CodegenPlan = z.infer<typeof CodegenPlanSchema>;

export interface GeneratedArtifact {
  path: string;
  kind: 'source' | 'style' | 'asset' | 'manifest';
  content?: string;
  sourcePath?: string;
}
