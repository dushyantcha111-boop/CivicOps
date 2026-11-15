import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';
import { RecurrenceCluster, ReliabilityRadarData } from '../../types';

export const ManagementOverviewView: React.FC = () => {
  const {
    complaints,
    workOrders,
    assets,
    units,
    incidents,
    selectedTower,
    setActiveTab,
    setSelectedComplaintId,
    setIsSosModalOpen,
    showToast
  } = useApp();

  const [windowDays, setWindowDays] = useState<number>(30);
  const [radar, setRadar] = useState<ReliabilityRadarData | null>(null);
  const [clusters, setClusters] = useState<RecurrenceCluster[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([ApiService.getReliabilityRadar(), ApiService.getRecurrenceQueue(windowDays)]).then(
      ([radarRes, recRes]) => {
        if (cancelled) return;
        if (radarRes.status === 'fulfilled') setRadar(radarRes.value);
        if (recRes.status === 'fulfilled') setClusters(recRes.value);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [windowDays, complaints.length, assets.length, workOrders.length]);

  const filteredComplaints = useMemo(() => {
    const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
    return complaints.filter((c) => {
      if (selectedTower !== 'All Towers' && c.tower !== selectedTower) return false;
      const submittedTime = new Date(c.submittedAt).getTime();
      if (!Number.isNaN(submittedTime) && windowDays < 365 && submittedTime < cutoff) {
        return false;
      }
      return true;
    });
  }, [complaints, selectedTower, windowDays]);

  const activeComplaints = filteredComplaints.filter(
    (c) => c.status !== 'CLOSED' && c.status !== 'RESIDENT_CONFIRMED'
  );
  const urgentComplaints = activeComplaints.filter(
    (c) => c.severity === 'CRITICAL' || c.severity === 'HIGH'
  );
  const awaitingResidentSignoff = filteredComplaints.filter(
    (c) => c.status === 'PROPOSED' || c.status === 'MANAGEMENT_APPROVED'
  );

  const filteredUnits = units.filter((u) => selectedTower === 'All Towers' || u.tower === selectedTower);
  const occupiedUnitsCount = filteredUnits.filter((u) => u.occupancyStatus === 'OCCUPIED').length;
  const occupancyPct = filteredUnits.length > 0 ? Math.round((occupiedUnitsCount / filteredUnits.length) * 100) : 0;
  const overdueDuesUnits = filteredUnits.filter((u) => u.duesStatus !== 'PAID' && Number(u.duesAmount || 0) > 0).length;

  const filteredAssets = assets.filter((a) => selectedTower === 'All Towers' || a.tower === selectedTower);
  const avgAssetHealth =
    filteredAssets.length > 0
      ? (filteredAssets.reduce((sum, a) => sum + Number(a.healthScore || 0), 0) / filteredAssets.length).toFixed(1)
      : '—';
  const activeWorkOrders = workOrders.filter(
    (w) => (selectedTower === 'All Towers' || w.tower === selectedTower) && w.status !== 'COMPLETED'
  );
  const activeIncidentsCount = incidents.filter((i) => i.status !== 'RESOLVED').length;

  const slaRate =
    filteredComplaints.length > 0
      ? Math.round(
          (filteredComplaints.filter((c) => !c.slaBreached).length / filteredComplaints.length) * 100
        )
      : 100;

  const weakestAxis =
    radar?.radarAxes && radar.radarAxes.length > 0
      ? [...radar.radarAxes].sort((a, b) => a.score - b.score)[0]
      : null;

  const handleExportBrief = () => {
    const rows = [
      ['Ticket Number', 'Title', 'Tower', 'Unit', 'Category', 'Severity', 'Status', 'SLA Breached', 'Submitted At'],
      ...filteredComplaints.map((c) => [
        c.ticketNumber,
        `"${(c.title || '').replace(/"/g, '""')}"`,
        c.tower,
        c.unitNumber,
        c.category,
        c.severity,
        c.status,
        String(c.slaBreached),
        c.submittedAt
      ])
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `civicops-operations-brief-${windowDays}d.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Operations SLA brief exported as CSV.');
  };

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
            <span>Estate Governance</span>
            <span className="text-slate-300">/</span>
            <span className="text-primary font-bold">Executive Operations Pulse</span>
          </div>
          <div className="flex items-baseline gap-3 mt-1 flex-wrap">
            <h1 className="font-headline font-bold text-2xl lg:text-3xl text-slate-900 tracking-tight">
              Executive Management Overview
            </h1>
            <span
              className={`text-xs flex items-center gap-1 font-semibold px-2.5 py-0.5 rounded-full border ${
                activeIncidentsCount > 0
                  ? 'text-red-700 bg-red-50 border-red-200'
                  : 'text-emerald-700 bg-emerald-50 border-emerald-200'
              }`}
            >
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  activeIncidentsCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                }`}
              ></span>
              {activeIncidentsCount > 0 ? `${activeIncidentsCount} Active Incidents` : 'Live PostgreSQL Sync'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Green Valley Residency • {selectedTower} • Rolling {windowDays}-Day Operational Window
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-2xs p-1">
            {[
              { days: 14, label: 'Last 14 Days' },
              { days: 30, label: '30 Days' },
              { days: 90, label: '90 Days' }
            ].map((opt) => (
              <button
                key={opt.days}
                onClick={() => setWindowDays(opt.days)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                  windowDays === opt.days
                    ? 'bg-primary text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportBrief}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">file_download</span>
            <span>Export CSV Brief</span>
          </button>

          <button
            onClick={() => setIsSosModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">broadcast_on_home</span>
            <span>Emergency Broadcast</span>
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-2xs border border-slate-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Units &amp; Dues Health
              </span>
              <div className="text-2xl font-bold font-headline text-slate-900 mt-1">
                {filteredUnits.length} Units
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">apartment</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1.5">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Occupancy</span>
              <span className="font-bold text-slate-900">
                {occupiedUnitsCount} / {filteredUnits.length} ({occupancyPct}%)
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: `${occupancyPct}%` }}></div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>Pending Dues Flats</span>
              <span className="font-bold text-amber-700">{overdueDuesUnits} Units</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-2xs border border-slate-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Triage Pipeline
              </span>
              <div className="text-2xl font-bold font-headline text-slate-900 mt-1">
                {activeComplaints.length} Active
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">inbox_customize</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-bold">
                {urgentComplaints.length} Urgent
              </span>
              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">
                {activeComplaints.filter((c) => c.status === 'ASSIGNED' || c.status === 'INSPECTING').length} Field
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                {activeComplaints.filter((c) => c.status === 'SUBMITTED').length} Triage
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
              <span>SLA Adherence</span>
              <span className="text-emerald-700 font-bold">{radar ? `${radar.slaCompliancePercentage}%` : `${slaRate}%`}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-2xs border border-slate-200 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-600"></div>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">
                Priority &amp; Verification
              </span>
              <div className="text-2xl font-bold font-headline text-red-600 mt-1">
                {urgentComplaints.length} High/Critical
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">emergency</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1">
            <div className="text-xs text-slate-600 flex justify-between">
              <span>Pending Resident Sign-off</span>
              <span className="font-bold text-amber-600">{awaitingResidentSignoff.length}</span>
            </div>
            <div className="text-xs text-slate-600 flex justify-between">
              <span>Disputed Tickets</span>
              <span className="font-bold text-red-600">
                {filteredComplaints.filter((c) => c.status === 'DISPUTED').length}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium pt-0.5">
              Window: {filteredComplaints.length} total complaints
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-2xs border border-slate-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Asset Reliability
              </span>
              <div className="text-2xl font-bold font-headline text-slate-900 mt-1">
                {radar ? radar.overallReliabilityScore : avgAssetHealth}{' '}
                <span className="text-sm font-normal text-slate-500">/ 100</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">speed</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1.5">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Assets Monitored</span>
              <span className="font-bold text-slate-900">{filteredAssets.length} Registered</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Open Work Orders</span>
              <span className="font-bold text-primary">{activeWorkOrders.length} Active</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>PM Compliance</span>
              <span className="text-emerald-600 font-bold">
                {radar ? `${radar.pmCompliancePercentage}%` : 'Live'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Intelligence Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">hub</span>
                <h3 className="font-headline font-bold text-slate-900 text-base">
                  Community Memory Graph
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                TOPOLOGY
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Explore live PostgreSQL relationships across towers, infrastructure assets, complaints, work orders, and assigned technicians.
            </p>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex justify-between items-center mb-4">
              <span className="text-slate-500">Tracked Entities:</span>
              <span className="font-mono font-bold text-primary">
                {filteredAssets.length} Assets • {filteredComplaints.length} Tickets
              </span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('memory-graph')}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Open Memory Graph Topology</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-[22px]">radar</span>
                <h3 className="font-headline font-bold text-slate-900 text-base">
                  Community Reliability Radar
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                {radar ? `SLA ${radar.slaCompliancePercentage}%` : `SLA ${slaRate}%`}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Dynamic multi-axis scoring computed from live asset health, open complaints, work order closure, and PM compliance.
            </p>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex justify-between items-center mb-4">
              <span className="text-slate-500">Lowest Subsystem:</span>
              <span className="font-bold text-amber-700">
                {weakestAxis ? `${weakestAxis.axis} (${weakestAxis.score}/100)` : 'Calculating...'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('reliability-radar')}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Launch Reliability Radar</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 text-[22px]">history_toggle_off</span>
                <h3 className="font-headline font-bold text-slate-900 text-base">
                  Recurrence Review Queue
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                {clusters.length} CLUSTERS
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Flags recurring fault clusters within the {windowDays}-day window so management can schedule permanent preventive action.
            </p>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex justify-between items-center mb-4">
              <span className="text-slate-500">Top Hotspot:</span>
              <span className="font-bold text-amber-700 truncate max-w-[170px]">
                {clusters[0] ? `${clusters[0].tower} ${clusters[0].category}` : 'No active clusters'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('recurrence-review-queue')}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Review Recurrence Queue</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Main Table: Active Complaints & Operational Triage */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
          <div>
            <h2 className="font-headline font-bold text-slate-900 text-base">
              Active Complaint Triage &amp; Resolution Pipeline
            </h2>
            <p className="text-xs text-slate-500">
              Showing {Math.min(8, filteredComplaints.length)} of {filteredComplaints.length} complaints in rolling window
            </p>
          </div>
          <button
            onClick={() => setActiveTab('complaint-operations')}
            className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1 self-start sm:self-auto"
          >
            <span>View Full Operations Board</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Ticket #</th>
                <th className="py-3 px-4">Issue Title &amp; Category</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned Tech</th>
                <th className="py-3 px-4">SLA Deadline</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredComplaints.slice(0, 8).map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-primary">{c.ticketNumber}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 leading-tight">{c.title}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span className="font-semibold text-slate-600">{c.category}</span>
                      {c.recurringCount && c.recurringCount > 1 && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          {c.recurringCount}x Recurring
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-800">{c.tower}</span>
                    <span className="text-slate-500 block text-[11px]">Flat {c.unitNumber}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        c.severity === 'CRITICAL'
                          ? 'bg-red-100 text-red-700'
                          : c.severity === 'HIGH'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {c.severity}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'PROPOSED' || c.status === 'MANAGEMENT_APPROVED'
                          ? 'bg-purple-100 text-purple-700'
                          : c.status === 'RESIDENT_CONFIRMED' || c.status === 'CLOSED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : c.status === 'ASSIGNED'
                          ? 'bg-blue-100 text-blue-700'
                          : c.status === 'SUBMITTED'
                          ? 'bg-slate-200 text-slate-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {c.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium">
                    {c.assignedTechnicianName || (
                      <span className="text-amber-600 font-semibold italic">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                    {c.slaDeadline ? new Date(c.slaDeadline).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedComplaintId(c.id);
                        setActiveTab('resolution-timeline');
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-xs transition-colors"
                    >
                      Trust Timeline
                    </button>
                  </td>
                </tr>
              ))}
              {filteredComplaints.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No complaints recorded in this filter window.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

