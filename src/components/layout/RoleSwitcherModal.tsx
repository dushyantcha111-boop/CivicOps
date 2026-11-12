import React from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';

export const RoleSwitcherModal: React.FC = () => {
  const { isRoleSwitcherOpen, setIsRoleSwitcherOpen, role, authorizedRoles, currentUser, switchRole } = useApp();

  if (!isRoleSwitcherOpen) return null;

  const roleMeta: Record<
    UserRole,
    {
      title: string;
      color: string;
      badge: string;
      icon: string;
      description: string;
      screens: string[];
    }
  > = {
    RESIDENT: {
      title: 'Resident Portal',
      color: 'border-blue-500 bg-blue-50/50',
      badge: 'bg-blue-600 text-white',
      icon: 'home',
      description: 'Submit maintenance requests, generate digital visitor passes, approve gate arrivals, and review resolution sign-offs.',
      screens: ['Resident Dashboard', 'Raise Complaint', 'Gate Approvals', 'Resolution Sign-off / Dispute']
    },
    MANAGEMENT: {
      title: 'Management Operations',
      color: 'border-purple-500 bg-purple-50/50',
      badge: 'bg-purple-600 text-white',
      icon: 'admin_panel_settings',
      description: 'Executive triage, SLA adherence, technician assignment, resolution review, community memory & reliability analysis.',
      screens: ['Executive Overview', 'Complaint Operations', 'Resolution Trust Timeline', 'Memory Graph', 'Reliability Radar']
    },
    MAINTENANCE: {
      title: 'Maintenance Lead',
      color: 'border-amber-500 bg-amber-50/50',
      badge: 'bg-amber-600 text-white',
      icon: 'engineering',
      description: 'Accept work orders, conduct physical inspections, upload evidence, submit resolution proposals, request spare parts.',
      screens: ['Assigned Work Orders', 'Work Order Execution', 'Inspection & Proposal', 'Preventive Calendar']
    },
    SECURITY: {
      title: 'Gatehouse Security',
      color: 'border-emerald-500 bg-emerald-50/50',
      badge: 'bg-emerald-600 text-white',
      icon: 'security',
      description: 'Gate 1 & 2 console, ANPR barrier override, 6-digit OTP verification, QR pass scanner, parcel deliveries, SOS alerts.',
      screens: ['Gatehouse Console', 'QR Verification', 'Parcel Hub', 'Pass Revocation']
    },
    ADMIN: {
      title: 'System Administrator',
      color: 'border-rose-500 bg-rose-50/50',
      badge: 'bg-rose-600 text-white',
      icon: 'settings_suggest',
      description: 'Full RBAC role matrix, system telemetry logs, society unit configurations, database seed management.',
      screens: ['Roles & Permissions', 'Resident Directory', 'Asset Register', 'Audit & Forensics']
    }
  };

  const availableRoles: UserRole[] =
    authorizedRoles && authorizedRoles.length > 0
      ? authorizedRoles
      : currentUser?.authorizedRoles && currentUser.authorizedRoles.length > 0
      ? currentUser.authorizedRoles
      : [role];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">switch_account</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-slate-900 text-lg">Switch Authorized Operating Role</h3>
              <p className="text-xs text-slate-500">
                Operating perspective for <strong>{currentUser?.name || 'Current User'}</strong>
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

        <div className="p-6 space-y-3 max-h-[65vh] overflow-y-auto">
          {availableRoles.length === 1 ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <span className="material-symbols-outlined text-slate-400 text-[32px] mb-1">lock</span>
              <h4 className="text-sm font-bold text-slate-800">Single Role Assigned</h4>
              <p className="text-xs text-slate-500 mt-1">
                Your account is currently assigned solely to the <strong>{availableRoles[0]}</strong> role. Contact a System Administrator to request additional permissions.
              </p>
            </div>
          ) : (
            availableRoles.map((r) => {
              const meta = roleMeta[r];
              const isSelected = role === r;

              return (
                <button
                  key={r}
                  onClick={() => {
                    switchRole(r);
                    setIsRoleSwitcherOpen(false);
                  }}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? `${meta.color} shadow-sm ring-2 ring-primary/20`
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${meta.badge}`}>
                          <span className="material-symbols-outlined text-[20px]">{meta.icon}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 text-sm block leading-tight">
                            {meta.title}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Role Code: <strong className="text-slate-700">{r}</strong>
                          </span>
                        </div>
                      </div>
                      {isSelected ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          SWITCH
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mb-3">{meta.description}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex flex-wrap gap-1">
                    {meta.screens.map((screen, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium"
                      >
                        {screen}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Roles assigned strictly by PostgreSQL security policies</span>
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
