import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';
import {
  MemoryGraphData,
  MemoryGraphEdge,
  MemoryGraphNode,
  MemoryGraphNodeDetail,
  MemoryGraphPathResult
} from '../../types';
import {
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  PositionedGraphNode,
  computeFitViewport,
  computeNodeLayout,
  filterGraphElements,
  findMatchingNodeIds,
  getCollapsedHiddenNodeIds
} from '../../utils/memoryGraph';

const SVG_WIDTH = 960;
const SVG_HEIGHT = 560;

export const CommunityMemoryGraphView: React.FC = () => {
  const { role, setSelectedComplaintId, setSelectedWorkOrderId, setActiveTab, showToast } = useApp();

  const [graphData, setGraphData] = useState<MemoryGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & search
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [towerFilter, setTowerFilter] = useState<string>('ALL');
  const [relationshipFilter, setRelationshipFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchingBackend, setIsSearchingBackend] = useState(false);

  // Selection & Inspector state
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>('');
  const [nodeDetail, setNodeDetail] = useState<MemoryGraphNodeDetail | null>(null);
  const [loadingNodeDetail, setLoadingNodeDetail] = useState(false);
  const [expandingNodeId, setExpandingNodeId] = useState<string | null>(null);

  // Collapse, path finding, and layout persistence
  const [collapsedRootIds, setCollapsedRootIds] = useState<Set<string>>(new Set());
  const [pathFromId, setPathFromId] = useState<string>('');
  const [pathToId, setPathToId] = useState<string>('');
  const [pathResult, setPathResult] = useState<MemoryGraphPathResult | null>(null);
  const [findingPath, setFindingPath] = useState(false);
  const [showPathBar, setShowPathBar] = useState(false);

  // Pan, zoom, drag coordinates
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [nodeOverrides, setNodeOverrides] = useState<Record<string, { x: number; y: number }>>({});
  const [hasUnsavedLayout, setHasUnsavedLayout] = useState(false);
  const [savingLayout, setSavingLayout] = useState(false);
  const [viewMode, setViewMode] = useState<'TOPOLOGY' | 'TREE' | 'MATRIX'>('TOPOLOGY');

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{
    mode: 'NONE' | 'PAN' | 'NODE';
    nodeId?: string;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
    moved: boolean;
  }>({
    mode: 'NONE',
    startClientX: 0,
    startClientY: 0,
    originX: 0,
    originY: 0,
    moved: false
  });

  const canSaveLayout = role === 'MANAGEMENT' || role === 'MAINTENANCE' || role === 'ADMIN';

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiService.getMemoryGraph();
      setGraphData(data);
      setNodeOverrides({});
      setHasUnsavedLayout(false);
      setPathResult(null);
      if (data.nodes.length > 0) {
        setSelectedNodeId((prev) =>
          prev && data.nodes.some((n) => n.id === prev) ? prev : data.nodes[0].id
        );
        setPathFromId((prev) => (prev && data.nodes.some((n) => n.id === prev) ? prev : data.nodes[0].id));
        setPathToId((prev) =>
          prev && data.nodes.some((n) => n.id === prev)
            ? prev
            : data.nodes[data.nodes.length - 1].id
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Community Memory Graph');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Fetch live PostgreSQL node provenance & connected relationships when selecting a node
  useEffect(() => {
    if (!selectedNodeId || !graphData?.nodes.some((n) => n.id === selectedNodeId)) {
      setNodeDetail(null);
      return;
    }
    let cancelled = false;
    setLoadingNodeDetail(true);
    ApiService.getMemoryGraphNode(selectedNodeId)
      .then((detail) => {
        if (!cancelled) setNodeDetail(detail);
      })
      .catch(() => {
        if (!cancelled) setNodeDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingNodeDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedNodeId, graphData]);

  const towersList = useMemo(() => {
    const set = new Set<string>();
    (graphData?.nodes || []).forEach((n) => {
      if (n.tower && n.tower !== 'All Towers') set.add(n.tower);
    });
    return Array.from(set).sort();
  }, [graphData]);

  const relationshipTypes = useMemo(() => {
    const set = new Set<string>(graphData?.availableRelationships || []);
    (graphData?.edges || []).forEach((e) => set.add(e.relationship));
    return Array.from(set).sort();
  }, [graphData]);

  const nodeTypesPresent = useMemo(() => {
    const set = new Set<string>(graphData?.availableNodeTypes || []);
    (graphData?.nodes || []).forEach((n) => set.add(n.type));
    return Array.from(set);
  }, [graphData]);

  const { hiddenIds, collapsedChildCountByRoot } = useMemo(
    () =>
      getCollapsedHiddenNodeIds(
        collapsedRootIds,
        graphData?.nodes || [],
        graphData?.edges || []
      ),
    [collapsedRootIds, graphData]
  );

  const { nodes: filteredNodes, edges: filteredEdges } = useMemo(
    () =>
      filterGraphElements(graphData?.nodes || [], graphData?.edges || [], {
        towerFilter,
        typeFilter,
        relationshipFilter,
        hiddenNodeIds: hiddenIds
      }),
    [graphData, towerFilter, typeFilter, relationshipFilter, hiddenIds]
  );

  const positionedNodes = useMemo<PositionedGraphNode[]>(
    () => computeNodeLayout(filteredNodes, nodeOverrides, SVG_HEIGHT),
    [filteredNodes, nodeOverrides]
  );

  const nodeMap = useMemo(() => {
    const map = new Map<string, PositionedGraphNode>();
    positionedNodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [positionedNodes]);

  const matchedSearchIds = useMemo(
    () => findMatchingNodeIds(filteredNodes, searchQuery),
    [filteredNodes, searchQuery]
  );

  const pathNodeSet = useMemo(
    () => new Set(pathResult?.found ? pathResult.pathNodeIds : []),
    [pathResult]
  );
  const pathEdgeSet = useMemo(
    () => new Set(pathResult?.found ? pathResult.pathEdgeIds : []),
    [pathResult]
  );

  const selectedNode =
    positionedNodes.find((n) => n.id === selectedNodeId) || null;
  const selectedEdge: MemoryGraphEdge | null =
    filteredEdges.find((e) => e.id === selectedEdgeId) || null;

  const connectedEdges = useMemo(() => {
    if (!selectedNode) return [];
    return (graphData?.edges || []).filter(
      (e) => e.source === selectedNode.id || e.target === selectedNode.id
    );
  }, [graphData, selectedNode]);

  // SVG Coordinate Conversion
  const clientToSvgPoint = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scaleX = SVG_WIDTH / Math.max(1, rect.width);
    const scaleY = SVG_HEIGHT / Math.max(1, rect.height);
    const viewX = (clientX - rect.left) * scaleX;
    const viewY = (clientY - rect.top) * scaleY;
    return {
      x: (viewX - pan.x) / zoom,
      y: (viewY - pan.y) / zoom
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    dragRef.current = {
      mode: 'PAN',
      startClientX: e.clientX,
      startClientY: e.clientY,
      originX: pan.x,
      originY: pan.y,
      moved: false
    };
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: PositionedGraphNode) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    dragRef.current = {
      mode: 'NODE',
      nodeId: node.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      originX: node.x,
      originY: node.y,
      moved: false
    };
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const state = dragRef.current;
    if (state.mode === 'NONE') return;

    const dxPx = e.clientX - state.startClientX;
    const dyPx = e.clientY - state.startClientY;
    if (Math.hypot(dxPx, dyPx) > 4) {
      state.moved = true;
    }
    if (!state.moved) return;

    const svg = svgRef.current;
    const rect = svg?.getBoundingClientRect();
    const viewScaleX = rect ? SVG_WIDTH / Math.max(1, rect.width) : 1;
    const viewScaleY = rect ? SVG_HEIGHT / Math.max(1, rect.height) : 1;

    if (state.mode === 'PAN') {
      setPan({
        x: Math.round(state.originX + dxPx * viewScaleX),
        y: Math.round(state.originY + dyPx * viewScaleY)
      });
    } else if (state.mode === 'NODE' && state.nodeId) {
      const nextX = Math.round(state.originX + (dxPx * viewScaleX) / zoom);
      const nextY = Math.round(state.originY + (dyPx * viewScaleY) / zoom);
      const targetId = state.nodeId;
      setNodeOverrides((prev) => ({
        ...prev,
        [targetId]: { x: nextX, y: nextY }
      }));
      setHasUnsavedLayout(true);
    }
  };

  const handleSvgMouseUp = () => {
    dragRef.current.mode = 'NONE';
  };

  const handleWheelZoom = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.max(0.45, Math.min(2.4, Math.round(prev * factor * 100) / 100)));
  };

  const handleFitToScreen = () => {
    const fitted = computeFitViewport(positionedNodes, SVG_WIDTH, SVG_HEIGHT);
    setZoom(fitted.zoom);
    setPan({ x: fitted.panX, y: fitted.panY });
  };

  const handleResetGraph = async () => {
    setTypeFilter('ALL');
    setTowerFilter('ALL');
    setRelationshipFilter('ALL');
    setSearchQuery('');
    setCollapsedRootIds(new Set());
    setPathResult(null);
    setSelectedEdgeId('');
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setNodeOverrides({});
    setHasUnsavedLayout(false);
    await fetchGraph();
    showToast('Memory Graph reset to live baseline.');
  };

  const handleSaveLayout = async () => {
    if (!canSaveLayout) return;
    setSavingLayout(true);
    try {
      const payload = positionedNodes.map((n) => ({
        nodeId: n.id,
        posX: n.x,
        posY: n.y,
        pinned: Boolean(nodeOverrides[n.id] || n.pinned)
      }));
      await ApiService.saveMemoryGraphLayout(payload);
      setHasUnsavedLayout(false);
      showToast('Graph layout positions persisted to PostgreSQL.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save layout', 'error');
    } finally {
      setSavingLayout(false);
    }
  };

  const handleResetPersistedLayout = async () => {
    if (!canSaveLayout) return;
    setSavingLayout(true);
    try {
      await ApiService.resetMemoryGraphLayout();
      setNodeOverrides({});
      setHasUnsavedLayout(false);
      await fetchGraph();
      showToast('Persisted coordinates cleared; restored hierarchical layout.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to reset persisted layout', 'error');
    } finally {
      setSavingLayout(false);
    }
  };

  const handleBackendSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearchingBackend(true);
    try {
      const res = await ApiService.searchMemoryGraph(searchQuery.trim());
      if (res.nodes.length === 0) {
        showToast(`No graph entities matched "${searchQuery.trim()}".`, 'info');
        return;
      }
      const match = res.nodes[0];
      setSelectedNodeId(match.id);
      setSelectedEdgeId('');
      const pos = nodeMap.get(match.id);
      if (pos) {
        setPan({
          x: Math.round(SVG_WIDTH / 2 - pos.x * zoom),
          y: Math.round(SVG_HEIGHT / 2 - pos.y * zoom)
        });
      }
      showToast(`Found ${res.nodes.length} related node(s) in Memory Graph.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Graph search failed', 'error');
    } finally {
      setIsSearchingBackend(false);
    }
  };

  const handleExpandConnected = async (nodeId: string) => {
    setExpandingNodeId(nodeId);
    try {
      const expanded = await ApiService.expandMemoryGraphNode(nodeId);
      setCollapsedRootIds((prev) => {
        const next = new Set(prev);
        next.delete(nodeId);
        return next;
      });
      setGraphData((prev) => {
        if (!prev) return prev;
        const existingNodeIds = new Set(prev.nodes.map((n) => n.id));
        const existingEdgeIds = new Set(prev.edges.map((e) => e.id));
        const mergedNodes = [...prev.nodes];
        const mergedEdges = [...prev.edges];
        expanded.nodes.forEach((n) => {
          if (!existingNodeIds.has(n.id)) mergedNodes.push(n);
        });
        expanded.edges.forEach((e) => {
          if (!existingEdgeIds.has(e.id)) mergedEdges.push(e);
        });
        return {
          ...prev,
          nodes: mergedNodes,
          edges: mergedEdges,
          totalNodes: mergedNodes.length,
          totalEdges: mergedEdges.length
        };
      });
      showToast(`Expanded ${expanded.nodes.length - 1} connected entity node(s) from PostgreSQL.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to expand node relationships', 'error');
    } finally {
      setExpandingNodeId(null);
    }
  };

  const handleToggleCollapseBranch = (nodeId: string) => {
    setCollapsedRootIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleFindPath = async () => {
    if (!pathFromId || !pathToId) {
      showToast('Select both source and target nodes to trace a causal path.', 'error');
      return;
    }
    setFindingPath(true);
    try {
      const result = await ApiService.findMemoryGraphPath(pathFromId, pathToId);
      setPathResult(result);
      if (result.found) {
        showToast(`Discovered ${result.hopCount}-hop operational path.`);
      } else {
        showToast('No connecting path exists between those two nodes in your authorized graph.', 'info');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Path calculation failed', 'error');
    } finally {
      setFindingPath(false);
    }
  };

  const handleExportJson = () => {
    if (!graphData) return;
    const blob = new Blob([JSON.stringify(graphData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `civicops-memory-graph-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Memory graph snapshot exported.');
  };

  const canDeepNavigate = (node: MemoryGraphNode) => {
    if (node.sourceType === 'COMPLAINT') return role !== 'SECURITY';
    if (node.sourceType === 'WORK_ORDER') return role === 'MANAGEMENT' || role === 'MAINTENANCE' || role === 'ADMIN';
    if (node.sourceType === 'ASSET' || node.sourceType === 'PREVENTIVE_SCHEDULE' || node.sourceType === 'RECURRENCE_INVESTIGATION' || node.sourceType === 'SPARE_PART') {
      return role === 'MANAGEMENT' || role === 'MAINTENANCE' || role === 'ADMIN';
    }
    return false;
  };

  const handleDeepNavigate = (node: MemoryGraphNode) => {
    if (node.sourceType === 'COMPLAINT') {
      setSelectedComplaintId(node.sourceId);
      setActiveTab('resolution-timeline');
    } else if (node.sourceType === 'WORK_ORDER') {
      setSelectedWorkOrderId(node.sourceId);
      setActiveTab('work-order-details');
    } else if (node.sourceType === 'ASSET') {
      setActiveTab('asset-register');
    } else if (node.sourceType === 'PREVENTIVE_SCHEDULE') {
      setActiveTab('preventive-maintenance');
    } else if (node.sourceType === 'RECURRENCE_INVESTIGATION') {
      setActiveTab('recurrence-review-queue');
    } else if (node.sourceType === 'SPARE_PART') {
      setActiveTab('spares-inventory');
    }
  };

  // Prevent unused warning for coordinate helper if needed
  void clientToSvgPoint;

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto space-y-5 pb-16">
      {/* Resident privacy notice */}
      {role === 'RESIDENT' && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 text-xs text-blue-900 flex items-center gap-2.5">
          <span className="material-symbols-outlined text-primary text-[20px]">shield_lock</span>
          <span>
            <strong>Resident Privacy Scope Active:</strong> Showing your own submitted tickets, linked work order statuses, and permitted tower infrastructure only. Private neighbor complaints and internal supplier records remain hidden.
          </span>
        </div>
      )}

      {/* Top Controls & Filters */}
      <div className="bg-slate-50 border border-slate-200 px-5 py-3.5 rounded-2xl shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* View Mode */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setViewMode('TOPOLOGY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'TOPOLOGY' ? 'bg-primary text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">hub</span>
              <span>Interactive Graph</span>
            </button>
            <button
              onClick={() => setViewMode('TREE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'TREE' ? 'bg-primary text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">account_tree</span>
              <span>Entities ({positionedNodes.length})</span>
            </button>
            <button
              onClick={() => setViewMode('MATRIX')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'MATRIX' ? 'bg-primary text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">view_timeline</span>
              <span>Edges ({filteredEdges.length})</span>
            </button>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleBackendSearch} className="flex items-center gap-1.5 flex-1 max-w-sm min-w-[220px]">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 flex-1 shadow-2xs">
              <span className="material-symbols-outlined text-[16px] text-slate-400">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket, asset, tower, tech..."
                className="text-xs bg-transparent outline-none w-full text-slate-800"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <span className="material-symbols-outlined text-[15px]">close</span>
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearchingBackend || !searchQuery.trim()}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold"
            >
              {isSearchingBackend ? '...' : 'Focus'}
            </button>
          </form>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowPathBar((v) => !v)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold shadow-2xs flex items-center gap-1.5 ${
                showPathBar || pathResult?.found
                  ? 'bg-emerald-600 text-white border-emerald-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">route</span>
              <span>Trace Path</span>
            </button>
            <button
              onClick={handleResetGraph}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold shadow-2xs flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              <span>Reset Graph</span>
            </button>
            <button
              onClick={handleExportJson}
              disabled={!graphData}
              className="px-3 py-1.5 rounded-lg bg-primary hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-2xs flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Filter & Zoom Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/70">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-semibold">
              <span className="text-slate-500">Tower:</span>
              <select
                value={towerFilter}
                onChange={(e) => setTowerFilter(e.target.value)}
                className="bg-transparent text-slate-800 font-bold outline-none"
              >
                <option value="ALL">All Towers</option>
                {towersList.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-semibold">
              <span className="text-slate-500">Node:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-transparent text-slate-800 font-bold outline-none"
              >
                <option value="ALL">All Types</option>
                {nodeTypesPresent.map((t) => (
                  <option key={t} value={t}>
                    {NODE_TYPE_LABELS[t as keyof typeof NODE_TYPE_LABELS] || t}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-semibold">
              <span className="text-slate-500">Relation:</span>
              <select
                value={relationshipFilter}
                onChange={(e) => setRelationshipFilter(e.target.value)}
                className="bg-transparent text-slate-800 font-bold outline-none"
              >
                <option value="ALL">All Relationships</option>
                {relationshipTypes.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {searchQuery.trim() && (
              <span className="px-2 py-1 rounded-lg bg-amber-100 text-amber-800 text-[11px] font-bold">
                {matchedSearchIds.size} match(es) highlighted
              </span>
            )}
          </div>

          {/* Canvas Viewport Controls */}
          {viewMode === 'TOPOLOGY' && (
            <div className="flex items-center gap-1.5">
              {canSaveLayout && hasUnsavedLayout && (
                <button
                  onClick={handleSaveLayout}
                  disabled={savingLayout}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">save</span>
                  <span>{savingLayout ? 'Saving...' : 'Save Layout'}</span>
                </button>
              )}
              {canSaveLayout && (graphData?.nodes || []).some((n) => n.pinned) && (
                <button
                  onClick={handleResetPersistedLayout}
                  disabled={savingLayout}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold"
                  title="Clear saved node coordinates in PostgreSQL"
                >
                  Unpin All
                </button>
              )}
              <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden text-xs font-bold text-slate-700">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.45, Math.round((z - 0.15) * 100) / 100))}
                  className="px-2 py-1 hover:bg-slate-100"
                  title="Zoom Out"
                >
                  −
                </button>
                <span className="px-2 py-1 border-x border-slate-200 font-mono text-[11px] min-w-[46px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(2.4, Math.round((z + 0.15) * 100) / 100))}
                  className="px-2 py-1 hover:bg-slate-100"
                  title="Zoom In"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={handleFitToScreen}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1"
                title="Fit graph to canvas"
              >
                <span className="material-symbols-outlined text-[15px]">fit_screen</span>
                <span>Fit</span>
              </button>
            </div>
          )}
        </div>

        {/* Relationship Path Explorer Bar */}
        {showPathBar && (
          <div className="pt-2.5 border-t border-slate-200/70 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-emerald-600">alt_route</span>
              <span>Causal Path Explorer:</span>
            </span>
            <select
              value={pathFromId}
              onChange={(e) => setPathFromId(e.target.value)}
              className="h-8 px-2 text-xs rounded-lg border border-slate-200 bg-white max-w-[220px]"
            >
              {(graphData?.nodes || []).map((n) => (
                <option key={n.id} value={n.id}>
                  [{n.type}] {n.label}
                </option>
              ))}
            </select>
            <span className="text-xs font-bold text-slate-400">→</span>
            <select
              value={pathToId}
              onChange={(e) => setPathToId(e.target.value)}
              className="h-8 px-2 text-xs rounded-lg border border-slate-200 bg-white max-w-[220px]"
            >
              {(graphData?.nodes || []).map((n) => (
                <option key={n.id} value={n.id}>
                  [{n.type}] {n.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleFindPath}
              disabled={findingPath}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
            >
              {findingPath ? 'Tracing...' : 'Find Shortest Path'}
            </button>
            {pathResult && (
              <button
                type="button"
                onClick={() => setPathResult(null)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-bold"
              >
                Clear Path
              </button>
            )}
          </div>
        )}

        {/* Color Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 font-medium pt-1">
          {Object.entries(NODE_TYPE_LABELS).map(([typeKey, label]) => (
            <span key={typeKey} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: NODE_TYPE_COLORS[typeKey as keyof typeof NODE_TYPE_COLORS] }}
              ></span>
              {label}
            </span>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center text-xs text-slate-500">
          Building live PostgreSQL correlation graph...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-xs text-red-700 flex items-center justify-between gap-4">
          <span className="font-semibold">{error}</span>
          <button
            onClick={fetchGraph}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg font-bold"
          >
            Retry
          </button>
        </div>
      ) : positionedNodes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-2">
          <p className="text-sm font-bold text-slate-800">No graph nodes match the active filter criteria.</p>
          <button
            onClick={handleResetGraph}
            className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Interactive Canvas */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs relative min-h-[560px] flex flex-col justify-between overflow-hidden">
            {viewMode === 'TOPOLOGY' && (
              <div className="w-full h-[540px] relative select-none">
                <div className="absolute top-2 left-2 z-10 px-2.5 py-1 rounded-lg bg-white/90 border border-slate-200 text-[10px] font-semibold text-slate-500 pointer-events-none">
                  Drag nodes to reposition • Drag canvas to pan • Scroll to zoom • Click edge to inspect relation
                </div>
                <svg
                  ref={svgRef}
                  className="w-full h-full cursor-grab active:cursor-grabbing rounded-xl border border-slate-100"
                  viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleSvgMouseMove}
                  onMouseUp={handleSvgMouseUp}
                  onMouseLeave={handleSvgMouseUp}
                  onWheel={handleWheelZoom}
                >
                  <defs>
                    <pattern id="civicops-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" strokeWidth="1" />
                    </pattern>
                    <marker
                      id="arrow-default"
                      viewBox="0 0 10 10"
                      refX="24"
                      refY="5"
                      markerWidth="5"
                      markerHeight="5"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />
                    </marker>
                    <marker
                      id="arrow-active"
                      viewBox="0 0 10 10"
                      refX="24"
                      refY="5"
                      markerWidth="5.5"
                      markerHeight="5.5"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#004ac6" />
                    </marker>
                    <marker
                      id="arrow-path"
                      viewBox="0 0 10 10"
                      refX="24"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#059669" />
                    </marker>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#civicops-grid)" />

                  <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                    {/* Edges */}
                    {filteredEdges.map((edge) => {
                      const source = nodeMap.get(edge.source);
                      const target = nodeMap.get(edge.target);
                      if (!source || !target) return null;

                      const isSelectedEdge = selectedEdge?.id === edge.id;
                      const isOnPath = pathEdgeSet.has(edge.id);
                      const isNodeHighlighted =
                        selectedNode?.id === edge.source || selectedNode?.id === edge.target;

                      const stroke = isOnPath
                        ? '#059669'
                        : isSelectedEdge || isNodeHighlighted
                        ? '#004ac6'
                        : '#cbd5e1';
                      const strokeWidth = isOnPath || isSelectedEdge ? 3 : isNodeHighlighted ? 2.2 : 1.3;
                      const markerEnd = isOnPath
                        ? 'url(#arrow-path)'
                        : isSelectedEdge || isNodeHighlighted
                        ? 'url(#arrow-active)'
                        : 'url(#arrow-default)';

                      const midX = (source.x + target.x) / 2;
                      const midY = (source.y + target.y) / 2;

                      return (
                        <g
                          key={edge.id}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setSelectedEdgeId(edge.id);
                          }}
                          className="cursor-pointer"
                        >
                          <line
                            x1={source.x}
                            y1={source.y}
                            x2={target.x}
                            y2={target.y}
                            stroke={stroke}
                            strokeWidth={strokeWidth}
                            markerEnd={markerEnd}
                          />
                          {/* Generous hit target for edge selection */}
                          <line
                            x1={source.x}
                            y1={source.y}
                            x2={target.x}
                            y2={target.y}
                            stroke="transparent"
                            strokeWidth={12}
                          />
                          {(isSelectedEdge || isOnPath || isNodeHighlighted) && (
                            <g transform={`translate(${midX}, ${midY})`}>
                              <rect
                                x={-48}
                                y={-9}
                                width={96}
                                height={16}
                                rx={4}
                                fill={isOnPath ? '#ecfdf5' : '#eff6ff'}
                                stroke={isOnPath ? '#10b981' : '#93c5fd'}
                                strokeWidth={0.8}
                              />
                              <text
                                x={0}
                                y={2}
                                fontSize="7.5"
                                fontWeight="bold"
                                textAnchor="middle"
                                fill={isOnPath ? '#065f46' : '#1e40af'}
                              >
                                {edge.relationship}
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}

                    {/* Nodes */}
                    {positionedNodes.map((node) => {
                      const isSelected = selectedNode?.id === node.id && !selectedEdge;
                      const isSearchMatch = matchedSearchIds.has(node.id);
                      const isOnPath = pathNodeSet.has(node.id);
                      const collapsedCount = collapsedChildCountByRoot[node.id] || 0;
                      const color = NODE_TYPE_COLORS[node.type] || '#2563eb';
                      const shortLabel =
                        node.label.length > 22 ? `${node.label.slice(0, 20)}…` : node.label;

                      return (
                        <g
                          key={node.id}
                          onMouseDown={(ev) => handleNodeMouseDown(ev, node)}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            if (!dragRef.current.moved) {
                              setSelectedEdgeId('');
                              setSelectedNodeId(node.id);
                            }
                          }}
                          className="cursor-pointer"
                        >
                          {(isSearchMatch || isOnPath) && (
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={26}
                              fill="none"
                              stroke={isOnPath ? '#10b981' : '#f59e0b'}
                              strokeWidth={2.5}
                              strokeDasharray="4 2"
                            />
                          )}
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={isSelected ? 21 : 17}
                            fill="#ffffff"
                            stroke={color}
                            strokeWidth={isSelected ? 3.5 : 2}
                          />
                          <circle cx={node.x} cy={node.y} r="10" fill={color} />
                          {(nodeOverrides[node.id] || node.pinned) && (
                            <circle cx={node.x + 14} cy={node.y - 14} r="4" fill="#0f172a" />
                          )}
                          {collapsedCount > 0 && (
                            <g transform={`translate(${node.x + 15}, ${node.y + 12})`}>
                              <circle r="8" fill="#f59e0b" />
                              <text
                                x={0}
                                y={3}
                                fontSize="8"
                                fontWeight="bold"
                                textAnchor="middle"
                                fill="#ffffff"
                              >
                                +{collapsedCount}
                              </text>
                            </g>
                          )}
                          <text
                            x={node.x}
                            y={node.y + 31}
                            fill="#0f172a"
                            fontSize="9.5"
                            fontWeight={isSelected || isSearchMatch ? 'bold' : '600'}
                            textAnchor="middle"
                          >
                            {shortLabel}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                </svg>
              </div>
            )}

            {viewMode === 'TREE' && (
              <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
                {positionedNodes.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      setSelectedEdgeId('');
                      setSelectedNodeId(n.id);
                    }}
                    className={`p-3 cursor-pointer flex items-center justify-between text-xs ${
                      selectedNode?.id === n.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-slate-900">{n.label}</span>
                      <span className="block text-[11px] text-slate-500">
                        {n.type} • {n.tower} • {n.provenance || 'PostgreSQL'}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                      {n.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'MATRIX' && (
              <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto text-xs">
                {filteredEdges.map((e) => {
                  const s = nodeMap.get(e.source);
                  const t = nodeMap.get(e.target);
                  return (
                    <div
                      key={e.id}
                      onClick={() => setSelectedEdgeId(e.id)}
                      className={`p-3 flex items-center justify-between gap-2 cursor-pointer ${
                        selectedEdge?.id === e.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-semibold text-slate-900">{s?.label || e.source}</span>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-primary font-mono text-[10px] font-bold">
                        {e.relationship}
                      </span>
                      <span className="font-semibold text-slate-900 text-right">{t?.label || e.target}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>
                {positionedNodes.length} Visible Nodes • {filteredEdges.length} Directed Edges (Authorized Total:{' '}
                {graphData?.totalNodes || 0} / {graphData?.totalEdges || 0})
              </span>
              <span className="font-mono text-primary font-bold">
                Scope: {graphData?.scopeRole || role} • Synced {graphData ? new Date(graphData.generatedAt).toLocaleTimeString() : ''}
              </span>
            </div>
          </div>

          {/* Right Forensic Inspector (Edge OR Node OR Path) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
            {selectedEdge ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[22px]">link</span>
                    <h3 className="font-headline font-bold text-slate-900 text-base">
                      Edge Relationship Inspector
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedEdgeId('')}
                    className="text-xs font-bold text-slate-500 hover:text-slate-900"
                  >
                    Back to Node
                  </button>
                </div>

                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5 text-xs">
                  <span className="font-mono font-bold text-primary text-[11px]">{selectedEdge.relationship}</span>
                  <div className="font-bold text-slate-900 text-sm">{selectedEdge.label}</div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Source Node</span>
                    <button
                      onClick={() => {
                        setSelectedNodeId(selectedEdge.source);
                        setSelectedEdgeId('');
                      }}
                      className="font-bold text-primary hover:underline text-left mt-0.5"
                    >
                      {nodeMap.get(selectedEdge.source)?.label || selectedEdge.source}
                    </button>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Target Node</span>
                    <button
                      onClick={() => {
                        setSelectedNodeId(selectedEdge.target);
                        setSelectedEdgeId('');
                      }}
                      className="font-bold text-primary hover:underline text-left mt-0.5"
                    >
                      {nodeMap.get(selectedEdge.target)?.label || selectedEdge.target}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <div>
                    <strong className="text-slate-800">Provenance:</strong>{' '}
                    {selectedEdge.provenance || 'PostgreSQL Foreign Key / Correlation'}
                  </div>
                  {selectedEdge.createdAt && (
                    <div>
                      <strong className="text-slate-800">Recorded:</strong>{' '}
                      {new Date(selectedEdge.createdAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            ) : selectedNode ? (
              <>
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[22px]">search_insights</span>
                      <h3 className="font-headline font-bold text-slate-900 text-base">
                        Node Lineage Inspector
                      </h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-800">
                      {selectedNode.status}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      {NODE_TYPE_LABELS[selectedNode.type] || selectedNode.type}
                    </span>
                    <div className="font-headline font-bold text-base text-slate-900 mt-0.5">
                      {selectedNode.label}
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      {selectedNode.tower} • {selectedNode.category}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <span className="font-bold text-slate-700 block">Operational Summary:</span>
                    <p className="text-slate-600 leading-relaxed">{selectedNode.details}</p>
                    <div className="pt-1 border-t border-slate-200/70 text-[11px] text-slate-500 space-y-0.5">
                      <div>
                        <strong>Provenance:</strong> {selectedNode.provenance || 'PostgreSQL Entity'}
                      </div>
                      {selectedNode.createdAt && (
                        <div>
                          <strong>Created:</strong> {new Date(selectedNode.createdAt).toLocaleString()}
                        </div>
                      )}
                      {selectedNode.updatedAt && (
                        <div>
                          <strong>Updated:</strong> {new Date(selectedNode.updatedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Graph Branch Controls */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleExpandConnected(selectedNode.id)}
                      disabled={expandingNodeId === selectedNode.id}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-primary text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">unfold_more</span>
                      <span>{expandingNodeId === selectedNode.id ? 'Loading...' : 'Expand 1-Hop'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleCollapseBranch(selectedNode.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {collapsedRootIds.has(selectedNode.id) ? 'expand' : 'compress'}
                      </span>
                      <span>
                        {collapsedRootIds.has(selectedNode.id) ? 'Expand Branch' : 'Collapse Leaves'}
                      </span>
                    </button>
                  </div>

                  {/* Connected Relationships (Clickable Traversal!) */}
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs space-y-2">
                    <span className="font-bold text-primary block">
                      Connected Entities ({loadingNodeDetail ? '...' : (nodeDetail?.connectedNodes.length ?? connectedEdges.length)}):
                    </span>
                    {connectedEdges.length === 0 ? (
                      <p className="text-slate-500">No linked edges for this node.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {connectedEdges.map((e) => {
                          const isOut = e.source === selectedNode.id;
                          const neighborId = isOut ? e.target : e.source;
                          const neighbor =
                            nodeDetail?.connectedNodes.find((n) => n.id === neighborId) ||
                            graphData?.nodes.find((n) => n.id === neighborId);
                          return (
                            <button
                              key={e.id}
                              type="button"
                              onClick={() => {
                                setCollapsedRootIds((prev) => {
                                  const next = new Set(prev);
                                  next.delete(selectedNode.id);
                                  return next;
                                });
                                setSelectedNodeId(neighborId);
                                setSelectedEdgeId('');
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg bg-white hover:bg-blue-100/70 border border-blue-100 flex items-center justify-between gap-2 transition-colors"
                            >
                              <span className="font-semibold text-slate-800 truncate">
                                {isOut ? '→' : '←'} {neighbor?.label || neighborId}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-mono font-bold text-slate-600 shrink-0">
                                {e.relationship}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Active Path Breakdown if present */}
                  {pathResult && pathResult.found && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1.5">
                      <span className="font-bold text-emerald-900 block">
                        Shortest Causal Path ({pathResult.hopCount} hop{pathResult.hopCount === 1 ? '' : 's'}):
                      </span>
                      <ol className="space-y-1 text-[11px] text-emerald-800">
                        {pathResult.steps.map((step, i) => (
                          <li key={step.edgeId}>
                            {i + 1}. <strong>{step.fromLabel}</strong>{' '}
                            <span className="font-mono text-[10px]">[{step.relationship}]</span>{' '}
                            <strong>{step.toLabel}</strong>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>

                {canDeepNavigate(selectedNode) && (
                  <div className="pt-3 border-t border-slate-100 flex gap-2">
                    <button
                      onClick={() => handleDeepNavigate(selectedNode)}
                      className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                    >
                      <span>Open {selectedNode.sourceType.replace(/_/g, ' ')}</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-xs text-slate-500 py-10">
                Select a node or relationship edge to inspect lineage details.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
