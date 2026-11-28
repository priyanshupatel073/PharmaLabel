import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LabelTemplate, LabelDimension, LabelSnapshot, TemplateAppearance, PharmaFieldItem } from '../types';
import { DEFAULT_TEMPLATE_APPEARANCE, DEFAULT_PHARMA_FIELDS } from '../utils/mockData';
import { ThermalLabelSimulator } from '../components/ThermalLabelSimulator';
import { PageHeader, Card, PrimaryBtn, SecondaryBtn, StatusBadge, Modal, FormField, Textarea, Select, Input } from '../components/ui';
import {
  FileCode,
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
  Palette,
  ListOrdered,
  ArrowUp,
  ArrowDown,
  Check,
  RotateCcw,
  Sparkles,
  GripVertical,
  CheckCircle2
} from 'lucide-react';

export const TemplateDesignerPage: React.FC = () => {
  const {
    templates,
    currentUser,
    addTemplate,
    updateTemplate,
    toggleTemplateElement,
    createTemplateRevision,
    updateTemplateDimension,
    submitTemplateForReview,
    approveTemplateRevision,
    companySettings
  } = useApp();

  const [selectedId, setSelectedId] = useState<string>(templates[0]?.id || '');
  const selectedTemplate = templates.find((t) => t.id === selectedId) || templates[0] || null;
  const [previewSnapshot, setPreviewSnapshot] = useState<LabelSnapshot | null>(null);

  // Revision Modal state
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [newRevisionSummary, setNewRevisionSummary] = useState('');
  const [newDimension, setNewDimension] = useState<LabelDimension>('4x6');

  // 2-Tab Designer Modal State (PDF Pages 21 & 22)
  const [isDesignerModalOpen, setIsDesignerModalOpen] = useState(false);
  const [designerModalTab, setDesignerModalTab] = useState<'appearance' | 'fields'>('appearance');
  const [designerMode, setDesignerMode] = useState<'edit' | 'new'>('edit');
  const [formName, setFormName] = useState('');
  const [formDimension, setFormDimension] = useState<LabelDimension>('4x6');
  const [formSummary, setFormSummary] = useState('');
  const [formAppearance, setFormAppearance] = useState<TemplateAppearance>(DEFAULT_TEMPLATE_APPEARANCE);
  const [formFields, setFormFields] = useState<PharmaFieldItem[]>(DEFAULT_PHARMA_FIELDS);

  // Helper to open 2-Tab Designer Modal for Editing
  const openEditDesignerModal = (tpl: LabelTemplate) => {
    setDesignerMode('edit');
    setDesignerModalTab('appearance');
    setFormName(tpl.name);
    setFormDimension(tpl.dimension);
    setFormSummary(tpl.changeSummary || '');
    setFormAppearance(tpl.appearance || DEFAULT_TEMPLATE_APPEARANCE);
    setFormFields(tpl.fields && tpl.fields.length > 0 ? tpl.fields : DEFAULT_PHARMA_FIELDS);
    setIsDesignerModalOpen(true);
  };

  // Helper to open 2-Tab Designer Modal for New Template
  const openNewDesignerModal = () => {
    setDesignerMode('new');
    setDesignerModalTab('appearance');
    setFormName('');
    setFormDimension('4x6');
    setFormSummary('Initial validated template layout');
    setFormAppearance(DEFAULT_TEMPLATE_APPEARANCE);
    setFormFields(DEFAULT_PHARMA_FIELDS);
    setIsDesignerModalOpen(true);
  };

  // Reorder Field Up or Down
  const moveField = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === formFields.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const copy = [...formFields];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    setFormFields(copy.map((f, i) => ({ ...f, order: i + 1 })));
  };

  // Toggle Field Inclusion
  const toggleFieldIncl = (id: string) => {
    setFormFields((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        if (f.mandatory) return f; // Mandatory fields cannot be unticked
        return { ...f, included: !f.included };
      })
    );
  };

  // Set Custom Label Override
  const setFieldOverride = (id: string, val: string) => {
    setFormFields((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        return { ...f, customLabelOverride: val };
      })
    );
  };

  // Reset Overrides
  const resetAllOverrides = () => {
    setFormFields((prev) =>
      prev.map((f) => ({ ...f, customLabelOverride: '' }))
    );
  };

  // Include / Exclude Optional Fields
  const toggleAllOptional = (include: boolean) => {
    setFormFields((prev) =>
      prev.map((f) => (f.mandatory ? f : { ...f, included: include }))
    );
  };

  // Save 2-Tab Designer Modal
  const handleSaveDesigner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (designerMode === 'edit' && selectedTemplate) {
      updateTemplate(selectedTemplate.id, {
        name: formName.trim(),
        dimension: formDimension,
        changeSummary: formSummary.trim(),
        appearance: formAppearance,
        fields: formFields
      });

      // Background sync to backend database API
      fetch('/api/templates/index.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTemplate.id,
          name: formName.trim(),
          dimension: formDimension,
          change_summary: formSummary.trim(),
          appearance: formAppearance,
          fields: formFields,
          elements: selectedTemplate.elements
        })
      }).catch(() => {});
    } else {
      addTemplate({
        name: formName.trim(),
        dimension: formDimension,
        changeSummary: formSummary.trim() || 'New template registered'
      });
    }

    setIsDesignerModalOpen(false);
  };

  // Generate Label Preview
  const handleOpenPreview = (tpl: LabelTemplate) => {
    const overrides: Record<string, string> = {};
    if (tpl.fields) {
      tpl.fields.forEach((f) => {
        if (f.customLabelOverride && f.customLabelOverride.trim()) {
          overrides[f.id] = f.customLabelOverride.trim();
        }
      });
    }

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
      appearance: tpl.appearance,
      fieldOverrides: overrides
    };
    setPreviewSnapshot(preview);
  };

  // Preview directly from within Designer Modal
  const handlePreviewFromModal = () => {
    const overrides: Record<string, string> = {};
    formFields.forEach((f) => {
      if (f.customLabelOverride && f.customLabelOverride.trim()) {
        overrides[f.id] = f.customLabelOverride.trim();
      }
    });

    const preview: LabelSnapshot = {
      id: `preview_modal_${Date.now()}`,
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
      templateRevision: selectedTemplate?.revision || '1.0',
      dimension: formDimension,
      generatedAt: new Date().toLocaleString(),
      generatedBy: `${currentUser.name} (Live Designer Preview)`,
      reprintCount: 0,
      isWatermarked: true,
      watermarkText: 'DESIGNER PREVIEW',
      watermarkColor: 'blue',
      appearance: formAppearance,
      fieldOverrides: overrides
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
    { label: 'Obsolete', color: 'bg-slate-100 text-slate-500 border-slate-200' }
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
                onClick={openNewDesignerModal}
              >
                + New Template
              </PrimaryBtn>
            )}
            {selectedTemplate && selectedTemplate.status === 'Approved/Effective' && (
              <SecondaryBtn
                icon={<GitBranch className="w-4 h-4" />}
                onClick={() => {
                  setNewDimension(selectedTemplate.dimension);
                  setIsRevisionModalOpen(true);
                }}
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
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mr-2">
            Revision Lifecycle:
          </span>
          {statusFlow.map((s, i) => (
            <React.Fragment key={s.label}>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${s.color}`}>
                {s.label}
              </span>
              {i < statusFlow.length - 1 && <span className="text-slate-300 font-bold">→</span>}
            </React.Fragment>
          ))}
          <span className="ml-auto text-[10px] text-slate-400 italic">
            Editing an Approved template always creates a new Draft — never modifies in-place.
          </span>
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
                        Rev {tpl.revision} · {tpl.dimension}&quot;
                      </div>
                    </div>
                    <StatusBadge status={tpl.status} />
                  </div>
                  {tpl.changeSummary && (
                    <div
                      className={`text-[11px] italic mt-2.5 pt-2 border-t font-semibold ${
                        isSelected ? 'border-indigo-200 text-indigo-900' : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      &quot;{tpl.changeSummary}&quot;
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
                      {selectedTemplate.status === 'Draft' &&
                      (currentUser.role === 'Admin' || currentUser.role === 'SuperAdmin' || currentUser.role === 'Supervisor') ? (
                        <span className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg text-xs font-bold text-indigo-900">
                          Dimension:
                          <select
                            value={selectedTemplate.dimension}
                            onChange={(e) => updateTemplateDimension(selectedTemplate.id, e.target.value as LabelDimension)}
                            className="bg-white border border-indigo-300 rounded px-1.5 py-0.5 text-xs text-indigo-950 font-mono font-bold focus:outline-none cursor-pointer"
                          >
                            <option value="4x6">4 × 6&quot; (Standard Drum)</option>
                            <option value="6x4">6 × 4&quot; (Wide Shipper)</option>
                            <option value="4x4">4 × 4&quot; (Square Pail)</option>
                            <option value="3x2">3 × 2&quot; (Small Container)</option>
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

                    {/* Open Full 2-Tab Designer Modal */}
                    {selectedTemplate.status !== 'Approved/Effective' && (
                      <PrimaryBtn
                        icon={<Edit3 className="w-4 h-4" />}
                        onClick={() => openEditDesignerModal(selectedTemplate)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Designer Studio (2-Tab)
                      </PrimaryBtn>
                    )}

                    {/* Submit for QA Review */}
                    {selectedTemplate.status === 'Draft' && currentUser.role === 'Admin' && (
                      <SecondaryBtn
                        icon={<Send className="w-4 h-4" />}
                        onClick={() => submitTemplateForReview(selectedTemplate.id)}
                      >
                        Submit to QA
                      </SecondaryBtn>
                    )}

                    {/* Awaiting QA Approval */}
                    {selectedTemplate.status === 'In Review' && currentUser.role === 'Admin' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold shadow-xs">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> Awaiting QA Approval
                      </span>
                    )}

                    {/* QA Supervisor Approve Button */}
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
                  </div>
                </div>

                {/* Appearance & 17 Fields Summary Pills */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-blue-600" /> Appearance & Size
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                        {selectedTemplate.appearance?.labelMode === 'preprinted' ? 'Pre-Printed' : 'Full Label'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <div>Header Font: <strong>{selectedTemplate.appearance?.headerFontSizePt || 16}pt</strong> · Body Font: <strong>{selectedTemplate.appearance?.bodyFontSizePt || 10}pt</strong></div>
                      <div>Expiry Field: <strong>{selectedTemplate.appearance?.expiryType || 'EXPIRY'}</strong> · Format: <strong>{selectedTemplate.appearance?.expiryDateFormat || 'DD/MM/YYYY'}</strong></div>
                      <div className="flex items-center gap-2 mt-1">
                        <span>Header Color:</span>
                        <span
                          className="w-4 h-4 rounded-full border border-slate-300 inline-block shrink-0 shadow-xs"
                          style={{ backgroundColor: selectedTemplate.appearance?.headerBgColor || '#0b2b52' }}
                        />
                        <span className="font-mono text-[10px]">{selectedTemplate.appearance?.headerBgColor || '#0b2b52'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <ListOrdered className="w-3.5 h-3.5 text-indigo-600" /> Pharma Fields (17)
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                        {(selectedTemplate.fields || DEFAULT_PHARMA_FIELDS).filter((f) => f.included).length}/17 Included
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <div>
                        Mandatory Fields: <strong>{(selectedTemplate.fields || DEFAULT_PHARMA_FIELDS).filter((f) => f.mandatory).length} (★ Protected)</strong>
                      </div>
                      <div>
                        Custom Overrides Configured: <strong>{(selectedTemplate.fields || DEFAULT_PHARMA_FIELDS).filter((f) => !!f.customLabelOverride).length}</strong>
                      </div>
                      <div className="text-[10px] text-slate-500 italic mt-1">
                        Click &quot;Designer Studio (2-Tab)&quot; to edit headers, overrides &amp; ordering.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legacy Layout Elements Grid */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      <span>Element Toggles</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {selectedTemplate.elements.map((el) => (
                      <div
                        key={el.id}
                        className={`p-2 rounded-lg border flex items-center justify-between ${
                          el.enabled ? 'bg-white border-slate-200' : 'bg-slate-100 text-slate-400 line-through'
                        }`}
                      >
                        <span className="font-medium truncate mr-1">{el.name}</span>
                        {selectedTemplate.status !== 'Approved/Effective' ? (
                          <button
                            type="button"
                            onClick={() => toggleTemplateElement(selectedTemplate.id, el.id)}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              el.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {el.enabled ? 'ON' : 'OFF'}
                          </button>
                        ) : (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${el.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                            {el.enabled ? 'ON' : 'OFF'}
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
                    { label: 'SSCC Structure', value: 'Ext(1) + Prefix(7) + Serial(9) + Check(1) = 18 digits' }
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

      {/* ========================================================================= */}
      {/* 2-TAB TEMPLATE DESIGNER MODAL (PDF Pages 21 & 22) */}
      {/* ========================================================================= */}
      {isDesignerModalOpen && (
        <Modal
          onClose={() => setIsDesignerModalOpen(false)}
          title={`Template Designer: ${formName || 'New Template'}`}
          subtitle="Configure thermal physical stock, typography, header colors, 17 pharma fields, and custom label overrides."
          maxW="max-w-4xl"
        >
          <form onSubmit={handleSaveDesigner} className="space-y-4">
            {/* Modal Tabs Header (PDF Pages 21 & 22) */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setDesignerModalTab('appearance')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
                  designerModalTab === 'appearance'
                    ? 'bg-[#0b2b52] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                Tab 1: Appearance &amp; Size
              </button>

              <button
                type="button"
                onClick={() => setDesignerModalTab('fields')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
                  designerModalTab === 'fields'
                    ? 'bg-[#0b2b52] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                Tab 2: Fields &amp; Order (17 Fields)
              </button>

              <div className="ml-auto">
                <button
                  type="button"
                  onClick={handlePreviewFromModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold border border-blue-200 transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Live Preview
                </button>
              </div>
            </div>

            {/* TAB 1: APPEARANCE & SIZE (PDF Page 21) */}
            {designerModalTab === 'appearance' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Left Column: Physical Stock & Dimensions */}
                <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-200">
                    Physical Stock &amp; Dimensions
                  </h4>

                  <FormField label="Template Design Name" required hint="e.g. Standard 4x6 API Drum Export">
                    <Input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Bulk Export API Standard (4x6)"
                      required
                    />
                  </FormField>

                  <FormField label="Label Stock Dimension / Size" required hint="Physical roll size">
                    <Select
                      value={formDimension}
                      onChange={(e) => setFormDimension(e.target.value as LabelDimension)}
                    >
                      <option value="4x6">4 × 6 inches (Standard API Fibre Drum — Portrait)</option>
                      <option value="6x4">6 × 4 inches (Wide Shipper Box — Landscape)</option>
                      <option value="4x4">4 × 4 inches (Square Pail / Jerrycan)</option>
                      <option value="3x2">3 × 2 inches (Small Container / Specimen Bottle)</option>
                    </Select>
                  </FormField>

                  <FormField label="Label Printing Mode" hint="Select full header or pre-printed drum mode">
                    <Select
                      value={formAppearance.labelMode}
                      onChange={(e) =>
                        setFormAppearance({ ...formAppearance, labelMode: e.target.value as 'full' | 'preprinted' })
                      }
                    >
                      <option value="full">Full Label (Print Company Header + Data Area + Barcodes)</option>
                      <option value="preprinted">Pre-Printed Drums (Data area only, suppresses company header)</option>
                    </Select>
                  </FormField>

                  <FormField label="Packaging Purpose &amp; Change Summary">
                    <Textarea
                      value={formSummary}
                      onChange={(e) => setFormSummary(e.target.value)}
                      placeholder="Enter regulatory justification or packaging layout purpose"
                      rows={2}
                    />
                  </FormField>

                  {/* Border and Layout Checkboxes */}
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formAppearance.showHeaderBar}
                        onChange={(e) => setFormAppearance({ ...formAppearance, showHeaderBar: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold text-slate-700">Show Company Header Bar on label</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formAppearance.showOuterBorder}
                        onChange={(e) => setFormAppearance({ ...formAppearance, showOuterBorder: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold text-slate-700">Show Outer Border on label sticker</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formAppearance.show2DBarcode}
                        onChange={(e) => setFormAppearance({ ...formAppearance, show2DBarcode: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold text-slate-700">Show 2D DataMatrix along with GS1-128 linear barcode</span>
                    </label>
                  </div>
                </div>

                {/* Right Column: Typography, Date Formats & Header Colors */}
                <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-200">
                    Typography, Date Formats &amp; Colors
                  </h4>

                  <div className="grid grid-cols-2 gap-2">
                    <FormField label="Header Font (pt)">
                      <Select
                        value={formAppearance.headerFontSizePt.toString()}
                        onChange={(e) =>
                          setFormAppearance({ ...formAppearance, headerFontSizePt: parseInt(e.target.value, 10) })
                        }
                      >
                        <option value="14">14 pt (Compact)</option>
                        <option value="16">16 pt (Standard)</option>
                        <option value="18">18 pt (Medium Large)</option>
                        <option value="20">20 pt (Large Bold)</option>
                        <option value="22">22 pt (Extra Large)</option>
                      </Select>
                    </FormField>

                    <FormField label="Body Font (pt)">
                      <Select
                        value={formAppearance.bodyFontSizePt.toString()}
                        onChange={(e) =>
                          setFormAppearance({ ...formAppearance, bodyFontSizePt: parseInt(e.target.value, 10) })
                        }
                      >
                        <option value="8">8 pt (Ultra Dense)</option>
                        <option value="9">9 pt (Compact)</option>
                        <option value="10">10 pt (Standard)</option>
                        <option value="11">11 pt (Medium)</option>
                        <option value="12">12 pt (Large)</option>
                      </Select>
                    </FormField>
                  </div>

                  {/* Expiry Field Type */}
                  <FormField label="Expiry Field Type on Container">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormAppearance({ ...formAppearance, expiryType: 'EXPIRY' })}
                        className={`py-1.5 px-3 rounded-lg border font-bold text-center transition ${
                          formAppearance.expiryType === 'EXPIRY'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        EXPIRY DATE
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormAppearance({ ...formAppearance, expiryType: 'RETEST' })}
                        className={`py-1.5 px-3 rounded-lg border font-bold text-center transition ${
                          formAppearance.expiryType === 'RETEST'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        RETEST DATE
                      </button>
                    </div>
                  </FormField>

                  <div className="grid grid-cols-2 gap-2">
                    <FormField label="Mfg Date Format">
                      <Select
                        value={formAppearance.mfgDateFormat}
                        onChange={(e) =>
                          setFormAppearance({ ...formAppearance, mfgDateFormat: e.target.value as any })
                        }
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY (Standard)</option>
                        <option value="MM/YYYY">MM/YYYY (Month/Year)</option>
                        <option value="MMM YYYY">MMM YYYY (e.g. Nov 2026)</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                      </Select>
                    </FormField>

                    <FormField label="Expiry Date Format">
                      <Select
                        value={formAppearance.expiryDateFormat}
                        onChange={(e) =>
                          setFormAppearance({ ...formAppearance, expiryDateFormat: e.target.value as any })
                        }
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY (Standard)</option>
                        <option value="MM/YYYY">MM/YYYY (Month/Year)</option>
                        <option value="MMM YYYY">MMM YYYY (e.g. Nov 2026)</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                      </Select>
                    </FormField>
                  </div>

                  {/* Header Background Color Picker */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Header Bar Background Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formAppearance.headerBgColor}
                        onChange={(e) => setFormAppearance({ ...formAppearance, headerBgColor: e.target.value })}
                        className="w-8 h-8 rounded-lg border border-slate-300 p-0.5 cursor-pointer shrink-0"
                      />
                      <Input
                        value={formAppearance.headerBgColor}
                        onChange={(e) => setFormAppearance({ ...formAppearance, headerBgColor: e.target.value })}
                        className="font-mono text-xs w-28 uppercase"
                      />
                      <div className="flex items-center gap-1">
                        {['#0b2b52', '#1e40af', '#000000', '#0f766e', '#1e293b'].map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => setFormAppearance({ ...formAppearance, headerBgColor: hex })}
                            className="w-5 h-5 rounded-full border border-slate-300 shadow-xs transition hover:scale-110"
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Header Text Font Color */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Header Bar Text Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formAppearance.headerFontColor}
                        onChange={(e) => setFormAppearance({ ...formAppearance, headerFontColor: e.target.value })}
                        className="w-8 h-8 rounded-lg border border-slate-300 p-0.5 cursor-pointer shrink-0"
                      />
                      <Input
                        value={formAppearance.headerFontColor}
                        onChange={(e) => setFormAppearance({ ...formAppearance, headerFontColor: e.target.value })}
                        className="font-mono text-xs w-28 uppercase"
                      />
                      <div className="flex items-center gap-1">
                        {['#ffffff', '#f8fafc', '#fbbf24'].map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => setFormAppearance({ ...formAppearance, headerFontColor: hex })}
                            className="w-5 h-5 rounded-full border border-slate-300 shadow-xs transition hover:scale-110"
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: FIELDS & ORDER (17 PHARMA FIELDS) (PDF Page 22) */}
            {designerModalTab === 'fields' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      Reorder fields with <strong>↑</strong> and <strong>↓</strong> buttons. Government mandatory fields are marked with <strong>★</strong>. Enter custom text in <strong>Custom Label Override</strong> to rename any heading printed on the physical label.
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={resetAllOverrides}
                      className="px-2 py-1 rounded bg-white border border-blue-300 text-blue-800 text-[10px] font-bold hover:bg-blue-100 transition"
                    >
                      Reset Overrides
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAllOptional(true)}
                      className="px-2 py-1 rounded bg-white border border-blue-300 text-blue-800 text-[10px] font-bold hover:bg-blue-100 transition"
                    >
                      Include All
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAllOptional(false)}
                      className="px-2 py-1 rounded bg-white border border-blue-300 text-blue-800 text-[10px] font-bold hover:bg-blue-100 transition"
                    >
                      Exclude Optional
                    </button>
                  </div>
                </div>

                {/* 17 Fields Spreadsheet Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0b2b52] text-white font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3 w-16 text-center">Order</th>
                        <th className="py-2.5 px-3 w-16 text-center">Incl.</th>
                        <th className="py-2.5 px-3">Standard Pharma Field Title</th>
                        <th className="py-2.5 px-3 w-28 text-center">Mandatory</th>
                        <th className="py-2.5 px-3">Custom Label Override (Text on Label)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {formFields.map((field, idx) => (
                        <tr
                          key={field.id}
                          className={`hover:bg-slate-50 transition ${!field.included ? 'opacity-50 bg-slate-50/60' : ''}`}
                        >
                          {/* Order & Reorder Controls */}
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 font-mono font-bold flex items-center justify-center text-[10px]">
                                {idx + 1}
                              </span>
                              <div className="flex flex-col">
                                <button
                                  type="button"
                                  onClick={() => moveField(idx, 'up')}
                                  disabled={idx === 0}
                                  className="text-slate-400 hover:text-blue-600 disabled:opacity-20 p-0.5"
                                  title="Move Up"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveField(idx, 'down')}
                                  disabled={idx === formFields.length - 1}
                                  className="text-slate-400 hover:text-blue-600 disabled:opacity-20 p-0.5"
                                  title="Move Down"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Inclusion Checkbox */}
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={field.included}
                              disabled={field.mandatory}
                              onChange={() => toggleFieldIncl(field.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>

                          {/* Standard Field Label */}
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-900">{field.defaultLabel}</div>
                            <div className="text-[10px] text-slate-400 font-mono">Field ID: {field.id}</div>
                          </td>

                          {/* Mandatory Status Badge */}
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            {field.mandatory ? (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                ★ Mandatory
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                Optional
                              </span>
                            )}
                          </td>

                          {/* Custom Label Override Input Box (PDF Page 22) */}
                          <td className="py-2 px-3">
                            <div className="relative">
                              <Input
                                value={field.customLabelOverride || ''}
                                onChange={(e) => setFieldOverride(field.id, e.target.value)}
                                placeholder={`Default: "${field.defaultLabel}"`}
                                className="text-xs py-1 px-2.5 h-8 bg-slate-50 focus:bg-white"
                              />
                              {field.customLabelOverride && (
                                <div className="text-[10px] font-mono text-emerald-700 mt-0.5">
                                  ✓ Prints as: <strong>&quot;{field.customLabelOverride}&quot;</strong>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-mono">
                {formFields.filter((f) => f.included).length} of 17 fields enabled · GxP Compliant
              </span>
              <div className="flex items-center gap-2">
                <SecondaryBtn type="button" onClick={() => setIsDesignerModalOpen(false)}>
                  Cancel
                </SecondaryBtn>
                <PrimaryBtn type="submit" icon={<CheckCircle2 className="w-4 h-4" />}>
                  Save Template Configuration
                </PrimaryBtn>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* WATERMARKED THERMAL PREVIEW MODAL */}
      {/* ========================================================================= */}
      {previewSnapshot && (
        <Modal
          onClose={() => setPreviewSnapshot(null)}
          title={`Thermal Design Preview — ${previewSnapshot.dimension}" Format`}
          subtitle={`Mockup with Appearance & Custom Label Overrides · Rev ${previewSnapshot.templateRevision}`}
          maxW={
            previewSnapshot.dimension === '6x4'
              ? 'max-w-3xl'
              : previewSnapshot.dimension === '4x4'
              ? 'max-w-xl'
              : 'max-w-lg'
          }
        >
          <ThermalLabelSimulator label={previewSnapshot} showActions={false} />
          <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
            <SecondaryBtn onClick={() => setPreviewSnapshot(null)}>Close Preview</SecondaryBtn>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* BRANCH REVISION MODAL */}
      {/* ========================================================================= */}
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

            <FormField label="Justification / Change Summary" required>
              <Textarea
                value={newRevisionSummary}
                onChange={(e) => setNewRevisionSummary(e.target.value)}
                placeholder="Document purpose for creating a new revision branch"
                rows={3}
                required
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <SecondaryBtn onClick={() => setIsRevisionModalOpen(false)}>Cancel</SecondaryBtn>
              <PrimaryBtn
                onClick={handleCreateRevisionSubmit}
                disabled={!newRevisionSummary.trim()}
                icon={<GitBranch className="w-4 h-4" />}
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
