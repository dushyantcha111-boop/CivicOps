import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

interface RadarDimension {
  axis: string;
  score: number; // 0 to 100
  benchmark: number;
  mtbf: string;
  mttr: string;
  telemetry: 'HEALTHY' | 'DEGRADING' | 'CRITICAL';
  vendor: string;
}

export const CommunityReliabilityRadarView: React.FC = () => {
  const { setActiveTab, setSelectedComplaintId, showToast } = useApp();
  const [selectedTowerView, setSelectedTowerView] = useState<'TOWER_B' | 'ALL_TOWERS'>('TOWER_B');

  const dimensions: RadarDimension[] = [
    {
      axis: 'Emergency Power Grid & DG',
      score: 92,
      benchmark: 90,
      mtbf: '1,200 hrs',
      mttr: '2.5 hrs',
      telemetry: 'HEALTHY',
      vendor: 'Cummins India / Jakson'
    },
    {
      axis: 'Water Riser & Hydraulic Pumps',
      score: 74,
      benchmark: 88,
      mtbf: '310 hrs',
      mttr: '2.4 hrs',
      telemetry: 'DEGRADING',
      vendor: 'Grundfos & Watts'
    },
    {
      axis: 'Vertical Transport Elevators',
      score: 68,
      benchmark: 95,
      mtbf: '420 hrs',
      mttr: '3.2 hrs',
      telemetry: 'CRITICAL',
      vendor: 'Schindler Elevators AMC'
    },
    {
      axis: 'Fire Protection & Sprinklers',
      score: 98,
      benchmark: 95,
      mtbf: '3,500 hrs',
      mttr: '1.0 hrs',
      telemetry: 'HEALTHY',
      vendor: 'Honeywell Fire Systems'
    },
    {
      axis: 'Gate Barriers & ANPR Sensors',
      score: 96,
      benchmark: 90,
      mtbf: '2,100 hrs',
      mttr: '1.5 hrs',
      telemetry: 'HEALTHY',
      vendor: 'Hikvision & Magnetic Autocontrol'
    },
    {
      axis: 'STP & Wastewater Recycling',
      score: 88,
      benchmark: 85,
      mtbf: '890 hrs',
      mttr: '2.0 hrs',
      telemetry: 'HEALTHY',
      vendor: 'Thermax Water Solutions'
    }
  ];

  // Helper to compute radar polygon points for 6 axes
  const center = 160;
  const radius = 120;
  const count = dimensions.length;

  const getCoordinates = (value: number, index: number) => {
    const angle = (Math.PI * 2 / count) * index - Math.PI / 2;
    const r = (value / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  const points = dimensions
    .map((dim, i) => {
      const { x, y } = getCoordinates(dim.score, i);
      return `${x},${y}`;
    })
    .join(' ');

  const benchmarkPoints = dimensions
    .map((dim, i) => {
      const { x, y } = getCoordinates(dim.benchmark, i);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
            <span>Predictive Intelligence</span>
            <span className="text-slate-300">/</span>
            <span className="text-primary font-bold">Reliability Radar Matrix</span>
          </div>
          <h1 className="font-headline font-bold text-2xl lg:text-3xl text-slate-900 mt-0.5 tracking-tight">
            Community Reliability Radar (6 Subsystems)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time multi-axial health scoring from live IoT sensors and resolved work order MTTR logs
          </p>
        </div>

        {/* Tower toggle & actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setSelectedTowerView('TOWER_B')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedTowerView === 'TOWER_B'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tower B Focus
            </button>
            <button
              onClick={() => setSelectedTowerView('ALL_TOWERS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedTowerView === 'ALL_TOWERS'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Society Towers
            </button>
          </div>

          <button
            onClick={() => showToast('Full Reliability Audit Dossier generated')}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            <span>Audit Report</span>
          </button>
        </div>
      </div>

      {/* Main Split: Radar Graph & Subsystems Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Radar Graphic Card */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">radar</span>
              <h2 className="font-headline font-bold text-slate-900 text-base">
                Multi-Axial Vector Polygon
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Composite: 86.0%
            </span>
          </div>

          {/* SVG Radar */}
          <div className="w-full max-w-[320px] aspect-square my-4 relative">
            <svg viewBox="0 0 320 320" className="w-full h-full">
              {/* Concentric circles */}
              {[0.25, 0.5, 0.75, 1.0].map((ratio, idx) => (
                <circle
                  key={idx}
                  cx={center}
                  cy={center}
                  r={radius * ratio}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray={idx < 3 ? '3,3' : undefined}
                />
              ))}

              {/* Axis Spoke Lines */}
              {dimensions.map((_, i) => {
                const { x, y } = getCoordinates(100, i);
                return (
                  <line
                    key={i}
                    x1={center}
                    y1={center}
                    x2={x}
                    y2={y}
                    stroke="#cbd5e1"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Benchmark Reference Polygon */}
              <polygon
                points={benchmarkPoints}
                fill="#94a3b8"
                fillOpacity="0.1"
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeDasharray="4,4"
              />

              {/* Actual Community Polygon */}
              <polygon
                points={points}
                fill="#2563eb"
                fillOpacity="0.25"
                stroke="#004ac6"
                strokeWidth="2.5"
              />

              {/* Points on axes */}
              {dimensions.map((dim, i) => {
                const { x, y } = getCoordinates(dim.score, i);
                return (
                  <g key={i}>
                    <circle
                      cx={x}
                      cy={y}
                      r="4.5"
                      fill={dim.score < 70 ? '#ba1a1a' : '#004ac6'}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="w-full flex items-center justify-around text-xs pt-3 border-t border-slate-100">
            <span className="flex items-center gap-1.5 text-primary font-bold">
              <span className="w-3 h-3 rounded bg-blue-600 inline-block"></span> Current Status
            </span>
            <span className="flex items-center gap-1.5 text-slate-500 font-medium">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-slate-400 inline-block"></span> Society Benchmark
            </span>
          </div>
        </div>

        {/* Detailed Metric Cards (6 Subsystems) */}
        <div className="lg:col-span-7 space-y-3">
          {dimensions.map((dim, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border bg-white shadow-2xs transition-all flex flex-col justify-between ${
                dim.score < 70
                  ? 'border-red-300 ring-1 ring-red-100'
                  : dim.score < 80
                  ? 'border-amber-300'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{dim.axis}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        dim.telemetry === 'CRITICAL'
                          ? 'bg-red-100 text-red-700 animate-pulse'
                          : dim.telemetry === 'DEGRADING'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {dim.telemetry}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Vendor: {dim.vendor}</span>
                </div>

                <div className="flex items-baseline gap-2 self-start sm:self-auto">
                  <span
                    className={`font-headline font-bold text-xl ${
                      dim.score < 70
                        ? 'text-red-600'
                        : dim.score < 80
                        ? 'text-amber-600'
                        : 'text-primary'
                    }`}
                  >
                    {dim.score}%
                  </span>
                  <span className="text-[11px] text-slate-400">Target: {dim.benchmark}%</span>
                </div>
              </div>

              {/* Bar meter */}
              <div className="w-full h-1.5 rounded-full bg-slate-100 mt-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    dim.score < 70
                      ? 'bg-red-600'
                      : dim.score < 80
                      ? 'bg-amber-500'
                      : 'bg-primary'
                  }`}
                  style={{ width: `${dim.score}%` }}
                ></div>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>MTBF: <strong className="text-slate-800">{dim.mtbf}</strong></span>
                <span>MTTR: <strong className="text-slate-800">{dim.mttr}</strong></span>
                {dim.score < 70 && (
                  <button
                    onClick={() => {
                      setSelectedComplaintId('cmp-2024-092');
                      setActiveTab('resolution-timeline');
                    }}
                    className="text-red-600 font-bold hover:underline"
                  >
                    Investigate Ticket &rarr;
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
