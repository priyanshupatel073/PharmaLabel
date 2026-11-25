import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Organization } from '../types';
import {
  Building2,
  ShieldCheck,
  Plus,
  KeyRound,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  HardDriveDownload,
  Server,
  Layers,
  ArrowUpRight,
  RefreshCw,
  X
} from 'lucide-react';

export const SuperAdminPage: React.FC = () => {
  const {
    organizations,
    onboardOrganization,
    updateOrganizationLicense,
    auditLogs
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'WARNING' | 'SUSPENDED'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);

  // Form state for new onboarding
  const [newOrgName, setNewOrgName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newGs1Prefix, setNewGs1Prefix] = useState('890');
  const [newEdition, setNewEdition] = useState<Organization['edition']>('Enterprise Unlimited Traceability');
  const [newValidUntil, setNewValidUntil] = useState('2027-12-31');

  // Filtered organizations
  const filteredOrgs = organizations.filter(org => {
    const matchesSearch =
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.plantLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.gs1Prefix.includes(searchQuery);

    const matchesStatus = statusFilter === 'ALL' || org.licenseStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalDrums = organizations.reduce((acc, o) => acc + o.totalDrumsPrinted, 0);
  const activeCount = organizations.filter(o => o.licenseStatus === 'ACTIVE').length;
  const warningCount = organizations.filter(o => o.licenseStatus === 'WARNING').length;
  const suspendedCount = organizations.filter(o => o.licenseStatus === 'SUSPENDED' || o.licenseStatus === 'EXPIRED').length;

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName || !newEmail || !newGs1Prefix) return;

    onboardOrganization({
      name: newOrgName,
      plantLocation: newLocation || 'Primary Manufacturing Site',
      contactEmail: newEmail,
      gs1Prefix: newGs1Prefix,
      edition: newEdition,
      licenseStatus: 'ACTIVE',
      validUntil: newValidUntil
    });

    // Reset
    setNewOrgName('');
    setNewLocation('');
    setNewEmail('');
    setNewGs1Prefix('890');
    setModalOpen(false);
  };

  const handleRenewOneYear = (org: Organization) => {
    const currentYear = parseInt(org.validUntil.slice(0, 4), 10) || 2026;
    const nextValidUntil = `${currentYear + 1}${org.validUntil.slice(4)}`;
    updateOrganizationLicense(org.id, 'ACTIVE', nextValidUntil);
  };

  const handleToggleSuspend = (org: Organization) => {
    const newStatus = org.licenseStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    updateOrganizationLicense(org.id, newStatus);
  };

  return (
    <div className="space-y-6">
      {/* Platform Header */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-purple-800/40 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-purple-500/30 text-purple-200 border border-purple-400/30">
              Camel Communication Cloud Control
            </span>
            <span className="text-xs text-purple-200">Platform SuperAdmin Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Multi-Tenant Organization & License Portal
          </h1>
          <p className="text-xs sm:text-sm text-purple-200/80 mt-1.5 leading-relaxed">
            Centralized provisioning hub for onboarding pharmaceutical manufacturers, assigning certified GS1 Company Prefixes, monitoring server SLAs, and enforcing 21 CFR Part 11 licensing entitlements.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 relative z-10">
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2.5 bg-white text-purple-900 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-purple-50 shadow-lg transition active:scale-95"
          >
            <Plus className="w-4 h-4 text-purple-700" />
            Onboard New Pharma Company
          </button>

          <div className="flex items-center gap-2 bg-purple-950/60 border border-purple-700/50 px-3.5 py-2 rounded-xl text-xs text-purple-200">
            <Server className="w-4 h-4 text-emerald-400" />
            <span>Hostinger Production Cluster: <strong className="text-white">Active (99.98% SLA)</strong></span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Onboarded Plants</span>
            <Building2 className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{organizations.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Multi-Tenant Client Workspaces</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Active Licenses</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">{activeCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">{warningCount} expiring soon, {suspendedCount} suspended</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Serialized Drums</span>
            <Layers className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalDrums.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">GS1 SSCC Mod-10 Compliant</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Database Backup</span>
            <HardDriveDownload className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-600 mt-2">Encrypted</div>
          <div className="text-[11px] text-slate-500 mt-1">Daily snapshot: 03:00 IST</div>
        </div>
      </div>

      {/* Organizations Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Table Controls */}
        <div className="p-5 border-b border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by company name, Org ID, GS1 prefix..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            {(['ALL', 'ACTIVE', 'WARNING', 'SUSPENDED'] as const).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === status
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Org ID & Company</th>
                <th className="py-3 px-4">Plant Location</th>
                <th className="py-3 px-4">Certified GS1 Prefix</th>
                <th className="py-3 px-4">Edition</th>
                <th className="py-3 px-4">Valid Until</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredOrgs.map(org => {
                const isSuspended = org.licenseStatus === 'SUSPENDED' || org.licenseStatus === 'EXPIRED';
                const isWarning = org.licenseStatus === 'WARNING';

                return (
                  <tr key={org.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-xs">{org.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                        <span className="px-1.5 py-0.2 bg-slate-100 rounded text-slate-700 font-semibold">{org.id}</span>
                        <span>· {org.contactEmail}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {org.plantLocation}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-slate-900 bg-brand-50 text-brand-700 px-2 py-0.5 rounded border border-brand-200">
                        {org.gs1Prefix}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                      {org.edition}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-800">
                      {org.validUntil}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        org.licenseStatus === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isWarning
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          org.licenseStatus === 'ACTIVE'
                            ? 'bg-emerald-500'
                            : isWarning
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`} />
                        {org.licenseStatus}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRenewOneYear(org)}
                          title="Extend license validity by +1 Year"
                          className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold rounded-lg transition border border-brand-200 flex items-center gap-1 text-[11px]"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Renew +1 Yr
                        </button>

                        <button
                          onClick={() => handleToggleSuspend(org)}
                          className={`px-2.5 py-1 font-bold rounded-lg transition border text-[11px] ${
                            isSuspended
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          {isSuspended ? 'Reactivate' : 'Suspend'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboard Company Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 text-slate-900 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Onboard New Pharma Client</h3>
                  <p className="text-[11px] text-slate-500">Assign Org ID, GS1 Prefix & Issue License SLA</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Company Legal Entity Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zydus Lifesciences Ltd."
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Manufacturing Plant Location / Unit
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ankleshwar, Gujarat (API Unit 01)"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Plant IT / QA Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="qa.plant@zydus.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Certified GS1 Prefix *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={9}
                    placeholder="8905555"
                    value={newGs1Prefix}
                    onChange={(e) => setNewGs1Prefix(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    License Edition
                  </label>
                  <select
                    value={newEdition}
                    onChange={(e) => setNewEdition(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    <option value="Enterprise Unlimited Traceability">Enterprise Unlimited</option>
                    <option value="Standard GxP Plant Edition">Standard GxP Plant</option>
                    <option value="Multi-Plant Global">Multi-Plant Global</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    value={newValidUntil}
                    onChange={(e) => setNewValidUntil(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition"
                >
                  Provision Tenant & Issue License
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
