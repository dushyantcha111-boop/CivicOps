import React from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';

export const MobileNav: React.FC = () => {
  const { activeTab, setActiveTab, role } = useApp();

  const tabsByRole: Record<UserRole, { id: string; label: string; icon: string }[]> = {
    RESIDENT: [
      { id: 'resident-home', label: 'Home', icon: 'home' },
      { id: 'raise-complaint', label: 'Complaint', icon: 'add_circle' },
      { id: 'resident-signoff', label: 'Sign-Off', icon: 'fact_check' },
      { id: 'community-hub', label: 'Notices', icon: 'campaign' },
      { id: 'notifications', label: 'Alerts', icon: 'notifications' }
    ],
    MAINTENANCE: [
      { id: 'maintenance-dashboard', label: 'Hub', icon: 'home_repair_service' },
      { id: 'assigned-work-orders', label: 'Jobs', icon: 'engineering' },
      { id: 'inspection-proposal', label: 'Propose', icon: 'build_circle' },
      { id: 'preventive-maintenance', label: 'PM Plan', icon: 'event_repeat' },
      { id: 'spares-requisitions', label: 'Spares', icon: 'shopping_cart_checkout' }
    ],
    SECURITY: [
      { id: 'gate-console', label: 'Gate', icon: 'shield_person' },
      { id: 'visitor-qr-verify', label: 'Verify', icon: 'qr_code_scanner' },
      { id: 'parcel-hub', label: 'Parcels', icon: 'local_shipping' },
      { id: 'visitor-revocation', label: 'Revoke', icon: 'block' },
      { id: 'incident-reporting', label: 'SOS', icon: 'e911_emergency' }
    ],
    MANAGEMENT: [
      { id: 'management-overview', label: 'Overview', icon: 'grid_view' },
      { id: 'complaint-operations', label: 'Tickets', icon: 'support_agent' },
      { id: 'memory-graph', label: 'Memory', icon: 'hub' },
      { id: 'reliability-radar', label: 'Radar', icon: 'radar' },
      { id: 'community-hub', label: 'Notices', icon: 'campaign' }
    ],
    ADMIN: [
      { id: 'settings-roles', label: 'Users', icon: 'manage_accounts' },
      { id: 'management-overview', label: 'Overview', icon: 'grid_view' },
      { id: 'complaint-operations', label: 'Tickets', icon: 'support_agent' },
      { id: 'audit-logs', label: 'Audit', icon: 'history_edu' },
      { id: 'reliability-radar', label: 'Radar', icon: 'radar' }
    ]
  };

  const tabs = tabsByRole[role] || tabsByRole.RESIDENT;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200 z-50 flex items-center justify-around px-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all ${
              isActive ? 'text-primary' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[22px] ${
                isActive ? 'scale-110 font-bold' : ''
              }`}
            >
              {tab.icon}
            </span>
            <span className={`text-[10px] font-semibold mt-0.5 ${isActive ? 'text-primary' : ''}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
