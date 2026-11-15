import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';

export const SparesRequisitionApprovalView: React.FC = () => {
  const { requisitions, spares, workOrders, currentUser, setActiveTab, showToast, refreshData } = useApp();

  const [decisionReqId, setDecisionReqId] = useState<string | null>(null);
  const [decisionAction, setDecisionAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [managerNotes, setManagerNotes] = useState('');
  const [isDecisionSubmitting, setIsDecisionSubmitting] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [partId, setPartId] = useState('');
  const [workOrderId, setWorkOrderId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [urgency, setUrgency] = useState<'ROUTINE' | 'URGENT' | 'EMERGENCY'>('ROUTINE');
  const [isCreating, setIsCreating] = useState(false);

  const canApprove = currentUser?.role === 'MANAGEMENT' || currentUser?.role === 'ADMIN';
  const canRequest =
    currentUser?.role === 'MAINTENANCE' ||
    currentUser?.role === 'MANAGEMENT' ||
    currentUser?.role === 'ADMIN';

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionReqId) return;
    setIsDecisionSubmitting(true);
    try {
      await ApiService.updateRequisitionStatus(
        decisionReqId,
        decisionAction,
        managerNotes.trim() || undefined
      );
      await refreshData();
      showToast(
        decisionAction === 'APPROVED'
          ? 'Requisition approved! Inventory stock deducted and movement logged.'
          : 'Requisition rejected.'
      );
      setDecisionReqId(null);
      setManagerNotes('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Decision failed', 'error');
    } finally {
      setIsDecisionSubmitting(false);
    }
  };

  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedPartId = partId || spares[0]?.id;
    if (!resolvedPartId) {
      showToast('Select a spare part', 'error');
      return;
    }
    setIsCreating(true);
    try {
      await ApiService.createRequisition({
        partId: resolvedPartId,
        workOrderId: workOrderId || undefined,
        quantity,
        urgency
      });
      await refreshData();
      showToast('Spare parts requisition submitted for management approval.');
      setIsCreateOpen(false);
      setQuantity(1);
      setWorkOrderId('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to submit requisition', 'error');
    } finally {
      setIsCreating(false);
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
            Authorizing technician parts allocation from central store with transactional inventory deduction
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {canRequest && (
            <button
              onClick={() => {
                if (!partId && spares[0]) setPartId(spares[0].id);
                setIsCreateOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>New Requisition</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('spares-inventory')}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs"
          >
            <span className="material-symbols-outlined text-[18px]">layers</span>
            <span>View Stock Inventory</span>
          </button>
        </div>
      </div>

      {/* Requisitions List */}
      {(requisitions || []).length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center text-xs text-slate-500">
          No spare part requisitions found.
        </div>
      ) : (
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
                        req.urgency === 'URGENT' || req.urgency === 'EMERGENCY'
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
                    Requested by: <strong>{req.technicianName}</strong>
                    {req.workOrderId ? ` • Work Order: ${req.workOrderId}` : ''}
                  </span>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
                    req.status === 'APPROVED' || req.status === 'FULFILLED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : req.status === 'REJECTED'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'
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
                  Requested: {new Date(req.requestedAt).toLocaleString()}
                </span>

                {req.status === 'PENDING_APPROVAL' && canApprove ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setDecisionReqId(req.id);
                        setDecisionAction('REJECTED');
                        setManagerNotes('');
                      }}
                      className="px-3.5 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        setDecisionReqId(req.id);
                        setDecisionAction('APPROVED');
                        setManagerNotes('');
                      }}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-2xs flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      <span>Approve &amp; Issue</span>
                    </button>
                  </div>
                ) : (
                  <span className="text-slate-600 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>{req.status === 'PENDING_APPROVAL' ? 'Awaiting Management Approval' : 'Decision Recorded'}</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manager Approval / Rejection Modal */}
      {decisionReqId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleDecisionSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <h3 className="font-headline font-bold text-base text-slate-900">
              {decisionAction === 'APPROVED' ? 'Approve & Deduct Inventory' : 'Reject Spare Requisition'}
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Manager Notes {decisionAction === 'REJECTED' ? '(Required)' : '(Optional)'}
              </label>
              <textarea
                rows={3}
                required={decisionAction === 'REJECTED'}
                value={managerNotes}
                onChange={(e) => setManagerNotes(e.target.value)}
                placeholder="Enter authorization directive or rejection reason..."
                className="w-full p-3 text-xs rounded-lg border border-slate-300 outline-none resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDecisionReqId(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isDecisionSubmitting}
                className={`px-5 py-2 text-white rounded-lg text-xs font-bold ${
                  decisionAction === 'APPROVED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isDecisionSubmitting
                  ? 'Processing...'
                  : decisionAction === 'APPROVED'
                  ? 'Confirm Approval'
                  : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Requisition Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateRequisition}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-3.5"
          >
            <h3 className="font-headline font-bold text-base text-slate-900">Submit Spare Requisition</h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Spare Part</label>
              <select
                value={partId || spares[0]?.id || ''}
                onChange={(e) => setPartId(e.target.value)}
                className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300 bg-white"
              >
                {spares.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.currentStock} in stock)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Work Order (Optional)</label>
              <select
                value={workOrderId}
                onChange={(e) => setWorkOrderId(e.target.value)}
                className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300 bg-white"
              >
                <option value="">General Maintenance</option>
                {workOrders.map((wo) => (
                  <option key={wo.id} value={wo.id}>
                    {wo.woNumber} — {wo.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Urgency</label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as any)}
                  className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="ROUTINE">ROUTINE</option>
                  <option value="URGENT">URGENT</option>
                  <option value="EMERGENCY">EMERGENCY</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="px-5 py-2 bg-primary hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold"
              >
                {isCreating ? 'Submitting...' : 'Submit Requisition'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

