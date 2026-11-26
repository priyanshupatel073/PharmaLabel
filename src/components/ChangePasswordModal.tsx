import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  X,
  ShieldCheck,
  KeyRound,
  Check,
  RefreshCw
} from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  mandatory?: boolean;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  mandatory = false
}) => {
  const { currentUser, login, logAudit } = useApp();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  // Validation checks
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()\-_=+\[\]{};:,.<>?]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial && passwordsMatch && currentPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/change_password.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: currentUser.email,
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword
        })
      });

      const res = await response.json();

      if (response.ok && res.success) {
        setIsSuccess(true);

        // Update token in localStorage
        if (res.data?.token) {
          localStorage.setItem('pharmalabel_token', res.data.token);
        }

        // Update currentUser in AppContext
        login({
          ...currentUser,
          mustChangePassword: false
        });

        logAudit('PASSWORD_CHANGED', 'Security & Access Control', {
          newValue: 'Permanent Password Established',
          reason: mandatory ? 'Mandatory first-login temporary password replacement' : 'Voluntary password update',
          outcome: 'SUCCESS'
        });
      } else {
        if (res.errors && typeof res.errors === 'object') {
          const detail = Object.values(res.errors).filter(Boolean).join(' · ');
          setErrorMessage(detail || res.message || 'Failed to update password.');
        } else {
          setErrorMessage(res.message || 'Failed to update password.');
        }
      }
    } catch (err: any) {
      setErrorMessage('Unable to connect to security server. Please ensure backend is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    setIsSuccess(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-900 relative">
        {/* Close Button only if NOT mandatory */}
        {!mandatory && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {isSuccess ? (
          // Success State
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                21 CFR Part 11 Compliant
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-2">
                Permanent Password Established!
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-sm mx-auto">
                Your confidential electronic signature credentials have been securely stored with salted bcrypt encryption.
              </p>
            </div>

            <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-[11px] text-emerald-800 text-left space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Electronic Signature Authority Active</span>
              </div>
              <p className="text-emerald-700 leading-normal">
                You can now authorize batch records, generate GS1 SSCC labels, and review audit logs under full GxP ALCOA+ accountability.
              </p>
            </div>

            <button
              onClick={handleFinish}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-95"
            >
              Continue to Plant Dashboard &rarr;
            </button>
          </div>
        ) : (
          // Password Change Form
          <>
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                    {mandatory ? 'Mandatory Security Action' : 'Credential Management'}
                  </span>
                </div>
                <h3 className="font-extrabold text-base text-slate-900 mt-0.5">
                  {mandatory ? 'Set Your Permanent Password' : 'Change Security Password'}
                </h3>
              </div>
            </div>

            {/* Mandatory First-Login Regulatory Notice */}
            {mandatory && (
              <div className="mt-3.5 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold">21 CFR Part 11 §11.200 Security Mandate</span>
                  <p className="text-[11px] text-amber-700 leading-normal">
                    You logged in using an auto-generated temporary password. Regulatory guidelines require replacing it with a private permanent password before accessing production data.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              {/* Field 1: Current / Temp Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {mandatory ? 'Temporary Password Received in Email *' : 'Current Password *'}
                </label>
                <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-500">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="flex-1 bg-transparent px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="px-3 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Field 2: New Permanent Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Permanent Password *
                </label>
                <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-500">
                  <input
                    type={showNew ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 chars with Aa, 0-9 & symbols"
                    className="flex-1 bg-transparent px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="px-3 text-slate-400 hover:text-slate-600"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Field 3: Confirm Permanent Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm New Password *
                </label>
                <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-500">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="flex-1 bg-transparent px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="px-3 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 21 CFR Part 11 Rule Checklist */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-[11px] space-y-1.5">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  21 CFR Part 11 Password Standard
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    <Check className={`w-3.5 h-3.5 ${hasMinLength ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>8+ Characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasUpper && hasLower ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    <Check className={`w-3.5 h-3.5 ${hasUpper && hasLower ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>Upper & Lowercase</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    <Check className={`w-3.5 h-3.5 ${hasNumber ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>Number (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    <Check className={`w-3.5 h-3.5 ${hasSpecial ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>Special Symbol (!@#$)</span>
                  </div>
                </div>
                {newPassword && confirmPassword && (
                  <div className={`pt-1 border-t border-slate-200/60 flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-700 font-bold' : 'text-rose-600'}`}>
                    <Check className={`w-3.5 h-3.5 ${passwordsMatch ? 'text-emerald-600' : 'text-rose-400'}`} />
                    <span>{passwordsMatch ? 'Passwords match' : 'Passwords do not match'}</span>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                {!mandatory && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!isFormValid || isSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Hashing & Saving Permanent Password...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Establish Permanent Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
