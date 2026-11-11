import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { RoleSwitcherModal } from './components/layout/RoleSwitcherModal';
import { EmergencySOSModal } from './components/layout/EmergencySOSModal';
import { PreApproveVisitorModal } from './components/layout/PreApproveVisitorModal';
import { FastCheckInModal } from './components/layout/FastCheckInModal';

// Views
import { ManagementOverviewView } from './components/views/ManagementOverviewView';
import { ResidentHomeView } from './components/views/ResidentHomeView';
import { RaiseComplaintView } from './components/views/RaiseComplaintView';
import { ComplaintOperationsView } from './components/views/ComplaintOperationsView';
import { ResolutionTrustTimelineView } from './components/views/ResolutionTrustTimelineView';
import { InspectionResolutionProposerView } from './components/views/InspectionResolutionProposerView';
import { ResidentResolutionSignOffView } from './components/views/ResidentResolutionSignOffView';
import { AssignedWorkOrdersView } from './components/views/AssignedWorkOrdersView';
import { WorkOrderDetailsView } from './components/views/WorkOrderDetailsView';
import { MaintenanceDashboardView } from './components/views/MaintenanceDashboardView';
import { CommunityMemoryGraphView } from './components/views/CommunityMemoryGraphView';
import { CommunityReliabilityRadarView } from './components/views/CommunityReliabilityRadarView';
import { RecurrenceReviewQueueView } from './components/views/RecurrenceReviewQueueView';
import { ResidentsUnitsDirectoryView } from './components/views/ResidentsUnitsDirectoryView';
import { SecurityGuardGateConsoleView } from './components/views/SecurityGuardGateConsoleView';
import { VisitorPassQrVerificationView } from './components/views/VisitorPassQrVerificationView';
import { VisitorPassRevocationView } from './components/views/VisitorPassRevocationView';
import { DeliveryEntryParcelHubView } from './components/views/DeliveryEntryParcelHubView';
import { IncidentReportingEmergencyAlertView } from './components/views/IncidentReportingEmergencyAlertView';
import { AssetRegisterSparesManagementView } from './components/views/AssetRegisterSparesManagementView';
import { SparesInventoryReorderView } from './components/views/SparesInventoryReorderView';
import { SparesRequisitionApprovalView } from './components/views/SparesRequisitionApprovalView';
import { PreventiveMaintenanceCalendarView } from './components/views/PreventiveMaintenanceCalendarView';
import { SettingsRolesPermissionsView } from './components/views/SettingsRolesPermissionsView';

const MainContent: React.FC = () => {
  const { activeTab, toast } = useApp();

  const renderActiveView = () => {
    switch (activeTab) {
      case 'management-overview':
        return <ManagementOverviewView />;
      case 'resident-home':
        return <ResidentHomeView />;
      case 'raise-complaint':
        return <RaiseComplaintView />;
      case 'complaint-operations':
        return <ComplaintOperationsView />;
      case 'resolution-timeline':
        return <ResolutionTrustTimelineView />;
      case 'inspection-proposal':
        return <InspectionResolutionProposerView />;
      case 'resident-signoff':
        return <ResidentResolutionSignOffView />;
      case 'assigned-work-orders':
        return <AssignedWorkOrdersView />;
      case 'work-order-details':
        return <WorkOrderDetailsView />;
      case 'maintenance-dashboard':
        return <MaintenanceDashboardView />;
      case 'memory-graph':
        return <CommunityMemoryGraphView />;
      case 'reliability-radar':
        return <CommunityReliabilityRadarView />;
      case 'recurrence-review-queue':
        return <RecurrenceReviewQueueView />;
      case 'residents-directory':
        return <ResidentsUnitsDirectoryView />;
      case 'gate-console':
        return <SecurityGuardGateConsoleView />;
      case 'visitor-qr-verify':
        return <VisitorPassQrVerificationView />;
      case 'visitor-revocation':
        return <VisitorPassRevocationView />;
      case 'parcel-hub':
        return <DeliveryEntryParcelHubView />;
      case 'incident-reporting':
        return <IncidentReportingEmergencyAlertView />;
      case 'asset-register':
        return <AssetRegisterSparesManagementView />;
      case 'spares-inventory':
        return <SparesInventoryReorderView />;
      case 'spares-requisitions':
        return <SparesRequisitionApprovalView />;
      case 'preventive-maintenance':
        return <PreventiveMaintenanceCalendarView />;
      case 'settings-roles':
        return <SettingsRolesPermissionsView />;
      default:
        return <ManagementOverviewView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-primary selection:text-white">
      {/* Top Header */}
      <Header />

      {/* Main Layout Body */}
      <div className="flex-1 flex pt-16">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Dynamic Center Canvas */}
        <main className="flex-1 lg:pl-64 p-4 lg:p-8 min-h-[calc(100vh-4rem)]">
          {renderActiveView()}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      {/* Interactive Global Modals */}
      <RoleSwitcherModal />
      <EmergencySOSModal />
      <PreApproveVisitorModal />
      <FastCheckInModal />

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-20 lg:bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-4 duration-200 ${
            toast.type === 'error'
              ? 'bg-red-600 text-white border-red-700'
              : toast.type === 'info'
              ? 'bg-slate-900 text-white border-slate-800'
              : 'bg-emerald-600 text-white border-emerald-700'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === 'error' ? 'error' : toast.type === 'info' ? 'info' : 'check_circle'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
