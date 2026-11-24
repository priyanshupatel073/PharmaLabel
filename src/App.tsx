import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Topbar } from './components/Topbar';
import { Sidebar } from './components/Sidebar';
import { LoginModal } from './components/LoginModal';
import { DashboardView } from './components/views/DashboardView';
import { CompanySettingsView } from './components/views/CompanySettingsView';
import { ProductMasterView } from './components/views/ProductMasterView';
import { BatchManagementView } from './components/views/BatchManagementView';
import { TemplateDesignerView } from './components/views/TemplateDesignerView';
import { LabelPrintingView } from './components/views/LabelPrintingView';
import { AuditTrailView } from './components/views/AuditTrailView';
import { ReportsView } from './components/views/ReportsView';
import { BackupLicenseView } from './components/views/BackupLicenseView';

const MainAppContent: React.FC = () => {
  const { activeTab } = useApp();
  const [loginOpen, setLoginOpen] = useState(false);

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView />;
      case 'company':   return <CompanySettingsView />;
      case 'products':  return <ProductMasterView />;
      case 'batches':   return <BatchManagementView />;
      case 'templates': return <TemplateDesignerView />;
      case 'printing':  return <LabelPrintingView />;
      case 'audit':     return <AuditTrailView />;
      case 'reports':   return <ReportsView />;
      case 'backup':    return <BackupLicenseView />;
      default:          return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex font-sans">
      {/* Sticky Full-Height Sidebar */}
      <Sidebar />

      {/* Main Content Area with Sticky Topbar */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onOpenLoginModal={() => setLoginOpen(true)} />
        <main className="flex-1 p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {renderView()}
          </div>
        </main>
      </div>

      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
export default App;
