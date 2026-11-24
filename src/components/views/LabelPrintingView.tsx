import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LabelType, LabelSnapshot, Drum } from '../../types';
import { ThermalLabelSimulator } from '../ThermalLabelSimulator';
import { Barcode, RefreshCw, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { PageHeader, Card, PrimaryBtn, StatusBadge, Modal, FormField, Input, Select } from '../ui';

export const LabelPrintingView: React.FC = () => {
  const { batches, templates, currentUser, generateDrumLabels, reprintDrumLabel, markDrumDamaged } = useApp();

  const activeBatches = batches.filter(b => b.status === 'In Progress' || b.status === 'Pending');
  const [batchId, setBatchId] = useState(activeBatches[0]?.id || '');
  const selectedBatch = batches.find(b => b.id === batchId);

  const approvedTemplates = templates.filter(t => t.status === 'Approved/Effective');
  const [templateId, setTemplateId] = useState(approvedTemplates[0]?.id || '');
  const [labelType, setLabelType] = useState<LabelType>('Original');
  const [selectedDrums, setSelectedDrums] = useState<number[]>([1,2,3,4,5]);

  const [snapshots, setSnapshots] = useState<LabelSnapshot[]>([]);
  const [snapIdx, setSnapIdx] = useState(0);

  const [reprintDrum, setReprintDrum] = useState<Drum | null>(null);
  const [reprintReason, setReprintReason] = useState('');
  const [reprintAuth, setReprintAuth] = useState('Dr. Anjali Nair (Supervisor QA)');

  const [damagedDrum, setDamagedDrum] = useState<Drum | null>(null);
  const [damageReason, setDamageReason] = useState('');
  const [disposition, setDisposition] = useState('Scrapped & Destroyed under QA Supervision');

  const toggle = (n: number) => setSelectedDrums(p => p.includes(n) ? p.filter(x => x !== n) : [...p, n].sort((a,b) => a-b));
  const selectRange = (s: number, e: number) => setSelectedDrums(Array.from({length: e-s+1}, (_, i) => s+i));

  const handleGenerate = () => {
    if (!batchId || !templateId || selectedDrums.length === 0) return;
    const s = generateDrumLabels(batchId, selectedDrums, templateId, labelType);
    setSnapshots(s); setSnapIdx(0);
  };

  const handleReprint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !reprintDrum) return;
    const s = reprintDrumLabel(selectedBatch.id, reprintDrum.drumNumber, reprintReason, reprintAuth);
    if (s) { setSnapshots([s]); setSnapIdx(0); }
    setReprintDrum(null); setReprintReason('');
  };

  const handleDamaged = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !damagedDrum) return;
    markDrumDamaged(selectedBatch.id, damagedDrum.drumNumber, damageReason, disposition);
    setDamagedDrum(null); setDamageReason('');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Production Label Printing"
        subtitle="Select drums, execute GS1 Mod-10 SSCC serialization, and trigger validated thermal printing."
        badge={{ label: 'Thermal 4×6"', color: 'emerald' }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config Panel */}
        <div className="lg:col-span-1">
          <Card className="space-y-5">
            <div className="font-bold text-sm text-slate-900 pb-3 border-b border-slate-100">
              1. Print Job Configuration
            </div>

            <FormField label="Active Production Batch" required>
              <Select value={batchId} onChange={e => { setBatchId(e.target.value); setSelectedDrums([1,2,3,4,5]); }}>
                {activeBatches.map(b => <option key={b.id} value={b.id}>{b.batchNumber}</option>)}
              </Select>
            </FormField>

            <FormField label="Approved Template Revision">
              <Select value={templateId} onChange={e => setTemplateId(e.target.value)}>
                {approvedTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} (Rev {t.revision})</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Label Operation Type">
              <Select value={labelType} onChange={e => setLabelType(e.target.value as any)}>
                <option value="Original">Original (Allocates new SSCC)</option>
                <option value="Duplicate">Duplicate (Reuses SSCC)</option>
                <option value="Triplicate">Triplicate (Reuses SSCC)</option>
                <option value="Dispatch Copy">Dispatch Copy (Blue watermark)</option>
                <option value="Specimen">Specimen (Red watermark, no SSCC)</option>
              </Select>
            </FormField>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="font-bold text-xs text-slate-800">Quick Range Select</div>
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                <button type="button" onClick={() => selectRange(1,5)} className="py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-mono font-bold text-slate-800 border border-slate-200 transition">1–5</button>
                <button type="button" onClick={() => selectRange(1,10)} className="py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-mono font-bold text-slate-800 border border-slate-200 transition">1–10</button>
                <button type="button" onClick={() => { if (selectedBatch) selectRange(1, selectedBatch.totalDrums); }}
                  className="py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-mono font-bold text-slate-800 border border-slate-200 transition">All ({selectedBatch?.totalDrums})</button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={selectedDrums.length === 0}
              style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold
                         shadow-md flex items-center justify-center gap-2 disabled:opacity-40 border border-blue-700 transition"
            >
              <Barcode className="w-4 h-4 text-white" />
              <span className="text-white font-bold">Generate & Print ({selectedDrums.length} Drums)</span>
            </button>
            <div className="text-[11px] text-slate-500 font-medium text-center -mt-3">Real GS1 Mod-10 algorithm · Immutable snapshot</div>
          </Card>
        </div>

        {/* Drum Selector Grid */}
        <div className="lg:col-span-2">
          {selectedBatch ? (
            <Card noPad>
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-slate-900">2. Select Drum Containers</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {selectedBatch.batchNumber} · <strong className="text-slate-900">{selectedDrums.length}</strong> selected of {selectedBatch.totalDrums} drums
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold">
                  <span className="flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">● Printed</span>
                  <span className="flex items-center gap-1 text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">● Damaged</span>
                </div>
              </div>
              <div className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 max-h-[500px] overflow-y-auto">
                {selectedBatch.drums.map(d => {
                  const isChecked = selectedDrums.includes(d.drumNumber);
                  const isPrinted = d.status === 'Printed';
                  const isDamaged = d.status === 'Damaged';

                  return (
                    <div key={d.drumNumber}
                      className={`p-3 rounded-xl border text-center transition text-xs flex flex-col justify-between ${
                        isDamaged ? 'border-rose-300 bg-rose-50/80 shadow-xs' :
                        isChecked ? 'border-2 border-brand-500 bg-blue-50/90 shadow-sm ring-1 ring-brand-500/20' :
                        isPrinted ? 'border-emerald-300 bg-emerald-50/70 shadow-xs' :
                        'border-slate-300 bg-white hover:border-brand-400 hover:bg-slate-50 shadow-xs'
                      }`}>
                      <div className="cursor-pointer" onClick={() => toggle(d.drumNumber)}>
                        <div className={`font-black text-sm font-mono ${isChecked ? 'text-brand-900' : isDamaged ? 'text-rose-800' : isPrinted ? 'text-emerald-800' : 'text-slate-900'}`}>
                          #{d.drumNumber}
                        </div>
                        <div className={`text-[10px] font-mono mt-0.5 font-bold ${isChecked ? 'text-brand-700' : isDamaged ? 'text-rose-700' : isPrinted ? 'text-emerald-700' : 'text-slate-500'}`}>
                          {isDamaged ? 'DAMAGED' : isPrinted ? 'PRINTED ✓' : `${d.netWeight.toFixed(1)} Kg`}
                        </div>
                      </div>

                      {isPrinted && !isDamaged && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setReprintDrum(d); setReprintReason(''); }}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 shadow-xs"
                            title="Request Regulated Reprint"
                          >
                            <RefreshCw className="w-2.5 h-2.5" /> Reprint
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDamagedDrum(d); setDamageReason(''); }}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 bg-rose-100 text-rose-900 hover:bg-rose-200 border border-rose-300 shadow-xs"
                            title="Report Damaged Container"
                          >
                            <AlertTriangle className="w-2.5 h-2.5" /> Damage
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : (
            <Card className="flex items-center justify-center h-48 text-slate-400 text-sm">
              No active batches available
            </Card>
          )}
        </div>
      </div>

      {/* Label Preview Modal */}
      {snapshots.length > 0 && (
        <Modal onClose={() => setSnapshots([])} title={`Label Preview — ${snapshots[snapIdx]?.batchNumber}`}
          subtitle={`Drum ${snapshots[snapIdx]?.drumNumber} · ${snapIdx+1} of ${snapshots.length}`} maxW="max-w-lg">
          <ThermalLabelSimulator label={snapshots[snapIdx]} onPrint={() => window.print()} />
          {snapshots.length > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
              <button disabled={snapIdx===0} onClick={() => setSnapIdx(p=>Math.max(0,p-1))}
                className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs disabled:opacity-30 transition shadow-xs">
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <span className="text-xs font-mono text-slate-800 font-bold">Drum #{snapshots[snapIdx]?.drumNumber}</span>
              <button disabled={snapIdx===snapshots.length-1} onClick={() => setSnapIdx(p=>Math.min(snapshots.length-1,p+1))}
                className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs disabled:opacity-30 transition shadow-xs">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </Modal>
      )}

      {/* Reprint Modal */}
      {reprintDrum && selectedBatch && (
        <Modal onClose={() => setReprintDrum(null)} title={`Regulated Reprint — Drum #${reprintDrum.drumNumber}`}
          subtitle="GS1 Rule: Original SSCC reused. Reprint counter incremented.">
          <form onSubmit={handleReprint} className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <strong>SSCC to Reuse:</strong> <span className="font-mono font-bold">{reprintDrum.sscc}</span>
            </div>
            <FormField label="Mandatory Reason for Reprint" required>
              <textarea rows={3} value={reprintReason} onChange={e => setReprintReason(e.target.value)}
                placeholder="e.g. Barcode scuffed during pallet strapping" required
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none" />
            </FormField>
            <FormField label="Authorizing Supervisor QA">
              <Input value={reprintAuth} onChange={e => setReprintAuth(e.target.value)} required />
            </FormField>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setReprintDrum(null)} className="px-4 py-2 text-xs text-slate-600 rounded-xl">Cancel</button>
              <PrimaryBtn type="submit" icon={<RefreshCw className="w-4 h-4" />}>
                Authorize Reprint #{reprintDrum.reprintCount + 1}
              </PrimaryBtn>
            </div>
          </form>
        </Modal>
      )}

      {/* Damaged Label Modal */}
      {damagedDrum && selectedBatch && (
        <Modal onClose={() => setDamagedDrum(null)} title={`Report Damaged Label — Drum #${damagedDrum.drumNumber}`}
          subtitle={`SSCC: ${damagedDrum.sscc}`}>
          <form onSubmit={handleDamaged} className="space-y-4">
            <FormField label="Damage Description" required>
              <textarea rows={3} value={damageReason} onChange={e => setDamageReason(e.target.value)}
                placeholder="e.g. Forklift scratch tore GS1-128 barcode area" required
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500/30 resize-none" />
            </FormField>
            <FormField label="Physical Label Disposition">
              <Select value={disposition} onChange={e => setDisposition(e.target.value)}>
                <option>Scrapped & Destroyed under QA Supervision</option>
                <option>Attached to Deviation Report File</option>
                <option>Returned to Packaging Line Inventory</option>
              </Select>
            </FormField>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setDamagedDrum(null)} className="px-4 py-2 text-xs text-slate-600 rounded-xl">Cancel</button>
              <button type="submit" disabled={!damageReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-40 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Commit Damaged Record
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
