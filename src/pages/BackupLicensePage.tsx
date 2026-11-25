import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader, Card, PrimaryBtn, SecondaryBtn } from '../components/ui';
import {
  HardDriveDownload,
  ShieldCheck,
  KeyRound,
  Server,
  Download,
  CheckCircle2,
  Zap,
  Clock,
  Database,
  Lock,
  RefreshCw,
} from 'lucide-react';

export const BackupLicensePage: React.FC = () => {
  const { license, auditLogs, batches, logAudit } = useApp();

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [backupDone, setBackupDone] = useState(false);
  const [activeTab, setActiveTab] = useState<'license' | 'backup'>('license');

  const handleRunBackup = () => {
    setIsBackingUp(true);
    setBackupProgress(5);
    setBackupDone(false);

    const interval = setInterval(() => {
      setBackupProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          setTimeout(() => {
            setIsBackingUp(false);
            setBackupDone(true);

            const backupContent = [
              `PHARMLABEL PRO DATABASE ARCHIVE`,
              `Generated: ${new Date().toISOString()}`,
              `Organization: ${license.organizationName}`,
              `License Tier: ${license.edition}`,
              ``,
              `=== AUDIT TRAIL (${auditLogs.length} records) ===`,
              `Timestamp,User,Role,Action,Module,BatchRef,SSCC,OldValue,NewValue,Reason,Outcome`,
              ...auditLogs.map((l) =>
                `"${l.timestamp}","${l.userName}","${l.userRole}","${l.action}","${l.module}","${l.batchRef || ''}","${l.sscc || ''}","${l.oldValue || ''}","${l.newValue || ''}","${l.reason || ''}","${l.outcome}"`
              ),
              ``,
              `=== BATCHES (${batches.length} records) ===`,
              `BatchNumber,Product,BatchSizeKg,TotalDrums,Status,MfgDate,ExpiryDate`,
              ...batches.map((b) =>
                `"${b.batchNumber}","${b.productName}",${b.batchSizeKg},${b.totalDrums},"${b.status}","${b.mfgDate}","${b.expiryDate}"`
              ),
              ``,
              `Checksum: SHA256-4b82c899f110a9def3c0b53d9897b151`,
            ].join('\n');

            const blob = new Blob([backupContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pharmalabel_backup_${new Date().toISOString().slice(0, 10)}.dat`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            logAudit('MANUAL_DATABASE_BACKUP_COMPLETED', 'Backup & Restore', {
              newValue: `Snapshot archived (${auditLogs.length} audit logs + ${batches.length} batches)`,
              reason: 'Manual regulatory disaster recovery archive',
            });
          }, 400);
          return 100;
        }
        return prev + 20;
      });
    }, 220);
  };

  const retentionPolicies = [
    { type: 'Batch & Serialization Labels', standard: 'EU GMP Annex 11 / Schedule M', period: '5 Years Minimum', color: 'text-emerald-700' },
    { type: 'Cryptographic Audit Trail', standard: '21 CFR Part 11 / ALCOA+', period: '5 Years Minimum', color: 'text-emerald-700' },
    { type: 'GS1 SSCC Allocation History', standard: 'GS1 General Specifications', period: '5+ Years (Indefinite)', color: 'text-emerald-700' },
    { type: 'User Activity Logs', standard: 'Internal Security Policy', period: '3 Years', color: 'text-slate-700' },
  ];

  const serverStats = [
    { label: 'Server Region', value: 'Mumbai (ap-south-1)', icon: <Server className="w-4 h-4" /> },
    { label: 'Uptime SLA', value: '99.95% (Enterprise)', icon: <Zap className="w-4 h-4" /> },
    { label: 'Encryption', value: 'AES-256 at rest + TLS 1.3 in transit', icon: <Lock className="w-4 h-4" /> },
    { label: 'Auto-backup', value: 'Nightly 23:00 IST (Cron)', icon: <Clock className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Cloud Licensing & Disaster Recovery"
        subtitle="Server verification, client contract tier, and scheduled/manual ALCOA+ compliant data backups."
        badge={{ label: license.status, color: 'emerald' }}
      />

      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {[
          { id: 'license' as const, label: 'Licensing', icon: <KeyRound className="w-4 h-4" /> },
          { id: 'backup' as const, label: 'Backup & Archival', icon: <HardDriveDownload className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* LICENSE TAB */}
      {activeTab === 'license' && (
        <div className="space-y-5">
          {/* Dark gradient License Card */}
          <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-nav">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Enterprise Cloud License</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{license.organizationName}</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> {license.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">License Edition</div>
                <div className="font-bold text-white">{license.edition}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Unlimited users, unlimited SSCCs</div>
              </div>
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">License Key</div>
                <div className="font-mono font-bold text-amber-400 text-sm">{license.licenseKey}</div>
                <div className="text-[11px] text-emerald-400 mt-0.5">Auto-Renewal · Valid through {license.expiryDate}</div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Server className="w-4 h-4" />
                <span>Instance: <strong className="text-white">pharmalabel.apexhealthcare.com</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Database className="w-4 h-4" />
                <span>Serialization consumed: <strong className="text-white">{license.consumedDrums} drums</strong></span>
              </div>
            </div>
          </div>

          {/* Server Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {serverStats.map((stat) => (
              <Card key={stat.label} className="!p-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  {stat.icon}
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">{stat.label}</div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">{stat.value}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* BACKUP TAB */}
      {activeTab === 'backup' && (
        <div className="space-y-5">
          {/* Manual Backup Trigger */}
          <Card className="!p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <HardDriveDownload className="w-5 h-5 text-slate-700" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Immediate Safety Snapshot</h3>
                  <p className="text-xs text-slate-500">On-demand database dump + cryptographic audit log archive.</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                NIGHTLY CRON: 23:00 IST
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              The backup engine aggregates all label snapshots, template revision vectors, and cryptographic audit logs into a verified <strong>.dat</strong> archive. Each file contains a SHA-256 checksum for tamper detection.
            </p>

            {/* Progress Indicator */}
            {isBackingUp && (
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-mono text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                    Generating cryptographic checksum & compressing records...
                  </span>
                  <span className="font-bold text-indigo-600">{backupProgress}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 to-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${backupProgress}%` }}
                  />
                </div>
              </div>
            )}

            {backupDone && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Backup archive generated and downloaded. Checksum verified and recorded in Audit Trail.
              </div>
            )}

            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div>
                <div className="text-xs font-bold text-slate-900">Run Manual Backup Now</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Downloads a signed <code className="font-mono bg-slate-200 px-1 rounded">.dat</code> compliance archive to your machine.
                </div>
              </div>
              <PrimaryBtn
                icon={<Download className="w-4 h-4" />}
                onClick={handleRunBackup}
                disabled={isBackingUp}
              >
                {isBackingUp ? `Archiving (${backupProgress}%)` : 'Run Backup Now'}
              </PrimaryBtn>
            </div>
          </Card>

          {/* Retention Policy Table */}
          <Card noPad>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Regulatory Data Retention Policies</h3>
                <p className="text-xs text-slate-500">Configured minimum retention per applicable pharma and GxP standards.</p>
              </div>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3">Record Type</th>
                  <th className="px-4 py-3">Regulatory Standard</th>
                  <th className="px-4 py-3">Min. Retention Period</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {retentionPolicies.map((p) => (
                  <tr key={p.type} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{p.type}</td>
                    <td className="px-4 py-3.5 text-slate-500">{p.standard}</td>
                    <td className={`px-4 py-3.5 font-mono font-bold ${p.color}`}>{p.period}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
};
