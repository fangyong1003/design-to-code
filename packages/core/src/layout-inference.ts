import type { DesignDocument, DesignNode, LayoutSpec } from '@d2c/contracts';

import type { AnalysisContext, DesignPass } from './pipeline.js';

const ALIGNMENT_TOLERANCE = 4;
const GAP_TOLERANCE = 4;

type Axis = 'x' | 'y';
type Direction = 'row' | 'column';

interface FlexCandidate {
  direction: Direction;
  gap: number;
  align: 'start' | 'center' | 'end';
  padding: { top: number; right: number; bottom: number; left: number };
  confidence: number;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function visibleChildren(node: DesignNode): DesignNode[] {
  return node.children.filter((child) => child.visible !== false);
}

function sortByAxis(nodes: DesignNode[], axis: Axis): DesignNode[] {
  return [...nodes].sort(
    (left, right) => left.bounds[axis] - right.bounds[axis],
  );
}

function end(node: DesignNode, axis: Axis): number {
  return (
    node.bounds[axis] + (axis === 'x' ? node.bounds.width : node.bounds.height)
  );
}

function crossStart(node: DesignNode, direction: Direction): number {
  return direction === 'column' ? node.bounds.x : node.bounds.y;
}

function crossEnd(node: DesignNode, direction: Direction): number {
  return direction === 'column'
    ? node.bounds.x + node.bounds.width
    : node.bounds.y + node.bounds.height;
}

function crossCenter(node: DesignNode, direction: Direction): number {
  return (crossStart(node, direction) + crossEnd(node, direction)) / 2;
}

function maxDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean =
    values.reduce((total, value) => total + value, 0) / values.length;
  return Math.max(...values.map((value) => Math.abs(value - mean)));
}

function inferCrossAlignment(
  nodes: DesignNode[],
  direction: Direction,
): { alignment: 'start' | 'center' | 'end'; deviation: number } | null {
  const starts = nodes.map((node) => crossStart(node, direction));
  const centers = nodes.map((node) => crossCenter(node, direction));
  const ends = nodes.map((node) => crossEnd(node, direction));
  const candidates = [
    { alignment: 'start' as const, deviation: maxDeviation(starts) },
    { alignment: 'center' as const, deviation: maxDeviation(centers) },
    { alignment: 'end' as const, deviation: maxDeviation(ends) },
  ].sort((left, right) => left.deviation - right.deviation);
  const candidate = candidates[0];
  if (!candidate || candidate.deviation > ALIGNMENT_TOLERANCE) return null;
  return candidate;
}

function inferGap(
  nodes: DesignNode[],
  axis: Axis,
): { gap: number; deviation: number } | null {
  const sorted = sortByAxis(nodes, axis);
  const gaps: number[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (!previous || !current) continue;
    const gap = current.bounds[axis] - end(previous, axis);
    if (gap < -ALIGNMENT_TOLERANCE) return null;
    gaps.push(gap);
  }
  if (gaps.length === 0) return null;
  const average = gaps.reduce((total, value) => total + value, 0) / gaps.length;
  const deviation = maxDeviation(gaps);
  if (deviation > GAP_TOLERANCE) return null;
  return { gap: round(average), deviation };
}

function inferPadding(
  parent: DesignNode,
  children: DesignNode[],
): FlexCandidate['padding'] {
  const left = Math.max(
    0,
    Math.min(...children.map((child) => child.bounds.x)),
  );
  const top = Math.max(0, Math.min(...children.map((child) => child.bounds.y)));
  const right = Math.max(
    0,
    parent.bounds.width -
      Math.max(...children.map((child) => child.bounds.x + child.bounds.width)),
  );
  const bottom = Math.max(
    0,
    parent.bounds.height -
      Math.max(
        ...children.map((child) => child.bounds.y + child.bounds.height),
      ),
  );
  return {
    top: round(top),
    right: round(right),
    bottom: round(bottom),
    left: round(left),
  };
}

function inferFlex(parent: DesignNode): FlexCandidate | null {
  if (parent.layout || parent.children.length < 2) return null;
  const children = visibleChildren(parent);
  if (children.length < 2) return null;

  const candidates: FlexCandidate[] = [];
  for (const [direction, axis] of [
    ['column', 'y'],
    ['row', 'x'],
  ] as const) {
    const alignment = inferCrossAlignment(children, direction);
    const gap = inferGap(children, axis);
    if (!alignment || !gap) continue;
    const confidence = Math.max(
      0,
      Math.min(
        1,
        1 -
          (alignment.deviation / ALIGNMENT_TOLERANCE +
            gap.deviation / GAP_TOLERANCE) /
            2,
      ),
    );
    candidates.push({
      direction,
      gap: gap.gap,
      align: alignment.alignment,
      padding: inferPadding(parent, children),
      confidence: round(confidence),
    });
  }
  candidates.sort((left, right) => right.confidence - left.confidence);
  return candidates[0] ?? null;
}

function applyInference(node: DesignNode): DesignNode {
  const children = node.children.map(applyInference);
  const candidate = inferFlex({ ...node, children });
  const layout: LayoutSpec | undefined = candidate
    ? {
        mode: 'flex',
        direction: candidate.direction,
        gap: candidate.gap,
        align: candidate.align,
        padding: candidate.padding,
        confidence: candidate.confidence,
      }
    : node.layout;
  return { ...node, children, layout };
}

export class LayoutInferencePass implements DesignPass {
  public readonly id = 'layout-inference';

  public async run(
    document: DesignDocument,
    _context: AnalysisContext,
  ): Promise<DesignDocument> {
    return {
      ...document,
      pages: document.pages.map((page) => ({
        ...page,
        nodes: page.nodes.map(applyInference),
      })),
    };
  }
}
