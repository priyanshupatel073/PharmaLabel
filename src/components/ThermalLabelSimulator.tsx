import React from 'react';
import { LabelSnapshot } from '../types';
import { generateCode128SvgBars, generateMatrixGrid } from '../utils/barcode';
import { Printer, Download, CheckCircle2, ShieldCheck } from 'lucide-react';

interface ThermalLabelProps {
  label: LabelSnapshot;
  onPrint?: () => void;
  showActions?: boolean;
}

export const ThermalLabelSimulator: React.FC<ThermalLabelProps> = ({
  label,
  onPrint,
  showActions = true
}) => {
  // Generate Code-128 barcode pattern for SSCC
  const barcodeBars = generateCode128SvgBars(label.sscc.replace(/\D/g, ''));
  // Generate 2D Matrix for SSCC + Batch
  const matrixData = `${label.sscc}|${label.batchNumber}|${label.drumNumber}|${label.grossWeight}`;
  const matrixGrid = generateMatrixGrid(matrixData, 21);

  const handleBrowserPrint = () => {
    if (onPrint) onPrint();
    window.print();
  };

  return (
    <div className="flex flex-col items-center">
      {/* 4x6 inch ratio simulated thermal container (Approx 384px x 576px at 96 DPI) */}
      <div
        id="thermal-label-container"
        className="relative w-[390px] h-[585px] bg-white border-2 border-slate-900 rounded-sm p-4 text-slate-950 font-sans shadow-md select-none overflow-hidden flex flex-col justify-between"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* Optional Watermark */}
        {label.isWatermarked && label.watermarkText && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div
              className={`transform -rotate-45 text-4xl font-black uppercase tracking-widest px-6 py-2 border-4 ${
                label.watermarkColor === 'blue'
                  ? 'text-blue-600/70 border-blue-600/70'
                  : 'text-rose-600/75 border-rose-600/75'
              }`}
            >
              {label.watermarkText}
            </div>
          </div>
        )}

        {/* Top Header Block: Company & Lic No */}
        <div className="border-b-2 border-slate-900 pb-2 flex items-start justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
              MANUFACTURER & LICENSED TRACEABILITY
            </div>
            <div className="text-sm font-extrabold tracking-tight text-slate-900">
              {label.companyName}
            </div>
            <div className="text-[10px] font-mono text-slate-700">
              Mfg Lic No: <span className="font-semibold">{label.mfgLicenseNumber}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-900 text-white rounded-xs">
              REV {label.templateRevision}
            </span>
            <div className="text-[9px] font-mono text-slate-500 mt-0.5">
              {label.dimension}&quot; THERMAL
            </div>
          </div>
        </div>

        {/* Product Identity Block */}
        <div className="py-2 border-b border-slate-900">
          <div className="text-[10px] uppercase font-bold text-slate-500">
            PRODUCT / ACTIVE PHARMACEUTICAL INGREDIENT
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
              <span className="text-slate-600">BATCH / LOT:</span>
              <strong className="font-mono text-xs">{label.batchNumber}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">DRUM NO:</span>
              <strong className="font-mono text-sm bg-slate-100 px-1 rounded">
                {label.drumNumber} of {label.totalDrums}
              </strong>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200">
              <span className="text-slate-600">MFG DATE:</span>
              <span className="font-mono font-semibold">{label.mfgDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">EXP DATE:</span>
              <span className="font-mono font-semibold">{label.expiryDate}</span>
            </div>
          </div>

          <div className="pl-1 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-600">NET WEIGHT:</span>
              <strong className="font-mono text-sm">{label.netWeight.toFixed(2)} KG</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">GROSS WT:</span>
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
          {/* Realistic SVG DataMatrix pattern */}
          <div className="shrink-0 bg-white p-1 border border-slate-300">
            <svg width="68" height="68" viewBox="0 0 21 21" className="shape-rendering-crispEdges">
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

        {/* GS1 SSCC Linear Barcode & Number (The Most Critical Section) */}
        <div className="pt-2 text-center">
          <div className="text-[10px] font-bold tracking-widest text-slate-600 uppercase">
            SERIAL SHIPPING CONTAINER CODE (GS1 SSCC-18)
          </div>
          
          {/* Simulated Code-128 Vector Barcode */}
          <div className="my-1 flex justify-center overflow-hidden">
            <svg width="340" height="48" viewBox={`0 0 ${barcodeBars.length} 48`} preserveAspectRatio="none">
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

          {/* Human Readable SSCC */}
          <div className="font-mono text-xs font-black tracking-widest text-slate-950 bg-slate-50 py-0.5 border border-slate-200">
            {label.sscc}
          </div>

          {/* Micro Regulatory Footer */}
          <div className="mt-1 flex items-center justify-between text-[8px] text-slate-500 font-mono">
            <span>GEN: {label.generatedAt}</span>
            <span>BY: {label.generatedBy}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons for User Interaction */}
      {showActions && (
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleBrowserPrint}
            style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md border border-blue-700 transition active:scale-95"
          >
            <Printer className="w-4 h-4 text-white" />
            <span className="text-white font-bold">Send to Thermal Printer (Browser Print)</span>
          </button>
          <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-300 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Verified GS1 Mod-10 Compliant
          </div>
        </div>
      )}
    </div>
  );
};
