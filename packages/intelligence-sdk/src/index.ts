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

export interface LocalModelConfig {
  /** OpenAI-compatible base URL, such as http://127.0.0.1:8000/v1. */
  endpoint: string;
  model: string;
  /** Optional for local servers that use bearer authentication. */
  apiKey?: string;
}

export interface HtmlCssGenerationRequest {
  documentName: string;
  node: {
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    borderRadius: number;
    fill: string;
  };
  children: string[];
}

export interface HtmlCssGeneration {
  html: string;
  css: string;
  summary?: string;
}

export class LocalModelError extends Error {
  public constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'LocalModelError';
  }
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
}

export class OpenAICompatibleIntelligenceProvider implements IntelligenceProvider {
  public readonly id = 'openai-compatible-local';

  public constructor(
    private readonly config: LocalModelConfig,
    private readonly request: typeof fetch = fetch,
  ) {}

  public async generateHtmlCss(
    input: HtmlCssGenerationRequest,
    signal?: AbortSignal,
  ): Promise<HtmlCssGeneration> {
    const endpoint = completionEndpoint(this.config.endpoint);
    if (!this.config.model.trim()) {
      throw new LocalModelError('请先填写本地模型名称。');
    }

    let response: Response;
    try {
      response = await this.request.call(globalThis, endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(this.config.apiKey
            ? { authorization: `Bearer ${this.config.apiKey}` }
            : {}),
        },
        body: JSON.stringify({
          model: this.config.model,
          temperature: 0.1,
          max_tokens: 4096,
          chat_template_kwargs: { enable_thinking: false },
          thinking_budget: 0,
          messages: [
            {
              role: 'system',
              content:
                'You are an HTML and CSS code generator. Create code from the supplied design facts; never repeat or summarize the input facts. Return exactly one compact JSON object shaped like {"html":"<section>...</section>","css":"section { ... }","summary":"optional short note"}. Escape line breaks inside JSON strings. Keep the total response under 1800 tokens. Do not use React, JSX, Markdown fences, JavaScript, external libraries, code comments, or text outside the JSON object.',
            },
            {
              role: 'user',
              content: designFactsPrompt(input),
            },
          ],
        }),
        signal,
      });
    } catch (error) {
      const reason =
        error instanceof Error && error.message
          ? error.message
          : '未知网络错误';
      throw new LocalModelError(
        `无法连接本地模型（请求：${endpoint}；原因：${reason}）。`,
        error,
      );
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    if (!response.ok) {
      throw new LocalModelError(
        payload.error?.message ?? `模型请求失败（${response.status}）。`,
      );
    }

    const content = completionContent(payload);
    if (!content) {
      throw new LocalModelError('本地模型没有返回可用的代码内容。');
    }

    return parseHtmlCss(content);
  }
}

function designFactsPrompt(input: HtmlCssGenerationRequest): string {
  const { node } = input;
  const children =
    input.children.length > 0 ? input.children.join(', ') : 'none';
  return [
    'Generate the HTML and CSS JSON now from these design facts:',
    `Document: ${input.documentName}`,
    `Node: ${node.name}`,
    `Position: x=${node.x}px, y=${node.y}px`,
    `Size: width=${node.width}px, height=${node.height}px`,
    `Border radius: ${node.borderRadius}px`,
    `Fill: ${node.fill}`,
    `Child layers: ${children}`,
    'Do not repeat these facts. Return only the requested html/css JSON object.',
  ].join('\n');
}

function completionEndpoint(endpoint: string): string {
  const normalized = endpoint.trim().replace(/\/$/, '');
  if (!normalized) throw new LocalModelError('请先填写本地模型接口地址。');

  if (!normalized.startsWith('/')) {
    try {
      new URL(normalized);
    } catch (error) {
      throw new LocalModelError('模型接口地址格式不正确。', error);
    }
  }

  return normalized.endsWith('/chat/completions')
    ? normalized
    : `${normalized}/chat/completions`;
}

function completionContent(
  payload: ChatCompletionResponse,
): string | undefined {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content))
    return content.map((item) => item.text ?? '').join('');
  return undefined;
}

function parseHtmlCss(content: string): HtmlCssGeneration {
  const withoutFence = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  const json = withoutFence.match(/\{[\s\S]*\}/)?.[0] ?? withoutFence;

  const parsed = parseJsonCandidate(json);

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof (parsed as HtmlCssGeneration).html !== 'string' ||
    typeof (parsed as HtmlCssGeneration).css !== 'string'
  ) {
    throw new LocalModelError('模型返回缺少 html 或 css 字段。');
  }

  return parsed as HtmlCssGeneration;
}

function parseJsonCandidate(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch (firstError) {
    try {
      return JSON.parse(escapeControlCharactersInStrings(json));
    } catch {
      const preview = json.replace(/\s+/g, ' ').trim().slice(0, 180);
      throw new LocalModelError(
        `模型返回的内容不是有效 JSON。输出开头：${preview || '（空）'}`,
        firstError,
      );
    }
  }
}

function escapeControlCharactersInStrings(json: string): string {
  let result = '';
  let inString = false;
  let escaped = false;

  for (const character of json) {
    if (!inString) {
      if (character === '"') inString = true;
      result += character;
      continue;
    }

    if (escaped) {
      escaped = false;
      result += character;
      continue;
    }

    if (character === '\\') {
      escaped = true;
      result += character;
    } else if (character === '"') {
      inString = false;
      result += character;
    } else if (character === '\n') {
      result += '\\n';
    } else if (character === '\r') {
      result += '\\r';
    } else if (character === '\t') {
      result += '\\t';
    } else {
      result += character;
    }
  }

  return result;
}
