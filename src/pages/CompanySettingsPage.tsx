import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Building2, Save, Barcode, Printer, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { PageHeader, Card, PrimaryBtn, FormField, Input, Select, Modal } from '../components/ui';

export const CompanySettingsPage: React.FC = () => {
  const { companySettings, updateCompanySettings } = useApp();
  const [form, setForm] = useState({ ...companySettings });
  const [reasonModal, setReasonModal] = useState(false);
  const [reason, setReason] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => { e.preventDefault(); setReasonModal(true); };
  const handleConfirm = () => {
    if (!reason.trim()) return;
    updateCompanySettings(form, reason);
    setReasonModal(false);
    setReason('');
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Company Master & GS1 Configuration"
        subtitle="Configure plant identity, certified GS1 serialization prefix, and thermal printer integration."
        badge={{ label: 'Admin Access', color: 'blue' }}
        action={
          <div className="flex items-center gap-2">
            {saved && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Saved & Logged
              </div>
            )}
            <PrimaryBtn type="button" onClick={handleSave} icon={<Save className="w-4 h-4" />}>
              Save Configuration
            </PrimaryBtn>
          </div>
        }
      />

      <form onSubmit={handleSave} className="space-y-5">
        {/* Plant Identity */}
        <Card>
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900">Manufacturing Plant Identity</div>
              <div className="text-[11px] text-slate-500">Legal entity details printed on every label</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Company Legal Name" required>
              <Input value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})} required />
            </FormField>
            <FormField label="Drug Mfg License No." required>
              <Input className="font-mono" value={form.mfgLicenseNumber} onChange={e => setForm({...form, mfgLicenseNumber: e.target.value})} required />
            </FormField>
            <FormField label="GSTIN" required>
              <Input className="font-mono" value={form.gstNumber} onChange={e => setForm({...form, gstNumber: e.target.value})} required />
            </FormField>
            <FormField label="Regulatory Email" required>
              <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            </FormField>
            <FormField label="Plant Facility Address" required>
              <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} required />
            </FormField>
          </div>
        </Card>

        {/* GS1 Engine */}
        <Card>
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
                <Barcode className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900">GS1 SSCC Serialization Engine</div>
                <div className="text-[11px] text-slate-500">18-digit container code with Mod-10 check digit</div>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold bg-purple-50 text-purple-700 px-2 py-1 rounded-xl border border-purple-200">
              GS1 MOD-10
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="GS1 Company Prefix (7-10 digits)" hint="Assigned by GS1 India" required>
              <Input className="font-mono font-bold" value={form.gs1CompanyPrefix} onChange={e => setForm({...form, gs1CompanyPrefix: e.target.value})} required />
            </FormField>
            <FormField label="Extension Digit (0-9)" hint="Container type indicator" required>
              <Input className="font-mono font-bold" maxLength={1} value={form.extensionDigit} onChange={e => setForm({...form, extensionDigit: e.target.value})} required />
            </FormField>
            <FormField label="Next Serial Reference Counter" hint="Auto-incremented on each label">
              <Input type="number" className="font-mono font-bold text-purple-800" value={form.nextSerialReference} onChange={e => setForm({...form, nextSerialReference: parseInt(e.target.value)||1})} required />
            </FormField>
          </div>

          {/* Live SSCC Preview */}
          <div className="mt-5 p-5 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl font-mono text-sm text-center border border-white/10 shadow-md">
            <div className="text-slate-300 text-xs font-bold uppercase tracking-widest mb-1.5">SSCC Preview (Next Label)</div>
            <div className="text-white font-black text-xl tracking-widest">
              ({`00`}) {form.extensionDigit} {form.gs1CompanyPrefix}{' '}
              {form.nextSerialReference.toString().padStart(17 - 1 - form.gs1CompanyPrefix.length, '0')}{' '}
              <span className="text-emerald-400 font-black">X</span>
            </div>
            <div className="text-[11px] text-slate-400 font-sans mt-1">Check digit 'X' is automatically calculated via GS1 Mod-10 at runtime</div>
          </div>
        </Card>

        {/* Printer Settings */}
        <Card>
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center">
              <Printer className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900">Thermal Printer Integration</div>
              <div className="text-[11px] text-slate-500">Default packaging line thermal printer config</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Default Printer Name">
              <Input value={form.printerName} onChange={e => setForm({...form, printerName: e.target.value})} />
            </FormField>
            <FormField label="Default Label Stock Dimension">
              <Select value={form.defaultLabelDimension} onChange={e => setForm({...form, defaultLabelDimension: e.target.value as any})}>
                <option value="4x6">4 × 6 inches (Standard API Drum)</option>
                <option value="6x4">6 × 4 inches (Wide Shipper)</option>
                <option value="4x4">4 × 4 inches (Square Pail)</option>
                <option value="3x2">3 × 2 inches (Small Container)</option>
              </Select>
            </FormField>
          </div>
        </Card>

        <div className="flex justify-end">
          <PrimaryBtn type="submit" icon={<Save className="w-4 h-4" />}>
            Save Configuration Changes
          </PrimaryBtn>
        </div>
      </form>

      {/* Mandatory Reason Modal */}
      {reasonModal && (
        <Modal onClose={() => setReasonModal(false)} title="Audit Compliance — Change Reason Required"
          subtitle="All configuration changes require a documented reason (21 CFR Part 11)">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
              <p>This action will modify company serialization parameters and will be permanently logged to the immutable audit trail with your identity, timestamp, and old/new values.</p>
            </div>
            <FormField label="Mandatory Reason for Change" required>
              <textarea
                rows={3}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Updated GS1 Company Prefix certificate for FY 2026-27"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
                required
              />
            </FormField>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setReasonModal(false)} className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition">Cancel</button>
              <PrimaryBtn type="button" onClick={handleConfirm} icon={<CheckCircle2 className="w-4 h-4" />}>
                Commit to Audit Log
              </PrimaryBtn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
