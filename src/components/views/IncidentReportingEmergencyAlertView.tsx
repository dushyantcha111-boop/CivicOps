import React from 'react';
import { useApp } from '../../context/AppContext';

export const IncidentReportingEmergencyAlertView: React.FC = () => {
  const { incidents, setIsSosModalOpen, showToast } = useApp();

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
            <span>Life Safety &amp; Command</span>
            <span className="text-slate-300">/</span>
            <span className="text-red-600 font-bold">Emergency Operations Console</span>
          </div>
          <h1 className="font-headline font-bold text-2xl lg:text-3xl text-slate-900 mt-0.5 tracking-tight">
            Incident Reporting &amp; Emergency Alert
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time siren activation, mass SMS/IVR dispatch, and emergency responder coordinate logs
          </p>
        </div>

        <button
          onClick={() => setIsSosModalOpen(true)}
          className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 self-start sm:self-auto animate-pulse"
        >
          <span className="material-symbols-outlined text-[20px]">e911_emergency</span>
          <span>TRIGGER SOCIETY EMERGENCY SOS</span>
        </button>
      </div>

      {/* Active Incidents Banner */}
      <div className="space-y-4">
        {incidents.map((inc) => (
          <div
            key={inc.id}
            className="bg-red-50 border-2 border-red-300 rounded-2xl p-6 shadow-sm space-y-4 relative overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <span className="material-symbols-outlined text-[28px] animate-bounce">
                    warning
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-red-700 bg-red-200/60 px-2 py-0.5 rounded">
                      {inc.alertCode}
                    </span>
                    <span className="text-red-400">•</span>
                    <span className="text-xs font-bold text-red-800 uppercase">
                      {inc.severity}
                    </span>
                  </div>
                  <h2 className="font-headline font-bold text-xl text-red-950 mt-1">
                    {inc.title}
                  </h2>
                  <p className="text-xs text-red-800 mt-0.5">
                    Location: <strong>{inc.location} ({inc.tower})</strong> • Reported by {inc.reportedBy} at{' '}
                    {new Date(inc.reportedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold self-start sm:self-auto animate-pulse">
                {inc.status}
              </span>
            </div>

            {/* Action taken logs */}
            <div className="bg-white/90 rounded-xl p-4 border border-red-200 text-xs space-y-2">
              <span className="font-bold text-red-950 block">Automated Protocol Actions Taken:</span>
              <ul className="space-y-1 text-slate-700 list-disc list-inside">
                {inc.actionsTaken.map((action, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {action}
                  </li>
                ))}
              </ul>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>SMS Notifications Dispatched: {inc.smsSentCount} residents</span>
                <span>Guardhouse Siren: Active (Buzzer Zone 4)</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <button
                onClick={() => showToast('First responders and Schindler engineers dispatched', 'info')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Dispatch Engineering Squad
              </button>
              <button
                onClick={() => showToast('Incident marked Resolved & Siren reset')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
              >
                Resolve &amp; Clear Siren
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Emergency Responder Directory */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
        <h3 className="font-headline font-bold text-slate-900 text-base">
          Emergency Services Hotlines &amp; On-Site Responders
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { name: 'Fire Control Room (HAL Station)', number: '101 / +91 80 2294 2100', icon: 'local_fire_department', color: 'bg-red-100 text-red-700' },
            { name: 'Society Security Gate 1 Marshall', number: '+91 99112 33445 (Satpal)', icon: 'shield_person', color: 'bg-emerald-100 text-emerald-700' },
            { name: 'Schindler Lift Rapid AMC Desk', number: '+91 80 4455 6677 (24x7)', icon: 'elevator', color: 'bg-blue-100 text-primary' },
            { name: 'Police Helpline (Whitefield)', number: '112 / +91 80 2841 0100', icon: 'local_police', color: 'bg-slate-100 text-slate-700' },
            { name: 'Ambulance & Trauma Center', number: '108 / +91 80 6666 7777', icon: 'medical_services', color: 'bg-amber-100 text-amber-700' },
            { name: 'Senior MEP Lead (Ramesh Kumar)', number: '+91 98450 77889', icon: 'engineering', color: 'bg-purple-100 text-purple-700' }
          ].map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-900 text-xs block truncate">{item.name}</span>
                <span className="font-mono text-primary font-semibold text-[11px] block mt-0.5 truncate">{item.number}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
