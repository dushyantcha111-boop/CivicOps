import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';

interface AuthorizedRoleSelectPageProps {
  onRoleSelected: (role: UserRole) => void;
}

export const AuthorizedRoleSelectPage: React.FC<AuthorizedRoleSelectPageProps> = ({ onRoleSelected }) => {
  const { currentUser, authorizedRoles, switchRole, logout } = useApp();
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    authorizedRoles.length > 0 ? authorizedRoles[0] : (currentUser?.role || 'RESIDENT')
  );
  const [loading, setLoading] = useState(false);

  const roleDetails: Record<
    UserRole,
    {
      title: string;
      badge: string;
      icon: string;
      color: string;
      description: string;
      dashboardScreens: string[];
    }
  > = {
    RESIDENT: {
      title: 'Resident Portal',
      badge: 'bg-blue-600 text-white',
      icon: 'home',
      color: 'border-blue-500 hover:border-blue-600 bg-blue-50/40',
      description: 'Submit maintenance requests, generate digital visitor passes, approve gate arrivals, and review resolution sign-offs.',
      dashboardScreens: ['Resident Home', 'Raise Complaint', 'Visitor Pre-Approval', 'Resolution Sign-off / Dispute']
    },
    MANAGEMENT: {
      title: 'Management Operations',
      badge: 'bg-purple-600 text-white',
      icon: 'admin_panel_settings',
      color: 'border-purple-500 hover:border-purple-600 bg-purple-50/40',
      description: 'Executive overview, complaint prioritization, work order dispatch, spare requisition review, Community Memory Graph & Reliability Radar.',
      dashboardScreens: ['Executive Overview', 'Complaint Operations', 'Resolution Trust Timeline', 'Memory Graph', 'Reliability Radar']
    },
    MAINTENANCE: {
      title: 'Maintenance Lead',
      badge: 'bg-amber-600 text-white',
      icon: 'engineering',
      color: 'border-amber-500 hover:border-amber-600 bg-amber-50/40',
      description: 'Execute assigned corrective & preventive work orders, record physical inspection telemetry, upload photographic evidence, and propose repairs.',
      dashboardScreens: ['Assigned Work Orders', 'Work Order Execution', 'Inspection Resolution Proposer', 'Preventive Calendar']
    },
    SECURITY: {
      title: 'Gatehouse Security',
      badge: 'bg-emerald-600 text-white',
      icon: 'security',
      color: 'border-emerald-500 hover:border-emerald-600 bg-emerald-50/40',
      description: 'Real-time Gate 1 & 2 console, ANPR barrier overrides, 6-digit OTP check-in, QR pass verification, and delivery parcel log.',
      dashboardScreens: ['Security Gate Console', 'QR Verification', 'Parcel Hub', 'Pass Revocation']
    },
    ADMIN: {
      title: 'System Administrator',
      badge: 'bg-rose-600 text-white',
      icon: 'settings_suggest',
      color: 'border-rose-500 hover:border-rose-600 bg-rose-50/40',
      description: 'Full RBAC role matrix management, unit resident allocation, society asset register, telemetry forensics, and audit records.',
      dashboardScreens: ['Settings & RBAC Roles', 'Residents & Units Directory', 'Asset Register', 'Audit History']
    }
  };

  const handleContinue = async () => {
    setLoading(true);
    try {
      await switchRole(selectedRole);
      onRoleSelected(selectedRole);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Ambient background lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-800 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-8 pb-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img
                src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150'}
                alt={currentUser?.name}
                className="w-12 h-12 rounded-xl object-cover ring-2 ring-primary/40"
              />
              <div>
                <span className="text-xs font-semibold text-slate-400 block">Authenticated User</span>
                <h1 className="text-xl font-headline font-extrabold text-white leading-tight">
                  {currentUser?.name || 'Authorized Member'}
                </h1>
                <span className="text-xs text-slate-400">{currentUser?.email}</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Sign Out</span>
            </button>
          </div>

          <div className="pt-2 border-t border-slate-700/60">
            <h2 className="text-sm font-bold text-slate-200">Select Authorized Operating Role</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Your account has access to multiple community roles. Choose your active dashboard perspective.
            </p>
          </div>
        </div>

        {/* Roles Grid */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
          {authorizedRoles.map((r) => {
            const meta = roleDetails[r];
            const isSelected = selectedRole === r;

            return (
              <div
                key={r}
                onClick={() => setSelectedRole(r)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? `${meta.color} shadow-sm ring-2 ring-primary/30`
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${meta.badge}`}>
                        <span className="material-symbols-outlined text-[22px]">{meta.icon}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 text-sm block">
                          {meta.title}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Role: <span className="font-bold text-slate-700">{r}</span>
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[12px]">
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-3">{meta.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex flex-wrap gap-1.5">
                  {meta.dashboardScreens.map((screen, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium"
                    >
                      {screen}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Current Selection: <strong className="text-slate-800">{selectedRole}</strong>
          </span>
          <button
            onClick={handleContinue}
            disabled={loading}
            className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-headline font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-70"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Loading Dashboard...</span>
              </>
            ) : (
              <>
                <span>Enter {selectedRole} Dashboard</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
