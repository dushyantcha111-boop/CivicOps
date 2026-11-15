import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';
import { InvitationRecord, User, UserRole } from '../../types';

const ALL_ROLES: UserRole[] = ['RESIDENT', 'MANAGEMENT', 'MAINTENANCE', 'SECURITY', 'ADMIN'];

const ENFORCED_POLICY_ROWS: {
  permission: string;
  description: string;
  roles: Record<UserRole, boolean>;
}[] = [
  {
    permission: 'Submit Service Complaint',
    description: 'Log issues and track 9-step resolution timeline',
    roles: { RESIDENT: true, MANAGEMENT: true, MAINTENANCE: false, SECURITY: false, ADMIN: true }
  },
  {
    permission: 'Triage & Assign Technicians',
    description: 'Review complaints and assign work orders to maintenance staff',
    roles: { RESIDENT: false, MANAGEMENT: true, MAINTENANCE: false, SECURITY: false, ADMIN: true }
  },
  {
    permission: 'Inspect & Propose Resolution',
    description: 'Log inspection evidence and submit resolution proposals',
    roles: { RESIDENT: false, MANAGEMENT: false, MAINTENANCE: true, SECURITY: false, ADMIN: true }
  },
  {
    permission: 'Approve / Reject Resolution Proposals',
    description: 'Management gate before resident sign-off',
    roles: { RESIDENT: false, MANAGEMENT: true, MAINTENANCE: false, SECURITY: false, ADMIN: true }
  },
  {
    permission: 'Resident Confirmation & Dispute',
    description: 'Exclusive resident digital sign-off or dispute escalation',
    roles: { RESIDENT: true, MANAGEMENT: false, MAINTENANCE: false, SECURITY: false, ADMIN: true }
  },
  {
    permission: 'Gate Verification & Visitor Check-Out',
    description: 'Verify visitor PINs/QR, check-in walk-ins, check-out, log parcels',
    roles: { RESIDENT: false, MANAGEMENT: true, MAINTENANCE: false, SECURITY: true, ADMIN: true }
  },
  {
    permission: 'User Accounts & Role Assignment',
    description: 'Provision accounts, update authorizedRoles, activate/deactivate users',
    roles: { RESIDENT: false, MANAGEMENT: false, MAINTENANCE: false, SECURITY: false, ADMIN: true }
  }
];

export const SettingsRolesPermissionsView: React.FC = () => {
  const { currentUser, showToast } = useApp();

  const [users, setUsers] = useState<User[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [reviewNotesMap, setReviewNotesMap] = useState<Record<string, string>>({});
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  // Invitation Modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<UserRole>('MANAGEMENT');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDesignation, setInviteDesignation] = useState('');
  const [inviteExpiryHours, setInviteExpiryHours] = useState(72);
  const [creatingInvite, setCreatingInvite] = useState(false);

  // Create User Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [designation, setDesignation] = useState('');
  const [tower, setTower] = useState('Tower A');
  const [unitNumber, setUnitNumber] = useState('');
  const [newRoles, setNewRoles] = useState<UserRole[]>(['RESIDENT']);
  const [isCreating, setIsCreating] = useState(false);

  // Edit Roles Modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRoles, setEditRoles] = useState<UserRole[]>([]);
  const [isSavingRoles, setIsSavingRoles] = useState(false);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const [usersData, pendingData, invitesData] = await Promise.all([
        ApiService.getUsers(),
        ApiService.getPendingRegistrations(),
        ApiService.getInvitations()
      ]);
      setUsers(usersData || []);
      setPendingRegistrations(pendingData || []);
      setInvitations(invitesData || []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load governance data', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const toggleRoleSelection = (list: UserRole[], setter: (r: UserRole[]) => void, r: UserRole) => {
    if (list.includes(r)) {
      if (list.length === 1) return; // Require at least one role
      setter(list.filter((item) => item !== r));
    } else {
      setter([...list, r]);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !password) {
      showToast('Name, email, phone, and password are required', 'error');
      return;
    }
    setIsCreating(true);
    try {
      await ApiService.createUser({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        authorizedRoles: newRoles,
        designation: designation.trim() || undefined,
        tower: tower || undefined,
        unitNumber: unitNumber.trim().toUpperCase() || undefined
      });
      await loadUsers();
      showToast(`Account provisioned for ${email.trim()}.`);
      setIsCreateOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setDesignation('');
      setUnitNumber('');
      setNewRoles(['RESIDENT']);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create user', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveUserRoles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || editRoles.length === 0) return;
    setIsSavingRoles(true);
    try {
      await ApiService.updateUserRoles(editingUser.id, editRoles);
      await loadUsers();
      showToast(`Updated authorized roles for ${editingUser.name}.`);
      setEditingUser(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update roles', 'error');
    } finally {
      setIsSavingRoles(false);
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    if (user.id === currentUser?.id) {
      showToast('You cannot deactivate your own active admin account.', 'error');
      return;
    }
    try {
      const nextActive = user.active === false;
      await ApiService.updateUserStatus(user.id, nextActive);
      await loadUsers();
      showToast(`${user.name} account ${nextActive ? 'activated' : 'deactivated'}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Status update failed', 'error');
    }
  };

  const handleReviewRegistration = async (user: User, approve: boolean) => {
    setReviewingId(user.id);
    try {
      await ApiService.reviewRegistration(user.id, {
        approve,
        tower: user.requestedTower,
        unitNumber: user.requestedUnitNumber,
        notes: reviewNotesMap[user.id] || undefined
      });
      await loadUsers();
      showToast(
        approve
          ? `Approved ${user.requestedRole || user.role} registration for ${user.name}.`
          : `Declined registration for ${user.name}.`,
        approve ? 'success' : 'info'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Registration review failed', 'error');
    } finally {
      setReviewingId(null);
    }
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingInvite(true);
    try {
      const created = await ApiService.createInvitation({
        targetRole: inviteRole,
        invitedEmail: inviteEmail.trim() || undefined,
        designation: inviteDesignation.trim() || undefined,
        expiresInHours: Number(inviteExpiryHours) || 72
      });
      await loadUsers();
      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteDesignation('');
      showToast(`Invitation ${created.inviteCode} issued for ${created.targetRole}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create invitation', 'error');
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleRevokeInvitation = async (inv: InvitationRecord) => {
    try {
      await ApiService.revokeInvitation(inv.id);
      await loadUsers();
      showToast(`Revoked invitation ${inv.inviteCode}.`, 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to revoke invitation', 'error');
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      showToast(`Copied invitation code ${code} to clipboard.`);
    } catch {
      showToast(`Invitation code: ${code}`, 'info');
    }
  };

  const handleQuickVerifyUnit = async (user: User, approve: boolean) => {
    try {
      await ApiService.verifyUnitClaim(user.id, {
        approve,
        tower: user.requestedTower,
        unitNumber: user.requestedUnitNumber
      });
      await loadUsers();
      showToast(
        approve
          ? `Verified unit ${user.requestedUnitNumber || ''} for ${user.name}.`
          : `Declined unit claim for ${user.name}.`,
        approve ? 'success' : 'info'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unit verification failed', 'error');
    }
  };

  const filteredUsers = users.filter((u) => {
    const roles = u.authorizedRoles || [u.role];
    if (roleFilter !== 'ALL' && !roles.includes(roleFilter as UserRole)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.unitNumber || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
            <span>Governance &amp; Identity</span>
            <span className="text-slate-300">/</span>
            <span className="text-primary font-bold">Admin User &amp; RBAC Console</span>
          </div>
          <h1 className="font-headline font-bold text-2xl lg:text-3xl text-slate-900 mt-0.5 tracking-tight">
            User Accounts &amp; Role-Based Access Control
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Provision verified community accounts, assign authorized roles, and review server-enforced RBAC rules
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs"
          >
            <span className="material-symbols-outlined text-[18px]">mail_lock</span>
            <span>Issue Invitation</span>
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Create Account</span>
          </button>
        </div>
      </div>

      {/* Pending Multi-Role Registration Approvals */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-amber-50/70 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-headline font-bold text-slate-900 text-sm flex items-center gap-2">
              <span>Pending Registration Approvals</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                {pendingRegistrations.length} Waiting
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Management, Resident, Security, and Maintenance signups remain locked until reviewed and approved.
            </p>
          </div>
          <button onClick={loadUsers} className="text-xs font-bold text-primary hover:underline">
            Refresh
          </button>
        </div>
        {pendingRegistrations.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No pending registration requests in the approval queue.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingRegistrations.map((req) => (
              <div key={req.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{req.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-primary text-[10px] font-bold">
                      {req.requestedRole || req.role}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                      {(req.approvalStatus || 'PENDING_APPROVAL').replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {req.email} • {req.phone}
                    {req.societyName ? ` • ${req.societyName}` : ''}
                  </div>
                  <div className="text-xs text-slate-700 flex flex-wrap gap-3">
                    {req.requestedUnitNumber && (
                      <span>
                        <strong>Unit Claim:</strong> {req.requestedTower} — {req.requestedUnitNumber}
                      </span>
                    )}
                    {req.designation && (
                      <span>
                        <strong>Designation:</strong> {req.designation}
                      </span>
                    )}
                    {req.staffBadgeId && (
                      <span>
                        <strong>Badge ID:</strong> {req.staffBadgeId}
                      </span>
                    )}
                    {req.maintenanceSpecialization && (
                      <span>
                        <strong>Trade:</strong> {req.maintenanceSpecialization}
                      </span>
                    )}
                    {req.verificationReference && (
                      <span>
                        <strong>Ref:</strong> {req.verificationReference}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={reviewNotesMap[req.id] || ''}
                    onChange={(e) =>
                      setReviewNotesMap((prev) => ({ ...prev, [req.id]: e.target.value }))
                    }
                    placeholder="Decision notes (optional)"
                    className="h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-slate-50 w-44"
                  />
                  <button
                    type="button"
                    disabled={reviewingId === req.id}
                    onClick={() => handleReviewRegistration(req, true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold"
                  >
                    {reviewingId === req.id ? '...' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    disabled={reviewingId === req.id}
                    onClick={() => handleReviewRegistration(req, false)}
                    className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-lg text-xs font-bold"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Onboarding Invitations Registry */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-headline font-bold text-slate-900 text-sm">
              Admin, Management &amp; Staff Invitations ({invitations.length})
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Single-use cryptographic invite codes are the exclusive path to provision new Administrators.
            </p>
          </div>
        </div>
        {invitations.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No onboarding invitations issued yet. Click &ldquo;Issue Invitation&rdquo; to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Invite Code</th>
                  <th className="py-2.5 px-4">Target Role</th>
                  <th className="py-2.5 px-4">Locked Email / Designation</th>
                  <th className="py-2.5 px-4">Expires</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-bold text-primary">{inv.inviteCode}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">{inv.targetRole}</td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {inv.invitedEmail || 'Any email matching role'}
                      {inv.designation ? ` • ${inv.designation}` : ''}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">
                      {new Date(inv.expiresAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'USED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopyCode(inv.inviteCode)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-xs text-slate-700"
                      >
                        Copy
                      </button>
                      {inv.status === 'ACTIVE' && (
                        <button
                          type="button"
                          onClick={() => handleRevokeInvitation(inv)}
                          className="px-2.5 py-1 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-bold text-xs"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Directory Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-headline font-bold text-slate-900 text-sm">
            Registered Accounts ({filteredUsers.length})
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700"
            >
              <option value="ALL">All Roles</option>
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, flat..."
              className="h-8 px-3 text-xs rounded-lg border border-slate-200 bg-white outline-none w-52"
            />
          </div>
        </div>

        {loadingUsers ? (
          <div className="p-10 text-center text-xs text-slate-500">Loading user directory...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">No user accounts match filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Unit / Designation</th>
                  <th className="py-3 px-4">Authorized Roles</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const isActive = u.active !== false;
                  const roles = u.authorizedRoles || [u.role];
                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-500">{u.email} • {u.phone}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div>
                          {u.unitNumber
                            ? `${u.tower || ''} • ${u.unitNumber}`
                            : u.requestedUnitNumber
                            ? `Claimed: ${u.requestedTower || ''} • ${u.requestedUnitNumber}`
                            : 'Staff / Operations'}
                        </div>
                        {u.unitVerificationStatus && u.unitVerificationStatus !== 'VERIFIED' && (
                          <span
                            className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              u.unitVerificationStatus === 'PENDING_VERIFICATION'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {u.unitVerificationStatus.replace('_', ' ')}
                          </span>
                        )}
                        {u.designation && <div className="text-[11px] text-slate-400">{u.designation}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {roles.map((r) => (
                            <span
                              key={r}
                              className="px-2 py-0.5 rounded-full bg-blue-50 text-primary font-bold text-[10px]"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {isActive ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        {u.unitVerificationStatus === 'PENDING_VERIFICATION' && u.requestedUnitNumber && (
                          <button
                            onClick={() => handleQuickVerifyUnit(u, true)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs"
                          >
                            Verify Unit
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setEditRoles(roles);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs"
                        >
                          Edit Roles
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                            isActive
                              ? 'border border-red-200 text-red-600 hover:bg-red-50'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {isActive ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Separation of Powers Reference */}
      <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-950 flex items-start gap-3">
        <span className="material-symbols-outlined text-primary text-[22px] shrink-0 mt-0.5">
          verified_user
        </span>
        <div>
          <strong className="block text-primary font-bold mb-0.5">
            Backend-Enforced RBAC Separation of Powers
          </strong>
          Role permissions below are enforced in Spring Security controllers via <code>@PreAuthorize</code> and signed JWT claims. Maintenance cannot self-approve resolutions; only residents can digitally confirm or dispute completed work.
        </div>
      </div>

      {/* Enforced Policy Matrix */}
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
              {ENFORCED_POLICY_ROWS.map((row) => (
                <tr key={row.permission} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 text-xs block">{row.permission}</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">{row.description}</span>
                  </td>
                  {ALL_ROLES.map((r) => {
                    const enabled = row.roles[r];
                    return (
                      <td key={r} className="py-3 px-4 text-center">
                        <span
                          className={`w-7 h-7 rounded-lg inline-flex items-center justify-center ${
                            enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-300'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {enabled ? 'check' : 'close'}
                          </span>
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateUser}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-3.5 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="font-headline font-bold text-base text-slate-900">Provision User Account</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Temporary Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tower</label>
                <select
                  value={tower}
                  onChange={(e) => setTower(e.target.value)}
                  className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Tower A">Tower A</option>
                  <option value="Tower B">Tower B</option>
                  <option value="Tower C">Tower C</option>
                  <option value="Tower D">Tower D</option>
                  <option value="All Towers">All Towers</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Flat #</label>
                <input
                  type="text"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  placeholder="Optional"
                  className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300 uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="Optional"
                  className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Authorized Roles</label>
              <div className="flex flex-wrap gap-2">
                {ALL_ROLES.map((r) => (
                  <label
                    key={r}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer ${
                      newRoles.includes(r)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={newRoles.includes(r)}
                      onChange={() => toggleRoleSelection(newRoles, setNewRoles, r)}
                    />
                    {r}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="px-5 py-2 bg-primary hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold"
              >
                {isCreating ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Roles Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveUserRoles}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <h3 className="font-headline font-bold text-base text-slate-900">
              Edit Authorized Roles — {editingUser.name}
            </h3>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map((r) => (
                <label
                  key={r}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${
                    editRoles.includes(r)
                      ? 'bg-primary text-white border-primary'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={editRoles.includes(r)}
                    onChange={() => toggleRoleSelection(editRoles, setEditRoles, r)}
                  />
                  {r}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingRoles}
                className="px-5 py-2 bg-primary hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold"
              >
                {isSavingRoles ? 'Saving...' : 'Save Roles'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Issue Invitation Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateInvitation}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-3.5"
          >
            <h3 className="font-headline font-bold text-base text-slate-900">
              Issue Onboarding Invitation
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
                className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300 bg-white font-semibold"
              >
                <option value="ADMIN">ADMIN (Platform Administrator)</option>
                <option value="MANAGEMENT">MANAGEMENT (Society Management)</option>
                <option value="SECURITY">SECURITY (Gatehouse Staff)</option>
                <option value="MAINTENANCE">MAINTENANCE (MEP Technician)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lock to Email (Recommended for Admin)
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="optional@civicops.in"
                className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={inviteDesignation}
                  onChange={(e) => setInviteDesignation(e.target.value)}
                  placeholder="e.g. Estate Treasurer"
                  className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expiry (Hours)</label>
                <input
                  type="number"
                  min={1}
                  max={720}
                  value={inviteExpiryHours}
                  onChange={(e) => setInviteExpiryHours(Number(e.target.value))}
                  className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingInvite}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold"
              >
                {creatingInvite ? 'Issuing...' : 'Generate Invite Code'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

