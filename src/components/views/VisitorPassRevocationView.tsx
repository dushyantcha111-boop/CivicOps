import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';

export const VisitorPassRevocationView: React.FC = () => {
  const { visitorPasses, setActiveTab, showToast, refreshData } = useApp();

  const [revokingPassId, setRevokingPassId] = useState<string | null>(null);
  const [reason, setReason] = useState('Overstayed permitted service duration without resident extension.');

  const handleRevoke = async (passId: string) => {
    try {
      await ApiService.revokeVisitorPass(passId, reason);
      await refreshData();
      showToast('Visitor pass permanently revoked and blacklisted from ANPR barrier clearance!', 'error');
      setRevokingPassId(null);
    } catch (e) {
      showToast('Revocation failed', 'error');
    }
  };

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('gate-console')}
          className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div>
          <span className="text-xs font-mono font-bold text-red-600">ACCESS RESTRICTIONS &amp; BLACKLIST</span>
          <h1 className="font-headline font-bold text-xl lg:text-2xl text-slate-900">
            Visitor Pass Revocation &amp; Gate Rules
          </h1>
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
          Revoked passes immediately invalidate 6-digit OTP verification and prevent automated boom barrier opening. Guardhouse sirens trigger if a revoked license plate is detected by Gate 1 ANPR.
        </div>
      </div>

      {/* Passes List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="font-headline font-bold text-slate-900 text-sm">
            Active Society Passes &amp; Overstay Violations
          </h3>
          <span className="text-xs font-semibold text-slate-500">
            {visitorPasses.length} Total Passes in System
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {visitorPasses.map((pass) => (
            <div
              key={pass.id}
              className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 ${
                    pass.status === 'REVOKED'
                      ? 'bg-red-600'
                      : pass.overstayMinutes
                      ? 'bg-amber-600'
                      : 'bg-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[22px]">
                    {pass.status === 'REVOKED' ? 'block' : 'badge'}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{pass.visitorName}</span>
                    <span className="font-mono text-xs text-slate-500 font-semibold">({pass.passCode})</span>
                    {pass.overstayMinutes && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">
                        +{pass.overstayMinutes}m Overstay
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
                {pass.status === 'REVOKED' ? (
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold uppercase">
                    Revoked &amp; Blacklisted
                  </span>
                ) : (
                  <button
                    onClick={() => setRevokingPassId(pass.id)}
                    className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors"
                  >
                    Revoke Pass
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Revocation Modal */}
      {revokingPassId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-headline font-bold text-slate-900 text-base text-red-600 flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px]">block</span>
              <span>Confirm Pass Revocation &amp; Gate Lock</span>
            </h3>
            <p className="text-xs text-slate-600">
              This action immediately terminates the pass and registers a security alert for gate officers.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Revocation
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
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
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-2xs"
              >
                Confirm Revoke
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
