import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { APP_ROUTES, getRouteForTab } from '../routes';
import {
  LayoutDashboard, Building2, Package, Layers,
  FileCode, Printer, History, BarChart3,
  HardDriveDownload, FlaskConical, ShieldCheck
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { currentUser, products, templates } = useApp();

  const pendingProducts  = products.filter(p => p.status === 'Pending Approval').length;
  const pendingTemplates = templates.filter(t => t.status === 'In Review' || t.status === 'Draft').length;

  const groups = [
    {
      heading: 'PLATFORM OWNER',
      items: [
        { id: 'superadmin', label: APP_ROUTES.superadmin.title, icon: ShieldCheck, roles: APP_ROUTES.superadmin.roles },
      ]
    },
    {
      heading: 'MAIN',
      items: [
        { id: 'dashboard', label: APP_ROUTES.dashboard.title, icon: LayoutDashboard, roles: APP_ROUTES.dashboard.roles },
      ]
    },
    {
      heading: 'PRODUCTION',
      items: [
        { id: 'batches',   label: APP_ROUTES.batches.title,   icon: Layers,  roles: APP_ROUTES.batches.roles },
        { id: 'printing',  label: APP_ROUTES.printing.title,  icon: Printer, roles: APP_ROUTES.printing.roles },
        {
          id: 'products',
          label: APP_ROUTES.products.title,
          icon: Package,
          roles: APP_ROUTES.products.roles,
          badge: pendingProducts > 0 ? String(pendingProducts) : undefined,
          badgeColor: 'bg-amber-500'
        },
        {
          id: 'templates',
          label: APP_ROUTES.templates.title,
          icon: FileCode,
          roles: APP_ROUTES.templates.roles,
          badge: pendingTemplates > 0 ? String(pendingTemplates) : undefined,
          badgeColor: 'bg-amber-500'
        },
      ]
    },
    {
      heading: 'CONFIGURATION',
      items: [
        { id: 'company', label: APP_ROUTES.company.title, icon: Building2, roles: APP_ROUTES.company.roles },
      ]
    },
    {
      heading: 'ANALYTICS',
      items: [
        { id: 'audit',   label: APP_ROUTES.audit.title,   icon: History,           roles: APP_ROUTES.audit.roles },
        { id: 'reports', label: APP_ROUTES.reports.title, icon: BarChart3,         roles: APP_ROUTES.reports.roles },
        { id: 'backup',  label: APP_ROUTES.backup.title,  icon: HardDriveDownload, roles: APP_ROUTES.backup.roles },
      ]
    },
  ];

  return (
    <aside className="w-60 bg-white border-r border-slate-200/80 flex flex-col shrink-0 sticky top-0 h-screen z-20 shadow-xs">
      {/* Logo / Brand */}
      <Link
        to={APP_ROUTES.dashboard.path}
        className="h-16 flex items-center gap-3 px-5 border-b border-slate-200/80 shrink-0 hover:bg-slate-50/70 transition-colors"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-nav">
          <FlaskConical className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="font-extrabold text-sm text-slate-900 tracking-tight">PharmLabel</div>
          <div className="text-[10px] text-slate-400 font-medium">Serialization Pro</div>
        </div>
      </Link>

      {/* Navigation groups */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {groups.map(group => {
          const visibleItems = group.items.filter(item => item.roles.includes(currentUser.role));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.heading}>
              <div className="text-[10px] font-black text-slate-500 tracking-widest px-3 mb-2">
                {group.heading}
              </div>
              <div className="space-y-0.5">
                {visibleItems.map(item => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.id}
                      to={getRouteForTab(item.id)}
                      className={({ isActive }) =>
                        `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'nav-active text-white shadow-nav font-bold'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.badge && (
                            <span className={`${item.badgeColor || 'bg-slate-500'} text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center`}>
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom User Role Badge */}
      <div className="p-4 border-t border-slate-200/80 shrink-0">
        <div className="bg-gradient-to-r from-brand-50 to-indigo-50 border border-brand-100 rounded-xl p-3">
          <div className="text-[10px] font-bold text-brand-700 uppercase tracking-wider">Active Session</div>
          <div className="font-semibold text-slate-900 text-xs mt-0.5">{currentUser.name}</div>
          <div className="text-[10px] text-brand-600 font-medium mt-0.5">{currentUser.role}</div>
        </div>
      </div>
    </aside>
  );
};
