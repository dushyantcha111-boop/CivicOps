import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';
import { InventoryMovement } from '../../types';

export const SparesInventoryReorderView: React.FC = () => {
  const { spares, currentUser, setActiveTab, showToast, refreshData } = useApp();

  const [reorderingPartId, setReorderingPartId] = useState<string | null>(null);
  const [reorderQty, setReorderQty] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [filterPartId, setFilterPartId] = useState<string>('');
  const [loadingMovements, setLoadingMovements] = useState(false);

  const canReorder =
    currentUser?.role === 'MANAGEMENT' ||
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'MAINTENANCE';

  const loadMovements = async (partId?: string) => {
    setLoadingMovements(true);
    try {
      const data = await ApiService.getInventoryMovements(partId || undefined);
      setMovements(data || []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load inventory movements', 'error');
    } finally {
      setLoadingMovements(false);
    }
  };

  useEffect(() => {
    loadMovements(filterPartId || undefined);
  }, [filterPartId]);

  const handleReorder = async (partId: string) => {
    if (reorderQty < 1) {
      showToast('Order quantity must be at least 1', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await ApiService.reorderSpare(partId, reorderQty);
      await refreshData();
      await loadMovements(filterPartId || undefined);
      showToast(`Restock recorded! Added ${reorderQty} units to inventory.`);
      setReorderingPartId(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Reorder failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
            <span>Inventory Logistics</span>
            <span className="text-slate-300">/</span>
            <span className="text-primary font-bold">Spare Parts Stock Ledger</span>
          </div>
          <h1 className="font-headline font-bold text-2xl lg:text-3xl text-slate-900 mt-0.5 tracking-tight">
            Spares Inventory &amp; Reorder Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Critical threshold monitoring, vendor restocking, and traceable outbound inventory movements
          </p>
        </div>

        <button
          onClick={() => setActiveTab('spares-requisitions')}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">shopping_cart_checkout</span>
          <span>Technician Requisitions</span>
        </button>
      </div>

      {/* Stock Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">SKU / Code</th>
                <th className="py-3 px-4">Part Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Stock Level</th>
                <th className="py-3 px-4">Min Threshold</th>
                <th className="py-3 px-4">Unit Cost</th>
                <th className="py-3 px-4">Primary Supplier</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {spares.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    No spare parts registered.
                  </td>
                </tr>
              ) : (
                spares.map((part) => {
                  const isLow = part.currentStock <= part.minThreshold;

                  return (
                    <tr key={part.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-primary">{part.sku}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 text-sm block">{part.name}</span>
                        <span className="text-[11px] text-slate-400">Lead time: {part.leadTimeDays} days</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px]">
                          {part.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold text-sm ${
                              isLow ? 'text-red-600' : 'text-slate-800'
                            }`}
                          >
                            {part.currentStock} Units
                          </span>
                          {isLow && (
                            <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[9px] uppercase">
                              Low Stock
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">{part.minThreshold} Units</td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                        ₹{Number(part.unitCost || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{part.supplier}</td>
                      <td className="py-3.5 px-4 text-right">
                        {canReorder && (
                          <button
                            onClick={() => setReorderingPartId(part.id)}
                            className="px-3 py-1 bg-primary hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition-colors shadow-2xs"
                          >
                            Reorder PO
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inventory Movements Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-headline font-bold text-slate-900 text-sm">
            Inventory Movements Audit Ledger
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={filterPartId}
              onChange={(e) => setFilterPartId(e.target.value)}
              className="h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
            >
              <option value="">All Spare Parts</option>
              {spares.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sku} — {s.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => loadMovements(filterPartId || undefined)}
              className="text-xs font-bold text-primary hover:underline"
            >
              Refresh
            </button>
          </div>
        </div>
        {loadingMovements ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading movement ledger...</div>
        ) : movements.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No stock movements recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Part</th>
                  <th className="py-2.5 px-4">Qty</th>
                  <th className="py-2.5 px-4">Balance After</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.movementType === 'RESTOCK'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {m.movementType}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{m.partName}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{m.quantity}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">{m.balanceAfter}</td>
                    <td className="py-2.5 px-4 text-slate-600">{m.actorName}</td>
                    <td className="py-2.5 px-4 text-slate-500">{new Date(m.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PO Reorder Modal */}
      {reorderingPartId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-headline font-bold text-slate-900 text-base flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">shopping_cart</span>
              <span>Generate Vendor Purchase Order</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Order Quantity
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={reorderQty}
                onChange={(e) => setReorderQty(Number(e.target.value))}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 font-mono font-bold outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setReorderingPartId(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReorder(reorderingPartId)}
                disabled={isSubmitting}
                className="px-5 py-2 bg-primary hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-2xs"
              >
                {isSubmitting ? 'Issuing...' : 'Issue PO & Restock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

