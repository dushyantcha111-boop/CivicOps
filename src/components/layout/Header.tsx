import React from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';

export const Header: React.FC = () => {
  const {
    currentUser,
    role,
    selectedTower,
    setSelectedTower,
    setIsSosModalOpen,
    setIsRoleSwitcherOpen,
    incidents,
    setActiveTab,
    resetDatabase
  } = useApp();

  const activeIncidents = incidents.filter((i) => i.status === 'ACTIVE');

  const getRoleBadgeColor = (r: UserRole) => {
    switch (r) {
      case 'RESIDENT':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'MANAGEMENT':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'MAINTENANCE':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'SECURITY':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'ADMIN':
        return 'bg-rose-100 text-rose-800 border-rose-200';
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 lg:left-64 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 z-40 flex items-center justify-between px-4 lg:px-6 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      {/* Left: Society info & Tower Switcher */}
      <div className="flex items-center gap-3">
        {/* Mobile menu logo for small screens */}
        <div className="lg:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-[18px]">apartment</span>
          </div>
          <span className="font-headline font-bold text-slate-900 text-sm">CivicOps</span>
        </div>

        {/* Desktop Society chip */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/80 border border-slate-200/60">
          <span className="material-symbols-outlined text-primary text-[20px]">domain</span>
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 leading-tight">Green Valley Residency</span>
            <span className="text-[10px] text-slate-500 font-medium">480 Units • Tier-1 Society</span>
          </div>
        </div>

        {/* Tower Selector Buttons */}
        <div className="hidden md:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
          {['All Towers', 'Tower A', 'Tower B', 'Tower C', 'Tower D'].map((tower) => (
            <button
              key={tower}
              onClick={() => setSelectedTower(tower)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                selectedTower === tower
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tower}
            </button>
          ))}
        </div>
      </div>

      {/* Right Action Cluster */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Shift indicator */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
          <span className="material-symbols-outlined text-slate-500 text-[16px]">schedule</span>
          <span>Morning Shift (06:00 - 14:00)</span>
        </div>

        {/* Active Alert Flag */}
        {activeIncidents.length > 0 && (
          <button
            onClick={() => setActiveTab('incident-reporting')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold animate-pulse border border-red-200 hover:bg-red-200 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">warning</span>
            <span>{activeIncidents.length} Gate Alert{activeIncidents.length > 1 ? 's' : ''}</span>
          </button>
        )}

        {/* Emergency SOS Button */}
        <button
          onClick={() => setIsSosModalOpen(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700 shadow-sm active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">e911_emergency</span>
          <span className="hidden sm:inline">EMERGENCY SOS</span>
          <span className="sm:hidden">SOS</span>
        </button>

        {/* 1-Click Role Switcher Pill */}
        <button
          onClick={() => setIsRoleSwitcherOpen(true)}
          title="Click to Switch Roles (Resident, Management, Maintenance, Security, Admin)"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all active:scale-95 shadow-xs ${getRoleBadgeColor(
            role
          )}`}
        >
          <span className="material-symbols-outlined text-[15px]">swap_horiz</span>
          <span className="uppercase tracking-wider">{role}</span>
        </button>

        {/* User Avatar & Info */}
        <div
          onClick={() => setIsRoleSwitcherOpen(true)}
          className="flex items-center gap-2 pl-2 border-l border-slate-200 cursor-pointer group"
        >
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-800 leading-tight group-hover:text-primary transition-colors">
              {currentUser.name}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              {currentUser.unitNumber ? `Flat ${currentUser.unitNumber}` : currentUser.designation}
            </span>
          </div>
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.name}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-200 group-hover:ring-primary transition-all"
          />
        </div>

        {/* Reset Database Tool for Reviewers */}
        <button
          onClick={resetDatabase}
          title="Reset demo data to initial seeds"
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">restart_alt</span>
        </button>
      </div>
    </header>
  );
};
