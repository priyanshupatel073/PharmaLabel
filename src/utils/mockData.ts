import { User, CompanySettings, Product, Batch, Drum, DrumStatus, LabelTemplate, AuditLog, LicenseInfo, Organization } from '../types';

export const INITIAL_ORGANIZATIONS: Organization[] = [
  {
    id: 'ORG-APEX',
    name: 'Apex Healthcare Ltd.',
    plantLocation: 'Baddi, Himachal Pradesh (Unit 03)',
    contactEmail: 'compliance@apexpharma.com',
    gs1Prefix: '8901234',
    edition: 'Enterprise Unlimited Traceability',
    licenseStatus: 'ACTIVE',
    validUntil: '2027-12-31',
    totalDrumsPrinted: 18450,
    createdAt: '2026-01-10'
  },
  {
    id: 'ORG-SUNPHARMA',
    name: 'Sun Pharma Industries Ltd.',
    plantLocation: 'Halol, Gujarat (API Block 02)',
    contactEmail: 'qa.halol@sunpharma.com',
    gs1Prefix: '8904321',
    edition: 'Enterprise Unlimited Traceability',
    licenseStatus: 'EXPIRED',
    validUntil: '2025-12-31',
    totalDrumsPrinted: 42100,
    createdAt: '2026-02-15'
  },
  {
    id: 'ORG-CIPLA',
    name: 'Cipla Laboratories Ltd.',
    plantLocation: 'Kurkumbh, Maharashtra (OEB-4 Plant)',
    contactEmail: 'it.regulatory@cipla.com',
    gs1Prefix: '8909876',
    edition: 'Standard GxP Plant Edition',
    licenseStatus: 'SUSPENDED',
    validUntil: '2025-10-31',
    totalDrumsPrinted: 8900,
    createdAt: '2026-03-01'
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'usr_superadmin',
    name: 'Kunal Singhania',
    email: 'superadmin@apexpharma.com',
    role: 'SuperAdmin',
    department: 'Global IT & Enterprise Systems',
    permissions: [
      'print_labels', 'reprint_labels', 'create_batch', 'edit_batch',
      'edit_drum_weight', 'edit_products', 'edit_template', 'manage_users',
      'view_audit', 'backup_archive', 'edit_company', 'printer_settings',
      'manage_license', 'manage_logo'
    ],
    status: 'ACTIVE',
    lastLogin: '2026-11-23 09:00:12 IST'
  },
  {
    id: 'usr_admin',
    name: 'Vikram Joshi',
    email: 'admin@apexpharma.com',
    role: 'Admin',
    department: 'Plant IT & Serialization Admin',
    permissions: [
      'print_labels', 'reprint_labels', 'create_batch', 'edit_batch',
      'edit_products', 'edit_template', 'manage_users', 'view_audit',
      'backup_archive', 'edit_company', 'printer_settings', 'manage_logo'
    ],
    status: 'ACTIVE',
    lastLogin: '2026-11-23 09:15:44 IST'
  },
  {
    id: 'usr_supervisor',
    name: 'Dr. Anjali Nair',
    email: 'supervisor@apexpharma.com',
    role: 'Supervisor',
    department: 'Quality Assurance & Regulatory Compliance',
    permissions: [
      'print_labels', 'reprint_labels', 'edit_drum_weight', 'edit_products',
      'edit_template', 'view_audit'
    ],
    status: 'ACTIVE',
    lastLogin: '2026-11-23 09:30:20 IST'
  },
  {
    id: 'usr_operator',
    name: 'Ramesh Kumar',
    email: 'operator@apexpharma.com',
    role: 'Operator',
    department: 'Shop-Floor Packaging Line 02',
    permissions: ['print_labels', 'create_batch'],
    status: 'ACTIVE',
    lastLogin: '2026-11-23 10:12:05 IST'
  },
  {
    id: 'usr_sun_admin',
    name: 'Rajesh Patel',
    email: 'admin@sunpharma.com',
    role: 'Admin',
    department: 'Sun Pharma QA & IT Systems',
    permissions: [
      'print_labels', 'reprint_labels', 'create_batch', 'edit_batch',
      'edit_products', 'edit_template', 'manage_users', 'view_audit',
      'backup_archive', 'edit_company', 'printer_settings', 'manage_logo'
    ],
    status: 'ACTIVE',
    lastLogin: '2026-11-24 11:00:00 IST'
  },
  {
    id: 'usr_sun_qa',
    name: 'Meera Shah',
    email: 'qa.halol@sunpharma.com',
    role: 'Supervisor',
    department: 'Sun Pharma Halol QA',
    permissions: [
      'print_labels', 'reprint_labels', 'edit_drum_weight', 'edit_products',
      'edit_template', 'view_audit'
    ],
    status: 'ACTIVE',
    lastLogin: '2026-11-24 11:30:00 IST'
  },
  {
    id: 'usr_cipla_admin',
    name: 'Sunil Deshmukh',
    email: 'admin@cipla.com',
    role: 'Admin',
    department: 'Cipla Kurkumbh Serialization',
    permissions: [
      'print_labels', 'reprint_labels', 'create_batch', 'edit_batch',
      'edit_products', 'edit_template', 'manage_users', 'view_audit',
      'backup_archive', 'edit_company', 'printer_settings', 'manage_logo'
    ],
    status: 'ACTIVE',
    lastLogin: '2026-11-24 14:00:00 IST'
  },
  {
    id: 'usr_cipla_reg',
    name: 'Pooja Kulkarni',
    email: 'it.regulatory@cipla.com',
    role: 'Supervisor',
    department: 'Cipla Regulatory Compliance',
    permissions: [
      'print_labels', 'reprint_labels', 'edit_drum_weight', 'edit_products',
      'edit_template', 'view_audit'
    ],
    status: 'ACTIVE',
    lastLogin: '2026-11-24 14:30:00 IST'
  }
];

export const INITIAL_COMPANY_SETTINGS: CompanySettings = {
  companyName: 'Apex Healthcare Ltd.',
  address: 'Plot No. 42-45, Phase III, Industrial Area, Baddi, HP - 173205',
  contactNumber: '+91 1795 244800',
  email: 'compliance@apexpharma.com',
  mfgLicenseNumber: 'HP/MNB/08/123-A',
  gstNumber: '02AAACA4512B1Z6',
  logoUrl: '',
  gs1CompanyPrefix: '8901234',
  extensionDigit: '1',
  nextSerialReference: 41, // 40 drums already assigned in demo batch
  printerName: 'Zebra ZT411 Industrial (Thermal 300DPI - Line 02)',
  defaultLabelDimension: '4x6'
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod_1',
    name: 'Paracetamol Pure API (Fine Powder)',
    code: 'API-PARA-01',
    apiName: 'Paracetamol IP/USP (Acetaminophen)',
    brandName: 'Apex-ParaPure',
    gtin14: '08901234567890',
    mfgLicenseNumber: 'HP/MNB/08/123-A',
    storageConditions: 'Store below 25°C in well-closed containers. Protect from light & moisture.',
    ndc: '70518-2041-00',
    casNumber: '103-90-2',
    pharmacopeia: 'IP',
    potencyAssay: '99.8% on dry basis',
    hsCode: '29222990',
    countryOfOrigin: 'India',
    cautionText: 'FOR PHARMACEUTICAL MANUFACTURING USE ONLY. NOT FOR DIRECT CONSUMPTION.',
    customField1: 'Mesh Size: 100#',
    customField2: 'Solubility: Freely soluble in ethanol',
    status: 'Active'
  },
  {
    id: 'prod_2',
    name: 'Amoxicillin Trihydrate Compacted',
    code: 'API-AMOX-02',
    apiName: 'Amoxicillin Trihydrate USP',
    brandName: 'Amoxi-Prime',
    gtin14: '08901234991201',
    mfgLicenseNumber: 'HP/MNB/08/123-A',
    storageConditions: 'Store below 20°C in airtight containers. Controlled room temperature.',
    ndc: '65862-014-05',
    casNumber: '61336-70-7',
    pharmacopeia: 'USP',
    potencyAssay: '87.5% - 100.5% as anhydrous',
    hsCode: '29411030',
    countryOfOrigin: 'India',
    cautionText: 'POTENT ANTIBIOTIC. WEAR RESPIRATORY & EYE PROTECTION DURING HANDLING.',
    status: 'Pending Approval',
    changeReason: 'Updated assay potency specs to align with revised USP monograph 44.',
    pendingChanges: {
      potencyAssay: '88.0% - 101.0% as anhydrous'
    },
    updatedBy: 'Vikram Joshi (Admin)',
    updatedAt: '2026-11-23 09:45:00 IST'
  },
  {
    id: 'prod_3',
    name: 'Metformin Hydrochloride Pure API',
    code: 'API-METF-03',
    apiName: 'Metformin HCl BP',
    brandName: 'Apex-GlucoMet',
    gtin14: '08901234882199',
    mfgLicenseNumber: 'HP/MNB/08/123-A',
    storageConditions: 'Preserve in well-closed containers. Store at 15°C to 30°C.',
    ndc: '51079-052-20',
    casNumber: '1115-70-4',
    pharmacopeia: 'BP',
    potencyAssay: '99.4% calculated with reference to dried substance',
    hsCode: '29252990',
    countryOfOrigin: 'India',
    cautionText: 'ACTIVE INGREDIENT. AVOID INHALATION OF DUST.',
    status: 'Active'
  }
];

// Helper to seed 40 drums for demo batch
const createSeedDrums = (): Drum[] => {
  const drums: Drum[] = [];
  for (let i = 1; i <= 40; i++) {
    // 10 drums already generated labels
    const isGenerated = i <= 10;
    const isDamaged = i === 14; // Damaged drum demo scenario!
    const sscc = isGenerated ? `(00) 1 8901234 ${i.toString().padStart(9, '0')} ${i % 10}` : undefined;
    
    drums.push({
      drumNumber: i,
      netWeight: 25.00,
      grossWeight: 27.20,
      tareWeight: 2.20,
      sscc: sscc,
      status: (isDamaged ? 'Damaged' : isGenerated ? 'Printed' : 'Pending') as DrumStatus,
      reprintCount: isDamaged ? 1 : 0,
      damagedReason: isDamaged ? 'Forklift scratch scrape during warehouse staging' : undefined,
      damagedAt: isDamaged ? '2026-11-23 11:30:00 IST' : undefined,
      damagedDisposition: isDamaged ? 'Scrapped & Replaced with QA Approval' : undefined
    });
  }
  return drums;
};

export const INITIAL_BATCHES: Batch[] = [
  {
    id: 'batch_para_004',
    batchNumber: 'BATCH-PARA-2026-004',
    productId: 'prod_1',
    productName: 'Paracetamol Pure API (Fine Powder)',
    batchSizeKg: 1000,
    totalDrums: 40,
    defaultNetWeight: 25.00,
    mfgDate: '2026-11-20',
    expiryDate: '2031-11-19',
    retestDate: '2028-11-19',
    status: 'In Progress',
    drums: createSeedDrums(),
    createdAt: '2026-11-23 10:15:00 IST',
    createdBy: 'Ramesh Kumar (Operator)'
  },
  {
    id: 'batch_metf_001',
    batchNumber: 'BATCH-METF-2026-001',
    productId: 'prod_3',
    productName: 'Metformin Hydrochloride Pure API',
    batchSizeKg: 500,
    totalDrums: 20,
    defaultNetWeight: 25.00,
    mfgDate: '2026-11-22',
    expiryDate: '2029-11-21',
    status: 'Pending',
    drums: Array(20).fill(null).map((_, idx): Drum => ({
      drumNumber: idx + 1,
      netWeight: 25.00,
      grossWeight: 27.20,
      tareWeight: 2.20,
      status: 'Pending' as DrumStatus,
      reprintCount: 0
    })),
    createdAt: '2026-11-23 09:50:00 IST',
    createdBy: 'Vikram Joshi (Admin)'
  }
];

export const INITIAL_TEMPLATES: LabelTemplate[] = [
  {
    id: 'tpl_standard_export',
    name: 'Bulk Export API Standard (4x6")',
    dimension: '4x6',
    revision: '1.0',
    status: 'Approved/Effective',
    createdBy: 'Vikram Joshi (Admin)',
    createdAt: '2026-11-10 14:00:00 IST',
    approver: 'Dr. Anjali Nair (Supervisor QA)',
    approvedAt: '2026-11-12 11:30:00 IST',
    changeSummary: 'Initial validated production template for 4x6" thermal drum labels.',
    elements: [
      { id: 'el_header', name: 'Company Header & Logo', label: 'Company Header', enabled: true, fontSize: 'lg', isBold: true },
      { id: 'el_prod_name', name: 'Product Name & API Grade', label: 'Product Name', enabled: true, fontSize: 'xl', isBold: true },
      { id: 'el_batch_num', name: 'Batch / Lot Number', label: 'Batch / Lot', enabled: true, fontSize: 'base', isBold: true },
      { id: 'el_drum_num', name: 'Drum Number & Total', label: 'Drum Container No.', enabled: true, fontSize: 'base', isBold: true },
      { id: 'el_weights', name: 'Tare, Net & Gross Weights', label: 'Weight Specification', enabled: true, fontSize: 'base', isBold: true },
      { id: 'el_dates', name: 'Mfg, Exp & Retest Dates', label: 'Dates Block', enabled: true, fontSize: 'sm', isBold: false },
      { id: 'el_gtin', name: '14-Digit GTIN', label: 'GTIN-14', enabled: true, fontSize: 'sm', isBold: true },
      { id: 'el_sscc_text', name: 'Human Readable 18-Digit SSCC', label: 'SSCC (00)', enabled: true, fontSize: 'base', isBold: true },
      { id: 'el_barcode', name: 'GS1-128 Linear Barcode', label: 'Barcode', enabled: true, fontSize: 'base', isBold: false, barcodeType: 'code128' },
      { id: 'el_datamatrix', name: 'GS1 2D DataMatrix / QR Code', label: '2D Matrix', enabled: true, fontSize: 'base', isBold: false, barcodeType: 'qr' },
      { id: 'el_caution', name: 'Storage & Caution Warnings', label: 'Caution Block', enabled: true, fontSize: 'sm', isBold: false }
    ]
  },
  {
    id: 'tpl_standard_export_v2',
    name: 'Bulk Export API Standard (4x6")',
    dimension: '4x6',
    revision: '2.0',
    status: 'In Review',
    createdBy: 'Vikram Joshi (Admin)',
    createdAt: '2026-11-23 09:20:00 IST',
    changeSummary: 'Enlarged QR code area for high-speed automated conveyor scanning.',
    elements: [
      { id: 'el_header', name: 'Company Header & Logo', label: 'Company Header', enabled: true, fontSize: 'lg', isBold: true },
      { id: 'el_prod_name', name: 'Product Name & API Grade', label: 'Product Name', enabled: true, fontSize: 'xl', isBold: true },
      { id: 'el_batch_num', name: 'Batch / Lot Number', label: 'Batch / Lot', enabled: true, fontSize: 'base', isBold: true },
      { id: 'el_drum_num', name: 'Drum Number & Total', label: 'Drum Container No.', enabled: true, fontSize: 'base', isBold: true },
      { id: 'el_weights', name: 'Tare, Net & Gross Weights', label: 'Weight Specification', enabled: true, fontSize: 'base', isBold: true },
      { id: 'el_dates', name: 'Mfg, Exp & Retest Dates', label: 'Dates Block', enabled: true, fontSize: 'sm', isBold: false },
      { id: 'el_gtin', name: '14-Digit GTIN', label: 'GTIN-14', enabled: true, fontSize: 'sm', isBold: true },
      { id: 'el_sscc_text', name: 'Human Readable 18-Digit SSCC', label: 'SSCC (00)', enabled: true, fontSize: 'base', isBold: true },
      { id: 'el_barcode', name: 'GS1-128 Linear Barcode', label: 'Barcode', enabled: true, fontSize: 'base', isBold: false, barcodeType: 'code128' },
      { id: 'el_datamatrix', name: 'GS1 2D DataMatrix / QR Code', label: '2D Matrix (Enlarged)', enabled: true, fontSize: 'lg', isBold: false, barcodeType: 'qr' },
      { id: 'el_caution', name: 'Storage & Caution Warnings', label: 'Caution Block', enabled: true, fontSize: 'sm', isBold: false }
    ]
  }
];

const getSeedTimestamp = (daysAgo: number, timeStr: string): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${y}-${m}-${day} ${timeStr} IST`;
};

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud_1',
    timestamp: getSeedTimestamp(0, '09:00:12'),
    userId: 'usr_superadmin',
    userName: 'Kunal Singhania',
    userRole: 'SuperAdmin',
    action: 'USER_LOGIN',
    module: 'Authentication',
    reason: 'Initial Shift Administration Sign-in',
    outcome: 'SUCCESS'
  },
  {
    id: 'aud_2',
    timestamp: getSeedTimestamp(0, '09:15:44'),
    userId: 'usr_admin',
    userName: 'Vikram Joshi',
    userRole: 'Admin',
    action: 'UPDATE_COMPANY_SETTINGS',
    module: 'Company Settings',
    oldValue: 'Prefix: 8901233',
    newValue: 'Prefix: 8901234',
    reason: 'Configured certified GS1 India Company Prefix allocation.',
    outcome: 'SUCCESS'
  },
  {
    id: 'aud_3',
    timestamp: getSeedTimestamp(0, '09:45:00'),
    userId: 'usr_admin',
    userName: 'Vikram Joshi',
    userRole: 'Admin',
    action: 'PRODUCT_UPDATE_REQUESTED',
    module: 'Product Master',
    batchRef: 'API-AMOX-02',
    oldValue: 'Assay: 87.5% - 100.5%',
    newValue: 'Assay: 88.0% - 101.0%',
    reason: 'Aligning with revised USP monograph 44 requirement.',
    outcome: 'SUCCESS'
  },
  {
    id: 'aud_4',
    timestamp: getSeedTimestamp(0, '10:15:00'),
    userId: 'usr_operator',
    userName: 'Ramesh Kumar',
    userRole: 'Operator',
    action: 'CREATE_BATCH',
    module: 'Batch Management',
    batchRef: 'BATCH-PARA-2026-004',
    newValue: 'Drums: 40 | Size: 1000 Kg | Product: Paracetamol IP',
    reason: 'Scheduled manufacturing packaging run shift 1.',
    outcome: 'SUCCESS'
  },
  {
    id: 'aud_5',
    timestamp: getSeedTimestamp(0, '10:45:22'),
    userId: 'usr_operator',
    userName: 'Ramesh Kumar',
    userRole: 'Operator',
    action: 'GENERATE_PRODUCTION_LABELS',
    module: 'Label Generation',
    batchRef: 'BATCH-PARA-2026-004',
    drumRef: 1,
    sscc: '(00) 1 8901234 000000001 4',
    newValue: 'Generated Original Labels for Drums 1 to 10 (SSCC Range #01-#10)',
    reason: 'Initial packaging container run',
    outcome: 'SUCCESS'
  },
  {
    id: 'aud_6',
    timestamp: getSeedTimestamp(0, '11:30:15'),
    userId: 'usr_operator',
    userName: 'Ramesh Kumar',
    userRole: 'Operator',
    action: 'MARK_DRUM_DAMAGED',
    module: 'Production Printing',
    batchRef: 'BATCH-PARA-2026-004',
    drumRef: 14,
    reason: 'Forklift scratch scrape during warehouse staging',
    outcome: 'SUCCESS'
  }
];

export const INITIAL_LICENSE: LicenseInfo = {
  organizationName: 'Apex Healthcare Ltd.',
  licenseKey: 'APEX-PHARMA-2026-ENT-7749-X9',
  edition: 'Enterprise Unlimited Traceability',
  status: 'ACTIVE',
  expiryDate: '2027-12-31',
  serverAddress: 'https://pharmalabel.apexhealthcare.com (Hostinger Dedicated Instance)',
  maxDrumsAllowed: 'Unlimited (Enterprise Edition)',
  consumedDrums: 1420
};
