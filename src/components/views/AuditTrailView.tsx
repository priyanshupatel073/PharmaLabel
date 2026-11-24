import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageHeader, Card, PrimaryBtn, StatusBadge } from '../ui';
import {
  History,
  Download,
  Search,
  ShieldCheck,
  Filter,
} from 'lucide-react';

export const AuditTrailView: React.FC = () => {
  const { auditLogs, exportAuditTrailCsv } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState('ALL');

  const modules = Array.from(new Set(auditLogs.map((l) => l.module)));
  const users = Array.from(new Set(auditLogs.map((l) => l.userName)));

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.reason && log.reason.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.batchRef && log.batchRef.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.sscc && log.sscc.includes(searchTerm));
    const matchesModule = selectedModule === 'ALL' || log.module === selectedModule;
    const matchesUser = selectedUser === 'ALL' || log.userName === selectedUser;
    return matchesSearch && matchesModule && matchesUser;
  });

  const moduleColors: Record<string, string> = {
    'Authentication':    'bg-purple-100 text-purple-800 border border-purple-300',
    'Company Settings':  'bg-blue-100 text-blue-800 border border-blue-300',
    'Product Master':    'bg-teal-100 text-teal-800 border border-teal-300',
    'Batch Management':  'bg-indigo-100 text-indigo-800 border border-indigo-300',
    'Label Printing':    'bg-emerald-100 text-emerald-800 border border-emerald-300',
    'Template Designer': 'bg-amber-100 text-amber-800 border border-amber-300',
    'Backup & Restore':  'bg-rose-100 text-rose-800 border border-rose-300',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Regulatory Audit Trail"
        subtitle="Immutable, append-only chronological log of all critical operations — ALCOA+ compliant."
        badge={{ label: `${filteredLogs.length} Records`, color: 'blue' }}
        action={
          <PrimaryBtn
            icon={<Download className="w-4 h-4" />}
            onClick={exportAuditTrailCsv}
          >
            Export to CSV
          </PrimaryBtn>
        }
      />

      {/* Filter Bar */}
      <Card className="!p-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search action, reason, batch, SSCC or user..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white"
            />
          </div>

          {/* Module Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            >
              <option value="ALL">All Modules</option>
              {modules.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* User Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            >
              <option value="ALL">All Users</option>
              {users.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Table Card */}
      <Card noPad>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap">Timestamp (IST)</th>
                <th className="px-4 py-3.5">User / Role</th>
                <th className="px-4 py-3.5">Action Event</th>
                <th className="px-4 py-3.5">Module</th>
                <th className="px-4 py-3.5">Reference / SSCC</th>
                <th className="px-4 py-3.5">Change Delta</th>
                <th className="px-4 py-3.5">Mandatory Reason</th>
                <th className="px-4 py-3.5 text-center">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-500 font-medium italic">
                    No audit records match the current filters.
                  </td>
                </tr>
              )}
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition">
                  <td className="px-5 py-3 font-mono text-xs text-slate-700 font-semibold whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900 text-xs">{log.userName}</div>
                    <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] rounded font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">{log.userRole}</span>
                  </td>
                  <td className="px-4 py-3 font-mono font-black text-xs text-slate-900 whitespace-nowrap">
                    {log.action}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${moduleColors[log.module] || 'bg-slate-100 text-slate-700'}`}>
                      {log.module}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {log.batchRef && <div className="font-bold text-slate-900">{log.batchRef}</div>}
                    {log.drumRef && <div className="text-slate-600 font-medium">Drum #{log.drumRef}</div>}
                    {log.sscc && (
                      <div className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                        {log.sscc}
                      </div>
                    )}
                    {!log.batchRef && !log.sscc && <span className="text-slate-400 font-bold">—</span>}
                  </td>
                  <td className="px-4 py-3 max-w-xs font-sans text-xs">
                    {log.oldValue && (
                      <div className="text-rose-600 line-through text-xs font-mono font-semibold truncate">{log.oldValue}</div>
                    )}
                    {log.newValue && (
                      <div className="text-slate-900 font-bold text-xs font-mono truncate">{log.newValue}</div>
                    )}
                    {!log.oldValue && !log.newValue && <span className="text-slate-400 font-bold">—</span>}
                  </td>
                  <td className="px-4 py-3 font-sans text-xs italic text-slate-700 font-medium max-w-xs">
                    {log.reason || <span className="text-slate-400 not-italic font-bold">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                      log.outcome === 'SUCCESS'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-rose-50 text-rose-800 border-rose-300'
                    }`}>
                      {log.outcome}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Displaying <strong>{filteredLogs.length}</strong> of <strong>{auditLogs.length}</strong> verified audit records
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Tamper-Proof Cryptographic Sequence · ALCOA+ Compliant
          </span>
        </div>
      </Card>
    </div>
  );
};
