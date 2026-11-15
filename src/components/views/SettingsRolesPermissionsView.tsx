import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';
import { User, UserRole } from '../../types';

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
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

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
      const data = await ApiService.getUsers();
      setUsers(data || []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load user directory', 'error');
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

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>Create Account</span>
        </button>
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
                        <div>{u.unitNumber ? `${u.tower || ''} • ${u.unitNumber}` : 'Staff / Operations'}</div>
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
    </div>
  );
};

