import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';

interface PermissionRow {
  permission: string;
  category: string;
  description: string;
  roles: Record<UserRole, boolean>;
}

export const SettingsRolesPermissionsView: React.FC = () => {
  const { role, switchRole, showToast } = useApp();

  const [permissions, setPermissions] = useState<PermissionRow[]>([
    {
      permission: 'Submit Service Complaint',
      category: 'Helpdesk',
      description: 'Log issues with photo evidence and view recurrence advisories',
      roles: { RESIDENT: true, MANAGEMENT: true, MAINTENANCE: true, SECURITY: true, ADMIN: true }
    },
    {
      permission: 'Triage & Assign Tickets',
      category: 'Management',
      description: 'Assign priority SLAs and dispatch lead technicians',
      roles: { RESIDENT: false, MANAGEMENT: true, MAINTENANCE: false, SECURITY: false, ADMIN: true }
    },
    {
      permission: 'Submit Resolution Proposal',
      category: 'Maintenance',
      description: 'Record inspection findings, before/after evidence & parts used',
      roles: { RESIDENT: false, MANAGEMENT: false, MAINTENANCE: true, SECURITY: false, ADMIN: true }
    },
    {
      permission: 'Resident Sign-Off & Dispute',
      category: 'Resident Governance',
      description: 'Exclusive right to confirm resolution or dispute ticket back to management',
      roles: { RESIDENT: true, MANAGEMENT: false, MAINTENANCE: false, SECURITY: false, ADMIN: true }
    },
    {
      permission: 'Boom Barrier Manual Override',
      category: 'Security',
      description: 'Operate gatehouse ANPR barrier and verify 6-digit OTP visitor PINs',
      roles: { RESIDENT: false, MANAGEMENT: true, MAINTENANCE: false, SECURITY: true, ADMIN: true }
    },
    {
      permission: 'Trigger Emergency SOS Siren',
      category: 'Safety',
      description: 'Activate society-wide siren and mass emergency SMS dispatch',
      roles: { RESIDENT: true, MANAGEMENT: true, MAINTENANCE: true, SECURITY: true, ADMIN: true }
    },
    {
      permission: 'Approve Spares & Capex PO',
      category: 'Procurement',
      description: 'Authorize parts deduction and approve equipment overhaul directives',
      roles: { RESIDENT: false, MANAGEMENT: true, MAINTENANCE: false, SECURITY: false, ADMIN: true }
    },
    {
      permission: 'Forensic Memory Graph & Radar',
      category: 'Intelligence',
      description: 'View root-cause lineage graphs and cross-tower MTBF telemetry',
      roles: { RESIDENT: false, MANAGEMENT: true, MAINTENANCE: true, SECURITY: false, ADMIN: true }
    }
  ]);

  const togglePermission = (index: number, r: UserRole) => {
    setPermissions((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              roles: {
                ...row.roles,
                [r]: !row.roles[r]
              }
            }
          : row
      )
    );
    showToast(`Permission matrix updated for role: ${r}`);
  };

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
            <span>Governance &amp; Security</span>
            <span className="text-slate-300">/</span>
            <span className="text-primary font-bold">RBAC Permission Matrix</span>
          </div>
          <h1 className="font-headline font-bold text-2xl lg:text-3xl text-slate-900 mt-0.5 tracking-tight">
            Role-Based Access Control (RBAC) Matrix
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enforcing strict multi-role separation of powers across Resident, Management, Maintenance, Security &amp; Admin
          </p>
        </div>

        {/* Current Active Role Switcher */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-bold px-2">Active:</span>
          {(['RESIDENT', 'MANAGEMENT', 'MAINTENANCE', 'SECURITY', 'ADMIN'] as UserRole[]).map((r) => (
            <button
              key={r}
              onClick={() => switchRole(r)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                role === r
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Separation of Powers Banner */}
      <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-950 flex items-start gap-3">
        <span className="material-symbols-outlined text-primary text-[22px] shrink-0 mt-0.5">
          verified_user
        </span>
        <div>
          <strong className="block text-primary font-bold mb-0.5">
            Strict Non-Repudiation Policy Enforced
          </strong>
          Under Section 4 of platform governance rules: Maintenance staff cannot unilaterally mark complaints as resolved without Resident digital sign-off. Similarly, only security marshalls can operate gate barrier overrides.
        </div>
      </div>

      {/* Permissions Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 w-72">Operational Capability</th>
                <th className="py-3 px-4 text-center">Resident</th>
                <th className="py-3 px-4 text-center">Management</th>
                <th className="py-3 px-4 text-center">Maintenance</th>
                <th className="py-3 px-4 text-center">Security</th>
                <th className="py-3 px-4 text-center">Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {permissions.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 text-xs block leading-tight">
                      {row.permission}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5 leading-relaxed">
                      {row.description}
                    </span>
                  </td>

                  {(['RESIDENT', 'MANAGEMENT', 'MAINTENANCE', 'SECURITY', 'ADMIN'] as UserRole[]).map(
                    (r) => {
                      const enabled = row.roles[r];
                      return (
                        <td key={r} className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => togglePermission(idx, r)}
                            className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all ${
                              enabled
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {enabled ? 'check' : 'close'}
                            </span>
                          </button>
                        </td>
                      );
                    }
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
