import React from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';

export const WorkOrderDetailsView: React.FC = () => {
  const {
    workOrders,
    selectedWorkOrderId,
    setSelectedComplaintId,
    setActiveTab,
    showToast,
    refreshData
  } = useApp();

  const wo = workOrders.find((w) => w.id === selectedWorkOrderId) || workOrders[0];

  if (!wo) {
    return <div className="p-8 text-center text-slate-500">No work order selected.</div>;
  }

  const handleToggleChecklist = async (idx: number) => {
    try {
      await ApiService.toggleWorkOrderChecklist(wo.id, idx);
      await refreshData();
      showToast('Checklist item toggled and synced.');
    } catch (e) {
      showToast('Toggle failed', 'error');
    }
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
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
          </div>
          <h1 className="font-headline font-bold text-xl lg:text-2xl text-slate-900 mt-0.5">
            Work Order Task Execution
          </h1>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h2 className="font-headline font-bold text-lg text-slate-900">{wo.title}</h2>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
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

        {wo.technicianNotes && (
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-700 block mb-0.5">Technician Log &amp; Findings:</span>
            <p className="text-slate-600">{wo.technicianNotes}</p>
          </div>
        )}

        {/* Interactive Checklist */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="font-headline font-bold text-slate-900 text-sm">
              Standard Operating Procedure Checklist
            </h3>
            <span className="text-xs text-slate-500 font-semibold">
              {wo.checklists.filter((c) => c.completed).length} of {wo.checklists.length} Done
            </span>
          </div>

          <div className="space-y-2">
            {wo.checklists.map((item, idx) => (
              <label
                key={idx}
                onClick={() => handleToggleChecklist(idx)}
                className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all select-none ${
                  item.completed
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  readOnly
                  className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
                />
                <span className={`text-xs font-medium ${item.completed ? 'line-through text-slate-500' : ''}`}>
                  {item.item}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Spares Allocated Section */}
        {wo.sparesAllocated.length > 0 && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <h3 className="font-headline font-bold text-slate-900 text-sm">
              Allocated Spare Parts from Inventory
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {wo.sparesAllocated.map((sp, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">build</span>
                    <span className="font-semibold text-slate-800">{sp.partName}</span>
                  </div>
                  <span className="font-bold font-mono text-primary">Qty: {sp.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

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
    </div>
  );
};
