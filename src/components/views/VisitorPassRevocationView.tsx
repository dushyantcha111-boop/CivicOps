import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';
import { VisitorPass } from '../../types';

const computeOverstayMinutes = (pass: VisitorPass): number => {
  if (typeof pass.overstayMinutes === 'number' && pass.overstayMinutes > 0) {
    return pass.overstayMinutes;
  }
  if (pass.status === 'ENTERED' && pass.validUntil) {
    const diffMs = Date.now() - new Date(pass.validUntil).getTime();
    if (diffMs > 0) {
      return Math.floor(diffMs / 60000);
    }
  }
  return 0;
};

export const VisitorPassRevocationView: React.FC = () => {
  const { visitorPasses, currentUser, setActiveTab, showToast, refreshData } = useApp();

  const [revokingPassId, setRevokingPassId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE_FLOW' | 'OVERSTAY' | 'REVOKED'>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManagePasses =
    currentUser?.role === 'SECURITY' ||
    currentUser?.role === 'MANAGEMENT' ||
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'RESIDENT';

  const filteredPasses = useMemo(() => {
    return (visitorPasses || []).filter((pass) => {
      const overstay = computeOverstayMinutes(pass);
      if (statusFilter === 'REVOKED' && pass.status !== 'REVOKED') return false;
      if (statusFilter === 'OVERSTAY' && overstay <= 0) return false;
      if (statusFilter === 'ACTIVE_FLOW' && !['PRE_APPROVED', 'ACTIVE', 'ENTERED'].includes(pass.status)) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          pass.visitorName.toLowerCase().includes(q) ||
          pass.passCode.toLowerCase().includes(q) ||
          (pass.unitNumber || '').toLowerCase().includes(q) ||
          (pass.vehicleNumber || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [visitorPasses, statusFilter, search]);

  const handleRevoke = async (passId: string) => {
    if (!reason.trim()) {
      showToast('Please enter a revocation reason', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await ApiService.revokeVisitorPass(passId, reason.trim());
      await refreshData();
      showToast('Visitor pass permanently revoked and blocked from gate clearance.', 'info');
      setRevokingPassId(null);
      setReason('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Revocation failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckOut = async (passId: string) => {
    try {
      await ApiService.checkOutVisitor(passId);
      await refreshData();
      showToast('Visitor exit recorded and pass closed.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to record exit', 'error');
    }
  };

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab(currentUser?.role === 'RESIDENT' ? 'resident-home' : 'gate-console')}
            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <span className="text-xs font-mono font-bold text-red-600">ACCESS RESTRICTIONS &amp; LIFECYCLE</span>
            <h1 className="font-headline font-bold text-xl lg:text-2xl text-slate-900">
              Visitor Pass Revocation &amp; Gate Rules
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search visitor, pass code, flat..."
            className="h-9 px-3 text-xs rounded-xl border border-slate-200 bg-white outline-none w-56"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-9 px-2.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 outline-none"
          >
            <option value="ALL">All Passes</option>
            <option value="ACTIVE_FLOW">Active / Entered</option>
            <option value="OVERSTAY">Overstays</option>
            <option value="REVOKED">Revoked</option>
          </select>
        </div>
      </div>

      {/* Rules Banner */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 flex items-start gap-3">
        <span className="material-symbols-outlined text-slate-500 text-[22px] shrink-0 mt-0.5">
          policy
        </span>
        <div>
          <strong className="block text-slate-900 font-bold mb-0.5">
            Society Security Clearance Protocol
          </strong>
          Revoked passes immediately invalidate 6-digit PINs and pass codes during gate verification. Checked-in visitors exceeding their valid window are automatically flagged as overstays.
        </div>
      </div>

      {/* Passes List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="font-headline font-bold text-slate-900 text-sm">
            Society Visitor Passes &amp; Overstay Violations
          </h3>
          <span className="text-xs font-semibold text-slate-500">
            {filteredPasses.length} Shown ({visitorPasses.length} Total)
          </span>
        </div>

        {filteredPasses.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No visitor passes match the selected filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredPasses.map((pass) => {
              const overstayMinutes = computeOverstayMinutes(pass);
              const isTerminal = pass.status === 'REVOKED' || pass.status === 'EXITED' || pass.status === 'DENIED';

              return (
                <div
                  key={pass.id}
                  className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 ${
                        pass.status === 'REVOKED'
                          ? 'bg-red-600'
                          : overstayMinutes > 0
                          ? 'bg-amber-600'
                          : pass.status === 'EXITED'
                          ? 'bg-slate-400'
                          : 'bg-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[22px]">
                        {pass.status === 'REVOKED' ? 'block' : 'badge'}
                      </span>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{pass.visitorName}</span>
                        <span className="font-mono text-xs text-slate-500 font-semibold">({pass.passCode})</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold">
                          {pass.status.replace('_', ' ')}
                        </span>
                        {overstayMinutes > 0 && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">
                            +{overstayMinutes}m Overstay
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Destination: {pass.tower} • Flat {pass.unitNumber} ({pass.residentName}) • Vehicle: {pass.vehicleNumber || 'Pedestrian'}
                      </div>
                      {pass.revocationReason && (
                        <div className="text-[11px] text-red-600 font-medium mt-1">
                          Revocation Reason: {pass.revocationReason}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {pass.status === 'ENTERED' && canManagePasses && (
                      <button
                        onClick={() => handleCheckOut(pass.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                      >
                        Check Out
                      </button>
                    )}

                    {pass.status === 'REVOKED' ? (
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold uppercase">
                        Revoked &amp; Blocked
                      </span>
                    ) : !isTerminal && canManagePasses ? (
                      <button
                        onClick={() => {
                          setRevokingPassId(pass.id);
                          setReason(
                            overstayMinutes > 0
                              ? `Exceeded valid window by ${overstayMinutes} minutes.`
                              : ''
                          );
                        }}
                        className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors"
                      >
                        Revoke Pass
                      </button>
                    ) : (
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase">
                        {pass.status}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Revocation Modal */}
      {revokingPassId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-headline font-bold text-base text-red-600 flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px]">block</span>
              <span>Confirm Pass Revocation &amp; Gate Lock</span>
            </h3>
            <p className="text-xs text-slate-600">
              This action immediately terminates the pass and records an audit trail entry for gate officers.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Revocation
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="State security or resident cancellation reason..."
                className="w-full p-3 text-xs rounded-lg border border-slate-300 focus:border-red-500 outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setRevokingPassId(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRevoke(revokingPassId)}
                disabled={isSubmitting}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-2xs"
              >
                {isSubmitting ? 'Revoking...' : 'Confirm Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

