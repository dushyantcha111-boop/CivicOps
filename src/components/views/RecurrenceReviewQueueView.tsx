import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';
import { RecurrenceCluster } from '../../types';

export const RecurrenceReviewQueueView: React.FC = () => {
  const { currentUser, setActiveTab, setSelectedComplaintId, showToast, refreshData } = useApp();

  const [windowDays, setWindowDays] = useState<number>(30);
  const [clusters, setClusters] = useState<RecurrenceCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Investigation Modal
  const [activeCluster, setActiveCluster] = useState<RecurrenceCluster | null>(null);
  const [invStatus, setInvStatus] = useState('APPROVED_CAPEX');
  const [rootCause, setRootCause] = useState('');
  const [suggestedFix, setSuggestedFix] = useState('');
  const [capexEstimate, setCapexEstimate] = useState('');
  const [investigationNotes, setInvestigationNotes] = useState('');
  const [followUpAction, setFollowUpAction] = useState('');
  const [createPm, setCreatePm] = useState(true);
  const [createWo, setCreateWo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canInvestigate = currentUser?.role === 'MANAGEMENT' || currentUser?.role === 'ADMIN';

  const loadQueue = async (days: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiService.getRecurrenceQueue(days);
      setClusters(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recurrence queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue(windowDays);
  }, [windowDays]);

  const openInvestigationModal = (cluster: RecurrenceCluster) => {
    setActiveCluster(cluster);
    setInvStatus(cluster.status === 'PENDING_DIRECTIVE' ? 'APPROVED_CAPEX' : cluster.status);
    setRootCause(cluster.rootCause || '');
    setSuggestedFix(cluster.suggestedFix || '');
    setCapexEstimate(cluster.capexEstimate || '');
    setInvestigationNotes(cluster.investigationNotes || '');
    setFollowUpAction(cluster.followUpAction || '');
    setCreatePm(true);
    setCreateWo(false);
  };

  const handleSaveInvestigation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCluster) return;
    setIsSaving(true);
    try {
      await ApiService.investigateRecurrence(activeCluster.id, {
        status: invStatus,
        rootCause: rootCause.trim() || undefined,
        suggestedFix: suggestedFix.trim() || undefined,
        capexEstimate: capexEstimate.trim() || undefined,
        investigationNotes: investigationNotes.trim() || undefined,
        followUpAction: followUpAction.trim() || undefined,
        createPreventiveSchedule: createPm,
        createWorkOrder: createWo
      });
      await loadQueue(windowDays);
      await refreshData();
      showToast(`Investigation saved for ${activeCluster.clusterCode}.`);
      setActiveCluster(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save investigation', 'error');
    } finally {
      setIsSaving(false);
    }
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
            Live recurring defect detection grouped by tower, category, and asset across PostgreSQL complaints
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex bg-white p-1 rounded-xl border border-slate-200">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setWindowDays(d)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  windowDays === d ? 'bg-primary text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <button
            onClick={() => setActiveTab('memory-graph')}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs"
          >
            <span className="material-symbols-outlined text-[18px]">hub</span>
            <span>Memory Graph</span>
          </button>
        </div>
      </div>

      {/* Intro Banner */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-950 flex items-start gap-3">
        <span className="material-symbols-outlined text-amber-600 text-[24px] shrink-0 mt-0.5">
          auto_graph
        </span>
        <div>
          <strong className="block font-bold text-amber-900 mb-0.5">
            Automated Recurrence Engine Active ({windowDays}-Day Window)
          </strong>
          Identical tower + category or asset failures occurring repeatedly within {windowDays} days are flagged for permanent engineering CAPEX/PM resolution.
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center text-xs text-slate-500">
          Analyzing complaint clusters over {windowDays} days...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-xs text-red-700 font-semibold">
          {error}
        </div>
      ) : clusters.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center text-xs text-slate-500">
          No recurring defect clusters detected within the last {windowDays} days.
        </div>
      ) : (
        <div className="space-y-5">
          {clusters.map((cluster) => {
            const isExpanded = expandedId === cluster.id;
            const related = cluster.relatedComplaints || [];

            return (
              <div
                key={cluster.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{cluster.clusterCode}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 uppercase">
                        {cluster.severity}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">
                        {cluster.tower} • {cluster.category}
                      </span>
                    </div>
                    <h3 className="font-headline font-bold text-lg text-slate-900 mt-1">
                      {cluster.title}
                    </h3>
                    <span className="text-xs text-slate-500 mt-0.5 block">
                      {cluster.incidentCount} incidents in last {cluster.timeWindowDays} days
                      {cluster.assetName ? ` • Asset: ${cluster.assetName}` : ''}
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
                      cluster.status === 'APPROVED_CAPEX' || cluster.status === 'RESOLVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {cluster.status.replace('_', ' ')}
                  </span>
                </div>

                {(cluster.rootCause || cluster.suggestedFix || cluster.investigationNotes) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                      <span className="font-bold text-slate-700 block">Root Cause Analysis (RCA):</span>
                      <p className="text-slate-600 leading-relaxed">{cluster.rootCause || 'Not yet documented'}</p>
                    </div>
                    <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 text-xs space-y-1">
                      <span className="font-bold text-blue-900 block">Proposed Engineering Overhaul:</span>
                      <p className="text-blue-950 leading-relaxed font-medium">{cluster.suggestedFix || 'Pending assessment'}</p>
                    </div>
                  </div>
                )}

                {cluster.investigationNotes && (
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-950">
                    <strong>Investigation Notes ({cluster.investigatedBy || 'Management'}):</strong> {cluster.investigationNotes}
                    {cluster.followUpAction ? ` • Next Action: ${cluster.followUpAction}` : ''}
                  </div>
                )}

                {/* Historical Complaints Toggle */}
                {isExpanded && related.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold uppercase text-slate-500 block">
                      Historical Cluster Complaints ({related.length})
                    </span>
                    <div className="divide-y divide-slate-200">
                      {related.map((rc) => (
                        <div key={rc.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                          <div>
                            <span className="font-mono font-bold text-primary">{rc.ticketNumber}</span>{' '}
                            <span className="font-semibold text-slate-900">{rc.title}</span>
                            {rc.proposedResolution && (
                              <span className="block text-[11px] text-slate-500">
                                Fix: {rc.proposedResolution}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setSelectedComplaintId(rc.id);
                              setActiveTab('resolution-timeline');
                            }}
                            className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-100 shrink-0"
                          >
                            Open Timeline
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="text-xs text-slate-600">
                    Estimated Overhaul Capex: <strong className="text-slate-900">{cluster.capexEstimate || 'TBD'}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : cluster.id)}
                      className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                    >
                      {isExpanded ? 'Hide Complaints' : `View ${related.length} Complaints`}
                    </button>

                    {canInvestigate && (
                      <button
                        onClick={() => openInvestigationModal(cluster)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">fact_check</span>
                        <span>Investigate &amp; Record Directive</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Investigation Modal */}
      {activeCluster && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveInvestigation}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-3.5 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="font-headline font-bold text-base text-slate-900">
              Investigate {activeCluster.clusterCode}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Decision Status</label>
                <select
                  value={invStatus}
                  onChange={(e) => setInvStatus(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="INVESTIGATING">INVESTIGATING</option>
                  <option value="APPROVED_CAPEX">APPROVED_CAPEX</option>
                  <option value="RESOLVED">RESOLVED</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">CAPEX Estimate</label>
                <input
                  type="text"
                  value={capexEstimate}
                  onChange={(e) => setCapexEstimate(e.target.value)}
                  placeholder="e.g. ₹28,500"
                  className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Root Cause Analysis</label>
              <textarea
                rows={2}
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg border border-slate-300 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Suggested Permanent Engineering Fix</label>
              <textarea
                rows={2}
                value={suggestedFix}
                onChange={(e) => setSuggestedFix(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg border border-slate-300 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Investigation Notes</label>
              <textarea
                rows={2}
                required
                value={investigationNotes}
                onChange={(e) => setInvestigationNotes(e.target.value)}
                placeholder="Document management review & technical findings..."
                className="w-full p-2.5 text-xs rounded-lg border border-slate-300 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Follow-up Action</label>
              <input
                type="text"
                value={followUpAction}
                onChange={(e) => setFollowUpAction(e.target.value)}
                placeholder="e.g. Replace PRV assembly and schedule monthly pressure check"
                className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300"
              />
            </div>
            <div className="space-y-1.5 pt-1 text-xs">
              <label className="flex items-center gap-2 font-semibold text-slate-700">
                <input type="checkbox" checked={createPm} onChange={(e) => setCreatePm(e.target.checked)} />
                <span>Create Preventive Maintenance Schedule automatically</span>
              </label>
              <label className="flex items-center gap-2 font-semibold text-slate-700">
                <input type="checkbox" checked={createWo} onChange={(e) => setCreateWo(e.target.checked)} />
                <span>Dispatch corrective Work Order immediately</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveCluster(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold"
              >
                {isSaving ? 'Saving...' : 'Persist Investigation'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

