import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';
import { ComplaintCategory, ComplaintSeverity } from '../../types';

export const RaiseComplaintView: React.FC = () => {
  const { currentUser, setActiveTab, setSelectedComplaintId, showToast, refreshData, complaints } = useApp();

  const [category, setCategory] = useState<ComplaintCategory>('PLUMBING');
  const [severity, setSeverity] = useState<ComplaintSeverity>('HIGH');
  const [title, setTitle] = useState('Severe Low Water Pressure in Master Bathroom Riser');
  const [description, setDescription] = useState(
    'Since 7:00 AM today, water flow in the master bathroom shower and washbasin is down to a trickle. Similar issue was noted by neighbor in B-401.'
  );
  const [linkToCluster, setLinkToCluster] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if recurrence matches
  const recurringMatches = complaints.filter(
    (c) =>
      c.tower === (currentUser.tower || 'Tower B') &&
      c.category === category
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newComplaint = await ApiService.createComplaint({
        title,
        description,
        category,
        severity,
        tower: currentUser.tower || 'Tower B',
        unitNumber: currentUser.unitNumber || 'B-402',
        residentId: currentUser.id,
        residentName: currentUser.name,
        residentPhone: currentUser.phone,
        evidenceBefore: [
          'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&auto=format&fit=crop&q=80'
        ]
      });

      await refreshData();
      showToast(`Complaint registered successfully as ${newComplaint.ticketNumber}!`);
      setSelectedComplaintId(newComplaint.id);
      setActiveTab('resolution-timeline');
    } catch (err) {
      showToast('Failed to submit complaint', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto space-y-4 pb-16">
      {/* Unit Context Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-primary flex items-center justify-center shrink-0 border border-blue-100">
              <span className="material-symbols-outlined text-[26px]">apartment</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-headline font-bold text-lg text-slate-900">
                  Flat {currentUser.unitNumber || 'B-402'}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase tracking-wide">
                  {currentUser.tower || 'Tower B'} • West
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Resident: {currentUser.name} ({currentUser.designation || 'Primary Owner'})
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold shrink-0">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            Elevated Triage
          </span>
        </div>

        {/* Live Micro-telemetry Hotspot ticker */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
          <span className="material-symbols-outlined text-[18px] text-red-600 shrink-0">warning</span>
          <span className="text-slate-700 truncate">
            <strong>Shaft #4 Wet Riser Hotspot:</strong> {recurringMatches.length || 3} previous incidents logged in rolling window
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category Selector */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Service Category
            </label>
            <span className="text-xs text-primary font-semibold">5 Categories Available</span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { id: 'PLUMBING', label: 'Plumbing & Seepage', icon: 'plumbing' },
              { id: 'ELECTRICAL', label: 'Electrical & Power', icon: 'bolt' },
              { id: 'ELEVATOR', label: 'Elevators', icon: 'elevator' },
              { id: 'HVAC', label: 'HVAC & Exhaust', icon: 'mode_fan' },
              { id: 'COMMON_AREA', label: 'Common Area', icon: 'deck' }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id as ComplaintCategory)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  category === cat.id
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Smart Recurrence & Community Memory Advisory Card matching Stitch Screen 3 */}
        {category === 'PLUMBING' && (
          <div className="bg-gradient-to-br from-blue-50/80 via-white to-slate-50 rounded-2xl p-5 border-2 border-primary/20 shadow-sm relative overflow-hidden">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-[24px]">hub</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-headline font-bold text-slate-900 text-base">
                    Correlated Duct Lineage Detected
                  </span>
                  <span className="px-2 py-0.5 bg-blue-100 text-primary text-[10px] rounded-full font-bold">
                    Memory Graph #RC-2024-09
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Our predictive mesh links this duct to <strong className="text-slate-900">Shaft #4 CPVC Vertical Riser (#AST-CPVC-04)</strong>. Two historic pressure anomalies occurred on your line recently.
                </p>

                {/* SVG Surge Micro-Telemetry Wave from Stitch design */}
                <div className="bg-white rounded-xl p-3 mt-3 border border-slate-200">
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <span className="text-slate-500 font-medium">Upstream Pressure Telemetry (Booster P-02)</span>
                    <span className="font-bold text-red-600 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">trending_up</span>
                      <span>Micro-fissure Risk</span>
                    </span>
                  </div>
                  <svg className="w-full h-8 text-primary" fill="none" preserveAspectRatio="none" viewBox="0 0 300 32">
                    <path
                      d="M0 20 Q 25 20, 50 18 T 100 22 T 150 16 T 200 25 T 230 4 T 240 28 T 260 8 T 280 20 L 300 18"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                    />
                    <path
                      d="M0 20 Q 25 20, 50 18 T 100 22 T 150 16 T 200 25 T 230 4 T 240 28 T 260 8 T 280 20 L 300 18 L 300 32 L 0 32 Z"
                      fill="currentColor"
                      fillOpacity="0.08"
                    />
                    <circle className="fill-red-600 animate-ping" cx="230" cy="4" r="3.5" />
                    <circle className="fill-red-600" cx="230" cy="4" r="3" />
                  </svg>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                    <span>06:00 AM (Base 3.2 bar)</span>
                    <span className="text-red-600 font-bold">07:15 AM (Spike 5.8 bar)</span>
                    <span>Now (Residual 0.6 bar)</span>
                  </div>
                </div>

                {/* Auto-Cluster Link Toggle */}
                <label className="mt-3 flex items-start gap-3 p-3 rounded-xl bg-slate-100/80 cursor-pointer select-none border border-slate-200">
                  <input
                    type="checkbox"
                    checked={linkToCluster}
                    onChange={(e) => setLinkToCluster(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded text-primary accent-primary"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block leading-tight">
                      Link to Recurring Shaft #4 Incident Cluster
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Auto-associates ticket with Cluster #RC-2024-09 for accelerated MEP lead dispatch and bypasses preliminary checks.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Severity Selector */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-2">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
            Severity &amp; Urgency
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as ComplaintSeverity[]).map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setSeverity(sev)}
                className={`py-2 px-1 rounded-xl text-xs font-bold text-center transition-all ${
                  severity === sev
                    ? sev === 'CRITICAL'
                      ? 'bg-red-600 text-white'
                      : sev === 'HIGH'
                      ? 'bg-amber-500 text-white'
                      : 'bg-primary text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Ticket Details Form */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Complaint Subject
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 px-3 text-sm rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Detailed Description &amp; Fault Symptoms
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 text-sm rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Inspection Photo Proof (Before Repair)
            </label>
            <div className="flex items-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&auto=format&fit=crop&q=80"
                alt="Fault preview"
                className="w-20 h-20 rounded-xl object-cover border border-slate-200"
              />
              <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex-1 text-center text-xs text-slate-500">
                <span className="material-symbols-outlined text-[20px] text-primary block">photo_camera</span>
                <span>Photo attached: Riser pressure gauge reading 0.6 bar</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('resident-home')}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            <span>{isSubmitting ? 'Registering...' : 'Submit Service Ticket (Step 1)'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
