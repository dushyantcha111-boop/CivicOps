import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export const ResidentHomeView: React.FC = () => {
  const {
    currentUser,
    complaints,
    visitorPasses,
    parcels,
    setIsPreApproveModalOpen,
    setActiveTab,
    setSelectedComplaintId,
    showToast,
    refreshData
  } = useApp();

  const [duesPaid, setDuesPaid] = useState(false);
  const [isPayingDues, setIsPayingDues] = useState(false);

  // Resident specific complaints
  const residentComplaints = complaints.filter(
    (c) => c.unitNumber === (currentUser.unitNumber || 'B-402')
  );

  // Pending gate approvals for this flat
  const pendingGateApprovals = visitorPasses.filter(
    (p) =>
      p.unitNumber === (currentUser.unitNumber || 'B-402') &&
      (p.status === 'PRE_APPROVED' || p.status === 'ACTIVE')
  );

  // Active parcels in locker
  const residentParcels = parcels.filter(
    (p) => p.unitNumber === (currentUser.unitNumber || 'B-402') && p.status !== 'COLLECTED'
  );

  const handlePayDues = () => {
    setIsPayingDues(true);
    setTimeout(() => {
      setIsPayingDues(false);
      setDuesPaid(true);
      showToast('Maintenance dues of ₹4,250 paid successfully via UPI (Ref: UPI-9021-9988)!');
    }, 900);
  };

  const handleGateAction = async (passId: string, action: 'ALLOW' | 'DENY') => {
    if (action === 'ALLOW') {
      showToast('Entry permitted! Security guardhouse barrier opened.');
    } else {
      showToast('Entry denied. Alert sent to Gate 1 security guard.', 'error');
    }
    await refreshData();
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto space-y-5 pb-12">
      {/* Top Greeting & Pulse Header matching Stitch Screen 2 */}
      <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-headline font-bold text-2xl text-slate-900">
              Namaste, {currentUser.name.split(' ')[0]}!
            </h1>
            <span className="text-xl">🙏</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span className="font-semibold text-slate-700">Flat {currentUser.unitNumber || 'B-402'}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span>{currentUser.tower || 'Tower B'}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span className="text-primary font-bold">{currentUser.designation || 'Owner Resident'}</span>
          </div>
        </div>

        {/* Live Society Health Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 self-start sm:self-center">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
            All Systems Normal
          </span>
        </div>
      </section>

      {/* Quick Action 4-Grid (Indian Society Ops) */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Pre-Approve Visitor */}
        <button
          onClick={() => setIsPreApproveModalOpen(true)}
          className="group flex flex-col justify-between p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:shadow-md hover:border-primary/50 transition-all text-left active:scale-[0.98]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[22px]">person_add</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
              Fast Pass
            </span>
          </div>
          <div className="mt-3">
            <div className="font-headline font-bold text-slate-900 text-sm">Pre-Approve</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Visitor / Cab Entry OTP</p>
          </div>
          <div className="mt-2.5 flex items-center gap-1 text-primary text-xs font-bold">
            <span>Generate PIN</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </div>
        </button>

        {/* 2. Society Dues */}
        <div className="group flex flex-col justify-between p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:shadow-md transition-all text-left">
          <div className="flex items-center justify-between w-full">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
              <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                duesPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {duesPaid ? 'Settled' : 'Due in 4d'}
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline font-bold text-slate-900 text-base">
                {duesPaid ? '₹0' : '₹4,250'}
              </span>
              {!duesPaid && (
                <span className="text-[11px] text-slate-400 line-through">₹4,500</span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Society Maintenance</p>
          </div>
          {duesPaid ? (
            <div className="mt-2.5 flex items-center gap-1 text-emerald-600 text-xs font-bold">
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              <span>Paid via UPI</span>
            </div>
          ) : (
            <button
              onClick={handlePayDues}
              disabled={isPayingDues}
              className="mt-2.5 flex items-center gap-1 text-primary text-xs font-bold hover:underline"
            >
              <span>{isPayingDues ? 'Processing...' : 'Pay via UPI'}</span>
              <span className="material-symbols-outlined text-[14px]">bolt</span>
            </button>
          )}
        </div>

        {/* 3. Raise Complaint / Helpdesk */}
        <button
          onClick={() => setActiveTab('raise-complaint')}
          className="group flex flex-col justify-between p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:shadow-md hover:border-primary/50 transition-all text-left active:scale-[0.98]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[22px]">report_problem</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
              {residentComplaints.length} Active
            </span>
          </div>
          <div className="mt-3">
            <div className="font-headline font-bold text-slate-900 text-sm">Helpdesk</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Plumbing, Electric &amp; Lift</p>
          </div>
          <div className="mt-2.5 flex items-center gap-1 text-primary text-xs font-bold">
            <span>Log Complaint</span>
            <span className="material-symbols-outlined text-[14px]">add</span>
          </div>
        </button>

        {/* 4. Book Amenities */}
        <button
          onClick={() => showToast('Clubhouse, Squash Court, and Turf booking calendar loaded')}
          className="group flex flex-col justify-between p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:shadow-md transition-all text-left active:scale-[0.98]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[22px]">sports_tennis</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
              Open Slots
            </span>
          </div>
          <div className="mt-3">
            <div className="font-headline font-bold text-slate-900 text-sm">Amenities</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Clubhouse &amp; Squash</p>
          </div>
          <div className="mt-2.5 flex items-center gap-1 text-primary text-xs font-bold">
            <span>Check Slots</span>
            <span className="material-symbols-outlined text-[14px]">calendar_month</span>
          </div>
        </button>
      </section>

      {/* Live Gate Approvals Queue Card matching Stitch */}
      <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">sensor_door</span>
            <h2 className="font-headline font-bold text-slate-900 text-base">
              Live Gate 1 Approvals
            </h2>
            <span className="w-5 h-5 rounded-full bg-primary text-white text-[11px] flex items-center justify-center font-bold">
              {pendingGateApprovals.length}
            </span>
          </div>
          <button
            onClick={() => setActiveTab('gate-console')}
            className="text-xs font-bold text-primary hover:underline"
          >
            Gatehouse View
          </button>
        </div>

        <div className="space-y-3">
          {pendingGateApprovals.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
              No visitors waiting at the gate currently.
            </div>
          ) : (
            pendingGateApprovals.map((pass) => (
              <div
                key={pass.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-[26px]">
                      {pass.visitorType === 'DELIVERY'
                        ? 'delivery_dining'
                        : pass.visitorType === 'CAB'
                        ? 'local_taxi'
                        : 'badge'}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{pass.visitorName}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase">
                        {pass.visitorType}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Phone: {pass.visitorPhone} • Vehicle: {pass.vehicleNumber || 'Pedestrian'}
                    </div>
                    <div className="text-[11px] font-mono text-primary font-bold mt-1">
                      Pass Code: {pass.passCode} • OTP PIN: {pass.sixDigitPin}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleGateAction(pass.id, 'DENY')}
                    className="px-3.5 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors"
                  >
                    Deny / Call Guard
                  </button>
                  <button
                    onClick={() => handleGateAction(pass.id, 'ALLOW')}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    <span>Allow Entry</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Active Helpdesk Complaints with 9-Step Workflow Progress */}
      <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-600 text-[22px]">build_circle</span>
            <h2 className="font-headline font-bold text-slate-900 text-base">
              My Active Complaints &amp; Work Orders
            </h2>
          </div>
          <button
            onClick={() => setActiveTab('raise-complaint')}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>New Complaint</span>
          </button>
        </div>

        <div className="space-y-4">
          {residentComplaints.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
              You have no active complaints registered.
            </div>
          ) : (
            residentComplaints.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col justify-between space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{c.ticketNumber}</span>
                      <span className="text-slate-300">•</span>
                      <span className="font-bold text-slate-900 text-sm">{c.title}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{c.description}</p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
                      c.status === 'PROPOSED'
                        ? 'bg-purple-100 text-purple-800 animate-pulse'
                        : c.status === 'RESIDENT_CONFIRMED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {c.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Progress bar / 9-step indicator */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 flex flex-col gap-2">
                  <div className="flex justify-between text-[11px] text-slate-600 font-semibold">
                    <span>
                      Workflow Progress: Step {c.timeline[c.timeline.length - 1]?.stepNumber || 1} of 9
                    </span>
                    <span className="text-primary font-bold">
                      {c.timeline[c.timeline.length - 1]?.title}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          ((c.timeline[c.timeline.length - 1]?.stepNumber || 1) / 9) * 100
                        )}%`
                      }}
                    ></div>
                  </div>
                </div>

                {/* Critical Workflow Step Action: If Proposed, resident can Sign Off or Dispute! */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                  <div className="text-xs text-slate-500">
                    Tech Lead: <span className="font-semibold text-slate-800">{c.assignedTechnicianName || 'In Triage'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedComplaintId(c.id);
                        setActiveTab('resolution-timeline');
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
                    >
                      Audit Timeline
                    </button>

                    {c.status === 'PROPOSED' && (
                      <button
                        onClick={() => {
                          setSelectedComplaintId(c.id);
                          setActiveTab('resident-signoff');
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">rate_review</span>
                        <span>Sign-off / Dispute</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Parcel Hub Card for Resident */}
      {residentParcels.length > 0 && (
        <section className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">inventory_2</span>
            </div>
            <div>
              <div className="font-headline font-bold text-slate-900 text-sm">
                {residentParcels.length} Package Waiting in Tower B Lobby Locker
              </div>
              <p className="text-xs text-blue-900 mt-0.5">
                Carrier: {residentParcels[0].carrier} • Pickup OTP:{' '}
                <span className="font-mono font-bold text-primary bg-white px-1.5 py-0.5 rounded border border-blue-200">
                  {residentParcels[0].pickupOtp}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('parcel-hub')}
            className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Parcel
          </button>
        </section>
      )}
    </div>
  );
};
