import React from 'react';
import { useApp } from '../../context/AppContext';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, complaints, requisitions, incidents, role } = useApp();

  const activeComplaintsCount = complaints.filter(
    (c) => c.status !== 'CLOSED' && c.status !== 'RESIDENT_CONFIRMED'
  ).length;

  const pendingRequisitionsCount = requisitions.filter((r) => r.status === 'PENDING_APPROVAL').length;
  const activeIncidentsCount = incidents.filter((i) => i.status === 'ACTIVE').length;

  const sections: NavSection[] = [
    {
      title: 'Command Center',
      items: [
        { id: 'management-overview', label: 'Executive Overview', icon: 'grid_view' },
        { id: 'resident-home', label: 'Resident Portal', icon: 'home_app_logo', badge: role === 'RESIDENT' ? 'Active' : undefined, badgeColor: 'bg-blue-100 text-blue-700' },
        {
          id: 'complaint-operations',
          label: 'Complaint Operations',
          icon: 'support_agent',
          badge: activeComplaintsCount > 0 ? `${activeComplaintsCount}` : undefined,
          badgeColor: 'bg-amber-100 text-amber-800'
        },
        { id: 'resolution-timeline', label: 'Resolution Trust Timeline', icon: 'verified_user' },
        { id: 'recurrence-review-queue', label: 'Recurrence Review', icon: 'history_toggle_off' }
      ]
    },
    {
      title: 'Intelligence & Reliability',
      items: [
        { id: 'memory-graph', label: 'Community Memory Graph', icon: 'hub' },
        { id: 'reliability-radar', label: 'Reliability Radar', icon: 'radar' }
      ]
    },
    {
      title: 'Asset & Maintenance',
      items: [
        { id: 'maintenance-dashboard', label: 'Maintenance Hub', icon: 'home_repair_service' },
        { id: 'assigned-work-orders', label: 'Assigned Work Orders', icon: 'engineering' },
        { id: 'work-order-details', label: 'Work Order Details', icon: 'assignment' },
        { id: 'preventive-maintenance', label: 'Preventive Calendar', icon: 'event_repeat' },
        { id: 'asset-register', label: 'Asset Register', icon: 'inventory_2' },
        { id: 'spares-inventory', label: 'Spares Inventory & PO', icon: 'layers' },
        {
          id: 'spares-requisitions',
          label: 'Spares Requisitions',
          icon: 'shopping_cart_checkout',
          badge: pendingRequisitionsCount > 0 ? `${pendingRequisitionsCount}` : undefined,
          badgeColor: 'bg-rose-100 text-rose-800'
        }
      ]
    },
    {
      title: 'Security & Access',
      items: [
        { id: 'gate-console', label: 'Gatehouse Console', icon: 'shield_person' },
        { id: 'visitor-qr-verify', label: 'QR Pass Verification', icon: 'qr_code_scanner' },
        { id: 'visitor-revocation', label: 'Pass Revocation & Rules', icon: 'block' },
        { id: 'parcel-hub', label: 'Delivery & Parcel Hub', icon: 'local_shipping' },
        { id: 'residents-directory', label: 'Residents & Units', icon: 'home_work' },
        {
          id: 'incident-reporting',
          label: 'Emergency & SOS Alert',
          icon: 'e911_emergency',
          badge: activeIncidentsCount > 0 ? 'LIVE' : undefined,
          badgeColor: 'bg-red-600 text-white animate-pulse'
        }
      ]
    },
    {
      title: 'Governance',
      items: [{ id: 'settings-roles', label: 'Role Permissions & RBAC', icon: 'tune' }]
    }
  ];

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 z-50 flex-col justify-between overflow-y-auto shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
      <div className="flex flex-col">
        {/* Brand header */}
        <div className="h-16 px-4 flex items-center gap-3 bg-slate-50 border-b border-slate-200">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-xs">
            <span className="material-symbols-outlined text-[20px]">apartment</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-headline font-bold text-slate-900 text-base leading-tight truncate">
              CivicOps
            </span>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Smart Society Platform
            </span>
          </div>
        </div>

        {/* Navigation sections */}
        <nav className="flex flex-col p-2 gap-4">
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col">
              <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-headline">
                {section.title}
              </div>
              <div className="flex flex-col gap-0.5 mt-0.5">
                {section.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left ${
                        isActive
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`material-symbols-outlined text-[18px] shrink-0 ${
                            isActive ? 'text-white' : 'text-slate-500'
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                            isActive ? 'bg-white/20 text-white' : item.badgeColor
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom system status pill */}
      <div className="p-3 bg-slate-50 border-t border-slate-200">
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-slate-700">Hub Online</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">v3.8.2-GA</span>
        </div>
      </div>
    </aside>
  );
};
