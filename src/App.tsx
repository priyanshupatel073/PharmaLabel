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
} from './pages';

const PAGE_COMPONENTS: Record<RouteId, React.ComponentType> = {
  dashboard: DashboardPage,
  batches: BatchManagementPage,
  printing: LabelPrintingPage,
  products: ProductMasterPage,
  templates: TemplateDesignerPage,
  company: CompanySettingsPage,
  audit: AuditTrailPage,
  reports: ReportsPage,
  backup: BackupLicensePage,
};

export function App() {
  return (
    <AppProvider>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to={APP_ROUTES.dashboard.path} replace />} />
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
          <Route path="*" element={<Navigate to={APP_ROUTES.dashboard.path} replace />} />
        </Route>
      </Routes>
    </AppProvider>
  );
}

export default App;
