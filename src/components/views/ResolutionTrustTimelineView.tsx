import React from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';

export const ResolutionTrustTimelineView: React.FC = () => {
  const {
    complaints,
    selectedComplaintId,
    setSelectedComplaintId,
    setActiveTab,
    currentUser,
    role,
    showToast,
    refreshData
  } = useApp();

  const complaint =
    complaints.find((c) => c.id === selectedComplaintId) || complaints[0];

  if (!complaint) {
    return (
      <div className="p-8 text-center text-slate-500">
        No complaints found in the platform.
      </div>
    );
  }

  const handleApproveProposal = async () => {
    try {
      await ApiService.approveResolutionProposal(complaint.id, currentUser.name);
      await refreshData();
      showToast('Resolution proposal approved by Management. Dispatched to resident for sign-off (Step 7 completed).');
    } catch (e) {
      showToast('Approval failed', 'error');
    }
  };

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header & Back Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('complaint-operations')}
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
              Resolution Trust Timeline &amp; Forensic Trail
            </h1>
          </div>
        </div>

        {/* Current status pill */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              complaint.status === 'PROPOSED'
                ? 'bg-purple-100 text-purple-800 animate-pulse'
                : complaint.status === 'RESIDENT_CONFIRMED'
                ? 'bg-emerald-100 text-emerald-800'
                : complaint.status === 'DISPUTED'
                ? 'bg-red-100 text-red-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {complaint.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Ticket Context Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <h2 className="font-headline font-bold text-lg text-slate-900">{complaint.title}</h2>
            <p className="text-xs text-slate-600 leading-relaxed">{complaint.description}</p>
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

        {/* Recurrence Banner if present */}
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

        {/* Evidence Photos: Before vs After Repair */}
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Photographic Evidence Audit (Before &amp; After)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
                Initial Fault Logged (Resident Submission)
              </span>
              <img
                src={
                  complaint.evidenceBefore?.[0] ||
                  'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&auto=format&fit=crop&q=80'
                }
                alt="Before repair"
                className="w-full h-44 rounded-lg object-cover border border-slate-200"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Evidence verified at: {new Date(complaint.submittedAt).toLocaleTimeString()}
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
                Post-Repair Restoration (Technician Resolution Proposal)
              </span>
              {complaint.evidenceAfter?.[0] ? (
                <>
                  <img
                    src={complaint.evidenceAfter[0]}
                    alt="After repair"
                    className="w-full h-44 rounded-lg object-cover border border-slate-200"
                  />
                  <span className="text-[10px] text-emerald-600 font-bold mt-1 block">
                    Dynamic pressure restored: 2.8 Bar confirmed
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
        {complaint.proposedSpares && complaint.proposedSpares.length > 0 && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-700 block mb-1.5">
              Allocated Spares &amp; Requisition Ledger:
            </span>
            <div className="flex flex-wrap gap-2">
              {complaint.proposedSpares.map((sp, idx) => (
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
              Cryptographically timestamped steps with actor identity &amp; RBAC authority
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400">
            {complaint.timeline.length} Steps Recorded
          </span>
        </div>

        {/* Vertical Timeline */}
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {complaint.timeline.map((step) => (
            <div key={step.id} className="relative group">
              {/* Dot */}
              <div
                className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold shadow-xs ${
                  step.status === 'RESIDENT_CONFIRMED' || step.status === 'CLOSED'
                    ? 'bg-emerald-600 text-white'
                    : step.status === 'PROPOSED'
                    ? 'bg-purple-600 text-white'
                    : step.status === 'DISPUTED'
                    ? 'bg-red-600 text-white'
                    : 'bg-primary text-white'
                }`}
              >
                {step.stepNumber}
              </div>

              {/* Card */}
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
            Next Action Recommended (Role: {role})
          </span>
          <div className="font-headline font-bold text-base mt-0.5">
            {complaint.status === 'PROPOSED' && role === 'RESIDENT' && 'Action Required: Verify and Sign-off or Dispute'}
            {complaint.status === 'PROPOSED' && role === 'MANAGEMENT' && 'Review Technician Proposal (Step 7)'}
            {(complaint.status === 'ASSIGNED' || complaint.status === 'INSPECTING') &&
              role === 'MAINTENANCE' &&
              'Submit Inspection Findings & Resolution Proposal (Step 6)'}
            {complaint.status === 'SUBMITTED' && role === 'MANAGEMENT' && 'Management Review Required (Step 2)'}
            {complaint.status === 'RESIDENT_CONFIRMED' && 'Resolution Completed & Sealed (Step 9)'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* If Resident & Proposed -> Sign off */}
          {complaint.status === 'PROPOSED' && (
            <button
              onClick={() => setActiveTab('resident-signoff')}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">rate_review</span>
              <span>Resident Sign-Off / Dispute (Step 8)</span>
            </button>
          )}

          {/* If Management & Proposed -> Approve Proposal */}
          {complaint.status === 'PROPOSED' && (role === 'MANAGEMENT' || role === 'ADMIN') && (
            <button
              onClick={handleApproveProposal}
              className="px-5 py-2.5 bg-primary hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>Approve Proposal (Step 7)</span>
            </button>
          )}

          {/* If Maintenance -> Go to Proposal Form */}
          {(complaint.status === 'ASSIGNED' || complaint.status === 'INSPECTING') && (
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
    </div>
  );
};
