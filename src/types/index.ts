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
