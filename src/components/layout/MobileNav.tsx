import React from 'react';
import { useApp } from '../../context/AppContext';

export const MobileNav: React.FC = () => {
  const { activeTab, setActiveTab, role } = useApp();

  const residentTabs = [
    { id: 'resident-home', label: 'Home', icon: 'home' },
    { id: 'complaint-operations', label: 'Helpdesk', icon: 'support_agent' },
    { id: 'gate-console', label: 'Security', icon: 'shield_person' },
    { id: 'parcel-hub', label: 'Parcels', icon: 'inventory_2' },
    { id: 'settings-roles', label: 'Role Switch', icon: 'manage_accounts' }
  ];

  const adminTabs = [
    { id: 'management-overview', label: 'Overview', icon: 'grid_view' },
    { id: 'complaint-operations', label: 'Tickets', icon: 'support_agent' },
    { id: 'memory-graph', label: 'Intelligence', icon: 'hub' },
    { id: 'assigned-work-orders', label: 'Work Orders', icon: 'engineering' },
    { id: 'settings-roles', label: 'Roles', icon: 'tune' }
  ];

  const tabs = role === 'RESIDENT' ? residentTabs : adminTabs;

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
