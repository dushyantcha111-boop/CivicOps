import React from 'react';
import { useApp } from '../../context/AppContext';

export const ManagementOverviewView: React.FC = () => {
  const {
    complaints,
    workOrders,
    assets,
    visitorPasses,
    selectedTower,
    setActiveTab,
    setSelectedComplaintId,
    setIsSosModalOpen,
    showToast
  } = useApp();

  const filteredComplaints = complaints.filter(
    (c) => selectedTower === 'All Towers' || c.tower === selectedTower
  );

  const activeComplaints = filteredComplaints.filter(
    (c) => c.status !== 'CLOSED' && c.status !== 'RESIDENT_CONFIRMED'
  );

  const urgentComplaints = activeComplaints.filter((c) => c.severity === 'CRITICAL' || c.severity === 'HIGH');
  const activeWorkOrders = workOrders.filter((w) => w.status !== 'COMPLETED');
  const activePasses = visitorPasses.filter((p) => p.status === 'ENTERED' || p.status === 'ACTIVE');

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto space-y-6">
      {/* Top Bar / Breadcrumb & Status Ribbon */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
            <span>Estate Governance</span>
            <span className="text-slate-300">/</span>
            <span className="text-primary font-bold">Executive Operations Pulse</span>
            <span className="text-slate-300">/</span>
            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold">
              Real-Time Sync
            </span>
          </div>
          <div className="flex items-baseline gap-3 mt-1">
            <h1 className="font-headline font-bold text-2xl lg:text-3xl text-slate-900 tracking-tight">
              Executive Management Overview
            </h1>
            <span className="text-xs text-emerald-700 flex items-center gap-1 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Telemetry Live (1.2s lag)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Green Valley Residency • {selectedTower} • Rolling 30-Day Operational SLA Window
          </p>
        </div>

        {/* Quick Actions & Date Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-2xs p-1">
            <button className="px-3 py-1 rounded-md text-xs font-bold bg-primary text-white shadow-2xs">
              Last 14 Days
            </button>
            <button className="px-3 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900">
              This Month
            </button>
            <button className="px-3 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900">
              Q3 FY25
            </button>
          </div>

          <button
            onClick={() => showToast('Forensic SLA & Operations Brief downloaded')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">file_download</span>
            <span>Export Brief</span>
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

      {/* KPI Grid (8 Master Metrics matching Stitch) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Residents & Units */}
        <div className="bg-white rounded-xl p-4 shadow-2xs border border-slate-200 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Occupancy &amp; Population
              </span>
              <div className="text-2xl font-bold font-headline text-slate-900 mt-1">1,420 Residents</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">group</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1.5">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Occupancy</span>
              <span className="font-bold text-slate-900">480 / 480 Units (100%)</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="bg-primary h-full rounded-full w-full"></div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span className="text-emerald-600 font-bold flex items-center">
                <span className="material-symbols-outlined text-[14px]">arrow_upward</span> +12 this mo
              </span>
              <span>98.2% App Active</span>
            </div>
          </div>
        </div>

        {/* 2. Active Complaints */}
        <div className="bg-white rounded-xl p-4 shadow-2xs border border-slate-200 relative overflow-hidden flex flex-col justify-between">
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
                {activeComplaints.filter((c) => c.status === 'ASSIGNED' || c.status === 'INSPECTING').length} In Progress
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                {activeComplaints.filter((c) => c.status === 'SUBMITTED').length} Triage
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
              <span>SLA Adherence</span>
              <span className="text-emerald-700 font-bold">94.2%</span>
            </div>
          </div>
        </div>

        {/* 3. High Severity Gates */}
        <div className="bg-white rounded-xl p-4 shadow-2xs border border-slate-200 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-600"></div>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">
                High Severity Gates
              </span>
              <div className="text-2xl font-bold font-headline text-red-600 mt-1">
                {urgentComplaints.length} Urgent
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">emergency</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1">
            <div className="text-xs text-slate-600 flex justify-between">
              <span>Mean Response</span>
              <span className="font-bold text-slate-900">18.4 mins</span>
            </div>
            <div className="text-xs text-slate-600 flex justify-between">
              <span>Pending Resident Sign-off</span>
              <span className="font-bold text-amber-600">
                {complaints.filter((c) => c.status === 'PROPOSED').length}
              </span>
            </div>
            <div className="text-[11px] text-red-600 font-medium pt-0.5">
              Target Resolution: &lt; 4 Hours
            </div>
          </div>
        </div>

        {/* 4. Infrastructure Health & Assets */}
        <div className="bg-white rounded-xl p-4 shadow-2xs border border-slate-200 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Asset Reliability
              </span>
              <div className="text-2xl font-bold font-headline text-slate-900 mt-1">
                87.4 <span className="text-sm font-normal text-slate-500">/ 100</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">speed</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1.5">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Critical Assets</span>
              <span className="font-bold text-slate-900">{assets.length} Monitored</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Open Work Orders</span>
              <span className="font-bold text-primary">{activeWorkOrders.length} Scheduled</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>MTBF: 850 hrs</span>
              <span className="text-emerald-600 font-bold">Radar Tier-A</span>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Modules Row: Intelligence Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Community Memory Graph Card */}
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
                FORENSIC LINEAGE
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Explore interconnected failure patterns across Tower B water risers, Elevator #2 door leveling, and DG set quarterly filters.
            </p>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex justify-between items-center mb-4">
              <span className="text-slate-500">Graph Recurrence Nodes:</span>
              <span className="font-mono font-bold text-primary">14 Nodes • 24 Edges</span>
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

        {/* Reliability Radar Card */}
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
                SLA 94.2%
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Multi-axial radar scoring society health: Power Grid, Water Riser, Vertical Elevators, Fire Protection, and Gate ANPR.
            </p>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex justify-between items-center mb-4">
              <span className="text-slate-500">Weakest Subsystem:</span>
              <span className="font-bold text-red-600">Elevator #2 (68/100)</span>
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

        {/* Recurrence Review Queue Card */}
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
                3 CLUSTERS
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Identifies chronic repetitive faults before they escalate into resident disputes. 3 recurring tickets currently flagged in Tower B.
            </p>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex justify-between items-center mb-4">
              <span className="text-slate-500">Root Cause Advisory:</span>
              <span className="font-bold text-amber-700">Riser PRV-B4 Scaling</span>
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
              Showing tickets requiring management triage, technician action, or resident verification
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('complaint-operations')}
              className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1"
            >
              <span>View Full Operations Board</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
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
                <th className="py-3 px-4">SLA Time</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredComplaints.slice(0, 6).map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-primary">{c.ticketNumber}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 leading-tight">{c.title}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span className="font-semibold text-slate-600">{c.category}</span>
                      {c.recurringCount && c.recurringCount > 1 && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
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
                        c.status === 'PROPOSED'
                          ? 'bg-purple-100 text-purple-700'
                          : c.status === 'RESIDENT_CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : c.status === 'ASSIGNED'
                          ? 'bg-blue-100 text-blue-700'
                          : c.status === 'SUBMITTED'
                          ? 'bg-slate-200 text-slate-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {c.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium">
                    {c.assignedTechnicianName || (
                      <span className="text-amber-600 font-semibold italic">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                    {new Date(c.slaDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
