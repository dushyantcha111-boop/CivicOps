import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';

export const AssetRegisterSparesManagementView: React.FC = () => {
  const { assets, currentUser, setActiveTab, showToast, refreshData } = useApp();
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [name, setName] = useState('');
  const [assetCode, setAssetCode] = useState('');
  const [category, setCategory] = useState('PLUMBING');
  const [tower, setTower] = useState('Tower A');
  const [location, setLocation] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorContact, setVendorContact] = useState('');
  const [healthScore, setHealthScore] = useState(100);

  useEffect(() => {
    if (!selectedAssetId && assets.length > 0) {
      setSelectedAssetId(assets[0].id);
    }
  }, [assets, selectedAssetId]);

  const selectedAsset = assets.find((a) => a.id === selectedAssetId) || assets[0];

  const canRegisterAsset =
    currentUser?.role === 'MANAGEMENT' ||
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'MAINTENANCE';

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim()) {
      showToast('Asset name and location are required', 'error');
      return;
    }
    setIsCreating(true);
    try {
      const created = await ApiService.createAsset({
        name: name.trim(),
        assetCode: assetCode.trim() || undefined,
        category,
        tower,
        location: location.trim(),
        vendorName: vendorName.trim() || undefined,
        vendorContact: vendorContact.trim() || undefined,
        healthScore: Number(healthScore)
      });
      await refreshData();
      setSelectedAssetId(created.id);
      showToast(`Asset ${created.assetCode} registered in PostgreSQL ledger.`);
      setIsAddModalOpen(false);
      setName('');
      setAssetCode('');
      setLocation('');
      setVendorName('');
      setVendorContact('');
      setHealthScore(100);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to register asset', 'error');
    } finally {
      setIsCreating(false);
    }
  };

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
          {canRegisterAsset && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Register Asset</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Assets Table & Asset Forensic Dossier */}
      {assets.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center text-xs text-slate-500">
          No assets registered yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Assets Table */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-headline font-bold text-slate-900 text-sm">
                Registered Capital Assets ({assets.length})
              </h3>
              <span className="text-xs text-slate-500">Live PostgreSQL Register</span>
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
                          {asset.category} • {asset.tower} • {asset.location}
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
                    <span className="text-xs text-slate-500">
                      {selectedAsset.category} • {selectedAsset.tower}
                    </span>
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
                    <span className="font-semibold text-slate-800">{selectedAsset.installationDate || 'N/A'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                    <span className="text-slate-500">Warranty / AMC Expiry:</span>
                    <span className="font-semibold text-slate-800">{selectedAsset.warrantyExpiry || 'N/A'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                    <span className="text-slate-500">Last Serviced:</span>
                    <span className="font-semibold text-slate-800">{selectedAsset.lastServicedDate || 'N/A'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                    <span className="text-slate-500">Next Scheduled PM:</span>
                    <span className="font-bold text-primary">{selectedAsset.nextScheduledPm || 'Not scheduled'}</span>
                  </div>
                </div>

                {/* Vendor & AMC Info */}
                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-1.5">
                  <span className="font-bold text-blue-900 block">Vendor Contract &amp; AMC SLA:</span>
                  <div className="font-semibold text-slate-800">{selectedAsset.vendorName || 'Internal Facilities'}</div>
                  <div className="font-mono text-slate-600 text-[11px]">{selectedAsset.vendorContact || 'No contact logged'}</div>
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
      )}

      {/* Register Asset Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateAsset}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-3.5"
          >
            <h3 className="font-headline font-bold text-base text-slate-900">Register Capital Asset</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Asset Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Booster Pump #3"
                  className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Asset Code (Optional)</label>
                <input
                  type="text"
                  value={assetCode}
                  onChange={(e) => setAssetCode(e.target.value)}
                  placeholder="Auto-generated if empty"
                  className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300 uppercase"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="PLUMBING">PLUMBING</option>
                  <option value="ELEVATOR">ELEVATOR</option>
                  <option value="ELECTRICAL">ELECTRICAL</option>
                  <option value="HVAC">HVAC</option>
                  <option value="SECURITY">SECURITY</option>
                  <option value="COMMON_AREA">COMMON_AREA</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tower</label>
                <select
                  value={tower}
                  onChange={(e) => setTower(e.target.value)}
                  className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Tower A">Tower A</option>
                  <option value="Tower B">Tower B</option>
                  <option value="Tower C">Tower C</option>
                  <option value="Tower D">Tower D</option>
                  <option value="All Towers">All Towers</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Health %</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={healthScore}
                  onChange={(e) => setHealthScore(Number(e.target.value))}
                  className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Location</label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Basement Pump Room"
                className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Vendor Name</label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="Optional"
                  className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Vendor Contact</label>
                <input
                  type="text"
                  value={vendorContact}
                  onChange={(e) => setVendorContact(e.target.value)}
                  placeholder="Phone or email"
                  className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="px-5 py-2 bg-primary hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold"
              >
                {isCreating ? 'Saving...' : 'Save Asset'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

