import React from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';

export const AssignedWorkOrdersView: React.FC = () => {
  const {
    workOrders,
    setSelectedWorkOrderId,
    setSelectedComplaintId,
    setActiveTab,
    showToast,
    refreshData
  } = useApp();

  const handleStatusChange = async (woId: string, status: any) => {
    try {
      await ApiService.updateWorkOrderStatus(woId, status);
      await refreshData();
      showToast(`Work Order status updated to ${status}`);
    } catch (e) {
      showToast('Failed to update status', 'error');
    }
  };

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
            <span>Maintenance Field Operations</span>
            <span className="text-slate-300">/</span>
            <span className="text-amber-600 font-bold">Technician Dispatch Queue</span>
          </div>
          <h1 className="font-headline font-bold text-2xl lg:text-3xl text-slate-900 mt-0.5 tracking-tight">
            Assigned Work Orders
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Assigned to Ramesh Kumar (Senior MEP Lead) • {workOrders.length} Total Assigned Jobs
          </p>
        </div>

        <button
          onClick={() => setActiveTab('preventive-maintenance')}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">event_repeat</span>
          <span>Preventive PM Calendar</span>
        </button>
      </div>

      {/* Work Orders List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workOrders.map((wo) => {
          const completedTasks = wo.checklists.filter((c) => c.completed).length;
          const totalTasks = wo.checklists.length;
          const percent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

          return (
            <div
              key={wo.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-primary">{wo.woNumber}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {wo.type}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      wo.priority === 'URGENT'
                        ? 'bg-red-100 text-red-700'
                        : wo.priority === 'HIGH'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {wo.priority}
                  </span>
                </div>

                <h3 className="font-headline font-bold text-slate-900 text-base mt-2 leading-tight">
                  {wo.title}
                </h3>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">
                    location_on
                  </span>
                  <span>{wo.location}</span>
                </div>

                {wo.assetName && (
                  <div className="mt-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-primary">
                      inventory_2
                    </span>
                    <span className="font-semibold text-slate-800 truncate">{wo.assetName}</span>
                  </div>
                )}
              </div>

              {/* Progress and Checklist count */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Checklist Progress:</span>
                  <span className="font-bold text-slate-900">
                    {completedTasks} / {totalTasks} steps ({Math.round(percent)}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Due: {new Date(wo.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="font-bold text-slate-700">{wo.status.replace('_', ' ')}</span>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setSelectedWorkOrderId(wo.id);
                      setActiveTab('work-order-details');
                    }}
                    className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors"
                  >
                    Checklist &amp; Details
                  </button>

                  {wo.complaintId && (
                    <button
                      onClick={() => {
                        setSelectedComplaintId(wo.complaintId!);
                        setActiveTab('inspection-proposal');
                      }}
                      className="flex-1 py-1.5 bg-primary hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                    >
                      <span>Propose Fix</span>
                      <span className="material-symbols-outlined text-[14px]">send</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
