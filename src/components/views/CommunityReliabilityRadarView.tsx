import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';
import { ReliabilityRadarData } from '../../types';

export const CommunityReliabilityRadarView: React.FC = () => {
  const { setActiveTab, showToast } = useApp();
  const [radarData, setRadarData] = useState<ReliabilityRadarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRadar = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiService.getReliabilityRadar();
      setRadarData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Reliability Radar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRadar();
  }, []);

  const axes = radarData?.radarAxes || [];
  const center = 160;
  const radius = 115;
  const count = axes.length || 1;

  const getCoordinates = (value: number, index: number) => {
    const angle = ((Math.PI * 2) / count) * index - Math.PI / 2;
    const r = (Math.max(0, Math.min(100, value)) / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  };

  const polygonPoints = axes
    .map((dim, i) => {
      const { x, y } = getCoordinates(dim.score, i);
      return `${x},${y}`;
    })
    .join(' ');

  const targetPoints = axes
    .map((_, i) => {
      const { x, y } = getCoordinates(85, i);
      return `${x},${y}`;
    })
    .join(' ');

  const handleDownloadAudit = () => {
    if (!radarData) return;
    const blob = new Blob([JSON.stringify(radarData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `civicops-reliability-audit-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Reliability audit dataset downloaded.');
  };

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
            Community Reliability Radar
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time reliability scoring calculated directly from PostgreSQL complaints, assets, work orders, and PM compliance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadRadar}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Recalculate</span>
          </button>
          <button
            onClick={handleDownloadAudit}
            disabled={!radarData}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Audit Report</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center text-xs text-slate-500">
          Calculating real-time reliability metrics from PostgreSQL...
        </div>
      ) : error || !radarData ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-xs text-red-700 font-semibold">
          {error || 'Unable to load radar data'}
        </div>
      ) : (
        <>
          {/* Composite Score Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            {[
              { label: 'Overall Score', value: `${radarData.overallReliabilityScore}%`, accent: 'text-primary' },
              { label: 'SLA Compliance', value: `${radarData.slaCompliancePercentage}%`, accent: 'text-emerald-700' },
              { label: 'Asset Health', value: `${radarData.averageAssetHealthScore}%`, accent: 'text-blue-700' },
              { label: 'PM Compliance', value: `${radarData.pmCompliancePercentage}%`, accent: 'text-purple-700' },
              { label: 'WO Completion', value: `${radarData.workOrderCompletionPercentage}%`, accent: 'text-slate-900' },
              { label: 'Recurrence Stability', value: `${radarData.recurrenceStabilityPercentage}%`, accent: 'text-amber-700' }
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">{kpi.label}</span>
                <span className={`font-headline font-bold text-2xl mt-1 block ${kpi.accent}`}>
                  {kpi.value}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Radar Polygon */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs flex flex-col items-center justify-between">
              <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[22px]">radar</span>
                  <h2 className="font-headline font-bold text-slate-900 text-base">
                    Category Reliability Polygon
                  </h2>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Composite: {radarData.overallReliabilityScore}%
                </span>
              </div>

              {axes.length >= 3 ? (
                <div className="w-full max-w-[320px] aspect-square my-4 relative">
                  <svg viewBox="0 0 320 320" className="w-full h-full">
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

                    {axes.map((_, i) => {
                      const { x, y } = getCoordinates(100, i);
                      return (
                        <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#cbd5e1" strokeWidth="1" />
                      );
                    })}

                    <polygon
                      points={targetPoints}
                      fill="#94a3b8"
                      fillOpacity="0.1"
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                      strokeDasharray="4,4"
                    />

                    <polygon
                      points={polygonPoints}
                      fill="#2563eb"
                      fillOpacity="0.25"
                      stroke="#004ac6"
                      strokeWidth="2.5"
                    />

                    {axes.map((dim, i) => {
                      const { x, y } = getCoordinates(dim.score, i);
                      return (
                        <circle
                          key={dim.axis}
                          cx={x}
                          cy={y}
                          r="4.5"
                          fill={dim.score < 70 ? '#ba1a1a' : '#004ac6'}
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                      );
                    })}
                  </svg>
                </div>
              ) : (
                <div className="py-16 text-xs text-slate-500">
                  Insufficient categories for polygon visualization ({axes.length} categories).
                </div>
              )}

              <div className="w-full flex items-center justify-around text-xs pt-3 border-t border-slate-100">
                <span className="flex items-center gap-1.5 text-primary font-bold">
                  <span className="w-3 h-3 rounded bg-blue-600 inline-block"></span> Current Score
                </span>
                <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <span className="w-3 h-0.5 border-t-2 border-dashed border-slate-400 inline-block"></span> 85% SLA Target
                </span>
              </div>
            </div>

            {/* Category Cards */}
            <div className="lg:col-span-7 space-y-3">
              {axes.map((dim) => (
                <div
                  key={dim.axis}
                  className={`p-4 rounded-xl border bg-white shadow-2xs flex flex-col justify-between ${
                    dim.score < 70
                      ? 'border-red-300 ring-1 ring-red-100'
                      : dim.score < 85
                      ? 'border-amber-300'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{dim.axis}</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Assets Tracked: {dim.assetCount} • Open Complaints: {dim.openComplaints}
                      </span>
                    </div>
                    <span
                      className={`font-headline font-bold text-xl ${
                        dim.score < 70 ? 'text-red-600' : dim.score < 85 ? 'text-amber-600' : 'text-primary'
                      }`}
                    >
                      {dim.score}%
                    </span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-slate-100 mt-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        dim.score < 70 ? 'bg-red-600' : dim.score < 85 ? 'bg-amber-500' : 'bg-primary'
                      }`}
                      style={{ width: `${dim.score}%` }}
                    />
                  </div>
                </div>
              ))}

              {/* Tower Scores & Methodology */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-headline font-bold text-sm text-slate-900">Per-Tower Reliability</span>
                  <button
                    onClick={() => setActiveTab('recurrence-review-queue')}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Open Recurrence Queue &rarr;
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(radarData.towerScores || {}).map(([towerName, score]) => (
                    <div key={towerName} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-500 block">{towerName}</span>
                      <span className="font-mono font-bold text-sm text-slate-900">{score}%</span>
                    </div>
                  ))}
                </div>
                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 space-y-1">
                  <div><strong>Methodology:</strong> {radarData.methodology}</div>
                  <div><strong>Source of Truth:</strong> {radarData.sourceOfTruth}</div>
                  <div>
                    <strong>Evidence Counts:</strong>{' '}
                    {Object.entries(radarData.evidenceCounts || {})
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' • ')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

