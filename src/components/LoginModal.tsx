import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { INITIAL_USERS } from '../utils/mockData';
import { Role } from '../types';
import { X, KeyRound, ShieldAlert, CheckCircle2, Lock, ArrowRight } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const {
    switchRole,
    simulateFailedLogin,
    failedLoginAttempts,
    lockoutRemaining,
    resetLockout
  } = useApp();

  const [inputEmail, setInputEmail] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleTestLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutRemaining > 0) {
      setErrorMessage(`System is locked out for ${lockoutRemaining} more seconds.`);
      return;
    }

    const matched = INITIAL_USERS.find(
      (u) => u.email.toLowerCase() === inputEmail.trim().toLowerCase()
    );

    if (matched && inputPassword === 'Password@123') {
      switchRole(matched.role);
      setErrorMessage('');
      resetLockout();
      onClose();
    } else {
      simulateFailedLogin();
      setErrorMessage(
        `Invalid credentials. Warning: ${4 - failedLoginAttempts > 0
          ? `${4 - failedLoginAttempts} attempts left before 15-min lockout.`
          : 'Account locked out!'
        }`
      );
    }
  };

  const handleQuickFill = (role: Role) => {
    const user = INITIAL_USERS.find((u) => u.role === role);
    if (!user) return;
    setInputEmail(user.email);
    setInputPassword('Password@123');
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full p-6 text-slate-900 space-y-5 animate-in fade-in duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-slate-800" />
            <h3 className="font-bold text-base text-slate-900">
              Demo Credentials & Security Simulator
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Click Credentials Matrix */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            1-Click Pre-populated Accounts:
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {INITIAL_USERS.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleQuickFill(u.role)}
                className="text-left p-3 rounded-xl border border-slate-300 hover:border-brand-500 bg-slate-50 hover:bg-brand-50/40 transition flex flex-col justify-between shadow-xs group"
              >
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span className="group-hover:text-brand-700 transition">{u.name}</span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-800">
                    {u.role}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 font-mono mt-1 truncate">
                  {u.email}
                </div>
                <div className="text-[11px] font-semibold text-slate-700 mt-1">Pass: <span className="font-mono text-brand-700 font-bold">Password@123</span></div>
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Login Form for Brute-force Testing */}
        <form onSubmit={handleTestLogin} className="space-y-3 pt-2 border-t border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Test Email Address
            </label>
            <input
              type="email"
              value={inputEmail}
              onChange={(e) => setInputEmail(e.target.value)}
              placeholder="operator@apexpharma.com"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Password (Demo default: Password@123)
            </label>
            <input
              type="password"
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white font-mono"
            />
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-medium flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs font-semibold text-slate-600">
              Failed attempts: <strong className="text-slate-900 font-black">{failedLoginAttempts} / 5</strong>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={simulateFailedLogin}
                className="text-xs text-rose-700 hover:text-rose-900 hover:bg-rose-100 px-3 py-2 rounded-xl font-bold border border-rose-300 transition"
              >
                Simulate Failed Login
              </button>
              <button
                type="submit"
                className="text-xs bg-slate-900 text-white hover:bg-slate-800 px-5 py-2 rounded-xl font-bold shadow-sm transition"
              >
                Sign In
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
