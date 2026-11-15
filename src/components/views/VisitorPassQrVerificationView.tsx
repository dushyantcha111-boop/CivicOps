import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';
import { VisitorPass } from '../../types';

export const VisitorPassQrVerificationView: React.FC = () => {
  const { visitorPasses, setActiveTab, showToast, refreshData } = useApp();

  const [codeOrPin, setCodeOrPin] = useState('');
  const [activePass, setActivePass] = useState<VisitorPass | null>(visitorPasses[0] || null);
  const [isVerifying, setIsVerifying] = useState(false);

  const pendingPasses = visitorPasses.filter(
    (p) => p.status === 'PRE_APPROVED' || p.status === 'ACTIVE'
  );

  const handleVerify = async (value: string) => {
    if (!value.trim()) return;
    setIsVerifying(true);
    try {
      const pass = await ApiService.verifyAndCheckInVisitor(value.trim());
      setActivePass(pass);
      await refreshData();
      showToast(`Pass ${pass.passCode} verified! ${pass.visitorName} checked in.`);
    } catch (err: any) {
      showToast(err?.message || 'Pass not found, expired, or revoked', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRevoke = async () => {
    if (!activePass) return;
    setIsVerifying(true);
    try {
      const updated = await ApiService.revokeVisitorPass(activePass.id, 'Denied at Gate Verification Console');
      setActivePass(updated);
      await refreshData();
      showToast(`Pass ${updated.passCode} revoked and denied at gate.`, 'error');
    } catch (err: any) {
      showToast(err?.message || 'Failed to revoke pass', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCheckOut = async () => {
    if (!activePass) return;
    setIsVerifying(true);
    try {
      const updated = await ApiService.checkOutVisitor(activePass.id);
      setActivePass(updated);
      await refreshData();
      showToast(`Visitor ${updated.visitorName} checked out.`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to check out visitor', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('gate-console')}
          className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div>
          <span className="text-xs font-mono font-bold text-primary">GATE VERIFICATION</span>
          <h1 className="font-headline font-bold text-xl lg:text-2xl text-slate-900">
            Visitor Pass QR Code &amp; 6-Digit PIN Verification
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pending Pre-Approved Passes Selector */}
        <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-between shadow-lg min-h-[380px] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span className="text-xs font-bold uppercase tracking-wider">Server-Validated Gate Verification</span>
            </div>
            <span className="text-xs text-slate-400">{pendingPasses.length} Pending</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 leading-relaxed">
            Enter a visitor pass code (e.g. GV-XXXX) or 6-digit PIN from a QR payload, or pick an awaiting pre-approved pass below to inspect and verify against PostgreSQL.
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-56">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Awaiting Pre-Approved Passes
            </span>
            {pendingPasses.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-800/40 text-slate-400 text-xs text-center">
                No pre-approved passes currently awaiting arrival.
              </div>
            ) : (
              pendingPasses.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setCodeOrPin(p.sixDigitPin);
                    setActivePass(p);
                  }}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-colors ${
                    activePass?.id === p.id
                      ? 'bg-emerald-950/60 border-emerald-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs">{p.visitorName}</div>
                    <div className="text-[11px] text-slate-400">
                      {p.tower} • Flat {p.unitNumber} • {p.visitorType}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 text-xs">{p.passCode}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Verification Result & Lookup */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div
              className={`h-1.5 w-full ${
                activePass?.status === 'REVOKED' || activePass?.status === 'EXPIRED'
                  ? 'bg-red-600'
                  : activePass?.status === 'ENTERED'
                  ? 'bg-emerald-600'
                  : 'bg-primary'
              }`}
            ></div>

            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Verification Clearance Record
                  </span>
                  <div className="font-headline font-bold text-xl text-slate-900 mt-1">
                    {activePass ? activePass.visitorName : 'Select or Verify Pass'}
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {activePass ? `Type: ${activePass.visitorType}` : 'Awaiting PIN or Pass Code'}
                  </span>
                </div>

                {activePass && (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      activePass.status === 'ENTERED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : activePass.status === 'REVOKED' || activePass.status === 'EXPIRED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {activePass.status}
                  </span>
                )}
              </div>

              {activePass && (
                <>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Destination Flat:</span>
                      <strong className="text-slate-800 font-bold">
                        {activePass.tower} • Unit {activePass.unitNumber}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Resident Host:</span>
                      <span className="font-bold text-slate-800">{activePass.residentName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Vehicle Tag:</span>
                      <span className="font-mono font-bold text-primary">
                        {activePass.vehicleNumber || 'Pedestrian'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Pass Code &amp; PIN:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {activePass.passCode} (PIN: {activePass.sixDigitPin})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Valid Until:</span>
                      <span className="font-mono text-slate-700">
                        {new Date(activePass.validUntil).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3">
                    {activePass.status !== 'REVOKED' && activePass.status !== 'EXITED' && (
                      <button
                        type="button"
                        disabled={isVerifying}
                        onClick={handleRevoke}
                        className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors"
                      >
                        Revoke / Deny Entry
                      </button>
                    )}

                    {(activePass.status === 'PRE_APPROVED' || activePass.status === 'ACTIVE') && (
                      <button
                        type="button"
                        disabled={isVerifying}
                        onClick={() => handleVerify(activePass.sixDigitPin)}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[18px]">lock_open</span>
                        <span>Verify &amp; Check In</span>
                      </button>
                    )}

                    {activePass.status === 'ENTERED' && (
                      <button
                        type="button"
                        disabled={isVerifying}
                        onClick={handleCheckOut}
                        className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-2xs flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                        <span>Record Check-Out</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify(codeOrPin);
            }}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3"
          >
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Enter 6-Digit PIN or Pass Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={codeOrPin}
                onChange={(e) => setCodeOrPin(e.target.value)}
                placeholder="Enter PIN or GV-XXXX"
                className="h-10 px-3 flex-1 rounded-xl border border-slate-300 font-mono font-bold text-sm outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={isVerifying}
                className="px-5 py-2 bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0"
              >
                {isVerifying ? 'Checking...' : 'Verify & Check In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

