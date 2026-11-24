import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Role } from '../types';
import {
  Shield,
  UserCheck,
  AlertOctagon,
  RotateCcw,
  KeyRound,
  ExternalLink,
  ChevronDown,
  Building2,
  Clock
} from 'lucide-react';

interface NavbarProps {
  onOpenLoginModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenLoginModal }) => {
  const {
    currentUser,
    switchRole,
    lockoutRemaining,
    resetLockout,
    companySettings,
    resetAllData
  } = useApp();

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const roles: Role[] = ['SuperAdmin', 'Admin', 'Supervisor', 'Operator'];

  const getRoleBadgeStyle = (role: Role) => {
    switch (role) {
      case 'SuperAdmin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Admin':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Supervisor':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Operator':
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      {/* Lockout Warning Banner if simulation triggered */}
      {lockoutRemaining > 0 && (
        <div className="bg-rose-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 animate-pulse" />
            <span>
              SECURITY LOCKOUT ACTIVE: 5 consecutive failed login attempts detected. System locked for{' '}
              {Math.floor(lockoutRemaining / 60)}m {lockoutRemaining % 60}s.
            </span>
          </div>
          <button
            onClick={resetLockout}
            className="underline hover:text-rose-100 font-bold text-xs"
          >
            Override & Unlock Simulator
          </button>
        </div>
      )}

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-slate-900 text-white flex items-center justify-center font-bold font-mono tracking-tighter text-base shadow-sm">
            PL
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-base tracking-tight">PharmLabel Pro</span>
              <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                v1.0 Cloud
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Building2 className="w-3 h-3 text-slate-400" />
              <span>{companySettings.companyName}</span>
              <span className="text-slate-300">|</span>
              <span className="font-mono text-[10px]">Prefix: {companySettings.gs1CompanyPrefix}</span>
            </div>
          </div>
        </div>

        {/* Center: Quick Demo Role Switcher */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-slate-500" />
            Role Switcher:
          </span>
          <div className="flex items-center gap-1">
            {roles.map((r) => {
              const isActive = currentUser.role === r;
              return (
                <button
                  key={r}
                  onClick={() => switchRole(r)}
                  className={`text-xs px-2.5 py-1 rounded font-medium transition ${
                    isActive
                      ? `${getRoleBadgeStyle(r)} shadow-xs font-semibold`
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Section: Active User Info & Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={onOpenLoginModal}
            className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium px-2 py-1 rounded hover:bg-slate-100"
            title="Inspect Test Credentials & Security simulation"
          >
            <KeyRound className="w-3.5 h-3.5 text-slate-500" />
            <span>Credentials</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('Reset all localStorage prototype data back to initial seed?')) {
                resetAllData();
              }
            }}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100"
            title="Reset to factory demo state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-900 leading-tight">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                {currentUser.department}
              </div>
            </div>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${getRoleBadgeStyle(
                currentUser.role
              )}`}
            >
              {currentUser.name.charAt(0)}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
