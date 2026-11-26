import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { INITIAL_USERS } from '../utils/mockData';
import { Role, User } from '../types';
import {
  FlaskConical,
  Building2,
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Layers,
  ChevronDown,
  X,
  Check,
  Shield
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const {
    login,
    organizations,
    getLockoutRemainingForEmail,
    getFailedAttemptsForEmail,
    recordFailedLoginForEmail,
    triggerLockoutForEmail,
    clearLockoutForEmail,
    resetAllLockouts
  } = useApp();

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'company' | 'superadmin'>('company');
  const [selectedOrgId, setSelectedOrgId] = useState<string>(organizations[0]?.id || 'ORG-APEX');
  const [email, setEmail] = useState<string>('supervisor@apexpharma.com');
  const [password, setPassword] = useState<string>('Password@123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [agreeTerms, setAgreeTerms] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeLockout, setActiveLockout] = useState<number>(0);

  // Helper to get default email for an org
  const getDefaultEmailForOrg = (orgId: string): string => {
    if (orgId === 'ORG-SUNPHARMA') return 'admin@sunpharma.com';
    if (orgId === 'ORG-CIPLA') return 'admin@cipla.com';
    return 'supervisor@apexpharma.com';
  };

  // Sync lockout & attempts status on email, tab, or company change
  useEffect(() => {
    if (!email) {
      setActiveLockout(0);
      setErrorMessage('');
      return;
    }

    const emailKey = email.trim().toLowerCase();

    // 1. Instant check from local per-email lockout map
    const localRemaining = getLockoutRemainingForEmail(emailKey);
    if (localRemaining > 0) {
      setActiveLockout(localRemaining);
      setErrorMessage(`Account (${email}) is locked due to 5 consecutive failed login attempts (${localRemaining}s remaining).`);
      return;
    } else {
      setActiveLockout(0);
      setErrorMessage('');
    }

    // 2. Check against backend database for this specific email
    if (emailKey.includes('@')) {
      fetch(`/api/auth/login.php?email=${encodeURIComponent(emailKey)}`)
        .then(res => res.json())
        .then(json => {
          if (json?.data?.locked) {
            const sec = json.data.remaining_seconds || 900;
            triggerLockoutForEmail(emailKey, sec);
            setActiveLockout(sec);
            setErrorMessage(`Account (${email}) is locked in database (21 CFR Part 11). Please wait (${sec}s remaining).`);
          } else {
            setActiveLockout(0);
          }
        })
        .catch(() => {});
    }
  }, [email, activeTab, selectedOrgId]);

  // Countdown timer for activeLockout
  useEffect(() => {
    if (activeLockout <= 0) return;
    const interval = setInterval(() => {
      setActiveLockout(prev => {
        const next = Math.max(0, prev - 1);
        if (next === 0) {
          clearLockoutForEmail(email);
          setErrorMessage('');
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeLockout, email]);

  const handleEmailBlur = () => {
    if (email && email.includes('@')) {
      const emailKey = email.trim().toLowerCase();
      fetch(`/api/auth/login.php?email=${encodeURIComponent(emailKey)}`)
        .then(res => res.json())
        .then(json => {
          if (json?.data?.locked) {
            const sec = json.data.remaining_seconds || 900;
            triggerLockoutForEmail(emailKey, sec);
            setActiveLockout(sec);
            setErrorMessage(`Account (${email}) is locked in database (21 CFR Part 11). Please wait (${sec}s remaining).`);
          }
        })
        .catch(() => {});
    }
  };

  // Handle Organization Change
  const handleOrgChange = (orgId: string) => {
    setSelectedOrgId(orgId);
    setErrorMessage('');
    const newEmail = getDefaultEmailForOrg(orgId);
    setEmail(newEmail);
    setPassword('Password@123');
    setActiveLockout(getLockoutRemainingForEmail(newEmail));
  };

  // Handle Tab Switch
  const handleTabChange = (tab: 'company' | 'superadmin') => {
    setActiveTab(tab);
    setErrorMessage('');
    if (tab === 'superadmin') {
      const superEmail = 'superadmin@camelcomm.in';
      setEmail(superEmail);
      setPassword('Password@123');
      setActiveLockout(getLockoutRemainingForEmail(superEmail));
    } else {
      const companyEmail = getDefaultEmailForOrg(selectedOrgId);
      setEmail(companyEmail);
      setPassword('Password@123');
      setActiveLockout(getLockoutRemainingForEmail(companyEmail));
    }
  };

  // Perform Real Backend Authenticated Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeLockout > 0) {
      setErrorMessage(`System lockout active for ${email}. Please wait ${Math.floor(activeLockout / 60)}m ${activeLockout % 60}s.`);
      return;
    }

    if (!agreeTerms) {
      setErrorMessage('You must acknowledge the 21 CFR Part 11 Electronic Signature terms.');
      return;
    }

    // License Check for Client Plants (Blocked licenses do not start attempt session)
    if (activeTab === 'company') {
      const matchedOrg = organizations.find(o => o.id === selectedOrgId);
      if (matchedOrg) {
        const isDateExpired = matchedOrg.validUntil && matchedOrg.validUntil < new Date().toISOString().split('T')[0];
        if (matchedOrg.licenseStatus === 'EXPIRED' || matchedOrg.licenseStatus === 'SUSPENDED' || isDateExpired) {
          const reason = matchedOrg.licenseStatus === 'SUSPENDED' ? 'SUSPENDED' : 'EXPIRED';
          setErrorMessage(`Access Denied: ${matchedOrg.name} license is ${reason}. Please contact Camel Communication for renewal.`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/login.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          organization_id: activeTab === 'company' ? selectedOrgId : undefined
        })
      });

      const res = await response.json();

      if (response.ok && res.success) {
        // Clear lockout for this specific email
        clearLockoutForEmail(email);
        setActiveLockout(0);

        if (res.data?.token) {
          localStorage.setItem('pharmalabel_token', res.data.token);
        }

        const dbUser = res.data.user;
        const matchedMock = INITIAL_USERS.find(u => u.email.toLowerCase() === dbUser.email.toLowerCase()) || INITIAL_USERS.find(u => u.role === dbUser.role);

        const loggedInUser: User = {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          department: dbUser.department,
          permissions: matchedMock ? matchedMock.permissions : ['print_labels', 'view_audit'],
          status: 'ACTIVE',
          lastLogin: res.timestamp
        };

        const targetOrg = organizations.find(o => o.id === (res.data.organization?.id || selectedOrgId)) || organizations[0];

        login(loggedInUser, activeTab === 'superadmin' ? undefined : targetOrg);

        if (loggedInUser.role === 'SuperAdmin') {
          navigate('/superadmin');
        } else if (loggedInUser.role === 'Operator') {
          navigate('/printing');
        } else {
          navigate('/dashboard');
        }
      } else {
        // Handle failed login
        if (res.errors?.license_blocked || res.message?.includes('EXPIRED') || res.message?.includes('SUSPENDED')) {
          // Company license block -> do NOT count as password attempt!
          setErrorMessage(res.message);
        } else if (response.status === 403 && (res.errors?.locked || res.message?.includes('locked') || res.message?.includes('consecutive'))) {
          // Lockout triggered in database for this email!
          const remainingSec = res.errors?.remaining_seconds || 900;
          triggerLockoutForEmail(email, remainingSec);
          setActiveLockout(remainingSec);
          setErrorMessage(res.message);
        } else {
          // Increment attempt for THIS specific email
          const nextAttempts = recordFailedLoginForEmail(email);
          if (nextAttempts >= 5) {
            setActiveLockout(900);
            setErrorMessage('Account locked out for 15 minutes due to 5 consecutive failed attempts.');
          } else {
            const left = 5 - nextAttempts;
            setErrorMessage(`Invalid credentials. ${left} attempt${left === 1 ? '' : 's'} remaining before 15-minute 21 CFR Part 11 account lockout.`);
          }
        }
      }
    } catch (err: any) {
      setErrorMessage('Unable to communicate with authentication server. Please check backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1-Click Fast Demo Login Handler
  const handleQuickDemoLogin = async (role: Role, orgId?: string) => {
    setErrorMessage('');
    const targetEmail = role === 'SuperAdmin' ? 'superadmin@camelcomm.in' : 
      role === 'Admin' ? (orgId === 'ORG-SUNPHARMA' ? 'admin@sunpharma.com' : orgId === 'ORG-CIPLA' ? 'admin@cipla.com' : 'admin@apexpharma.com') :
      role === 'Supervisor' ? (orgId === 'ORG-SUNPHARMA' ? 'qa.halol@sunpharma.com' : orgId === 'ORG-CIPLA' ? 'it.regulatory@cipla.com' : 'supervisor@apexpharma.com') : 'operator@apexpharma.com';

    clearLockoutForEmail(targetEmail);
    setActiveLockout(0);

    try {
      await fetch('/api/auth/login.php?action=unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail })
      });
    } catch (e) {}

    if (role === 'SuperAdmin') {
      const superUser = INITIAL_USERS.find(u => u.role === 'SuperAdmin')!;
      login(superUser);
      navigate('/superadmin');
    } else {
      const targetUser = INITIAL_USERS.find(u => u.email.toLowerCase() === targetEmail.toLowerCase()) || INITIAL_USERS.find(u => u.role === role)!;
      const targetOrg = organizations.find(o => o.id === (orgId || 'ORG-APEX')) || organizations[0];
      login(targetUser, targetOrg);
      if (role === 'Operator') {
        navigate('/printing');
      } else {
        navigate('/dashboard');
      }
    }
  };

  // Manual Lockout Override for Testing
  const handleOverrideUnlock = async () => {
    try {
      await fetch('/api/auth/login.php?action=unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
    } catch (e) {}
    clearLockoutForEmail(email);
    setActiveLockout(0);
    setErrorMessage('');
  };

  const selectedOrg = organizations.find(o => o.id === selectedOrgId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eaf2fc] via-[#f3f7fd] to-[#e4edf9] flex flex-col justify-between items-center py-6 sm:py-10 px-4 font-sans selection:bg-[#0088ff] selection:text-white">
      {/* Top Brand Subtitle */}
      <div className="flex items-center gap-2 mb-4 sm:mb-6">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0055ff] to-[#00d4ff] flex items-center justify-center shadow-md shadow-blue-500/20 text-white">
          <FlaskConical className="w-4 h-4" />
        </div>
        <div className="text-left">
          <div className="text-sm font-extrabold text-[#0d3b75] tracking-tight flex items-center gap-1.5">
            <span>PharmLabel</span>
            <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-[#0088ff]/10 text-[#0077ff] border border-[#0088ff]/20">
              PRO
            </span>
          </div>
          <div className="text-[10px] text-[#6b88b0] font-medium">GxP & 21 CFR Part 11 Serialization Architecture</div>
        </div>
      </div>

      {/* Main White Card Container (Matching Reference Image) */}
      <div className="w-full max-w-[440px] bg-white rounded-[32px] shadow-[0_20px_60px_-15px_rgba(15,50,110,0.12)] border border-[#d8e6f5] overflow-hidden transition-all">
        {/* Top Segmented Tabs Bar (Matching Screenshot Tabs) */}
        <div className="bg-[#e9f1fc] p-1.5 flex items-center justify-between text-xs font-semibold border-b border-[#d8e6f5]">
          <button
            type="button"
            onClick={() => handleTabChange('company')}
            className={`flex-1 py-2 px-3 rounded-2xl text-center text-xs transition-all ${activeTab === 'company'
              ? 'bg-white text-[#0d3b75] font-bold shadow-xs'
              : 'text-[#6280a8] hover:text-[#0d3b75]'
              }`}
          >
            Plant Sign In
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('superadmin')}
            className={`flex-1 py-2 px-3 rounded-2xl text-center text-xs transition-all ${activeTab === 'superadmin'
              ? 'bg-white text-[#0d3b75] font-bold shadow-xs'
              : 'text-[#6280a8] hover:text-[#0d3b75]'
              }`}
          >
            SuperAdmin
          </button>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-8">
          {/* Top Logo & Title */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#0088ff]/10 border border-[#0088ff]/25 flex items-center justify-center text-[#0077ff]">
                <Shield className="w-4 h-4" />
              </div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#0d3b75]">
                {activeTab === 'superadmin' ? 'Camel Portal' : 'Pharma Workspace'}
              </div>
            </div>
            <span className="text-[10px] font-bold font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              SLA 99.98%
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0d3b75] tracking-tight text-center mb-6">
            {activeTab === 'superadmin' ? 'SuperAdmin Sign In' : 'Sign In'}
          </h1>

          {/* Main Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Field 1: Organization Dropdown (Only for Company Login) */}
            {activeTab === 'company' && (
              <div>
                <label className="text-xs font-bold text-[#0d3b75] ml-3 mb-1.5 block">
                  Organization / Plant
                </label>
                <div className="relative flex items-center bg-[#f7faff] border border-[#d2e2f3] rounded-full overflow-hidden focus-within:border-[#0088ff] focus-within:ring-2 focus-within:ring-[#0088ff]/20">
                  <div className="w-11 h-11 flex items-center justify-center border-r border-[#dbe7f5] text-[#0080ff] shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <select
                    value={selectedOrgId}
                    onChange={(e) => handleOrgChange(e.target.value)}
                    className="flex-1 bg-transparent px-3.5 py-2.5 text-xs text-[#0d3b75] font-semibold appearance-none focus:outline-none cursor-pointer"
                  >
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.id})
                      </option>
                    ))}
                  </select>

                  <div className="w-10 h-11 flex items-center justify-center border-l border-[#dbe7f5] text-[#0080ff] shrink-0">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-[10px] text-[#6b88b0] ml-3 mt-1.5 flex items-center justify-between">
                  <span>{selectedOrg?.plantLocation}</span>
                  <span className={`font-bold font-mono px-2 py-0.5 rounded-full text-[9px] ${
                    selectedOrg?.licenseStatus === 'ACTIVE' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : selectedOrg?.licenseStatus === 'WARNING'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200 font-extrabold'
                  }`}>
                    License: {selectedOrg?.licenseStatus}
                  </span>
                </div>

                {selectedOrg && (selectedOrg.licenseStatus === 'EXPIRED' || selectedOrg.licenseStatus === 'SUSPENDED') && (
                  <div className="mt-2.5 p-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>This plant's license is <strong>{selectedOrg.licenseStatus}</strong>. Login is blocked until renewed via SuperAdmin.</span>
                  </div>
                )}
              </div>
            )}

            {/* Field 2: Login / Email (Direct pill style like screenshot) */}
            <div>
              <label className="text-xs font-bold text-[#0d3b75] ml-3 mb-1.5 block">
                {activeTab === 'superadmin' ? 'SuperAdmin Master Email' : 'Login Email'}
              </label>
              <div className="relative flex items-center bg-[#f7faff] border border-[#d2e2f3] rounded-full overflow-hidden focus-within:border-[#0088ff] focus-within:ring-2 focus-within:ring-[#0088ff]/20">
                <div className="w-11 h-11 flex items-center justify-center border-r border-[#dbe7f5] text-[#0080ff] shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={handleEmailBlur}
                  placeholder={activeTab === 'superadmin' ? 'superadmin@camelcomm.in' : 'name@pharma.com'}
                  className="flex-1 bg-transparent px-3.5 py-2.5 text-xs text-[#0d3b75] font-medium placeholder:text-[#9ab1ce] focus:outline-none"
                />
                {email && (
                  <button
                    type="button"
                    onClick={() => setEmail('')}
                    className="w-8 h-11 flex items-center justify-center text-slate-400 hover:text-rose-500 transition mr-1"
                  >
                    <span className="w-4 h-4 rounded-full bg-rose-400 text-white text-[10px] flex items-center justify-center font-bold">
                      <X className="w-3 h-3" />
                    </span>
                  </button>
                )}
              </div>
              <div className="text-[10px] text-[#8ea4bf] ml-3 mt-1">
                {activeTab === 'superadmin' ? 'Platform management credential' : 'Corporate employee directory address'}
              </div>
            </div>

            {/* Field 3: Password (Pill style with lock icon on left and toggle on right) */}
            <div>
              <label className="text-xs font-bold text-[#0d3b75] ml-3 mb-1.5 block">
                Password
              </label>
              <div className="relative flex items-center bg-[#f7faff] border border-[#d2e2f3] rounded-full overflow-hidden focus-within:border-[#0088ff] focus-within:ring-2 focus-within:ring-[#0088ff]/20">
                <div className="w-11 h-11 flex items-center justify-center border-r border-[#dbe7f5] text-[#0080ff] shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="flex-1 bg-transparent px-3.5 py-2.5 text-xs text-[#0d3b75] font-medium placeholder:text-[#9ab1ce] focus:outline-none"
                />

                {password && (
                  <button
                    type="button"
                    onClick={() => setPassword('')}
                    className="w-6 h-11 flex items-center justify-center text-slate-400 hover:text-rose-500 transition"
                  >
                    <span className="w-4 h-4 rounded-full bg-rose-400 text-white text-[10px] flex items-center justify-center font-bold">
                      <X className="w-3 h-3" />
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="w-10 h-11 flex items-center justify-center border-l border-[#dbe7f5] text-[#0080ff] hover:text-[#0055ff] transition shrink-0"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="text-[10px] text-[#8ea4bf] ml-3 mt-1 flex items-center justify-between">
                <span>Standard test: Password@123</span>
                <span className="font-mono text-slate-500">Min 8 characters</span>
              </div>
            </div>

            {/* Checkbox Row (Matching Green Check in Screenshot) */}
            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setAgreeTerms(!agreeTerms)}
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${agreeTerms
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'border-2 border-slate-300 hover:border-slate-400'
                    }`}
                >
                  {agreeTerms && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <span className="text-xs text-[#35527a] font-medium">
                  I acknowledge <span className="font-bold text-[#0077ff] underline cursor-pointer">21 CFR Part 11</span> electronic audit terms
                </span>
              </label>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Lockout Warning (Strictly scoped to current email) */}
            {activeLockout > 0 && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 text-xs flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>Locked: {Math.floor(activeLockout / 60)}m {activeLockout % 60}s</span>
                </div>
                <button
                  type="button"
                  onClick={handleOverrideUnlock}
                  className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold hover:bg-amber-300 transition"
                  title="21 CFR Part 11 Admin Override: Reset Database & Client Lockout"
                >
                  Override
                </button>
              </div>
            )}

            {/* Action Button (Vivid Blue to Cyan Gradient Pill from Screenshot) */}
            <button
              type="submit"
              disabled={isSubmitting || activeLockout > 0}
              className="w-full py-3.5 rounded-full text-white font-bold text-sm bg-gradient-to-r from-[#0055ff] via-[#0077ff] to-[#00d4ff] hover:opacity-95 shadow-lg shadow-blue-500/25 transition transform active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <>Verifying Credentials...</>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* 1-Click Fast Demo Login Matrix (Matching Light UI) */}
          <div className="mt-6 pt-5 border-t border-[#e2edfa]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#0d3b75] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                1-Click Quick Demo Sign In
              </span>
              <span className="text-[10px] text-[#718dae] font-semibold">Instant Test</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-left">
              {/* Card 1: Camel SuperAdmin */}
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('SuperAdmin')}
                className="p-2.5 rounded-2xl bg-[#faf5ff] hover:bg-[#f3e8ff] border border-purple-200 hover:border-purple-300 transition text-left group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-900 truncate">Camel Admin</span>
                  <span className="text-[8px] font-bold px-1.5 py-0.2 bg-purple-200/80 text-purple-800 rounded-full">
                    SaaS
                  </span>
                </div>
                <div className="text-[9px] text-purple-600 truncate mt-0.5">Platform Owner</div>
              </button>

              {/* Card 2: Plant Admin */}
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('Admin', 'ORG-APEX')}
                className="p-2.5 rounded-2xl bg-[#f0f7ff] hover:bg-[#e0efff] border border-blue-200 hover:border-blue-300 transition text-left group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-900 truncate">Plant Admin</span>
                  <span className="text-[8px] font-bold px-1.5 py-0.2 bg-blue-200/80 text-blue-800 rounded-full">
                    IT Head
                  </span>
                </div>
                <div className="text-[9px] text-blue-600 truncate mt-0.5">Vikram Joshi</div>
              </button>

              {/* Card 3: QA Supervisor */}
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('Supervisor', 'ORG-APEX')}
                className="p-2.5 rounded-2xl bg-[#f0fdf4] hover:bg-[#dcfce7] border border-emerald-200 hover:border-emerald-300 transition text-left group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-900 truncate">QA Supervisor</span>
                  <span className="text-[8px] font-bold px-1.5 py-0.2 bg-emerald-200/80 text-emerald-800 rounded-full">
                    Checker
                  </span>
                </div>
                <div className="text-[9px] text-emerald-600 truncate mt-0.5">Dr. Anjali Nair</div>
              </button>

              {/* Card 4: Packaging Operator */}
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('Operator', 'ORG-APEX')}
                className="p-2.5 rounded-2xl bg-[#fffbeb] hover:bg-[#fef3c7] border border-amber-200 hover:border-amber-300 transition text-left group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-900 truncate">Operator</span>
                  <span className="text-[8px] font-bold px-1.5 py-0.2 bg-amber-200/80 text-amber-800 rounded-full">
                    Floor
                  </span>
                </div>
                <div className="text-[9px] text-amber-600 truncate mt-0.5">Ramesh Kumar</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="mt-6 text-center text-xs text-[#6e89ab]">
        PharmaLabel Pro · GxP Compliant Serialization Platform · Powered by Camel Communication
      </footer>
    </div>
  );
};
