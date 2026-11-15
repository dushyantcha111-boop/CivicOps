import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';

export const ResidentHomeView: React.FC = () => {
  const {
    currentUser,
    complaints,
    visitorPasses,
    parcels,
    units,
    incidents,
    unreadNotificationsCount,
    setIsPreApproveModalOpen,
    setActiveTab,
    setSelectedComplaintId,
    showToast,
    refreshData
  } = useApp();

  const [isPayingDues, setIsPayingDues] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  if (!currentUser) return null;

  const userUnit =
    units.find((u) => u.unitNumber === currentUser.unitNumber) ||
    units.find((u) => u.residentUserId === currentUser.id) ||
    units[0];

  const residentUnitNumber = userUnit?.unitNumber || currentUser.unitNumber || '';

  const residentComplaints = complaints.filter(
    (c) => !residentUnitNumber || c.unitNumber === residentUnitNumber || c.residentId === currentUser.id
  );

  const pendingGateApprovals = visitorPasses.filter(
    (p) =>
      (!residentUnitNumber || p.unitNumber === residentUnitNumber) &&
      (p.status === 'PRE_APPROVED' || p.status === 'ACTIVE')
  );

  const residentParcels = parcels.filter(
    (p) => (!residentUnitNumber || p.unitNumber === residentUnitNumber) && p.status !== 'COLLECTED'
  );

  const activeIncidentsCount = incidents.filter((i) => i.status !== 'RESOLVED').length;
  const duesPaid = userUnit ? userUnit.duesStatus === 'PAID' || Number(userUnit.duesAmount || 0) <= 0 : false;
  const duesAmountDisplay = userUnit ? Number(userUnit.duesAmount || 0).toLocaleString('en-IN') : '0';

  const handlePayDues = async () => {
    if (!userUnit) {
      showToast('No linked flat unit found for dues settlement.', 'error');
      return;
    }
    setIsPayingDues(true);
    try {
      const res = await ApiService.payUnitDues(userUnit.id, 'UPI');
      await refreshData();
      showToast(`Maintenance dues settled via UPI (Ref: ${res.payment.paymentRef})!`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to settle maintenance dues', 'error');
    } finally {
      setIsPayingDues(false);
    }
  };

  const handleRevokePass = async (passId: string) => {
    setRevokingId(passId);
    try {
      await ApiService.revokeVisitorPass(passId, `Revoked by resident ${currentUser.name}`);
      await refreshData();
      showToast('Visitor pass revoked. Gate security alerted.', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to revoke visitor pass', 'error');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto space-y-5 pb-12">
      {/* Top Greeting & Pulse Header */}
      <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-headline font-bold text-2xl text-slate-900">
              Namaste, {currentUser.name.split(' ')[0]}!
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span className="font-semibold text-slate-700">
              {residentUnitNumber ? `Flat ${residentUnitNumber}` : 'Resident Unit'}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span>{userUnit?.tower || currentUser.tower || 'Community'}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span className="text-primary font-bold">{currentUser.designation || 'Owner Resident'}</span>
          </div>
        </div>

        {/* Live Society Health Pill */}
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border self-start sm:self-center ${
            activeIncidentsCount > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'
          }`}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                activeIncidentsCount > 0 ? 'bg-red-400' : 'bg-emerald-400'
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                activeIncidentsCount > 0 ? 'bg-red-500' : 'bg-emerald-500'
              }`}
            ></span>
          </span>
          <span
            className={`text-xs font-bold uppercase tracking-wider ${
              activeIncidentsCount > 0 ? 'text-red-800' : 'text-emerald-800'
            }`}
          >
            {activeIncidentsCount > 0 ? `${activeIncidentsCount} Active Alert` : 'All Systems Normal'}
          </span>
        </div>
      </section>

      {/* Quick Action 4-Grid */}
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
              {!userUnit ? 'Unlinked' : duesPaid ? 'Settled' : userUnit.duesStatus}
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline font-bold text-slate-900 text-base">
                {!userUnit ? '—' : duesPaid ? '₹0' : `₹${duesAmountDisplay}`}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Society Maintenance</p>
          </div>
          {!userUnit ? (
            <div className="mt-2.5 text-slate-400 text-xs font-medium">No flat linked</div>
          ) : duesPaid ? (
            <div className="mt-2.5 flex items-center gap-1 text-emerald-600 text-xs font-bold">
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              <span>Dues Paid</span>
            </div>
          ) : (
            <button
              onClick={handlePayDues}
              disabled={isPayingDues}
              className="mt-2.5 flex items-center gap-1 text-primary text-xs font-bold hover:underline disabled:opacity-60"
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
              {residentComplaints.length} Tickets
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

        {/* 4. Community Hub & Notices */}
        <button
          onClick={() => setActiveTab('community-hub')}
          className="group flex flex-col justify-between p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:shadow-md hover:border-primary/50 transition-all text-left active:scale-[0.98]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[22px]">campaign</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
              {unreadNotificationsCount} Unread
            </span>
          </div>
          <div className="mt-3">
            <div className="font-headline font-bold text-slate-900 text-sm">Community Hub</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Notices, Events &amp; Docs</p>
          </div>
          <div className="mt-2.5 flex items-center gap-1 text-primary text-xs font-bold">
            <span>Open Hub</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </div>
        </button>
      </section>

      {/* Active Visitor Passes for This Flat */}
      <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">sensor_door</span>
            <h2 className="font-headline font-bold text-slate-900 text-base">
              Active Pre-Approved Visitor Passes
            </h2>
            <span className="w-5 h-5 rounded-full bg-primary text-white text-[11px] flex items-center justify-center font-bold">
              {pendingGateApprovals.length}
            </span>
          </div>
          <button
            onClick={() => setActiveTab('pass-revocation')}
            className="text-xs font-bold text-primary hover:underline"
          >
            Manage All Passes
          </button>
        </div>

        <div className="space-y-3">
          {pendingGateApprovals.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
              No active pre-approved visitor passes right now.
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
                    onClick={() => {
                      navigator.clipboard?.writeText(`${pass.passCode} (PIN: ${pass.sixDigitPin})`);
                      showToast('Visitor pass PIN copied to clipboard.');
                    }}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
                  >
                    Copy PIN
                  </button>
                  <button
                    onClick={() => handleRevokePass(pass.id)}
                    disabled={revokingId === pass.id}
                    className="px-3.5 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {revokingId === pass.id ? 'Revoking...' : 'Revoke Pass'}
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
            residentComplaints.map((c) => {
              const timeline = c.timeline || [];
              const lastStep = timeline[timeline.length - 1];
              const canSignOff = c.status === 'MANAGEMENT_APPROVED' || c.status === 'PROPOSED';

              return (
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
                        c.status === 'MANAGEMENT_APPROVED' || c.status === 'PROPOSED'
                          ? 'bg-purple-100 text-purple-800'
                          : c.status === 'RESIDENT_CONFIRMED' || c.status === 'CLOSED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {c.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Progress bar / 9-step indicator */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 flex flex-col gap-2">
                    <div className="flex justify-between text-[11px] text-slate-600 font-semibold">
                      <span>
                        Workflow Progress: Step {lastStep?.stepNumber || 1} of 9
                      </span>
                      <span className="text-primary font-bold">
                        {lastStep?.title || 'Ticket Submitted'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, ((lastStep?.stepNumber || 1) / 9) * 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>

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

                      {canSignOff && (
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
              );
            })
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
                {residentParcels.length} Package Waiting at {residentParcels[0].tower} ({residentParcels[0].lockerNumber || 'Gate / Locker'})
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

