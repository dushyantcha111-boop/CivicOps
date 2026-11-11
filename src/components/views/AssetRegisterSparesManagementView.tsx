import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export const AssetRegisterSparesManagementView: React.FC = () => {
  const { assets, setActiveTab, showToast } = useApp();
  const [selectedAssetId, setSelectedAssetId] = useState<string>(assets[0]?.id || '');

  const selectedAsset = assets.find((a) => a.id === selectedAssetId) || assets[0];

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
            <span>Asset Governance</span>
            <span className="text-slate-300">/</span>
            <span className="text-primary font-bold">Master Asset Register</span>
          </div>
          <h1 className="font-headline font-bold text-2xl lg:text-3xl text-slate-900 mt-0.5 tracking-tight">
            Asset Register &amp; Lifecycle Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Core society capital assets, warranty contracts, MTBF metrics, and vendor SLA records
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('spares-inventory')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">layers</span>
            <span>Spares Inventory</span>
          </button>
          <button
            onClick={() => showToast('Asset barcode / RFID registration scanner initiated')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Register Asset</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Assets Table & Asset Forensic Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Assets Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="font-headline font-bold text-slate-900 text-sm">
              Registered Capital Assets ({assets.length})
            </h3>
            <span className="text-xs text-slate-500">Green Valley Residency</span>
          </div>

          <div className="divide-y divide-slate-100">
            {assets.map((asset) => {
              const isSelected = selectedAsset?.id === asset.id;

              return (
                <div
                  key={asset.id}
                  onClick={() => setSelectedAssetId(asset.id)}
                  className={`p-4 transition-colors cursor-pointer flex flex-col justify-between space-y-2 ${
                    isSelected ? 'bg-blue-50/70 border-l-4 border-primary' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          {asset.assetCode}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="font-bold text-slate-900 text-sm">{asset.name}</span>
                      </div>
                      <span className="text-xs text-slate-500 mt-0.5 block">
                        {asset.category} • {asset.location}
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

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>MTBF: <strong className="text-slate-800">{asset.mtbfHours} hrs</strong></span>
                    <span>MTTR: <strong className="text-slate-800">{asset.mttrHours} hrs</strong></span>
                    <span>Health: <strong className="text-primary">{asset.healthScore}%</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Asset Forensic Spec Sheet */}
        {selectedAsset && (
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="font-mono text-xs font-bold text-primary">
                    {selectedAsset.assetCode}
                  </span>
                  <h3 className="font-headline font-bold text-lg text-slate-900 mt-0.5">
                    {selectedAsset.name}
                  </h3>
                  <span className="text-xs text-slate-500">{selectedAsset.category}</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold font-headline text-primary">
                    {selectedAsset.healthScore}
                  </span>
                  <span className="text-xs text-slate-400 block font-bold">/ 100 Health</span>
                </div>
              </div>

              {/* Specs Grid */}
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                  <span className="text-slate-500">Installation Date:</span>
                  <span className="font-semibold text-slate-800">{selectedAsset.installationDate}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                  <span className="text-slate-500">Warranty / AMC Expiry:</span>
                  <span className="font-semibold text-slate-800">{selectedAsset.warrantyExpiry}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                  <span className="text-slate-500">Last Serviced:</span>
                  <span className="font-semibold text-slate-800">{selectedAsset.lastServicedDate}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                  <span className="text-slate-500">Next Scheduled PM:</span>
                  <span className="font-bold text-primary">{selectedAsset.nextScheduledPm}</span>
                </div>
              </div>

              {/* Vendor & AMC Info */}
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-1.5">
                <span className="font-bold text-blue-900 block">Vendor Contract &amp; AMC SLA:</span>
                <div className="font-semibold text-slate-800">{selectedAsset.vendorName}</div>
                <div className="font-mono text-slate-600 text-[11px]">{selectedAsset.vendorContact}</div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => setActiveTab('memory-graph')}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">hub</span>
                <span>Trace in Memory Graph</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
