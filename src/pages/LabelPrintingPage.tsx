import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LabelType, LabelSnapshot, Drum } from '../types';
import { ThermalLabelSimulator } from '../components/ThermalLabelSimulator';
import { Barcode, RefreshCw, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, X, FileSpreadsheet, ShieldAlert, Lock } from 'lucide-react';
import { PageHeader, Card, PrimaryBtn, StatusBadge, Modal, FormField, Input, Select } from '../components/ui';

export const LabelPrintingPage: React.FC = () => {
  const { batches, templates, currentUser, generateDrumLabels, reprintDrumLabel, markDrumDamaged, hasPermission, canExportLabels, canDownloadLabelCopy, logAudit } = useApp();

  const canPrint = hasPermission('print_labels');
  const canReprint = hasPermission('reprint_labels');
  const canExport = canExportLabels();

  const activeBatches = batches.filter(b => b.status === 'In Progress' || b.status === 'Pending');
  const [batchId, setBatchId] = useState(activeBatches[0]?.id || '');
  const selectedBatch = batches.find(b => b.id === batchId);

  const approvedTemplates = templates.filter(t => t.status === 'Approved/Effective');
  const [templateId, setTemplateId] = useState(approvedTemplates[0]?.id || '');
  const [labelType, setLabelType] = useState<LabelType>('Original');
  const [selectedDrums, setSelectedDrums] = useState<number[]>([1, 2, 3, 4, 5]);

  const [snapshots, setSnapshots] = useState<LabelSnapshot[]>([]);
  const [snapIdx, setSnapIdx] = useState(0);

  const [reprintDrum, setReprintDrum] = useState<Drum | null>(null);
  const [reprintReason, setReprintReason] = useState('');
  const [reprintAuth, setReprintAuth] = useState('Dr. Anjali Nair (Supervisor QA)');

  const [damagedDrum, setDamagedDrum] = useState<Drum | null>(null);
  const [damageReason, setDamageReason] = useState('');
  const [disposition, setDisposition] = useState('Scrapped & Destroyed under QA Supervision');

  const toggle = (n: number) => setSelectedDrums(p => p.includes(n) ? p.filter(x => x !== n) : [...p, n].sort((a, b) => a - b));
  const selectRange = (s: number, e: number) => setSelectedDrums(Array.from({ length: e - s + 1 }, (_, i) => s + i));

  const handleGenerate = () => {
    if (!canPrint) {
      alert('Access Denied: Your role does not have permission to print labels (print_labels permission revoked by Admin).');
      return;
    }
    if (!batchId || !templateId || selectedDrums.length === 0) return;
    const s = generateDrumLabels(batchId, selectedDrums, templateId, labelType);
    setSnapshots(s); setSnapIdx(0);
  };

  const handleReprint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canReprint) {
      alert('Access Denied: Your role does not have permission to reprint labels (reprint_labels permission revoked by Admin).');
      return;
    }
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

  const handleExportCsv = () => {
    if (!canExport) {
      alert('Access Denied: Advance permission "Export Labels" is required for your role. Contact Plant Administrator.');
      return;
    }
    if (!selectedBatch) return;

    const headers = ['Drum Number', 'Net Weight (Kg)', 'Gross Weight (Kg)', 'Tare Weight (Kg)', 'Status', 'SSCC', 'Printed At'];
    const rows = selectedBatch.drums.map(d => [
      d.drumNumber,
      d.netWeight.toFixed(2),
      d.grossWeight.toFixed(2),
      d.tareWeight.toFixed(2),
      d.status,
      d.sscc || 'Not Serialized',
      d.labelGeneratedAt || 'Pending'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedBatch.batchNumber}_SSCC_Labels_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    logAudit('EXPORT_LABELS_CSV', 'Serialization', {
      batchRef: selectedBatch.batchNumber,
      newValue: `Exported ${selectedBatch.drums.length} drums to CSV under 21 CFR Part 11`,
      reason: 'Advance permission label dataset export'
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Production Label Printing"
        subtitle="Select drums, execute GS1 Mod-10 SSCC serialization, and trigger validated thermal printing."
        badge={{ label: 'Thermal 4×6"', color: 'emerald' }}
        action={
          <button
            type="button"
            onClick={handleExportCsv}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition shadow-xs ${
              canExport
                ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 cursor-pointer'
                : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-75'
            }`}
            title={canExport ? 'Export batch drum serialization dataset to CSV' : 'Export Labels permission restricted by Plant Admin'}
          >
            <FileSpreadsheet className={`w-4 h-4 ${canExport ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Export Labels (CSV)</span>
            {!canExport && <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-mono">Locked</span>}
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config Panel */}
        <div className="lg:col-span-1">
          <Card className="space-y-5">
            <div className="font-bold text-sm text-slate-900 pb-3 border-b border-slate-100">
              1. Print Job Configuration
            </div>

            <FormField label="Active Production Batch" required>
              <Select value={batchId} onChange={e => { setBatchId(e.target.value); setSelectedDrums([1, 2, 3, 4, 5]); }}>
                {activeBatches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.batchNumber} {b.status === 'Pending' ? '(🔒 Awaiting QA Approval)' : ''}
                  </option>
                ))}
              </Select>
            </FormField>

            {selectedBatch?.status === 'Pending' && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">🔒 QA Line Clearance Required</div>
                  <div className="text-[11px] text-amber-800 mt-0.5">
                    This batch has not been authorized for packaging by the QA Supervisor yet. Printing is locked.
                  </div>
                </div>
              </div>
            )}

            <FormField label="Approved Template Revision">
              <Select value={templateId} onChange={e => setTemplateId(e.target.value)}>
                {approvedTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} (Rev {t.revision} · {t.dimension}&quot;)</option>
                ))}
              </Select>
            </FormField>

            {(() => {
              const selTpl = approvedTemplates.find(t => t.id === templateId);
              if (!selTpl) return null;
              return (
                <div className="flex items-center justify-between px-3.5 py-2 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs -mt-2 shadow-xs">
                  <span className="text-slate-700 font-bold">Selected Label Size:</span>
                  <span className="font-mono font-black text-indigo-950 bg-white px-2 py-0.5 rounded-lg border border-indigo-300">
                    {selTpl.dimension}&quot; ({selTpl.dimension === '6x4' ? 'Wide Shipper' : selTpl.dimension === '4x4' ? 'Square Pail' : selTpl.dimension === '3x2' ? 'Small Container' : 'Standard Drum'})
                  </span>
                </div>
              );
            })()}

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
                <button type="button" onClick={() => selectRange(1, 5)} className="py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-mono font-bold text-slate-800 border border-slate-200 transition">1–5</button>
                <button type="button" onClick={() => selectRange(1, 10)} className="py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-mono font-bold text-slate-800 border border-slate-200 transition">1–10</button>
                <button type="button" onClick={() => { if (selectedBatch) selectRange(1, selectedBatch.totalDrums); }}
                  className="py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-mono font-bold text-slate-800 border border-slate-200 transition">All ({selectedBatch?.totalDrums})</button>
              </div>
            </div>

            {!canPrint && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Printing Restricted: Your role (<strong>{currentUser.role}</strong>) does not have <strong>print_labels</strong> permission.</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canPrint || selectedDrums.length === 0 || selectedBatch?.status === 'Pending'}
              style={{
                backgroundColor: !canPrint ? '#94a3b8' : selectedBatch?.status === 'Pending' ? '#94a3b8' : '#2563eb',
                color: '#ffffff',
                cursor: !canPrint ? 'not-allowed' : 'pointer'
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold
                         shadow-md flex items-center justify-center gap-2 disabled:opacity-40 border border-blue-700 transition"
            >
              <Barcode className="w-4 h-4 text-white" />
              <span className="text-white font-bold">
                {!canPrint
                  ? 'Original Printing Disabled (Admin Revoked)'
                  : selectedBatch?.status === 'Pending'
                  ? 'Printing Locked (QA Clearance Required)'
                  : `Generate & Print (${selectedDrums.length} Drums)`}
              </span>
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
                      className={`p-3 rounded-xl border text-center transition text-xs flex flex-col justify-between ${isDamaged ? 'border-rose-300 bg-rose-50/80 shadow-xs' :
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
                          {canReprint ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setReprintDrum(d); setReprintReason(''); }}
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 shadow-xs cursor-pointer"
                              title="Request Regulated Reprint"
                            >
                              <RefreshCw className="w-2.5 h-2.5" /> Reprint
                            </button>
                          ) : (
                            <span className="text-[9px] text-slate-400 font-medium italic">Reprint Locked</span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDamagedDrum(d); setDamageReason(''); }}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 bg-rose-100 text-rose-900 hover:bg-rose-200 border border-rose-300 shadow-xs cursor-pointer"
                            title="Report Damaged Container"
                          >
                            <AlertTriangle className="w-2.5 h-2.5" /> Damage
                          </button>
                        </div>
                      )}

                      {isDamaged && (
                        <div className="mt-2.5 pt-2 border-t border-rose-200/60 flex items-center justify-center">
                          {canReprint ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setReprintDrum(d); setReprintReason(`Replacement for damaged label incident: ${d.damagedReason || 'Damaged label'}`); }}
                              className="px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 shadow-xs cursor-pointer"
                              title="Authorize Replacement Reprint for Damaged Drum"
                            >
                              <RefreshCw className="w-2.5 h-2.5" /> Reprint Replacement
                            </button>
                          ) : (
                            <span className="text-[9px] text-rose-400 font-medium italic">Replacement Locked</span>
                          )}
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
      {snapshots.length > 0 && (() => {
        const snap = snapshots[snapIdx];
        const snapDim = snap?.dimension || '4x6';
        const modalMaxW = snapDim === '6x4' ? 'max-w-3xl' : snapDim === '4x4' ? 'max-w-xl' : 'max-w-lg';
        return (
          <Modal
            onClose={() => setSnapshots([])}
            title={`Label Preview — ${snap?.batchNumber}`}
            subtitle={`Drum ${snap?.drumNumber} · ${snapIdx + 1} of ${snapshots.length} · Format: ${snapDim}" Thermal (${snapDim === '6x4' ? 'Wide Shipper' : snapDim === '4x4' ? 'Square Pail' : snapDim === '3x2' ? 'Small Container' : 'Standard Drum'})`}
            maxW={modalMaxW}
          >
            <ThermalLabelSimulator
              label={snap}
              onPrint={() => window.print()}
              onClose={() => setSnapshots([])}
            />
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
              {snapshots.length > 1 ? (
                <>
                  <button disabled={snapIdx === 0} onClick={() => setSnapIdx(p => Math.max(0, p - 1))}
                    className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs disabled:opacity-30 transition shadow-xs">
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-800 font-bold">Drum #{snap?.drumNumber}</span>
                    <button
                      type="button"
                      onClick={() => setSnapshots([])}
                      className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition"
                    >
                      Close
                    </button>
                  </div>
                  <button disabled={snapIdx === snapshots.length - 1} onClick={() => setSnapIdx(p => Math.min(snapshots.length - 1, p + 1))}
                    className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs disabled:opacity-30 transition shadow-xs">
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="w-full flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSnapshots([])}
                    className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 text-slate-500" /> Close / Cancel Preview
                  </button>
                </div>
              )}
            </div>
          </Modal>
        );
      })()}

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
              <button type="button" onClick={() => setReprintDrum(null)} className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition">Cancel</button>
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
              <button type="button" onClick={() => setDamagedDrum(null)} className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition">Cancel</button>
              <button
                type="submit"
                disabled={!damageReason.trim()}
                style={{ backgroundColor: '#e11d48', color: '#ffffff' }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-40 flex items-center gap-2 border border-rose-700 shadow-sm"
              >
                <AlertTriangle className="w-4 h-4 text-white" /> Commit Damaged Record
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
