import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DEMO_USERS } from '../../data/initialData';
import { UserRole } from '../../types';

interface LoginPageProps {
  onSwitchToSignup: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToSignup }) => {
  const { setCurrentUser, setRole, showToast } = useApp();
  const [email, setEmail] = useState('suresh.patel@civicops.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await new Promise((r) => setTimeout(r, 600));
      const user = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
      
      if (!user && email !== 'admin@civicops.com') {
        throw new Error('Invalid email or password. Please check your credentials.');
      }

      const targetUser = user || DEMO_USERS[1];
      setCurrentUser(targetUser);
      setRole(targetUser.role);
      showToast(`Welcome back, ${targetUser.name}! (${targetUser.role})`, 'success');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      showToast(err.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = (role: UserRole) => {
    const user = DEMO_USERS.find((u) => u.role === role) || DEMO_USERS[0];
    setEmail(user.email);
    setCurrentUser(user);
    setRole(user.role);
    showToast(`Logged in as ${user.name} (${role})`, 'success');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-800 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-8 pb-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white text-center relative">
          <div className="w-14 h-14 bg-primary/20 border border-primary/40 rounded-2xl mx-auto flex items-center justify-center mb-4 text-white shadow-inner">
            <span className="material-symbols-outlined text-[32px]">apartment</span>
          </div>
          <h1 className="text-2xl font-headline font-extrabold tracking-tight">CivicOps</h1>
          <p className="text-xs text-slate-400 mt-1">Smart Apartment Community Operations Platform</p>
        </div>

        {/* Form Body */}
        <div className="p-8 pt-6">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-bold text-slate-900">Sign in to your account</h2>
            <p className="text-xs text-slate-500 mt-0.5">Secure JWT authentication with role-based access</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <span className="material-symbols-outlined text-[18px]">mail</span>
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@civicops.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    showToast('Password reset link sent to your registered email.', 'info');
                  }}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4"
                />
                <span className="text-slate-600 font-medium">Remember me for 30 days</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-headline font-bold text-sm rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Role Logins */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center mb-3">
              Or quick-login as any role
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {(['RESIDENT', 'MANAGEMENT', 'MAINTENANCE', 'SECURITY', 'ADMIN'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleQuickDemoLogin(r)}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-primary/10 hover:text-primary border border-slate-200 text-[10px] font-bold text-slate-700 transition-all text-center truncate"
                  title={`Login as ${r}`}
                >
                  {r === 'MANAGEMENT' ? 'MGMT' : r === 'MAINTENANCE' ? 'MAINT' : r}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="font-bold text-primary hover:underline"
            >
              Sign up as Resident
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
