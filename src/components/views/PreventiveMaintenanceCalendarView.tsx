import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export const PreventiveMaintenanceCalendarView: React.FC = () => {
  const { preventiveSchedules, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'CALENDAR' | 'EXECUTION'>('CALENDAR');

  // Interactive execution checklist for WO-PM-2024-001 (Cummins DG Overhaul) matching Stitch Screen 28
  const [pmChecklist, setPmChecklist] = useState([
    { id: 1, step: 'Perform pre-service run test: Note coolant temp (82°C) & oil pressure (4.2 Bar)', done: true },
    { id: 2, step: 'Drain engine oil: Inspect sump magnetic drain plug for ferrous metal shavings', done: true },
    { id: 3, step: 'Replace dual spin-on lube filters (Fleetguard LF9009) and pre-prime with fresh 15W40', done: false },
    { id: 4, step: 'Inspect alternator fan belt tension: Target deflection 10-12mm under finger pressure', done: false },
    { id: 5, step: 'Measure 24V starter battery specific gravity with hydrometer (Target: > 1.260)', done: false },
    { id: 6, step: 'Simulate grid failure: Test automatic AMF synchronizing relay transfer time (< 8 secs)', done: false }
  ]);

  const toggleStep = (id: number) => {
    setPmChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
    showToast('PM checklist item recorded & timestamped');
  };

  const completedCount = pmChecklist.filter((c) => c.done).length;

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
            Society-wide recurring statutory safety tests, DG overhauls, and elevator AMC calendars
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
          <button
            onClick={() => setActiveTab('CALENDAR')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'CALENDAR'
                ? 'bg-primary text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Scheduled Calendar
          </button>
          <button
            onClick={() => setActiveTab('EXECUTION')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'EXECUTION'
                ? 'bg-primary text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            WO-PM-2024-001 Execution
          </button>
        </div>
      </div>

      {activeTab === 'CALENDAR' ? (
        /* Schedule Cards */
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
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      schedule.status === 'IN_PROGRESS'
                        ? 'bg-amber-100 text-amber-800 animate-pulse'
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
                  <span>Due Execution Window:</span>
                  <span className="font-mono font-bold text-primary">{schedule.nextDueDate}</span>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('EXECUTION')}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Launch Execution Protocol</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* WO-PM-2024-001 Execution Protocol matching Stitch Screen 28 */
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-primary">WO-PM-2024-001</span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  In Execution
                </span>
              </div>
              <h2 className="font-headline font-bold text-xl text-slate-900 mt-1">
                Cummins 500kVA DG Set #2 - 250h Quarterly Overhaul
              </h2>
              <span className="text-xs text-slate-500">
                Basement 1, Generator Bay 2 • Lead Technician: Ramesh Kumar
              </span>
            </div>

            <div className="text-right">
              <span className="text-2xl font-bold font-headline text-primary">
                {Math.round((completedCount / pmChecklist.length) * 100)}%
              </span>
              <span className="text-xs text-slate-400 block font-bold">
                {completedCount} of {pmChecklist.length} Steps
              </span>
            </div>
          </div>

          {/* Interactive Step-by-Step Execution Checklist */}
          <div className="space-y-3">
            <h3 className="font-headline font-bold text-slate-900 text-sm">
              Standard Operating Procedure Execution Checklist
            </h3>

            <div className="space-y-2.5">
              {pmChecklist.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleStep(item.id)}
                  className={`p-4 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    item.done
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={item.done}
                      readOnly
                      className="w-5 h-5 rounded text-emerald-600 accent-emerald-600"
                    />
                    <span className={`text-xs font-medium ${item.done ? 'line-through text-slate-500' : ''}`}>
                      {item.step}
                    </span>
                  </div>

                  <span className="material-symbols-outlined text-[20px] text-slate-400">
                    {item.done ? 'verified' : 'pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setActiveTab('CALENDAR')}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
            >
              Back to Calendar
            </button>
            <button
              onClick={() => showToast('WO-PM-2024-001 certified and logged into Asset Maintenance Register!')}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>Complete PM Overhaul Signoff</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
