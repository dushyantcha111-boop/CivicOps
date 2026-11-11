import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';

export const VisitorPassQrVerificationView: React.FC = () => {
  const { visitorPasses, setActiveTab, showToast, refreshData } = useApp();

  const [scannedPin, setScannedPin] = useState('849201'); // Default to demo pre-approved pass
  const [activePass, setActivePass] = useState<any | null>(visitorPasses[0] || null);
  const [scannerActive, setScannerActive] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async (pin: string) => {
    setIsVerifying(true);
    try {
      const pass = await ApiService.verifyAndCheckInVisitor(pin);
      setActivePass(pass);
      await refreshData();
      showToast(`Pass verified! Visitor ${pass.visitorName} authorized.`);
    } catch (err) {
      showToast('Pass not found or expired', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSimulateScan = (pin: string) => {
    setScannedPin(pin);
    handleVerify(pin);
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
          <span className="text-xs font-mono font-bold text-primary">ANPR &amp; GATE SCANNER</span>
          <h1 className="font-headline font-bold text-xl lg:text-2xl text-slate-900">
            Visitor Pass QR &amp; OTP Verification
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Optical QR Scanner Viewfinder matching Stitch Screen 18 */}
        <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-between relative overflow-hidden shadow-lg min-h-[380px]">
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider">Gate 1 Optical ANPR Lens</span>
            </div>
            <button
              onClick={() => setScannerActive(!scannerActive)}
              className="text-xs text-slate-400 hover:text-white"
            >
              {scannerActive ? 'Pause Lens' : 'Resume Lens'}
            </button>
          </div>

          {/* Viewfinder Target Box */}
          <div className="my-auto mx-auto w-56 h-56 border-2 border-emerald-400 rounded-2xl relative flex items-center justify-center overflow-hidden">
            {/* Corner Markers */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-0.5 -ml-0.5"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-0.5 -mr-0.5"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-0.5 -ml-0.5"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-0.5 -mr-0.5"></div>

            {/* Scanning Line Animation */}
            {scannerActive && (
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-bounce"></div>
            )}

            <div className="text-center p-3">
              <span className="material-symbols-outlined text-[44px] text-slate-400 mb-2">qr_code_2</span>
              <span className="text-[11px] text-slate-300 block">
                Align Resident Pass QR code within frame
              </span>
            </div>
          </div>

          {/* Quick Simulation Bar */}
          <div className="z-10 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Simulate Scan:</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleSimulateScan('849201')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-md font-mono font-bold"
              >
                Pass GV-8921
              </button>
              <button
                onClick={() => handleSimulateScan('310928')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-md font-mono font-bold"
              >
                Swiggy GV-7742
              </button>
            </div>
          </div>
        </div>

        {/* Verification Result Pass Card matching Stitch High-Contrast Card */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Semantic top bar */}
            <div
              className={`h-1.5 w-full ${
                activePass?.status === 'REVOKED'
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
                    Verification Clearance Result
                  </span>
                  <div className="font-headline font-bold text-xl text-slate-900 mt-1">
                    {activePass ? activePass.visitorName : 'Ready for Scan'}
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {activePass ? `Type: ${activePass.visitorType}` : 'Awaiting input'}
                  </span>
                </div>

                {activePass && (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      activePass.status === 'ENTERED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : activePass.status === 'REVOKED'
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
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      onClick={() => {
                        setActivePass(null);
                        showToast('Entry denied. Pass invalidated.', 'error');
                      }}
                      className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors"
                    >
                      Deny Entry
                    </button>
                    <button
                      onClick={() => {
                        ApiService.verifyAndCheckInVisitor(activePass.sixDigitPin).then(() => {
                          refreshData();
                          showToast('Boom barrier opened! Visitor authorized.');
                        });
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">lock_open</span>
                      <span>Authorize &amp; Open Gate</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Manual Entry Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify(scannedPin);
            }}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3"
          >
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Manual 6-Digit PIN or Pass Code Lookup
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={scannedPin}
                onChange={(e) => setScannedPin(e.target.value)}
                placeholder="Enter 6-digit OTP (e.g. 849201)"
                className="h-10 px-3 flex-1 rounded-xl border border-slate-300 font-mono font-bold text-sm outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={isVerifying}
                className="px-5 py-2 bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0"
              >
                {isVerifying ? 'Checking...' : 'Verify'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
