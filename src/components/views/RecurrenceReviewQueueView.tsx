import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export const RecurrenceReviewQueueView: React.FC = () => {
  const { setActiveTab, setSelectedComplaintId, showToast } = useApp();

  const [approvedClusters, setApprovedClusters] = useState<string[]>([]);

  const clusters = [
    {
      id: 'cluster-rc-09',
      code: 'CLUSTER #RC-2024-09',
      title: 'Tower B Vertical Riser Hydraulic Scaling & Pressure Drops',
      severity: 'HIGH_RECURRENCE',
      frequency: '3 incidents in 14 days (Units B-401, B-402, B-403)',
      rootCause: 'Calcium carbonate scale deposition in 4th floor bronze mesh filter and elastomeric fatigue in Watts PRV-B4 diaphragm.',
      suggestedFix: 'Replace strainer union with 316-SS dual mesh + install upstream electronic descaler pulse coil.',
      capexEstimate: '₹28,500',
      status: approvedClusters.includes('cluster-rc-09') ? 'APPROVED_CAPEX' : 'PENDING_DIRECTIVE'
    },
    {
      id: 'cluster-rc-14',
      code: 'CLUSTER #RC-2024-14',
      title: 'Tower B Passenger Elevator #2 Floor 5 Landing Offset',
      severity: 'SAFETY_CRITICAL',
      frequency: '2 incidents in 21 days',
      rootCause: 'Vibration-induced misalignment on optical vane sensor switch #SCH-LEV-88. Brake resistor thermal dissipation degradation.',
      suggestedFix: 'Replace optical vane transducer + re-align rail guide shoes during scheduled Schindler AMC window.',
      capexEstimate: '₹42,000 (Covered under comprehensive AMC)',
      status: approvedClusters.includes('cluster-rc-14') ? 'APPROVED_CAPEX' : 'PENDING_DIRECTIVE'
    }
  ];

  const handleApproveDirective = (id: string, code: string) => {
    setApprovedClusters((prev) => [...prev, id]);
    showToast(`Executive CAPEX Directive approved for ${code}! Dispatched to Facility Head.`);
  };

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
            <span>Governance &amp; RCA</span>
            <span className="text-slate-300">/</span>
            <span className="text-primary font-bold">Chronic Recurrence Queue</span>
          </div>
          <h1 className="font-headline font-bold text-2xl lg:text-3xl text-slate-900 mt-0.5 tracking-tight">
            Community Recurrence Review Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Root Cause Analysis (RCA) and permanent fix approvals for chronic society defects
          </p>
        </div>

        <button
          onClick={() => setActiveTab('memory-graph')}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">hub</span>
          <span>View Lineage on Graph</span>
        </button>
      </div>

      {/* Intro Context Banner */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-950 flex items-start gap-3">
        <span className="material-symbols-outlined text-amber-600 text-[24px] shrink-0 mt-0.5">
          auto_graph
        </span>
        <div>
          <strong className="block font-bold text-amber-900 mb-0.5">
            Automated Recurrence Engine Active
          </strong>
          When multiple residents in the same tower log identical failure categories within 30 days, the engine flags a chronic cluster to prevent repetitive quick-fixes and mandate permanent preventive root cause overhaul.
        </div>
      </div>

      {/* Cluster List */}
      <div className="space-y-5">
        {clusters.map((cluster) => (
          <div
            key={cluster.id}
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary">{cluster.code}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 uppercase">
                    {cluster.severity}
                  </span>
                </div>
                <h3 className="font-headline font-bold text-lg text-slate-900 mt-1">
                  {cluster.title}
                </h3>
                <span className="text-xs text-slate-500 mt-0.5 block">{cluster.frequency}</span>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
                  cluster.status === 'APPROVED_CAPEX'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {cluster.status.replace('_', ' ')}
              </span>
            </div>

            {/* Root cause & Suggested fix grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-slate-700 block">Root Cause Analysis (RCA):</span>
                <p className="text-slate-600 leading-relaxed">{cluster.rootCause}</p>
              </div>

              <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 text-xs space-y-1">
                <span className="font-bold text-blue-900 block">Proposed Engineering Overhaul:</span>
                <p className="text-blue-950 leading-relaxed font-medium">{cluster.suggestedFix}</p>
              </div>
            </div>

            {/* Footer with budget & approval action */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-600">
                Estimated Overhaul Capex: <strong className="text-slate-900 font-bold">{cluster.capexEstimate}</strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedComplaintId('cmp-2024-089');
                    setActiveTab('resolution-timeline');
                  }}
                  className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                >
                  View Related Ticket
                </button>

                {cluster.status === 'PENDING_DIRECTIVE' ? (
                  <button
                    onClick={() => handleApproveDirective(cluster.id, cluster.code)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>Approve Directive &amp; PO</span>
                  </button>
                ) : (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>Directive Signed</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
