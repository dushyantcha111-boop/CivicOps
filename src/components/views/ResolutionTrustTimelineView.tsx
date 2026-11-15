import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';

export const ResolutionTrustTimelineView: React.FC = () => {
  const {
    complaints,
    selectedComplaintId,
    setActiveTab,
    currentUser,
    role,
    showToast,
    refreshData
  } = useApp();

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const complaint =
    complaints.find((c) => c.id === selectedComplaintId) || complaints[0];

  if (!currentUser) return null;

  if (!complaint) {
    return (
      <div className="p-8 text-center text-slate-500">
        No complaints found in the platform.
      </div>
    );
  }

  const timeline = complaint.timeline || [];
  const proposedSpares = complaint.proposedSpares || [];
  const isManagerOrAdmin = role === 'MANAGEMENT' || role === 'ADMIN';
  const isMaintenanceOrAdmin = role === 'MAINTENANCE' || role === 'ADMIN';

  const handleApproveProposal = async () => {
    setIsProcessing(true);
    try {
      await ApiService.approveResolutionProposal(complaint.id, currentUser.name);
      await refreshData();
      showToast('Resolution proposal approved by Management. Ready for resident sign-off (Step 7 completed).');
    } catch (e: any) {
      showToast(e?.message || 'Approval failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      showToast('Please provide a reason for rejecting the proposal.', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      await ApiService.rejectResolutionProposal(complaint.id, rejectReason.trim());
      await refreshData();
      showToast('Proposal sent back to technician for re-inspection.', 'info');
      setRejectModalOpen(false);
      setRejectReason('');
    } catch (e: any) {
      showToast(e?.message || 'Rejection failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header & Back Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab(role === 'RESIDENT' ? 'resident-home' : 'complaint-operations')}
            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-primary">{complaint.ticketNumber}</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {complaint.tower} • Flat {complaint.unitNumber}
              </span>
            </div>
            <h1 className="font-headline font-bold text-xl lg:text-2xl text-slate-900 mt-0.5">
              Resolution Trust Timeline &amp; Audit Trail
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              complaint.status === 'PROPOSED' || complaint.status === 'MANAGEMENT_APPROVED'
                ? 'bg-purple-100 text-purple-800'
                : complaint.status === 'RESIDENT_CONFIRMED' || complaint.status === 'CLOSED'
                ? 'bg-emerald-100 text-emerald-800'
                : complaint.status === 'DISPUTED'
                ? 'bg-red-100 text-red-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {complaint.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Ticket Context Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <h2 className="font-headline font-bold text-lg text-slate-900">{complaint.title}</h2>
            <p className="text-xs text-slate-600 leading-relaxed">{complaint.description}</p>
            {complaint.proposedResolution && (
              <div className="mt-2 p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-slate-700">
                <strong className="text-primary block mb-0.5">Proposed Technical Resolution:</strong>
                {complaint.proposedResolution}
              </div>
            )}
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 shrink-0 min-w-[220px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Resident:</span>
              <span className="font-bold text-slate-800">{complaint.residentName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Contact:</span>
              <span className="font-mono text-slate-700">{complaint.residentPhone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Severity:</span>
              <span className="font-bold text-red-600">{complaint.severity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Assigned Lead:</span>
              <span className="font-bold text-primary">{complaint.assignedTechnicianName || 'Unassigned'}</span>
            </div>
          </div>
        </div>

        {complaint.recurrenceWarning && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-amber-600 shrink-0">
              history_toggle_off
            </span>
            <div>
              <span className="font-bold">Community Memory Advisory:</span> {complaint.recurrenceWarning}
            </div>
          </div>
        )}

        {/* Evidence Photos */}
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Photographic Evidence Audit (Before &amp; After)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
                Initial Fault Logged (Before Repair)
              </span>
              {complaint.evidenceBefore?.[0] ? (
                <>
                  <img
                    src={complaint.evidenceBefore[0]}
                    alt="Before repair"
                    className="w-full h-44 rounded-lg object-cover border border-slate-200"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Submitted at: {new Date(complaint.submittedAt).toLocaleString()}
                  </span>
                </>
              ) : (
                <div className="w-full h-44 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <span className="material-symbols-outlined text-[28px] mb-1">image_not_supported</span>
                  <span>No pre-repair photo attached</span>
                </div>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
                Post-Repair Restoration (Technician Proposal)
              </span>
              {complaint.evidenceAfter?.[0] ? (
                <>
                  <img
                    src={complaint.evidenceAfter[0]}
                    alt="After repair"
                    className="w-full h-44 rounded-lg object-cover border border-slate-200"
                  />
                  <span className="text-[10px] text-emerald-600 font-bold mt-1 block">
                    Post-repair evidence recorded
                  </span>
                </>
              ) : (
                <div className="w-full h-44 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <span className="material-symbols-outlined text-[32px] mb-1">hourglass_top</span>
                  <span>Awaiting Technician Photographic Evidence</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Spare parts consumed */}
        {proposedSpares.length > 0 && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-700 block mb-1.5">
              Allocated Spares &amp; Requisition Ledger:
            </span>
            <div className="flex flex-wrap gap-2">
              {proposedSpares.map((sp, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-800 font-medium text-[11px] flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[14px] text-primary">build</span>
                  <span>{sp.partName}</span>
                  <span className="font-bold text-primary">x{sp.quantity}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* The 9-Step Traceable Activity History Timeline */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-headline font-bold text-slate-900 text-base">
              Traceable 9-Step Verification Chain
            </h3>
            <p className="text-xs text-slate-500">
              Timestamped steps with verified actor identity &amp; RBAC role enforcement
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400">
            {timeline.length} Steps Recorded
          </span>
        </div>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {timeline.map((step) => (
            <div key={step.id} className="relative group">
              <div
                className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold shadow-xs ${
                  step.status === 'RESIDENT_CONFIRMED' || step.status === 'CLOSED'
                    ? 'bg-emerald-600 text-white'
                    : step.status === 'PROPOSED' || step.status === 'MANAGEMENT_APPROVED'
                    ? 'bg-purple-600 text-white'
                    : step.status === 'DISPUTED'
                    ? 'bg-red-600 text-white'
                    : 'bg-primary text-white'
                }`}
              >
                {step.stepNumber}
              </div>

              <div className="bg-slate-50/70 group-hover:bg-slate-50 border border-slate-200 rounded-xl p-4 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{step.title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase">
                      {step.actorRole}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(step.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="text-xs text-slate-500 font-medium">Actor: {step.actor}</div>
                <p className="text-xs text-slate-700 mt-2 leading-relaxed bg-white p-3 rounded-lg border border-slate-200/60">
                  {step.notes}
                </p>

                {step.signature && (
                  <div className="mt-2 text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>{step.signature}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role-Based Workflow Contextual Action Dock */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
            Contextual Workflow Action (Role: {role})
          </span>
          <div className="font-headline font-bold text-base mt-0.5">
            {(complaint.status === 'PROPOSED' || complaint.status === 'MANAGEMENT_APPROVED') &&
              role === 'RESIDENT' &&
              'Action Required: Verify Restoration & Sign-off or Dispute (Step 8)'}
            {complaint.status === 'PROPOSED' && isManagerOrAdmin && 'Review Technician Proposal (Step 7)'}
            {(complaint.status === 'ASSIGNED' || complaint.status === 'INSPECTING') &&
              isMaintenanceOrAdmin &&
              'Record Inspection Findings & Propose Resolution (Step 4–6)'}
            {complaint.status === 'SUBMITTED' && isManagerOrAdmin && 'Review & Assign Ticket in Complaint Board (Step 2–3)'}
            {(complaint.status === 'RESIDENT_CONFIRMED' || complaint.status === 'CLOSED') &&
              'Resolution Confirmed & Sealed (Step 9)'}
            {complaint.status === 'DISPUTED' && 'Disputed — Management Re-Dispatch Required'}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(complaint.status === 'PROPOSED' || complaint.status === 'MANAGEMENT_APPROVED') &&
            role === 'RESIDENT' && (
              <button
                onClick={() => setActiveTab('resident-signoff')}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">rate_review</span>
                <span>Resident Sign-Off / Dispute (Step 8)</span>
              </button>
            )}

          {complaint.status === 'PROPOSED' && isManagerOrAdmin && (
            <>
              <button
                onClick={() => setRejectModalOpen(true)}
                disabled={isProcessing}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
                <span>Reject Proposal</span>
              </button>
              <button
                onClick={handleApproveProposal}
                disabled={isProcessing}
                className="px-5 py-2.5 bg-primary hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>{isProcessing ? 'Processing...' : 'Approve Proposal (Step 7)'}</span>
              </button>
            </>
          )}

          {(complaint.status === 'ASSIGNED' || complaint.status === 'INSPECTING') && isMaintenanceOrAdmin && (
            <button
              onClick={() => setActiveTab('inspection-proposal')}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">edit_document</span>
              <span>Complete Inspection &amp; Propose (Step 6)</span>
            </button>
          )}
        </div>
      </div>

      {/* Reject Proposal Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-headline font-bold text-slate-900 text-base">
              Reject Resolution Proposal
            </h3>
            <form onSubmit={handleRejectProposal} className="space-y-3">
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why technician must re-inspect or revise evidence..."
                className="w-full p-3 text-xs rounded-lg border border-slate-300 focus:border-red-500 outline-none resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

