export type Role = 'SuperAdmin' | 'Admin' | 'Supervisor' | 'Operator';

export type Permission = 
  | 'print_labels'
  | 'reprint_labels'
  | 'create_batch'
  | 'edit_batch'
  | 'edit_drum_weight'
  | 'edit_products'
  | 'edit_template'
  | 'manage_users'
  | 'view_audit'
  | 'backup_archive'
  | 'edit_company'
  | 'printer_settings'
  | 'manage_license'
  | 'manage_logo';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  permissions: Permission[];
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  lastLogin?: string;
  mustChangePassword?: boolean;
}

export interface CompanySettings {
  companyName: string;
  address: string;
  contactNumber: string;
  email: string;
  mfgLicenseNumber: string;
  gstNumber: string;
  logoUrl: string;
  gs1CompanyPrefix: string;
  extensionDigit: string;
  nextSerialReference: number; // e.g. 1
  printerName: string;
  defaultLabelDimension: '4x6' | '6x4' | '4x4' | '3x2';
}

export type ProductStatus = 'Draft' | 'Pending Approval' | 'Active' | 'Inactive';

export interface Product {
  id: string;
  name: string;
  code: string;
  apiName: string;
  brandName: string;
  gtin14: string;
  mfgLicenseNumber: string;
  storageConditions: string;
  ndc: string;
  casNumber: string;
  pharmacopeia: 'USP' | 'IP' | 'BP' | 'EP' | 'JP';
  potencyAssay: string;
  hsCode: string;
  countryOfOrigin: string;
  cautionText: string;
  customField1?: string;
  customField2?: string;
  customField3?: string;
  status: ProductStatus;
  pendingChanges?: Partial<Product>;
  changeReason?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export type DrumStatus = 'Pending' | 'Generated' | 'Printed' | 'Damaged';

export interface Drum {
  drumNumber: number;
  netWeight: number; // in kg
  grossWeight: number; // in kg
  tareWeight: number; // in kg
  sscc?: string;
  status: DrumStatus;
  labelGeneratedAt?: string;
  reprintCount: number;
  damagedReason?: string;
  damagedAt?: string;
  damagedDisposition?: string;
}

export type BatchStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';

export interface Batch {
  id: string;
  batchNumber: string;
  productId: string;
  productName: string;
  batchSizeKg: number;
  totalDrums: number;
  defaultNetWeight: number;
  mfgDate: string;
  expiryDate: string;
  retestDate?: string;
  status: BatchStatus;
  drums: Drum[];
  createdAt: string;
  createdBy: string;
}

export type TemplateStatus = 'Draft' | 'In Review' | 'Approved/Effective' | 'Obsolete';
export type LabelDimension = '4x6' | '6x4' | '4x4' | '3x2';

export interface TemplateAppearance {
  headerFontSizePt: number;       // e.g. 16
  bodyFontSizePt: number;         // e.g. 10
  expiryType: 'EXPIRY' | 'RETEST';// 'EXPIRY' vs 'RETEST'
  mfgDateFormat: 'DD/MM/YYYY' | 'MM/YYYY' | 'MMM YYYY' | 'YYYY-MM-DD';
  expiryDateFormat: 'DD/MM/YYYY' | 'MM/YYYY' | 'MMM YYYY' | 'YYYY-MM-DD';
  labelMode: 'full' | 'preprinted'; // 'full' (header + data) vs 'preprinted' (data only)
  headerBgColor: string;          // Hex e.g. '#0b2b52'
  headerFontColor: string;        // Hex e.g. '#ffffff'
  showHeaderBar: boolean;         // default true
  showOuterBorder: boolean;       // default true
  show2DBarcode: boolean;         // default true
}

export interface PharmaFieldItem {
  id: string;                      // Unique field id (e.g. 'company_name', 'product_name', 'batch_no')
  defaultLabel: string;            // Standard Government title e.g. 'Name of API / Active Substance'
  customLabelOverride?: string;    // Custom Label Override e.g. 'Active Substance'
  mandatory: boolean;              // Marked with ★ (cannot be disabled if true)
  included: boolean;               // Toggle checkbox (Incl.)
  order: number;                   // Sequence number 1..17
}

export interface TemplateElement {
  id: string;
  name: string;
  label: string;
  enabled: boolean;
  fontSize: 'sm' | 'base' | 'lg' | 'xl';
  isBold: boolean;
  barcodeType?: 'code128' | 'datamatrix' | 'qr';
}

export interface LabelTemplate {
  id: string;
  name: string;
  dimension: LabelDimension;
  revision: string; // e.g., '1.0'
  status: TemplateStatus;
  elements: TemplateElement[];
  appearance?: TemplateAppearance;
  fields?: PharmaFieldItem[];
  createdBy: string;
  createdAt: string;
  approver?: string;
  approvedAt?: string;
  changeSummary?: string;
}

export type LabelType = 'Original' | 'Duplicate' | 'Triplicate' | 'Specimen' | 'Dispatch Copy' | 'Reprint';

export interface LabelSnapshot {
  id: string;
  sscc: string;
  labelType: LabelType;
  batchNumber: string;
  drumNumber: number;
  totalDrums: number;
  productName: string;
  productCode: string;
  gtin14: string;
  netWeight: number;
  grossWeight: number;
  mfgDate: string;
  expiryDate: string;
  retestDate?: string;
  storageConditions: string;
  cautionText: string;
  companyName: string;
  mfgLicenseNumber: string;
  templateRevision: string;
  dimension: LabelDimension;
  generatedAt: string;
  generatedBy: string;
  reprintCount: number;
  reprintReason?: string;
  isWatermarked?: boolean;
  watermarkText?: string;
  watermarkColor?: 'red' | 'blue' | 'gray';
  appearance?: TemplateAppearance;
  fieldOverrides?: Record<string, string>;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: Role;
  action: string;
  module: string;
  batchRef?: string;
  drumRef?: number;
  sscc?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  outcome: 'SUCCESS' | 'FAILED';
  workstation?: string;
  ipAddress?: string;
}

export interface LicenseInfo {
  organizationName: string;
  licenseKey: string;
  edition: 'Enterprise Unlimited Traceability';
  status: 'ACTIVE' | 'EXPIRED' | 'WARNING';
  expiryDate: string;
  serverAddress: string;
  maxDrumsAllowed: string;
  consumedDrums: number;
}

export interface Organization {
  id: string;
  name: string;
  plantLocation: string;
  contactEmail: string;
  gs1Prefix: string;
  edition: 'Enterprise Unlimited Traceability' | 'Standard GxP Plant Edition' | 'Multi-Plant Global';
  licenseStatus: 'ACTIVE' | 'WARNING' | 'EXPIRED' | 'SUSPENDED';
  validUntil: string;
  totalDrumsPrinted: number;
  createdAt: string;
}
