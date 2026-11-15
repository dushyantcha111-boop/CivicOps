import { MemoryGraphEdge, MemoryGraphNode, MemoryGraphNodeType } from '../types';

export interface PositionedGraphNode extends MemoryGraphNode {
  x: number;
  y: number;
}

export const NODE_TYPE_COLUMN: Record<MemoryGraphNodeType, number> = {
  TOWER: 110,
  ASSET: 280,
  PREVENTIVE_SCHEDULE: 280,
  RECURRENCE_INVESTIGATION: 460,
  COMPLAINT: 460,
  WORK_ORDER: 650,
  SPARE_PART: 650,
  TECHNICIAN: 830
};

export const NODE_TYPE_COLORS: Record<MemoryGraphNodeType, string> = {
  TOWER: '#004ac6',
  ASSET: '#2563eb',
  COMPLAINT: '#dc2626',
  WORK_ORDER: '#007d55',
  TECHNICIAN: '#475569',
  PREVENTIVE_SCHEDULE: '#0891b2',
  RECURRENCE_INVESTIGATION: '#d97706',
  SPARE_PART: '#7c3aed'
};

export const NODE_TYPE_LABELS: Record<MemoryGraphNodeType, string> = {
  TOWER: 'Tower',
  ASSET: 'Asset',
  COMPLAINT: 'Complaint',
  WORK_ORDER: 'Work Order',
  TECHNICIAN: 'Technician',
  PREVENTIVE_SCHEDULE: 'Preventive PM',
  RECURRENCE_INVESTIGATION: 'Recurrence RCA',
  SPARE_PART: 'Spare Part'
};

export function computeNodeLayout(
  nodes: MemoryGraphNode[],
  overrides: Record<string, { x: number; y: number }> = {},
  canvasHeight = 560
): PositionedGraphNode[] {
  const byColumn: Record<number, MemoryGraphNode[]> = {};
  nodes.forEach((node) => {
    const col = NODE_TYPE_COLUMN[node.type] ?? 460;
    byColumn[col] = byColumn[col] || [];
    byColumn[col].push(node);
  });

  const positioned: PositionedGraphNode[] = [];
  Object.entries(byColumn).forEach(([colStr, list]) => {
    const colX = Number(colStr);
    const usableHeight = Math.max(canvasHeight - 60, list.length * 76);
    const spacing = usableHeight / (list.length + 1);

    list.forEach((node, idx) => {
      const manual = overrides[node.id];
      const persistedX = typeof node.posX === 'number' ? node.posX : undefined;
      const persistedY = typeof node.posY === 'number' ? node.posY : undefined;

      positioned.push({
        ...node,
        x: Math.round(manual?.x ?? persistedX ?? colX),
        y: Math.round(manual?.y ?? persistedY ?? spacing * (idx + 1) + 30)
      });
    });
  });

  return positioned;
}

export function getCollapsedHiddenNodeIds(
  collapsedRootIds: Set<string>,
  nodes: MemoryGraphNode[],
  edges: MemoryGraphEdge[]
): { hiddenIds: Set<string>; collapsedChildCountByRoot: Record<string, number> } {
  const hiddenIds = new Set<string>();
  const collapsedChildCountByRoot: Record<string, number> = {};
  if (collapsedRootIds.size === 0) {
    return { hiddenIds, collapsedChildCountByRoot };
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  const degree = new Map<string, number>();
  const neighbors = new Map<string, Set<string>>();

  edges.forEach((e) => {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) return;
    degree.set(e.source, (degree.get(e.source) || 0) + 1);
    degree.set(e.target, (degree.get(e.target) || 0) + 1);
    if (!neighbors.has(e.source)) neighbors.set(e.source, new Set());
    if (!neighbors.has(e.target)) neighbors.set(e.target, new Set());
    neighbors.get(e.source)!.add(e.target);
    neighbors.get(e.target)!.add(e.source);
  });

  collapsedRootIds.forEach((rootId) => {
    if (!nodeIds.has(rootId)) return;
    let count = 0;
    const adj = neighbors.get(rootId) || new Set<string>();
    adj.forEach((nbrId) => {
      if (nbrId === rootId || collapsedRootIds.has(nbrId)) return;
      // Hide leaf neighbors (degree === 1) or nodes exclusively attached to this root
      const nbrNeighbors = neighbors.get(nbrId) || new Set<string>();
      const otherActiveNeighbors = Array.from(nbrNeighbors).filter(
        (id) => id !== rootId && !hiddenIds.has(id)
      );
      if (otherActiveNeighbors.length === 0 || (degree.get(nbrId) || 0) <= 1) {
        hiddenIds.add(nbrId);
        count++;
      }
    });
    collapsedChildCountByRoot[rootId] = count;
  });

  return { hiddenIds, collapsedChildCountByRoot };
}

export function filterGraphElements(
  nodes: MemoryGraphNode[],
  edges: MemoryGraphEdge[],
  options: {
    towerFilter: string;
    typeFilter: string;
    relationshipFilter: string;
    hiddenNodeIds?: Set<string>;
  }
): { nodes: MemoryGraphNode[]; edges: MemoryGraphEdge[] } {
  const { towerFilter, typeFilter, relationshipFilter, hiddenNodeIds } = options;

  let visibleNodes = nodes.filter((n) => {
    if (hiddenNodeIds?.has(n.id)) return false;
    if (towerFilter !== 'ALL' && n.tower !== towerFilter && n.tower !== 'All Towers') return false;
    if (typeFilter !== 'ALL' && n.type !== typeFilter) return false;
    return true;
  });

  const visibleIds = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = edges.filter((e) => {
    if (!visibleIds.has(e.source) || !visibleIds.has(e.target)) return false;
    if (relationshipFilter !== 'ALL' && e.relationship !== relationshipFilter) return false;
    return true;
  });

  // When filtering by relationship, focus nodes to endpoints of matching relationships
  if (relationshipFilter !== 'ALL') {
    const endpointIds = new Set<string>();
    visibleEdges.forEach((e) => {
      endpointIds.add(e.source);
      endpointIds.add(e.target);
    });
    visibleNodes = visibleNodes.filter((n) => endpointIds.has(n.id));
  }

  return { nodes: visibleNodes, edges: visibleEdges };
}

export function findMatchingNodeIds(nodes: MemoryGraphNode[], query: string): Set<string> {
  const q = query.trim().toLowerCase();
  if (!q) return new Set();
  const matched = new Set<string>();
  nodes.forEach((n) => {
    const metaText = n.metadata ? Object.values(n.metadata).join(' ').toLowerCase() : '';
    const haystack = `${n.label} ${n.sourceId} ${n.type} ${n.category} ${n.status} ${n.tower} ${n.details} ${metaText}`.toLowerCase();
    if (haystack.includes(q)) {
      matched.add(n.id);
    }
  });
  return matched;
}

export function computeFitViewport(
  nodes: PositionedGraphNode[],
  svgWidth = 960,
  svgHeight = 560,
  padding = 70
): { panX: number; panY: number; zoom: number } {
  if (nodes.length === 0) {
    return { panX: 0, panY: 0, zoom: 1 };
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  nodes.forEach((n) => {
    minX = Math.min(minX, n.x);
    maxX = Math.max(maxX, n.x);
    minY = Math.min(minY, n.y);
    maxY = Math.max(maxY, n.y);
  });

  const contentW = Math.max(120, maxX - minX + padding * 2);
  const contentH = Math.max(120, maxY - minY + padding * 2);
  const zoom = Math.max(0.55, Math.min(1.6, Math.min(svgWidth / contentW, svgHeight / contentH)));

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return {
    zoom: Math.round(zoom * 100) / 100,
    panX: Math.round(svgWidth / 2 - centerX * zoom),
    panY: Math.round(svgHeight / 2 - centerY * zoom)
  };
}
