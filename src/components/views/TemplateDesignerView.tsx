import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LabelTemplate, LabelDimension, TemplateStatus, LabelSnapshot } from '../../types';
import { ThermalLabelSimulator } from '../ThermalLabelSimulator';
import { PageHeader, Card, PrimaryBtn, SecondaryBtn, StatusBadge, Modal, FormField, Textarea } from '../ui';
import {
  FileCode,
  CheckCircle,
  Eye,
  GitBranch,
  ShieldCheck,
  AlertCircle,
  Clock,
  Layers,
  Tag,
  Zap,
} from 'lucide-react';

export const TemplateDesignerView: React.FC = () => {
  const { templates, currentUser, createTemplateRevision, approveTemplateRevision, companySettings } = useApp();

  const [selectedTemplate, setSelectedTemplate] = useState<LabelTemplate>(templates[0] || null);
  const [previewSnapshot, setPreviewSnapshot] = useState<LabelSnapshot | null>(null);
  const [newRevisionSummary, setNewRevisionSummary] = useState('');
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);

  const handleOpenPreview = (tpl: LabelTemplate) => {
    const preview: LabelSnapshot = {
      id: `preview_${tpl.id}`,
      sscc: `(00) ${companySettings.extensionDigit} ${companySettings.gs1CompanyPrefix} 000000000 0`,
      labelType: 'Original',
      batchNumber: 'BATCH-SAMPLE-2026',
      drumNumber: 1,
      totalDrums: 10,
      productName: 'Sample Active Pharmaceutical Ingredient (Pure)',
      productCode: 'API-SAMPLE-01',
      gtin14: '08901234567890',
      netWeight: 25.00,
      grossWeight: 27.20,
      mfgDate: '2026-11-23',
      expiryDate: '2031-11-22',
      storageConditions: 'Store below 25°C in well-closed containers.',
      cautionText: 'FOR PHARMACEUTICAL MANUFACTURING USE ONLY.',
      companyName: companySettings.companyName,
      mfgLicenseNumber: companySettings.mfgLicenseNumber,
      templateRevision: tpl.revision,
      dimension: tpl.dimension,
      generatedAt: new Date().toLocaleString(),
      generatedBy: `${currentUser.name} (Preview)`,
      reprintCount: 0,
      isWatermarked: true,
      watermarkText: 'PREVIEW ONLY',
      watermarkColor: 'red',
    };
    setPreviewSnapshot(preview);
  };

  const handleCreateRevisionSubmit = () => {
    if (!selectedTemplate || !newRevisionSummary.trim()) return;
    createTemplateRevision(selectedTemplate.id, newRevisionSummary);
    setIsRevisionModalOpen(false);
    setNewRevisionSummary('');
  };

  const statusFlow = [
    { label: 'Draft', color: 'bg-sky-100 text-sky-700 border-sky-200' },
    { label: 'In Review', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { label: 'Approved/Effective', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { label: 'Obsolete', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Label Template Designer"
        subtitle="Manage validated thermal label formats with immutable revision control. Only Approved/Effective templates can be used in production printing."
        badge={{ label: `${templates.length} Revisions`, color: 'purple' }}
        action={
          selectedTemplate && selectedTemplate.status === 'Approved/Effective' ? (
            <PrimaryBtn
              icon={<GitBranch className="w-4 h-4" />}
              onClick={() => setIsRevisionModalOpen(true)}
            >
              Create New Revision
            </PrimaryBtn>
          ) : undefined
        }
      />

      {/* Lifecycle Status Flow Banner */}
      <Card className="!p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mr-2">Revision Lifecycle:</span>
          {statusFlow.map((s, i) => (
            <React.Fragment key={s.label}>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${s.color}`}>
                {s.label}
              </span>
              {i < statusFlow.length - 1 && (
                <span className="text-slate-300 font-bold">→</span>
              )}
            </React.Fragment>
          ))}
          <span className="ml-auto text-[10px] text-slate-400 italic">Editing an Approved template always creates a new Draft — never modifies in-place.</span>
        </div>
      </Card>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Template Versions List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Registered Revisions
            </h3>
          </div>
          <div className="space-y-2">
            {templates.map((tpl) => {
              const isSelected = selectedTemplate?.id === tpl.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl)}
                  className={`p-4 rounded-2xl cursor-pointer transition-all duration-150 group shadow-xs ${
                    isSelected
                      ? 'bg-indigo-50/90 border-2 border-indigo-500 shadow-sm ring-1 ring-indigo-500/20'
                      : 'bg-white hover:border-slate-300 hover:shadow-card border border-slate-200 text-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className={`font-bold text-sm ${isSelected ? 'text-indigo-950 font-black' : 'text-slate-900'}`}>
                        {tpl.name}
                      </div>
                      <div className={`font-mono text-xs mt-1 font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-600'}`}>
                        Rev {tpl.revision} · {tpl.dimension}"
                      </div>
                    </div>
                    <StatusBadge status={tpl.status} />
                  </div>
                  {tpl.changeSummary && (
                    <div className={`text-[11px] italic mt-2.5 pt-2 border-t font-semibold ${
                      isSelected ? 'border-indigo-200 text-indigo-900' : 'border-slate-200 text-slate-600'
                    }`}>
                      "{tpl.changeSummary}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Template Inspector */}
        <div className="lg:col-span-2 space-y-4">
          {selectedTemplate ? (
            <>
              {/* Top Card: Identity + Actions */}
              <Card className="!p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 border-b border-slate-100 gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-extrabold text-slate-900">
                        {selectedTemplate.name}
                      </h3>
                      <StatusBadge status={selectedTemplate.status} />
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-3">
                      <span>Rev <strong className="text-slate-800">{selectedTemplate.revision}</strong></span>
                      <span>·</span>
                      <span>Dimension: <strong className="text-slate-800">{selectedTemplate.dimension} inches</strong></span>
                      <span>·</span>
                      <span>Created: {selectedTemplate.createdAt}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <SecondaryBtn
                      icon={<Eye className="w-4 h-4" />}
                      onClick={() => handleOpenPreview(selectedTemplate)}
                    >
                      Watermarked Preview
                    </SecondaryBtn>
                    {selectedTemplate.status === 'In Review' &&
                      (currentUser.role === 'Supervisor' || currentUser.role === 'SuperAdmin') && (
                      <PrimaryBtn
                        icon={<ShieldCheck className="w-4 h-4" />}
                        onClick={() => approveTemplateRevision(selectedTemplate.id)}
                        className="!from-emerald-500 !to-emerald-600"
                      >
                        Approve for Production
                      </PrimaryBtn>
                    )}
                  </div>
                </div>

                {/* Elements Configuration Matrix */}
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Configured Layout Elements ({selectedTemplate.elements.length})
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedTemplate.elements.map((el) => (
                      <div
                        key={el.id}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between group hover:border-indigo-200 hover:bg-indigo-50/30 transition"
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-900">{el.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {el.fontSize.toUpperCase()}{el.isBold ? ' · BOLD' : ''}{el.barcodeType ? ` · ${el.barcodeType.toUpperCase()}` : ''}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                          ENABLED
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Compliance Note */}
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Strict Immutability Rule (21 CFR Part 11):</strong> Approved revisions cannot be modified in-place. Any layout change automatically branches into a new <strong>Draft</strong> revision, ensuring all historical batch records retain their original printing configuration.
                </p>
              </div>

              {/* GS1 Compliance Card */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-5 text-white">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">GS1 / Regulatory Data Elements</h4>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    { label: 'Application ID (AI)', value: '(00) Serial Shipping Container Code' },
                    { label: 'Barcode Standard', value: 'GS1-128 (Code 128C)' },
                    { label: '2D Symbology', value: 'GS1 DataMatrix ECC 200' },
                    { label: 'SSCC Structure', value: `Ext(1) + Prefix(7) + Serial(9) + Check(1) = 18 digits` },
                  ].map((item) => (
                    <div key={item.label} className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">{item.label}</div>
                      <div className="font-mono font-semibold text-white mt-0.5">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <Card className="p-12 text-center text-slate-400 text-sm">
              <FileCode className="w-10 h-10 mx-auto mb-3 text-slate-200" />
              Select a template revision to inspect.
            </Card>
          )}
        </div>
      </div>

      {/* Watermarked Preview Modal */}
      {previewSnapshot && (
        <Modal
          onClose={() => setPreviewSnapshot(null)}
          title="Thermal Design Preview"
          subtitle="Sample mockup with PREVIEW ONLY watermark — not suitable for production use"
          maxW="max-w-lg"
        >
          <ThermalLabelSimulator label={previewSnapshot} showActions={false} />
          <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
            <SecondaryBtn onClick={() => setPreviewSnapshot(null)}>Close Preview</SecondaryBtn>
          </div>
        </Modal>
      )}

      {/* Create New Revision Modal */}
      {isRevisionModalOpen && selectedTemplate && (
        <Modal
          onClose={() => setIsRevisionModalOpen(false)}
          title="Branch New Template Revision"
          subtitle={`Rev ${selectedTemplate.revision} → Rev ${(parseFloat(selectedTemplate.revision) + 1.0).toFixed(1)} (Draft)`}
          maxW="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-700">
              The existing <strong>Rev {selectedTemplate.revision}</strong> will continue serving active production until the new revision is reviewed and approved by Supervisor QA.
            </div>
            <FormField label="Summary of Proposed Changes" required>
              <Textarea
                value={newRevisionSummary}
                onChange={(e) => setNewRevisionSummary(e.target.value)}
                placeholder="e.g. Enlarged 2D matrix size and adjusted line item spacing for high-speed scanners"
                rows={3}
              />
            </FormField>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <SecondaryBtn onClick={() => setIsRevisionModalOpen(false)}>Cancel</SecondaryBtn>
              <PrimaryBtn
                disabled={!newRevisionSummary.trim()}
                icon={<GitBranch className="w-4 h-4" />}
                onClick={handleCreateRevisionSubmit}
              >
                Create Revision Draft
              </PrimaryBtn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
