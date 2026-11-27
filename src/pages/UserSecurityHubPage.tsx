import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users, Shield, KeyRound, Mail, Plus, Edit3, RotateCcw, Save,
  Check, X, AlertTriangle, Send, RefreshCw, Lock, Sparkles,
  Download, FileSpreadsheet, Building, Layers, Tags, Eye, EyeOff
} from 'lucide-react';

type HubTab = 'users' | 'roles' | 'security' | 'smtp';

interface PlantUserItem {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  password_status?: string;
  failed_attempts?: number;
  is_locked?: boolean;
  created_at?: string;
}

interface AdvancePermissionsMap {
  [role: string]: {
    can_download_label_copy: boolean;
    can_export_labels: boolean;
  };
}

export const UserSecurityHubPage: React.FC = () => {
  const { currentUser, currentOrganization } = useApp();

  const [activeTab, setActiveTab] = useState<HubTab>('roles');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // --------------------------------------------------------------------------
  // TAB 1: ROLE PERMISSIONS STATE
  // --------------------------------------------------------------------------
  const [roles, setRoles] = useState<Array<{ name: string; is_custom: boolean }>>([
    { name: 'Admin', is_custom: false },
    { name: 'Supervisor', is_custom: false },
    { name: 'Operator', is_custom: false },
  ]);

  const [permissionMatrix, setPermissionMatrix] = useState<Record<string, string[]>>({
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
  });

  const [advancePermissions, setAdvancePermissions] = useState<AdvancePermissionsMap>({
    Admin: { can_download_label_copy: true, can_export_labels: true },
    Supervisor: { can_download_label_copy: true, can_export_labels: false },
    Operator: { can_download_label_copy: false, can_export_labels: false }
  });

  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);

  // --------------------------------------------------------------------------
  // TAB 2: USER MANAGEMENT STATE
  // --------------------------------------------------------------------------
  const [usersList, setUsersList] = useState<PlantUserItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Modals
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);

  // Add User Form
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    name: '',
    email: '',
    department: 'Packaging',
    role: 'Operator',
    passwordMode: 'auto' as 'auto' | 'manual',
    manualPassword: ''
  });
  const [createdCredentials, setCreatedCredentials] = useState<{
    username: string;
    tempPass: string;
    role: string;
    email: string;
    emailSent: boolean;
  } | null>(null);

  // Edit User Form
  const [editUserForm, setEditUserForm] = useState({
    id: '',
    name: '',
    department: '',
    role: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'LOCKED'
  });

  // Reset Password Form
  const [resetPasswordForm, setResetPasswordForm] = useState({
    userId: '',
    userName: '',
    newPassword: '',
    autoGenerate: true
  });
  const [resetResult, setResetResult] = useState<{ tempPass: string; emailSent: boolean } | null>(null);

  // --------------------------------------------------------------------------
  // TAB 3: SECURITY POLICY STATE
  // --------------------------------------------------------------------------
  const [securityPolicy, setSecurityPolicy] = useState({
    max_failed_attempts: 5,
    lockout_duration_min: 15,
    min_password_length: 8,
    require_uppercase: true,
    require_numeric: true,
    require_special: false,
    password_expiry_days: 90,
    password_reuse_blocked: 5,
    session_timeout_min: 60
  });

  // --------------------------------------------------------------------------
  // TAB 4: SMTP & REAL-TIME ALERTS STATE
  // --------------------------------------------------------------------------
  const [smtpSettings, setSmtpSettings] = useState({
    smtp_host: 'smtp.hostinger.com',
    smtp_port: 465,
    smtp_user: 'info@camel-communication.com',
    smtp_pass: '',
    from_address: 'info@camel-communication.com',
    use_tls: true,
    admin_alert_email: '',
    notify_on_operator_print: true,
    notify_on_supervisor_auth: true,
    notify_on_reprint: true,
    notify_all_activities: true,
    eod_report_enabled: true,
    eod_report_time: '18:00'
  });

  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isSendingEod, setIsSendingEod] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);

  // Helper to obtain authorization headers with the active bearer token
  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('pharmalabel_token') || localStorage.getItem('token') || '';
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  };

  // --------------------------------------------------------------------------
  // INITIAL DATA FETCHING
  // --------------------------------------------------------------------------
  const orgId = currentOrganization?.id || 'ORG-HARIHAR-265';

  const fetchAllData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const headers = getAuthHeaders();

      // 1. Fetch Users
      const usersRes = await fetch(`/api/company/users.php?organization_id=${encodeURIComponent(orgId)}`, { headers });
      if (usersRes.ok) {
        const data = await usersRes.json();
        if (data.success && Array.isArray(data.data)) {
          setUsersList(data.data);
          if (data.data.length > 0 && !selectedUserId) {
            setSelectedUserId(data.data[0].id);
          }
        }
      } else {
        const errData = await usersRes.json().catch(() => null);
        if (errData && errData.message) {
          setErrorMessage(errData.message);
        }
      }

      // 2. Fetch Permissions
      const permsRes = await fetch(`/api/company/permissions.php?organization_id=${encodeURIComponent(orgId)}`, { headers });
      if (permsRes.ok) {
        const data = await permsRes.json();
        if (data.success && data.data) {
          if (Array.isArray(data.data.roles)) setRoles(data.data.roles);
          if (data.data.permission_matrix) setPermissionMatrix(data.data.permission_matrix);
          if (data.data.advance_permissions) setAdvancePermissions(data.data.advance_permissions);
        }
      }

      // 3. Fetch Security Policy
      const secRes = await fetch(`/api/company/security_policy.php?organization_id=${encodeURIComponent(orgId)}`, { headers });
      if (secRes.ok) {
        const data = await secRes.json();
        if (data.success && data.data) {
          setSecurityPolicy(data.data);
        }
      }

      // 4. Fetch SMTP Settings
      const smtpRes = await fetch(`/api/company/smtp_settings.php?organization_id=${encodeURIComponent(orgId)}`, { headers });
      if (smtpRes.ok) {
        const data = await smtpRes.json();
        if (data.success && data.data) {
          setSmtpSettings(prev => ({
            ...prev,
            ...data.data,
            smtp_pass: ''
          }));
          if (data.data.admin_alert_email) {
            setTestEmailAddress(data.data.admin_alert_email);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching hub data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [orgId]);

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4500);
  };

  // --------------------------------------------------------------------------
  // ROLE PERMISSION MATRIX HANDLERS
  // --------------------------------------------------------------------------
  const togglePermission = (role: string, permKey: string) => {
    setPermissionMatrix(prev => {
      const currentPerms = prev[role] || [];
      const exists = currentPerms.includes(permKey);
      const nextPerms = exists
        ? currentPerms.filter(k => k !== permKey)
        : [...currentPerms, permKey];

      return {
        ...prev,
        [role]: nextPerms
      };
    });
  };

  const handleSavePermissionMatrix = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`/api/company/permissions.php?organization_id=${encodeURIComponent(orgId)}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          permission_matrix: permissionMatrix,
          advance_permissions: advancePermissions
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Permission matrix saved successfully.');
      } else {
        setErrorMessage(data.message || 'Failed to save matrix.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Network error saving matrix.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (!window.confirm('Reset all roles to 21 CFR Part 11 standard GxP defaults?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/company/permissions.php?organization_id=${encodeURIComponent(orgId)}&action=reset`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        showToast('Reset to GxP default permissions.');
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewRole = async () => {
    if (!newRoleName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/company/permissions.php?organization_id=${encodeURIComponent(orgId)}&action=add_role`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          role_name: newRoleName.trim(),
          permissions: ['print_labels'],
          advance_permissions: { can_download_label_copy: false, can_export_labels: false }
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Role "${newRoleName.trim()}" created successfully.`);
        setNewRoleName('');
        setShowAddRoleModal(false);
        fetchAllData();
      } else {
        setErrorMessage(data.message || 'Failed to create role.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Network error creating role.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAdvancePermissions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/company/permissions.php?organization_id=${encodeURIComponent(orgId)}&action=save_advance`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ advance_permissions: advancePermissions })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Advance permissions updated successfully.');
        setShowAdvanceModal(false);
      } else {
        setErrorMessage(data.message || 'Failed to save advance permissions.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // USER MANAGEMENT HANDLERS
  // --------------------------------------------------------------------------
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`/api/company/users.php?organization_id=${encodeURIComponent(orgId)}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          username: newUserForm.username,
          name: newUserForm.name,
          email: newUserForm.email,
          department: newUserForm.department,
          role: newUserForm.role,
          password: newUserForm.passwordMode === 'manual' ? newUserForm.manualPassword : ''
        })
      });
      const data = await res.json();
      if (data.success) {
        setCreatedCredentials({
          username: data.data.username,
          tempPass: data.data.temporary_password,
          role: data.data.role,
          email: data.data.email,
          emailSent: !!data.data.email_dispatched
        });
        showToast(`User ${data.data.username} created.`);
        fetchAllData();
      } else {
        setErrorMessage(data.message || 'Failed to create user.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Network error creating user.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditUser = () => {
    const userToEdit = usersList.find(u => u.id === selectedUserId);
    if (!userToEdit) return;
    setEditUserForm({
      id: userToEdit.id,
      name: userToEdit.name,
      department: userToEdit.department,
      role: userToEdit.role,
      status: userToEdit.status
    });
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/company/users.php?organization_id=${encodeURIComponent(orgId)}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(editUserForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast('User updated successfully.');
        setShowEditUserModal(false);
        fetchAllData();
      } else {
        setErrorMessage(data.message || 'Failed to update user.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenResetPassword = () => {
    const targetUser = usersList.find(u => u.id === selectedUserId);
    if (!targetUser) return;
    setResetPasswordForm({
      userId: targetUser.id,
      userName: targetUser.name,
      newPassword: '',
      autoGenerate: true
    });
    setResetResult(null);
    setShowResetPasswordModal(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/company/users.php?organization_id=${encodeURIComponent(orgId)}&action=reset_password`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          user_id: resetPasswordForm.userId,
          new_password: resetPasswordForm.autoGenerate ? '' : resetPasswordForm.newPassword
        })
      });
      const data = await res.json();
      if (data.success) {
        setResetResult({
          tempPass: data.data.temporary_password,
          emailSent: !!data.data.email_dispatched
        });
        showToast('Password reset successfully.');
        fetchAllData();
      } else {
        setErrorMessage(data.message || 'Failed to reset password.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // SECURITY POLICY HANDLER
  // --------------------------------------------------------------------------
  const handleSaveSecurityPolicy = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/company/security_policy.php?organization_id=${encodeURIComponent(orgId)}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(securityPolicy)
      });
      const data = await res.json();
      if (data.success) {
        showToast('21 CFR Part 11 security policy saved.');
      } else {
        setErrorMessage(data.message || 'Failed to save security policy.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // SMTP & NOTIFICATION HANDLERS
  // --------------------------------------------------------------------------
  const handleSaveSmtpSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/company/smtp_settings.php?organization_id=${encodeURIComponent(orgId)}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(smtpSettings)
      });
      const data = await res.json();
      if (data.success) {
        showToast('SMTP & notification settings saved.');
      } else {
        setErrorMessage(data.message || 'Failed to save settings.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    setIsTestingSmtp(true);
    setErrorMessage('');
    try {
      const res = await fetch(`/api/company/smtp_settings.php?organization_id=${encodeURIComponent(orgId)}&action=test`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ test_email: testEmailAddress || smtpSettings.admin_alert_email })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Test email dispatched successfully.');
      } else {
        setErrorMessage(data.message || 'Failed to deliver test email.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Network error sending test email.');
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleSendEodReportNow = async () => {
    setIsSendingEod(true);
    setErrorMessage('');
    try {
      const res = await fetch(`/api/audit/eod_report.php?organization_id=${encodeURIComponent(orgId)}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        showToast(`EOD Audit summary sent to ${data.data?.recipient || 'Admin inbox'} via Hostinger SMTP.`);
      } else {
        setErrorMessage(data.message || 'Failed to dispatch EOD report.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Network error dispatching EOD report.');
    } finally {
      setIsSendingEod(false);
    }
  };

  // --------------------------------------------------------------------------
  // PERMISSION SECTIONS SPECIFICATION (Matching Screenshot 1)
  // --------------------------------------------------------------------------
  const permissionCategories = [
    {
      name: 'Company & Setup',
      icon: Building,
      items: [
        { key: 'edit_company_info', label: 'Edit Company Info' },
        { key: 'change_company_logo', label: 'Change Company Logo' },
        { key: 'printer_settings', label: 'Printer Settings' },
        { key: 'backup_archive', label: 'Backup & Archive' },
        { key: 'license_management', label: 'License Management' },
      ]
    },
    {
      name: 'Batch & Production',
      icon: Layers,
      items: [
        { key: 'create_batch', label: 'Create New Batch' },
        { key: 'edit_batch', label: 'Edit Existing Batch' },
        { key: 'edit_drum_weight', label: 'Edit Drum Weights' },
      ]
    },
    {
      name: 'Labels',
      icon: Tags,
      items: [
        { key: 'print_labels', label: 'Print / Export Labels' },
        { key: 'reprint_labels', label: 'Reprint Labels' },
      ]
    },
    {
      name: 'Templates & Products',
      icon: Sparkles,
      items: [
        { key: 'edit_templates', label: 'Edit Label Templates' },
        { key: 'edit_products', label: 'Add / Edit Products' },
      ]
    },
    {
      name: 'Users & Audit',
      icon: Users,
      items: [
        { key: 'manage_users', label: 'Manage Users' },
        { key: 'view_audit', label: 'View Audit Log' },
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-[#0088ff]" />
            Users & Role-Based Access Control (RBAC) Hub
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Compliant with US FDA 21 CFR Part 11 §11.10(d) Authority Checks & §11.200 Electronic Signatures
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {currentOrganization?.name || 'Plant Site'}
          </span>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Container with 4 Tab Header (Matching Screenshots) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Sleek Tab Navigation Header */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-4 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-t-lg transition border-t border-l border-r ${
              activeTab === 'users'
                ? 'bg-white text-[#0d3b75] border-slate-200 border-b-white -mb-px shadow-xs'
                : 'bg-transparent text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4 text-[#0088ff]" />
            User Management
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-t-lg transition border-t border-l border-r ${
              activeTab === 'roles'
                ? 'bg-white text-[#0d3b75] border-slate-200 border-b-white -mb-px shadow-xs'
                : 'bg-transparent text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <Shield className="w-4 h-4 text-[#0088ff]" />
            Role Permissions
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-t-lg transition border-t border-l border-r ${
              activeTab === 'security'
                ? 'bg-white text-[#0d3b75] border-slate-200 border-b-white -mb-px shadow-xs'
                : 'bg-transparent text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-4 h-4 text-[#0088ff]" />
            Security Policy
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('smtp')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-t-lg transition border-t border-l border-r ${
              activeTab === 'smtp'
                ? 'bg-white text-[#0d3b75] border-slate-200 border-b-white -mb-px shadow-xs'
                : 'bg-transparent text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <Mail className="w-4 h-4 text-[#0088ff]" />
            E-Mail / SMTP
          </button>
        </div>

        {/* ================================================================== */}
        {/* TAB 1: ROLE PERMISSIONS (Matching Screenshot 1)                    */}
        {/* ================================================================== */}
        {activeTab === 'roles' && (
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-600 font-medium">
                Define which actions each role is allowed to perform.
              </p>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-bold shadow-xs transition"
                >
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  Advance Permissions
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddRoleModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 text-xs font-bold shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  Add New Role
                </button>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0b2b52] text-white">
                    <th className="py-2.5 px-4 font-bold border-r border-[#1a3d69] w-1/3">
                      Permission
                    </th>
                    {roles.map(r => (
                      <th
                        key={r.name}
                        className={`py-2.5 px-4 text-center font-bold border-r border-[#1a3d69] last:border-r-0 ${
                          r.name === 'Admin'
                            ? 'bg-[#0b2b52]'
                            : r.name === 'Supervisor'
                            ? 'bg-[#1b508c]'
                            : 'bg-[#2b6ba8]'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>{r.name}</span>
                          {r.is_custom && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400 text-amber-950 font-black">
                              Custom
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissionCategories.map(cat => (
                    <React.Fragment key={cat.name}>
                      {/* Category Header Row */}
                      <tr className="bg-[#e9f2fa] border-t border-b border-slate-200 text-[#0d3b75] font-bold">
                        <td colSpan={roles.length + 1} className="py-2 px-4 flex items-center gap-2">
                          <cat.icon className="w-3.5 h-3.5 text-[#0088ff]" />
                          <span>{cat.name}</span>
                        </td>
                      </tr>

                      {/* Items */}
                      {cat.items.map(item => (
                        <tr
                          key={item.key}
                          className="border-b border-slate-100 hover:bg-slate-50/80 transition"
                        >
                          <td className="py-2.5 px-6 font-medium text-slate-700">
                            {item.label}
                          </td>
                          {roles.map(r => {
                            const isChecked = (permissionMatrix[r.name] || []).includes(item.key);
                            return (
                              <td
                                key={`${r.name}-${item.key}`}
                                className="py-2.5 px-4 text-center border-l border-slate-100"
                              >
                                <button
                                  type="button"
                                  onClick={() => togglePermission(r.name, item.key)}
                                  className={`w-4 h-4 rounded-xs border flex items-center justify-center mx-auto transition ${
                                    isChecked
                                      ? 'bg-slate-900 border-slate-900 text-white'
                                      : 'border-slate-300 hover:border-slate-400 bg-white'
                                  }`}
                                >
                                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSavePermissionMatrix}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#27783d] hover:bg-[#1f6331] text-white text-xs font-bold shadow-xs transition"
              >
                <Save className="w-4 h-4" />
                Save Permission Matrix
              </button>

              <button
                type="button"
                onClick={handleResetToDefaults}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1a4473] hover:bg-[#123358] text-white text-xs font-bold shadow-xs transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset to Defaults
              </button>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 2: USER MANAGEMENT (Matching Screenshot 2)                     */}
        {/* ================================================================== */}
        {activeTab === 'users' && (
          <div className="p-6 space-y-4">
            {/* Action Bar */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewUserForm({
                    username: '',
                    name: '',
                    email: '',
                    department: 'Packaging',
                    role: 'Operator',
                    passwordMode: 'auto',
                    manualPassword: ''
                  });
                  setCreatedCredentials(null);
                  setShowAddUserModal(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0b2b52] hover:bg-[#081e39] text-white text-xs font-bold shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add User
              </button>

              <button
                type="button"
                onClick={handleOpenEditUser}
                disabled={!selectedUserId}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-xs transition disabled:opacity-40"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                Edit
              </button>

              <button
                type="button"
                onClick={handleOpenResetPassword}
                disabled={!selectedUserId}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#f07b1a] hover:bg-[#d9670d] text-white text-xs font-bold shadow-xs transition disabled:opacity-40"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Reset Password
              </button>

              <button
                type="button"
                onClick={fetchAllData}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-xs transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                Refresh
              </button>
            </div>

            {/* Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0b2b52] text-white">
                    <th className="py-2.5 px-3 font-bold border-r border-[#1a3d69] text-center w-12">ID</th>
                    <th className="py-2.5 px-3 font-bold border-r border-[#1a3d69]">Username</th>
                    <th className="py-2.5 px-3 font-bold border-r border-[#1a3d69]">Full Name</th>
                    <th className="py-2.5 px-3 font-bold border-r border-[#1a3d69]">Department</th>
                    <th className="py-2.5 px-3 font-bold border-r border-[#1a3d69]">Role</th>
                    <th className="py-2.5 px-3 font-bold border-r border-[#1a3d69]">E-Mail</th>
                    <th className="py-2.5 px-3 font-bold border-r border-[#1a3d69] text-center">Password</th>
                    <th className="py-2.5 px-3 font-bold border-r border-[#1a3d69] text-center">Status</th>
                    <th className="py-2.5 px-3 font-bold text-center">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                        No users configured for this facility. Click <strong>+ Add User</strong> to provision credentials.
                      </td>
                    </tr>
                  ) : (
                    usersList.map((u, idx) => {
                      const isSelected = selectedUserId === u.id;
                      return (
                        <tr
                          key={u.id}
                          onClick={() => setSelectedUserId(u.id)}
                          className={`border-b border-slate-100 cursor-pointer transition select-none ${
                            isSelected ? 'bg-blue-50/90 font-semibold' : 'hover:bg-slate-50/70'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center text-slate-500 border-r border-slate-100">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#0d3b75] border-r border-slate-100">
                            {u.username}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 border-r border-slate-100">
                            {u.name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 border-r border-slate-100">
                            {u.department || 'None'}
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-100">
                            <span className="font-semibold text-slate-700">{u.role}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 border-r border-slate-100 font-mono text-[11px]">
                            {u.email}
                          </td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-100">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white">
                              <Check className="w-2.5 h-2.5 stroke-[3]" /> OK
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-100">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {u.status === 'ACTIVE' ? 'Active' : u.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-500">
                            {u.created_at ? u.created_at.replace('T', ' ').substring(0, 19) : '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 3: SECURITY POLICY (Matching Screenshot 3)                     */}
        {/* ================================================================== */}
        {activeTab === 'security' && (
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-[#0d3b75]">
                Password Policy & Account Lockout
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Standard US FDA 21 CFR Part 11 §11.200 & §11.300 Electronic Signature Security Controls
              </p>
            </div>

            {/* Policy Parameters Box */}
            <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-3.5 max-w-3xl">
              {/* Max Failed Attempts */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Max Failed Login Attempts</span>
                <input
                  type="number"
                  min={3}
                  max={10}
                  value={securityPolicy.max_failed_attempts}
                  onChange={(e) => setSecurityPolicy({ ...securityPolicy, max_failed_attempts: parseInt(e.target.value) || 5 })}
                  className="w-20 px-3 py-1.5 border border-slate-300 rounded text-right font-mono font-bold text-[#0d3b75] focus:outline-blue-500"
                />
              </div>

              {/* Account Lockout Duration */}
              <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-3">
                <span className="font-semibold text-slate-700">Account Lockout Duration (min)</span>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={securityPolicy.lockout_duration_min}
                  onChange={(e) => setSecurityPolicy({ ...securityPolicy, lockout_duration_min: parseInt(e.target.value) || 15 })}
                  className="w-20 px-3 py-1.5 border border-slate-300 rounded text-right font-mono font-bold text-[#0d3b75] focus:outline-blue-500"
                />
              </div>

              {/* Minimum Password Length */}
              <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-3">
                <span className="font-semibold text-slate-700">Minimum Password Length</span>
                <input
                  type="number"
                  min={6}
                  max={32}
                  value={securityPolicy.min_password_length}
                  onChange={(e) => setSecurityPolicy({ ...securityPolicy, min_password_length: parseInt(e.target.value) || 8 })}
                  className="w-20 px-3 py-1.5 border border-slate-300 rounded text-right font-mono font-bold text-[#0d3b75] focus:outline-blue-500"
                />
              </div>

              {/* Require Uppercase */}
              <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-3">
                <span className="font-semibold text-slate-700">Require Uppercase Letter</span>
                <button
                  type="button"
                  onClick={() => setSecurityPolicy({ ...securityPolicy, require_uppercase: !securityPolicy.require_uppercase })}
                  className={`w-4 h-4 rounded-xs border flex items-center justify-center transition ${
                    securityPolicy.require_uppercase
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {securityPolicy.require_uppercase && <Check className="w-3 h-3 stroke-[3]" />}
                </button>
              </div>

              {/* Require Numeric Digit */}
              <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-3">
                <span className="font-semibold text-slate-700">Require Numeric Digit</span>
                <button
                  type="button"
                  onClick={() => setSecurityPolicy({ ...securityPolicy, require_numeric: !securityPolicy.require_numeric })}
                  className={`w-4 h-4 rounded-xs border flex items-center justify-center transition ${
                    securityPolicy.require_numeric
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {securityPolicy.require_numeric && <Check className="w-3 h-3 stroke-[3]" />}
                </button>
              </div>

              {/* Require Special Character */}
              <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-3">
                <span className="font-semibold text-slate-700">Require Special Character</span>
                <button
                  type="button"
                  onClick={() => setSecurityPolicy({ ...securityPolicy, require_special: !securityPolicy.require_special })}
                  className={`w-4 h-4 rounded-xs border flex items-center justify-center transition ${
                    securityPolicy.require_special
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {securityPolicy.require_special && <Check className="w-3 h-3 stroke-[3]" />}
                </button>
              </div>

              {/* Password Expiry */}
              <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-3">
                <span className="font-semibold text-slate-700">Password Expiry (days, 0=never)</span>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={securityPolicy.password_expiry_days}
                  onChange={(e) => setSecurityPolicy({ ...securityPolicy, password_expiry_days: parseInt(e.target.value) || 90 })}
                  className="w-20 px-3 py-1.5 border border-slate-300 rounded text-right font-mono font-bold text-[#0d3b75] focus:outline-blue-500"
                />
              </div>

              {/* Password Reuse Prevention */}
              <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-3">
                <span className="font-semibold text-slate-700">Password Reuse Prevention (# previous passwords blocked)</span>
                <input
                  type="number"
                  min={0}
                  max={24}
                  value={securityPolicy.password_reuse_blocked}
                  onChange={(e) => setSecurityPolicy({ ...securityPolicy, password_reuse_blocked: parseInt(e.target.value) || 5 })}
                  className="w-20 px-3 py-1.5 border border-slate-300 rounded text-right font-mono font-bold text-[#0d3b75] focus:outline-blue-500"
                />
              </div>

              {/* Session Timeout */}
              <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-3">
                <span className="font-semibold text-slate-700">Session Timeout (minutes, 0=never)</span>
                <input
                  type="number"
                  min={5}
                  max={480}
                  value={securityPolicy.session_timeout_min}
                  onChange={(e) => setSecurityPolicy({ ...securityPolicy, session_timeout_min: parseInt(e.target.value) || 60 })}
                  className="w-20 px-3 py-1.5 border border-slate-300 rounded text-right font-mono font-bold text-[#0d3b75] focus:outline-blue-500"
                />
              </div>
            </div>

            {/* Current Summary Note */}
            <p className="text-xs text-slate-500">
              Current policy: Min {securityPolicy.min_password_length} chars, requires: {securityPolicy.require_uppercase ? 'uppercase, ' : ''}{securityPolicy.require_numeric ? 'number' : ''} | Expires: {securityPolicy.password_expiry_days} days | Lock after {securityPolicy.max_failed_attempts} failed attempts for {securityPolicy.lockout_duration_min} min
            </p>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSaveSecurityPolicy}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#27783d] hover:bg-[#1f6331] text-white text-xs font-bold shadow-xs transition"
            >
              <Save className="w-4 h-4" />
              Save Security Settings
            </button>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 4: E-MAIL / SMTP (Matching Screenshot 4) + REAL-TIME ALERTS    */}
        {/* ================================================================== */}
        {activeTab === 'smtp' && (
          <div className="p-6 space-y-7">
            {/* Outgoing Mail Setup */}
            <div>
              <h2 className="text-sm font-bold text-[#0d3b75]">
                E-Mail (SMTP) — Outgoing Mail for Password Resets
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure your outgoing mail server so users can receive password-reset tokens by e-mail.
              </p>
            </div>

            <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4 max-w-3xl">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={smtpSettings.smtp_host}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_host: e.target.value })}
                  placeholder="smtp.hostinger.com | smtp.gmail.com"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">e.g. smtp.hostinger.com | smtp.gmail.com | smtp.office365.com</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  SMTP Port
                </label>
                <input
                  type="number"
                  value={smtpSettings.smtp_port}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_port: parseInt(e.target.value) || 465 })}
                  placeholder="465"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">465 = SSL/TLS | 587 = STARTTLS | 25 = plain</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Login / Username
                </label>
                <input
                  type="text"
                  value={smtpSettings.smtp_user}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_user: e.target.value })}
                  placeholder="info@camel-communication.com"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Your e-mail account login</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Password / App Password
                </label>
                <input
                  type="password"
                  value={smtpSettings.smtp_pass}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_pass: e.target.value })}
                  placeholder="•••••••••••• (Leave blank to keep existing password)"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Use an App Password for Gmail/Microsoft or Mailbox Password for Hostinger</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  From Address
                </label>
                <input
                  type="text"
                  value={smtpSettings.from_address}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, from_address: e.target.value })}
                  placeholder="info@camel-communication.com"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">e.g. noreply@yourcompany.com (blank = same as Login)</span>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <button
                    type="button"
                    onClick={() => setSmtpSettings({ ...smtpSettings, use_tls: !smtpSettings.use_tls })}
                    className={`w-4 h-4 rounded-xs border flex items-center justify-center transition ${
                      smtpSettings.use_tls
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {smtpSettings.use_tls && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                  <span className="text-xs font-medium text-slate-700">
                    Use STARTTLS / SSL (recommended — required for port 465 / 587)
                  </span>
                </label>
              </div>
            </div>

            {/* REAL-TIME ADMIN ACTIVITY ALERTS & EOD AUDIT REPORT (User Requested Feature) */}
            <div className="border border-blue-200 rounded-xl p-5 bg-blue-50/40 space-y-4 max-w-3xl">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-200 text-blue-900">
                  Regulatory Feature
                </span>
                <h3 className="text-sm font-bold text-[#0d3b75] mt-1.5 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  Real-Time Plant Admin Activity Alerts & Daily EOD Audit Reports
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Automatically dispatches email alerts to the Plant Administrator whenever operators or supervisors perform actions.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Plant Admin Alert Recipient Email
                </label>
                <input
                  type="email"
                  value={smtpSettings.admin_alert_email}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, admin_alert_email: e.target.value })}
                  placeholder="admin@pharma.com"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 bg-white focus:outline-blue-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  All live activity alerts and daily EOD summaries will be delivered to this inbox.
                </span>
              </div>

              {/* Toggles */}
              <div className="space-y-2.5 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={smtpSettings.notify_on_operator_print}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, notify_on_operator_print: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="text-xs font-medium text-slate-800">
                    Notify Admin when Operator starts printing labels
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={smtpSettings.notify_on_supervisor_auth}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, notify_on_supervisor_auth: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="text-xs font-medium text-slate-800">
                    Notify Admin when Supervisor authenticates or approves batch / template / clearance
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={smtpSettings.notify_on_reprint}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, notify_on_reprint: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="text-xs font-medium text-slate-800">
                    Notify Admin on label reprint request or drum damage invalidation
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={smtpSettings.eod_report_enabled}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, eod_report_enabled: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="text-xs font-medium text-slate-800">
                    Automatically compile and dispatch daily End-of-Day (EOD) GxP Audit Trail Report
                  </span>
                </label>
              </div>

              {/* Instant EOD Trigger Button */}
              <div className="pt-2 border-t border-blue-200/80 flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">
                  Test or manually send today's daily audit report:
                </span>
                <button
                  type="button"
                  onClick={handleSendEodReportNow}
                  disabled={isSendingEod}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${isSendingEod ? 'animate-spin' : ''}`} />
                  {isSendingEod ? 'Compiling & Dispatching...' : 'Send EOD Audit Report Now'}
                </button>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSaveSmtpSettings}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#27783d] hover:bg-[#1f6331] text-white text-xs font-bold shadow-xs transition"
              >
                <Save className="w-4 h-4" />
                Save SMTP Settings
              </button>

              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={isTestingSmtp}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1a4473] hover:bg-[#123358] text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
              >
                <Send className={`w-3.5 h-3.5 ${isTestingSmtp ? 'animate-spin' : ''}`} />
                {isTestingSmtp ? 'Sending...' : 'Send Test E-Mail'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* MODAL 1: ADD USER MODAL                                              */}
      {/* ==================================================================== */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#0b2b52] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">Add New Plant Personnel</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdCredentials ? (
              <div className="p-6 space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <div className="font-bold text-sm flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> User Created Successfully!
                  </div>
                  <p className="text-xs text-emerald-800 mt-1">
                    {createdCredentials.emailSent
                      ? `Credentials and temporary password have been dispatched to ${createdCredentials.email} via Hostinger SMTP.`
                      : 'Please provide the user with their initial sign-in credentials below:'}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Username:</span>
                    <span className="font-bold text-slate-900">{createdCredentials.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Assigned Role:</span>
                    <span className="font-bold text-blue-600">{createdCredentials.role}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                    <span className="text-slate-500">Temporary Password:</span>
                    <span className="font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                      {createdCredentials.tempPass}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="w-full py-2.5 rounded-lg bg-[#0b2b52] hover:bg-[#081e39] text-white text-xs font-bold transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. operator_line1"
                    value={newUserForm.username}
                    onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Used for daily login to shopfloor terminal</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={newUserForm.name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Packaging Floor"
                      value={newUserForm.department}
                      onChange={(e) => setNewUserForm({ ...newUserForm, department: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Role <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={newUserForm.role}
                      onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white focus:outline-blue-500"
                    >
                      {roles.map(r => (
                        <option key={r.name} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Email Address <span className="text-slate-400 font-normal">(Optional for notifications)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="operator@pharma.com"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-blue-500"
                  />
                </div>

                {/* Password Mode */}
                <div className="pt-1 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Initial Password Assignment
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setNewUserForm({ ...newUserForm, passwordMode: 'auto' })}
                      className={`py-2 px-3 rounded-lg border font-bold text-left transition ${
                        newUserForm.passwordMode === 'auto'
                          ? 'bg-blue-50 border-blue-300 text-blue-900'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Auto-Generate Secure Temp Pass
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewUserForm({ ...newUserForm, passwordMode: 'manual' })}
                      className={`py-2 px-3 rounded-lg border font-bold text-left transition ${
                        newUserForm.passwordMode === 'manual'
                          ? 'bg-blue-50 border-blue-300 text-blue-900'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Manually Set Password
                    </button>
                  </div>

                  {newUserForm.passwordMode === 'manual' && (
                    <input
                      type="text"
                      required
                      placeholder="Enter minimum 8 chars password"
                      value={newUserForm.manualPassword}
                      onChange={(e) => setNewUserForm({ ...newUserForm, manualPassword: e.target.value })}
                      className="w-full mt-2 px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-blue-500"
                    />
                  )}
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 rounded-lg bg-[#0b2b52] hover:bg-[#081e39] text-white text-xs font-bold shadow-xs transition"
                  >
                    {loading ? 'Creating...' : 'Create User & Provision Access'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: EDIT USER MODAL                                             */}
      {/* ==================================================================== */}
      {showEditUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#0b2b52] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">Edit User Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditUserModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editUserForm.name}
                  onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={editUserForm.department}
                  onChange={(e) => setEditUserForm({ ...editUserForm, department: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Role
                </label>
                <select
                  value={editUserForm.role}
                  onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white focus:outline-blue-500"
                >
                  {roles.map(r => (
                    <option key={r.name} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Account Status
                </label>
                <select
                  value={editUserForm.status}
                  onChange={(e) => setEditUserForm({ ...editUserForm, status: e.target.value as any })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white focus:outline-blue-500"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive (Suspended)</option>
                  <option value="LOCKED">Locked</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditUserModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-lg bg-[#0b2b52] hover:bg-[#081e39] text-white text-xs font-bold shadow-xs transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: RESET PASSWORD MODAL                                        */}
      {/* ==================================================================== */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#f07b1a] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-white" />
                <h3 className="font-bold text-sm">Reset Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowResetPasswordModal(false)}
                className="text-amber-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetResult ? (
              <div className="p-6 space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <div className="font-bold text-sm flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Password Reset Successful!
                  </div>
                  <p className="text-xs text-emerald-800 mt-1">
                    {resetResult.emailSent
                      ? 'The user was sent their new password via Hostinger SMTP.'
                      : 'Provide this temporary password to the user. They must change it upon login.'}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-xs flex justify-between items-center">
                  <span className="text-slate-500">New Password:</span>
                  <span className="font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded">
                    {resetResult.tempPass}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowResetPasswordModal(false)}
                  className="w-full py-2.5 rounded-lg bg-[#0b2b52] hover:bg-[#081e39] text-white text-xs font-bold transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="p-6 space-y-4">
                <p className="text-xs text-slate-600">
                  Reset password for <strong>{resetPasswordForm.userName}</strong>.
                </p>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="radio"
                      checked={resetPasswordForm.autoGenerate}
                      onChange={() => setResetPasswordForm({ ...resetPasswordForm, autoGenerate: true })}
                      className="text-blue-600"
                    />
                    Auto-Generate Cryptographically Secure Password
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="radio"
                      checked={!resetPasswordForm.autoGenerate}
                      onChange={() => setResetPasswordForm({ ...resetPasswordForm, autoGenerate: false })}
                      className="text-blue-600"
                    />
                    Type Custom Password
                  </label>
                </div>

                {!resetPasswordForm.autoGenerate && (
                  <input
                    type="text"
                    required
                    placeholder="Enter new password"
                    value={resetPasswordForm.newPassword}
                    onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, newPassword: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-blue-500"
                  />
                )}

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowResetPasswordModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 rounded-lg bg-[#f07b1a] hover:bg-[#d9670d] text-white text-xs font-bold shadow-xs transition"
                  >
                    {loading ? 'Resetting...' : 'Execute Reset'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 4: ADD NEW ROLE MODAL                                          */}
      {/* ==================================================================== */}
      {showAddRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#0b2b52] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">Add New Custom Role</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddRoleModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Role Title / Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. QA Inspector or Line Incharge"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  This role will be added as a configurable column in the permission matrix.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddRoleModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddNewRole}
                  disabled={loading || !newRoleName.trim()}
                  className="px-5 py-2 rounded-lg bg-[#0b2b52] hover:bg-[#081e39] text-white text-xs font-bold shadow-xs transition disabled:opacity-40"
                >
                  Create Role Column
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 5: ADVANCE PERMISSIONS MODAL (Download Label Copy & Export)     */}
      {/* ==================================================================== */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-gradient-to-r from-indigo-900 to-blue-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-300" />
                <h3 className="font-bold text-sm">Advance Permissions — Label Data Export & Copy Controls</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvanceModal(false)}
                className="text-indigo-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Under US FDA 21 CFR Part 11 and GxP data integrity rules, downloading label digital proofs (PDF/image) and exporting raw label datasets (CSV/Excel) are high-privilege operations. Control which roles are authorized:
              </p>

              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-4 border-r border-slate-200">Role</th>
                      <th className="py-2.5 px-4 border-r border-slate-200 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Download className="w-3.5 h-3.5 text-blue-600" />
                          <span>Download Label Copy (PDF/Image)</span>
                        </div>
                      </th>
                      <th className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Export Labels (CSV / Datasets)</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map(r => {
                      const adv = advancePermissions[r.name] || { can_download_label_copy: false, can_export_labels: false };
                      return (
                        <tr key={r.name} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-bold text-[#0d3b75] border-r border-slate-100">
                            {r.name}
                          </td>
                          <td className="py-3 px-4 text-center border-r border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                setAdvancePermissions(prev => ({
                                  ...prev,
                                  [r.name]: {
                                    ...adv,
                                    can_download_label_copy: !adv.can_download_label_copy
                                  }
                                }));
                              }}
                              className={`w-4 h-4 rounded-xs border flex items-center justify-center mx-auto transition ${
                                adv.can_download_label_copy
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {adv.can_download_label_copy && <Check className="w-3 h-3 stroke-[3]" />}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setAdvancePermissions(prev => ({
                                  ...prev,
                                  [r.name]: {
                                    ...adv,
                                    can_export_labels: !adv.can_export_labels
                                  }
                                }));
                              }}
                              className={`w-4 h-4 rounded-xs border flex items-center justify-center mx-auto transition ${
                                adv.can_export_labels
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {adv.can_export_labels && <Check className="w-3 h-3 stroke-[3]" />}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAdvancePermissions}
                  disabled={loading}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition"
                >
                  Save Advance Permissions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
