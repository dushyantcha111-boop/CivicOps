import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';
import { ComplaintCategory, ComplaintSeverity } from '../../types';

export const RaiseComplaintView: React.FC = () => {
  const { currentUser, setActiveTab, setSelectedComplaintId, showToast, refreshData, complaints } = useApp();

  const [category, setCategory] = useState<ComplaintCategory>('PLUMBING');
  const [severity, setSeverity] = useState<ComplaintSeverity>('HIGH');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!currentUser) return null;

  const userTower = currentUser.tower || 'Tower B';
  const userUnit = currentUser.unitNumber || 'B-402';

  const recurringMatches = complaints.filter(
    (c) => c.tower === userTower && c.category === category && c.status !== 'CLOSED'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !description.trim()) {
      setError('Please enter both a subject and detailed description.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newComplaint = await ApiService.createComplaint({
        title: title.trim(),
        description: description.trim(),
        category,
        severity,
        tower: userTower,
        unitNumber: userUnit,
        evidenceBefore: evidenceUrl.trim() ? [evidenceUrl.trim()] : []
      });

      await refreshData();
      showToast(`Complaint registered successfully as ${newComplaint.ticketNumber}!`);
      setSelectedComplaintId(newComplaint.id);
      setActiveTab('resolution-timeline');
    } catch (err: any) {
      const msg = err?.message || 'Failed to submit complaint';
      setError(msg);
      showToast(msg, 'error');
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
                  Flat {userUnit}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase tracking-wide">
                  {userTower}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Resident: {currentUser.name} ({currentUser.designation || 'Resident'})
              </p>
            </div>
          </div>
          {recurringMatches.length >= 2 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold shrink-0">
              <span className="w-2 h-2 rounded-full bg-amber-600"></span>
              Recurring Zone
            </span>
          )}
        </div>

        {/* Live Incident Pattern Indicator from Backend Complaints */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
          <span className="material-symbols-outlined text-[18px] text-primary shrink-0">hub</span>
          <span className="text-slate-700">
            <strong>Live Community History ({userTower} • {category}):</strong>{' '}
            {recurringMatches.length} active ticket(s) logged in this category. Backend workflow auto-checks recurrence on submission.
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category Selector */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Service Category
            </label>
            <span className="text-xs text-primary font-semibold">7 Categories Supported</span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { id: 'PLUMBING', label: 'Plumbing & Seepage', icon: 'plumbing' },
              { id: 'ELECTRICAL', label: 'Electrical & Power', icon: 'bolt' },
              { id: 'ELEVATOR', label: 'Elevators', icon: 'elevator' },
              { id: 'HVAC', label: 'HVAC & Exhaust', icon: 'mode_fan' },
              { id: 'CIVIL', label: 'Civil & Masonry', icon: 'foundation' },
              { id: 'SECURITY', label: 'Security Systems', icon: 'shield' },
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
              placeholder="e.g. Low water pressure in master bathroom riser"
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
              placeholder="Describe when the issue began, affected fixtures, and any unusual sounds or leaks..."
              className="w-full p-3 text-sm rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Evidence Image URL (Optional)
            </label>
            <input
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://... (optional photo link of fault before repair)"
              className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            />
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
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            <span>{isSubmitting ? 'Registering...' : 'Submit Service Ticket (Step 1)'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

