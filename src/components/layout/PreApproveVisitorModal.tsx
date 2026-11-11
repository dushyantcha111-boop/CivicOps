import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';
import { VisitorType } from '../../types';

export const PreApproveVisitorModal: React.FC = () => {
  const { isPreApproveModalOpen, setIsPreApproveModalOpen, currentUser, showToast, refreshData } = useApp();
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorType, setVisitorType] = useState<VisitorType>('GUEST');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [validHours, setValidHours] = useState(8);
  const [generatedPass, setGeneratedPass] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isPreApproveModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const pass = await ApiService.createVisitorPass({
        visitorName,
        visitorPhone,
        visitorType,
        vehicleNumber: vehicleNumber || undefined,
        tower: currentUser.tower || 'Tower B',
        unitNumber: currentUser.unitNumber || 'B-402',
        residentName: currentUser.name,
        validHours
      });

      setGeneratedPass(pass);
      await refreshData();
      showToast(`Visitor Fast Pass ${pass.passCode} generated successfully!`);
    } catch (err) {
      showToast('Failed to create visitor pass', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setGeneratedPass(null);
    setVisitorName('');
    setVisitorPhone('');
    setVehicleNumber('');
    setIsPreApproveModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-primary text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[24px]">person_add</span>
            <div>
              <h3 className="font-headline font-bold text-base">Pre-Approve Visitor Pass</h3>
              <p className="text-white/80 text-xs">Generate Gate Entry Pass &amp; 6-Digit OTP</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {generatedPass ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px]">check_circle</span>
            </div>

            <div>
              <h4 className="font-headline font-bold text-slate-900 text-lg">Entry Pass Activated</h4>
              <p className="text-xs text-slate-500">
                Share this PIN or QR code with {generatedPass.visitorName}
              </p>
            </div>

            {/* Visual Pass Card matching Stitch */}
            <div className="bg-slate-50 border-2 border-dashed border-primary/40 rounded-2xl p-4 text-center">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                Gate Entry Verification PIN
              </span>
              <div className="font-mono text-3xl font-extrabold tracking-wider text-primary my-2">
                {generatedPass.sixDigitPin}
              </div>
              <div className="text-xs font-semibold text-slate-700">
                Pass Code: <span className="font-mono">{generatedPass.passCode}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500 flex justify-between">
                <span>Unit: {generatedPass.unitNumber}</span>
                <span>Type: {generatedPass.visitorType}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `Green Valley Residency Pass: Code ${generatedPass.passCode}, 6-Digit PIN: ${generatedPass.sixDigitPin} for Unit ${generatedPass.unitNumber}`
                  );
                  showToast('Pass details copied to clipboard!');
                }}
                className="flex-1 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
              >
                Copy Pass PIN
              </button>
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-lg bg-primary hover:bg-blue-700 text-white text-xs font-bold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Visitor Type</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['GUEST', 'DELIVERY', 'CAB', 'SERVICE'] as VisitorType[]).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setVisitorType(t)}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      visitorType === t
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Visitor / Guest Name</label>
              <input
                type="text"
                required
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                placeholder="e.g. Vikram Joshi"
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (Optional)</label>
              <input
                type="tel"
                value={visitorPhone}
                onChange={(e) => setVisitorPhone(e.target.value)}
                placeholder="+91 99887 76655"
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle License Plate (Optional)</label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="KA-05-MM-1234"
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pass Validity</label>
              <select
                value={validHours}
                onChange={(e) => setValidHours(Number(e.target.value))}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 bg-white focus:border-primary outline-none"
              >
                <option value={2}>2 Hours (Fast Food / Courier)</option>
                <option value={8}>8 Hours (Today)</option>
                <option value={24}>24 Hours (Full Day)</option>
                <option value={72}>3 Days (Weekend Guest)</option>
              </select>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-primary hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">qr_code</span>
                <span>{isSubmitting ? 'Generating...' : 'Generate Pass PIN'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
