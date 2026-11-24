import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  badge?: { label: string; color: 'blue' | 'amber' | 'emerald' | 'rose' | 'purple' };
}

const badgeColors = {
  blue:    'bg-blue-100 text-blue-700 border-blue-200',
  amber:   'bg-amber-100 text-amber-700 border-amber-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rose:    'bg-rose-100 text-rose-700 border-rose-200',
  purple:  'bg-purple-100 text-purple-700 border-purple-200',
};

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, action, badge }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <div className="flex items-center gap-2.5">
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
        {badge && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badgeColors[badge.color]}`}>
            {badge.label}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

// Reusable card wrapper
export const Card: React.FC<{ children: React.ReactNode; className?: string; noPad?: boolean }> = ({ children, className = '', noPad }) => (
  <div className={`bg-white rounded-2xl shadow-card border border-slate-200/90 ${noPad ? '' : 'p-5'} ${className}`}>
    {children}
  </div>
);

// Reusable primary button
export const PrimaryBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode }> = ({
  children, icon, className = '', style, ...rest
}) => (
  <button
    {...rest}
    style={{ backgroundColor: '#2563eb', color: '#ffffff', ...style }}
    className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700
      text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-[0.98]
      disabled:opacity-40 disabled:cursor-not-allowed border border-blue-700 ${className}`}
  >
    {icon && <span style={{ color: '#ffffff' }} className="text-white shrink-0 flex items-center">{icon}</span>}
    <span style={{ color: '#ffffff' }} className="text-white font-bold">{children}</span>
  </button>
);

// Reusable secondary button
export const SecondaryBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode }> = ({
  children, icon, className = '', style, ...rest
}) => (
  <button
    {...rest}
    style={{ backgroundColor: '#ffffff', color: '#1e293b', ...style }}
    className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-100 hover:border-slate-400
      text-slate-800 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-[0.98]
      disabled:opacity-40 disabled:cursor-not-allowed border border-slate-300 ${className}`}
  >
    {icon && <span className="text-slate-600 shrink-0 flex items-center">{icon}</span>}
    <span className="text-slate-800 font-bold">{children}</span>
  </button>
);

// Status badge
export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    'Active':            'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Approved/Effective':'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Completed':         'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Printed':           'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Pending Approval':  'bg-amber-100  text-amber-800   border-amber-200',
    'In Review':         'bg-amber-100  text-amber-800   border-amber-200',
    'Pending':           'bg-slate-100  text-slate-700   border-slate-200',
    'In Progress':       'bg-blue-100   text-blue-800    border-blue-200',
    'Draft':             'bg-blue-100   text-blue-800    border-blue-200',
    'Damaged':           'bg-rose-100   text-rose-800    border-rose-200',
    'Cancelled':         'bg-rose-100   text-rose-700    border-rose-200',
    'Obsolete':          'bg-slate-100  text-slate-500   border-slate-200',
    'Inactive':          'bg-slate-100  text-slate-500   border-slate-200',
  };
  const cls = map[status] || 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>
      {status}
    </span>
  );
};

// Modal wrapper
export const Modal: React.FC<{ onClose: () => void; title: string; subtitle?: string; children: React.ReactNode; maxW?: string }> = ({
  onClose, title, subtitle, children, maxW = 'max-w-xl'
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 overflow-y-auto">
    <div className={`bg-white rounded-2xl shadow-2xl border border-slate-200 ${maxW} w-full my-6 overflow-hidden`}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-base text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition">
          ✕
        </button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  </div>
);

// Form field
export const FormField: React.FC<{
  label: string; children: React.ReactNode; hint?: string; required?: boolean
}> = ({ label, children, hint, required }) => (
  <div>
    <label className="block text-xs font-bold text-slate-800 mb-1.5">
      {label} {required && <span className="text-rose-600 font-black">*</span>}
    </label>
    {children}
    {hint && <div className="text-[11px] text-slate-500 font-medium mt-1">{hint}</div>}
  </div>
);

// Input
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...rest }) => (
  <input
    {...rest}
    className={`w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50/70 text-slate-900 font-medium
      focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white
      transition placeholder:text-slate-400 font-sans ${className}`}
  />
);

// Textarea
export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className = '', ...rest }) => (
  <textarea
    {...rest}
    className={`w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50/70 text-slate-900 font-medium
      focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white
      transition placeholder:text-slate-400 resize-none ${className}`}
  />
);

// Select
export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className = '', ...rest }) => (
  <select
    {...rest}
    className={`w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50/70 text-slate-900 font-semibold
      focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white
      transition ${className}`}
  />
);
