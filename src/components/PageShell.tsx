import React, { useEffect } from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { APP_ROUTES, RouteId } from '../routes';

interface PageShellProps {
  routeId: RouteId;
  children: React.ReactNode;
}

/** Sets the document title and enforces role-based access for a routed page. */
export const PageShell: React.FC<PageShellProps> = ({ routeId, children }) => {
  const { currentUser, hasPermission } = useApp();
  const navigate = useNavigate();
  const route = APP_ROUTES[routeId];

  useEffect(() => {
    document.title = `${route.title} — PharmLabel Pro`;
  }, [route.title]);

  const checkAccess = (): { allowed: boolean; reason?: string } => {
    if (currentUser.role === 'SuperAdmin') return { allowed: true };
    if (!route.roles.includes(currentUser.role)) {
      return {
        allowed: false,
        reason: `Your role (${currentUser.role}) does not have permission to view ${route.title}.`
      };
    }

    // Granular 21 CFR Part 11 §11.10(d) Authority Checks
    switch (routeId) {
      case 'dashboard':
        return { allowed: true };
      case 'printing':
        if (!hasPermission('print_labels') && !hasPermission('reprint_labels')) {
          return {
            allowed: false,
            reason: `Your role (${currentUser.role}) has both 'print_labels' and 'reprint_labels' disabled by the Plant Administrator.`
          };
        }
        return { allowed: true };
      case 'batches':
        if (!hasPermission('create_batch') && !hasPermission('edit_batch')) {
          return {
            allowed: false,
            reason: `Your role (${currentUser.role}) does not have batch creation or editing permissions.`
          };
        }
        return { allowed: true };
      case 'products':
        if (!hasPermission('edit_products')) {
          return {
            allowed: false,
            reason: `Your role (${currentUser.role}) does not have product master editing permission.`
          };
        }
        return { allowed: true };
      case 'templates':
        if (!hasPermission('edit_templates')) {
          return {
            allowed: false,
            reason: `Your role (${currentUser.role}) does not have template designer editing permission.`
          };
        }
        return { allowed: true };
      case 'company':
        if (!hasPermission('edit_company_info')) {
          return {
            allowed: false,
            reason: `Your role (${currentUser.role}) does not have company setup permission.`
          };
        }
        return { allowed: true };
      case 'securityHub':
        if (!hasPermission('manage_users')) {
          return {
            allowed: false,
            reason: `Your role (${currentUser.role}) does not have user & security management permission.`
          };
        }
        return { allowed: true };
      case 'audit':
      case 'reports':
        if (!hasPermission('view_audit')) {
          return {
            allowed: false,
            reason: `Your role (${currentUser.role}) does not have audit log viewing permission.`
          };
        }
        return { allowed: true };
      case 'backup':
        if (!hasPermission('backup_archive') && !hasPermission('license_management')) {
          return {
            allowed: false,
            reason: `Your role (${currentUser.role}) does not have backup or license management permission.`
          };
        }
        return { allowed: true };
      default:
        return { allowed: true };
    }
  };

  const access = checkAccess();

  if (!access.allowed) {
    return (
      <div className="bg-white border border-rose-200 rounded-2xl p-8 max-w-lg mx-auto mt-10 text-center shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-600 mt-2">
          {access.reason}
        </p>
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-left">
          <strong>21 CFR Part 11 §11.10(d) Enforcement:</strong> System authority checks determine that your role lacks the required authorization key. Contact your Plant Administrator to update permissions in <strong>Users & Security</strong>.
        </div>
        <button
          onClick={() => navigate(currentUser.role === 'SuperAdmin' ? '/superadmin' : '/dashboard')}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {currentUser.role === 'SuperAdmin' ? 'Platform Control' : 'Dashboard'}
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
