import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';
import { PreventiveCompletionLog, PreventiveSchedule, User } from '../../types';

export const PreventiveMaintenanceCalendarView: React.FC = () => {
  const {
    preventiveSchedules,
    assets,
    workOrders,
    currentUser,
    setActiveTab,
    setSelectedWorkOrderId,
    showToast,
    refreshData
  } = useApp();

  const [subTab, setSubTab] = useState<'CALENDAR' | 'LOGS'>('CALENDAR');
  const [logs, setLogs] = useState<PreventiveCompletionLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Create PM Schedule Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [assetId, setAssetId] = useState('');
  const [tower, setTower] = useState('Tower A');
  const [frequency, setFrequency] = useState<PreventiveSchedule['frequency']>('MONTHLY');
  const [nextDueDate, setNextDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [assignedTeam, setAssignedTeam] = useState('MEP Operations Squad');
  const [isCreating, setIsCreating] = useState(false);

  // Generate WO Modal
  const [woScheduleId, setWoScheduleId] = useState<string | null>(null);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [isGeneratingWo, setIsGeneratingWo] = useState(false);

  // Complete Cycle Modal
  const [completingSchedule, setCompletingSchedule] = useState<PreventiveSchedule | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionWoId, setCompletionWoId] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  const canManageSchedules =
    currentUser?.role === 'MANAGEMENT' ||
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'MAINTENANCE';

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await ApiService.getPreventiveLogs();
      setLogs(data || []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load PM logs', 'error');
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (subTab === 'LOGS') {
      loadLogs();
    }
  }, [subTab]);

  useEffect(() => {
    if (canManageSchedules) {
      ApiService.getTechnicians()
        .then((list) => setTechnicians(list || []))
        .catch(() => {});
    }
  }, [canManageSchedules]);

  const handleSyncOverdue = async () => {
    setIsSyncing(true);
    try {
      await ApiService.syncOverdueSchedules();
      await refreshData();
      showToast('Synchronized overdue preventive maintenance schedules.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to sync overdue schedules', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !assignedTeam.trim()) {
      showToast('Title and assigned team are required', 'error');
      return;
    }
    const chosenAsset = assets.find((a) => a.id === assetId);
    setIsCreating(true);
    try {
      await ApiService.createPreventiveSchedule({
        title: title.trim(),
        assetId: chosenAsset?.id,
        assetName: chosenAsset?.name || 'General Society Infrastructure',
        tower,
        frequency,
        nextDueDate,
        assignedTeam: assignedTeam.trim()
      });
      await refreshData();
      showToast('Preventive maintenance schedule created.');
      setIsCreateOpen(false);
      setTitle('');
      setAssetId('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create schedule', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleGenerateWo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!woScheduleId) return;
    setIsGeneratingWo(true);
    try {
      const wo = await ApiService.generatePmWorkOrder(woScheduleId, selectedTechId || undefined);
      await refreshData();
      showToast(`Generated Work Order ${wo.woNumber}.`);
      setWoScheduleId(null);
      setSelectedWorkOrderId(wo.id);
      setActiveTab('work-order-details');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to generate work order', 'error');
    } finally {
      setIsGeneratingWo(false);
    }
  };

  const handleCompleteCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingSchedule || !completionNotes.trim()) {
      showToast('Completion inspection notes are required', 'error');
      return;
    }
    setIsCompleting(true);
    try {
      const res = await ApiService.completePreventiveCycle(
        completingSchedule.id,
        completionNotes.trim(),
        completionWoId || undefined
      );
      await refreshData();
      if (subTab === 'LOGS') {
        await loadLogs();
      }
      showToast(`Cycle completed! Next due date advanced to ${res.schedule.nextDueDate}.`);
      setCompletingSchedule(null);
      setCompletionNotes('');
      setCompletionWoId('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to complete PM cycle', 'error');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
            <span>Asset Maintenance Lifecycle</span>
            <span className="text-slate-300">/</span>
            <span className="text-primary font-bold">Preventive PM Calendar</span>
          </div>
          <h1 className="font-headline font-bold text-2xl lg:text-3xl text-slate-900 mt-0.5 tracking-tight">
            Preventive Maintenance Scheduled Inspections
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Recurring safety inspections, work order generation, overdue tracking, and completion certification
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setSubTab('CALENDAR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                subTab === 'CALENDAR'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Schedules ({preventiveSchedules.length})
            </button>
            <button
              onClick={() => setSubTab('LOGS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                subTab === 'LOGS'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Completion History
            </button>
          </div>

          {canManageSchedules && (
            <>
              <button
                onClick={handleSyncOverdue}
                disabled={isSyncing}
                className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold transition-colors"
              >
                {isSyncing ? 'Syncing...' : 'Sync Overdue'}
              </button>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-3.5 py-2 bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>New Schedule</span>
              </button>
            </>
          )}
        </div>
      </div>

      {subTab === 'CALENDAR' ? (
        (preventiveSchedules || []).length === 0 ? (
          <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center text-xs text-slate-500">
            No preventive maintenance schedules configured.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {preventiveSchedules.map((schedule) => (
              <div
                key={schedule.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        {schedule.taskCode}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {schedule.frequency}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        schedule.status === 'OVERDUE'
                          ? 'bg-red-100 text-red-700'
                          : schedule.status === 'IN_PROGRESS'
                          ? 'bg-amber-100 text-amber-800'
                          : schedule.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {schedule.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="font-headline font-bold text-base text-slate-900 mt-2">
                    {schedule.title}
                  </h3>
                  <span className="text-xs text-slate-500 mt-0.5 block">
                    Asset: <strong>{schedule.assetName}</strong> ({schedule.tower})
                  </span>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Assigned Squad:</span>
                    <strong className="text-slate-800">{schedule.assignedTeam}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Next Due Date:</span>
                    <span className="font-mono font-bold text-primary">{schedule.nextDueDate}</span>
                  </div>
                </div>

                {canManageSchedules && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        setWoScheduleId(schedule.id);
                        setSelectedTechId(technicians[0]?.id || '');
                      }}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors"
                    >
                      Generate Work Order
                    </button>
                    <button
                      onClick={() => {
                        setCompletingSchedule(schedule);
                        setCompletionNotes('');
                        setCompletionWoId('');
                      }}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      Complete Cycle
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        /* Completion History Tab */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="font-headline font-bold text-slate-900 text-sm">
              Certified PM Completion Audit Trail
            </h3>
            <button onClick={loadLogs} className="text-xs font-bold text-primary hover:underline">
              Refresh Logs
            </button>
          </div>
          {loadingLogs ? (
            <div className="p-10 text-center text-xs text-slate-500">Loading completion logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              No preventive maintenance cycles have been completed yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Schedule ID</th>
                    <th className="py-3 px-4">Completed By</th>
                    <th className="py-3 px-4">Linked Work Order</th>
                    <th className="py-3 px-4">Inspection Notes</th>
                    <th className="py-3 px-4">Completed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-primary">{log.scheduleId}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{log.completedBy}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{log.workOrderId || 'Direct'}</td>
                      <td className="py-3 px-4 text-slate-700">{log.notes || '—'}</td>
                      <td className="py-3 px-4 text-slate-500">{new Date(log.completedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create PM Schedule Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateSchedule}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-3.5"
          >
            <h3 className="font-headline font-bold text-base text-slate-900">
              New Preventive Maintenance Schedule
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Task Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Quarterly DG Oil & Filter Inspection"
                className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Asset</label>
                <select
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">General Infrastructure</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.assetCode} — {a.name}
                    </option>
                  ))}
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
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as any)}
                  className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="DAILY">DAILY</option>
                  <option value="WEEKLY">WEEKLY</option>
                  <option value="MONTHLY">MONTHLY</option>
                  <option value="QUARTERLY">QUARTERLY</option>
                  <option value="ANNUAL">ANNUAL</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Next Due Date</label>
                <input
                  type="date"
                  required
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Team</label>
              <input
                type="text"
                required
                value={assignedTeam}
                onChange={(e) => setAssignedTeam(e.target.value)}
                className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300"
              />
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
                {isCreating ? 'Creating...' : 'Create Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Generate Work Order Modal */}
      {woScheduleId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleGenerateWo}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <h3 className="font-headline font-bold text-base text-slate-900">
              Generate Preventive Work Order
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assign Technician</label>
              <select
                value={selectedTechId}
                onChange={(e) => setSelectedTechId(e.target.value)}
                className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300 bg-white"
              >
                <option value="">Auto-assign available technician</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.designation || t.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setWoScheduleId(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGeneratingWo}
                className="px-5 py-2 bg-primary hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold"
              >
                {isGeneratingWo ? 'Generating...' : 'Create Work Order'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Complete Cycle Modal */}
      {completingSchedule && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCompleteCycle}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <h3 className="font-headline font-bold text-base text-slate-900">
              Certify &amp; Complete PM Cycle ({completingSchedule.taskCode})
            </h3>
            <p className="text-xs text-slate-600">
              Recording completion will log an audit certificate and advance the next due date based on {completingSchedule.frequency} cadence.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Linked Work Order (Optional)
              </label>
              <select
                value={completionWoId}
                onChange={(e) => setCompletionWoId(e.target.value)}
                className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300 bg-white"
              >
                <option value="">None</option>
                {workOrders.map((wo) => (
                  <option key={wo.id} value={wo.id}>
                    {wo.woNumber} — {wo.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Verification &amp; Readings Notes
              </label>
              <textarea
                rows={3}
                required
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Document test parameters, filter changes, safety checks..."
                className="w-full p-3 text-xs rounded-lg border border-slate-300 outline-none resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCompletingSchedule(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCompleting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold"
              >
                {isCompleting ? 'Certifying...' : 'Complete & Advance'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

