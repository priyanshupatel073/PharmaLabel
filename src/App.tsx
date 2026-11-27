import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { MainLayout } from './layouts/MainLayout';
import { PageShell } from './components/PageShell';
import { APP_ROUTES, RouteId } from './routes';
import {
  DashboardPage,
  BatchManagementPage,
  LabelPrintingPage,
  ProductMasterPage,
  TemplateDesignerPage,
  CompanySettingsPage,
  AuditTrailPage,
  ReportsPage,
  BackupLicensePage,
  LoginPage,
  SuperAdminPage,
  UserSecurityHubPage,
} from './pages';

import { useApp } from './context/AppContext';

const PAGE_COMPONENTS: Record<RouteId, React.ComponentType> = {
  superadmin: SuperAdminPage,
  dashboard: DashboardPage,
  batches: BatchManagementPage,
  printing: LabelPrintingPage,
  products: ProductMasterPage,
  templates: TemplateDesignerPage,
  company: CompanySettingsPage,
  securityHub: UserSecurityHubPage,
  audit: AuditTrailPage,
  reports: ReportsPage,
  backup: BackupLicensePage,
};

const RoleBasedRedirect: React.FC = () => {
  const { currentUser } = useApp();
  return <Navigate to={currentUser.role === 'SuperAdmin' ? APP_ROUTES.superadmin.path : APP_ROUTES.dashboard.path} replace />;
};

export function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<MainLayout />}>
          <Route path="/" element={<RoleBasedRedirect />} />
          {(Object.keys(APP_ROUTES) as RouteId[]).map((routeId) => {
            const PageComponent = PAGE_COMPONENTS[routeId];
            return (
              <Route
                key={routeId}
                path={APP_ROUTES[routeId].path}
                element={
                  <PageShell routeId={routeId}>
                    <PageComponent />
                  </PageShell>
                }
              />
            );
          })}
          <Route path="*" element={<RoleBasedRedirect />} />
        </Route>
      </Routes>
    </AppProvider>
  );
}

export default App;
