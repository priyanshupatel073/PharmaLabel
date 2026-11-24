import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard, Building2, Package, Layers,
  FileCode, Printer, History, BarChart3,
  HardDriveDownload, ChevronDown, ChevronRight,
  Barcode, FlaskConical
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
  badge?: string;
  badgeColor?: string;
  children?: { id: string; label: string }[];
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, currentUser, products, templates } = useApp();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const pendingProducts  = products.filter(p => p.status === 'Pending Approval').length;
  const pendingTemplates = templates.filter(t => t.status === 'In Review').length;

  const groups = [
    {
      heading: 'MAIN',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['SuperAdmin','Admin','Supervisor','Operator'] },
      ]
    },
    {
      heading: 'PRODUCTION',
      items: [
        { id: 'batches',   label: 'Batch & Drums',   icon: Layers,  roles: ['SuperAdmin','Admin','Supervisor','Operator'] },
        { id: 'printing',  label: 'Label Printing',  icon: Printer, roles: ['SuperAdmin','Supervisor','Operator'] },
        {
          id: 'products',
          label: 'Product Master',
          icon: Package,
          roles: ['SuperAdmin','Admin','Supervisor','Operator'],
          badge: pendingProducts > 0 ? String(pendingProducts) : undefined,
          badgeColor: 'bg-amber-500'
        },
        {
          id: 'templates',
          label: 'Label Templates',
          icon: FileCode,
          roles: ['SuperAdmin','Admin','Supervisor'],
          badge: pendingTemplates > 0 ? String(pendingTemplates) : undefined,
          badgeColor: 'bg-amber-500'
        },
      ]
    },
    {
      heading: 'CONFIGURATION',
      items: [
        { id: 'company', label: 'Company & GS1', icon: Building2, roles: ['SuperAdmin','Admin'] },
      ]
    },
    {
      heading: 'ANALYTICS',
      items: [
        { id: 'audit',   label: 'Audit Trail',   icon: History,   roles: ['SuperAdmin','Admin','Supervisor'] },
        { id: 'reports', label: 'Reports',        icon: BarChart3, roles: ['SuperAdmin','Admin','Supervisor'] },
        { id: 'backup',  label: 'Licensing & Backup', icon: HardDriveDownload, roles: ['SuperAdmin','Admin'] },
      ]
    },
  ];

  return (
    <aside className="w-60 bg-white border-r border-slate-200/80 flex flex-col shrink-0 sticky top-0 h-screen z-20 shadow-xs">
      {/* Logo / Brand */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-200/80 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-nav">
          <FlaskConical className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="font-extrabold text-sm text-slate-900 tracking-tight">PharmLabel</div>
          <div className="text-[10px] text-slate-400 font-medium">Serialization Pro</div>
        </div>
      </div>

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
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'nav-active text-white shadow-nav font-bold'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <span className={`${item.badgeColor || 'bg-slate-500'} text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
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
