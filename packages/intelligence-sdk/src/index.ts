import type { CodegenPlan, DesignDocument, Diagnostic } from '@d2c/contracts';

export interface SemanticSuggestion {
  nodeId: string;
  semanticRole: string;
  confidence: number;
  rationale?: string;
}

export interface PlanPatch {
  operations: Array<{
    operation: 'replace-name' | 'set-mapping' | 'move-component';
    componentId: string;
    value: string;
  }>;
  diagnostics: Diagnostic[];
}

export interface IntelligenceProvider {
  readonly id: string;
  inferSemantics?(document: DesignDocument): Promise<SemanticSuggestion[]>;
  reviewPlan?(document: DesignDocument, plan: CodegenPlan): Promise<PlanPatch>;
  diagnoseFailure?(
    document: DesignDocument,
    plan: CodegenPlan,
    diagnostics: Diagnostic[],
  ): Promise<PlanPatch>;
}

export class RulesIntelligenceProvider implements IntelligenceProvider {
  public readonly id = 'rules';

  public async inferSemantics(): Promise<SemanticSuggestion[]> {
    return [];
  }
}
