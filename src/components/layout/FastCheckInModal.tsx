import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';

export const FastCheckInModal: React.FC = () => {
  const { isFastCheckInOpen, setIsFastCheckInOpen, showToast, refreshData } = useApp();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState('Delivery / Service');
  const [tower, setTower] = useState('Tower B');
  const [unitNumber, setUnitNumber] = useState('B-402');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isFastCheckInOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const pass = await ApiService.checkInWalkInVisitor({
        name,
        phone,
        purpose,
        tower,
        unitNumber,
        vehicleNumber: vehicleNumber || undefined
      });

      await refreshData();
      showToast(`Visitor ${pass.visitorName} checked in. Boom Barrier Opened!`);
      setIsFastCheckInOpen(false);
      setName('');
      setPhone('');
      setVehicleNumber('');
    } catch (err) {
      showToast('Check-in failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[24px] text-emerald-400">badge</span>
            <div>
              <h3 className="font-headline font-bold text-base">Gate 1 Fast Walk-In Check-In</h3>
              <p className="text-slate-400 text-xs">On-duty security clearance entry</p>
            </div>
          </div>
          <button
            onClick={() => setIsFastCheckInOpen(false)}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Destination Tower</label>
              <select
                value={tower}
                onChange={(e) => setTower(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 bg-white focus:border-primary outline-none"
              >
                <option value="Tower A">Tower A</option>
                <option value="Tower B">Tower B</option>
                <option value="Tower C">Tower C</option>
                <option value="Tower D">Tower D</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Unit Number</label>
              <input
                type="text"
                required
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                placeholder="e.g. B-402"
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 focus:border-primary outline-none uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Visitor / Vendor Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rajesh Kumar"
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Contact Mobile</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 00000"
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 focus:border-primary outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Purpose of Visit</label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Plumber, Guest, Amazon"
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Plate (If Any)</label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="KA-01-AB-1234"
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 focus:border-primary outline-none uppercase"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFastCheckInOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">lock_open</span>
              <span>{isSubmitting ? 'Verifying...' : 'Authorize & Open Barrier'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
