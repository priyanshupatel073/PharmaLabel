import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { APP_ROUTES } from '../routes';
import {
  Search, Bell, Settings, ChevronDown,
  KeyRound, Menu, CheckCircle2, AlertTriangle,
  FileCheck, Layers, ArrowRight, ShieldCheck,
  X, Check, Package, Barcode, FileCode, History
} from 'lucide-react';
import { Role } from '../types';
import { INITIAL_USERS } from '../utils/mockData';

interface TopbarProps {
  onOpenLoginModal: () => void;
}

const ROLE_COLORS: Record<Role, string> = {
  SuperAdmin: 'bg-purple-100 text-purple-700 border-purple-200',
  Admin:      'bg-blue-100   text-blue-700   border-blue-200',
  Supervisor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Operator:   'bg-amber-100  text-amber-700  border-amber-200',
};

const ROLE_DOT: Record<Role, string> = {
  SuperAdmin: 'bg-purple-500',
  Admin:      'bg-blue-500',
  Supervisor: 'bg-emerald-500',
  Operator:   'bg-amber-500',
};

export const Topbar: React.FC<TopbarProps> = ({ onOpenLoginModal }) => {
  const {
    currentUser, switchRole, lockoutRemaining, resetLockout,
    auditLogs, products, templates, batches, setActiveTab
  } = useApp();

  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [clearedNotifications, setClearedNotifications] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  interface SearchResultItem {
    id: string;
    category: 'Batch' | 'Product' | 'SSCC' | 'Template' | 'Audit';
    title: string;
    subtitle: string;
    to: string;
  }

  const searchResults = useMemo<SearchResultItem[]>(() => {
    const q = searchVal.trim().toLowerCase();
    if (!q) return [];

    const results: SearchResultItem[] = [];

    batches.forEach(b => {
      if (
        b.batchNumber.toLowerCase().includes(q) ||
        b.productName.toLowerCase().includes(q) ||
        b.status.toLowerCase().includes(q)
      ) {
        results.push({
          id: `batch-${b.id}`,
          category: 'Batch',
          title: b.batchNumber,
          subtitle: `${b.productName} · ${b.totalDrums} drums · ${b.status}`,
          to: `${APP_ROUTES.batches.path}?q=${encodeURIComponent(b.batchNumber)}`,
        });
      }

      b.drums.forEach(d => {
        if (d.sscc && d.sscc.toLowerCase().includes(q)) {
          results.push({
            id: `sscc-${b.id}-${d.drumNumber}`,
            category: 'SSCC',
            title: d.sscc,
            subtitle: `${b.batchNumber} · Drum #${d.drumNumber} · ${d.status}`,
            to: `${APP_ROUTES.batches.path}?q=${encodeURIComponent(b.batchNumber)}`,
          });
        }
      });
    });

    products.forEach(p => {
      if (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.gtin14.toLowerCase().includes(q) ||
        p.apiName.toLowerCase().includes(q) ||
        p.brandName.toLowerCase().includes(q) ||
        p.casNumber.toLowerCase().includes(q)
      ) {
        results.push({
          id: `prod-${p.id}`,
          category: 'Product',
          title: `${p.code} — ${p.name}`,
          subtitle: `GTIN: ${p.gtin14} · ${p.status}`,
          to: `${APP_ROUTES.products.path}?q=${encodeURIComponent(p.code)}`,
        });
      }
    });

    if (APP_ROUTES.templates.roles.includes(currentUser.role)) {
      templates.forEach(t => {
        if (
          t.name.toLowerCase().includes(q) ||
          t.revision.toLowerCase().includes(q) ||
          t.dimension.toLowerCase().includes(q)
        ) {
          results.push({
            id: `tpl-${t.id}`,
            category: 'Template',
            title: `${t.name} (Rev ${t.revision})`,
            subtitle: `${t.dimension}" · ${t.status}`,
            to: APP_ROUTES.templates.path,
          });
        }
      });
    }

    if (APP_ROUTES.audit.roles.includes(currentUser.role)) {
      auditLogs.forEach(log => {
        if (
          log.action.toLowerCase().includes(q) ||
          log.userName.toLowerCase().includes(q) ||
          (log.batchRef && log.batchRef.toLowerCase().includes(q)) ||
          (log.sscc && log.sscc.toLowerCase().includes(q)) ||
          (log.reason && log.reason.toLowerCase().includes(q))
        ) {
          const filterVal = log.sscc || log.batchRef || searchVal.trim();
          results.push({
            id: `audit-${log.id}`,
            category: 'Audit',
            title: log.action.replace(/_/g, ' '),
            subtitle: `${log.userName} · ${log.module}${log.batchRef ? ` · ${log.batchRef}` : ''}`,
            to: `${APP_ROUTES.audit.path}?q=${encodeURIComponent(filterVal)}`,
          });
        }
      });
    }

    return results.slice(0, 10);
  }, [searchVal, batches, products, templates, auditLogs, currentUser.role]);

  const handleSelectSearchResult = (item: SearchResultItem) => {
    navigate(item.to);
    setSearchOpen(false);
    setSearchVal('');
  };

  const roles: Role[] = ['SuperAdmin', 'Admin', 'Supervisor', 'Operator'];

  // Alerts calculation
  const pendingProducts = products.filter(p => p.status === 'Pending Approval');
  const pendingTemplates = templates.filter(t => t.status === 'In Review');
  const damagedDrums = batches.flatMap(b =>
    b.drums
      .filter(d => d.status === 'Damaged')
      .map(d => ({ batch: b.batchNumber, drumNumber: d.drumNumber, reason: d.damagedReason, batchId: b.id }))
  );

  const totalActionItems = pendingProducts.length + pendingTemplates.length + damagedDrums.length;
  const unreadCount = clearedNotifications ? 0 : totalActionItems + Math.min(auditLogs.length, 3);

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    setNotificationsOpen(false);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4 sticky top-0 z-30 shadow-sm">

      {/* Lock-out Banner */}
      {lockoutRemaining > 0 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
      )}

      {/* Coup Admin Style Hamburger */}
      <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-brand-600 shrink-0">
        <Menu className="w-4 h-4" />
      </div>

      {/* Search */}
      <div ref={searchRef} className="relative flex-1 max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={searchVal}
          onFocus={() => setSearchOpen(true)}
          onChange={e => {
            setSearchVal(e.target.value);
            setSearchOpen(true);
            setNotificationsOpen(false);
            setUserMenuOpen(false);
          }}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              setSearchOpen(false);
              setSearchVal('');
            } else if (e.key === 'Enter' && searchResults.length > 0) {
              e.preventDefault();
              handleSelectSearchResult(searchResults[0]);
            }
          }}
          placeholder="Search batches, products, SSCC..."
          className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium
                     focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white
                     placeholder:text-slate-400"
        />
        {searchVal && (
          <button
            type="button"
            onClick={() => {
              setSearchVal('');
              setSearchOpen(false);
            }}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Live Search Dropdown */}
        {searchOpen && searchVal.trim().length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden">
            <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Search Results</span>
              <span>{searchResults.length} match{searchResults.length === 1 ? '' : 'es'}</span>
            </div>

            {searchResults.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No batches, products, or SSCC records match "{searchVal.trim()}".
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {searchResults.map(item => {
                  const iconMap = {
                    Batch: <Layers className="w-3.5 h-3.5 text-teal-600" />,
                    Product: <Package className="w-3.5 h-3.5 text-blue-600" />,
                    SSCC: <Barcode className="w-3.5 h-3.5 text-purple-600" />,
                    Template: <FileCode className="w-3.5 h-3.5 text-amber-600" />,
                    Audit: <History className="w-3.5 h-3.5 text-slate-600" />,
                  };
                  const badgeMap = {
                    Batch: 'bg-teal-50 text-teal-700 border-teal-200',
                    Product: 'bg-blue-50 text-blue-700 border-blue-200',
                    SSCC: 'bg-purple-50 text-purple-700 border-purple-200',
                    Template: 'bg-amber-50 text-amber-700 border-amber-200',
                    Audit: 'bg-slate-100 text-slate-700 border-slate-200',
                  };

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectSearchResult(item)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 transition flex items-start gap-2.5 group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                        {iconMap[item.category]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-brand-600 truncate">
                            {item.title}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${badgeMap[item.category]}`}>
                            {item.category}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">{item.subtitle}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">

        {/* Quick Role Switcher Pills */}
        <div className="hidden md:flex items-center bg-slate-100 border border-slate-300 rounded-xl px-2 py-1 gap-1">
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider mr-1 pl-1">Role:</span>
          {roles.map(r => (
            <button
              key={r}
              onClick={() => switchRole(r)}
              className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition ${
                currentUser.role === r
                  ? ROLE_COLORS[r] + ' border shadow-xs'
                  : 'text-slate-700 hover:bg-slate-200/80 hover:text-slate-900'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setNotificationsOpen(o => !o);
              setUserMenuOpen(false);
            }}
            className={`relative w-9 h-9 rounded-xl border flex items-center justify-center transition ${
              notificationsOpen
                ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-xs'
                : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Notifications & Regulatory Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-xs">
                {Math.min(unreadCount, 9)}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in duration-150">
              {/* Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Notifications & Alerts</h3>
                    <p className="text-[10px] text-slate-500 font-medium">GMP System Event Monitor</p>
                  </div>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => setClearedNotifications(true)}
                    className="text-[10px] text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 hover:underline"
                  >
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>

              {/* Notification Items List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {/* 1. Pending Product Approvals */}
                {pendingProducts.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleNavigate('products')}
                    className="p-3.5 hover:bg-amber-50/50 cursor-pointer transition flex items-start gap-3 group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-slate-900 group-hover:text-amber-800 transition truncate">
                          QA Review Required: {p.code}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded border border-amber-200 shrink-0">
                          PENDING
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate mt-0.5">{p.name}</p>
                      <div className="text-[10px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
                        Click to inspect change diff & approve <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                  
                ))}
                

                {/* 2. Pending Template Revisions */}
                {pendingTemplates.map(t => (
                  <div
                    key={t.id}
                    onClick={() => handleNavigate('templates')}
                    className="p-3.5 hover:bg-purple-50/50 cursor-pointer transition flex items-start gap-3 group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-slate-900 group-hover:text-purple-800 transition truncate">
                          Template Rev {t.revision} In Review
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded border border-purple-200 shrink-0">
                          QA REVIEW
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate mt-0.5">{t.name}</p>
                      <div className="text-[10px] text-purple-700 font-semibold mt-1 flex items-center gap-1">
                        Authorize revision for packaging line <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                ))}

                {/* 3. Damaged Label Incidents */}
                {damagedDrums.map(d => (
                  <div
                    key={`${d.batch}_${d.drumNumber}`}
                    onClick={() => handleNavigate('batches')}
                    className="p-3.5 hover:bg-rose-50/50 cursor-pointer transition flex items-start gap-3 group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-slate-900 group-hover:text-rose-800 transition truncate">
                          Damaged Container: Drum #{d.drumNumber}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded border border-rose-200 shrink-0">
                          INCIDENT
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate mt-0.5">{d.batch} · {d.reason || 'Controlled disposition'}</p>
                      <div className="text-[10px] text-rose-700 font-semibold mt-1 flex items-center gap-1">
                        Review batch container ledger <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                ))}

                {/* 4. Recent Audit Events */}
                {auditLogs.slice(0, 4).map(log => (
                  <div
                    key={log.id}
                    onClick={() => handleNavigate('audit')}
                    className="p-3 hover:bg-slate-50 cursor-pointer transition flex items-start gap-2.5 group"
                  >
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                      log.outcome === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {log.outcome === 'SUCCESS' ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800 group-hover:text-slate-900 truncate">
                        {log.action.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                        {log.userName} · {log.module}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                        {log.timestamp}
                      </div>
                    </div>
                  </div>
                ))}

                {totalActionItems === 0 && auditLogs.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                    All systems normal. No active alerts.
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                <button
                  onClick={() => handleNavigate('audit')}
                  className="text-xs text-brand-600 hover:text-brand-700 font-bold flex items-center justify-center gap-1.5 w-full transition"
                >
                  View Full Audit Trail ({auditLogs.length} Records) <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Credentials & Reset */}
        <button
          onClick={onOpenLoginModal}
          title="View credentials & security simulator"
          className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-300 text-slate-700 flex items-center justify-center hover:bg-slate-100 hover:text-slate-900 transition"
        >
          <KeyRound className="w-4 h-4" />
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setUserMenuOpen(o => !o);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-xl bg-slate-50 border border-slate-300
                       hover:bg-slate-100 transition"
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs border ${ROLE_COLORS[currentUser.role]}`}>
              {currentUser.name.charAt(0)}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-900 leading-tight">{currentUser.name}</div>
              <div className="text-[10px] text-slate-600 font-semibold">{currentUser.role}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-1" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-slate-200 shadow-cardHov z-50 overflow-hidden">
              <div className="p-3 border-b border-slate-100">
                <div className="font-bold text-sm text-slate-900">{currentUser.name}</div>
                <div className="text-[11px] text-slate-500">{currentUser.email}</div>
              </div>
              <div className="p-2 space-y-0.5">
                {roles.map(r => {
                  const u = INITIAL_USERS.find(u => u.role === r)!;
                  return (
                    <button
                      key={r}
                      onClick={() => { switchRole(r); setUserMenuOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs hover:bg-slate-50 transition ${
                        currentUser.role === r ? 'bg-brand-50' : ''
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${ROLE_DOT[r]}`} />
                      <span className="font-medium text-slate-800">{u.name}</span>
                      <span className="ml-auto text-[10px] text-slate-400">{r}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <button
          onClick={() => setActiveTab('company')}
          title="Company & GS1 Configuration"
          className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-300 text-slate-700 flex items-center justify-center hover:bg-slate-100 hover:text-slate-900 transition"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Lockout warning */}
      {lockoutRemaining > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white text-xs font-semibold px-5 py-2.5 rounded-full shadow-lg flex items-center gap-3">
          🔒 Account locked — {Math.floor(lockoutRemaining / 60)}m {lockoutRemaining % 60}s remaining
          <button onClick={resetLockout} className="underline">Override</button>
        </div>
      )}
    </header>
  );
};
