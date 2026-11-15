import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';
import { DuesPayment, Unit } from '../../types';

export const ResidentsUnitsDirectoryView: React.FC = () => {
  const { units, currentUser, selectedTower, setSelectedTower, showToast, refreshData } = useApp();

  const [search, setSearch] = useState('');
  const [occupancyFilter, setOccupancyFilter] = useState<'ALL' | 'OWNER' | 'TENANT'>('ALL');
  const [activeSubTab, setActiveSubTab] = useState<'DIRECTORY' | 'PAYMENTS'>('DIRECTORY');
  const [payments, setPayments] = useState<DuesPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [payingUnitId, setPayingUnitId] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUnitNumber, setNewUnitNumber] = useState('');
  const [newTower, setNewTower] = useState('Tower A');
  const [newFloor, setNewFloor] = useState(1);
  const [newType, setNewType] = useState('3BHK');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  const [newIsTenant, setNewIsTenant] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantPhone, setNewTenantPhone] = useState('');
  const [newDuesAmount, setNewDuesAmount] = useState(0);
  const [newVehicles, setNewVehicles] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const canManageUnits = currentUser?.role === 'MANAGEMENT' || currentUser?.role === 'ADMIN';

  const loadPayments = async () => {
    setLoadingPayments(true);
    try {
      const data = await ApiService.getDuesPayments();
      setPayments(data || []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load payment history', 'error');
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'PAYMENTS') {
      loadPayments();
    }
  }, [activeSubTab]);

  const filteredUnits = (units || []).filter((u) => {
    if (selectedTower !== 'All Towers' && u.tower !== selectedTower) return false;
    if (occupancyFilter === 'OWNER' && u.isTenantOccupied) return false;
    if (occupancyFilter === 'TENANT' && !u.isTenantOccupied) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchUnit = u.unitNumber.toLowerCase().includes(q);
      const matchOwner = u.ownerName.toLowerCase().includes(q);
      const matchTenant = u.tenantName && u.tenantName.toLowerCase().includes(q);
      const matchVehicle = (u.registeredVehicles || []).some((v) => v.toLowerCase().includes(q));
      return matchUnit || matchOwner || matchTenant || matchVehicle;
    }
    return true;
  });

  const totalPendingDues = (units || []).reduce(
    (sum, u) => sum + (u.duesStatus !== 'PAID' ? Number(u.duesAmount || 0) : 0),
    0
  );

  const handlePayDues = async (unit: Unit) => {
    setPayingUnitId(unit.id);
    try {
      const res = await ApiService.payUnitDues(unit.id, 'UPI / Society Ledger');
      await refreshData();
      if (activeSubTab === 'PAYMENTS') {
        await loadPayments();
      }
      showToast(`Dues settled for ${unit.unitNumber}. Ref: ${res.payment.paymentRef}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Payment settlement failed', 'error');
    } finally {
      setPayingUnitId(null);
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitNumber.trim() || !newOwnerName.trim() || !newOwnerPhone.trim()) {
      showToast('Unit number, owner name, and phone are required', 'error');
      return;
    }
    setIsCreating(true);
    try {
      await ApiService.createUnit({
        unitNumber: newUnitNumber.trim().toUpperCase(),
        tower: newTower,
        floor: Number(newFloor),
        type: newType,
        ownerName: newOwnerName.trim(),
        ownerPhone: newOwnerPhone.trim(),
        isTenantOccupied: newIsTenant,
        tenantName: newIsTenant ? newTenantName.trim() : undefined,
        tenantPhone: newIsTenant ? newTenantPhone.trim() : undefined,
        duesAmount: Number(newDuesAmount || 0),
        registeredVehicles: newVehicles
          .split(',')
          .map((v) => v.trim().toUpperCase())
          .filter(Boolean)
      });
      await refreshData();
      showToast(`Unit ${newUnitNumber.trim().toUpperCase()} onboarded to directory.`);
      setIsAddModalOpen(false);
      setNewUnitNumber('');
      setNewOwnerName('');
      setNewOwnerPhone('');
      setNewTenantName('');
      setNewTenantPhone('');
      setNewDuesAmount(0);
      setNewVehicles('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create unit', 'error');
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
            <span>Community Directory</span>
            <span className="text-slate-300">/</span>
            <span className="text-primary font-bold">Residents &amp; Units Master</span>
          </div>
          <h1 className="font-headline font-bold text-2xl lg:text-3xl text-slate-900 mt-0.5 tracking-tight">
            Residents &amp; Units Management Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {units.length} Registered Units • {units.filter((u) => u.occupancyStatus === 'OCCUPIED').length} Occupied • Outstanding Dues: ₹{totalPendingDues.toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveSubTab('DIRECTORY')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeSubTab === 'DIRECTORY' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Units Directory
            </button>
            <button
              onClick={() => setActiveSubTab('PAYMENTS')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeSubTab === 'PAYMENTS' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Payment History
            </button>
          </div>

          {canManageUnits && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>Onboard Unit</span>
            </button>
          )}
        </div>
      </div>

      {activeSubTab === 'DIRECTORY' ? (
        <>
          {/* Filter & Search Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
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
                  {filteredUnits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-500">
                        No units match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUnits.map((u) => {
                      const vehicles = u.registeredVehicles || [];
                      const isSettled = u.duesStatus === 'PAID' || Number(u.duesAmount || 0) <= 0;
                      return (
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
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
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
                              {vehicles.length === 0 ? (
                                <span className="text-slate-400 text-[11px]">None</span>
                              ) : (
                                vehicles.map((v, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold"
                                  >
                                    {v}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`font-bold font-mono text-xs ${
                                isSettled
                                  ? 'text-emerald-700'
                                  : u.duesStatus === 'OVERDUE'
                                  ? 'text-red-600'
                                  : 'text-amber-600'
                              }`}
                            >
                              {isSettled ? '₹0 Paid' : `₹${Number(u.duesAmount).toLocaleString()} (${u.duesStatus})`}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1.5">
                            {!isSettled && (canManageUnits || currentUser?.unitNumber === u.unitNumber) && (
                              <button
                                onClick={() => handlePayDues(u)}
                                disabled={payingUnitId === u.id}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs transition-colors"
                              >
                                {payingUnitId === u.id ? 'Paying...' : 'Pay Dues'}
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedUnit(u)}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs transition-colors"
                            >
                              Profile
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Dues Payment History */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="font-headline font-bold text-slate-900 text-sm">
              Recorded Dues Payments Ledger
            </h3>
            <button
              onClick={loadPayments}
              className="text-xs font-bold text-primary hover:underline"
            >
              Refresh Ledger
            </button>
          </div>
          {loadingPayments ? (
            <div className="p-10 text-center text-xs text-slate-500">Loading payments...</div>
          ) : payments.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              No dues payments recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Flat #</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Paid At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-primary">{p.paymentRef}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{p.unitNumber}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                        ₹{Number(p.amount).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-700">{p.paymentMethod}</td>
                      <td className="py-3 px-4 text-slate-500">{new Date(p.paidAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Unit Profile Modal */}
      {selectedUnit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-primary">{selectedUnit.tower}</span>
                <h3 className="font-headline font-bold text-lg text-slate-900">
                  Unit {selectedUnit.unitNumber} ({selectedUnit.type})
                </h3>
              </div>
              <button
                onClick={() => setSelectedUnit(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500">Owner:</span>
                <span className="font-bold text-slate-900">{selectedUnit.ownerName} ({selectedUnit.ownerPhone})</span>
              </div>
              {selectedUnit.isTenantOccupied && (
                <div className="flex justify-between p-2.5 bg-amber-50 rounded-lg">
                  <span className="text-amber-800">Tenant:</span>
                  <span className="font-bold text-amber-950">{selectedUnit.tenantName} ({selectedUnit.tenantPhone})</span>
                </div>
              )}
              <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500">Vehicles:</span>
                <span className="font-mono font-bold text-slate-800">
                  {(selectedUnit.registeredVehicles || []).join(', ') || 'None'}
                </span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500">Dues Balance:</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{Number(selectedUnit.duesAmount || 0).toLocaleString()} ({selectedUnit.duesStatus})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onboard Unit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateUnit}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-3.5 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="font-headline font-bold text-base text-slate-900">Onboard New Unit</h3>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Unit #</label>
                <input
                  type="text"
                  required
                  value={newUnitNumber}
                  onChange={(e) => setNewUnitNumber(e.target.value)}
                  placeholder="A-901"
                  className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300 uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tower</label>
                <select
                  value={newTower}
                  onChange={(e) => setNewTower(e.target.value)}
                  className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Tower A">Tower A</option>
                  <option value="Tower B">Tower B</option>
                  <option value="Tower C">Tower C</option>
                  <option value="Tower D">Tower D</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Floor</label>
                <input
                  type="number"
                  min={0}
                  value={newFloor}
                  onChange={(e) => setNewFloor(Number(e.target.value))}
                  className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Owner Name</label>
                <input
                  type="text"
                  required
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Owner Phone</label>
                <input
                  type="text"
                  required
                  value={newOwnerPhone}
                  onChange={(e) => setNewOwnerPhone(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Unit Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="2BHK">2BHK</option>
                  <option value="3BHK">3BHK</option>
                  <option value="4BHK">4BHK</option>
                  <option value="Penthouse">Penthouse</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Opening Dues (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={newDuesAmount}
                  onChange={(e) => setNewDuesAmount(Number(e.target.value))}
                  className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={newIsTenant}
                onChange={(e) => setNewIsTenant(e.target.checked)}
              />
              <span>Tenant Occupied</span>
            </label>
            {newIsTenant && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Tenant Name"
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  className="h-9 px-2.5 text-xs rounded-lg border border-slate-300"
                />
                <input
                  type="text"
                  placeholder="Tenant Phone"
                  value={newTenantPhone}
                  onChange={(e) => setNewTenantPhone(e.target.value)}
                  className="h-9 px-2.5 text-xs rounded-lg border border-slate-300"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Registered Vehicles (comma separated)</label>
              <input
                type="text"
                value={newVehicles}
                onChange={(e) => setNewVehicles(e.target.value)}
                placeholder="KA-01-AB-1234, KA-05-XY-9876"
                className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300 uppercase"
              />
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
                {isCreating ? 'Onboarding...' : 'Save Unit'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

