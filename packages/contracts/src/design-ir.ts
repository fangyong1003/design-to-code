import { z } from 'zod';

export const DESIGN_IR_VERSION = '1.0' as const;

export const RectSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().nonnegative(),
  height: z.number().finite().nonnegative(),
});

export type Rect = z.infer<typeof RectSchema>;

export const SourceReferenceSchema = z.object({
  adapterId: z.string().min(1),
  documentId: z.string().optional(),
  pageId: z.string().optional(),
  nodeId: z.string().optional(),
  rawType: z.string().optional(),
});

export type SourceReference = z.infer<typeof SourceReferenceSchema>;

export const FlexLayoutSchema = z.object({
  mode: z.literal('flex'),
  direction: z.enum(['row', 'column']),
  gap: z.number().finite().nonnegative().optional(),
  padding: z
    .object({
      top: z.number().finite(),
      right: z.number().finite(),
      bottom: z.number().finite(),
      left: z.number().finite(),
    })
    .optional(),
  align: z.enum(['start', 'center', 'end', 'stretch']).optional(),
  justify: z
    .enum(['start', 'center', 'end', 'space-between', 'space-around'])
    .optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const GridLayoutSchema = z.object({
  mode: z.literal('grid'),
  columns: z.array(z.string().min(1)).min(1),
  rows: z.array(z.string().min(1)).optional(),
  gap: z.number().finite().nonnegative().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const AbsoluteLayoutSchema = z.object({
  mode: z.literal('absolute'),
  confidence: z.number().min(0).max(1).optional(),
});

export const LayoutSpecSchema = z.discriminatedUnion('mode', [
  FlexLayoutSchema,
  GridLayoutSchema,
  AbsoluteLayoutSchema,
]);

export type LayoutSpec = z.infer<typeof LayoutSpecSchema>;

export const StyleSpecSchema = z.object({
  opacity: z.number().min(0).max(1).optional(),
  backgroundColor: z.string().optional(),
  color: z.string().optional(),
  borderColor: z.string().optional(),
  borderWidth: z.number().finite().nonnegative().optional(),
  borderRadius: z.number().finite().nonnegative().optional(),
  boxShadow: z.string().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().finite().positive().optional(),
  fontWeight: z.number().int().positive().optional(),
  lineHeight: z.number().finite().positive().optional(),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
});

export type StyleSpec = z.infer<typeof StyleSpecSchema>;

export const NodeContentSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('text'), value: z.string() }),
  z.object({ kind: z.literal('image'), assetId: z.string().min(1) }),
  z.object({ kind: z.literal('vector'), assetId: z.string().min(1) }),
]);

export type NodeContent = z.infer<typeof NodeContentSchema>;

export const DesignNodeTypeSchema = z.enum([
  'document',
  'page',
  'frame',
  'group',
  'text',
  'image',
  'vector',
  'component',
  'instance',
  'slot',
  'unknown',
]);

export type DesignNodeType = z.infer<typeof DesignNodeTypeSchema>;

export interface DesignNode {
  id: string;
  sourceRef: SourceReference;
  type: DesignNodeType;
  name?: string;
  bounds: Rect;
  visible?: boolean;
  layout?: LayoutSpec;
  style?: StyleSpec;
  content?: NodeContent;
  componentRef?: string;
  properties?: Record<string, string | number | boolean>;
  semanticRole?: string;
  confidence?: number;
  children: DesignNode[];
}

export const DesignNodeSchema: z.ZodType<DesignNode> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    sourceRef: SourceReferenceSchema,
    type: DesignNodeTypeSchema,
    name: z.string().optional(),
    bounds: RectSchema,
    visible: z.boolean().optional(),
    layout: LayoutSpecSchema.optional(),
    style: StyleSpecSchema.optional(),
    content: NodeContentSchema.optional(),
    componentRef: z.string().optional(),
    properties: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      .optional(),
    semanticRole: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    children: z.array(DesignNodeSchema),
  }),
);

export const DesignPageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nodes: z.array(DesignNodeSchema),
});

export const ComponentDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  rootNodeId: z.string().min(1),
  propertyDefinitions: z
    .record(
      z.string(),
      z.object({
        type: z.enum(['text', 'boolean', 'variant', 'instance-swap', 'slot']),
        values: z.array(z.string()).optional(),
      }),
    )
    .optional(),
});

export const DesignTokensSchema = z.object({
  colors: z.record(z.string(), z.string()),
  spacing: z.record(z.string(), z.number().finite()),
  radii: z.record(z.string(), z.number().finite()),
  typography: z.record(z.string(), StyleSpecSchema),
});

export const AssetReferenceSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['image', 'vector', 'font', 'other']),
  path: z.string().min(1),
  mimeType: z.string().optional(),
  sha256: z.string().optional(),
});

export const DiagnosticSchema = z.object({
  level: z.enum(['info', 'warning', 'error']),
  code: z.string().min(1),
  message: z.string().min(1),
  sourceRef: SourceReferenceSchema.optional(),
});

export const DesignDocumentSchema = z.object({
  irVersion: z.literal(DESIGN_IR_VERSION),
  source: z.object({
    adapterId: z.string().min(1),
    name: z.string().min(1),
    mimeType: z.string().optional(),
    sha256: z.string().optional(),
  }),
  pages: z.array(DesignPageSchema),
  components: z.array(ComponentDefinitionSchema),
  tokens: DesignTokensSchema,
  assets: z.array(AssetReferenceSchema),
  diagnostics: z.array(DiagnosticSchema),
});

export type DesignDocument = z.infer<typeof DesignDocumentSchema>;
export type DesignPage = z.infer<typeof DesignPageSchema>;
export type ComponentDefinition = z.infer<typeof ComponentDefinitionSchema>;
export type DesignTokens = z.infer<typeof DesignTokensSchema>;
export type AssetReference = z.infer<typeof AssetReferenceSchema>;
export type Diagnostic = z.infer<typeof DiagnosticSchema>;

export function parseDesignDocument(input: unknown): DesignDocument {
  return DesignDocumentSchema.parse(input);
}
