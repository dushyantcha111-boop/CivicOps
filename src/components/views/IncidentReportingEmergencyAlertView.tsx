import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';

export const IncidentReportingEmergencyAlertView: React.FC = () => {
  const { incidents, currentUser, setIsSosModalOpen, showToast, refreshData } = useApp();

  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canResolve =
    currentUser?.role === 'SECURITY' ||
    currentUser?.role === 'MANAGEMENT' ||
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'MAINTENANCE';

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingId || !resolutionNotes.trim()) {
      showToast('Please enter resolution notes', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await ApiService.resolveIncident(resolvingId, resolutionNotes.trim());
      await refreshData();
      showToast('Incident resolved and logged to audit trail.');
      setResolvingId(null);
      setResolutionNotes('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to resolve incident', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
            <span>Life Safety &amp; Command</span>
            <span className="text-slate-300">/</span>
            <span className="text-red-600 font-bold">Emergency Operations Console</span>
          </div>
          <h1 className="font-headline font-bold text-2xl lg:text-3xl text-slate-900 mt-0.5 tracking-tight">
            Incident Reporting &amp; Emergency Alert
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time SOS tracking, response log, and incident resolution workflow
          </p>
        </div>

        <button
          onClick={() => setIsSosModalOpen(true)}
          className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[20px]">e911_emergency</span>
          <span>TRIGGER SOCIETY EMERGENCY SOS</span>
        </button>
      </div>

      {/* Incidents List */}
      {(incidents || []).length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center text-xs text-slate-500">
          No emergency incidents recorded.
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((inc) => {
            const isResolved = inc.status === 'RESOLVED';
            const actions = inc.actionsTaken || [];

            return (
              <div
                key={inc.id}
                className={`rounded-2xl p-6 shadow-sm space-y-4 relative overflow-hidden border-2 ${
                  isResolved
                    ? 'bg-white border-emerald-200'
                    : 'bg-red-50 border-red-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-xl text-white flex items-center justify-center shrink-0 shadow-md ${
                        isResolved ? 'bg-emerald-600' : 'bg-red-600'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[28px]">
                        {isResolved ? 'verified_user' : 'warning'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                            isResolved ? 'bg-emerald-100 text-emerald-800' : 'bg-red-200/60 text-red-700'
                          }`}
                        >
                          {inc.alertCode}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span
                          className={`text-xs font-bold uppercase ${
                            isResolved ? 'text-emerald-700' : 'text-red-800'
                          }`}
                        >
                          {inc.severity}
                        </span>
                      </div>
                      <h2 className="font-headline font-bold text-xl text-slate-900 mt-1">
                        {inc.title}
                      </h2>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Location: <strong>{inc.location} ({inc.tower})</strong> • Reported by {inc.reportedBy} at{' '}
                        {new Date(inc.reportedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
                      isResolved ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white animate-pulse'
                    }`}
                  >
                    {inc.status}
                  </span>
                </div>

                {/* Action taken logs */}
                <div className="bg-white/90 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
                  <span className="font-bold text-slate-900 block">Protocol Actions Logged:</span>
                  {actions.length === 0 ? (
                    <p className="text-slate-500">SOS alert persisted and broadcast to operations team.</p>
                  ) : (
                    <ul className="space-y-1 text-slate-700 list-disc list-inside">
                      {actions.map((action, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {action}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-mono">
                    <span>Notifications Dispatched: {inc.smsSentCount} recipients</span>
                    {inc.resolvedAt && (
                      <span>
                        Resolved by {inc.resolvedBy || 'Staff'} at {new Date(inc.resolvedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {inc.resolutionNotes && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
                      <strong>Resolution Summary:</strong> {inc.resolutionNotes}
                    </div>
                  )}
                </div>

                {!isResolved && canResolve && (
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => {
                        setResolvingId(inc.id);
                        setResolutionNotes('');
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span>Resolve &amp; Close Incident</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Emergency Responder Directory */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
        <h3 className="font-headline font-bold text-slate-900 text-base">
          Emergency Services Hotlines &amp; On-Site Responders
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { name: 'Fire Control Room', number: '101', icon: 'local_fire_department', color: 'bg-red-100 text-red-700' },
            { name: 'Security Gate 1 Desk', number: 'Intercom #100', icon: 'shield_person', color: 'bg-emerald-100 text-emerald-700' },
            { name: 'Lift Rapid Rescue Desk', number: 'Intercom #105 (24x7)', icon: 'elevator', color: 'bg-blue-100 text-primary' },
            { name: 'Police Emergency', number: '112', icon: 'local_police', color: 'bg-slate-100 text-slate-700' },
            { name: 'Ambulance & Trauma', number: '108', icon: 'medical_services', color: 'bg-amber-100 text-amber-700' },
            { name: 'Facilities Engineering Desk', number: 'Intercom #102', icon: 'engineering', color: 'bg-purple-100 text-purple-700' }
          ].map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-900 text-xs block truncate">{item.name}</span>
                <span className="font-mono text-primary font-semibold text-[11px] block mt-0.5 truncate">{item.number}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resolve Incident Modal */}
      {resolvingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleResolveSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <h3 className="font-headline font-bold text-slate-900 text-base flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-[22px]">verified_user</span>
              <span>Resolve Emergency Incident</span>
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Resolution &amp; Root Cause Notes
              </label>
              <textarea
                rows={3}
                required
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Document containment steps, responder clearance, and verification..."
                className="w-full p-3 text-xs rounded-lg border border-slate-300 focus:border-emerald-600 outline-none resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResolvingId(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-2xs"
              >
                {isSubmitting ? 'Saving...' : 'Confirm Resolution'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

