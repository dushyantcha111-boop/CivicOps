import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService, extractApiErrorMessage } from '../../services/api';
import { Announcement, CommunityDocument, CommunityEvent } from '../../types';

type HubTab = 'ANNOUNCEMENTS' | 'EVENTS' | 'DOCUMENTS';

export const CommunityHubView: React.FC = () => {
  const { role, selectedTower, showToast } = useApp();
  const canManage = role === 'MANAGEMENT' || role === 'ADMIN';

  const [hubTab, setHubTab] = useState<HubTab>('ANNOUNCEMENTS');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [documents, setDocuments] = useState<CommunityDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Action states
  const [rsvpPendingId, setRsvpPendingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<{ type: 'ann' | 'doc'; id: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modals
  const [isAnnModalOpen, setIsAnnModalOpen] = useState(false);
  const [annForm, setAnnForm] = useState({
    title: '',
    content: '',
    category: 'GENERAL',
    tower: 'All Towers',
    pinned: false
  });
  const [savingAnn, setSavingAnn] = useState(false);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    location: '',
    tower: 'All Towers',
    eventDate: ''
  });
  const [savingEvent, setSavingEvent] = useState(false);

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docForm, setDocForm] = useState({
    title: '',
    category: 'BYLAWS',
    description: '',
    fileUrl: '',
    fileSize: '1.2 MB',
    visibilityRole: 'ALL'
  });
  const [savingDoc, setSavingDoc] = useState(false);

  const loadHubData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [annRes, evtRes, docRes] = await Promise.all([
        ApiService.getAnnouncements(),
        ApiService.getEvents(),
        ApiService.getDocuments()
      ]);
      setAnnouncements(annRes);
      setEvents(evtRes);
      setDocuments(docRes);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Failed to load Community Hub data.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHubData();
  }, [loadHubData]);

  const filteredAnnouncements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...announcements]
      .filter((a) => selectedTower === 'All Towers' || !a.tower || a.tower === 'All Towers' || a.tower === selectedTower)
      .filter(
        (a) =>
          !q ||
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });
  }, [announcements, selectedTower, searchQuery]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...events]
      .filter((e) => selectedTower === 'All Towers' || !e.tower || e.tower === 'All Towers' || e.tower === selectedTower)
      .filter(
        (e) =>
          !q ||
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q)
      )
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  }, [events, selectedTower, searchQuery]);

  const filteredDocuments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return documents.filter(
      (d) =>
        !q ||
        d.title.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        (d.description || '').toLowerCase().includes(q)
    );
  }, [documents, searchQuery]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annForm.title.trim() || !annForm.content.trim()) {
      showToast('Announcement title and content are required.', 'error');
      return;
    }
    setSavingAnn(true);
    try {
      const created = await ApiService.createAnnouncement({
        title: annForm.title.trim(),
        content: annForm.content.trim(),
        category: annForm.category,
        tower: annForm.tower,
        pinned: annForm.pinned
      });
      setAnnouncements((prev) => [created, ...prev]);
      setIsAnnModalOpen(false);
      setAnnForm({ title: '', content: '', category: 'GENERAL', tower: 'All Towers', pinned: false });
      showToast('Announcement published to residents.', 'success');
    } catch (err) {
      showToast(extractApiErrorMessage(err, 'Failed to publish announcement.'), 'error');
    } finally {
      setSavingAnn(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title.trim() || !eventForm.location.trim() || !eventForm.eventDate) {
      showToast('Title, location, and event date are required.', 'error');
      return;
    }
    setSavingEvent(true);
    try {
      const isoDate = new Date(eventForm.eventDate).toISOString();
      const created = await ApiService.createEvent({
        title: eventForm.title.trim(),
        description: eventForm.description.trim(),
        location: eventForm.location.trim(),
        tower: eventForm.tower,
        eventDate: isoDate
      });
      setEvents((prev) => [created, ...prev]);
      setIsEventModalOpen(false);
      setEventForm({ title: '', description: '', location: '', tower: 'All Towers', eventDate: '' });
      showToast('Community event scheduled.', 'success');
    } catch (err) {
      showToast(extractApiErrorMessage(err, 'Failed to schedule event.'), 'error');
    } finally {
      setSavingEvent(false);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.title.trim() || !docForm.fileUrl.trim()) {
      showToast('Document title and valid file URL are required.', 'error');
      return;
    }
    setSavingDoc(true);
    try {
      const created = await ApiService.createDocument({
        title: docForm.title.trim(),
        category: docForm.category,
        description: docForm.description.trim() || undefined,
        fileUrl: docForm.fileUrl.trim(),
        fileSize: docForm.fileSize.trim() || '1.0 MB',
        visibilityRole: docForm.visibilityRole
      });
      setDocuments((prev) => [created, ...prev]);
      setIsDocModalOpen(false);
      setDocForm({
        title: '',
        category: 'BYLAWS',
        description: '',
        fileUrl: '',
        fileSize: '1.2 MB',
        visibilityRole: 'ALL'
      });
      showToast('Document registered in repository.', 'success');
    } catch (err) {
      showToast(extractApiErrorMessage(err, 'Failed to register document.'), 'error');
    } finally {
      setSavingDoc(false);
    }
  };

  const handleRsvp = async (eventId: string) => {
    setRsvpPendingId(eventId);
    try {
      const updated = await ApiService.rsvpEvent(eventId);
      setEvents((prev) => prev.map((ev) => (ev.id === eventId ? updated : ev)));
      showToast('RSVP confirmed! Your attendance count has been updated.', 'success');
    } catch (err) {
      showToast(extractApiErrorMessage(err, 'Failed to submit RSVP.'), 'error');
    } finally {
      setRsvpPendingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      if (confirmDeleteId.type === 'ann') {
        await ApiService.deleteAnnouncement(confirmDeleteId.id);
        setAnnouncements((prev) => prev.filter((a) => a.id !== confirmDeleteId.id));
        showToast('Announcement deleted.', 'info');
      } else {
        await ApiService.deleteDocument(confirmDeleteId.id);
        setDocuments((prev) => prev.filter((d) => d.id !== confirmDeleteId.id));
        showToast('Document removed from repository.', 'info');
      }
      setConfirmDeleteId(null);
    } catch (err) {
      showToast(extractApiErrorMessage(err, 'Delete operation failed.'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const isSafeHref = (url: string) => {
    const trimmed = url.trim();
    return trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('/');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">campaign</span>
            Community Hub &amp; Repository
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Official notices, community events, and society governance documents synced with PostgreSQL.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadHubData}
            disabled={loading}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5"
          >
            <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
            Refresh
          </button>

          {canManage && hubTab === 'ANNOUNCEMENTS' && (
            <button
              onClick={() => setIsAnnModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">add_alert</span>
              Publish Notice
            </button>
          )}

          {canManage && hubTab === 'EVENTS' && (
            <button
              onClick={() => setIsEventModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">event</span>
              Schedule Event
            </button>
          )}

          {canManage && hubTab === 'DOCUMENTS' && (
            <button
              onClick={() => setIsDocModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">upload_file</span>
              Add Document
            </button>
          )}
        </div>
      </div>

      {/* Sub-navigation & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {(
            [
              { id: 'ANNOUNCEMENTS', label: `Notices (${filteredAnnouncements.length})`, icon: 'campaign' },
              { id: 'EVENTS', label: `Events (${filteredEvents.length})`, icon: 'calendar_month' },
              { id: 'DOCUMENTS', label: `Documents (${filteredDocuments.length})`, icon: 'folder_open' }
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setHubTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                hubTab === t.id ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <span className="material-symbols-outlined text-[18px] text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter notices, events, or docs..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadHubData} className="font-bold underline">
            Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/3"></div>
              <div className="h-5 bg-slate-200 rounded w-3/4"></div>
              <div className="h-12 bg-slate-100 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : hubTab === 'ANNOUNCEMENTS' ? (
        filteredAnnouncements.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
            No community announcements match your current filter.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAnnouncements.map((ann) => (
              <div
                key={ann.id}
                className={`bg-white rounded-2xl border p-5 transition-all ${
                  ann.pinned ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {ann.pinned && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                          <span className="material-symbols-outlined text-[12px]">push_pin</span>
                          Pinned
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                        {ann.category}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold">
                        {ann.tower || 'All Towers'}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900">{ann.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{ann.content}</p>
                    <div className="pt-2 flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                      <span>
                        Published by <strong className="text-slate-600">{ann.authorName}</strong> ({ann.authorRole})
                      </span>
                      <span>{new Date(ann.publishedAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {canManage && (
                    <div>
                      {confirmDeleteId?.type === 'ann' && confirmDeleteId.id === ann.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={handleConfirmDelete}
                            disabled={deleting}
                            className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-[11px] font-bold hover:bg-red-700"
                          >
                            {deleting ? '...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId({ type: 'ann', id: ann.id })}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete notice"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : hubTab === 'EVENTS' ? (
        filteredEvents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
            No upcoming community events match your filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEvents.map((ev) => (
              <div key={ev.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between gap-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase">
                      {ev.status || 'UPCOMING'}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">{ev.tower || 'All Towers'}</span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900">{ev.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{ev.description}</p>
                  <div className="space-y-1 pt-1 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                      <span>{new Date(ev.eventDate).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                      <span>{ev.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">person</span>
                      <span>Organized by {ev.organizer}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">group</span>
                    {ev.rsvpCount} Residents Going
                  </span>
                  <button
                    onClick={() => handleRsvp(ev.id)}
                    disabled={rsvpPendingId === ev.id}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold disabled:opacity-60 flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                    {rsvpPendingId === ev.id ? 'Updating...' : 'RSVP Going'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
          No community documents found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <div key={doc.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-black uppercase">
                    {doc.category}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {doc.fileSize || 'PDF'} • {doc.visibilityRole || 'ALL'}
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">{doc.title}</h3>
                {doc.description && <p className="text-xs text-slate-500 line-clamp-2">{doc.description}</p>}
                <p className="text-[11px] text-slate-400">
                  Uploaded by {doc.uploadedBy} • {new Date(doc.uploadedAt).toLocaleDateString()}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {isSafeHref(doc.fileUrl) ? (
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                    Open File
                  </a>
                ) : (
                  <span className="text-[11px] text-amber-700 font-semibold">Invalid file reference</span>
                )}

                {canManage && (
                  <div>
                    {confirmDeleteId?.type === 'doc' && confirmDeleteId.id === doc.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleConfirmDelete}
                          disabled={deleting}
                          className="px-2 py-1 rounded-lg bg-red-600 text-white text-[11px] font-bold"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId({ type: 'doc', id: doc.id })}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete document"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Publish Announcement */}
      {isAnnModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateAnnouncement} className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">Publish Community Notice</h2>
              <button type="button" onClick={() => setIsAnnModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={annForm.title}
                  onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                  placeholder="Scheduled Water Tank Chlorination"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={annForm.category}
                    onChange={(e) => setAnnForm({ ...annForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="GENERAL">GENERAL</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="SECURITY">SECURITY</option>
                    <option value="EMERGENCY">EMERGENCY</option>
                    <option value="FINANCE">FINANCE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Tower</label>
                  <select
                    value={annForm.tower}
                    onChange={(e) => setAnnForm({ ...annForm, tower: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="All Towers">All Towers</option>
                    <option value="Tower A">Tower A</option>
                    <option value="Tower B">Tower B</option>
                    <option value="Tower C">Tower C</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Content</label>
                <textarea
                  required
                  rows={4}
                  value={annForm.content}
                  onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })}
                  placeholder="Provide clear schedule, affected floors, and emergency contacts..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={annForm.pinned}
                  onChange={(e) => setAnnForm({ ...annForm, pinned: e.target.checked })}
                  className="rounded border-slate-300"
                />
                Pin announcement to top of noticeboard
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAnnModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingAnn}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold disabled:opacity-60"
              >
                {savingAnn ? 'Publishing...' : 'Publish Notice'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Schedule Event */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateEvent} className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">Schedule Community Event</h2>
              <button type="button" onClick={() => setIsEventModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="Annual General Body Meeting & Fire Drill"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date &amp; Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.eventDate}
                    onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tower Scope</label>
                  <select
                    value={eventForm.tower}
                    onChange={(e) => setEventForm({ ...eventForm, tower: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="All Towers">All Towers</option>
                    <option value="Tower A">Tower A</option>
                    <option value="Tower B">Tower B</option>
                    <option value="Tower C">Tower C</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Location / Venue</label>
                <input
                  type="text"
                  required
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  placeholder="Clubhouse Multipurpose Hall"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Agenda and participant instructions..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEventModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEvent}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold disabled:opacity-60"
              >
                {savingEvent ? 'Scheduling...' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Register Document */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateDocument} className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">Register Community Document</h2>
              <button type="button" onClick={() => setIsDocModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  value={docForm.title}
                  onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                  placeholder="Green Valley Residency Society Bylaws"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={docForm.category}
                    onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="BYLAWS">BYLAWS</option>
                    <option value="SAFETY_SOP">SAFETY_SOP</option>
                    <option value="FINANCIAL_AUDIT">FINANCIAL_AUDIT</option>
                    <option value="AGM_MINUTES">AGM_MINUTES</option>
                    <option value="VENDOR_AMC">VENDOR_AMC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Visibility Role</label>
                  <select
                    value={docForm.visibilityRole}
                    onChange={(e) => setDocForm({ ...docForm, visibilityRole: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="ALL">ALL</option>
                    <option value="RESIDENT">RESIDENT</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="SECURITY">SECURITY</option>
                    <option value="MANAGEMENT">MANAGEMENT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">File URL</label>
                  <input
                    type="url"
                    required
                    value={docForm.fileUrl}
                    onChange={(e) => setDocForm({ ...docForm, fileUrl: e.target.value })}
                    placeholder="https://docs.example.org/bylaws.pdf"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">File Size</label>
                  <input
                    type="text"
                    value={docForm.fileSize}
                    onChange={(e) => setDocForm({ ...docForm, fileSize: e.target.value })}
                    placeholder="1.2 MB"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={docForm.description}
                  onChange={(e) => setDocForm({ ...docForm, description: e.target.value })}
                  placeholder="Summary of document scope and effective date..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDocModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingDoc}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold disabled:opacity-60"
              >
                {savingDoc ? 'Saving...' : 'Save Document'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
