import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LabelTemplate, LabelDimension, TemplateStatus, LabelSnapshot } from '../types';
import { ThermalLabelSimulator } from '../components/ThermalLabelSimulator';
import { PageHeader, Card, PrimaryBtn, SecondaryBtn, StatusBadge, Modal, FormField, Textarea, Select, Input } from '../components/ui';
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
  Send,
  Plus,
  Edit3,
} from 'lucide-react';

export const TemplateDesignerPage: React.FC = () => {
  const { templates, currentUser, addTemplate, updateTemplate, toggleTemplateElement, createTemplateRevision, updateTemplateDimension, submitTemplateForReview, approveTemplateRevision, companySettings } = useApp();

  const [selectedId, setSelectedId] = useState<string>(templates[0]?.id || '');
  const selectedTemplate = templates.find(t => t.id === selectedId) || templates[0] || null;
  const [previewSnapshot, setPreviewSnapshot] = useState<LabelSnapshot | null>(null);
  const [newRevisionSummary, setNewRevisionSummary] = useState('');
  const [newDimension, setNewDimension] = useState<LabelDimension>('4x6');
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);

  // New Template Modal state
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [newTplName, setNewTplName] = useState('');
  const [newTplDimension, setNewTplDimension] = useState<LabelDimension>('4x6');
  const [newTplSummary, setNewTplSummary] = useState('');

  // Edit Template Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDimension, setEditDimension] = useState<LabelDimension>('4x6');
  const [editSummary, setEditSummary] = useState('');

  const openEditModal = (tpl: LabelTemplate) => {
    setEditName(tpl.name);
    setEditDimension(tpl.dimension);
    setEditSummary(tpl.changeSummary || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !editName.trim()) return;
    updateTemplate(selectedTemplate.id, {
      name: editName.trim(),
      dimension: editDimension,
      changeSummary: editSummary.trim()
    });
    setIsEditModalOpen(false);
  };

  const handleCreateNewTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTplName.trim()) return;
    addTemplate({
      name: newTplName.trim(),
      dimension: newTplDimension,
      changeSummary: newTplSummary.trim() || 'New template created'
    });
    setIsNewTemplateModalOpen(false);
    setNewTplName('');
    setNewTplSummary('');
  };

  const openRevisionModal = () => {
    if (selectedTemplate) {
      setNewDimension(selectedTemplate.dimension);
      setIsRevisionModalOpen(true);
    }
  };

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
    createTemplateRevision(selectedTemplate.id, newRevisionSummary, newDimension);
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
          <div className="flex items-center gap-2">
            {currentUser.role !== 'Operator' && (
              <PrimaryBtn
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setIsNewTemplateModalOpen(true)}
              >
                + New Template
              </PrimaryBtn>
            )}
            {selectedTemplate && selectedTemplate.status === 'Approved/Effective' && (
              <SecondaryBtn
                icon={<GitBranch className="w-4 h-4" />}
                onClick={openRevisionModal}
              >
                Branch Revision
              </SecondaryBtn>
            )}
          </div>
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
                  onClick={() => setSelectedId(tpl.id)}
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
                    <div className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-3 flex-wrap">
                      <span>Rev <strong className="text-slate-800">{selectedTemplate.revision}</strong></span>
                      <span>·</span>
                      {selectedTemplate.status === 'Draft' && (currentUser.role === 'Admin' || currentUser.role === 'SuperAdmin' || currentUser.role === 'Supervisor') ? (
                        <span className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg text-xs font-bold text-indigo-900">
                          Dimension:
                          <select
                            value={selectedTemplate.dimension}
                            onChange={(e) => updateTemplateDimension(selectedTemplate.id, e.target.value as LabelDimension)}
                            className="bg-white border border-indigo-300 rounded px-1.5 py-0.5 text-xs text-indigo-950 font-mono font-bold focus:outline-none cursor-pointer"
                          >
                            <option value="4x6">4 × 6" (Standard Drum)</option>
                            <option value="6x4">6 × 4" (Wide Shipper)</option>
                            <option value="4x4">4 × 4" (Square Pail)</option>
                            <option value="3x2">3 × 2" (Small Container)</option>
                          </select>
                        </span>
                      ) : (
                        <span>Dimension: <strong className="text-slate-800">{selectedTemplate.dimension} inches</strong></span>
                      )}
                      <span>·</span>
                      <span>Created: {selectedTemplate.createdAt}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <SecondaryBtn
                      icon={<Eye className="w-4 h-4" />}
                      onClick={() => handleOpenPreview(selectedTemplate)}
                    >
                      Watermarked Preview
                    </SecondaryBtn>

                    {/* Edit Details for Draft or In Review */}
                    {selectedTemplate.status !== 'Approved/Effective' && (
                      <SecondaryBtn
                        icon={<Edit3 className="w-4 h-4" />}
                        onClick={() => openEditModal(selectedTemplate)}
                      >
                        Edit Details
                      </SecondaryBtn>
                    )}

                    {/* For Admin: If Draft, show Submit for QA Review */}
                    {selectedTemplate.status === 'Draft' && currentUser.role === 'Admin' && (
                      <PrimaryBtn
                        icon={<Send className="w-4 h-4" />}
                        onClick={() => submitTemplateForReview(selectedTemplate.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Submit for QA Review
                      </PrimaryBtn>
                    )}

                    {/* For Admin: If In Review, show Awaiting QA Approval badge */}
                    {selectedTemplate.status === 'In Review' && currentUser.role === 'Admin' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold shadow-xs">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> Awaiting QA Approval
                      </span>
                    )}

                    {/* For Supervisor & SuperAdmin: Show APPROVE FOR PRODUCTION (Never show Submit to QA) */}
                    {(selectedTemplate.status === 'In Review' || selectedTemplate.status === 'Draft') &&
                      (currentUser.role === 'Supervisor' || currentUser.role === 'SuperAdmin') && (
                      <PrimaryBtn
                        icon={<ShieldCheck className="w-4 h-4" />}
                        onClick={() => approveTemplateRevision(selectedTemplate.id)}
                        style={{ backgroundColor: '#059669', color: '#ffffff' }}
                        className="bg-emerald-600 hover:bg-emerald-700 border-emerald-700 shadow-sm"
                      >
                        Approve for Production
                      </PrimaryBtn>
                    )}

                    {/* If Approved, show Branch Revision button */}
                    {selectedTemplate.status === 'Approved/Effective' && (
                      <PrimaryBtn
                        icon={<GitBranch className="w-4 h-4" />}
                        onClick={openRevisionModal}
                      >
                        Branch Revision
                      </PrimaryBtn>
                    )}
                  </div>
                </div>

                {/* Elements Configuration Matrix */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Configured Layout Elements ({selectedTemplate.elements.length})
                      </h4>
                    </div>
                    {selectedTemplate.status !== 'Approved/Effective' && (
                      <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                        💡 Click badge to toggle ON/OFF
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedTemplate.elements.map((el) => (
                      <div
                        key={el.id}
                        className={`p-3 rounded-xl border flex items-center justify-between transition ${
                          el.enabled
                            ? 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/20'
                            : 'border-slate-200/60 bg-slate-100/60 opacity-60'
                        }`}
                      >
                        <div>
                          <div className={`text-xs font-semibold ${el.enabled ? 'text-slate-900' : 'text-slate-500 line-through'}`}>
                            {el.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {el.fontSize.toUpperCase()}{el.isBold ? ' · BOLD' : ''}{el.barcodeType ? ` · ${el.barcodeType.toUpperCase()}` : ''}
                          </div>
                        </div>
                        {selectedTemplate.status !== 'Approved/Effective' ? (
                          <button
                            type="button"
                            onClick={() => toggleTemplateElement(selectedTemplate.id, el.id)}
                            className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border transition cursor-pointer shadow-xs ${
                              el.enabled
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                            }`}
                            title="Click to toggle element ON or OFF"
                          >
                            {el.enabled ? '✓ ENABLED' : '✕ DISABLED'}
                          </button>
                        ) : (
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                            el.enabled
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-400 border-slate-200'
                          }`}>
                            {el.enabled ? 'ENABLED' : 'DISABLED'}
                          </span>
                        )}
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
          title={`Thermal Design Preview — ${previewSnapshot.dimension}" Format`}
          subtitle={`Sample mockup for ${previewSnapshot.dimension}" Thermal label (${previewSnapshot.dimension === '6x4' ? 'Wide Shipper' : previewSnapshot.dimension === '4x4' ? 'Square Pail' : previewSnapshot.dimension === '3x2' ? 'Small Container' : 'Standard Drum'}) · PREVIEW ONLY watermark`}
          maxW={previewSnapshot.dimension === '6x4' ? 'max-w-3xl' : previewSnapshot.dimension === '4x4' ? 'max-w-xl' : 'max-w-lg'}
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
            <FormField label="Label Stock Dimension / Size" hint="Standard thermal sticker roll format">
              <Select
                value={newDimension}
                onChange={(e) => setNewDimension(e.target.value as LabelDimension)}
              >
                <option value="4x6">4 × 6 inches (Standard API Fibre Drum — Portrait)</option>
                <option value="6x4">6 × 4 inches (Wide Shipper Box — Landscape)</option>
                <option value="4x4">4 × 4 inches (Square Pail / Jerrycan)</option>
                <option value="3x2">3 × 2 inches (Small Container / Specimen Bottle)</option>
              </Select>
            </FormField>
            <FormField label="Summary of Proposed Changes" required>
              <Textarea
                value={newRevisionSummary}
                onChange={(e) => setNewRevisionSummary(e.target.value)}
                placeholder="e.g. Changed label dimension to 6x4 inches for wide shippers and updated 2D matrix"
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

      {/* Create Brand New Template Modal */}
      {isNewTemplateModalOpen && (
        <Modal
          onClose={() => setIsNewTemplateModalOpen(false)}
          title="Register Brand New Label Template"
          subtitle="Define a new container format (Starts as Rev 1.0 Draft for QA review)"
          maxW="max-w-md"
        >
          <form onSubmit={handleCreateNewTemplate} className="space-y-4">
            <FormField label="Template Design Name" required hint="e.g. Domestic Shipper Box Standard, Square Pail 4x4">
              <Input
                value={newTplName}
                onChange={(e) => setNewTplName(e.target.value)}
                placeholder="e.g. Domestic Shipper 6x4 Standard"
                required
              />
            </FormField>

            <FormField label="Label Stock Dimension / Size" required hint="Physical thermal label sticker size">
              <Select
                value={newTplDimension}
                onChange={(e) => setNewTplDimension(e.target.value as LabelDimension)}
              >
                <option value="4x6">4 × 6 inches (Standard API Fibre Drum — Portrait)</option>
                <option value="6x4">6 × 4 inches (Wide Shipper Box — Landscape)</option>
                <option value="4x4">4 × 4 inches (Square Pail / Jerrycan)</option>
                <option value="3x2">3 × 2 inches (Small Container / Specimen Bottle)</option>
              </Select>
            </FormField>

            <FormField label="Intended Packaging Purpose / Notes">
              <Textarea
                value={newTplSummary}
                onChange={(e) => setNewTplSummary(e.target.value)}
                placeholder="e.g. Designed for secondary outer corrugated packaging of 500Kg batch shipments"
                rows={2}
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <SecondaryBtn type="button" onClick={() => setIsNewTemplateModalOpen(false)}>Cancel</SecondaryBtn>
              <PrimaryBtn
                type="submit"
                disabled={!newTplName.trim()}
                icon={<Plus className="w-4 h-4" />}
              >
                Create Template (Draft)
              </PrimaryBtn>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Template Details Modal */}
      {isEditModalOpen && selectedTemplate && (
        <Modal
          onClose={() => setIsEditModalOpen(false)}
          title={`Edit Template: Rev ${selectedTemplate.revision}`}
          subtitle="Modify name, dimensions, and layout purpose per QA feedback"
          maxW="max-w-md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <FormField label="Template Design Name" required>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Label Stock Dimension / Size" required>
              <Select
                value={editDimension}
                onChange={(e) => setEditDimension(e.target.value as LabelDimension)}
              >
                <option value="4x6">4 × 6 inches (Standard API Fibre Drum — Portrait)</option>
                <option value="6x4">6 × 4 inches (Wide Shipper Box — Landscape)</option>
                <option value="4x4">4 × 4 inches (Square Pail / Jerrycan)</option>
                <option value="3x2">3 × 2 inches (Small Container / Specimen Bottle)</option>
              </Select>
            </FormField>

            <FormField label="Packaging Purpose & QA Revision Notes">
              <Textarea
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                placeholder="Document feedback from Supervisor or reason for update"
                rows={3}
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <SecondaryBtn type="button" onClick={() => setIsEditModalOpen(false)}>Cancel</SecondaryBtn>
              <PrimaryBtn type="submit">
                Save Template Changes
              </PrimaryBtn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
