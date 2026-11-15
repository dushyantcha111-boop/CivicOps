import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService, extractApiErrorMessage } from '../../services/api';
import { AuditLogEntry } from '../../types';

export const AuditLogsView: React.FC = () => {
  const { role, showToast } = useApp();
  const isAuthorized = role === 'MANAGEMENT' || role === 'ADMIN';

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');

  const fetchLogs = useCallback(async () => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await ApiService.getAuditLogs();
      setLogs(data);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Failed to fetch security audit logs.'));
    } finally {
      setLoading(false);
    }
  }, [isAuthorized]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const distinctActions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.action).filter(Boolean))).sort(),
    [logs]
  );

  const distinctEntities = useMemo(
    () => Array.from(new Set(logs.map((l) => l.entityType).filter(Boolean))).sort(),
    [logs]
  );

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...logs]
      .filter((l) => actionFilter === 'ALL' || l.action === actionFilter)
      .filter((l) => entityFilter === 'ALL' || l.entityType === entityFilter)
      .filter(
        (l) =>
          !q ||
          l.actorName.toLowerCase().includes(q) ||
          l.actorEmail.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.entityType.toLowerCase().includes(q) ||
          l.entityId.toLowerCase().includes(q) ||
          (l.details || '').toLowerCase().includes(q)
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [logs, actionFilter, entityFilter, searchQuery]);

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) {
      showToast('No audit entries available to export.', 'info');
      return;
    }
    const escapeCsv = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
    const headers = ['Timestamp', 'Actor Name', 'Actor Email', 'Role', 'Action', 'Entity Type', 'Entity ID', 'Details'];
    const rows = filteredLogs.map((l) => [
      escapeCsv(l.createdAt),
      escapeCsv(l.actorName),
      escapeCsv(l.actorEmail),
      escapeCsv(l.actorRole),
      escapeCsv(l.action),
      escapeCsv(l.entityType),
      escapeCsv(l.entityId),
      escapeCsv(l.details || '')
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `civicops-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Audit log CSV exported.', 'success');
  };

  if (!isAuthorized) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-8 text-center space-y-2">
        <span className="material-symbols-outlined text-[40px] text-red-500">lock</span>
        <h2 className="text-lg font-black text-slate-900">Restricted Compliance Ledger</h2>
        <p className="text-xs text-slate-500">
          Security audit logs are restricted to MANAGEMENT and ADMIN roles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">policy</span>
            Immutable Security &amp; Audit Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-evident PostgreSQL log of RBAC mutations, authentication events, approvals, and workflow transitions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5"
          >
            <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
            Refresh
          </button>
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <span className="material-symbols-outlined text-[18px] text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search actor, email, entity ID, or details..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700"
        >
          <option value="ALL">All Actions ({logs.length})</option>
          {distinctActions.map((act) => (
            <option key={act} value={act}>
              {act}
            </option>
          ))}
        </select>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700"
        >
          <option value="ALL">All Entities</option>
          {distinctEntities.map((ent) => (
            <option key={ent} value={ent}>
              {ent}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchLogs} className="font-bold underline">
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    Loading audit ledger...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    No audit log entries match your current filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{entry.actorName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <span>{entry.actorEmail}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                          {entry.actorRole}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px]">
                        {entry.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{entry.entityType}</div>
                      <div className="text-[11px] font-mono text-slate-400">{entry.entityId}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-md">{entry.details || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
