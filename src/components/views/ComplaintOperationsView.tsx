import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';
import { User } from '../../types';

export const ComplaintOperationsView: React.FC = () => {
  const {
    complaints,
    selectedTower,
    setSelectedComplaintId,
    setActiveTab,
    currentUser,
    role,
    showToast,
    refreshData
  } = useApp();

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [assigningComplaintId, setAssigningComplaintId] = useState<string | null>(null);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const isManagerOrAdmin = role === 'MANAGEMENT' || role === 'ADMIN';
  const isMaintenanceOrAdmin = role === 'MAINTENANCE' || role === 'ADMIN';

  useEffect(() => {
    if (!isManagerOrAdmin) return;
    let cancelled = false;
    ApiService.getTechnicians()
      .then((list) => {
        if (cancelled) return;
        setTechnicians(list);
        if (list.length > 0) {
          setSelectedTechId((prev) => prev || list[0].id);
        }
      })
      .catch(() => {
        // Handled silently unless user opens assign modal
      });
    return () => {
      cancelled = true;
    };
  }, [isManagerOrAdmin]);

  if (!currentUser) return null;

  const filtered = complaints.filter((c) => {
    if (selectedTower !== 'All Towers' && c.tower !== selectedTower) return false;
    if (categoryFilter !== 'ALL' && c.category !== categoryFilter) return false;
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (severityFilter !== 'ALL' && c.severity !== severityFilter) return false;
    return true;
  });

  const handleReview = async (complaintId: string) => {
    try {
      await ApiService.reviewComplaint(
        complaintId,
        currentUser.name,
        'Management triage validated. Prioritized for resolution.'
      );
      await refreshData();
      showToast('Complaint approved in triage. Ready for technician assignment (Step 2 completed).');
    } catch (e: any) {
      showToast(e?.message || 'Review failed', 'error');
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningComplaintId || !selectedTechId) {
      showToast('Please select a technician first.', 'error');
      return;
    }
    setIsAssigning(true);
    try {
      await ApiService.assignComplaint(assigningComplaintId, selectedTechId, currentUser.name, assignNotes.trim());
      await refreshData();
      showToast('Complaint assigned to technician and Work Order generated (Step 3 completed)!');
      setAssigningComplaintId(null);
      setAssignNotes('');
    } catch (e: any) {
      showToast(e?.message || 'Assignment failed', 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="font-headline font-bold text-2xl lg:text-3xl text-slate-900 tracking-tight">
            Complaint Operations &amp; Triage Board
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            End-to-end 9-step governance pipeline • {complaints.length} Total Registered Tickets
          </p>
        </div>

        {(role === 'RESIDENT' || role === 'MANAGEMENT' || role === 'ADMIN') && (
          <button
            onClick={() => setActiveTab('raise-complaint')}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Submit Complaint (Step 1)</span>
          </button>
        )}
      </div>

      {/* Filter Chips Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:border-primary outline-none"
          >
            <option value="ALL">All Statuses ({complaints.length})</option>
            <option value="SUBMITTED">Submitted (Triage)</option>
            <option value="REVIEWED">Reviewed by Mgmt</option>
            <option value="ASSIGNED">Assigned to Tech</option>
            <option value="INSPECTING">Inspecting</option>
            <option value="PROPOSED">Proposal Submitted</option>
            <option value="MANAGEMENT_APPROVED">Mgmt Approved</option>
            <option value="RESIDENT_CONFIRMED">Resident Confirmed</option>
            <option value="DISPUTED">Disputed</option>
            <option value="CLOSED">Closed &amp; Archived</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-3 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:border-primary outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="PLUMBING">Plumbing</option>
            <option value="ELECTRICAL">Electrical</option>
            <option value="ELEVATOR">Elevator</option>
            <option value="HVAC">HVAC</option>
            <option value="CIVIL">Civil</option>
            <option value="SECURITY">Security</option>
            <option value="COMMON_AREA">Common Area</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="h-9 px-3 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:border-primary outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <strong className="text-slate-800">{filtered.length}</strong> matching tickets
        </div>
      </div>

      {/* Ticket Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center text-xs text-slate-500">
          No complaints match the current filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const timeline = c.timeline || [];
            const currentStep = timeline[timeline.length - 1]?.stepNumber || 1;

            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-primary">
                      <span>{c.ticketNumber}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-600 font-sans font-semibold">{c.tower}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        c.severity === 'CRITICAL'
                          ? 'bg-red-100 text-red-700'
                          : c.severity === 'HIGH'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {c.severity}
                    </span>
                  </div>

                  <h3 className="font-headline font-bold text-slate-900 text-sm mt-2 leading-tight">
                    {c.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {c.description}
                  </p>

                  {c.recurrenceWarning && (
                    <div className="mt-2.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-1.5 font-medium">
                      <span className="material-symbols-outlined text-[15px] text-amber-600 shrink-0">
                        history
                      </span>
                      <span className="truncate">{c.recurrenceWarning}</span>
                    </div>
                  )}
                </div>

                {/* Progress & Metadata */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Step {currentStep} of 9:</span>
                    <span className="font-bold text-primary">{c.status.replace(/_/g, ' ')}</span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (currentStep / 9) * 100)}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Unit {c.unitNumber} ({c.residentName})</span>
                    <span>Tech: {c.assignedTechnicianName || 'Pending'}</span>
                  </div>

                  {/* Role-gated Action Toolbar */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {isManagerOrAdmin && c.status === 'SUBMITTED' && (
                      <button
                        onClick={() => handleReview(c.id)}
                        className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Review Triage (Step 2)
                      </button>
                    )}

                    {isManagerOrAdmin && (c.status === 'SUBMITTED' || c.status === 'REVIEWED') && (
                      <button
                        onClick={() => setAssigningComplaintId(c.id)}
                        className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Assign Tech (Step 3)
                      </button>
                    )}

                    {isMaintenanceOrAdmin && (c.status === 'ASSIGNED' || c.status === 'INSPECTING') && (
                      <button
                        onClick={() => {
                          setSelectedComplaintId(c.id);
                          setActiveTab('inspection-proposal');
                        }}
                        className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Inspect / Propose (Step 4–6)
                      </button>
                    )}

                    {role === 'RESIDENT' && (c.status === 'MANAGEMENT_APPROVED' || c.status === 'PROPOSED') && (
                      <button
                        onClick={() => {
                          setSelectedComplaintId(c.id);
                          setActiveTab('resident-signoff');
                        }}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Resident Sign-off (Step 8)
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedComplaintId(c.id);
                        setActiveTab('resolution-timeline');
                      }}
                      className="px-2.5 py-1.5 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                      title="Audit Trust Timeline"
                    >
                      <span className="material-symbols-outlined text-[16px]">verified_user</span>
                      <span>Timeline</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assignment Modal */}
      {assigningComplaintId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-headline font-bold text-slate-900 text-base">
                Assign Work Order to Technician (Step 3)
              </h3>
              <button
                onClick={() => setAssigningComplaintId(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAssign} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Lead Technician
                </label>
                {technicians.length === 0 ? (
                  <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">
                    No active maintenance/admin users found in database. Create a technician in Settings first.
                  </p>
                ) : (
                  <select
                    value={selectedTechId}
                    onChange={(e) => setSelectedTechId(e.target.value)}
                    className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 bg-white focus:border-primary outline-none"
                  >
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.name} ({tech.designation || tech.role})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Triage Directive / Dispatch Notes
                </label>
                <textarea
                  rows={3}
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="Immediate dispatch for on-site diagnosis and repair."
                  className="w-full p-3 text-xs rounded-lg border border-slate-300 focus:border-primary outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssigningComplaintId(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning || technicians.length === 0}
                  className="px-5 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs disabled:opacity-60"
                >
                  {isAssigning ? 'Assigning...' : 'Confirm & Generate WO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

