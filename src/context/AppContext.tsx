import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  UserRole,
  Complaint,
  WorkOrder,
  Asset,
  SparePart,
  SpareRequisition,
  VisitorPass,
  Parcel,
  IncidentAlert,
  Unit,
  PreventiveSchedule
} from '../types';
import { ApiService, db } from '../services/api';
import { DEMO_USERS } from '../data/initialData';

interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  role: UserRole;
  setRole: (role: UserRole) => void;
  switchRole: (role: UserRole) => void;
  selectedTower: string;
  setSelectedTower: (tower: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;

  complaints: Complaint[];
  workOrders: WorkOrder[];
  assets: Asset[];
  spares: SparePart[];
  requisitions: SpareRequisition[];
  visitorPasses: VisitorPass[];
  parcels: Parcel[];
  incidents: IncidentAlert[];
  units: Unit[];
  preventiveSchedules: PreventiveSchedule[];

  selectedComplaintId: string | null;
  setSelectedComplaintId: (id: string | null) => void;
  selectedWorkOrderId: string | null;
  setSelectedWorkOrderId: (id: string | null) => void;

  isSosModalOpen: boolean;
  setIsSosModalOpen: (open: boolean) => void;
  isPreApproveModalOpen: boolean;
  setIsPreApproveModalOpen: (open: boolean) => void;
  isRoleSwitcherOpen: boolean;
  setIsRoleSwitcherOpen: (open: boolean) => void;
  isFastCheckInOpen: boolean;
  setIsFastCheckInOpen: (open: boolean) => void;

  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;

  refreshData: () => Promise<void>;
  resetDatabase: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>('MANAGEMENT');
  const [currentUser, setCurrentUser] = useState<User>(DEMO_USERS[1]); // Suresh Patel (Management)
  const [selectedTower, setSelectedTower] = useState<string>('All Towers');
  const [activeTab, setActiveTab] = useState<string>('management-overview');

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [spares, setSpares] = useState<SparePart[]>([]);
  const [requisitions, setRequisitions] = useState<SpareRequisition[]>([]);
  const [visitorPasses, setVisitorPasses] = useState<VisitorPass[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [incidents, setIncidents] = useState<IncidentAlert[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [preventiveSchedules, setPreventiveSchedules] = useState<PreventiveSchedule[]>([]);

  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>('cmp-2024-089');
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>('wo-2024-118');

  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [isPreApproveModalOpen, setIsPreApproveModalOpen] = useState(false);
  const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = useState(false);
  const [isFastCheckInOpen, setIsFastCheckInOpen] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const refreshData = async () => {
    try {
      const [
        fetchedComplaints,
        fetchedWorkOrders,
        fetchedAssets,
        fetchedSpares,
        fetchedReqs,
        fetchedPasses,
        fetchedParcels,
        fetchedIncidents,
        fetchedUnits,
        fetchedSchedules
      ] = await Promise.all([
        ApiService.getComplaints(),
        ApiService.getWorkOrders(),
        ApiService.getAssets(),
        ApiService.getSpares(),
        ApiService.getRequisitions(),
        ApiService.getVisitorPasses(),
        ApiService.getParcels(),
        ApiService.getIncidents(),
        ApiService.getUnits(),
        ApiService.getPreventiveSchedules()
      ]);

      setComplaints(fetchedComplaints);
      setWorkOrders(fetchedWorkOrders);
      setAssets(fetchedAssets);
      setSpares(fetchedSpares);
      setRequisitions(fetchedReqs);
      setVisitorPasses(fetchedPasses);
      setParcels(fetchedParcels);
      setIncidents(fetchedIncidents);
      setUnits(fetchedUnits);
      setPreventiveSchedules(fetchedSchedules);
    } catch (e) {
      console.error('Failed to refresh data', e);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const switchRole = (newRole: UserRole) => {
    setRole(newRole);
    const targetUser = DEMO_USERS.find((u) => u.role === newRole) || DEMO_USERS[0];
    setCurrentUser(targetUser);

    // Switch default active tab to best match role perspective
    if (newRole === 'RESIDENT') {
      setActiveTab('resident-home');
    } else if (newRole === 'MAINTENANCE') {
      setActiveTab('assigned-work-orders');
    } else if (newRole === 'SECURITY') {
      setActiveTab('gate-console');
    } else if (newRole === 'MANAGEMENT') {
      setActiveTab('management-overview');
    } else if (newRole === 'ADMIN') {
      setActiveTab('settings-roles');
    }

    showToast(`Switched active profile to ${targetUser.name} (${newRole})`, 'info');
  };

  const resetDatabase = () => {
    db.resetToDefaults();
    refreshData();
    showToast('Platform database reset to initial demo seeds', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        role,
        setRole,
        switchRole,
        selectedTower,
        setSelectedTower,
        activeTab,
        setActiveTab,
        complaints,
        workOrders,
        assets,
        spares,
        requisitions,
        visitorPasses,
        parcels,
        incidents,
        units,
        preventiveSchedules,
        selectedComplaintId,
        setSelectedComplaintId,
        selectedWorkOrderId,
        setSelectedWorkOrderId,
        isSosModalOpen,
        setIsSosModalOpen,
        isPreApproveModalOpen,
        setIsPreApproveModalOpen,
        isRoleSwitcherOpen,
        setIsRoleSwitcherOpen,
        isFastCheckInOpen,
        setIsFastCheckInOpen,
        toast,
        showToast,
        refreshData,
        resetDatabase
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
