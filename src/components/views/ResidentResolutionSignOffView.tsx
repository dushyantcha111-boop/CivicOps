import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';

export const ResidentResolutionSignOffView: React.FC = () => {
  const {
    complaints,
    selectedComplaintId,
    setActiveTab,
    currentUser,
    showToast,
    refreshData
  } = useApp();

  const complaint =
    complaints.find((c) => c.id === selectedComplaintId) || complaints[0];

  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('Water pressure is fully restored. Technician was professional and clean.');
  const [disputeReason, setDisputeReason] = useState('');
  const [isDisputing, setIsDisputing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!complaint) {
    return <div className="p-8 text-center text-slate-500">No ticket selected.</div>;
  }

  const handleConfirmSignOff = async () => {
    setIsSubmitting(true);
    try {
      await ApiService.residentConfirmResolution(
        complaint.id,
        currentUser.name,
        rating,
        feedback,
        `DIGITAL-SIG-SHA256-${Date.now()}`
      );
      await refreshData();
      showToast('Resolution confirmed & digitally signed off! Ticket closed successfully (Step 8 & 9 completed).');
      setActiveTab('resolution-timeline');
    } catch (e) {
      showToast('Sign-off failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeReason.trim()) {
      showToast('Please specify the dispute reason', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await ApiService.residentDisputeResolution(complaint.id, currentUser.name, disputeReason);
      await refreshData();
      showToast('Resolution dispute recorded! Ticket re-escalated to Estate Management.', 'error');
      setActiveTab('resolution-timeline');
    } catch (e) {
      showToast('Dispute failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('resident-home')}
          className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div>
          <span className="text-xs font-mono font-bold text-primary">{complaint.ticketNumber}</span>
          <h1 className="font-headline font-bold text-xl lg:text-2xl text-slate-900">
            Resident Resolution Sign-Off (Step 8)
          </h1>
        </div>
      </div>

      {/* Ticket Details & Proposed Resolution */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {complaint.category} • Flat {complaint.unitNumber}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold">
              Proposed by {complaint.assignedTechnicianName || 'Technician'}
            </span>
          </div>
          <h2 className="font-headline font-bold text-lg text-slate-900 mt-1">{complaint.title}</h2>
        </div>

        {/* Proposed Resolution Note */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
          <span className="text-xs font-bold text-slate-700 block">
            Technician Diagnosis &amp; Rectification:
          </span>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            "{complaint.proposedResolution || 'Technician completed the repair and verified system health.'}"
          </p>
        </div>

        {/* Evidence Photos */}
        <div>
          <span className="text-xs font-bold text-slate-700 block mb-2">Restoration Evidence:</span>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-slate-500 block mb-1">Before Repair:</span>
              <img
                src={
                  complaint.evidenceBefore?.[0] ||
                  'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&auto=format&fit=crop&q=80'
                }
                alt="Before"
                className="w-full h-36 rounded-lg object-cover border border-slate-200"
              />
            </div>
            <div>
              <span className="text-[10px] text-emerald-600 font-bold block mb-1">After Repair:</span>
              <img
                src={
                  complaint.evidenceAfter?.[0] ||
                  'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80'
                }
                alt="After"
                className="w-full h-36 rounded-lg object-cover border border-slate-200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Decision Card: Sign Off vs Dispute */}
      {!isDisputing ? (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-headline font-bold text-slate-900 text-base">
                Confirm Service Completion
              </h3>
              <p className="text-xs text-slate-500">
                Are you satisfied with the work performed by the maintenance staff?
              </p>
            </div>
            <button
              onClick={() => setIsDisputing(true)}
              className="text-xs font-bold text-red-600 hover:underline"
            >
              Raise a Dispute Instead
            </button>
          </div>

          {/* Star Rating */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Rate Service Quality
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 text-amber-400 hover:scale-110 transition-transform"
                >
                  <span
                    className={`material-symbols-outlined text-[32px] ${
                      rating >= star ? 'fill-1 text-amber-400' : 'text-slate-300'
                    }`}
                  >
                    star
                  </span>
                </button>
              ))}
              <span className="text-xs font-bold text-slate-700 ml-2">
                {rating === 5 ? 'Excellent (5/5)' : `${rating} Stars`}
              </span>
            </div>
          </div>

          {/* Feedback */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
              Resident Remarks &amp; Feedback
            </label>
            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:border-primary outline-none resize-none leading-relaxed"
              placeholder="Share any comments regarding promptness, cleanliness, or satisfaction..."
            />
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
              Digital Signature will be recorded
            </span>

            <button
              onClick={handleConfirmSignOff}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{isSubmitting ? 'Signing Off...' : 'Confirm & Sign Off (Step 8)'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Dispute Form */
        <form onSubmit={handleDispute} className="bg-red-50/60 rounded-2xl p-6 border-2 border-red-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-red-200">
            <div className="flex items-center gap-2 text-red-700 font-bold">
              <span className="material-symbols-outlined text-[22px]">error</span>
              <h3 className="font-headline font-bold text-base">Raise Resolution Dispute</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsDisputing(false)}
              className="text-xs font-bold text-slate-600 hover:underline"
            >
              Back to Sign-off
            </button>
          </div>

          <p className="text-xs text-red-900 leading-relaxed">
            If the problem persists, water pressure is still inadequate, or cleanup was incomplete, dispute the resolution. This re-opens the work order and alerts the Estate Management Lead.
          </p>

          <div>
            <label className="block text-xs font-bold text-red-900 mb-1 uppercase tracking-wider">
              Reason for Dispute
            </label>
            <textarea
              rows={3}
              required
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              className="w-full p-3 text-xs rounded-xl border border-red-300 bg-white focus:border-red-500 outline-none resize-none leading-relaxed"
              placeholder="Explain why the proposed resolution does not resolve your problem..."
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-red-200">
            <button
              type="button"
              onClick={() => setIsDisputing(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">report_problem</span>
              <span>{isSubmitting ? 'Filing...' : 'Submit Dispute to Management'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
