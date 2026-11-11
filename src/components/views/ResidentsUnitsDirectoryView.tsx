import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export const ResidentsUnitsDirectoryView: React.FC = () => {
  const { units, selectedTower, setSelectedTower, showToast } = useApp();

  const [search, setSearch] = useState('');
  const [occupancyFilter, setOccupancyFilter] = useState<'ALL' | 'OWNER' | 'TENANT'>('ALL');

  const filteredUnits = units.filter((u) => {
    if (selectedTower !== 'All Towers' && u.tower !== selectedTower) return false;
    if (occupancyFilter === 'OWNER' && u.isTenantOccupied) return false;
    if (occupancyFilter === 'TENANT' && !u.isTenantOccupied) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchUnit = u.unitNumber.toLowerCase().includes(q);
      const matchOwner = u.ownerName.toLowerCase().includes(q);
      const matchTenant = u.tenantName && u.tenantName.toLowerCase().includes(q);
      const matchVehicle = u.registeredVehicles.some((v) => v.toLowerCase().includes(q));
      return matchUnit || matchOwner || matchTenant || matchVehicle;
    }
    return true;
  });

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
            <span>Community Directory</span>
            <span className="text-slate-300">/</span>
            <span className="text-primary font-bold">Residents &amp; Units Master</span>
          </div>
          <h1 className="font-headline font-bold text-2xl lg:text-3xl text-slate-900 mt-0.5 tracking-tight">
            Residents &amp; Units Management Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            480 Society Units • 1,420 Residents • ANPR Vehicle Registry &amp; Dues Ledger
          </p>
        </div>

        <button
          onClick={() => showToast('Resident Onboarding KYC link sent to registered owner')}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>Onboard Resident</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tower Filter */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {['All Towers', 'Tower A', 'Tower B', 'Tower C', 'Tower D'].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTower(t)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  selectedTower === t
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Occupancy Filter */}
          <select
            value={occupancyFilter}
            onChange={(e) => setOccupancyFilter(e.target.value as any)}
            className="h-9 px-3 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-700 outline-none"
          >
            <option value="ALL">All Occupancy Types</option>
            <option value="OWNER">Owner Occupied</option>
            <option value="TENANT">Tenant Occupied</option>
          </select>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 w-full sm:w-72">
          <span className="material-symbols-outlined text-[18px] text-slate-400">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search flat #, resident, vehicle plate..."
            className="text-xs outline-none bg-transparent w-full text-slate-800"
          />
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Flat Number</th>
                <th className="py-3 px-4">Unit Type &amp; Floor</th>
                <th className="py-3 px-4">Resident / Occupant</th>
                <th className="py-3 px-4">Registered Vehicles</th>
                <th className="py-3 px-4">Maintenance Dues</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUnits.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900 font-mono text-sm">
                    {u.unitNumber}
                    <span className="text-slate-400 text-[10px] block font-sans font-medium">
                      {u.tower}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-800">{u.type}</span>
                    <span className="text-slate-500 block text-[11px]">Floor {u.floor}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">
                      {u.isTenantOccupied ? u.tenantName : u.ownerName}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          u.isTenantOccupied
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {u.isTenantOccupied ? 'Tenant' : 'Owner'}
                      </span>
                      <span>{u.isTenantOccupied ? u.tenantPhone : u.ownerPhone}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {u.registeredVehicles.map((v, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`font-bold font-mono text-xs ${
                        u.duesStatus === 'PAID'
                          ? 'text-emerald-700'
                          : u.duesStatus === 'OVERDUE'
                          ? 'text-red-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {u.duesAmount === 0 ? '₹0 Paid' : `₹${u.duesAmount} (${u.duesStatus})`}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() =>
                        showToast(`Unit profile for ${u.unitNumber} loaded: ${u.ownerName}`)
                      }
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs transition-colors"
                    >
                      Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
