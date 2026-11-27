import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getRouteForTab, getTabFromPath } from '../routes';
import {
  User,
  Role,
  CompanySettings,
  Product,
  Batch,
  LabelTemplate,
  AuditLog,
  LicenseInfo,
  LabelType,
  LabelSnapshot,
  LabelDimension,
  Organization
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_ORGANIZATIONS,
  INITIAL_COMPANY_SETTINGS,
  INITIAL_PRODUCTS,
  INITIAL_BATCHES,
  INITIAL_TEMPLATES,
  INITIAL_AUDIT_LOGS,
  INITIAL_LICENSE
} from '../utils/mockData';
import { generateSSCC } from '../utils/sscc';

interface AppContextType {
  currentUser: User;
  users: User[];
  companySettings: CompanySettings;
  products: Product[];
  batches: Batch[];
  templates: LabelTemplate[];
  auditLogs: AuditLog[];
  license: LicenseInfo;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  generatedSnapshots: LabelSnapshot[];
  
  // Auth & Roles
  isAuthenticated: boolean;
  currentOrganization: Organization;
  organizations: Organization[];
  refreshOrganizations: () => Promise<void>;
  login: (user: User, org?: Organization) => void;
  logout: () => void;
  sessionRemaining: number;
  onboardOrganization: (org: Omit<Organization, 'id' | 'createdAt' | 'totalDrumsPrinted'>) => void;
  deleteOrganization: (orgId: string) => Promise<boolean>;
  updateOrganizationLicense: (orgId: string, status: Organization['licenseStatus'], validUntil?: string) => void;
  switchRole: (role: Role) => void;
  failedLoginAttempts: number;
  lockoutRemaining: number;
  recordFailedLogin: () => number;
  simulateFailedLogin: () => void;
  triggerLockout: (seconds?: number) => void;
  resetLockout: () => void;
  getLockoutRemainingForEmail: (email: string) => number;
  getFailedAttemptsForEmail: (email: string) => number;
  recordFailedLoginForEmail: (email: string) => number;
  triggerLockoutForEmail: (email: string, seconds?: number) => void;
  clearLockoutForEmail: (email: string) => void;
  resetAllLockouts: () => void;
  hasPermission: (permission: string, targetRole?: string) => boolean;
  rolePermissions: Record<string, string[]>;
  advancePermissions: Record<string, { can_download_label_copy: boolean; can_export_labels: boolean }>;
  updateRolePermissions: (matrix: Record<string, string[]>, advance?: Record<string, any>) => void;
  refreshRolePermissions: () => Promise<void>;
  canDownloadLabelCopy: (targetRole?: string) => boolean;
  canExportLabels: (targetRole?: string) => boolean;

  // Actions
  logAudit: (
    action: string,
    module: string,
    details?: {
      batchRef?: string;
      drumRef?: number;
      sscc?: string;
      oldValue?: string;
      newValue?: string;
      reason?: string;
      outcome?: 'SUCCESS' | 'FAILED';
    }
  ) => void;

  updateCompanySettings: (settings: Partial<CompanySettings>, reason: string) => void;
  addProduct: (product: Omit<Product, 'id' | 'status'>, reason: string) => void;
  updateProduct: (id: string, updates: Partial<Product>, reason: string) => void;
  approveProductChange: (id: string, approved: boolean, reason?: string) => void;
  
  createBatch: (batch: Omit<Batch, 'id' | 'createdAt' | 'createdBy' | 'drums'>, drumWeights: { netWeight: number; grossWeight: number; tareWeight: number }[]) => void;
  updateDrumWeight: (batchId: string, drumNumber: number, netWeight: number, grossWeight: number, reason: string) => void;
  markDrumDamaged: (batchId: string, drumNumber: number, reason: string, disposition: string) => void;
  authorizeBatch: (batchId: string, remarks?: string) => void;
  completeBatch: (batchId: string, reason?: string) => void;
  
  generateDrumLabels: (batchId: string, drumNumbers: number[], templateId: string, labelType: LabelType) => LabelSnapshot[];
  reprintDrumLabel: (batchId: string, drumNumber: number, reason: string, authorizedBy: string) => LabelSnapshot | null;
  
  addTemplate: (data: { name: string; dimension: LabelDimension; changeSummary: string }) => void;
  updateTemplate: (templateId: string, updates: Partial<LabelTemplate>) => void;
  toggleTemplateElement: (templateId: string, elementId: string) => void;
  createTemplateRevision: (templateId: string, summary: string, dimension?: LabelDimension) => void;
  updateTemplateDimension: (templateId: string, dimension: LabelDimension) => void;
  submitTemplateForReview: (templateId: string) => void;
  approveTemplateRevision: (templateId: string) => void;

  exportAuditTrailCsv: () => void;
  resetAllData: () => void;
}

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  Admin: [
    'edit_company_info', 'change_company_logo', 'printer_settings', 'backup_archive', 'license_management',
    'create_batch', 'edit_batch', 'edit_drum_weight',
    'print_labels', 'reprint_labels',
    'edit_templates', 'edit_products',
    'manage_users', 'view_audit'
  ],
  Supervisor: [
    'create_batch', 'edit_batch', 'edit_drum_weight',
    'print_labels', 'reprint_labels',
    'view_audit'
  ],
  Operator: [
    'print_labels'
  ]
};

const DEFAULT_ADVANCE_PERMISSIONS: Record<string, { can_download_label_copy: boolean; can_export_labels: boolean }> = {
  Admin: { can_download_label_copy: true, can_export_labels: true },
  Supervisor: { can_download_label_copy: true, can_export_labels: false },
  Operator: { can_download_label_copy: false, can_export_labels: false }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load from localStorage or use initial seed
  const [users] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('pharmalabel_user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u.role === 'SuperAdmin') {
          u.mustChangePassword = false;
        }
        return u;
      } catch {}
    }
    return INITIAL_USERS[2]; // Default to Supervisor for rich overview
  });

  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
    const saved = localStorage.getItem('pharmalabel_settings');
    return saved ? JSON.parse(saved) : INITIAL_COMPANY_SETTINGS;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('pharmalabel_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [batches, setBatches] = useState<Batch[]>(() => {
    const saved = localStorage.getItem('pharmalabel_batches');
    return saved ? JSON.parse(saved) : INITIAL_BATCHES;
  });

  const [templates, setTemplates] = useState<LabelTemplate[]>(() => {
    const saved = localStorage.getItem('pharmalabel_templates');
    return saved ? JSON.parse(saved) : INITIAL_TEMPLATES;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('pharmalabel_audit');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [license, setLicense] = useState<LicenseInfo>(() => {
    const saved = localStorage.getItem('pharmalabel_license');
    return saved ? JSON.parse(saved) : INITIAL_LICENSE;
  });

  const [organizations, setOrganizations] = useState<Organization[]>(() => {
    const saved = localStorage.getItem('pharmalabel_orgs');
    return saved ? JSON.parse(saved) : INITIAL_ORGANIZATIONS;
  });

  const [currentOrganization, setCurrentOrganization] = useState<Organization>(() => {
    const saved = localStorage.getItem('pharmalabel_current_org');
    return saved ? JSON.parse(saved) : INITIAL_ORGANIZATIONS[0];
  });

  const refreshOrganizations = async () => {
    try {
      const res = await fetch('/api/superadmin/organizations.php');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setOrganizations(json.data);
          localStorage.setItem('pharmalabel_orgs', JSON.stringify(json.data));
        }
      }
    } catch {}
  };

  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('pharmalabel_role_permissions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_ROLE_PERMISSIONS;
  });

  const [advancePermissions, setAdvancePermissions] = useState<Record<string, { can_download_label_copy: boolean; can_export_labels: boolean }>>(() => {
    const saved = localStorage.getItem('pharmalabel_advance_permissions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_ADVANCE_PERMISSIONS;
  });

  const refreshRolePermissions = async () => {
    try {
      const orgId = currentOrganization?.id;
      if (!orgId || orgId === 'PLATFORM-CAMEL') return;
      const token = localStorage.getItem('pharmalabel_token') || localStorage.getItem('token') || '';
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/company/permissions.php?organization_id=${encodeURIComponent(orgId)}`, {
        headers
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const matrix = json.data.permission_matrix || {};
          const advance = json.data.advance_permissions || {};
          setRolePermissions(matrix);
          setAdvancePermissions(advance);
          localStorage.setItem('pharmalabel_role_permissions', JSON.stringify(matrix));
          localStorage.setItem('pharmalabel_advance_permissions', JSON.stringify(advance));

          // Immediate sync of active user's permissions
          setCurrentUser(prevUser => {
            if (!prevUser || prevUser.role === 'SuperAdmin') return prevUser;
            const updatedPerms = matrix[prevUser.role];
            if (Array.isArray(updatedPerms)) {
              const updated = {
                ...prevUser,
                permissions: updatedPerms as any
              };
              localStorage.setItem('pharmalabel_user', JSON.stringify(updated));
              return updated;
            }
            return prevUser;
          });
        }
      }
    } catch (e) {
      console.error('[AppContext] Failed to refresh role permissions:', e);
    }
  };

  const updateRolePermissions = (matrix: Record<string, string[]>, advance?: Record<string, any>) => {
    setRolePermissions(matrix);
    localStorage.setItem('pharmalabel_role_permissions', JSON.stringify(matrix));

    if (advance) {
      setAdvancePermissions(advance);
      localStorage.setItem('pharmalabel_advance_permissions', JSON.stringify(advance));
    }

    // Immediately propagate updated permissions to current logged in user
    setCurrentUser(prevUser => {
      if (!prevUser || prevUser.role === 'SuperAdmin') return prevUser;
      const updatedPerms = matrix[prevUser.role];
      if (Array.isArray(updatedPerms)) {
        const updated = {
          ...prevUser,
          permissions: updatedPerms as any
        };
        localStorage.setItem('pharmalabel_user', JSON.stringify(updated));
        return updated;
      }
      return prevUser;
    });
  };

  useEffect(() => {
    refreshOrganizations();
    refreshRolePermissions();
  }, []);

  useEffect(() => {
    if (currentOrganization?.id) {
      refreshRolePermissions();
    }
  }, [currentOrganization?.id]);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem('pharmalabel_auth');
    return saved !== null ? saved === 'true' : true;
  });

  const [sessionRemaining, setSessionRemaining] = useState<number>(3600);

  const [generatedSnapshots, setGeneratedSnapshots] = useState<LabelSnapshot[]>(() => {
    const saved = localStorage.getItem('pharmalabel_snapshots');
    return saved ? JSON.parse(saved) : [];
  });

  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getTabFromPath(location.pathname);
  const setActiveTab = (tab: string) => {
    navigate(getRouteForTab(tab));
  };
  const [failedLoginAttempts, setFailedLoginAttempts] = useState<number>(() => {
    return parseInt(localStorage.getItem('pharmalabel_failed_attempts') || '0', 10);
  });
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(() => {
    const savedUntilStr = localStorage.getItem('pharmalabel_lockout_until');
    if (savedUntilStr) {
      const until = parseInt(savedUntilStr, 10);
      const diffSec = Math.floor((until - Date.now()) / 1000);
      return diffSec > 0 ? diffSec : 0;
    }
    return 0;
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('pharmalabel_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('pharmalabel_settings', JSON.stringify(companySettings));
  }, [companySettings]);

  useEffect(() => {
    localStorage.setItem('pharmalabel_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('pharmalabel_batches', JSON.stringify(batches));
  }, [batches]);

  useEffect(() => {
    localStorage.setItem('pharmalabel_templates', JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem('pharmalabel_audit', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('pharmalabel_snapshots', JSON.stringify(generatedSnapshots));
  }, [generatedSnapshots]);

  useEffect(() => {
    localStorage.setItem('pharmalabel_license', JSON.stringify(license));
  }, [license]);

  useEffect(() => {
    localStorage.setItem('pharmalabel_orgs', JSON.stringify(organizations));
  }, [organizations]);

  useEffect(() => {
    localStorage.setItem('pharmalabel_current_org', JSON.stringify(currentOrganization));
  }, [currentOrganization]);

  useEffect(() => {
    localStorage.setItem('pharmalabel_auth', String(isAuthenticated));
  }, [isAuthenticated]);

  // Session timer countdown (60 minutes inactivity)
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      setSessionRemaining(prev => {
        if (prev <= 1) {
          setIsAuthenticated(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutRemaining <= 0) {
      localStorage.removeItem('pharmalabel_lockout_until');
      return;
    }
    const interval = setInterval(() => {
      setLockoutRemaining((prev) => {
        const next = Math.max(0, prev - 1);
        if (next === 0) {
          localStorage.removeItem('pharmalabel_lockout_until');
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutRemaining]);

  const switchRole = (role: Role) => {
    const targetUser = users.find((u) => u.role === role) || users[0];
    const perms = rolePermissions[role] || targetUser.permissions;
    const updatedUser: User = {
      ...targetUser,
      permissions: perms as any
    };
    setCurrentUser(updatedUser);
    localStorage.setItem('pharmalabel_user', JSON.stringify(updatedUser));
    logAudit('ROLE_SWITCH', 'Authentication', {
      newValue: `Switched view to ${role} (${targetUser.name})`,
      reason: 'Interactive demonstration evaluation'
    });
  };

  const login = (user: User, org?: Organization) => {
    const sanitizedUser: User = {
      ...user,
      mustChangePassword: user.role === 'SuperAdmin' ? false : !!user.mustChangePassword
    };
    setCurrentUser(sanitizedUser);
    if (org) {
      setCurrentOrganization(org);
    } else if (user.role === 'SuperAdmin') {
      setCurrentOrganization({
        id: 'PLATFORM-CAMEL',
        name: 'Camel Communication (Platform Owner)',
        plantLocation: 'Global Cloud Control & Licensing',
        contactEmail: 'admin@camelcomm.in',
        gs1Prefix: '8900000',
        edition: 'Multi-Plant Global',
        licenseStatus: 'ACTIVE',
        validUntil: '2035-12-31',
        totalDrumsPrinted: 1420500,
        createdAt: '2025-01-01'
      });
    }
    setIsAuthenticated(true);
    setSessionRemaining(3600);
    resetLockout();
    logAudit('USER_LOGIN', 'Authentication', {
      newValue: `User ${user.name} logged in as ${user.role} [${org?.name || 'Platform SuperAdmin'}]`,
      reason: 'Cryptographic session initialized'
    });
  };

  const logout = () => {
    logAudit('USER_LOGOUT', 'Authentication', {
      oldValue: `${currentUser.name} (${currentUser.role})`,
      newValue: 'Session Terminated',
      reason: 'Manual user sign-out'
    });
    setIsAuthenticated(false);
    navigate('/login');
  };

  const onboardOrganization = (orgData: Omit<Organization, 'id' | 'createdAt' | 'totalDrumsPrinted'>) => {
    const newOrg: Organization = {
      ...orgData,
      id: `ORG-${orgData.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      totalDrumsPrinted: 0,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setOrganizations(prev => [newOrg, ...prev]);
    logAudit('TENANT_ONBOARDED', 'SuperAdmin Licensing', {
      newValue: `Onboarded ${newOrg.name} (${newOrg.id}) with GS1 Prefix ${newOrg.gs1Prefix}`,
      reason: 'New client enterprise cloud license activated'
    });
  };

  const deleteOrganization = async (orgId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/superadmin/organizations.php', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ organization_id: orgId })
      });
      const res = await response.json();
      if (response.ok && res.success) {
        setOrganizations(prev => {
          const updated = prev.filter(o => o.id !== orgId);
          localStorage.setItem('pharmalabel_orgs', JSON.stringify(updated));
          return updated;
        });

        if (currentOrganization.id === orgId) {
          const remaining = organizations.filter(o => o.id !== orgId);
          if (remaining.length > 0) {
            setCurrentOrganization(remaining[0]);
            localStorage.setItem('pharmalabel_current_org', JSON.stringify(remaining[0]));
          }
        }

        logAudit('TENANT_DELETED', 'SuperAdmin Licensing', {
          oldValue: `Org ID: ${orgId}`,
          newValue: 'DECOMMISSIONED_AND_PERMANENTLY_DELETED',
          reason: 'Permanent tenant deletion authorized by SuperAdmin'
        });

        return true;
      }
      return false;
    } catch {
      // Local fallback
      setOrganizations(prev => {
        const updated = prev.filter(o => o.id !== orgId);
        localStorage.setItem('pharmalabel_orgs', JSON.stringify(updated));
        return updated;
      });
      return true;
    }
  };

  const updateOrganizationLicense = (orgId: string, status: Organization['licenseStatus'], validUntil?: string) => {
    setOrganizations(prev => prev.map(o => {
      if (o.id === orgId) {
        return {
          ...o,
          licenseStatus: status,
          validUntil: validUntil || o.validUntil
        };
      }
      return o;
    }));

    // Sync to backend database
    try {
      fetch('/api/superadmin/licenses.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: orgId,
          license_status: status,
          valid_until: validUntil
        })
      }).catch(() => {});
    } catch {}

    logAudit('LICENSE_STATUS_MODIFIED', 'SuperAdmin Licensing', {
      oldValue: `Org ${orgId}`,
      newValue: `Status changed to ${status}${validUntil ? `, Valid until: ${validUntil}` : ''}`,
      reason: 'SuperAdmin manual license entitlement update'
    });
  };

  // Per-email multi-tenant lockout maps
  const getLockoutsMap = (): Record<string, number> => {
    try {
      const raw = localStorage.getItem('pharmalabel_lockouts_map');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const getAttemptsMap = (): Record<string, number> => {
    try {
      const raw = localStorage.getItem('pharmalabel_attempts_map');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const getLockoutRemainingForEmail = (targetEmail: string): number => {
    if (!targetEmail) return 0;
    const key = targetEmail.trim().toLowerCase();
    const map = getLockoutsMap();
    const until = map[key];
    if (until) {
      const diff = Math.floor((until - Date.now()) / 1000);
      if (diff > 0) return diff;
      delete map[key];
      localStorage.setItem('pharmalabel_lockouts_map', JSON.stringify(map));
    }
    return 0;
  };

  const getFailedAttemptsForEmail = (targetEmail: string): number => {
    if (!targetEmail) return 0;
    const key = targetEmail.trim().toLowerCase();
    const map = getAttemptsMap();
    return map[key] || 0;
  };

  const recordFailedLoginForEmail = (targetEmail: string): number => {
    if (!targetEmail) return 0;
    const key = targetEmail.trim().toLowerCase();
    const attemptsMap = getAttemptsMap();
    const nextAttempts = (attemptsMap[key] || 0) + 1;
    attemptsMap[key] = nextAttempts;
    localStorage.setItem('pharmalabel_attempts_map', JSON.stringify(attemptsMap));

    if (nextAttempts >= 5) {
      triggerLockoutForEmail(targetEmail, 900);
      logAudit('BRUTE_FORCE_LOCKOUT_TRIGGERED', 'Security', {
        oldValue: 'Active',
        newValue: `Locked (15 mins) for ${targetEmail}`,
        reason: '5 consecutive failed password attempts detected.',
        outcome: 'FAILED'
      });
    }
    return nextAttempts;
  };

  const triggerLockoutForEmail = (targetEmail: string, seconds: number = 900) => {
    if (!targetEmail) return;
    const key = targetEmail.trim().toLowerCase();
    const lockoutsMap = getLockoutsMap();
    lockoutsMap[key] = Date.now() + seconds * 1000;
    localStorage.setItem('pharmalabel_lockouts_map', JSON.stringify(lockoutsMap));
  };

  const clearLockoutForEmail = (targetEmail: string) => {
    if (!targetEmail) return;
    const key = targetEmail.trim().toLowerCase();
    const lockoutsMap = getLockoutsMap();
    delete lockoutsMap[key];
    localStorage.setItem('pharmalabel_lockouts_map', JSON.stringify(lockoutsMap));

    const attemptsMap = getAttemptsMap();
    delete attemptsMap[key];
    localStorage.setItem('pharmalabel_attempts_map', JSON.stringify(attemptsMap));
  };

  const resetAllLockouts = () => {
    localStorage.removeItem('pharmalabel_lockouts_map');
    localStorage.removeItem('pharmalabel_attempts_map');
    localStorage.removeItem('pharmalabel_lockout_until');
    localStorage.removeItem('pharmalabel_failed_attempts');
    setFailedLoginAttempts(0);
    setLockoutRemaining(0);
  };

  const recordFailedLogin = (): number => {
    const nextAttempts = failedLoginAttempts + 1;
    setFailedLoginAttempts(nextAttempts);
    localStorage.setItem('pharmalabel_failed_attempts', String(nextAttempts));
    if (nextAttempts >= 5) {
      triggerLockout(900);
      logAudit('BRUTE_FORCE_LOCKOUT_TRIGGERED', 'Security', {
        oldValue: 'Active',
        newValue: 'Locked (15 mins)',
        reason: '5 consecutive failed password attempts detected.',
        outcome: 'FAILED'
      });
    }
    return nextAttempts;
  };

  const simulateFailedLogin = () => {
    recordFailedLogin();
  };

  const triggerLockout = (seconds: number = 900) => {
    setLockoutRemaining(seconds);
    const until = Date.now() + seconds * 1000;
    localStorage.setItem('pharmalabel_lockout_until', String(until));
  };

  const resetLockout = () => {
    resetAllLockouts();
  };

  const hasPermission = (permission: string, targetRole?: string): boolean => {
    if (currentUser.role === 'SuperAdmin') return true;

    const checkRole = targetRole || currentUser.role;

    // Check dynamic permissions matrix for the role first
    if (rolePermissions && Array.isArray(rolePermissions[checkRole])) {
      return rolePermissions[checkRole].includes(permission);
    }

    // Fallback to active user's permissions array
    return (currentUser.permissions || []).includes(permission as any);
  };

  const canDownloadLabelCopy = (targetRole?: string): boolean => {
    if (currentUser.role === 'SuperAdmin') return true;
    const checkRole = targetRole || currentUser.role;
    return !!(advancePermissions[checkRole]?.can_download_label_copy);
  };

  const canExportLabels = (targetRole?: string): boolean => {
    if (currentUser.role === 'SuperAdmin') return true;
    const checkRole = targetRole || currentUser.role;
    return !!(advancePermissions[checkRole]?.can_export_labels);
  };

  const logAudit = (
    action: string,
    module: string,
    details?: {
      batchRef?: string;
      drumRef?: number;
      sscc?: string;
      oldValue?: string;
      newValue?: string;
      reason?: string;
      outcome?: 'SUCCESS' | 'FAILED';
    }
  ) => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} IST`;
    const newLog: AuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      module,
      batchRef: details?.batchRef,
      drumRef: details?.drumRef,
      sscc: details?.sscc,
      oldValue: details?.oldValue,
      newValue: details?.newValue,
      reason: details?.reason || 'Standard operational procedure',
      outcome: details?.outcome || 'SUCCESS'
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const updateCompanySettings = (settings: Partial<CompanySettings>, reason: string) => {
    const oldVal = `Prefix: ${companySettings.gs1CompanyPrefix}, Ext: ${companySettings.extensionDigit}`;
    const newVal = `Prefix: ${settings.gs1CompanyPrefix ?? companySettings.gs1CompanyPrefix}, Ext: ${settings.extensionDigit ?? companySettings.extensionDigit}`;
    setCompanySettings((prev) => ({ ...prev, ...settings }));
    logAudit('UPDATE_COMPANY_SETTINGS', 'Company Settings', {
      oldValue: oldVal,
      newValue: newVal,
      reason
    });
  };

  const addProduct = (productData: Omit<Product, 'id' | 'status'>, reason: string) => {
    const newProd: Product = {
      ...productData,
      id: `prod_${Date.now()}`,
      status: currentUser.role === 'Supervisor' || currentUser.role === 'SuperAdmin' ? 'Active' : 'Pending Approval'
    };
    setProducts((prev) => [...prev, newProd]);
    logAudit('CREATE_PRODUCT', 'Product Master', {
      newValue: `${newProd.name} (${newProd.code})`,
      reason
    });
  };

  const updateProduct = (id: string, updates: Partial<Product>, reason: string) => {
    setProducts((prev) =>
      prev.map((prod) => {
        if (prod.id !== id) return prod;
        // If current user is Supervisor or SuperAdmin, approve immediately; else trigger Maker-Checker
        if (currentUser.role === 'Supervisor' || currentUser.role === 'SuperAdmin') {
          logAudit('PRODUCT_DIRECT_UPDATE', 'Product Master', {
            oldValue: JSON.stringify({ name: prod.name, gtin: prod.gtin14, assay: prod.potencyAssay }),
            newValue: JSON.stringify(updates),
            reason
          });
          return { ...prod, ...updates, status: 'Active' };
        } else {
          // Maker-Checker flow: flag as Pending Approval
          logAudit('PRODUCT_CHANGE_REQUESTED', 'Product Master', {
            oldValue: prod.status,
            newValue: 'Pending Approval',
            reason: `Change requested by ${currentUser.name}: ${reason}`
          });
          return {
            ...prod,
            status: 'Pending Approval',
            pendingChanges: updates,
            changeReason: reason,
            updatedBy: `${currentUser.name} (${currentUser.role})`,
            updatedAt: new Date().toLocaleTimeString()
          };
        }
      })
    );
  };

  const approveProductChange = (id: string, approved: boolean, reason?: string) => {
    setProducts((prev) =>
      prev.map((prod) => {
        if (prod.id !== id) return prod;
        if (approved && prod.pendingChanges) {
          logAudit('PRODUCT_CHANGE_APPROVED', 'Product Master', {
            oldValue: 'Pending Approval',
            newValue: 'Active (Approved)',
            reason: reason || 'Reviewed and authorized by Supervisor QA'
          });
          return {
            ...prod,
            ...prod.pendingChanges,
            status: 'Active',
            pendingChanges: undefined,
            changeReason: undefined
          };
        } else {
          logAudit('PRODUCT_CHANGE_REJECTED', 'Product Master', {
            oldValue: 'Pending Approval',
            newValue: 'Active (Rejected Changes)',
            reason: reason || 'Modifications rejected during QA review'
          });
          return {
            ...prod,
            status: 'Active',
            pendingChanges: undefined,
            changeReason: undefined
          };
        }
      })
    );
  };

  const createBatch = (
    batchData: Omit<Batch, 'id' | 'createdAt' | 'createdBy' | 'drums'>,
    drumWeights: { netWeight: number; grossWeight: number; tareWeight: number }[]
  ) => {
    const drums = drumWeights.map((w, idx) => ({
      drumNumber: idx + 1,
      netWeight: w.netWeight,
      grossWeight: w.grossWeight,
      tareWeight: w.tareWeight,
      status: 'Pending' as const,
      reprintCount: 0
    }));

    const newBatch: Batch = {
      ...batchData,
      id: `batch_${Date.now()}`,
      drums,
      createdAt: `${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().split(' ')[0]} IST`,
      createdBy: `${currentUser.name} (${currentUser.role})`
    };

    setBatches((prev) => [newBatch, ...prev]);
    logAudit('CREATE_BATCH', 'Batch Management', {
      batchRef: newBatch.batchNumber,
      newValue: `Total Drums: ${newBatch.totalDrums} | Size: ${newBatch.batchSizeKg} Kg`,
      reason: 'Batch production initiated'
    });
  };

  const updateDrumWeight = (
    batchId: string,
    drumNumber: number,
    netWeight: number,
    grossWeight: number,
    reason: string
  ) => {
    setBatches((prev) =>
      prev.map((b) => {
        if (b.id !== batchId) return b;
        const updatedDrums = b.drums.map((d) => {
          if (d.drumNumber !== drumNumber) return d;
          logAudit('SUPERVISOR_DRUM_WEIGHT_OVERRIDE', 'Batch Management', {
            batchRef: b.batchNumber,
            drumRef: drumNumber,
            oldValue: `Net: ${d.netWeight}kg, Gross: ${d.grossWeight}kg`,
            newValue: `Net: ${netWeight}kg, Gross: ${grossWeight}kg`,
            reason: `Supervisor authorized override: ${reason}`
          });
          return {
            ...d,
            netWeight,
            grossWeight
          };
        });
        return { ...b, drums: updatedDrums };
      })
    );
  };

  const authorizeBatch = (batchId: string, remarks?: string) => {
    setBatches((prev) =>
      prev.map((b) => {
        if (b.id !== batchId) return b;
        logAudit('BATCH_LINE_CLEARANCE', 'Batch Management', {
          batchRef: b.batchNumber,
          oldValue: 'Pending',
          newValue: 'In Progress',
          reason: remarks || `QA Line Clearance & Packaging Authorization signed by ${currentUser.name} (${currentUser.role})`
        });
        return {
          ...b,
          status: 'In Progress' as const
        };
      })
    );
  };

  const completeBatch = (batchId: string, reason?: string) => {
    setBatches((prev) =>
      prev.map((b) => {
        if (b.id !== batchId) return b;
        logAudit('BATCH_COMPLETED', 'Batch Management', {
          batchRef: b.batchNumber,
          oldValue: b.status,
          newValue: 'Completed',
          reason: reason || `QA Release & Batch Closure signed by ${currentUser.name} (${currentUser.role})`
        });
        return {
          ...b,
          status: 'Completed' as const
        };
      })
    );
  };

  const markDrumDamaged = (
    batchId: string,
    drumNumber: number,
    reason: string,
    disposition: string
  ) => {
    let affectedSSCC = '';
    setBatches((prev) =>
      prev.map((b) => {
        if (b.id !== batchId) return b;
        const updatedDrums = b.drums.map((d) => {
          if (d.drumNumber !== drumNumber) return d;
          affectedSSCC = d.sscc || 'N/A';
          return {
            ...d,
            status: 'Damaged' as const,
            damagedReason: reason,
            damagedDisposition: disposition,
            damagedAt: new Date().toLocaleTimeString()
          };
        });
        return { ...b, drums: updatedDrums };
      })
    );

    logAudit('MARK_DRUM_DAMAGED', 'Production Printing', {
      batchRef: batchId,
      drumRef: drumNumber,
      sscc: affectedSSCC,
      newValue: `Disposition: ${disposition}`,
      reason: `Damaged Label Reported: ${reason}`
    });
  };

  const generateDrumLabels = (
    batchId: string,
    drumNumbers: number[],
    templateId: string,
    labelType: LabelType
  ): LabelSnapshot[] => {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return [];
    const template = templates.find((t) => t.id === templateId);
    if (!template) return [];

    let currentSerial = companySettings.nextSerialReference;
    const newSnapshots: LabelSnapshot[] = [];
    const updatedDrumsMap = new Map<number, { sscc: string; status: 'Printed' }>();

    for (const drumNum of drumNumbers) {
      const drum = batch.drums.find((d) => d.drumNumber === drumNum);
      if (!drum) continue;

      let ssccFormatted = drum.sscc;
      // If original, generate new SSCC and advance counter; otherwise reuse
      if (labelType === 'Original' || !ssccFormatted) {
        const generated = generateSSCC(
          companySettings.extensionDigit,
          companySettings.gs1CompanyPrefix,
          currentSerial
        );
        ssccFormatted = generated.formatted;
        currentSerial++;
      }

      updatedDrumsMap.set(drumNum, { sscc: ssccFormatted, status: 'Printed' });

      // Create immutable snapshot
      const snapshot: LabelSnapshot = {
        id: `snap_${Date.now()}_${drumNum}`,
        sscc: ssccFormatted,
        labelType,
        batchNumber: batch.batchNumber,
        drumNumber: drumNum,
        totalDrums: batch.totalDrums,
        productName: batch.productName,
        productCode: 'API-PROD',
        gtin14: '08901234567890',
        netWeight: drum.netWeight,
        grossWeight: drum.grossWeight,
        mfgDate: batch.mfgDate,
        expiryDate: batch.expiryDate,
        storageConditions: 'Store below 25°C in well-closed containers.',
        cautionText: 'FOR PHARMACEUTICAL MANUFACTURING USE ONLY.',
        companyName: companySettings.companyName,
        mfgLicenseNumber: companySettings.mfgLicenseNumber,
        templateRevision: template.revision,
        dimension: template.dimension,
        generatedAt: new Date().toLocaleString(),
        generatedBy: `${currentUser.name} (${currentUser.role})`,
        reprintCount: drum.reprintCount,
        isWatermarked: labelType === 'Specimen' || labelType === 'Dispatch Copy',
        watermarkText: labelType === 'Specimen' ? 'SPECIMEN' : labelType === 'Dispatch Copy' ? 'DISPATCH COPY' : undefined,
        watermarkColor: labelType === 'Specimen' ? 'red' : 'blue'
      };

      newSnapshots.push(snapshot);
    }

    // Update Company serial reference
    setCompanySettings((prev) => ({
      ...prev,
      nextSerialReference: currentSerial
    }));

    // Update Batch drums
    setBatches((prev) =>
      prev.map((b) => {
        if (b.id !== batchId) return b;
        const newDrums = b.drums.map((d) => {
          const update = updatedDrumsMap.get(d.drumNumber);
          if (!update) return d;
          return {
            ...d,
            sscc: update.sscc,
            status: 'Printed' as const,
            labelGeneratedAt: new Date().toLocaleTimeString()
          };
        });
        const allPrinted = newDrums.every(d => d.status === 'Printed');
        return {
          ...b,
          status: allPrinted ? ('Completed' as const) : ('In Progress' as const),
          drums: newDrums
        };
      })
    );

    // Save snapshots & log audit
    setGeneratedSnapshots((prev) => [...newSnapshots, ...prev]);
    setLicense((prev) => ({ ...prev, consumedDrums: prev.consumedDrums + drumNumbers.length }));

    logAudit('GENERATE_PRODUCTION_LABELS', 'Label Generation', {
      batchRef: batch.batchNumber,
      newValue: `Generated ${newSnapshots.length} labels for Drums: ${drumNumbers.join(', ')}`,
      reason: `Label Type: ${labelType} using Template Rev ${template.revision}`
    });

    return newSnapshots;
  };

  const reprintDrumLabel = (
    batchId: string,
    drumNumber: number,
    reason: string,
    authorizedBy: string
  ): LabelSnapshot | null => {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return null;
    const drum = batch.drums.find((d) => d.drumNumber === drumNumber);
    if (!drum || !drum.sscc) return null;

    const nextReprintCount = (drum.reprintCount || 0) + 1;

    const activeTemplate = templates.find((t) => t.status === 'Approved/Effective') || templates[0];

    // Strict GS1 rule: Reuse the EXACT same SSCC!
    const reprintSnapshot: LabelSnapshot = {
      id: `snap_reprint_${Date.now()}_${drumNumber}`,
      sscc: drum.sscc,
      labelType: 'Reprint',
      batchNumber: batch.batchNumber,
      drumNumber,
      totalDrums: batch.totalDrums,
      productName: batch.productName,
      productCode: 'API-PROD',
      gtin14: '08901234567890',
      netWeight: drum.netWeight,
      grossWeight: drum.grossWeight,
      mfgDate: batch.mfgDate,
      expiryDate: batch.expiryDate,
      storageConditions: 'Store below 25°C in well-closed containers.',
      cautionText: 'FOR PHARMACEUTICAL MANUFACTURING USE ONLY.',
      companyName: companySettings.companyName,
      mfgLicenseNumber: companySettings.mfgLicenseNumber,
      templateRevision: activeTemplate?.revision || '1.0',
      dimension: activeTemplate?.dimension || '4x6',
      generatedAt: new Date().toLocaleString(),
      generatedBy: `${currentUser.name} (${currentUser.role})`,
      reprintCount: nextReprintCount,
      reprintReason: reason,
      isWatermarked: true,
      watermarkText: `REPRINT #${nextReprintCount}`,
      watermarkColor: 'red'
    };

    // Update drum status
    setBatches((prev) =>
      prev.map((b) => {
        if (b.id !== batchId) return b;
        return {
          ...b,
          drums: b.drums.map((d) => {
            if (d.drumNumber !== drumNumber) return d;
            return {
              ...d,
              status: 'Printed',
              reprintCount: nextReprintCount
            };
          })
        };
      })
    );

    setGeneratedSnapshots((prev) => [reprintSnapshot, ...prev]);

    logAudit('REPRINT_LABEL_GENERATED', 'Production Printing', {
      batchRef: batch.batchNumber,
      drumRef: drumNumber,
      sscc: drum.sscc,
      newValue: `Reprint #${nextReprintCount} Authorized By: ${authorizedBy}`,
      reason: `Mandatory Reason: ${reason}`
    });

    return reprintSnapshot;
  };

  const addTemplate = (data: { name: string; dimension: LabelDimension; changeSummary: string }) => {
    const baseElements = templates[0]?.elements || [];
    const newTemplate: LabelTemplate = {
      id: `tpl_${Date.now()}`,
      name: data.name,
      dimension: data.dimension,
      revision: '1.0',
      status: 'Draft',
      createdBy: `${currentUser.name} (${currentUser.role})`,
      createdAt: `${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().split(' ')[0]} IST`,
      changeSummary: data.changeSummary || 'Initial new template creation',
      elements: baseElements.map((el) => ({ ...el }))
    };

    setTemplates((prev) => [newTemplate, ...prev]);
    logAudit('CREATE_NEW_TEMPLATE', 'Template Management', {
      newValue: `${data.name} (Rev 1.0, ${data.dimension}")`,
      reason: data.changeSummary || 'New template registered'
    });
  };

  const updateTemplate = (templateId: string, updates: Partial<LabelTemplate>) => {
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.id !== templateId) return t;
        logAudit('UPDATE_TEMPLATE', 'Template Management', {
          newValue: `${updates.name || t.name} (${updates.dimension || t.dimension}")`,
          reason: `Modified template configuration by ${currentUser.name} (${currentUser.role})`
        });
        return { ...t, ...updates };
      })
    );
  };

  const toggleTemplateElement = (templateId: string, elementId: string) => {
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.id !== templateId) return t;
        let toggledName = '';
        let newState = false;
        const updatedElements = t.elements.map((el) => {
          if (el.id !== elementId) return el;
          toggledName = el.name;
          newState = !el.enabled;
          return { ...el, enabled: !el.enabled };
        });
        logAudit('TOGGLE_TEMPLATE_ELEMENT', 'Template Management', {
          oldValue: `${toggledName}: ${newState ? 'Disabled' : 'Enabled'}`,
          newValue: `${toggledName}: ${newState ? 'Enabled' : 'Disabled'}`,
          reason: `Element toggle by ${currentUser.name} (${currentUser.role})`
        });
        return { ...t, elements: updatedElements };
      })
    );
  };

  const createTemplateRevision = (templateId: string, summary: string, dimension?: LabelDimension) => {
    const source = templates.find((t) => t.id === templateId);
    if (!source) return;

    const currentRevNum = parseFloat(source.revision) || 1.0;
    const newRevNum = (currentRevNum + 1.0).toFixed(1);

    const newTemplate: LabelTemplate = {
      ...source,
      id: `tpl_${Date.now()}`,
      revision: newRevNum,
      dimension: dimension || source.dimension,
      status: 'Draft',
      createdBy: `${currentUser.name} (${currentUser.role})`,
      createdAt: `${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().split(' ')[0]} IST`,
      approver: undefined,
      approvedAt: undefined,
      changeSummary: summary
    };

    setTemplates((prev) => [newTemplate, ...prev]);
    logAudit('CREATE_TEMPLATE_REVISION', 'Template Management', {
      oldValue: `Template ${source.name} (Rev ${source.revision}, ${source.dimension}")`,
      newValue: `New Draft Revision ${newRevNum} (${dimension || source.dimension}")`,
      reason: summary
    });
  };

  const updateTemplateDimension = (templateId: string, dimension: LabelDimension) => {
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.id !== templateId) return t;
        logAudit('UPDATE_TEMPLATE_DIMENSION', 'Template Management', {
          oldValue: `${t.dimension}"`,
          newValue: `${dimension}"`,
          reason: `Dimension changed to ${dimension}" by ${currentUser.name} (${currentUser.role})`
        });
        return { ...t, dimension };
      })
    );
  };

  const submitTemplateForReview = (templateId: string) => {
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.id !== templateId) return t;
        logAudit('SUBMIT_TEMPLATE_REVIEW', 'Template Management', {
          oldValue: 'Draft',
          newValue: 'In Review',
          reason: `Submitted for QA Approval by ${currentUser.name} (${currentUser.role})`
        });
        return { ...t, status: 'In Review' as const };
      })
    );
  };

  const approveTemplateRevision = (templateId: string) => {
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.id !== templateId) {
          // If another revision with same name was effective, make it obsolete!
          if (t.status === 'Approved/Effective') {
            return { ...t, status: 'Obsolete' as const };
          }
          return t;
        }
        logAudit('APPROVE_TEMPLATE_REVISION', 'Template Management', {
          newValue: `Template ${t.name} (Rev ${t.revision}) set to Approved/Effective`,
          reason: 'Reviewed and certified by QA Supervisor for production use'
        });
        return {
          ...t,
          status: 'Approved/Effective',
          approver: `${currentUser.name} (${currentUser.role})`,
          approvedAt: new Date().toLocaleString()
        };
      })
    );
  };

  const exportAuditTrailCsv = () => {
    const headers = ['Timestamp', 'User', 'Role', 'Action', 'Module', 'Batch Ref', 'Drum Ref', 'SSCC', 'Old Value', 'New Value', 'Reason', 'Outcome'];
    const rows = auditLogs.map((log) => [
      `"${log.timestamp}"`,
      `"${log.userName}"`,
      `"${log.userRole}"`,
      `"${log.action}"`,
      `"${log.module}"`,
      `"${log.batchRef || ''}"`,
      `"${log.drumRef || ''}"`,
      `"${log.sscc || ''}"`,
      `"${(log.oldValue || '').replace(/"/g, '""')}"`,
      `"${(log.newValue || '').replace(/"/g, '""')}"`,
      `"${(log.reason || '').replace(/"/g, '""')}"`,
      `"${log.outcome}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pharmalabel_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    logAudit('EXPORT_AUDIT_CSV', 'Audit Logs', {
      newValue: `${auditLogs.length} records exported`,
      reason: 'Batch manufacturing record compliance export'
    });
  };

  const resetAllData = () => {
    localStorage.clear();
    setCompanySettings(INITIAL_COMPANY_SETTINGS);
    setProducts(INITIAL_PRODUCTS);
    setBatches(INITIAL_BATCHES);
    setTemplates(INITIAL_TEMPLATES);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setLicense(INITIAL_LICENSE);
    setGeneratedSnapshots([]);
    setCurrentUser(INITIAL_USERS[2]);
    setActiveTab('dashboard');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        companySettings,
        products,
        batches,
        templates,
        auditLogs,
        license,
        activeTab,
        setActiveTab,
        generatedSnapshots,
        isAuthenticated,
        currentOrganization,
        organizations,
        refreshOrganizations,
        login,
        logout,
        sessionRemaining,
        onboardOrganization,
        deleteOrganization,
        updateOrganizationLicense,
        switchRole,
        failedLoginAttempts,
        lockoutRemaining,
        simulateFailedLogin,
        recordFailedLogin,
        triggerLockout,
        resetLockout,
        getLockoutRemainingForEmail,
        getFailedAttemptsForEmail,
        recordFailedLoginForEmail,
        triggerLockoutForEmail,
        clearLockoutForEmail,
        resetAllLockouts,
        hasPermission,
        rolePermissions,
        advancePermissions,
        updateRolePermissions,
        refreshRolePermissions,
        canDownloadLabelCopy,
        canExportLabels,
        logAudit,
        updateCompanySettings,
        addProduct,
        updateProduct,
        approveProductChange,
        createBatch,
        updateDrumWeight,
        markDrumDamaged,
        authorizeBatch,
        completeBatch,
        generateDrumLabels,
        reprintDrumLabel,
        addTemplate,
        updateTemplate,
        toggleTemplateElement,
        createTemplateRevision,
        updateTemplateDimension,
        submitTemplateForReview,
        approveTemplateRevision,
        exportAuditTrailCsv,
        resetAllData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
