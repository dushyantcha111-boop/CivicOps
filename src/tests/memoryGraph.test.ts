import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFitViewport,
  computeNodeLayout,
  filterGraphElements,
  findMatchingNodeIds,
  getCollapsedHiddenNodeIds
} from '../utils/memoryGraph.ts';
import type { MemoryGraphEdge, MemoryGraphNode } from '../types/index.ts';

const sampleNodes: MemoryGraphNode[] = [
  {
    id: 'tower-tower-b',
    sourceId: 'Tower B',
    sourceType: 'TOWER',
    label: 'Tower B',
    type: 'TOWER',
    category: 'INFRASTRUCTURE',
    status: 'ATTENTION',
    tower: 'Tower B',
    details: '2 monitored assets',
    provenance: 'PostgreSQL: towers'
  },
  {
    id: 'asset-ast-1',
    sourceId: 'ast-1',
    sourceType: 'ASSET',
    label: 'PRV-B4 Booster',
    type: 'ASSET',
    category: 'PLUMBING',
    status: 'DEGRADING',
    tower: 'Tower B',
    details: 'Health 74/100',
    provenance: 'PostgreSQL: assets'
  },
  {
    id: 'comp-cmp-1',
    sourceId: 'cmp-1',
    sourceType: 'COMPLAINT',
    label: 'TKT-089: Low Water Pressure',
    type: 'COMPLAINT',
    category: 'PLUMBING',
    status: 'PROPOSED',
    tower: 'Tower B',
    details: 'Severity: HIGH',
    provenance: 'PostgreSQL: complaints'
  },
  {
    id: 'wo-wo-1',
    sourceId: 'wo-1',
    sourceType: 'WORK_ORDER',
    label: 'WO-101: Replace PRV Kit',
    type: 'WORK_ORDER',
    category: 'CORRECTIVE',
    status: 'IN_PROGRESS',
    tower: 'Tower B',
    details: 'Assigned: Ramesh',
    provenance: 'PostgreSQL: work_orders',
    posX: 710,
    posY: 220,
    pinned: true
  },
  {
    id: 'part-sp-1',
    sourceId: 'sp-1',
    sourceType: 'SPARE_PART',
    label: 'WAT-01: Watts PRV Kit',
    type: 'SPARE_PART',
    category: 'PLUMBING',
    status: 'IN_STOCK',
    tower: 'All Towers',
    details: 'Stock: 4',
    provenance: 'PostgreSQL: spare_parts'
  }
];

const sampleEdges: MemoryGraphEdge[] = [
  {
    id: 'edge-1',
    source: 'asset-ast-1',
    target: 'tower-tower-b',
    relationship: 'LOCATED_IN',
    label: 'Installed in Tower B'
  },
  {
    id: 'edge-2',
    source: 'comp-cmp-1',
    target: 'asset-ast-1',
    relationship: 'AFFECTS_ASSET',
    label: 'Impacts PRV-B4 Booster'
  },
  {
    id: 'edge-3',
    source: 'wo-wo-1',
    target: 'comp-cmp-1',
    relationship: 'RESOLVES_ISSUE',
    label: 'Dispatched for TKT-089'
  },
  {
    id: 'edge-4',
    source: 'wo-wo-1',
    target: 'part-sp-1',
    relationship: 'CONSUMES_SPARE',
    label: 'Allocates Watts PRV Kit'
  }
];

test('computeNodeLayout preserves persisted DB coordinates and local drag overrides', () => {
  const positioned = computeNodeLayout(sampleNodes, { 'comp-cmp-1': { x: 495, y: 185 } }, 560);
  const compNode = positioned.find((n) => n.id === 'comp-cmp-1');
  const woNode = positioned.find((n) => n.id === 'wo-wo-1');
  const towerNode = positioned.find((n) => n.id === 'tower-tower-b');

  assert.equal(compNode?.x, 495);
  assert.equal(compNode?.y, 185);
  assert.equal(woNode?.x, 710);
  assert.equal(woNode?.y, 220);
  assert.equal(towerNode?.x, 110);
});

test('getCollapsedHiddenNodeIds hides exclusive leaf neighbors cleanly without breaking core links', () => {
  const { hiddenIds, collapsedChildCountByRoot } = getCollapsedHiddenNodeIds(
    new Set(['wo-wo-1']),
    sampleNodes,
    sampleEdges
  );

  assert.equal(hiddenIds.has('part-sp-1'), true);
  assert.equal(hiddenIds.has('comp-cmp-1'), false);
  assert.equal(collapsedChildCountByRoot['wo-wo-1'], 1);
});

test('filterGraphElements filters by tower, node type, and relationship without dangling edges', () => {
  const relFiltered = filterGraphElements(sampleNodes, sampleEdges, {
    towerFilter: 'ALL',
    typeFilter: 'ALL',
    relationshipFilter: 'AFFECTS_ASSET'
  });

  assert.equal(relFiltered.edges.length, 1);
  assert.equal(relFiltered.edges[0].id, 'edge-2');
  assert.deepEqual(
    relFiltered.nodes.map((n) => n.id).sort(),
    ['asset-ast-1', 'comp-cmp-1']
  );

  const typeFiltered = filterGraphElements(sampleNodes, sampleEdges, {
    towerFilter: 'Tower B',
    typeFilter: 'COMPLAINT',
    relationshipFilter: 'ALL'
  });
  assert.equal(typeFiltered.nodes.length, 1);
  assert.equal(typeFiltered.edges.length, 0);
});

test('findMatchingNodeIds searches across labels, categories, statuses, and details', () => {
  const byPressure = findMatchingNodeIds(sampleNodes, 'water pressure');
  assert.equal(byPressure.has('comp-cmp-1'), true);
  assert.equal(byPressure.size, 1);

  const byDegrading = findMatchingNodeIds(sampleNodes, 'DEGRADING');
  assert.equal(byDegrading.has('asset-ast-1'), true);
});

test('computeFitViewport computes bounded zoom and centered pan coordinates', () => {
  const positioned = computeNodeLayout(sampleNodes, {}, 560);
  const fit = computeFitViewport(positioned, 960, 560, 70);
  assert.ok(fit.zoom >= 0.55 && fit.zoom <= 1.6);
  assert.equal(Number.isFinite(fit.panX), true);
  assert.equal(Number.isFinite(fit.panY), true);

  const emptyFit = computeFitViewport([]);
  assert.deepEqual(emptyFit, { panX: 0, panY: 0, zoom: 1 });
});
