import React from 'react';
import { useApp } from '../../context/AppContext';

export const MaintenanceDashboardView: React.FC = () => {
  const { workOrders, assets, spares, requisitions, setActiveTab, setSelectedWorkOrderId } = useApp();

  const openWorkOrders = workOrders.filter((w) => w.status !== 'COMPLETED');
  const criticalAssets = assets.filter((a) => a.status === 'CRITICAL' || a.status === 'DEGRADING');
  const lowSpares = spares.filter((s) => s.currentStock <= s.minThreshold);
  const pendingReqs = requisitions.filter((r) => r.status === 'PENDING_APPROVAL');

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
            <span>Engineering &amp; Facility</span>
            <span className="text-slate-300">/</span>
            <span className="text-amber-600 font-bold">Facility Operations Hub</span>
          </div>
          <h1 className="font-headline font-bold text-2xl lg:text-3xl text-slate-900 mt-0.5 tracking-tight">
            Maintenance &amp; Asset Command Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Plant &amp; machinery telemetry, field technician dispatch, and spares logistics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('spares-requisitions')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">shopping_cart_checkout</span>
            <span>Requisitions ({pendingReqs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('preventive-maintenance')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">event_repeat</span>
            <span>PM Schedule</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Active Work Orders
              </span>
              <div className="text-2xl font-bold font-headline text-slate-900 mt-1">
                {openWorkOrders.length} In Progress
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">engineering</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500 flex justify-between">
            <span>SLA On-Track</span>
            <span className="font-bold text-emerald-700">100%</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Critical Assets
              </span>
              <div className="text-2xl font-bold font-headline text-red-600 mt-1">
                {criticalAssets.length} Needs Attention
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">warning</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500 flex justify-between">
            <span>Lift #2 &amp; PRV-B4</span>
            <span className="font-bold text-red-600">Elevated Risk</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Spares Reorder Alerts
              </span>
              <div className="text-2xl font-bold font-headline text-amber-600 mt-1">
                {lowSpares.length} Low Stock
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">inventory_2</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500 flex justify-between">
            <span>DG Fuel Separator</span>
            <span className="font-bold text-amber-700">1 Unit Left</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Mean Time to Repair
              </span>
              <div className="text-2xl font-bold font-headline text-emerald-700 mt-1">
                2.1 <span className="text-sm font-normal text-slate-500">Hours</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">timer</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500 flex justify-between">
            <span>Benchmarked target</span>
            <span className="font-bold text-slate-800">&lt; 3.0h</span>
          </div>
        </div>
      </div>

      {/* Split: Work Orders & Asset Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Work Orders List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="font-headline font-bold text-slate-900 text-sm">
              Current Field Work Orders
            </h3>
            <button
              onClick={() => setActiveTab('assigned-work-orders')}
              className="text-xs font-bold text-primary hover:underline"
            >
              View All ({workOrders.length})
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {workOrders.map((wo) => (
              <div
                key={wo.id}
                onClick={() => {
                  setSelectedWorkOrderId(wo.id);
                  setActiveTab('work-order-details');
                }}
                className="p-4 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary">{wo.woNumber}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {wo.type}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs mt-1 leading-tight">{wo.title}</h4>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {wo.location} • Lead: {wo.technicianName}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      wo.priority === 'URGENT'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {wo.priority}
                  </span>
                  <span className="block text-[11px] text-slate-400 mt-1">
                    {wo.checklists.filter((c) => c.completed).length}/{wo.checklists.length} done
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Master Asset Health Overview */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="font-headline font-bold text-slate-900 text-sm">
              Core Plant &amp; Infrastructure Assets
            </h3>
            <button
              onClick={() => setActiveTab('asset-register')}
              className="text-xs font-bold text-primary hover:underline"
            >
              Asset Register
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {assets.map((asset) => (
              <div key={asset.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500">{asset.assetCode}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs font-bold text-slate-900">{asset.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      {asset.location} • Vendor: {asset.vendorName}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      asset.status === 'CRITICAL'
                        ? 'bg-red-100 text-red-700'
                        : asset.status === 'DEGRADING'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {asset.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Health Index:</span>
                  <span className="font-bold text-slate-800">{asset.healthScore}/100</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 mt-1 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      asset.healthScore < 70
                        ? 'bg-red-600'
                        : asset.healthScore < 85
                        ? 'bg-amber-500'
                        : 'bg-emerald-600'
                    }`}
                    style={{ width: `${asset.healthScore}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
