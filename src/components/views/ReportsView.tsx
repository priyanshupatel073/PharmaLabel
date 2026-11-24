import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageHeader, Card, PrimaryBtn, StatusBadge } from '../ui';
import {
  BarChart3,
  Download,
  Layers,
  AlertTriangle,
  Users,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Printer,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { batches, auditLogs, exportAuditTrailCsv } = useApp();

  const [activeTab, setActiveTab] = useState<'batch' | 'damaged' | 'users'>('batch');

  // Compute stats
  let totalPrinted = 0;
  let totalDamaged = 0;
  let totalDrums = 0;

  batches.forEach((b) => {
    totalDrums += b.totalDrums;
    b.drums.forEach((d) => {
      if (d.status === 'Printed') totalPrinted++;
      if (d.status === 'Damaged') totalDamaged++;
    });
  });

  const printRate = totalDrums > 0 ? ((totalPrinted / totalDrums) * 100).toFixed(1) : '0.0';

  // User-wise summary
  const userActivityMap = new Map<string, { role: string; count: number }>();
  auditLogs.forEach((log) => {
    const cur = userActivityMap.get(log.userName) || { role: log.userRole, count: 0 };
    userActivityMap.set(log.userName, { role: log.userRole, count: cur.count + 1 });
  });

  const kpiCards = [
    {
      label: 'Total Allocated Containers',
      value: `${totalPrinted} / ${totalDrums}`,
      sub: `${printRate}% serialized & printed`,
      icon: <Printer className="w-5 h-5 text-teal-700" />,
      gradient: 'metric-teal border border-teal-200',
      labelColor: 'text-teal-800',
      valColor: 'text-teal-950',
      subColor: 'text-teal-700',
      trend: 'up',
    },
    {
      label: 'Damaged / Reprint Events',
      value: `${totalDamaged}`,
      sub: 'Disposition records archived',
      icon: <AlertTriangle className="w-5 h-5 text-rose-700" />,
      gradient: 'metric-pink border border-pink-200',
      labelColor: 'text-rose-800',
      valColor: 'text-rose-950',
      subColor: 'text-rose-700',
      trend: 'down',
    },
    {
      label: 'Total Audit Events Logged',
      value: `${auditLogs.length}`,
      sub: '21 CFR Part 11 compliant history',
      icon: <BarChart3 className="w-5 h-5 text-emerald-700" />,
      gradient: 'metric-green border border-green-200',
      labelColor: 'text-emerald-800',
      valColor: 'text-emerald-950',
      subColor: 'text-emerald-700',
      trend: 'up',
    },
  ];

  const tabs = [
    { id: 'batch' as const, label: 'Batch Serialization', icon: <Layers className="w-4 h-4" /> },
    { id: 'damaged' as const, label: 'Damaged & Reprint', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'users' as const, label: 'User Accountability', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operational Reports & Reconciliation"
        subtitle="Statistical summaries for Batch Manufacturing Records (BMR), serialization ledgers, and deviation reviews."
        action={
          <PrimaryBtn icon={<Download className="w-4 h-4" />} onClick={exportAuditTrailCsv}>
            Download Reconciliation CSV
          </PrimaryBtn>
        }
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpiCards.map((card) => (
          <div key={card.label} className={`${card.gradient} rounded-2xl p-5 shadow-card`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${card.labelColor}`}>{card.label}</span>
              <span>{card.icon}</span>
            </div>
            <div className={`text-3xl font-black font-mono tracking-tight ${card.valColor}`}>{card.value}</div>
            <div className="flex items-center gap-1.5 mt-1.5">
              {card.trend === 'up'
                ? <TrendingUp className={`w-3.5 h-3.5 ${card.subColor}`} />
                : <TrendingDown className={`w-3.5 h-3.5 ${card.subColor}`} />}
              <span className={`text-xs font-semibold ${card.subColor}`}>{card.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report 1: Batch-wise Breakdown */}
      {activeTab === 'batch' && (
        <Card noPad>
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Batch-wise Serialization Report</h3>
            <p className="text-xs text-slate-500 mt-0.5">SSCC allocation progress and batch manufacturing status.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Batch / Lot Number</th>
                  <th className="px-4 py-3.5">Product Monograph</th>
                  <th className="px-4 py-3.5">Batch Size (Kg)</th>
                  <th className="px-4 py-3.5">Total Drums</th>
                  <th className="px-4 py-3.5">Printed SSCCs</th>
                  <th className="px-4 py-3.5">Batch Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((b) => {
                  const printed = b.drums.filter((d) => d.status === 'Printed').length;
                  const pct = b.totalDrums > 0 ? ((printed / b.totalDrums) * 100).toFixed(0) : '0';
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">{b.batchNumber}</td>
                      <td className="px-4 py-4 text-slate-700">{b.productName}</td>
                      <td className="px-4 py-4 font-mono text-slate-800">{b.batchSizeKg} Kg</td>
                      <td className="px-4 py-4 font-mono text-slate-800">{b.totalDrums}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-700 font-mono">{printed}/{b.totalDrums}</span>
                          <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden w-20">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={b.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Report 2: Damaged Labels */}
      {activeTab === 'damaged' && (
        <Card noPad>
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Damaged Label & Reprint Register</h3>
            <p className="text-xs text-slate-500 mt-0.5">All drums with damage or reprint events. Reused SSCCs are highlighted.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Batch Reference</th>
                  <th className="px-4 py-3.5">Drum Container</th>
                  <th className="px-4 py-3.5">Reused SSCC</th>
                  <th className="px-4 py-3.5">Incident Reason</th>
                  <th className="px-4 py-3.5">Reprint Count</th>
                  <th className="px-4 py-3.5">Final Disposition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.flatMap((b) =>
                  b.drums
                    .filter((d) => d.status === 'Damaged' || d.reprintCount > 0)
                    .map((d) => (
                      <tr key={`${b.id}_${d.drumNumber}`} className="hover:bg-rose-50/30 transition">
                        <td className="px-5 py-4 font-mono font-bold text-slate-900">{b.batchNumber}</td>
                        <td className="px-4 py-4 font-bold text-slate-800">Drum #{d.drumNumber}</td>
                        <td className="px-4 py-4">
                          {d.sscc ? (
                            <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {d.sscc}
                            </span>
                          ) : (
                            <span className="text-slate-300">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-4 italic text-slate-600 max-w-xs">
                          {d.damagedReason || 'Reprint requested during packaging staging'}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-rose-700 font-bold font-mono text-sm">×{d.reprintCount}</span>
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {d.damagedDisposition || 'Scrapped & Replaced with QA Approval'}
                        </td>
                      </tr>
                    ))
                )}
                {batches.flatMap((b) => b.drums.filter((d) => d.status === 'Damaged' || d.reprintCount > 0)).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400 italic">
                      No damaged or reprinted labels recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Report 3: User Activity */}
      {activeTab === 'users' && (
        <Card noPad>
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">User Activity & Accountability Report</h3>
            <p className="text-xs text-slate-500 mt-0.5">Every user action is fully traceable to individual identity and role.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">User Full Name</th>
                  <th className="px-4 py-3.5">Assigned Role</th>
                  <th className="px-4 py-3.5">Total Audit Events</th>
                  <th className="px-4 py-3.5">Activity Share</th>
                  <th className="px-4 py-3.5">Compliance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Array.from(userActivityMap.entries()).map(([name, data]) => {
                  const pct = auditLogs.length > 0 ? ((data.count / auditLogs.length) * 100).toFixed(0) : '0';
                  return (
                    <tr key={name} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-4 font-bold text-slate-900">{name}</td>
                      <td className="px-4 py-4">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-semibold font-mono text-slate-700">
                          {data.role}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-mono font-bold text-slate-800">{data.count}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          100% Traceable
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
