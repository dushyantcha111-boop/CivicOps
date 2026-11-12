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
import { ApiService, db, getAuthToken, setAuthToken } from '../services/api';
import { DEMO_USERS } from '../data/initialData';

interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
  isRoleSelectionPending: boolean;
  setIsRoleSelectionPending: (pending: boolean) => void;
  authorizedRoles: UserRole[];
  setAuthorizedRoles: (roles: UserRole[]) => void;
  role: UserRole;
  setRole: (role: UserRole) => void;
  switchRole: (role: UserRole) => Promise<void>;
  selectAuthorizedRole: (role: UserRole) => Promise<void>;
  login: (email: string, password?: string) => Promise<any>;
  logout: () => Promise<void>;

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
  // Session authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('civicops_token') !== null;
  });

  const [authorizedRoles, setAuthorizedRoles] = useState<UserRole[]>(() => {
    try {
      const stored = sessionStorage.getItem('civicops_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.authorizedRoles && u.authorizedRoles.length > 0) return u.authorizedRoles;
        if (u.role) return [u.role];
      }
    } catch (e) {
      // ignore
    }
    return ['MANAGEMENT'];
  });

  const [isRoleSelectionPending, setIsRoleSelectionPending] = useState<boolean>(false);

  const [role, setRole] = useState<UserRole>(() => {
    try {
      const stored = sessionStorage.getItem('civicops_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.role) return u.role;
      }
    } catch (e) {
      // ignore
    }
    return 'MANAGEMENT';
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const stored = sessionStorage.getItem('civicops_user');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      // ignore
    }
    return DEMO_USERS[1]; // Fallback if needed
  });

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

  const setDefaultTabForRole = (newRole: UserRole) => {
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
    if (isAuthenticated) {
      refreshData();
    }
  }, [isAuthenticated]);

  const login = async (email: string, password?: string) => {
    const res = await ApiService.login(email, password);
    setCurrentUser(res.user);
    sessionStorage.setItem('civicops_user', JSON.stringify(res.user));
    setAuthorizedRoles(res.authorizedRoles);
    setIsAuthenticated(true);

    if (res.requiresRoleSelection && res.authorizedRoles && res.authorizedRoles.length > 1) {
      setIsRoleSelectionPending(true);
    } else {
      setIsRoleSelectionPending(false);
      const assignedRole = res.authorizedRoles?.[0] || res.user.role || 'RESIDENT';
      setRole(assignedRole);
      setDefaultTabForRole(assignedRole);
    }
    return res;
  };

  const selectAuthorizedRole = async (selectedRole: UserRole) => {
    setRole(selectedRole);
    setIsRoleSelectionPending(false);
    try {
      await ApiService.switchRole(selectedRole);
    } catch (e) {
      // ignore
    }
    setDefaultTabForRole(selectedRole);
    showToast(`Active perspective switched to ${selectedRole}`, 'info');
  };

  const switchRole = async (newRole: UserRole) => {
    setRole(newRole);
    try {
      await ApiService.switchRole(newRole);
    } catch (e) {
      // ignore
    }
    setDefaultTabForRole(newRole);
    showToast(`Active operating role switched to ${newRole}`, 'info');
  };

  const logout = async () => {
    try {
      await ApiService.logout();
    } catch (e) {
      // ignore
    }
    sessionStorage.removeItem('civicops_token');
    sessionStorage.removeItem('civicops_user');
    setIsAuthenticated(false);
    setIsRoleSelectionPending(false);
    setAuthorizedRoles([]);
    showToast('Signed out of CivicOps session.', 'info');
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
        isAuthenticated,
        setIsAuthenticated,
        isRoleSelectionPending,
        setIsRoleSelectionPending,
        authorizedRoles,
        setAuthorizedRoles,
        role,
        setRole,
        switchRole,
        selectAuthorizedRole,
        login,
        logout,
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
