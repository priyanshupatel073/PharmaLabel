import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Tag, Layers, Barcode, AlertTriangle,
  ArrowUpRight, ArrowRight, ChevronRight,
  Printer, FileCheck, CheckCircle2, ShieldCheck
} from 'lucide-react';

// Tiny sparkline-like SVG bar chart for KPI cards
const SparkBars: React.FC<{ color: string }> = ({ color }) => {
  const bars = [40, 65, 45, 80, 55, 90, 70, 95, 60, 85];
  return (
    <svg width="80" height="30" viewBox="0 0 80 30" className="opacity-60">
      {bars.map((h, i) => (
        <rect
          key={i}
          x={i * 8 + 1}
          y={30 - h * 0.3}
          width="5"
          height={h * 0.3}
          rx="2"
          fill={color}
        />
      ))}
    </svg>
  );
};

// Thin line sparkline
const SparkLine: React.FC<{ color: string }> = ({ color }) => {
  const pts = [0, 8, 5, 15, 12, 20, 10, 25, 18, 22, 28, 30];
  const path = pts.reduce((acc, v, i) =>
    i % 2 === 0 ? acc + (i === 0 ? `M ${v},` : ` L ${v},`) : acc + `${30 - v}`, '');
  return (
    <svg width="80" height="32" viewBox="0 0 80 32" className="opacity-70">
      <defs>
        <linearGradient id={`lg-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={path} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const DashboardView: React.FC = () => {
  const {
    currentUser, setActiveTab,
    batches, products, templates, auditLogs,
    companySettings
  } = useApp();

  const activeBatches = batches.filter(b => b.status === 'In Progress' || b.status === 'Pending').length;
  const pendingProducts = products.filter(p => p.status === 'Pending Approval');
  const pendingTemplates = templates.filter(t => t.status === 'In Review');
  const totalPending = pendingProducts.length + pendingTemplates.length;

  let totalPrinted = 0, totalDamaged = 0, totalDrums = 0;
  batches.forEach(b => {
    totalDrums += b.totalDrums;
    b.drums.forEach(d => {
      if (d.status === 'Printed') totalPrinted++;
      if (d.status === 'Damaged') totalDamaged++;
    });
  });

  const kpiCards = [
    {
      title: 'Labels Serialized',
      value: totalPrinted,
      sub: `of ${totalDrums} drums`,
      icon: Tag,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      trend: '+12%',
      trendUp: true,
      sparkColor: '#3b82f6',
      border: 'border-l-blue-500',
    },
    {
      title: 'Active Batches',
      value: activeBatches,
      sub: `${batches.length} total registered`,
      icon: Layers,
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
      trend: '+2',
      trendUp: true,
      sparkColor: '#14b8a6',
      border: 'border-l-teal-500',
    },
    {
      title: 'Next SSCC Ref',
      value: `#${companySettings.nextSerialReference.toString().padStart(5, '0')}`,
      sub: `Prefix: ${companySettings.gs1CompanyPrefix}`,
      icon: Barcode,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      trend: 'GS1 Mod-10',
      trendUp: true,
      sparkColor: '#8b5cf6',
      border: 'border-l-purple-500',
    },
    {
      title: 'Damaged Labels',
      value: totalDamaged,
      sub: 'Controlled reprint history',
      icon: AlertTriangle,
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600',
      trend: 'Logged',
      trendUp: null,
      sparkColor: '#f43f5e',
      border: 'border-l-rose-500',
    },
  ];

  return (
    <div className="space-y-6">

      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Good Morning, {currentUser.name.split(' ')[0]}!
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Here's what's happening in <strong className="text-slate-700">Harihar Pharma Pvt. Ltd.</strong> today.
          </p>
        </div>

        {/* Supervisor: Pending Approval Alert */}
        {currentUser.role === 'Supervisor' && totalPending > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="font-bold text-amber-900 text-sm">{totalPending} Pending Approvals</div>
              <div className="text-[11px] text-amber-700">{pendingProducts.length} products + {pendingTemplates.length} templates</div>
            </div>
            <button onClick={() => setActiveTab('products')}
              className="ml-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold transition">
              Review
            </button>
          </div>
        )}

        {/* Operator: Shortcut */}
        {currentUser.role === 'Operator' && (
          <button
            onClick={() => setActiveTab('printing')}
            style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md border border-blue-700 transition"
          >
            <Printer className="w-4 h-4 text-white" />
            <span className="text-white font-bold">Open Printing Station</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiCards.map(c => {
          const Icon = c.icon;
          return (
            <div key={c.title}
              className={`bg-white rounded-2xl shadow-card card-lift border border-slate-200/90 border-l-4 ${c.border} p-5 flex flex-col gap-3`}>
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${c.iconColor}`} />
                </div>
                <SparkLine color={c.sparkColor} />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">{c.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{c.sub}</div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">{c.title}</span>
                {c.trendUp !== null && (
                  <span className={`text-[11px] font-bold flex items-center gap-0.5 ${c.trendUp ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {c.trendUp && <ArrowUpRight className="w-3 h-3" />}
                    {c.trend}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Row: Colored Metric Sub-Cards + GS1 Engine Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left 2/3: Colored sub-metric cards (like the image) */}
        <div className="lg:col-span-2 space-y-4">

          <div className="bg-white rounded-2xl shadow-card border border-slate-200/90 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-slate-900 text-base">Batch Production Overview</h2>
                <p className="text-xs text-slate-500">Today's shift — {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>
              <button onClick={() => setActiveTab('batches')}
                className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Colored sub-cards (like In-Store, Online, Total Sales in reference) */}
            <div className="grid grid-cols-3 gap-3">
              <div className="metric-pink rounded-2xl p-4 border border-pink-200 shadow-xs">
                <div className="text-[11px] font-bold text-pink-900 uppercase tracking-wider">In-Progress</div>
                <div className="text-2xl font-black text-pink-950 mt-1 font-mono">
                  {batches.filter(b => b.status === 'In Progress').length}
                </div>
                <div className="text-xs font-semibold text-pink-800 mt-1">batches running</div>
              </div>
              <div className="metric-teal rounded-2xl p-4 border border-teal-200 shadow-xs">
                <div className="text-[11px] font-bold text-teal-900 uppercase tracking-wider">Drums Ready</div>
                <div className="text-2xl font-black text-teal-950 mt-1 font-mono">
                  {batches.reduce((sum, b) => sum + b.drums.filter(d => d.status === 'Pending').length, 0)}
                </div>
                <div className="text-xs font-semibold text-teal-800 mt-1">awaiting serialization</div>
              </div>
              <div className="metric-green rounded-2xl p-4 border border-green-200 shadow-xs">
                <div className="text-[11px] font-bold text-green-900 uppercase tracking-wider">Completed</div>
                <div className="text-2xl font-black text-green-950 mt-1 font-mono">
                  {totalPrinted}
                </div>
                <div className="text-xs font-semibold text-green-800 mt-1">drums serialized ✓</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Overall Serialization Progress</span>
                <span className="font-mono">{totalDrums > 0 ? ((totalPrinted / totalDrums) * 100).toFixed(0) : 0}%</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-indigo-500 transition-all duration-500"
                  style={{ width: totalDrums > 0 ? `${(totalPrinted / totalDrums) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>

          {/* Quick Workflow Shortcuts */}
          <div className="bg-white rounded-2xl shadow-card border border-slate-200/90 p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Create New Batch', desc: 'Start production packaging run', tab: 'batches', color: 'bg-blue-50 border-blue-200 hover:bg-blue-100', icon: Layers, iconColor: 'text-blue-600' },
                { label: 'Print Drum Labels', desc: 'Generate GS1 SSCC thermal labels', tab: 'printing', color: 'bg-teal-50 border-teal-200 hover:bg-teal-100', icon: Printer, iconColor: 'text-teal-600' },
                { label: 'Product Master', desc: `${pendingProducts.length} items pending QA review`, tab: 'products', color: 'bg-amber-50 border-amber-200 hover:bg-amber-100', icon: FileCheck, iconColor: 'text-amber-600' },
                { label: 'Audit Trail', desc: `${auditLogs.length} logged compliance events`, tab: 'audit', color: 'bg-purple-50 border-purple-200 hover:bg-purple-100', icon: ShieldCheck, iconColor: 'text-purple-600' },
              ].map(a => {
                const Icon = a.icon;
                return (
                  <button key={a.tab} onClick={() => setActiveTab(a.tab)}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition ${a.color}`}>
                    <div className={`w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${a.iconColor}`} />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-slate-900">{a.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{a.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1/3: Live Audit Feed */}
        <div className="bg-white rounded-2xl shadow-card border border-slate-200/90 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Activity Stream</h2>
              <p className="text-[11px] text-slate-500">ALCOA+ Append-only Log</p>
            </div>
            <button onClick={() => setActiveTab('audit')}
              className="text-xs text-brand-600 hover:underline font-semibold">
              See all
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-72">
            {auditLogs.slice(0, 7).map((log, idx) => (
              <div key={log.id} className="flex gap-2.5 group">
                <div className="relative flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black ${log.outcome === 'SUCCESS'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                    }`}>
                    {log.userName.charAt(0)}
                  </div>
                  {idx < auditLogs.slice(0, 7).length - 1 && (
                    <div className="w-px flex-1 bg-slate-100 mt-1" />
                  )}
                </div>
                <div className="pb-3 flex-1">
                  <div className="font-semibold text-xs text-slate-800">{log.action.replace(/_/g, ' ')}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{log.module} · {log.userName}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{log.timestamp}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 mt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {auditLogs.length} records · Tamper-proof
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: GS1 Engine Box + Products Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* GS1 Serialization Info */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 rounded-2xl shadow-card p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-base">GS1 SSCC Serialization Ledger</div>
            <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              ACTIVE
            </span>
          </div>
          <div className="space-y-3 font-mono text-sm">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-slate-400 text-xs">GS1 Company Prefix</span>
              <span className="font-bold text-white">{companySettings.gs1CompanyPrefix}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-slate-400 text-xs">Extension Digit</span>
              <span className="font-bold text-white">{companySettings.extensionDigit}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-slate-400 text-xs">Check Digit Algorithm</span>
              <span className="text-emerald-400 font-bold">GS1 Mod-10</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-xs">Next Serial Reference</span>
              <span className="text-brand-300 font-black text-base">
                #{companySettings.nextSerialReference.toString().padStart(9, '0')}
              </span>
            </div>
          </div>
        </div>

        {/* Product Status Summary */}
        <div className="bg-white rounded-2xl shadow-card border border-slate-200/90 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-sm">Product Master Status</h3>
            <button onClick={() => setActiveTab('products')}
              className="text-xs text-brand-600 hover:underline font-semibold">
              Manage
            </button>
          </div>
          <div className="space-y-2.5">
            {[
              { label: 'Active', count: products.filter(p => p.status === 'Active').length, color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700' },
              { label: 'Pending Approval', count: products.filter(p => p.status === 'Pending Approval').length, color: 'bg-amber-500', light: 'bg-amber-50 text-amber-700' },
              { label: 'Draft', count: products.filter(p => p.status === 'Draft').length, color: 'bg-blue-400', light: 'bg-blue-50 text-blue-700' },
              { label: 'Inactive', count: products.filter(p => p.status === 'Inactive').length, color: 'bg-slate-400', light: 'bg-slate-50 text-slate-600' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                  <span className="text-xs text-slate-700 font-medium">{s.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${s.color} rounded-full`}
                      style={{ width: `${(s.count / products.length) * 100}%` }}
                    />
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${s.light}`}>
                    {s.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
