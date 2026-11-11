import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';

export const InspectionResolutionProposerView: React.FC = () => {
  const {
    complaints,
    selectedComplaintId,
    setActiveTab,
    currentUser,
    spares,
    showToast,
    refreshData
  } = useApp();

  const complaint =
    complaints.find((c) => c.id === selectedComplaintId) || complaints[0];

  const [proposedResolution, setProposedResolution] = useState(
    'Dismantled PRV-B4, cleared particulate sediment from bronze mesh, replaced damaged silicone diaphragm with OEM Watts kit, calibrated output pressure to 2.8 Bar.'
  );
  const [selectedPartId, setSelectedPartId] = useState('sp-01');
  const [partQty, setPartQty] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!complaint) {
    return <div className="p-8 text-center text-slate-500">No ticket selected.</div>;
  }

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const selectedPart = spares.find((p) => p.id === selectedPartId);
      const sparesUsed = selectedPart
        ? [{ partId: selectedPart.id, partName: selectedPart.name, quantity: partQty }]
        : [];

      await ApiService.submitResolutionProposal(complaint.id, currentUser.name, {
        proposedResolution,
        evidenceAfterUrls: [
          'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80'
        ],
        sparesUsed
      });

      await refreshData();
      showToast(
        'Resolution proposal submitted! Sent to Management review and Resident sign-off (Step 6 completed).'
      );
      setActiveTab('resolution-timeline');
    } catch (err) {
      showToast('Failed to submit resolution proposal', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('assigned-work-orders')}
          className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div>
          <span className="text-xs font-mono font-bold text-primary">{complaint.ticketNumber}</span>
          <h1 className="font-headline font-bold text-xl lg:text-2xl text-slate-900">
            Inspection &amp; Resolution Proposer (Step 6)
          </h1>
        </div>
      </div>

      {/* Authority Notice */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
        <span className="material-symbols-outlined text-amber-700 text-[20px] shrink-0 mt-0.5">
          verified_user
        </span>
        <div>
          <strong className="block font-bold">Standard Operating Procedure Enforced:</strong>
          Maintenance staff submits resolution proposals with evidence and part logs. Staff cannot independently mark tickets as resident-confirmed or finally resolved.
        </div>
      </div>

      <form onSubmit={handleSubmitProposal} className="space-y-5">
        {/* Context Summary */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Work Order Target
              </span>
              <h2 className="font-headline font-bold text-base text-slate-900 mt-0.5">
                {complaint.title}
              </h2>
            </div>
            <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
              {complaint.tower} • Unit {complaint.unitNumber}
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">{complaint.description}</p>
        </div>

        {/* Diagnosis & Proposed Resolution */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3.5">
          <h3 className="font-headline font-bold text-slate-900 text-sm">
            Technical Resolution Description &amp; Actions Taken
          </h3>
          <textarea
            rows={4}
            required
            value={proposedResolution}
            onChange={(e) => setProposedResolution(e.target.value)}
            className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none leading-relaxed"
            placeholder="Document all component replacements, calibration measurements, and test run outcomes..."
          />
        </div>

        {/* Spares Consumed */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3.5">
          <h3 className="font-headline font-bold text-slate-900 text-sm">
            Spare Parts Consumed / Allocated
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Select Inventory Spare
              </label>
              <select
                value={selectedPartId}
                onChange={(e) => setSelectedPartId(e.target.value)}
                className="w-full h-10 px-3 text-xs font-medium rounded-lg border border-slate-300 bg-white focus:border-primary outline-none"
              >
                {spares.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (In Stock: {p.currentStock})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity</label>
              <input
                type="number"
                min={1}
                max={5}
                value={partQty}
                onChange={(e) => setPartQty(Number(e.target.value))}
                className="w-full h-10 px-3 text-xs font-medium rounded-lg border border-slate-300 focus:border-primary outline-none"
              />
            </div>
          </div>
        </div>

        {/* Evidence Photo Upload Preview */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3.5">
          <h3 className="font-headline font-bold text-slate-900 text-sm">
            Photographic Resolution Proof (After Repair)
          </h3>
          <div className="flex items-center gap-4">
            <img
              src="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80"
              alt="Resolved work"
              className="w-28 h-28 rounded-xl object-cover border border-slate-200 shadow-xs"
            />
            <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex-1 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold mb-1">
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>Restoration Photo Attached</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Shows new Watts silicone diaphragm installed and digital manometer calibrated to 2.8 Bar dynamic pressure.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('assigned-work-orders')}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            <span>{isSubmitting ? 'Submitting...' : 'Submit Resolution Proposal (Step 6)'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
