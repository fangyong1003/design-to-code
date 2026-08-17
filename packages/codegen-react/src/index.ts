import type {
  CodegenPlan,
  ComponentPlan,
  DesignDocument,
  DesignNode,
  GeneratedArtifact,
  TargetEnvironment,
} from '@d2c/contracts';
import type {
  GenerationContext,
  PlanningContext,
  TargetGenerator,
} from '@d2c/codegen-sdk';

const REACT_TARGET: TargetEnvironment = {
  framework: 'react',
  language: 'typescript',
  styling: 'css-modules',
};

function toIdentifier(value: string, fallback: string): string {
  const words = value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const result = words
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join('');
  const valid = result.replace(/^[^a-zA-Z_]+/, '');
  return valid || fallback;
}

function toCssIdentifier(value: string, fallback: string): string {
  const result = value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return 'node-' + (result || fallback);
}

function safeCss(value: string): string {
  return value.replace(/[{};]/g, '');
}

function canvasSize(nodes: DesignNode[]): { width: number; height: number } {
  let width = 1;
  let height = 1;
  for (const node of nodes) {
    width = Math.max(width, node.bounds.x + node.bounds.width);
    height = Math.max(height, node.bounds.y + node.bounds.height);
  }
  return { width, height };
}

interface PageRender {
  componentName: string;
  outputPath: string;
  source: string;
}

class ReactPageRenderer {
  readonly #classes = new Map<string, string>();
  readonly #usedClasses = new Set<string>();
  readonly #rules: string[] = [];
  #nextClass = 0;

  public renderPage(
    page: DesignDocument['pages'][number],
    componentName: string,
    outputPath: string,
  ): PageRender {
    const pageClass = this.classFor('page-' + page.id, 'page');
    const size = canvasSize(page.nodes);
    this.#rules.push(
      '.' +
        pageClass +
        ' { position: relative; width: ' +
        size.width +
        'px; min-height: ' +
        size.height +
        'px; overflow: hidden; }',
    );

    const body = page.nodes
      .map((node) => this.renderNode(node, false))
      .join('\n        ');
    const source =
      "import styles from '../App.module.css';\n\n" +
      'export function ' +
      componentName +
      '() {\n' +
      '  return (\n' +
      "    <section className={styles['" +
      pageClass +
      "']} data-design-page={" +
      JSON.stringify(page.id) +
      '}>\n' +
      '        ' +
      body +
      '\n' +
      '    </section>\n' +
      '  );\n' +
      '}\n';
    return { componentName, outputPath, source };
  }

  public css(): string {
    return [
      '.app { min-height: 100vh; padding: 24px; background: #f8fafc; }',
      '.app > * + * { margin-top: 24px; }',
      ...this.#rules,
    ].join('\n\n');
  }

  private classFor(id: string, fallback: string): string {
    const existing = this.#classes.get(id);
    if (existing) return existing;

    const base = toCssIdentifier(id, fallback);
    let candidate = base;
    while (this.#usedClasses.has(candidate)) {
      this.#nextClass += 1;
      candidate = base + '-' + this.#nextClass;
    }
    this.#classes.set(id, candidate);
    this.#usedClasses.add(candidate);
    return candidate;
  }

  private renderNode(node: DesignNode, parentUsesFlow: boolean): string {
    const className = this.classFor(node.id, 'element');
    this.addNodeRule(node, className, parentUsesFlow);
    const childUsesFlow =
      node.layout?.mode === 'flex' || node.layout?.mode === 'grid';
    const children = node.children
      .map((child) => this.renderNode(child, childUsesFlow))
      .join('\n        ');
    const classAttribute = "className={styles['" + className + "']}";

    if (node.type === 'text') {
      const text = node.content?.kind === 'text' ? node.content.value : '';
      return '<p ' + classAttribute + '>{' + JSON.stringify(text) + '}</p>';
    }
    if (node.type === 'image') {
      const assetId =
        node.content?.kind === 'image' ? node.content.assetId : '';
      const label = node.name ?? 'Design asset';
      return (
        '<div ' +
        classAttribute +
        ' role="img" aria-label={' +
        JSON.stringify(label) +
        '} data-design-asset={' +
        JSON.stringify(assetId) +
        '} />'
      );
    }

    return (
      '<div ' +
      classAttribute +
      ' data-design-node="' +
      node.type +
      '">\n' +
      '        ' +
      children +
      '\n' +
      '      </div>'
    );
  }

  private addNodeRule(
    node: DesignNode,
    className: string,
    parentUsesFlow: boolean,
  ): void {
    const declarations = ['box-sizing: border-box'];
    if (parentUsesFlow) {
      declarations.push('position: relative');
    } else {
      declarations.push('position: absolute');
      declarations.push('left: ' + node.bounds.x + 'px');
      declarations.push('top: ' + node.bounds.y + 'px');
    }
    declarations.push('width: ' + node.bounds.width + 'px');
    declarations.push('height: ' + node.bounds.height + 'px');

    if (node.visible === false) declarations.push('display: none');
    const style = node.style;
    if (style?.backgroundColor) {
      declarations.push('background-color: ' + safeCss(style.backgroundColor));
    }
    if (style?.color) declarations.push('color: ' + safeCss(style.color));
    if (style?.borderColor) {
      declarations.push(
        'border: ' +
          (style.borderWidth ?? 1) +
          'px solid ' +
          safeCss(style.borderColor),
      );
    }
    if (style?.borderRadius !== undefined) {
      declarations.push('border-radius: ' + style.borderRadius + 'px');
    }
    if (style?.opacity !== undefined)
      declarations.push('opacity: ' + style.opacity);
    if (style?.fontFamily) {
      declarations.push('font-family: ' + safeCss(style.fontFamily));
    }
    if (style?.fontSize !== undefined) {
      declarations.push('font-size: ' + style.fontSize + 'px');
    }
    if (style?.fontWeight !== undefined) {
      declarations.push('font-weight: ' + style.fontWeight);
    }
    if (style?.lineHeight !== undefined) {
      declarations.push('line-height: ' + style.lineHeight + 'px');
    }
    if (style?.textAlign) declarations.push('text-align: ' + style.textAlign);

    if (node.layout?.mode === 'flex') {
      declarations.push('display: flex');
      declarations.push('flex-direction: ' + node.layout.direction);
      if (node.layout.padding) {
        const padding = node.layout.padding;
        declarations.push(
          'padding: ' +
            padding.top +
            'px ' +
            padding.right +
            'px ' +
            padding.bottom +
            'px ' +
            padding.left +
            'px',
        );
      }
      if (node.layout.gap !== undefined) {
        declarations.push('gap: ' + node.layout.gap + 'px');
      }
      if (node.layout.align)
        declarations.push('align-items: ' + node.layout.align);
      if (node.layout.justify) {
        declarations.push('justify-content: ' + node.layout.justify);
      }
    }
    if (node.layout?.mode === 'grid') {
      declarations.push('display: grid');
      declarations.push(
        'grid-template-columns: ' + node.layout.columns.join(' '),
      );
      if (node.layout.rows) {
        declarations.push('grid-template-rows: ' + node.layout.rows.join(' '));
      }
      if (node.layout.gap !== undefined) {
        declarations.push('gap: ' + node.layout.gap + 'px');
      }
    }
    this.#rules.push('.' + className + ' { ' + declarations.join('; ') + '; }');
  }
}

export class ReactGenerator implements TargetGenerator {
  public readonly id = 'react-css-modules';
  public readonly displayName = 'React + CSS Modules';

  public supports(target: TargetEnvironment): boolean {
    return (
      target.framework === 'react' &&
      target.language === 'typescript' &&
      target.styling === 'css-modules'
    );
  }

  public async plan(
    document: DesignDocument,
    context: PlanningContext,
  ): Promise<CodegenPlan> {
    if (!this.supports(context.target)) {
      throw new Error(
        'ReactGenerator only supports React + TypeScript + CSS Modules',
      );
    }
    const usedNames = new Set<string>();
    const components: ComponentPlan[] = document.pages.map((page, index) => {
      let name = toIdentifier(page.name, 'Page' + (index + 1)) + 'Page';
      while (usedNames.has(name)) name += 'Copy';
      usedNames.add(name);
      return {
        id: 'page-' + page.id,
        name,
        sourceNodeIds: page.nodes.map((node) => node.id),
        outputPath: 'src/pages/' + name + '.tsx',
        children: [],
      };
    });

    return {
      version: '1.0',
      target: REACT_TARGET,
      components,
      entrypoints: ['src/App.tsx'],
    };
  }

  public async generate(
    plan: CodegenPlan,
    context: GenerationContext,
  ): Promise<GeneratedArtifact[]> {
    if (!this.supports(plan.target)) {
      throw new Error('The supplied plan is not a React CSS Modules plan');
    }
    if (plan.components.length !== context.document.pages.length) {
      throw new Error(
        'Code generation plan does not match the Design IR page count',
      );
    }

    const renderer = new ReactPageRenderer();
    const pages = context.document.pages.map((page, index) => {
      const component = plan.components[index];
      if (!component)
        throw new Error('Missing plan component for page ' + page.id);
      return renderer.renderPage(page, component.name, component.outputPath);
    });

    const appImports = pages
      .map(
        (page) =>
          'import { ' +
          page.componentName +
          " } from './pages/" +
          page.componentName +
          "';",
      )
      .join('\n');
    const appChildren = pages
      .map((page) => '      <' + page.componentName + ' />')
      .join('\n');
    const app =
      "import styles from './App.module.css';\n" +
      appImports +
      '\n\n' +
      'export default function App() {\n' +
      '  return (\n' +
      '    <main className={styles.app}>\n' +
      appChildren +
      '\n' +
      '    </main>\n' +
      '  );\n' +
      '}\n';

    const unresolvedAssets = context.document.assets
      .filter((asset) => asset.path.startsWith('sketch://'))
      .map((asset) => asset.id);
    const manifest = {
      generator: this.id,
      target: plan.target,
      pages: pages.map((page) => page.componentName),
      unresolvedAssets,
    };

    return [
      { path: 'src/App.tsx', kind: 'source', content: app },
      {
        path: 'src/App.module.css',
        kind: 'style',
        content: renderer.css() + '\n',
      },
      ...pages.map((page) => ({
        path: page.outputPath,
        kind: 'source' as const,
        content: page.source,
      })),
      {
        path: 'design-to-code.manifest.json',
        kind: 'manifest',
        content: JSON.stringify(manifest, null, 2) + '\n',
      },
    ];
  }
}
