import React from 'react';
import { LabelSnapshot, LabelDimension } from '../types';
import { generateCode128SvgBars, generateMatrixGrid } from '../utils/barcode';
import { Printer, ShieldCheck, X, Tag, Download, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ThermalLabelProps {
  label: LabelSnapshot;
  onPrint?: () => void;
  onClose?: () => void;
  showActions?: boolean;
}

interface DimensionConfig {
  containerClass: string;
  maxW: string;
  barcodeWidth: number;
  barcodeHeight: number;
  matrixSize: number;
  name: string;
}

const dimensionConfigs: Record<LabelDimension, DimensionConfig> = {
  '4x6': {
    containerClass: 'w-[390px] h-[585px] p-4',
    maxW: 'max-w-[420px]',
    barcodeWidth: 340,
    barcodeHeight: 48,
    matrixSize: 68,
    name: '4 × 6" (Standard Drum)',
  },
  '6x4': {
    containerClass: 'w-[580px] h-[390px] p-3.5',
    maxW: 'max-w-[620px]',
    barcodeWidth: 500,
    barcodeHeight: 40,
    matrixSize: 56,
    name: '6 × 4" (Wide Shipper)',
  },
  '4x4': {
    containerClass: 'w-[440px] h-[440px] p-3.5',
    maxW: 'max-w-[460px]',
    barcodeWidth: 380,
    barcodeHeight: 38,
    matrixSize: 52,
    name: '4 × 4" (Square Pail)',
  },
  '3x2': {
    containerClass: 'w-[360px] h-[245px] p-2.5',
    maxW: 'max-w-[380px]',
    barcodeWidth: 280,
    barcodeHeight: 26,
    matrixSize: 38,
    name: '3 × 2" (Small Container)',
  },
};

export const ThermalLabelSimulator: React.FC<ThermalLabelProps> = ({
  label,
  onPrint,
  onClose,
  showActions = true,
}) => {
  const dim = (label.dimension as LabelDimension) || '4x6';
  const cfg = dimensionConfigs[dim] || dimensionConfigs['4x6'];
  const { canDownloadLabelCopy, logAudit } = useApp();
  const canDownload = canDownloadLabelCopy();

  const appearance = label.appearance;
  const fieldOverrides = label.fieldOverrides || {};

  const getFieldLabel = (fieldId: string, fallback: string): string => {
    return fieldOverrides[fieldId] || fallback;
  };

  const isPreprinted = appearance?.labelMode === 'preprinted';
  const showOuterBorder = appearance?.showOuterBorder !== false;
  const showHeaderBar = appearance?.showHeaderBar !== false;
  const headerBgColor = appearance?.headerBgColor || '#0b2b52';
  const headerFontColor = appearance?.headerFontColor || '#ffffff';
  const expiryHeader = appearance?.expiryType === 'RETEST'
    ? getFieldLabel('expiry_date', 'RETEST DATE')
    : getFieldLabel('expiry_date', 'EXP DATE');

  const handleDownloadCopy = () => {
    if (!canDownload) {
      alert('Access Denied: Advance permission "Download Label Copy" is required for your role. Please request access from your Plant Administrator in Users & Security.');
      return;
    }

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PharmLabel Verified Copy - Batch ${label.batchNumber} - Drum #${label.drumNumber}</title>
  <style>
    body { font-family: monospace; padding: 24px; color: #0f172a; max-width: 450px; margin: 0 auto; }
    .header { border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
    .box { border: 1px solid #94a3b8; padding: 12px; border-radius: 8px; margin-bottom: 12px; }
    .sscc { font-size: 16px; font-weight: bold; letter-spacing: 2px; }
    .footer { font-size: 10px; color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 8px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin:0;font-size:18px;">PHARMLABEL GS1 PALLET/DRUM LABEL PROOF</h2>
    <div style="font-size:11px;color:#475569;">21 CFR Part 11 Regulated Electronic Copy</div>
  </div>
  <div class="box">
    <div><strong>BATCH NUMBER:</strong> ${label.batchNumber}</div>
    <div><strong>DRUM CONTAINER:</strong> #${label.drumNumber}</div>
    <div><strong>PRODUCT:</strong> ${label.productName || 'Pharmaceutical Active Ingredient'}</div>
    <div><strong>NET WEIGHT:</strong> ${label.netWeight} KG</div>
    <div><strong>GROSS WEIGHT:</strong> ${label.grossWeight} KG</div>
    <div><strong>TARE WEIGHT:</strong> ${(label.grossWeight - label.netWeight).toFixed(1)} KG</div>
  </div>
  <div class="box">
    <div style="font-size:11px;color:#475569;">GS1 SERIAL SHIPPING CONTAINER CODE (00):</div>
    <div class="sscc">${label.sscc}</div>
  </div>
  <div class="footer">
    <div>Generated: ${label.generatedAt} IST by ${label.generatedBy}</div>
    <div>Unique Label Snapshot ID: ${label.id}</div>
    <div>GxP Verification: US FDA 21 CFR Part 11 §11.10(b) Data Integrity Verified</div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LABEL_COPY_${label.batchNumber}_Drum_${label.drumNumber}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    logAudit('DOWNLOAD_LABEL_COPY', 'Serialization', {
      batchRef: label.batchNumber,
      drumRef: label.drumNumber,
      sscc: label.sscc,
      newValue: 'Exported verified label copy HTML proof',
      reason: 'Advance permission label digital proof download'
    });
  };

  // Generate Code-128 barcode pattern for SSCC
  const barcodeBars = generateCode128SvgBars(label.sscc.replace(/\D/g, ''));
  // Generate 2D Matrix for SSCC + Batch
  const matrixData = `${label.sscc}|${label.batchNumber}|${label.drumNumber}|${label.grossWeight}`;
  const matrixGrid = generateMatrixGrid(matrixData, 21);

  const handleBrowserPrint = () => {
    if (onPrint) onPrint();
    window.print();
  };

  // Watermark component
  const watermarkNode = label.isWatermarked && label.watermarkText ? (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
      <div
        className={`transform -rotate-45 font-black uppercase tracking-widest px-4 py-1.5 border-4 ${
          dim === '3x2' ? 'text-2xl border-2' : dim === '6x4' ? 'text-4xl' : 'text-3xl'
        } ${
          label.watermarkColor === 'blue'
            ? 'text-blue-600/70 border-blue-600/70'
            : 'text-rose-600/75 border-rose-600/75'
        }`}
      >
        {label.watermarkText}
      </div>
    </div>
  ) : null;

  return (
    <div className="flex flex-col items-center">
      {/* Simulated thermal container according to exact aspect ratio */}
      <div
        id="thermal-label-container"
        className={`relative ${cfg.containerClass} bg-white ${showOuterBorder ? 'border-2 border-slate-900' : 'border border-dashed border-slate-300'} rounded-sm text-slate-950 font-sans shadow-md select-none overflow-hidden flex flex-col justify-between`}
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {watermarkNode}

        {/* ----------------- 6x4 WIDE SHIPPER LAYOUT ----------------- */}
        {dim === '6x4' ? (
          <>
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-1.5 flex items-start justify-between">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
                  MANUFACTURER & LICENSED TRACEABILITY
                </div>
                <div className="text-sm font-extrabold tracking-tight text-slate-900">
                  {label.companyName}
                </div>
                <div className="text-[9px] font-mono text-slate-700">
                  Mfg Lic No: <span className="font-semibold">{label.mfgLicenseNumber}</span>
                </div>
              </div>
              <div className="text-right flex items-center gap-2">
                <span className="inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold bg-slate-900 text-white rounded-xs">
                  REV {label.templateRevision}
                </span>
                <span className="inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold bg-indigo-100 text-indigo-900 rounded-xs border border-indigo-300">
                  6×4&quot; WIDE SHIPPER
                </span>
              </div>
            </div>

            {/* Product Identity */}
            <div className="py-1.5 border-b border-slate-900 flex items-center justify-between">
              <div>
                <div className="text-[8px] uppercase font-bold text-slate-500">
                  PRODUCT / ACTIVE PHARMACEUTICAL INGREDIENT
                </div>
                <div className="text-sm font-black uppercase text-slate-950 leading-tight">
                  {label.productName}
                </div>
              </div>
              <div className="text-right text-[10px] font-mono text-slate-800 space-y-0.5">
                <div>Product Code: <strong className="text-black">{label.productCode}</strong></div>
                <div>GTIN-14: <strong className="text-black">{label.gtin14}</strong></div>
              </div>
            </div>

            {/* 2-Column Middle Grid: Details (Left) + DataMatrix & Storage (Right) */}
            <div className="grid grid-cols-2 gap-3 py-1.5 border-b-2 border-slate-900 text-[10px]">
              {/* Left Column: Batch & Weights */}
              <div className="border-r border-slate-300 pr-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600 font-bold">BATCH / LOT:</span>
                  <strong className="font-mono text-xs">{label.batchNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-bold">DRUM / CONTAINER:</span>
                  <strong className="font-mono bg-slate-100 px-1 rounded text-xs">
                    #{label.drumNumber} of {label.totalDrums}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">MFG / EXP:</span>
                  <span className="font-mono font-semibold">{label.mfgDate} · {label.expiryDate}</span>
                </div>
                <div className="flex justify-between pt-0.5 border-t border-slate-200">
                  <span className="text-slate-600">NET / GROSS WT:</span>
                  <strong className="font-mono font-bold text-slate-900">
                    {label.netWeight.toFixed(2)} KG / {label.grossWeight.toFixed(2)} KG
                  </strong>
                </div>
              </div>

              {/* Right Column: DataMatrix + Conditions */}
              <div className="flex items-center gap-2.5">
                <div className="shrink-0 bg-white p-0.5 border border-slate-300">
                  <svg width={cfg.matrixSize} height={cfg.matrixSize} viewBox="0 0 21 21" className="shape-rendering-crispEdges">
                    {matrixGrid.map((row, r) =>
                      row.map((filled, c) => (
                        <rect
                          key={`${r}-${c}`}
                          x={c}
                          y={r}
                          width="1"
                          height="1"
                          fill={filled ? '#0f172a' : '#ffffff'}
                        />
                      ))
                    )}
                  </svg>
                </div>
                <div className="text-[8.5px] text-slate-700 leading-tight space-y-1">
                  <p className="font-semibold text-slate-900">{label.storageConditions}</p>
                  <p className="font-bold text-slate-950 uppercase">{label.cautionText}</p>
                  <div className="font-mono text-[9px] font-bold text-emerald-800">
                    STATUS: {label.labelType} {label.reprintCount > 0 ? `(REPRINT #${label.reprintCount})` : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Linear Barcode Block */}
            <div className="pt-1 text-center">
              <div className="text-[9px] font-bold tracking-widest text-slate-600 uppercase">
                SERIAL SHIPPING CONTAINER CODE (GS1 SSCC-18)
              </div>
              <div className="my-0.5 flex justify-center overflow-hidden">
                <svg width={cfg.barcodeWidth} height={cfg.barcodeHeight} viewBox={`0 0 ${barcodeBars.length} 40`} preserveAspectRatio="none">
                  {barcodeBars.split('').map((bit, idx) => (
                    <rect
                      key={idx}
                      x={idx}
                      y="0"
                      width="1"
                      height="40"
                      fill={bit === '1' ? '#0f172a' : '#ffffff'}
                    />
                  ))}
                </svg>
              </div>
              <div className="font-mono text-xs font-black tracking-widest text-slate-950 bg-slate-50 py-0.5 border border-slate-200">
                {label.sscc}
              </div>
              <div className="mt-0.5 flex items-center justify-between text-[7.5px] text-slate-500 font-mono">
                <span>GEN: {label.generatedAt}</span>
                <span>BY: {label.generatedBy}</span>
              </div>
            </div>
          </>
        ) : dim === '3x2' ? (
          /* ----------------- 3x2 COMPACT CONTAINER LAYOUT ----------------- */
          <>
            <div className="border-b border-slate-900 pb-1 flex items-start justify-between">
              <div>
                <div className="text-[7px] font-bold uppercase tracking-wider text-slate-600">
                  APEX HEALTHCARE · LIC: {label.mfgLicenseNumber}
                </div>
                <div className="text-xs font-extrabold text-slate-900 truncate max-w-[200px]">
                  {label.productName}
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-1 text-[7px] font-mono font-bold bg-indigo-100 text-indigo-900 rounded border border-indigo-200">
                  3×2&quot;
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1 py-1 border-b border-slate-900 text-[8px] font-mono">
              <div>
                <span className="text-slate-500">BATCH:</span> <strong>{label.batchNumber}</strong>
              </div>
              <div>
                <span className="text-slate-500">DRUM:</span> <strong>#{label.drumNumber}/{label.totalDrums}</strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500">NET:</span> <strong>{label.netWeight.toFixed(1)}KG</strong>
              </div>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800 gap-2">
              <div className="shrink-0 bg-white p-0.5 border border-slate-300">
                <svg width={cfg.matrixSize} height={cfg.matrixSize} viewBox="0 0 21 21">
                  {matrixGrid.map((row, r) =>
                    row.map((filled, c) => (
                      <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill={filled ? '#0f172a' : '#ffffff'} />
                    ))
                  )}
                </svg>
              </div>
              <div className="text-[7.5px] text-slate-700 leading-tight flex-1">
                <p className="font-semibold text-slate-900">{label.storageConditions}</p>
                <p className="font-mono text-[7px] text-slate-500">EXP: {label.expiryDate}</p>
              </div>
            </div>

            <div className="text-center pt-0.5">
              <div className="my-0.5 flex justify-center overflow-hidden">
                <svg width={cfg.barcodeWidth} height={cfg.barcodeHeight} viewBox={`0 0 ${barcodeBars.length} 26`} preserveAspectRatio="none">
                  {barcodeBars.split('').map((bit, idx) => (
                    <rect key={idx} x={idx} y="0" width="1" height="26" fill={bit === '1' ? '#0f172a' : '#ffffff'} />
                  ))}
                </svg>
              </div>
              <div className="font-mono text-[9px] font-black tracking-wider text-slate-950">
                {label.sscc}
              </div>
            </div>
          </>
        ) : (
          /* ----------------- 4x6 PORTRAIT & 4x4 SQUARE LAYOUT ----------------- */
          <>
            {/* Top Header Block: Company & Lic No */}
            {showHeaderBar ? (
              <div
                className="border-b-2 border-slate-900 pb-2 flex items-start justify-between p-2.5 -mx-4 -mt-4 mb-2"
                style={appearance?.headerBgColor ? { backgroundColor: headerBgColor, color: headerFontColor } : {}}
              >
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider opacity-80">
                    {getFieldLabel('company_header', 'MANUFACTURER & LICENSED TRACEABILITY')}
                  </div>
                  <div className="text-sm font-extrabold tracking-tight">
                    {label.companyName}
                  </div>
                  <div className="text-[10px] font-mono opacity-90">
                    {getFieldLabel('mfg_license', 'Mfg Lic No')}: <span className="font-semibold">{label.mfgLicenseNumber}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white/20 backdrop-blur-xs rounded-xs">
                    REV {label.templateRevision}
                  </span>
                  <div className="text-[9px] font-mono font-bold opacity-80 mt-0.5">
                    {label.dimension}&quot; THERMAL
                  </div>
                </div>
              </div>
            ) : isPreprinted ? (
              <div className="border border-dashed border-slate-300 p-2 -mx-4 -mt-4 mb-2 text-center text-[9px] font-mono text-slate-400">
                [ PRE-PRINTED COMPANY HEADER AREA ]
              </div>
            ) : null}

            {/* Product Identity Block */}
            <div className="py-2 border-b border-slate-900">
              <div className="text-[10px] uppercase font-bold text-slate-500">
                {getFieldLabel('product_name', 'PRODUCT / ACTIVE PHARMACEUTICAL INGREDIENT')}
              </div>
              <div className="text-base font-black uppercase leading-tight text-slate-950">
                {label.productName}
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono mt-1 text-slate-800">
                <span>Product Code: <strong className="text-black">{label.productCode}</strong></span>
                <span>GTIN-14: <strong className="text-black">{label.gtin14}</strong></span>
              </div>
            </div>

            {/* Batch, Container & Weight Grid */}
            <div className="grid grid-cols-2 gap-2 py-2 border-b-2 border-slate-900 text-[11px]">
              <div className="border-r border-slate-300 pr-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">{getFieldLabel('batch_number', 'BATCH / LOT')}:</span>
                  <strong className="font-mono text-xs">{label.batchNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">{getFieldLabel('drum_number', 'DRUM NO')}:</span>
                  <strong className="font-mono text-sm bg-slate-100 px-1 rounded">
                    {label.drumNumber} of {label.totalDrums}
                  </strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-600">{getFieldLabel('mfg_date', 'MFG DATE')}:</span>
                  <span className="font-mono font-semibold">{label.mfgDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">{expiryHeader}:</span>
                  <span className="font-mono font-semibold">{label.expiryDate}</span>
                </div>
              </div>

              <div className="pl-1 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">{getFieldLabel('net_weight', 'NET WEIGHT')}:</span>
                  <strong className="font-mono text-sm">{label.netWeight.toFixed(2)} KG</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">{getFieldLabel('gross_weight', 'GROSS WT')}:</span>
                  <span className="font-mono font-semibold text-xs">{label.grossWeight.toFixed(2)} KG</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-600">STATUS:</span>
                  <span className="font-mono text-[10px] font-bold text-emerald-700 uppercase">
                    {label.labelType}
                  </span>
                </div>
                {label.reprintCount > 0 && (
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>REPRINT:</span>
                    <span>#{label.reprintCount}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2D DataMatrix and Storage Info */}
            <div className="py-2 border-b border-slate-800 flex items-center gap-3">
              <div className="shrink-0 bg-white p-1 border border-slate-300">
                <svg width={cfg.matrixSize} height={cfg.matrixSize} viewBox="0 0 21 21" className="shape-rendering-crispEdges">
                  {matrixGrid.map((row, r) =>
                    row.map((filled, c) => (
                      <rect
                        key={`${r}-${c}`}
                        x={c}
                        y={r}
                        width="1"
                        height="1"
                        fill={filled ? '#0f172a' : '#ffffff'}
                      />
                    ))
                  )}
                </svg>
              </div>
              <div className="text-[9px] text-slate-700 leading-tight space-y-1">
                <p className="font-semibold text-slate-900">{label.storageConditions}</p>
                <p className="font-bold text-slate-950 uppercase">{label.cautionText}</p>
              </div>
            </div>

            {/* GS1 SSCC Linear Barcode */}
            <div className="pt-2 text-center">
              <div className="text-[10px] font-bold tracking-widest text-slate-600 uppercase">
                SERIAL SHIPPING CONTAINER CODE (GS1 SSCC-18)
              </div>
              
              <div className="my-1 flex justify-center overflow-hidden">
                <svg width={cfg.barcodeWidth} height={cfg.barcodeHeight} viewBox={`0 0 ${barcodeBars.length} 48`} preserveAspectRatio="none">
                  {barcodeBars.split('').map((bit, idx) => (
                    <rect
                      key={idx}
                      x={idx}
                      y="0"
                      width="1"
                      height="48"
                      fill={bit === '1' ? '#0f172a' : '#ffffff'}
                    />
                  ))}
                </svg>
              </div>

              <div className="font-mono text-xs font-black tracking-widest text-slate-950 bg-slate-50 py-0.5 border border-slate-200">
                {label.sscc}
              </div>

              <div className="mt-1 flex items-center justify-between text-[8px] text-slate-500 font-mono">
                <span>GEN: {label.generatedAt}</span>
                <span>BY: {label.generatedBy}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action Buttons for User Interaction */}
      {showActions && (
        <div className={`mt-4 flex flex-wrap items-center justify-between w-full ${cfg.maxW} gap-2`}>
          <button
            onClick={handleBrowserPrint}
            style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md border border-blue-700 transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-white" />
            <span className="text-white font-bold">Send to Thermal Printer</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCopy}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold rounded-xl border transition active:scale-95 shadow-xs ${
              canDownload
                ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 cursor-pointer'
                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
            }`}
            title={canDownload ? 'Download authenticated label digital proof' : 'Advance permission required: Download Label Copy'}
          >
            {canDownload ? <Download className="w-4 h-4 text-indigo-600" /> : <Lock className="w-3.5 h-3.5 text-slate-400" />}
            <span>Copy</span>
          </button>
          
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold rounded-xl border border-slate-300 transition active:scale-95 shadow-xs cursor-pointer"
              title="Close / Cancel preview"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>Cancel</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 text-xs text-indigo-900 font-bold bg-indigo-50 px-2.5 py-2 rounded-xl border border-indigo-200 shadow-xs shrink-0" title="Selected Thermal Size">
            <Tag className="w-3.5 h-3.5 text-indigo-600" />
            <span>Size: {cfg.name}</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold bg-emerald-50 px-2.5 py-2 rounded-xl border border-emerald-300 shadow-xs shrink-0" title="Verified GS1 Mod-10 Compliant">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>GS1 Mod-10</span>
          </div>
        </div>
      )}
    </div>
  );
};
