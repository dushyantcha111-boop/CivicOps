import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getDefaultTabForRole } from '../../config/rbac';
import { ApiService } from '../../services/api';
import { UserRole } from '../../types';

interface SignupPageProps {
  onSwitchToLogin: () => void;
}

type PublicSignupRole = 'RESIDENT' | 'MANAGEMENT' | 'SECURITY' | 'MAINTENANCE';

const ROLE_CARDS: {
  role: PublicSignupRole;
  label: string;
  icon: string;
  subtitle: string;
}[] = [
  { role: 'RESIDENT', label: 'Resident', icon: 'home', subtitle: 'Flat unit & resident portal' },
  { role: 'MANAGEMENT', label: 'Management', icon: 'admin_panel_settings', subtitle: 'Society committee / estate' },
  { role: 'SECURITY', label: 'Security', icon: 'shield_person', subtitle: 'Gatehouse & patrol staff' },
  { role: 'MAINTENANCE', label: 'Maintenance', icon: 'engineering', subtitle: 'MEP & repair technician' }
];

export const SignupPage: React.FC<SignupPageProps> = ({ onSwitchToLogin }) => {
  const {
    setCurrentUser,
    setRole,
    setAuthorizedRoles,
    setIsAuthenticated,
    setIsRoleSelectionPending,
    setActiveTab,
    showToast
  } = useApp();

  const [mode, setMode] = useState<'REGISTER' | 'INVITE'>('REGISTER');
  const [selectedRole, setSelectedRole] = useState<PublicSignupRole>('RESIDENT');

  // Shared identity fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Resident fields
  const [tower, setTower] = useState('Tower A');
  const [unitNumber, setUnitNumber] = useState('');

  // Management fields
  const [societyName, setSocietyName] = useState('Green Valley Residency');
  const [societyAddress, setSocietyAddress] = useState('');
  const [designation, setDesignation] = useState('');
  const [verificationReference, setVerificationReference] = useState('');

  // Security & Maintenance fields
  const [staffBadgeId, setStaffBadgeId] = useState('');
  const [maintenanceSpecialization, setMaintenanceSpecialization] = useState('Plumbing & Hydraulics');
  const [optionalInviteCode, setOptionalInviteCode] = useState('');

  // Invitation Acceptance mode
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [invitePreview, setInvitePreview] = useState<{
    valid: boolean;
    targetRole: UserRole;
    societyName: string;
    designation?: string;
    emailLocked: boolean;
    invitedEmailHint?: string;
    expiresAt: string;
  } | null>(null);
  const [validatingInvite, setValidatingInvite] = useState(false);

  // Submission & pending confirmation states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingReceipt, setPendingReceipt] = useState<{
    approvalStatus: string;
    role: UserRole;
    message: string;
    email: string;
  } | null>(null);

  const handleValidateInvite = async () => {
    setError(null);
    if (!inviteCodeInput.trim()) {
      setError('Enter an invitation code first.');
      return;
    }
    setValidatingInvite(true);
    try {
      const info = await ApiService.validateInvitation(inviteCodeInput.trim());
      setInvitePreview(info);
      showToast(`Invitation verified for ${info.targetRole} onboarding.`, 'success');
    } catch (err: any) {
      setInvitePreview(null);
      setError(err.message || 'Invitation code is invalid or expired.');
    } finally {
      setValidatingInvite(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (!acceptTerms) {
      setError('You must accept the community terms and operational protocols.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'INVITE') {
        if (!inviteCodeInput.trim()) {
          setError('Invitation code is required.');
          setLoading(false);
          return;
        }
        const res = await ApiService.acceptInvitation({
          inviteCode: inviteCodeInput.trim(),
          name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          tower,
          staffBadgeId: staffBadgeId.trim() || undefined,
          maintenanceSpecialization: maintenanceSpecialization || undefined
        });

        setCurrentUser(res.user);
        sessionStorage.setItem('civicops_user', JSON.stringify(res.user));
        const roles = res.authorizedRoles || [res.user.role];
        setAuthorizedRoles(roles);
        setIsAuthenticated(true);
        if (res.requiresRoleSelection && roles.length > 1) {
          setIsRoleSelectionPending(true);
        } else {
          setIsRoleSelectionPending(false);
          const active = roles[0] || res.user.role;
          setRole(active);
          setActiveTab(getDefaultTabForRole(active));
        }
        showToast(res.message || 'Invitation redeemed and account activated!', 'success');
        return;
      }

      const res = await ApiService.register({
        name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        requestedRole: selectedRole,
        tower,
        unitNumber: selectedRole === 'RESIDENT' ? unitNumber.trim() : undefined,
        societyName: societyName.trim(),
        societyAddress: selectedRole === 'MANAGEMENT' ? societyAddress.trim() : undefined,
        designation: selectedRole === 'MANAGEMENT' ? designation.trim() : undefined,
        verificationReference: selectedRole === 'MANAGEMENT' ? verificationReference.trim() : undefined,
        staffBadgeId: selectedRole === 'SECURITY' ? staffBadgeId.trim() : undefined,
        maintenanceSpecialization: selectedRole === 'MAINTENANCE' ? maintenanceSpecialization : undefined,
        invitationCode:
          (selectedRole === 'MANAGEMENT' || selectedRole === 'SECURITY' || selectedRole === 'MAINTENANCE') &&
          optionalInviteCode.trim()
            ? optionalInviteCode.trim()
            : undefined
      });

      if (!res.pendingApproval && res.token) {
        setCurrentUser(res.user);
        sessionStorage.setItem('civicops_user', JSON.stringify(res.user));
        const activeRole = res.user.activeRole || res.user.role;
        setAuthorizedRoles(res.authorizedRoles || [activeRole]);
        setRole(activeRole);
        setIsAuthenticated(true);
        setIsRoleSelectionPending(false);
        setActiveTab(getDefaultTabForRole(activeRole));
        showToast(res.message || 'Account verified and activated!', 'success');
      } else {
        setPendingReceipt({
          approvalStatus: res.approvalStatus,
          role: selectedRole,
          email: email.trim(),
          message:
            res.message ||
            'Your registration request was submitted and is awaiting administrator/management approval.'
        });
        showToast('Registration submitted for approval.', 'info');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (pendingReceipt) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-800 overflow-hidden p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px]">hourglass_top</span>
          </div>
          <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold uppercase tracking-wider">
            {pendingReceipt.approvalStatus.replace(/_/g, ' ')}
          </span>
          <h2 className="text-xl font-headline font-extrabold text-slate-900">
            Registration Submitted for Review
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">{pendingReceipt.message}</p>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-1">
            <div>
              <span className="text-slate-500">Account Email:</span>{' '}
              <strong className="text-slate-900">{pendingReceipt.email}</strong>
            </div>
            <div>
              <span className="text-slate-500">Requested Role:</span>{' '}
              <strong className="text-primary">{pendingReceipt.role}</strong>
            </div>
          </div>
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="w-full py-2.5 bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md"
          >
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-800 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white text-center">
          <div className="w-12 h-12 bg-primary/20 border border-primary/40 rounded-xl mx-auto flex items-center justify-center mb-3 text-white">
            <span className="material-symbols-outlined text-[28px]">person_add</span>
          </div>
          <h1 className="text-xl font-headline font-extrabold tracking-tight">
            {mode === 'INVITE' ? 'Redeem Onboarding Invitation' : 'Community Account Registration'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Green Valley Residency • Server-Verified Multi-Role Onboarding
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('REGISTER');
                setError(null);
              }}
              className={`py-2 rounded-lg transition-all ${
                mode === 'REGISTER' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Role Registration
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('INVITE');
                setError(null);
              }}
              className={`py-2 rounded-lg transition-all ${
                mode === 'INVITE' ? 'bg-white text-primary shadow-2xs' : 'text-slate-600'
              }`}
            >
              Have an Invitation Code?
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 pt-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          {mode === 'REGISTER' ? (
            <>
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Your Role
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ROLE_CARDS.map((card) => {
                    const active = selectedRole === card.role;
                    return (
                      <button
                        key={card.role}
                        type="button"
                        onClick={() => {
                          setSelectedRole(card.role);
                          setError(null);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          active
                            ? 'bg-blue-50 border-primary ring-2 ring-primary/15'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-[20px] block mb-1 ${
                            active ? 'text-primary' : 'text-slate-500'
                          }`}
                        >
                          {card.icon}
                        </span>
                        <div className="text-xs font-bold text-slate-900">{card.label}</div>
                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{card.subtitle}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-xl flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-blue-600 shrink-0 mt-0.5">
                  verified_user
                </span>
                <span>
                  {selectedRole === 'RESIDENT' &&
                    'Resident accounts require Management verification of your flat number before sign-in unlocks.'}
                  {selectedRole === 'MANAGEMENT' &&
                    'Society Management onboarding requires Administrator approval unless you hold an issued Management invitation code.'}
                  {selectedRole === 'SECURITY' &&
                    'Security personnel require Management/Admin approval or a valid Security invitation code.'}
                  {selectedRole === 'MAINTENANCE' &&
                    'Maintenance technicians require Management/Admin approval or a valid Maintenance invitation code.'}
                </span>
              </div>
            </>
          ) : (
            <div className="mb-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Invitation Code (Staff, Management, or Admin)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. CIV-ADM-998877"
                  className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono uppercase text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleValidateInvite}
                  disabled={validatingInvite}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
                >
                  {validatingInvite ? 'Checking...' : 'Verify Code'}
                </button>
              </div>
              {invitePreview && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 space-y-0.5">
                  <div className="font-bold">
                    Valid Invitation • Role: {invitePreview.targetRole}
                  </div>
                  <div className="text-[11px]">
                    {invitePreview.societyName}
                    {invitePreview.designation ? ` • ${invitePreview.designation}` : ''}
                    {invitePreview.emailLocked && invitePreview.invitedEmailHint
                      ? ` • Locked to ${invitePreview.invitedEmailHint}`
                      : ''}
                  </div>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ananya Iyer"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            {/* Dynamic Role-Specific Fields */}
            {mode === 'REGISTER' && selectedRole === 'RESIDENT' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Apartment Tower
                  </label>
                  <select
                    value={tower}
                    onChange={(e) => setTower(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900"
                  >
                    <option value="Tower A">Tower A (Emerald)</option>
                    <option value="Tower B">Tower B (Sapphire)</option>
                    <option value="Tower C">Tower C (Ruby)</option>
                    <option value="Tower D">Tower D (Diamond)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Flat / Unit Number
                  </label>
                  <input
                    type="text"
                    required
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    placeholder="e.g. B-402"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 uppercase"
                  />
                </div>
              </div>
            )}

            {mode === 'REGISTER' && selectedRole === 'MANAGEMENT' && (
              <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Society / Estate Name
                    </label>
                    <input
                      type="text"
                      required
                      value={societyName}
                      onChange={(e) => setSocietyName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Committee Designation
                    </label>
                    <input
                      type="text"
                      required
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. Treasurer / Estate Manager"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Society Address
                    </label>
                    <input
                      type="text"
                      value={societyAddress}
                      onChange={(e) => setSocietyAddress(e.target.value)}
                      placeholder="Sector / City"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Verification Ref / Invite Code
                    </label>
                    <input
                      type="text"
                      value={optionalInviteCode || verificationReference}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.toUpperCase().startsWith('CIV-')) {
                          setOptionalInviteCode(val.toUpperCase());
                        } else {
                          setOptionalInviteCode('');
                          setVerificationReference(val);
                        }
                      }}
                      placeholder="RERA / Society Reg # or CIV-MGT-..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {mode === 'REGISTER' && selectedRole === 'SECURITY' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Guard Badge / Agency ID
                  </label>
                  <input
                    type="text"
                    required={!optionalInviteCode.trim()}
                    value={staffBadgeId}
                    onChange={(e) => setStaffBadgeId(e.target.value)}
                    placeholder="e.g. SEC-GV-104"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs uppercase text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Assigned Gate / Tower
                  </label>
                  <select
                    value={tower}
                    onChange={(e) => setTower(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                  >
                    <option value="Main Gate">Main Gate</option>
                    <option value="Tower A">Tower A</option>
                    <option value="Tower B">Tower B</option>
                    <option value="All Towers">All Towers</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Invite Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={optionalInviteCode}
                    onChange={(e) => setOptionalInviteCode(e.target.value.toUpperCase())}
                    placeholder="CIV-SEC-..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono uppercase text-slate-900"
                  />
                </div>
              </div>
            )}

            {mode === 'REGISTER' && selectedRole === 'MAINTENANCE' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Trade Specialization
                  </label>
                  <select
                    value={maintenanceSpecialization}
                    onChange={(e) => setMaintenanceSpecialization(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                  >
                    <option value="Plumbing & Hydraulics">Plumbing &amp; Hydraulics</option>
                    <option value="Electrical & DG Grid">Electrical &amp; DG Grid</option>
                    <option value="HVAC & Ventilation">HVAC &amp; Ventilation</option>
                    <option value="Elevator & Lift MEP">Elevator &amp; Lift MEP</option>
                    <option value="Civil & Structural">Civil &amp; Structural</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Assigned Zone
                  </label>
                  <select
                    value={tower}
                    onChange={(e) => setTower(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                  >
                    <option value="All Towers">All Towers</option>
                    <option value="Tower A">Tower A</option>
                    <option value="Tower B">Tower B</option>
                    <option value="Tower C">Tower C</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Invite Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={optionalInviteCode}
                    onChange={(e) => setOptionalInviteCode(e.target.value.toUpperCase())}
                    placeholder="CIV-MNT-..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono uppercase text-slate-900"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 mt-0.5"
                />
                <span className="text-xs text-slate-600 leading-normal">
                  I agree to Green Valley Residency community bylaws, security protocols, and role accountability policies.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white font-headline font-bold text-sm rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>
                    {mode === 'INVITE'
                      ? 'Activate Invited Account'
                      : `Submit ${selectedRole.charAt(0) + selectedRole.slice(1).toLowerCase()} Registration`}
                  </span>
                  <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            Already have an approved account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="font-bold text-primary hover:underline"
            >
              Sign in here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
