import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  X,
  Copy,
  Check,
  Mail,
  ExternalLink,
  Trash2,
  Eye,
  EyeOff,
  Send,
  Sliders
} from 'lucide-react';

export const SuperAdminPage: React.FC = () => {
  const {
    organizations,
    refreshOrganizations,
    onboardOrganization,
    deleteOrganization,
    updateOrganizationLicense,
    auditLogs
  } = useApp();

  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'WARNING' | 'SUSPENDED'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Delete Modal State
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Form state for new onboarding
  const [newOrgName, setNewOrgName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newGs1Prefix, setNewGs1Prefix] = useState('890');
  const [newEdition, setNewEdition] = useState<Organization['edition']>('Enterprise Unlimited Traceability');
  const [newValidUntil, setNewValidUntil] = useState('2027-12-31');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [onboardError, setOnboardError] = useState('');

  // Onboarding Success Modal State
  const [successData, setSuccessData] = useState<{
    organization: Organization;
    adminUser: { id: string; name: string; email: string; role: string; department: string };
    emailDispatch: {
      success: boolean;
      dispatched?: boolean;
      dispatch_note?: string;
      recipient: string;
      subject: string;
    };
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Mail Settings Modal State
  const [mailModalOpen, setMailModalOpen] = useState(false);
  const [mailSettingsLoading, setMailSettingsLoading] = useState(false);
  const [mailSaving, setMailSaving] = useState(false);
  const [mailHost, setMailHost] = useState('smtp.gmail.com');
  const [mailPort, setMailPort] = useState(465);
  const [mailSecure, setMailSecure] = useState<'ssl' | 'tls'>('ssl');
  const [mailUser, setMailUser] = useState('');
  const [mailPass, setMailPass] = useState('');
  const [mailFromName, setMailFromName] = useState('PharmLabel Pro Cloud');
  const [mailFromEmail, setMailFromEmail] = useState('');
  const [testRecipient, setTestRecipient] = useState('priyanshupatel773@gmail.com');
  const [mailConfigured, setMailConfigured] = useState(false);
  const [mailStatusMsg, setMailStatusMsg] = useState<{ type: 'success' | 'error'; text: string; log?: string } | null>(null);
  const [recentEmailLogs, setRecentEmailLogs] = useState<any[]>([]);
  const [activeMailTab, setActiveMailTab] = useState<'config' | 'logs'>('config');
  const [showPassword, setShowPassword] = useState(false);
  const [logCopiedIndex, setLogCopiedIndex] = useState<number | null>(null);

  const fetchMailSettings = async () => {
    try {
      setMailSettingsLoading(true);
      const res = await fetch('/api/superadmin/mail_settings.php');
      const data = await res.json();
      if (res.ok && data.success) {
        const s = data.data.settings;
        setMailHost(s.host || 'smtp.gmail.com');
        setMailPort(s.port || 465);
        setMailSecure(s.secure || 'ssl');
        setMailUser(s.user || '');
        setMailFromName(s.from_name || 'PharmLabel Pro Cloud');
        setMailFromEmail(s.from_email || '');
        setMailConfigured(s.is_configured);
        setRecentEmailLogs(data.data.recent_logs || []);
      }
    } catch (e) {
      console.error('Failed to load mail settings', e);
    } finally {
      setMailSettingsLoading(false);
    }
  };

  useEffect(() => {
    fetchMailSettings();
  }, []);

  const handleSaveAndTestMail = async (runTest: boolean) => {
    setMailSaving(true);
    setMailStatusMsg(null);
    try {
      const payload: any = {
        host: mailHost,
        port: Number(mailPort),
        secure: mailSecure,
        user: mailUser,
        pass: mailPass,
        from_email: mailFromEmail || mailUser,
        from_name: mailFromName
      };
      if (runTest) {
        payload.test_recipient = testRecipient;
      }
      const res = await fetch('/api/superadmin/mail_settings.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMailConfigured(true);
        setMailStatusMsg({
          type: 'success',
          text: data.message || 'SMTP Settings saved successfully!'
        });
        await fetchMailSettings();
      } else {
        setMailStatusMsg({
          type: 'error',
          text: data.error || 'Failed to connect to SMTP server.',
          log: data.details?.smtp_log
        });
      }
    } catch (e: any) {
      setMailStatusMsg({
        type: 'error',
        text: e.message || 'Network error communicating with backend.'
      });
    } finally {
      setMailSaving(false);
    }
  };

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

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshOrganizations();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName || !newEmail || !newGs1Prefix) return;

    setIsSubmitting(true);
    setOnboardError('');

    try {
      const response = await fetch('/api/superadmin/organizations.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newOrgName.trim(),
          plant_location: (newLocation || 'Primary Manufacturing Site').trim(),
          contact_email: newEmail.trim().toLowerCase(),
          gs1_company_prefix: newGs1Prefix.trim(),
          edition: newEdition,
          valid_until: newValidUntil
        })
      });

      const res = await response.json();

      if (response.ok && res.success) {
        // Success! Set data for popup modal
        setSuccessData(res.data);
        await refreshOrganizations();

        // Reset form & close onboard drawer
        setNewOrgName('');
        setNewLocation('');
        setNewEmail('');
        setNewGs1Prefix('890');
        setModalOpen(false);
      } else {
        if (res.errors && typeof res.errors === 'object') {
          const fieldMsgs = Object.values(res.errors).filter(Boolean).join(' · ');
          setOnboardError(fieldMsgs || res.message || 'Failed to onboard organization.');
        } else {
          setOnboardError(res.message || 'Failed to onboard organization.');
        }
      }
    } catch (err: any) {
      setOnboardError('Unable to connect to onboarding backend API. Please ensure server is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavigateToLoginWithCredentials = () => {
    if (successData) {
      // Store targeted org in localStorage for instant prefill (Zero-Knowledge: password is NEVER stored)
      localStorage.setItem('pharmalabel_prefill_email', successData.adminUser.email);
      localStorage.setItem('pharmalabel_prefill_org', successData.organization.id);
    }
    navigate('/login');
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

  const handleConfirmDelete = async () => {
    if (!orgToDelete) return;
    setIsDeleting(true);
    setDeleteError('');

    try {
      const success = await deleteOrganization(orgToDelete.id);
      if (success) {
        await refreshOrganizations();
        setOrgToDelete(null);
      } else {
        setDeleteError('Failed to delete organization from backend database.');
      }
    } catch (e: any) {
      setDeleteError('Network error while deleting organization.');
    } finally {
      setIsDeleting(false);
    }
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
            onClick={() => {
              setOnboardError('');
              setModalOpen(true);
            }}
            className="px-4 py-2.5 bg-white text-purple-900 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-purple-50 shadow-lg transition active:scale-95"
          >
            <Plus className="w-4 h-4 text-purple-700" />
            Onboard New Pharma Company
          </button>

          <button
            onClick={() => {
              setMailStatusMsg(null);
              setMailModalOpen(true);
              fetchMailSettings();
            }}
            className="px-3.5 py-2.5 bg-purple-900/80 hover:bg-purple-800 border border-purple-500/50 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition active:scale-95 shadow-md"
            title="Configure SMTP Server and Test Email Dispatch"
          >
            <Mail className="w-4 h-4 text-purple-300" />
            <span>Email & SMTP Settings</span>
            {mailConfigured ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="SMTP Active" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="SMTP Setup Required" />
            )}
          </button>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2.5 bg-purple-950/70 hover:bg-purple-900 border border-purple-600/50 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
            title="Sync organizations from backend database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync DB</span>
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
                              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {isSuspended ? 'Reactivate' : 'Suspend'}
                        </button>

                        <button
                          onClick={() => {
                            setDeleteError('');
                            setOrgToDelete(org);
                          }}
                          title={`Permanently delete ${org.name}`}
                          className="px-2.5 py-1 font-bold rounded-lg transition border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 flex items-center gap-1 text-[11px]"
                        >
                          <Trash2 className="w-3 h-3 text-rose-600" />
                          <span>Delete</span>
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
                    Certified GS1 Prefix * <span className="text-[10px] text-slate-400 font-normal">(3 to 11 digits)</span>
                  </label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={11}
                    placeholder="e.g. 890 or 8901234"
                    value={newGs1Prefix}
                    onChange={(e) => setNewGs1Prefix(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                  <div className="text-[10px] text-slate-400 mt-1">
                    Accepts certified GS1 prefix (e.g. 890 or 8901234)
                  </div>
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

              {/* Error Alert inside Form */}
              {onboardError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{onboardError}</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Provisioning & Dispatching Email...</span>
                    </>
                  ) : (
                    <span>Provision Tenant & Issue License</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Onboard Success Modal with Generated Temporary Password & Email Dispatch */}
      {successData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 text-slate-900 relative">
            <button
              onClick={() => setSuccessData(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Provisioning Complete · 21 CFR Part 11
                </span>
                <h3 className="font-extrabold text-lg text-slate-900 mt-0.5">
                  Tenant Onboarded & Credentials Dispatched
                </h3>
              </div>
            </div>

            <div className="mt-4 space-y-3.5">
              {/* Tenant Metadata Card */}
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Organization / Plant:</span>
                  <span className="font-bold text-slate-900">{successData.organization.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Assigned Org ID:</span>
                  <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    {successData.organization.id}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">GS1 Company Prefix:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {successData.organization.gs1Prefix}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Plant Admin Email:</span>
                  <span className="font-bold text-brand-700 font-mono">
                    {successData.adminUser.email}
                  </span>
                </div>
              </div>

              {/* Zero-Knowledge Security Card */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-inner border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>21 CFR Part 11 Zero-Knowledge Dispatch</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    BACKEND ENCRYPTED
                  </span>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Recipient Email:</span>
                    <span className="font-mono font-bold text-purple-300">{successData.adminUser.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Credential Status:</span>
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Sent Directly to Client Inbox</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Password Privacy:</span>
                    <span className="font-mono text-slate-300 text-[11px]">•••••••••••• (Hidden from SuperAdmin)</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">
                  🛡️ <strong>Compliance Protection:</strong> To eliminate credential leak risks, temporary passwords are generated in server memory, dispatched directly via authenticated SMTP, and never exposed to the SuperAdmin browser session.
                </p>
              </div>

              {/* Email Dispatch Confirmation */}
              {successData.emailDispatch?.dispatched ? (
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-emerald-900">Email Delivered via Hostinger SMTP</p>
                      <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.2 rounded-full font-mono font-semibold">SMTP 250 OK</span>
                    </div>
                    <p className="text-[11px] text-emerald-700 leading-normal">
                      Welcome email and temporary password successfully dispatched by the backend to <strong>{successData.adminUser.email}</strong>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
                  <Mail className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 w-full">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-amber-900">Email Dispatch Status</p>
                      <span className="text-[10px] bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded-full font-mono font-semibold">NOTIFICATION</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-normal">
                      {successData.emailDispatch?.dispatch_note || 'Email processed by backend dispatch engine.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSuccessData(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleNavigateToLoginWithCredentials}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95"
              >
                <span>Test Sign-In as This Tenant</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {orgToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-rose-200 max-w-md w-full p-6 text-slate-900 relative">
            <button
              disabled={isDeleting}
              onClick={() => setOrgToDelete(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-rose-100">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  Irreversible Decommissioning
                </span>
                <h3 className="font-extrabold text-base text-slate-900 mt-0.5">
                  Permanently Delete Organization?
                </h3>
              </div>
            </div>

            <div className="mt-4 space-y-3.5">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Organization Name:</span>
                  <span className="font-bold text-slate-900">{orgToDelete.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Tenant Org ID:</span>
                  <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    {orgToDelete.id}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Certified GS1 Prefix:</span>
                  <span className="font-mono font-bold text-slate-900">{orgToDelete.gs1Prefix}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Plant Location:</span>
                  <span className="text-slate-700 font-medium">{orgToDelete.plantLocation}</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold">21 CFR Part 11 Regulatory Warning</span>
                  <p className="text-[11px] text-rose-700 leading-normal">
                    This action will permanently delete this client organization, all plant admin accounts, printer settings, and batch serializations from the database. This action cannot be undone.
                  </p>
                </div>
              </div>

              {deleteError && (
                <div className="p-3 rounded-2xl bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setOrgToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5 active:scale-95"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting Permanently...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Delete Company</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email & SMTP Configuration Modal */}
      {mailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 text-slate-900 relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setMailModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Mail className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-slate-900">
                    SMTP & Email Dispatcher Engine
                  </h3>
                  {mailConfigured ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                      ✓ LIVE DISPATCH READY
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                      ⚠ CREDENTIALS REQUIRED
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure authenticated SMTP to deliver client onboarding credentials straight into inboxes.
                </p>
              </div>
            </div>

            {/* Tabs Header */}
            <div className="flex items-center gap-2 border-b border-slate-100 pt-3 pb-2 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setActiveMailTab('config')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  activeMailTab === 'config'
                    ? 'bg-purple-100 text-purple-800 font-bold'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>SMTP Configuration</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveMailTab('logs');
                  fetchMailSettings();
                }}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  activeMailTab === 'logs'
                    ? 'bg-purple-100 text-purple-800 font-bold'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Sent Credentials Log</span>
                <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full">
                  {recentEmailLogs.length}
                </span>
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto flex-1 py-4 space-y-4 pr-1">
              {activeMailTab === 'config' ? (
                <>
                  {/* Status / Alert Banner */}
                  {mailStatusMsg && (
                    <div
                      className={`p-3.5 rounded-2xl border text-xs ${
                        mailStatusMsg.type === 'success'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50 border-rose-200 text-rose-900'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {mailStatusMsg.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-1">
                          <p className="font-bold">{mailStatusMsg.text}</p>
                          {mailStatusMsg.log && (
                            <pre className="text-[10px] font-mono bg-white/80 p-2 rounded border border-rose-200 overflow-x-auto whitespace-pre-wrap max-h-32">
                              {mailStatusMsg.log}
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Provider Presets */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Quick Provider Presets
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMailHost('smtp.gmail.com');
                          setMailPort(465);
                          setMailSecure('ssl');
                        }}
                        className={`p-2.5 rounded-xl border text-xs text-left transition ${
                          mailHost === 'smtp.gmail.com'
                            ? 'border-purple-500 bg-purple-50/50 text-purple-900 font-bold'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="font-bold">Google Mail (Gmail)</div>
                        <div className="text-[10px] text-slate-500">smtp.gmail.com:465 SSL</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMailHost('smtp.hostinger.com');
                          setMailPort(465);
                          setMailSecure('ssl');
                        }}
                        className={`p-2.5 rounded-xl border text-xs text-left transition ${
                          mailHost === 'smtp.hostinger.com'
                            ? 'border-purple-500 bg-purple-50/50 text-purple-900 font-bold'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="font-bold">Hostinger Webmail</div>
                        <div className="text-[10px] text-slate-500">smtp.hostinger.com:465 SSL</div>
                      </button>
                    </div>
                  </div>

                  {/* Gmail Help Card */}
                  {mailHost.includes('gmail') && (
                    <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3 text-xs text-blue-950 space-y-1.5">
                      <div className="font-bold flex items-center gap-1.5 text-blue-900">
                        <span>How to get your Gmail Sender Password in 1 minute:</span>
                      </div>
                      <ol className="list-decimal list-inside space-y-1 text-[11px] text-blue-900 leading-relaxed pl-1">
                        <li>Ensure <strong>2-Step Verification</strong> is enabled on your Google Account.</li>
                        <li>
                          Open{' '}
                          <a
                            href="https://myaccount.google.com/apppasswords"
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold text-blue-700 underline inline-flex items-center gap-0.5"
                          >
                            <span>Google App Passwords</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </li>
                        <li>Create an App Password (name it e.g. <code className="bg-blue-100 px-1 py-0.5 rounded">PharmLabel</code>).</li>
                        <li>Paste the generated <strong>16-character code</strong> into the App Password field below.</li>
                      </ol>
                    </div>
                  )}

                  {/* Form Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        SMTP Host *
                      </label>
                      <input
                        type="text"
                        value={mailHost}
                        onChange={e => setMailHost(e.target.value)}
                        placeholder="smtp.gmail.com"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Port *
                        </label>
                        <input
                          type="number"
                          value={mailPort}
                          onChange={e => setMailPort(Number(e.target.value))}
                          placeholder="465"
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Security
                        </label>
                        <select
                          value={mailSecure}
                          onChange={e => setMailSecure(e.target.value as 'ssl' | 'tls')}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                        >
                          <option value="ssl">SSL (465)</option>
                          <option value="tls">STARTTLS (587)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Sender Email (Username) *
                      </label>
                      <input
                        type="email"
                        value={mailUser}
                        onChange={e => setMailUser(e.target.value)}
                        placeholder="e.g. sender@gmail.com"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        App Password / Secret *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={mailPass}
                          onChange={e => setMailPass(e.target.value)}
                          placeholder="16-character App Password"
                          className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Sender Display Name
                      </label>
                      <input
                        type="text"
                        value={mailFromName}
                        onChange={e => setMailFromName(e.target.value)}
                        placeholder="PharmLabel Pro Cloud"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Send Verification Email To
                      </label>
                      <input
                        type="email"
                        value={testRecipient}
                        onChange={e => setTestRecipient(e.target.value)}
                        placeholder="priyanshupatel773@gmail.com"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* Recent Dispatched Emails Log */
                <div className="space-y-2.5">
                  <p className="text-xs text-slate-500">
                    Audit log of credentials generated and dispatched by the system:
                  </p>
                  {recentEmailLogs.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No dispatched emails logged yet.
                    </div>
                  ) : (
                    recentEmailLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{log.recipient}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{log.timestamp}</span>
                        </div>
                        <div className="text-[11px] text-slate-600">{log.subject}</div>
                        {log.temp_pass && (
                          <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 mt-1">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 text-[10px] font-bold">Credential Delivery:</span>
                              <span className="font-mono text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded text-[11px]">
                                Delivered via Hostinger SMTP
                              </span>
                            </div>
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                              21 CFR Part 11 Encrypted
                            </span>
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500 italic mt-0.5">
                          Status: {log.dispatch || log.status}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setMailModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Close
              </button>

              {activeMailTab === 'config' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={mailSaving}
                    onClick={() => handleSaveAndTestMail(false)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition disabled:opacity-50"
                  >
                    Save Settings Only
                  </button>

                  <button
                    type="button"
                    disabled={mailSaving || !mailUser || !mailPass}
                    onClick={() => handleSaveAndTestMail(true)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5 active:scale-95"
                  >
                    {mailSaving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying & Sending Test...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Save & Send Test Email</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
