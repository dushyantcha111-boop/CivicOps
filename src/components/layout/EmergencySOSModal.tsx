import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';

export const EmergencySOSModal: React.FC = () => {
  const { isSosModalOpen, setIsSosModalOpen, currentUser, selectedTower, showToast, refreshData } = useApp();
  const [category, setCategory] = useState<'FIRE' | 'LIFT_ENTRAPMENT' | 'SECURITY' | 'POWER_OUTAGE' | 'WATER_LEAK'>('FIRE');
  const [location, setLocation] = useState('Tower B, Lift Lobby / Common Shaft');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isSosModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await ApiService.triggerEmergencySos({
        title: `EMERGENCY ALERT: ${category.replace('_', ' ')} reported in ${location}`,
        category,
        tower: selectedTower === 'All Towers' ? 'Tower B' : selectedTower,
        location,
        reportedBy: `${currentUser.name} (${currentUser.role})`
      });

      await refreshData();
      showToast('CRITICAL EMERGENCY BROADCAST DISPATCHED TO 480 RESIDENTS & GUARDHOUSE', 'error');
      setIsSosModalOpen(false);
    } catch (err) {
      showToast('Failed to trigger emergency alert', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border-4 border-red-500 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-red-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[36px] animate-pulse">e911_emergency</span>
            <div>
              <h2 className="font-headline font-bold text-xl tracking-tight">SOCIETY EMERGENCY SOS</h2>
              <p className="text-red-100 text-xs">High-Priority Siren &amp; Multi-Channel Push Broadcast</p>
            </div>
          </div>
          <button
            onClick={() => setIsSosModalOpen(false)}
            className="w-8 h-8 rounded-lg text-white/80 hover:text-white hover:bg-red-700 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-900 text-xs flex items-start gap-2.5">
            <span className="material-symbols-outlined text-red-600 text-[20px] shrink-0 mt-0.5">warning</span>
            <p>
              Triggering this alert sounds the guardhouse alarm siren, overrides access barriers, and sends instant SMS broadcasts to estate marshalls and resident emergency contacts.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Emergency Incident Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'FIRE', label: 'Fire Safety Alert', icon: 'local_fire_department' },
                { type: 'LIFT_ENTRAPMENT', label: 'Lift Entrapment', icon: 'elevator' },
                { type: 'SECURITY', label: 'Security Breach / Threat', icon: 'shield_lock' },
                { type: 'WATER_LEAK', label: 'Major Pipe Burst', icon: 'flood' }
              ].map((item) => (
                <button
                  type="button"
                  key={item.type}
                  onClick={() => setCategory(item.type as any)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                    category === item.type
                      ? 'border-red-600 bg-red-50 text-red-700 ring-2 ring-red-400'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px] text-red-600">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Exact Incident Location
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full h-11 px-3 text-sm rounded-lg border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
              placeholder="e.g. Tower B - 5th Floor Lift Lobby or Pump Room"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Additional Critical Information
            </label>
            <textarea
              rows={2}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full p-3 text-sm rounded-lg border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none resize-none"
              placeholder="Describe injuries, persons trapped, or urgent action needed..."
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSosModalOpen(false)}
              className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">broadcast_on_home</span>
              <span>{isSubmitting ? 'BROADCASTING...' : 'TRIGGER BROADCAST'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
