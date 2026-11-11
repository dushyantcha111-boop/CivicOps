import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';

export const SparesRequisitionApprovalView: React.FC = () => {
  const { requisitions, setActiveTab, showToast, refreshData } = useApp();

  const [managerNotes, setManagerNotes] = useState('Approved under monthly society MEP operations budget.');

  const handleApprove = async (reqId: string) => {
    try {
      await ApiService.updateRequisitionStatus(reqId, 'APPROVED', managerNotes);
      await refreshData();
      showToast('Requisition approved! Inventory stock deducted and allocated to work order.');
    } catch (e) {
      showToast('Approval failed', 'error');
    }
  };

  const handleReject = async (reqId: string) => {
    try {
      await ApiService.updateRequisitionStatus(reqId, 'REJECTED', 'Stock replenishment pending vendor delivery.');
      await refreshData();
      showToast('Requisition rejected.', 'info');
    } catch (e) {
      showToast('Rejection failed', 'error');
    }
  };

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
            <span>Procurement &amp; Store</span>
            <span className="text-slate-300">/</span>
            <span className="text-primary font-bold">Field Requisitions</span>
          </div>
          <h1 className="font-headline font-bold text-2xl lg:text-3xl text-slate-900 mt-0.5 tracking-tight">
            Spares Requisition &amp; Approval Desk
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authorizing technician parts allocation from central store with automated inventory deduction
          </p>
        </div>

        <button
          onClick={() => setActiveTab('spares-inventory')}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">layers</span>
          <span>View Stock Inventory</span>
        </button>
      </div>

      {/* Requisitions List */}
      <div className="space-y-4">
        {requisitions.map((req) => (
          <div
            key={req.id}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3.5"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary">{req.reqNumber}</span>
                  <span className="text-slate-300">•</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      req.urgency === 'URGENT'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {req.urgency} Urgency
                  </span>
                </div>
                <h3 className="font-headline font-bold text-base text-slate-900 mt-1">
                  {req.partName} (Quantity: {req.quantity})
                </h3>
                <span className="text-xs text-slate-500 mt-0.5 block">
                  Requested by: <strong>{req.technicianName}</strong> • Target: {req.workOrderId}
                </span>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
                  req.status === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : req.status === 'REJECTED'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800 animate-pulse'
                }`}
              >
                {req.status.replace('_', ' ')}
              </span>
            </div>

            {req.managerNotes && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                <strong>Manager Directive:</strong> {req.managerNotes}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-400 font-mono text-[11px]">
                Timestamp: {new Date(req.requestedAt).toLocaleString()}
              </span>

              {req.status === 'PENDING_APPROVAL' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReject(req.id)}
                    className="px-3.5 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(req.id)}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-2xs flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    <span>Approve &amp; Issue</span>
                  </button>
                </div>
              ) : (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>Fulfillment Logged</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
