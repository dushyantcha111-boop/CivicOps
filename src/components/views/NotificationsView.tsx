import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService, extractApiErrorMessage } from '../../services/api';
import { isTabAllowedForRole } from '../../config/rbac';
import { AppNotification } from '../../types';

export const NotificationsView: React.FC = () => {
  const {
    role,
    notifications,
    unreadNotificationsCount,
    refreshData,
    setActiveTab,
    setSelectedComplaintId,
    setSelectedWorkOrderId,
    showToast
  } = useApp();

  const [filterMode, setFilterMode] = useState<'ALL' | 'UNREAD'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const filteredNotifications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...notifications]
      .filter((n) => (filterMode === 'UNREAD' ? !n.isRead : true))
      .filter(
        (n) =>
          !q ||
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          n.type.toLowerCase().includes(q)
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notifications, filterMode, searchQuery]);

  const handleMarkRead = async (id: string) => {
    setBusyId(id);
    try {
      await ApiService.markNotificationRead(id);
      await refreshData();
    } catch (err) {
      showToast(extractApiErrorMessage(err, 'Failed to mark notification as read.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await ApiService.markAllNotificationsRead();
      await refreshData();
      showToast('All notifications marked as read.', 'success');
    } catch (err) {
      showToast(extractApiErrorMessage(err, 'Failed to mark all notifications as read.'), 'error');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleOpenContext = async (notif: AppNotification) => {
    if (!notif.isRead) {
      try {
        await ApiService.markNotificationRead(notif.id);
        await refreshData();
      } catch {
        // Non-blocking mark-read
      }
    }

    const typeUpper = (notif.type || '').toUpperCase();
    if (typeUpper.includes('WORK_ORDER') && notif.referenceId && isTabAllowedForRole(role, 'work-order-details')) {
      setSelectedWorkOrderId(notif.referenceId);
      setActiveTab('work-order-details');
    } else if (typeUpper.includes('COMPLAINT') && notif.referenceId && isTabAllowedForRole(role, 'resolution-timeline')) {
      setSelectedComplaintId(notif.referenceId);
      setActiveTab('resolution-timeline');
    } else if (typeUpper.includes('INCIDENT') || typeUpper.includes('SOS')) {
      if (isTabAllowedForRole(role, 'incident-reporting')) setActiveTab('incident-reporting');
    } else if (typeUpper.includes('PARCEL')) {
      if (isTabAllowedForRole(role, 'parcel-hub')) setActiveTab('parcel-hub');
    } else if (typeUpper.includes('VISITOR')) {
      if (isTabAllowedForRole(role, 'visitor-qr-verify')) setActiveTab('visitor-qr-verify');
    } else if (typeUpper.includes('ANNOUNCEMENT') || typeUpper.includes('EVENT')) {
      if (isTabAllowedForRole(role, 'community-hub')) setActiveTab('community-hub');
    }
  };

  const getNotificationIcon = (type: string) => {
    const t = (type || '').toUpperCase();
    if (t.includes('SOS') || t.includes('INCIDENT')) return 'emergency_home';
    if (t.includes('COMPLAINT')) return 'report_problem';
    if (t.includes('WORK_ORDER')) return 'engineering';
    if (t.includes('VISITOR')) return 'badge';
    if (t.includes('PARCEL')) return 'inventory_2';
    if (t.includes('REQUISITION') || t.includes('SPARE')) return 'inventory';
    return 'notifications';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">notifications_active</span>
            Notifications &amp; Dispatch Inbox
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time operational alerts, complaint escalations, gate arrivals, and community updates ({unreadNotificationsCount} unread).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshData()}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Sync
          </button>
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll || unreadNotificationsCount === 0}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 text-xs font-bold flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">done_all</span>
            {markingAll ? 'Updating...' : 'Mark All Read'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              filterMode === 'ALL' ? 'bg-white text-primary shadow-sm' : 'text-slate-600'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilterMode('UNREAD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              filterMode === 'UNREAD' ? 'bg-white text-primary shadow-sm' : 'text-slate-600'
            }`}
          >
            Unread ({unreadNotificationsCount})
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <span className="material-symbols-outlined text-[18px] text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notifications..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200"
          />
        </div>
      </div>

      {/* List */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
          <span className="material-symbols-outlined text-[40px] text-slate-300">notifications_off</span>
          <p className="text-sm font-bold text-slate-600">No notifications in this view</p>
          <p className="text-xs text-slate-400">
            Operational updates will appear here automatically as workflows execute on the backend.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((n) => (
            <div
              key={n.id}
              className={`bg-white rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                n.isRead ? 'border-slate-200' : 'border-primary/40 bg-blue-50/20 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    n.isRead ? 'bg-slate-100 text-slate-500' : 'bg-primary/10 text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{getNotificationIcon(n.type)}</span>
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary"></span>}
                    <h3 className="text-sm font-extrabold text-slate-900">{n.title}</h3>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                      {n.type}
                    </span>
                    {n.targetRole && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase">
                        {n.targetRole}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">{n.message}</p>
                  <p className="text-[11px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {n.referenceId && (
                  <button
                    onClick={() => handleOpenContext(n)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                    Inspect
                  </button>
                )}
                {!n.isRead && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    disabled={busyId === n.id}
                    className="px-3 py-1.5 rounded-xl bg-primary text-white hover:bg-primary/90 text-xs font-bold disabled:opacity-60"
                  >
                    {busyId === n.id ? '...' : 'Mark Read'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
