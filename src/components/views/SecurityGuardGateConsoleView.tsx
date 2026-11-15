import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';

export const SecurityGuardGateConsoleView: React.FC = () => {
  const {
    currentUser,
    visitorPasses,
    setIsFastCheckInOpen,
    setActiveTab,
    setIsSosModalOpen,
    showToast,
    refreshData
  } = useApp();

  const [otpInput, setOtpInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const activePasses = visitorPasses.filter(
    (p) => p.status === 'ENTERED' || p.status === 'PRE_APPROVED' || p.status === 'ACTIVE'
  );

  const nowMs = Date.now();
  const overstayPasses = visitorPasses.filter((p) => {
    if (p.overstayMinutes && p.overstayMinutes > 0) return true;
    if (p.status === 'ENTERED' && p.validUntil) {
      return new Date(p.validUntil).getTime() < nowMs;
    }
    return false;
  });

  const filteredPasses = activePasses.filter(
    (p) =>
      p.visitorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.unitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.vehicleNumber && p.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.passCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sixDigitPin.includes(searchQuery)
  );

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput.trim()) return;
    setIsVerifying(true);
    try {
      const pass = await ApiService.verifyAndCheckInVisitor(otpInput.trim());
      await refreshData();
      showToast(`Pass ${pass.passCode} verified for ${pass.visitorName}. Visitor checked in!`);
      setOtpInput('');
    } catch (err: any) {
      showToast(err?.message || 'Invalid PIN or expired/revoked visitor pass', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCheckOut = async (passId: string, visitorName: string) => {
    try {
      await ApiService.checkOutVisitor(passId);
      await refreshData();
      showToast(`Visitor ${visitorName} checked out and gate exit logged.`);
    } catch (err: any) {
      showToast(err?.message || 'Check-out failed', 'error');
    }
  };

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto space-y-5 pb-20">
      {/* Gatehouse Status Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[26px]">shield_person</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h1 className="font-headline font-bold text-lg text-slate-900">
                Gate 1 - Main Entrance Console
              </h1>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              On Duty: {currentUser?.name || 'Security Officer'} • {activePasses.length} Active Passes Inside / Pending
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsSosModalOpen(true)}
          className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">e911_emergency</span>
          <span>EMERGENCY SOS</span>
        </button>
      </div>

      {/* Live Overstay Banner from Database */}
      {overstayPasses.length > 0 && (
        <div
          onClick={() => setActiveTab('visitor-revocation')}
          className="w-full bg-red-50 text-red-950 border border-red-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs hover:bg-red-100/70 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-[24px]">timer</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-600 text-white">
                  {overstayPasses.length} Overstay Alert
                </span>
                <span className="text-xs font-bold truncate">
                  {overstayPasses[0].visitorName} • Flat {overstayPasses[0].unitNumber}
                </span>
              </div>
              <p className="text-xs text-red-800 truncate mt-0.5">
                Pass {overstayPasses[0].passCode} exceeded validity window ({overstayPasses[0].vehicleNumber || 'Pedestrian'})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-red-700 font-bold text-xs shrink-0 pl-2">
            <span>Manage Passes</span>
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </div>
        </div>
      )}

      {/* High-Touch Action Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => setIsFastCheckInOpen(true)}
          className="min-h-[100px] bg-primary text-white rounded-2xl p-5 flex flex-col justify-between text-left shadow-sm hover:bg-blue-700 active:scale-[0.98] transition-all"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[24px]">person_add</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white uppercase">
              Walk-In Entry
            </span>
          </div>
          <div className="mt-2">
            <div className="font-headline font-bold text-base block leading-tight">Fast Walk-In Check-In</div>
            <span className="text-xs text-white/80 block mt-0.5">Issue gate pass &amp; log entry for walk-in visitors</span>
          </div>
        </button>

        <div className="min-h-[100px] bg-emerald-700 text-white rounded-2xl p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between w-full">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[24px]">qr_code_scanner</span>
            </div>
            <button
              onClick={() => setActiveTab('visitor-qr-verify')}
              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-emerald-900 hover:bg-emerald-50 uppercase transition-colors"
            >
              Open Verification View
            </button>
          </div>

          <form onSubmit={handleVerifyOtp} className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value)}
              placeholder="Enter Pass Code or 6-Digit PIN"
              className="h-10 px-3 bg-white text-slate-900 font-mono font-bold text-sm rounded-xl outline-none placeholder:text-slate-400 w-full"
            />
            <button
              type="submit"
              disabled={isVerifying}
              className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shrink-0 transition-colors"
            >
              {isVerifying ? 'Verifying...' : 'Verify & Check In'}
            </button>
          </form>
        </div>
      </div>

      {/* Live Active Gate Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
          <div>
            <h3 className="font-headline font-bold text-slate-900 text-base">
              Live Gate Traffic &amp; Active Visitor Passes
            </h3>
            <p className="text-xs text-slate-500">
              Verified check-in &amp; check-out lifecycle persisted in PostgreSQL
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-300 w-full sm:w-64">
            <span className="material-symbols-outlined text-[18px] text-slate-400">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plate, unit, code, PIN..."
              className="text-xs outline-none bg-transparent w-full text-slate-800"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Pass Code</th>
                <th className="py-3 px-4">Visitor &amp; Type</th>
                <th className="py-3 px-4">Unit Destination</th>
                <th className="py-3 px-4">Vehicle Plate</th>
                <th className="py-3 px-4">Check-in Time</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPasses.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-primary">
                    {p.passCode}
                    <span className="text-slate-400 text-[10px] block font-sans">PIN: {p.sixDigitPin}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">{p.visitorName}</span>
                    <span className="text-[11px] text-slate-500">{p.visitorPhone}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-800">{p.tower}</span>
                    <span className="text-slate-500 block text-[11px]">Flat {p.unitNumber}</span>
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                    {p.vehicleNumber || <span className="text-slate-400 italic">Pedestrian</span>}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                    {p.checkInTime ? new Date(p.checkInTime).toLocaleTimeString() : 'Awaiting Entry'}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === 'ENTERED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : p.status === 'PRE_APPROVED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {p.status === 'ENTERED' ? (
                      <button
                        onClick={() => handleCheckOut(p.id, p.visitorName)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold text-xs"
                      >
                        Check Out
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          try {
                            await ApiService.verifyAndCheckInVisitor(p.sixDigitPin);
                            await refreshData();
                            showToast(`Visitor ${p.visitorName} checked in.`);
                          } catch (err: any) {
                            showToast(err?.message || 'Verification failed', 'error');
                          }
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs"
                      >
                        Verify &amp; Enter
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredPasses.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No matching active visitor passes.
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

