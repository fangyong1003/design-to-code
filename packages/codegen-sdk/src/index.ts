import type {
  CodegenPlan,
  DesignDocument,
  GeneratedArtifact,
  TargetEnvironment,
} from '@d2c/contracts';

export interface PlanningContext {
  projectRoot: string;
  target: TargetEnvironment;
}

export interface GenerationContext {
  projectRoot: string;
  outputDir: string;
  document: DesignDocument;
  signal?: AbortSignal;
}

export interface TargetGenerator {
  readonly id: string;
  readonly displayName: string;
  supports(target: TargetEnvironment): boolean;
  plan(
    document: DesignDocument,
    context: PlanningContext,
  ): Promise<CodegenPlan>;
  generate(
    plan: CodegenPlan,
    context: GenerationContext,
  ): Promise<GeneratedArtifact[]>;
}
