import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { INITIAL_USERS } from '../utils/mockData';
import { Role, User, Organization } from '../types';
import {
  FlaskConical,
  Building2,
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Layers,
  Server
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const {
    login,
    organizations,
    simulateFailedLogin,
    failedLoginAttempts,
    lockoutRemaining,
    resetLockout
  } = useApp();

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'company' | 'superadmin'>('company');
  const [selectedOrgId, setSelectedOrgId] = useState<string>(organizations[0]?.id || 'ORG-APEX');
  const [email, setEmail] = useState<string>('supervisor@apexpharma.com');
  const [password, setPassword] = useState<string>('Password@123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Handle Tab Switch
  const handleTabChange = (tab: 'company' | 'superadmin') => {
    setActiveTab(tab);
    setErrorMessage('');
    if (tab === 'superadmin') {
      setEmail('superadmin@camelcomm.in');
      setPassword('Password@123');
    } else {
      setEmail('supervisor@apexpharma.com');
      setPassword('Password@123');
    }
  };

  // Perform Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutRemaining > 0) {
      setErrorMessage(`System lockout active. Please wait ${Math.floor(lockoutRemaining / 60)}m ${lockoutRemaining % 60}s.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    setTimeout(() => {
      setIsSubmitting(false);

      if (activeTab === 'superadmin') {
        const superAdminUser = INITIAL_USERS.find(u => u.role === 'SuperAdmin');
        if (superAdminUser && (email.toLowerCase().includes('superadmin') || email.toLowerCase().includes('camel')) && password === 'Password@123') {
          login(superAdminUser);
          navigate('/superadmin');
          return;
        }
      } else {
        const matchedOrg = organizations.find(o => o.id === selectedOrgId);
        if (!matchedOrg) {
          setErrorMessage('Invalid Organization ID or client tenant record not found.');
          return;
        }

        if (matchedOrg.licenseStatus === 'EXPIRED' || matchedOrg.licenseStatus === 'SUSPENDED') {
          setErrorMessage(`Access Denied: ${matchedOrg.name} license is ${matchedOrg.licenseStatus}. Please contact Camel Communication.`);
          return;
        }

        const matchedUser = INITIAL_USERS.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
        if (matchedUser && password === 'Password@123') {
          login(matchedUser, matchedOrg);
          if (matchedUser.role === 'Operator') {
            navigate('/printing');
          } else {
            navigate('/dashboard');
          }
          return;
        }
      }

      // If credentials failed
      simulateFailedLogin();
      const left = 4 - failedLoginAttempts;
      if (left > 0) {
        setErrorMessage(`Invalid credentials. ${left} attempt${left === 1 ? '' : 's'} remaining before 15-minute 21 CFR Part 11 account lockout.`);
      } else {
        setErrorMessage('Account locked out for 15 minutes due to 5 consecutive failed attempts.');
      }
    }, 400);
  };

  // 1-Click Fast Demo Login Handler
  const handleQuickDemoLogin = (role: Role, orgId?: string) => {
    resetLockout();
    setErrorMessage('');
    if (role === 'SuperAdmin') {
      const superUser = INITIAL_USERS.find(u => u.role === 'SuperAdmin')!;
      login(superUser);
      navigate('/superadmin');
    } else {
      const targetUser = INITIAL_USERS.find(u => u.role === role)!;
      const targetOrg = organizations.find(o => o.id === (orgId || 'ORG-APEX')) || organizations[0];
      login(targetUser, targetOrg);
      if (role === 'Operator') {
        navigate('/printing');
      } else {
        navigate('/dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-brand-500 selection:text-white">
      {/* Top Header Bar */}
      <header className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/20 ring-1 ring-white/20">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">PharmLabel</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-brand-500/20 text-brand-400 border border-brand-500/30">
                PRO CLOUD
              </span>
            </div>
            <p className="text-[11px] text-slate-400">GxP & 21 CFR Part 11 Serialization Architecture</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium bg-emerald-950/40 border border-emerald-800/50 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Hostinger Cloud Master: Online (99.98% SLA)
          </div>
          <div className="text-slate-400 text-xs">
            Platform Provider: <strong className="text-slate-200">Camel Communication</strong>
          </div>
        </div>
      </header>

      {/* Main Login Card Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Title & Portal Switcher */}
          <div className="mb-6">
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Sign In to Workspace
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select your access portal and authenticate with your secure credentials.
            </p>

            {/* Portal Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2 mt-4 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => handleTabChange('company')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'company'
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 ring-1 ring-brand-400/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Client Pharma Plant
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('superadmin')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'superadmin'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Camel SuperAdmin
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* If Company Login, Show Organization Selection */}
            {activeTab === 'company' && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Client Organization ID & Plant
                </label>
                <div className="relative">
                  <select
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none appearance-none"
                  >
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.id}) — {org.plantLocation} [{org.licenseStatus}]
                      </option>
                    ))}
                  </select>
                  <Building2 className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {activeTab === 'superadmin' ? 'Master Admin Email / ID' : 'Work Email / Employee Login'}
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder={activeTab === 'superadmin' ? 'superadmin@camelcomm.in' : 'user@company.com'}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-600"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300">Password</label>
                <span className="text-[11px] text-slate-500 font-mono">Demo: Password@123</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-600"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Lockout Banner */}
            {lockoutRemaining > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  <span>Brute Force Lockout: {Math.floor(lockoutRemaining / 60)}m {lockoutRemaining % 60}s</span>
                </div>
                <button
                  type="button"
                  onClick={resetLockout}
                  className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[10px] font-bold uppercase transition"
                >
                  Override Lock
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || lockoutRemaining > 0}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
                activeTab === 'superadmin'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30'
                  : 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-brand-600/30'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSubmitting ? (
                <>Verifying GxP Signature...</>
              ) : (
                <>
                  Authenticate & Launch Session
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* 21 CFR Part 11 Regulatory Compliance Notice */}
          <div className="mt-5 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-slate-300 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
              <span>FDA 21 CFR Part 11 & GxP Compliance Notice</span>
            </div>
            Authorized access only. Every login, failed attempt, and packaging transaction is cryptographically signed, timestamped, and stored in immutable ALCOA+ audit trails. Accounts lock automatically after 5 failed attempts.
          </div>

          {/* Quick Demo Login Cards Matrix */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                1-Click Quick Demo Login (Fast Evaluation)
              </span>
              <span className="text-[10px] text-slate-500">Instant Access</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Card 1: Camel SuperAdmin */}
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('SuperAdmin')}
                className="text-left p-3 rounded-2xl bg-purple-950/30 hover:bg-purple-900/40 border border-purple-800/40 hover:border-purple-600/60 transition group flex items-start gap-2.5 shadow-sm"
              >
                <div className="w-7 h-7 rounded-lg bg-purple-600/30 text-purple-300 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs text-white group-hover:text-purple-300 truncate">
                      Kunal Singhania
                    </span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      SuperAdmin
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">Platform Owner (Camel Comm)</div>
                </div>
              </button>

              {/* Card 2: Plant Admin */}
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('Admin', 'ORG-APEX')}
                className="text-left p-3 rounded-2xl bg-blue-950/30 hover:bg-blue-900/40 border border-blue-800/40 hover:border-blue-600/60 transition group flex items-start gap-2.5 shadow-sm"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-300 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs text-white group-hover:text-blue-300 truncate">
                      Vikram Joshi
                    </span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Admin
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">Apex Healthcare · Plant IT Head</div>
                </div>
              </button>

              {/* Card 3: QA Supervisor */}
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('Supervisor', 'ORG-APEX')}
                className="text-left p-3 rounded-2xl bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-800/40 hover:border-emerald-600/60 transition group flex items-start gap-2.5 shadow-sm"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs text-white group-hover:text-emerald-300 truncate">
                      Dr. Anjali Nair
                    </span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Supervisor
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">QA Approver · 4-Eyes Compliance</div>
                </div>
              </button>

              {/* Card 4: Packaging Operator */}
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('Operator', 'ORG-APEX')}
                className="text-left p-3 rounded-2xl bg-amber-950/30 hover:bg-amber-900/40 border border-amber-800/40 hover:border-amber-600/60 transition group flex items-start gap-2.5 shadow-sm"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-600/30 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs text-white group-hover:text-amber-300 truncate">
                      Ramesh Kumar
                    </span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Operator
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">Line 02 · Thermal Label Printing</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-3 border-t border-slate-900 text-center text-xs text-slate-500">
        PharmaLabel Pro v1.0 · Designed for Harihar Impex / Camel Communication · 21 CFR Part 11 & GS1 SSCC Mod-10 Compliant
      </footer>
    </div>
  );
};
