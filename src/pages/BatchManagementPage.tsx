import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Batch, Drum } from '../types';
import { Search, Plus, Scale, X, CheckCircle2, ShieldCheck } from 'lucide-react';
import { PageHeader, Card, PrimaryBtn, SecondaryBtn, StatusBadge, Modal, FormField, Input, Select } from '../components/ui';

export const BatchManagementPage: React.FC = () => {
  const { batches, products, currentUser, createBatch, updateDrumWeight, completeBatch, authorizeBatch } = useApp();

  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') ?? '';
  const setSearch = (val: string) => {
    setSearchParams(val ? { q: val } : {}, { replace: true });
  };
  const [manualSelection, setManualSelection] = useState<{ query: string; batchId: string } | null>(null);

  const matchedFromQuery = search
    ? batches.find(
        b =>
          b.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
          b.productName.toLowerCase().includes(search.toLowerCase())
      )
    : undefined;

  const selectedBatch: Batch | null =
    (manualSelection?.query === search
      ? batches.find(b => b.id === manualSelection.batchId)
      : undefined) ||
    matchedFromQuery ||
    batches[0] ||
    null;

  const setSelectedBatch = (batch: Batch) => {
    setManualSelection({ query: search, batchId: batch.id });
  };
  const [createModal, setCreateModal] = useState(false);
  const [weightDrum, setWeightDrum] = useState<Drum | null>(null);
  const [newNet, setNewNet] = useState(25.0);
  const [newGross, setNewGross] = useState(27.2);
  const [wtReason, setWtReason] = useState('');

  // Create form
  const [nbNum, setNbNum] = useState('');
  const [nbProduct, setNbProduct] = useState(products[0]?.id || '');
  const [nbSize, setNbSize] = useState(1000);
  const [nbDrums, setNbDrums] = useState(40);
  const [nbNet, setNbNet] = useState(25.0);
  const [nbMfg, setNbMfg] = useState('2026-11-23');
  const [nbExp, setNbExp] = useState('2031-11-22');

  const openCreate = () => {
    const active = products.filter(p => p.status === 'Active');
    setNbProduct(active[0]?.id || products[0]?.id || '');
    setNbNum(`BATCH-API-${new Date().getFullYear()}-${Math.floor(100 + Math.random()*900)}`);
    setCreateModal(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find(p => p.id === nbProduct);
    if (!prod) return;
    createBatch({
      batchNumber: nbNum, productId: prod.id, productName: prod.name,
      batchSizeKg: nbSize, totalDrums: nbDrums, defaultNetWeight: nbNet,
      mfgDate: nbMfg, expiryDate: nbExp, status: 'Pending'
    }, Array(nbDrums).fill(null).map(() => ({
      netWeight: nbNet, grossWeight: +(nbNet + 2.2).toFixed(2), tareWeight: 2.20
    })));
    setCreateModal(false);
  };

  const handleWeightSave = () => {
    if (!selectedBatch || !weightDrum || !wtReason.trim()) return;
    updateDrumWeight(selectedBatch.id, weightDrum.drumNumber, newNet, newGross, wtReason);
    setWeightDrum(null); setWtReason('');
  };

  const filtered = batches.filter(b =>
    b.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
    b.productName.toLowerCase().includes(search.toLowerCase())
  );

  const drumStatusColor = (status: string) => {
    if (status === 'Printed') return 'bg-emerald-100 text-emerald-700';
    if (status === 'Damaged') return 'bg-rose-100 text-rose-700';
    return 'bg-slate-100 text-slate-500';
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Batch & Drum Management"
        subtitle="Configure bulk manufacturing lots, drum container weights, and QA-authorized overrides."
        action={<PrimaryBtn onClick={openCreate} icon={<Plus className="w-4 h-4" />}>Create Batch</PrimaryBtn>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batch List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search batches..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
          </div>

          <div className="space-y-2">
            {filtered.map(b => {
              const printed = b.drums.filter(d => d.status === 'Printed').length;
              const isActive = selectedBatch?.id === b.id;
              return (
                <div key={b.id} onClick={() => setSelectedBatch(b)}
                  className={`p-4 rounded-2xl cursor-pointer transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-50/90 border-2 border-brand-500 shadow-sm ring-1 ring-brand-500/20'
                      : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-card'
                  }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-mono font-black text-sm ${isActive ? 'text-brand-900' : 'text-slate-900'}`}>{b.batchNumber}</span>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className={`text-[11px] font-bold truncate ${isActive ? 'text-slate-800' : 'text-slate-700'}`}>
                    {b.productName}
                  </div>
                  <div className={`mt-2 pt-2 border-t text-[11px] font-mono flex justify-between ${isActive ? 'border-brand-200 text-brand-900 font-bold' : 'border-slate-200 text-slate-600 font-semibold'}`}>
                    <span>Drums: <strong>{b.totalDrums}</strong></span>
                    <span>Printed: <strong>{printed}</strong></span>
                    <span>{b.expiryDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Drum Grid */}
        <div className="lg:col-span-2">
          {selectedBatch ? (
            <Card noPad>
              <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-base text-slate-900">{selectedBatch.batchNumber}</span>
                    <StatusBadge status={selectedBatch.status} />
                  </div>
                  <div className="text-xs text-slate-600 font-medium mt-0.5">{selectedBatch.productName} · {selectedBatch.batchSizeKg} Kg · Exp: {selectedBatch.expiryDate}</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {(currentUser.role === 'Supervisor' || currentUser.role === 'SuperAdmin') && selectedBatch.status === 'Pending' && (
                    <button
                      onClick={() => authorizeBatch(selectedBatch.id)}
                      className="flex items-center gap-1.5 text-xs text-white font-bold bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-xl border border-blue-700 shadow-sm transition active:scale-95"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-white" /> Authorize for Printing (Line Clearance)
                    </button>
                  )}
                  {(currentUser.role === 'Supervisor' || currentUser.role === 'SuperAdmin') && selectedBatch.status === 'In Progress' && (
                    <button
                      onClick={() => completeBatch(selectedBatch.id)}
                      className="flex items-center gap-1.5 text-xs text-white font-bold bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-700 shadow-sm transition active:scale-95"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" /> Complete Batch (QA Release)
                    </button>
                  )}
                  {(currentUser.role === 'Supervisor' || currentUser.role === 'SuperAdmin') && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-300 shadow-xs">
                      <Scale className="w-3.5 h-3.5 text-emerald-700" /> Weight Override Authorized
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px] sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Drum #</th>
                      <th className="px-4 py-3">Net Wt (Kg)</th>
                      <th className="px-4 py-3">Gross Wt (Kg)</th>
                      <th className="px-4 py-3">Allocated SSCC-18</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedBatch.drums.map(d => (
                      <tr key={d.drumNumber} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-bold text-slate-900 font-mono">#{d.drumNumber}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-900">{d.netWeight.toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono font-medium text-slate-700">{d.grossWeight.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          {d.sscc ? (
                            <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">{d.sscc}</span>
                          ) : (
                            <span className="text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded text-[10px] border border-slate-200">Not allocated</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${drumStatusColor(d.status)}`}>
                            {d.status}{d.reprintCount > 0 ? ` (Reprint #${d.reprintCount})` : ''}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {(currentUser.role === 'Supervisor' || currentUser.role === 'SuperAdmin') ? (
                            <button onClick={() => { setWeightDrum(d); setNewNet(d.netWeight); setNewGross(d.grossWeight); setWtReason(''); }}
                              className="px-2.5 py-1 text-[11px] font-bold border border-slate-300 bg-white hover:bg-slate-100 rounded-lg text-slate-800 shadow-xs transition">
                              Edit Wt
                            </button>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md inline-block">
                              🔒 QA Lock
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card className="flex items-center justify-center h-48 text-slate-400 text-sm">
              Select a batch to view drum details
            </Card>
          )}
        </div>
      </div>

      {/* Create Batch Modal */}
      {createModal && (
        <Modal onClose={() => setCreateModal(false)} title="Initiate New Production Batch"
          subtitle="All drums will be auto-allocated with default weights">
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <FormField label="Select Pharmaceutical Product" required>
              <Select value={nbProduct} onChange={e => setNbProduct(e.target.value)} required>
                {products.filter(p => p.status === 'Active').map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Unique Batch / Lot Number" required>
              <Input className="font-mono" value={nbNum} onChange={e => setNbNum(e.target.value)} required />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Batch Size (Kg)" required>
                <Input type="number" className="font-mono" value={nbSize} onChange={e => setNbSize(+e.target.value)} required />
              </FormField>
              <FormField label="Number of Drums" required>
                <Input type="number" className="font-mono" value={nbDrums} onChange={e => setNbDrums(+e.target.value)} required />
              </FormField>
              <FormField label="Default Net Weight (Kg)" required>
                <Input type="number" step="0.01" className="font-mono" value={nbNet} onChange={e => setNbNet(+e.target.value)} required />
              </FormField>
              <FormField label="Manufacturing Date" required>
                <Input type="date" value={nbMfg} onChange={e => setNbMfg(e.target.value)} required />
              </FormField>
              <div className="col-span-2">
                <FormField label="Expiry Date" required>
                  <Input type="date" value={nbExp} onChange={e => setNbExp(e.target.value)} required />
                </FormField>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setCreateModal(false)} className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition">Cancel</button>
              <PrimaryBtn type="submit">Generate Batch & Drum Matrix</PrimaryBtn>
            </div>
          </form>
        </Modal>
      )}

      {/* Weight Override Modal */}
      {weightDrum && (
        <Modal onClose={() => setWeightDrum(null)} title={`Supervisor Weight Override — Drum #${weightDrum.drumNumber}`}
          subtitle="Authorized QA amendment — will be logged in audit trail">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Revised Net Weight (Kg)" required>
                <Input type="number" step="0.01" className="font-mono font-bold" value={newNet} onChange={e => setNewNet(+e.target.value)} required />
              </FormField>
              <FormField label="Revised Gross Weight (Kg)" required>
                <Input type="number" step="0.01" className="font-mono font-bold" value={newGross} onChange={e => setNewGross(+e.target.value)} required />
              </FormField>
            </div>
            <FormField label="Mandatory Reason for Amendment" required>
              <textarea rows={3} value={wtReason} onChange={e => setWtReason(e.target.value)}
                placeholder="e.g. Re-weighed on certified secondary precision scale"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50/70 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none" required />
            </FormField>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setWeightDrum(null)} className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition">Cancel</button>
              <PrimaryBtn type="button" onClick={handleWeightSave} icon={<Scale className="w-4 h-4" />}>Authorize Override</PrimaryBtn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
