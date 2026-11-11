import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

interface GraphNode {
  id: string;
  label: string;
  type: 'TOWER' | 'ASSET' | 'INCIDENT' | 'WORK_ORDER' | 'TECHNICIAN';
  status: 'NORMAL' | 'WARNING' | 'CRITICAL';
  occurrences: number;
  x: number;
  y: number;
  subsystem: string;
  details: string;
  recommendation: string;
}

interface GraphEdge {
  from: string;
  to: string;
  label: string;
  dashed?: boolean;
}

export const CommunityMemoryGraphView: React.FC = () => {
  const { assets, complaints, workOrders, setSelectedComplaintId, setActiveTab, showToast } = useApp();

  const [depth, setDepth] = useState<number>(3);
  const [activeSubsystem, setActiveSubsystem] = useState<string>('ALL');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-ast-prv');
  const [viewMode, setViewMode] = useState<'TOPOLOGY' | 'TREE' | 'MATRIX'>('TOPOLOGY');

  // Realistic dynamic graph nodes populated from society state
  const nodes: GraphNode[] = [
    {
      id: 'node-tower-b',
      label: 'Tower B (120 Units)',
      type: 'TOWER',
      status: 'WARNING',
      occurrences: 4,
      x: 180,
      y: 190,
      subsystem: 'Structure',
      details: '480 residents across 12 floors. High concentration of plumbing and vertical riser anomalies.',
      recommendation: 'Initiate quarterly vertical shaft ultrasonic acoustic leak check.'
    },
    {
      id: 'node-ast-prv',
      label: 'PRV-B4 (4th Fl Riser)',
      type: 'ASSET',
      status: 'CRITICAL',
      occurrences: 3,
      x: 350,
      y: 130,
      subsystem: 'Plumbing',
      details: 'Watts 1" Pressure Reducing Valve. Recurring calcium sediment accumulation in bronze mesh strainer causing upstream pressure spikes.',
      recommendation: 'Replace downstream cast iron union with 316 Stainless Steel valve body.'
    },
    {
      id: 'node-ast-elev-b2',
      label: 'Elevator #2 Schindler',
      type: 'ASSET',
      status: 'CRITICAL',
      occurrences: 2,
      x: 360,
      y: 280,
      subsystem: 'Elevators',
      details: 'Passenger Elevator #2. Optical leveling vane misalignment at 5th floor landing causing deceleration vibration.',
      recommendation: 'Replace optical vane switch #SCH-LEV-88 and re-tension governor cable.'
    },
    {
      id: 'node-cmp-water',
      label: 'TKT-2024-089 (Water Riser)',
      type: 'INCIDENT',
      status: 'WARNING',
      occurrences: 1,
      x: 540,
      y: 80,
      subsystem: 'Plumbing',
      details: 'Severe low pressure reported by Rahul Sharma (B-402). Dynamic pressure dropped to 0.6 Bar.',
      recommendation: 'Diaphragm replaced. Awaiting resident sign-off.'
    },
    {
      id: 'node-wo-118',
      label: 'WO-2024-118 (Overhaul)',
      type: 'WORK_ORDER',
      status: 'NORMAL',
      occurrences: 1,
      x: 680,
      y: 120,
      subsystem: 'Plumbing',
      details: 'Completed PRV overhaul and fitted OEM Watts diaphragm repair kit. Calibrated to 2.8 Bar.',
      recommendation: 'Monitor 48h pressure telemetry curve.'
    },
    {
      id: 'node-tech-ramesh',
      label: 'Ramesh Kumar (MEP Lead)',
      type: 'TECHNICIAN',
      status: 'NORMAL',
      occurrences: 6,
      x: 520,
      y: 220,
      subsystem: 'Staff',
      details: 'Senior MEP technician dispatched on 6 Tower B incidents this quarter. First-time fix rate: 91.5%.',
      recommendation: 'Eligible for quarterly society excellence bonus.'
    },
    {
      id: 'node-ast-dg',
      label: 'Cummins DG #2 (500kVA)',
      type: 'ASSET',
      status: 'NORMAL',
      occurrences: 1,
      x: 180,
      y: 380,
      subsystem: 'Power',
      details: 'Basement 1 emergency generator. Scheduled 250h preventive overhaul currently in execution.',
      recommendation: 'Stock dual spin-on lube filters LF9009 before grid monsoon season.'
    }
  ];

  const edges: GraphEdge[] = [
    { from: 'node-tower-b', to: 'node-ast-prv', label: 'Feeds Shaft #4' },
    { from: 'node-tower-b', to: 'node-ast-elev-b2', label: 'Houses Shaft' },
    { from: 'node-ast-prv', to: 'node-cmp-water', label: 'Triggered By Pressure Drop' },
    { from: 'node-cmp-water', to: 'node-wo-118', label: 'Resolved Via' },
    { from: 'node-wo-118', to: 'node-tech-ramesh', label: 'Executed By' },
    { from: 'node-ast-elev-b2', to: 'node-tech-ramesh', label: 'Inspected By' },
    { from: 'node-tower-b', to: 'node-ast-dg', label: 'Emergency Backup', dashed: true }
  ];

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[1];

  const getNodeColor = (node: GraphNode) => {
    switch (node.type) {
      case 'TOWER':
        return '#004ac6';
      case 'ASSET':
        return node.status === 'CRITICAL' ? '#ba1a1a' : '#2563eb';
      case 'INCIDENT':
        return '#ba1a1a';
      case 'WORK_ORDER':
        return '#007d55';
      case 'TECHNICIAN':
        return '#565e74';
    }
  };

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto space-y-5 pb-16">
      {/* Top Banner & Mode Toggle matching Stitch Screen 11 & 12 */}
      <div className="bg-slate-50 border border-slate-200 px-5 py-3.5 rounded-2xl shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* View Modes */}
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
              <span>Hierarchical Tree</span>
            </button>
            <button
              onClick={() => setViewMode('MATRIX')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'MATRIX' ? 'bg-primary text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">view_timeline</span>
              <span>Incident Matrix</span>
            </button>
          </div>

          {/* Quick Forensic Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => showToast('Forensic Dossier PDF exported with MTTR & recurring lineages')}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">picture_as_pdf</span>
              <span>Export Forensic Dossier</span>
            </button>
            <button
              onClick={() => showToast('Directive created in Maintenance Dispatch Queue')}
              className="px-3 py-1.5 rounded-lg bg-primary hover:bg-blue-700 text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">add_task</span>
              <span>Create Directive</span>
            </button>
          </div>
        </div>

        {/* Filter & Depth Slider Row matching Stitch */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1 rounded-lg text-xs font-semibold">
              <span className="material-symbols-outlined text-slate-400 text-[16px]">apartment</span>
              <span className="text-slate-500">Tower:</span>
              <span className="text-primary font-bold">Tower B</span>
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1 rounded-lg text-xs font-semibold">
              <span className="material-symbols-outlined text-slate-400 text-[16px]">plumbing</span>
              <span className="text-slate-500">Filter Subsystem:</span>
              <select
                value={activeSubsystem}
                onChange={(e) => setActiveSubsystem(e.target.value)}
                className="bg-transparent text-slate-800 font-bold outline-none cursor-pointer"
              >
                <option value="ALL">All Subsystems</option>
                <option value="Plumbing">Plumbing &amp; Risers</option>
                <option value="Elevators">Vertical Transport</option>
                <option value="Power">Emergency DG Power</option>
              </select>
            </div>

            {/* Depth Slider */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1 rounded-lg">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Depth:</span>
              <input
                type="range"
                min="1"
                max="5"
                value={depth}
                onChange={(e) => setDepth(Number(e.target.value))}
                className="w-20 accent-primary cursor-pointer h-1.5 bg-slate-200 rounded-lg"
              />
              <span className="text-xs font-bold text-primary font-mono">{depth} Deg</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-700 inline-block"></span> Tower
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span> High Risk Asset
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span> Work Order
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block"></span> Tech Staff
            </span>
          </div>
        </div>
      </div>

      {/* Main Graph Canvas & Forensic Inspector Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Interactive SVG Graph Topology Canvas */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs relative min-h-[480px] flex flex-col justify-between overflow-hidden">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
            <span className="material-symbols-outlined text-primary text-[16px]">hub</span>
            <span>Interactive Topology • Click any node to inspect forensics</span>
          </div>

          <div className="w-full h-[440px] relative">
            <svg className="w-full h-full" viewBox="0 0 800 480">
              {/* Grid Background Pattern */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Connecting Edges */}
              {edges.map((edge, idx) => {
                const source = nodes.find((n) => n.id === edge.from);
                const target = nodes.find((n) => n.id === edge.to);
                if (!source || !target) return null;

                const isHighlighted =
                  selectedNodeId === edge.from || selectedNodeId === edge.to;

                return (
                  <g key={idx}>
                    <line
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={isHighlighted ? '#004ac6' : '#cbd5e1'}
                      strokeWidth={isHighlighted ? 2.5 : 1.5}
                      strokeDasharray={edge.dashed ? '4,4' : undefined}
                    />
                    {/* Edge Label Pill */}
                    <rect
                      x={(source.x + target.x) / 2 - 40}
                      y={(source.y + target.y) / 2 - 9}
                      width="80"
                      height="18"
                      rx="4"
                      fill="#ffffff"
                      stroke="#e2e8f0"
                      strokeWidth="1"
                    />
                    <text
                      x={(source.x + target.x) / 2}
                      y={(source.y + target.y) / 2 + 3}
                      fill="#64748b"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {edge.label}
                    </text>
                  </g>
                );
              })}

              {/* Nodes */}
              {nodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const nodeColor = getNodeColor(node);

                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className="cursor-pointer group"
                  >
                    {/* Pulsing ring if selected or critical */}
                    {(isSelected || node.status === 'CRITICAL') && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="32"
                        fill="none"
                        stroke={nodeColor}
                        strokeWidth="2"
                        opacity="0.3"
                        className="animate-ping"
                      />
                    )}

                    {/* Outer Circle */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isSelected ? 26 : 22}
                      fill="#ffffff"
                      stroke={nodeColor}
                      strokeWidth={isSelected ? 3.5 : 2}
                      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.08))"
                    />

                    {/* Node Glyphs */}
                    <circle cx={node.x} cy={node.y} r="14" fill={nodeColor} />
                    <text
                      x={node.x}
                      y={node.y + 4}
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {node.occurrences}
                    </text>

                    {/* Label */}
                    <text
                      x={node.x}
                      y={node.y + 36}
                      fill="#0f172a"
                      fontSize="10"
                      fontWeight={isSelected ? 'bold' : '600'}
                      textAnchor="middle"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>7 Core Nodes • 7 Directed Lineages</span>
            <span className="font-mono text-primary font-bold">Acyclic Correlation Factor: 0.94</span>
          </div>
        </div>

        {/* Forensic Node Lineage Inspector Drawer matching Stitch Screen 12 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">search_insights</span>
                <h3 className="font-headline font-bold text-slate-900 text-base">
                  Forensic Node Inspector
                </h3>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  selectedNode.status === 'CRITICAL'
                    ? 'bg-red-100 text-red-700'
                    : selectedNode.status === 'WARNING'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {selectedNode.status}
              </span>
            </div>

            {/* Selected Node Specs */}
            <div className="mt-4 space-y-3">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Identified Entity
                </span>
                <div className="font-headline font-bold text-lg text-slate-900 mt-0.5">
                  {selectedNode.label}
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Subsystem: {selectedNode.subsystem} • Type: {selectedNode.type}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <span className="font-bold text-slate-700 block">Failure Forensics &amp; Symptoms:</span>
                <p className="text-slate-600 leading-relaxed">{selectedNode.details}</p>
              </div>

              <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-primary font-bold">
                  <span className="material-symbols-outlined text-[16px]">psychology</span>
                  <span>System Engine CAPEX Recommendation:</span>
                </div>
                <p className="text-blue-900 leading-relaxed font-medium">
                  {selectedNode.recommendation}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Historical Recurrences
                  </span>
                  <span className="font-bold text-slate-900 text-base">
                    {selectedNode.occurrences} Events
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    MTTR Impact
                  </span>
                  <span className="font-bold text-red-600 text-base">+3.2 Hours</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex gap-2">
            <button
              onClick={() => {
                setSelectedComplaintId('cmp-2024-089');
                setActiveTab('resolution-timeline');
              }}
              className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
            >
              <span>Audit Correlated Ticket</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
