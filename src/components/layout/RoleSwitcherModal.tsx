import React from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { DEMO_USERS } from '../../data/initialData';

export const RoleSwitcherModal: React.FC = () => {
  const { isRoleSwitcherOpen, setIsRoleSwitcherOpen, role, switchRole } = useApp();

  if (!isRoleSwitcherOpen) return null;

  const roleMeta: Record<
    UserRole,
    {
      title: string;
      color: string;
      badge: string;
      description: string;
      screens: string[];
    }
  > = {
    RESIDENT: {
      title: 'Resident (Owner/Tenant)',
      color: 'border-blue-500 bg-blue-50/50',
      badge: 'bg-blue-600 text-white',
      description: 'Submit complaints, approve gate visitors, view society dues, sign off or dispute maintenance resolutions.',
      screens: ['Resident Dashboard', 'Raise Complaint', 'Gate Approvals', 'Resolution Sign-off / Dispute']
    },
    MANAGEMENT: {
      title: 'Management (Estate Lead)',
      color: 'border-purple-500 bg-purple-50/50',
      badge: 'bg-purple-600 text-white',
      description: 'Executive triage, SLA adherence, technician assignment, resolution review, community memory & reliability analysis.',
      screens: ['Executive Overview', 'Complaint Operations', 'Resolution Trust Timeline', 'Memory Graph', 'Reliability Radar']
    },
    MAINTENANCE: {
      title: 'Maintenance Staff (Senior MEP Tech)',
      color: 'border-amber-500 bg-amber-50/50',
      badge: 'bg-amber-600 text-white',
      description: 'Accept work orders, conduct physical inspections, upload evidence, submit resolution proposals, request spare parts.',
      screens: ['Assigned Work Orders', 'Work Order Execution', 'Inspection & Proposal', 'Preventive Calendar']
    },
    SECURITY: {
      title: 'Security Marshall (Gatehouse)',
      color: 'border-emerald-500 bg-emerald-50/50',
      badge: 'bg-emerald-600 text-white',
      description: 'Gate 1 & 2 console, ANPR barrier override, 6-digit OTP verification, QR pass scanner, parcel deliveries, SOS alerts.',
      screens: ['Gatehouse Console', 'QR Verification', 'Parcel Hub', 'Pass Revocation']
    },
    ADMIN: {
      title: 'System Administrator & Auditor',
      color: 'border-rose-500 bg-rose-50/50',
      badge: 'bg-rose-600 text-white',
      description: 'Full RBAC role matrix, system telemetry logs, society unit configurations, database seed management.',
      screens: ['Roles & Permissions', 'Resident Directory', 'Asset Register', 'Audit & Forensics']
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">switch_account</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-slate-900 text-lg">Switch User Perspective</h3>
              <p className="text-xs text-slate-500">
                Experience all 29 screens across all 5 operational roles in Green Valley Residency
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsRoleSwitcherOpen(false)}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
          {DEMO_USERS.map((user) => {
            const meta = roleMeta[user.role];
            const isSelected = role === user.role;

            return (
              <button
                key={user.id}
                onClick={() => {
                  switchRole(user.role);
                  setIsRoleSwitcherOpen(false);
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? `${meta.color} shadow-sm ring-2 ring-primary/20`
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <span className="font-bold text-slate-900 text-sm block leading-tight">
                          {user.name}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {user.unitNumber ? `Flat ${user.unitNumber}` : user.designation}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${meta.badge}`}>
                      {user.role}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-3">{meta.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex flex-wrap gap-1">
                  {meta.screens.slice(0, 3).map((screen, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium"
                    >
                      {screen}
                    </span>
                  ))}
                  {meta.screens.length > 3 && (
                    <span className="text-[10px] text-slate-400 font-medium">
                      +{meta.screens.length - 3} more
                    </span>
                  )}
                </div>

                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Active Session: JWT Authenticated • Instant Role Matrix Sync</span>
          <button
            onClick={() => setIsRoleSwitcherOpen(false)}
            className="px-4 py-2 bg-slate-800 text-white font-bold text-xs rounded-lg hover:bg-slate-900 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
