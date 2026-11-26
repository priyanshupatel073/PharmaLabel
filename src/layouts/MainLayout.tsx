import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Sidebar } from '../components/Sidebar';
import { Topbar } from '../components/Topbar';
import { LoginModal } from '../components/LoginModal';
import { ChangePasswordModal } from '../components/ChangePasswordModal';

/** Persistent application shell shared across all routed frontend pages. */
export const MainLayout: React.FC = () => {
  const { isAuthenticated, currentUser } = useApp();
  const [loginOpen, setLoginOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Mandatory password change strictly applies to newly onboarded client plant accounts, NEVER SuperAdmin
  const isMandatoryPasswordChange = currentUser.role !== 'SuperAdmin' && !!currentUser.mustChangePassword;

  return (
    <div className="min-h-screen bg-canvas flex font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar 
          onOpenLoginModal={() => setLoginOpen(true)}
          onOpenChangePasswordModal={() => setChangePasswordOpen(true)}
        />
        <main className="flex-1 p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />

      {/* 21 CFR Part 11 Permanent Password Change Modal */}
      <ChangePasswordModal
        isOpen={isMandatoryPasswordChange || changePasswordOpen}
        mandatory={isMandatoryPasswordChange}
        onClose={() => setChangePasswordOpen(false)}
      />
    </div>
  );
};
