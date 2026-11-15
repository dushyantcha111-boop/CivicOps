import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';
import { MemoryGraphData, MemoryGraphNode } from '../../types';

interface PositionedNode extends MemoryGraphNode {
  x: number;
  y: number;
}

const NODE_COLORS: Record<MemoryGraphNode['type'], string> = {
  TOWER: '#004ac6',
  ASSET: '#2563eb',
  COMPLAINT: '#dc2626',
  WORK_ORDER: '#007d55',
  TECHNICIAN: '#565e74'
};

export const CommunityMemoryGraphView: React.FC = () => {
  const { setSelectedComplaintId, setSelectedWorkOrderId, setActiveTab, showToast } = useApp();

  const [graphData, setGraphData] = useState<MemoryGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [towerFilter, setTowerFilter] = useState<string>('ALL');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'TOPOLOGY' | 'TREE' | 'MATRIX'>('TOPOLOGY');

  const fetchGraph = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiService.getMemoryGraph();
      setGraphData(data);
      if (data.nodes.length > 0) {
        setSelectedNodeId((prev) =>
          prev && data.nodes.some((n) => n.id === prev) ? prev : data.nodes[0].id
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Community Memory Graph');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  const filteredNodes = useMemo(() => {
    const raw = graphData?.nodes || [];
    return raw.filter((n) => {
      if (typeFilter !== 'ALL' && n.type !== typeFilter) return false;
      if (towerFilter !== 'ALL' && n.tower !== towerFilter) return false;
      return true;
    });
  }, [graphData, typeFilter, towerFilter]);

  const towersList = useMemo(() => {
    const set = new Set<string>();
    (graphData?.nodes || []).forEach((n) => {
      if (n.tower) set.add(n.tower);
    });
    return Array.from(set).sort();
  }, [graphData]);

  // Compute deterministic layered SVG positions by node type column
  const positionedNodes = useMemo<PositionedNode[]>(() => {
    const columns: Record<MemoryGraphNode['type'], number> = {
      TOWER: 100,
      ASSET: 270,
      COMPLAINT: 450,
      WORK_ORDER: 620,
      TECHNICIAN: 740
    };
    const byType: Record<string, MemoryGraphNode[]> = {};
    filteredNodes.forEach((n) => {
      byType[n.type] = byType[n.type] || [];
      byType[n.type].push(n);
    });

    const result: PositionedNode[] = [];
    (Object.keys(byType) as MemoryGraphNode['type'][]).forEach((type) => {
      const list = byType[type];
      const spacing = 440 / (list.length + 1);
      list.forEach((n, idx) => {
        result.push({
          ...n,
          x: columns[type] || 400,
          y: Math.round(spacing * (idx + 1) + 20)
        });
      });
    });
    return result;
  }, [filteredNodes]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, PositionedNode>();
    positionedNodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [positionedNodes]);

  const filteredEdges = useMemo(() => {
    return (graphData?.edges || []).filter(
      (e) => nodeMap.has(e.source) && nodeMap.has(e.target)
    );
  }, [graphData, nodeMap]);

  const selectedNode =
    positionedNodes.find((n) => n.id === selectedNodeId) || positionedNodes[0] || null;

  const connectedEdges = useMemo(() => {
    if (!selectedNode) return [];
    return (graphData?.edges || []).filter(
      (e) => e.source === selectedNode.id || e.target === selectedNode.id
    );
  }, [graphData, selectedNode]);

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

  const handleDeepNavigate = (node: MemoryGraphNode) => {
    if (node.sourceType === 'COMPLAINT') {
      setSelectedComplaintId(node.sourceId);
      setActiveTab('resolution-timeline');
    } else if (node.sourceType === 'WORK_ORDER') {
      setSelectedWorkOrderId(node.sourceId);
      setActiveTab('work-order-details');
    } else if (node.sourceType === 'ASSET') {
      setActiveTab('asset-register');
    } else if (node.sourceType === 'TOWER') {
      setActiveTab('recurrence-review-queue');
    }
  };

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto space-y-5 pb-16">
      {/* Top Banner & Filters */}
      <div className="bg-slate-50 border border-slate-200 px-5 py-3.5 rounded-2xl shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setViewMode('TOPOLOGY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'TOPOLOGY' ? 'bg-primary text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">bubble_chart</span>
              <span>Graph Topology</span>
            </button>
            <button
              onClick={() => setViewMode('TREE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'TREE' ? 'bg-primary text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">account_tree</span>
              <span>Entity List</span>
            </button>
            <button
              onClick={() => setViewMode('MATRIX')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'MATRIX' ? 'bg-primary text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">view_timeline</span>
              <span>Edge Lineage</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchGraph}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold shadow-2xs flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>Refresh Graph</span>
            </button>
            <button
              onClick={handleExportJson}
              disabled={!graphData}
              className="px-3 py-1.5 rounded-lg bg-primary hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-2xs flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Export Snapshot</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1 rounded-lg text-xs font-semibold">
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

            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1 rounded-lg text-xs font-semibold">
              <span className="text-slate-500">Node Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-transparent text-slate-800 font-bold outline-none"
              >
                <option value="ALL">All Entities</option>
                <option value="TOWER">Towers</option>
                <option value="ASSET">Assets</option>
                <option value="COMPLAINT">Complaints</option>
                <option value="WORK_ORDER">Work Orders</option>
                <option value="TECHNICIAN">Technicians</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#004ac6] inline-block"></span> Tower
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb] inline-block"></span> Asset
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626] inline-block"></span> Complaint
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#007d55] inline-block"></span> Work Order
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#565e74] inline-block"></span> Technician
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center text-xs text-slate-500">
          Building live PostgreSQL correlation graph...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-xs text-red-700 font-semibold">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Canvas */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs relative min-h-[480px] flex flex-col justify-between overflow-hidden">
            {viewMode === 'TOPOLOGY' && (
              <div className="w-full h-[460px] relative">
                <svg className="w-full h-full" viewBox="0 0 820 480">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />

                  {filteredEdges.map((edge) => {
                    const source = nodeMap.get(edge.source);
                    const target = nodeMap.get(edge.target);
                    if (!source || !target) return null;
                    const isHighlighted =
                      selectedNode?.id === edge.source || selectedNode?.id === edge.target;
                    return (
                      <g key={edge.id}>
                        <line
                          x1={source.x}
                          y1={source.y}
                          x2={target.x}
                          y2={target.y}
                          stroke={isHighlighted ? '#004ac6' : '#cbd5e1'}
                          strokeWidth={isHighlighted ? 2.5 : 1.25}
                        />
                      </g>
                    );
                  })}

                  {positionedNodes.map((node) => {
                    const isSelected = selectedNode?.id === node.id;
                    const color = NODE_COLORS[node.type] || '#2563eb';
                    const shortLabel =
                      node.label.length > 20 ? `${node.label.slice(0, 18)}…` : node.label;

                    return (
                      <g
                        key={node.id}
                        onClick={() => setSelectedNodeId(node.id)}
                        className="cursor-pointer"
                      >
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={isSelected ? 22 : 17}
                          fill="#ffffff"
                          stroke={color}
                          strokeWidth={isSelected ? 3.5 : 2}
                        />
                        <circle cx={node.x} cy={node.y} r="10" fill={color} />
                        <text
                          x={node.x}
                          y={node.y + 30}
                          fill="#0f172a"
                          fontSize="9.5"
                          fontWeight={isSelected ? 'bold' : '600'}
                          textAnchor="middle"
                        >
                          {shortLabel}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}

            {viewMode === 'TREE' && (
              <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
                {positionedNodes.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => setSelectedNodeId(n.id)}
                    className={`p-3 cursor-pointer flex items-center justify-between text-xs ${
                      selectedNode?.id === n.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-slate-900">{n.label}</span>
                      <span className="block text-[11px] text-slate-500">
                        {n.type} • {n.tower} • {n.category}
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
              <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto text-xs">
                {filteredEdges.map((e) => {
                  const s = nodeMap.get(e.source);
                  const t = nodeMap.get(e.target);
                  return (
                    <div key={e.id} className="p-3 flex items-center justify-between gap-2">
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

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>
                {positionedNodes.length} Visible Nodes • {filteredEdges.length} Directed Edges (Total:{' '}
                {graphData?.totalNodes || 0} / {graphData?.totalEdges || 0})
              </span>
              <span className="font-mono text-primary font-bold">
                Generated {graphData ? new Date(graphData.generatedAt).toLocaleTimeString() : ''}
              </span>
            </div>
          </div>

          {/* Right Forensic Inspector */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
            {selectedNode ? (
              <>
                <div>
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

                  <div className="mt-4 space-y-3">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        {selectedNode.type}
                      </span>
                      <div className="font-headline font-bold text-lg text-slate-900 mt-0.5">
                        {selectedNode.label}
                      </div>
                      <span className="text-xs text-slate-500 font-medium">
                        {selectedNode.tower} • {selectedNode.category}
                      </span>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                      <span className="font-bold text-slate-700 block">Entity Details:</span>
                      <p className="text-slate-600 leading-relaxed">{selectedNode.details}</p>
                    </div>

                    <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 text-xs space-y-1.5">
                      <span className="font-bold text-primary block">
                        Connected Relationships ({connectedEdges.length}):
                      </span>
                      {connectedEdges.length === 0 ? (
                        <p className="text-slate-500">No linked edges for this node.</p>
                      ) : (
                        <ul className="space-y-1 text-slate-700">
                          {connectedEdges.slice(0, 6).map((e) => (
                            <li key={e.id} className="truncate">
                              • {e.label || e.relationship} ({e.source === selectedNode.id ? e.target : e.source})
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>

                {selectedNode.sourceType !== 'TECHNICIAN' && (
                  <div className="pt-3 border-t border-slate-100 flex gap-2">
                    <button
                      onClick={() => handleDeepNavigate(selectedNode)}
                      className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                    >
                      <span>Open {selectedNode.sourceType.replace('_', ' ')}</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-xs text-slate-500 py-10">
                Select a node to inspect lineage details.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

