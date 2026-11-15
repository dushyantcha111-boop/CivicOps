import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';
import { SpareRequisition, WorkOrder } from '../../types';

export const WorkOrderDetailsView: React.FC = () => {
  const {
    workOrders,
    spares,
    selectedWorkOrderId,
    setSelectedComplaintId,
    setActiveTab,
    showToast,
    refreshData
  } = useApp();

  const wo = workOrders.find((w) => w.id === selectedWorkOrderId) || workOrders[0];

  const [notes, setNotes] = useState('');
  const [reqModalOpen, setReqModalOpen] = useState(false);
  const [reqPartId, setReqPartId] = useState('');
  const [reqQty, setReqQty] = useState(1);
  const [reqUrgency, setReqUrgency] = useState<SpareRequisition['urgency']>('URGENT');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (wo) {
      setNotes(wo.technicianNotes || '');
    }
  }, [wo?.id]);

  useEffect(() => {
    if (spares.length > 0 && !reqPartId) {
      setReqPartId(spares[0].id);
    }
  }, [spares, reqPartId]);

  if (!wo) {
    return <div className="p-8 text-center text-slate-500">No work order selected.</div>;
  }

  const checklists = wo.checklists || [];
  const sparesAllocated = wo.sparesAllocated || [];

  const handleToggleChecklist = async (idx: number) => {
    const nextChecklists = checklists.map((item, i) =>
      i === idx ? { ...item, completed: !item.completed } : item
    );
    try {
      await ApiService.updateWorkOrderChecklist(wo.id, nextChecklists, notes);
      await refreshData();
      showToast('Checklist item updated in database.');
    } catch (e: any) {
      showToast(e?.message || 'Checklist update failed', 'error');
    }
  };

  const handleStatusUpdate = async (status: WorkOrder['status']) => {
    setIsSaving(true);
    try {
      await ApiService.updateWorkOrderStatus(wo.id, status, notes);
      await refreshData();
      showToast(`Work Order status changed to ${status.replace(/_/g, ' ')}.`);
    } catch (e: any) {
      showToast(e?.message || 'Failed to update Work Order status', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      await ApiService.updateWorkOrderChecklist(wo.id, checklists, notes);
      await refreshData();
      showToast('Technician notes saved.');
    } catch (e: any) {
      showToast(e?.message || 'Failed to save notes', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestSpare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqPartId) return;
    setIsSaving(true);
    try {
      await ApiService.createRequisition({
        workOrderId: wo.id,
        partId: reqPartId,
        quantity: reqQty,
        urgency: reqUrgency
      });
      await refreshData();
      showToast('Spare part requisition submitted for management approval.');
      setReqModalOpen(false);
    } catch (err: any) {
      showToast(err?.message || 'Failed to submit spare requisition', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('assigned-work-orders')}
            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-primary">{wo.woNumber}</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {wo.type}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {wo.status.replace(/_/g, ' ')}
              </span>
            </div>
            <h1 className="font-headline font-bold text-xl lg:text-2xl text-slate-900 mt-0.5">
              Work Order Task Execution
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {wo.status === 'SCHEDULED' && (
            <button
              disabled={isSaving}
              onClick={() => handleStatusUpdate('IN_PROGRESS')}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
            >
              Start Execution
            </button>
          )}
          {wo.status === 'IN_PROGRESS' && (
            <button
              disabled={isSaving}
              onClick={() => handleStatusUpdate('ON_HOLD')}
              className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold"
            >
              Put On Hold
            </button>
          )}
          {wo.status === 'ON_HOLD' && (
            <button
              disabled={isSaving}
              onClick={() => handleStatusUpdate('IN_PROGRESS')}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
            >
              Resume Work
            </button>
          )}
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h2 className="font-headline font-bold text-lg text-slate-900">{wo.title}</h2>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
              <span>Location: <strong>{wo.location}</strong></span>
              <span>•</span>
              <span>Assigned to: <strong>{wo.technicianName}</strong></span>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
              wo.priority === 'URGENT'
                ? 'bg-red-100 text-red-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {wo.priority} Priority
          </span>
        </div>

        {/* Editable Technician Log */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
          <span className="font-bold text-slate-700 block">Technician Log &amp; Field Findings:</span>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Record diagnostic readings, parts verified, or hold reason..."
            className="w-full p-2.5 text-xs rounded-lg border border-slate-300 bg-white focus:border-primary outline-none resize-none"
          />
          <div className="flex justify-end">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveNotes}
              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold"
            >
              Save Notes
            </button>
          </div>
        </div>

        {/* Interactive Checklist */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="font-headline font-bold text-slate-900 text-sm">
              Standard Operating Procedure Checklist
            </h3>
            <span className="text-xs text-slate-500 font-semibold">
              {checklists.filter((c) => c.completed).length} of {checklists.length} Done
            </span>
          </div>

          <div className="space-y-2">
            {checklists.length === 0 ? (
              <div className="p-4 text-xs text-slate-400 bg-slate-50 rounded-xl text-center">
                No checklist steps attached to this work order.
              </div>
            ) : (
              checklists.map((item, idx) => (
                <label
                  key={idx}
                  className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all select-none ${
                    item.completed
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggleChecklist(idx)}
                    className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
                  />
                  <span className={`text-xs font-medium ${item.completed ? 'line-through text-slate-500' : ''}`}>
                    {item.item}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Spares Allocated Section + Request Button */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-headline font-bold text-slate-900 text-sm">
              Allocated Spare Parts &amp; Requisitions
            </h3>
            <button
              type="button"
              onClick={() => setReqModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">add_shopping_cart</span>
              <span>Request Spare Part</span>
            </button>
          </div>
          {sparesAllocated.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sparesAllocated.map((sp, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">build</span>
                    <span className="font-semibold text-slate-800">{sp.partName}</span>
                  </div>
                  <span className="font-bold font-mono text-primary">
                    Qty: {sp.quantity} ({sp.fulfilled ? 'Issued' : 'Allocated'})
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No spares allocated yet to this work order.</p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Due Deadline: <strong className="text-slate-800">{new Date(wo.dueDate).toLocaleDateString()}</strong>
          </div>

          <div className="flex items-center gap-2">
            {wo.complaintId && (
              <>
                <button
                  onClick={() => {
                    setSelectedComplaintId(wo.complaintId!);
                    setActiveTab('resolution-timeline');
                  }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  View Trust Timeline
                </button>
                <button
                  onClick={() => {
                    setSelectedComplaintId(wo.complaintId!);
                    setActiveTab('inspection-proposal');
                  }}
                  className="px-5 py-2 bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>Submit Resolution Proposal (Step 6)</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Request Spare Modal */}
      {reqModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-headline font-bold text-slate-900 text-base">
              Request Spare Part for {wo.woNumber}
            </h3>
            <form onSubmit={handleRequestSpare} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Spare Part</label>
                <select
                  value={reqPartId}
                  onChange={(e) => setReqPartId(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 bg-white outline-none"
                >
                  {spares.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name} (Stock: {sp.currentStock})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={reqQty}
                    onChange={(e) => setReqQty(Number(e.target.value))}
                    className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Urgency</label>
                  <select
                    value={reqUrgency}
                    onChange={(e) => setReqUrgency(e.target.value as SpareRequisition['urgency'])}
                    className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 bg-white outline-none"
                  >
                    <option value="ROUTINE">ROUTINE</option>
                    <option value="URGENT">URGENT</option>
                    <option value="EMERGENCY">EMERGENCY</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReqModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !reqPartId}
                  className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                >
                  Submit Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

