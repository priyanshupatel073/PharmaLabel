import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, ProductStatus } from '../../types';
import { Search, Plus, Edit3, FileCheck2, CheckCircle, Eye } from 'lucide-react';
import { PageHeader, Card, PrimaryBtn, SecondaryBtn, StatusBadge, Modal, FormField, Input, Select, Textarea } from '../ui';

export const ProductMasterView: React.FC = () => {
  const { products, currentUser, addProduct, updateProduct, approveProductChange } = useApp();
  const [search, setSearch] = useState('');
  const [pharmFilter, setPharmFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [modalTab, setModalTab] = useState<'general'|'regulatory'|'custom'>('general');
  const [changeReason, setChangeReason] = useState('');
  const [diffProduct, setDiffProduct] = useState<Product | null>(null);
  const [reviewReason, setReviewReason] = useState('');

  const [form, setForm] = useState<Omit<Product,'id'|'status'>>({
    name:'', code:'', apiName:'', brandName:'', gtin14:'',
    mfgLicenseNumber:'HP/MNB/08/123-A',
    storageConditions:'Store below 25°C in well-closed containers.',
    ndc:'', casNumber:'', pharmacopeia:'IP', potencyAssay:'',
    hsCode:'', countryOfOrigin:'India',
    cautionText:'FOR PHARMACEUTICAL MANUFACTURING USE ONLY.',
    customField1:'', customField2:'', customField3:''
  });

  const openAdd = () => {
    setEditingProduct(null);
    setForm({ name:'', code:'', apiName:'', brandName:'', gtin14:'', mfgLicenseNumber:'HP/MNB/08/123-A',
      storageConditions:'Store below 25°C in well-closed containers.', ndc:'', casNumber:'', pharmacopeia:'IP',
      potencyAssay:'', hsCode:'', countryOfOrigin:'India', cautionText:'FOR PHARMACEUTICAL MANUFACTURING USE ONLY.',
      customField1:'', customField2:'', customField3:'' });
    setChangeReason(''); setModalTab('general'); setIsModalOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({ name:p.name, code:p.code, apiName:p.apiName, brandName:p.brandName, gtin14:p.gtin14,
      mfgLicenseNumber:p.mfgLicenseNumber, storageConditions:p.storageConditions, ndc:p.ndc,
      casNumber:p.casNumber, pharmacopeia:p.pharmacopeia, potencyAssay:p.potencyAssay,
      hsCode:p.hsCode, countryOfOrigin:p.countryOfOrigin, cautionText:p.cautionText,
      customField1:p.customField1||'', customField2:p.customField2||'', customField3:p.customField3||'' });
    setChangeReason(''); setModalTab('general'); setIsModalOpen(true);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) updateProduct(editingProduct.id, form, changeReason || 'Product update');
    else addProduct(form as any, changeReason || 'New product registration');
    setIsModalOpen(false);
  };

  const filtered = products.filter(p => {
    const s = search.toLowerCase();
    return (p.name.toLowerCase().includes(s) || p.code.toLowerCase().includes(s) || p.gtin14.includes(s))
      && (pharmFilter === 'ALL' || p.pharmacopeia === pharmFilter);
  });

  const pharmColor: Record<string, string> = {
    IP: 'bg-blue-100 text-blue-700', USP: 'bg-purple-100 text-purple-700',
    BP: 'bg-teal-100 text-teal-700', EP: 'bg-amber-100 text-amber-700', JP: 'bg-rose-100 text-rose-700',
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Product Master"
        subtitle="Authorized pharmaceutical APIs, monograph specs, 14-digit GTINs, and QA maker-checker approvals."
        action={
          currentUser.role !== 'Operator' ? (
            <PrimaryBtn onClick={openAdd} icon={<Plus className="w-4 h-4" />}>Add Product</PrimaryBtn>
          ) : undefined
        }
      />

      {/* Filter Bar */}
      <Card>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search product, code, or GTIN-14..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium shrink-0">Standard:</span>
            <Select value={pharmFilter} onChange={e => setPharmFilter(e.target.value)} className="w-auto">
              <option value="ALL">All Pharmacopeias</option>
              <option value="IP">IP – Indian</option>
              <option value="USP">USP – American</option>
              <option value="BP">BP – British</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Table Card */}
      <Card noPad>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-4">Product / API</th>
                <th className="px-4 py-4">Code</th>
                <th className="px-4 py-4">GTIN-14</th>
                <th className="px-4 py-4">Standard</th>
                <th className="px-4 py-4">Assay</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition">
                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">{p.apiName}</div>
                  </td>
                  <td className="px-4 py-4 font-mono font-bold text-slate-900 text-xs">{p.code}</td>
                  <td className="px-4 py-4 font-mono font-medium text-slate-700 text-xs">{p.gtin14}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${pharmColor[p.pharmacopeia] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                      {p.pharmacopeia}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-mono text-xs font-semibold text-slate-800">{p.potencyAssay}</td>
                  <td className="px-4 py-4"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {p.status === 'Pending Approval' && (currentUser.role === 'Supervisor' || currentUser.role === 'SuperAdmin') && (
                        <button onClick={() => { setDiffProduct(p); setReviewReason(''); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition">
                          <FileCheck2 className="w-3.5 h-3.5" /> Review QA
                        </button>
                      )}
                      {currentUser.role !== 'Operator' ? (
                        <button onClick={() => openEdit(p)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-100 rounded-xl text-slate-800 text-xs font-bold shadow-xs transition">
                          <Edit3 className="w-3.5 h-3.5 text-slate-600" /> Edit
                        </button>
                      ) : (
                        <button onClick={() => openEdit(p)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-700 text-xs font-semibold transition">
                          <Eye className="w-3.5 h-3.5 text-slate-500" /> View Specs
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500 font-medium">No products found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <Modal
          onClose={() => setIsModalOpen(false)}
          title={editingProduct ? `Edit: ${editingProduct.code}` : 'Register New Product'}
          subtitle="Complete all tabs and provide a mandatory change reason."
          maxW="max-w-2xl"
        >
          {/* Tabs */}
          <div className="flex border-b border-slate-100 -mt-1 mb-5 text-xs">
            {(['general','regulatory','custom'] as const).map(tab => (
              <button key={tab} type="button" onClick={() => setModalTab(tab)}
                className={`px-4 py-2 font-semibold capitalize border-b-2 -mb-px transition ${
                  modalTab === tab ? 'border-brand-500 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}>
                {tab === 'general' ? '1. Identity' : tab === 'regulatory' ? '2. Regulatory' : '3. Custom Fields'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {modalTab === 'general' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <FormField label="Product Trade Name" required>
                    <Input value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="Paracetamol Pure API..." required />
                  </FormField>
                </div>
                <FormField label="Product Code" required>
                  <Input className="font-mono" value={form.code} onChange={e => setForm({...form, code:e.target.value})} placeholder="API-PARA-01" required />
                </FormField>
                <FormField label="Generic API Name" required>
                  <Input value={form.apiName} onChange={e => setForm({...form, apiName:e.target.value})} required />
                </FormField>
                <div className="sm:col-span-2">
                  <FormField label="Storage Conditions" required>
                    <Input value={form.storageConditions} onChange={e => setForm({...form, storageConditions:e.target.value})} required />
                  </FormField>
                </div>
                <div className="sm:col-span-2">
                  <FormField label="Caution / Hazard Text" required>
                    <Input value={form.cautionText} onChange={e => setForm({...form, cautionText:e.target.value})} required />
                  </FormField>
                </div>
              </div>
            )}

            {modalTab === 'regulatory' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="14-Digit GTIN" required>
                  <Input className="font-mono" maxLength={14} value={form.gtin14} onChange={e => setForm({...form, gtin14:e.target.value})} placeholder="08901234567890" required />
                </FormField>
                <FormField label="Pharmacopeia Standard" required>
                  <Select value={form.pharmacopeia} onChange={e => setForm({...form, pharmacopeia:e.target.value as any})}>
                    <option value="IP">IP – Indian Pharmacopoeia</option>
                    <option value="USP">USP – US Pharmacopeia</option>
                    <option value="BP">BP – British Pharmacopoeia</option>
                    <option value="EP">EP – European Pharmacopoeia</option>
                    <option value="JP">JP – Japanese Pharmacopoeia</option>
                  </Select>
                </FormField>
                <FormField label="CAS Registry Number">
                  <Input className="font-mono" value={form.casNumber} onChange={e => setForm({...form, casNumber:e.target.value})} placeholder="103-90-2" />
                </FormField>
                <FormField label="Assay / Potency Specification" required>
                  <Input className="font-mono" value={form.potencyAssay} onChange={e => setForm({...form, potencyAssay:e.target.value})} placeholder="99.5% - 100.5%" required />
                </FormField>
              </div>
            )}

            {modalTab === 'custom' && (
              <div className="space-y-3">
                <FormField label="Custom Field 1 (e.g. Mesh Size)">
                  <Input value={form.customField1||''} onChange={e => setForm({...form, customField1:e.target.value})} />
                </FormField>
                <FormField label="Custom Field 2 (e.g. Solubility)">
                  <Input value={form.customField2||''} onChange={e => setForm({...form, customField2:e.target.value})} />
                </FormField>
                <FormField label="Custom Field 3">
                  <Input value={form.customField3||''} onChange={e => setForm({...form, customField3:e.target.value})} />
                </FormField>
              </div>
            )}

            {/* Reason */}
            <div className="pt-3 border-t border-slate-100">
              <FormField label="Reason for Change (Audit Requirement)" required>
                <Input value={changeReason} onChange={e => setChangeReason(e.target.value)} placeholder="e.g. Regular monograph review" required />
              </FormField>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition">Cancel</button>
              <PrimaryBtn type="submit">
                {currentUser.role === 'Supervisor' || currentUser.role === 'SuperAdmin' ? 'Save & Authorize' : 'Submit for QA Review'}
              </PrimaryBtn>
            </div>
          </form>
        </Modal>
      )}

      {/* Maker-Checker Diff Modal */}
      {diffProduct && (
        <Modal onClose={() => setDiffProduct(null)} title="QA Maker-Checker Review" subtitle={`${diffProduct.name} — Proposed changes by ${diffProduct.updatedBy}`}>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs space-y-2">
              <div className="font-bold text-amber-950 text-sm">Change Request Details:</div>
              <div className="text-amber-900 font-medium"><strong>Reason:</strong> "{diffProduct.changeReason}"</div>
              {diffProduct.pendingChanges && (
                <div className="mt-2 bg-white rounded-xl p-3 border border-amber-200 font-mono text-[11px] space-y-1.5">
                  {Object.entries(diffProduct.pendingChanges).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between">
                      <span className="text-slate-600 font-semibold">{k}:</span>
                      <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <FormField label="Supervisor Review Remarks">
              <Input value={reviewReason} onChange={e => setReviewReason(e.target.value)} placeholder="e.g. Verified against USP 44 monograph certificate" />
            </FormField>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setDiffProduct(null)} className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition">Close</button>
              <button onClick={() => { approveProductChange(diffProduct.id, false, reviewReason); setDiffProduct(null); }}
                className="px-4 py-2 text-xs bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100 rounded-xl font-bold transition shadow-xs">
                Reject Changes
              </button>
              <PrimaryBtn type="button" onClick={() => { approveProductChange(diffProduct.id, true, reviewReason); setDiffProduct(null); }}
                icon={<CheckCircle className="w-4 h-4" />}>
                Approve & Activate
              </PrimaryBtn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
