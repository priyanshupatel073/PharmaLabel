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
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const route = APP_ROUTES[routeId];

  useEffect(() => {
    document.title = `${route.title} — PharmLabel Pro`;
  }, [route.title]);

  if (!route.roles.includes(currentUser.role)) {
    return (
      <div className="bg-white border border-rose-200 rounded-2xl p-8 max-w-lg mx-auto mt-10 text-center shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-600 mt-2">
          Your current role (<span className="font-semibold">{currentUser.role}</span>) does not have
          permission to view <span className="font-semibold">{route.title}</span>.
        </p>
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
