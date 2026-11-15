import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AppNotification,
  Asset,
  Complaint,
  IncidentAlert,
  Parcel,
  PreventiveSchedule,
  SparePart,
  SpareRequisition,
  Unit,
  User,
  UserRole,
  VisitorPass,
  WorkOrder
} from '../types';
import { ApiService, getAuthToken, registerUnauthorizedHandler, setAuthToken } from '../services/api';
import { getDefaultTabForRole, isTabAllowedForRole } from '../config/rbac';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
  authChecking: boolean;
  isRoleSelectionPending: boolean;
  setIsRoleSelectionPending: (pending: boolean) => void;
  authorizedRoles: UserRole[];
  setAuthorizedRoles: (roles: UserRole[]) => void;
  role: UserRole;
  setRole: (role: UserRole) => void;
  switchRole: (role: UserRole) => Promise<void>;
  selectAuthorizedRole: (role: UserRole) => Promise<void>;
  login: (email: string, password: string) => Promise<any>;
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
  notifications: AppNotification[];
  unreadNotificationsCount: number;

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

  isLoadingData: boolean;
  dataError: string | null;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;

  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(() => Boolean(getAuthToken()));
  const [authorizedRoles, setAuthorizedRoles] = useState<UserRole[]>([]);
  const [isRoleSelectionPending, setIsRoleSelectionPending] = useState<boolean>(false);
  const [role, setRole] = useState<UserRole>('RESIDENT');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [selectedTower, setSelectedTower] = useState<string>('All Towers');
  const [activeTab, setActiveTabState] = useState<string>('resident-home');

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
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);

  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [isPreApproveModalOpen, setIsPreApproveModalOpen] = useState(false);
  const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = useState(false);
  const [isFastCheckInOpen, setIsFastCheckInOpen] = useState(false);

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  const setActiveTab = useCallback(
    (tab: string) => {
      if (isTabAllowedForRole(role, tab)) {
        setActiveTabState(tab);
      } else {
        setActiveTabState(getDefaultTabForRole(role));
        showToast(`Access to "${tab}" is not permitted for role ${role}.`, 'error');
      }
    },
    [role, showToast]
  );

  const clearSessionState = useCallback(() => {
    setAuthToken(null);
    sessionStorage.removeItem('civicops_user');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setIsRoleSelectionPending(false);
    setAuthorizedRoles([]);
    setComplaints([]);
    setWorkOrders([]);
    setAssets([]);
    setSpares([]);
    setRequisitions([]);
    setVisitorPasses([]);
    setParcels([]);
    setIncidents([]);
    setUnits([]);
    setPreventiveSchedules([]);
    setNotifications([]);
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      clearSessionState();
      showToast('Your session expired or was revoked. Please sign in again.', 'error');
    });
    return () => registerUnauthorizedHandler(null);
  }, [clearSessionState, showToast]);

  // Verify existing JWT against /auth/me on application startup
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setAuthChecking(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const verifiedUser = await ApiService.getCurrentUser();
        if (cancelled) return;
        const activeRole = verifiedUser.activeRole || verifiedUser.role;
        const roles = verifiedUser.authorizedRoles && verifiedUser.authorizedRoles.length > 0
          ? verifiedUser.authorizedRoles
          : [activeRole];
        setCurrentUser(verifiedUser);
        sessionStorage.setItem('civicops_user', JSON.stringify(verifiedUser));
        setAuthorizedRoles(roles);
        setRole(activeRole);
        setActiveTabState(getDefaultTabForRole(activeRole));
        setIsAuthenticated(true);
      } catch {
        if (!cancelled) {
          clearSessionState();
        }
      } finally {
        if (!cancelled) {
          setAuthChecking(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clearSessionState]);

  const refreshData = useCallback(async () => {
    if (!isAuthenticated || !currentUser) return;
    setIsLoadingData(true);
    setDataError(null);

    const activeRole = role;
    const canSeeMaintenance = activeRole === 'MAINTENANCE' || activeRole === 'MANAGEMENT' || activeRole === 'ADMIN';
    const canSeeVisitors = activeRole === 'RESIDENT' || activeRole === 'SECURITY' || activeRole === 'MANAGEMENT' || activeRole === 'ADMIN';
    const canSeeParcels = activeRole === 'RESIDENT' || activeRole === 'SECURITY' || activeRole === 'MANAGEMENT' || activeRole === 'ADMIN';
    const canSeeUnits = true; // Backend scopes RESIDENT to their own unit
    const canSeeComplaints = activeRole !== 'SECURITY';

    try {
      const [
        complaintsRes,
        workOrdersRes,
        assetsRes,
        sparesRes,
        reqsRes,
        passesRes,
        parcelsRes,
        incidentsRes,
        unitsRes,
        schedulesRes,
        notifsRes
      ] = await Promise.allSettled([
        canSeeComplaints ? ApiService.getComplaints() : Promise.resolve([]),
        canSeeMaintenance ? ApiService.getWorkOrders() : Promise.resolve([]),
        canSeeMaintenance ? ApiService.getAssets() : Promise.resolve([]),
        canSeeMaintenance ? ApiService.getSpares() : Promise.resolve([]),
        canSeeMaintenance ? ApiService.getRequisitions() : Promise.resolve([]),
        canSeeVisitors ? ApiService.getVisitorPasses() : Promise.resolve([]),
        canSeeParcels ? ApiService.getParcels() : Promise.resolve([]),
        ApiService.getIncidents(),
        canSeeUnits ? ApiService.getUnits() : Promise.resolve([]),
        canSeeMaintenance ? ApiService.getPreventiveSchedules() : Promise.resolve([]),
        ApiService.getNotifications()
      ]);

      if (complaintsRes.status === 'fulfilled') {
        setComplaints(complaintsRes.value);
        setSelectedComplaintId((prev) =>
          prev && complaintsRes.value.some((c) => c.id === prev) ? prev : complaintsRes.value[0]?.id || null
        );
      }
      if (workOrdersRes.status === 'fulfilled') {
        setWorkOrders(workOrdersRes.value);
        setSelectedWorkOrderId((prev) =>
          prev && workOrdersRes.value.some((w) => w.id === prev) ? prev : workOrdersRes.value[0]?.id || null
        );
      }
      if (assetsRes.status === 'fulfilled') setAssets(assetsRes.value);
      if (sparesRes.status === 'fulfilled') setSpares(sparesRes.value);
      if (reqsRes.status === 'fulfilled') setRequisitions(reqsRes.value);
      if (passesRes.status === 'fulfilled') setVisitorPasses(passesRes.value);
      if (parcelsRes.status === 'fulfilled') setParcels(parcelsRes.value);
      if (incidentsRes.status === 'fulfilled') setIncidents(incidentsRes.value);
      if (unitsRes.status === 'fulfilled') setUnits(unitsRes.value);
      if (schedulesRes.status === 'fulfilled') setPreventiveSchedules(schedulesRes.value);
      if (notifsRes.status === 'fulfilled') setNotifications(notifsRes.value);

      const firstFailure = [
        complaintsRes,
        workOrdersRes,
        assetsRes,
        sparesRes,
        reqsRes,
        passesRes,
        parcelsRes,
        incidentsRes,
        unitsRes,
        schedulesRes
      ].find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;

      if (firstFailure) {
        setDataError(firstFailure.reason?.message || 'Some data feeds failed to load.');
      }
    } catch (err: any) {
      setDataError(err.message || 'Failed to synchronize data with backend.');
    } finally {
      setIsLoadingData(false);
    }
  }, [isAuthenticated, currentUser, role]);

  useEffect(() => {
    if (isAuthenticated && !isRoleSelectionPending) {
      refreshData();
    }
  }, [isAuthenticated, isRoleSelectionPending, role, refreshData]);

  const login = async (email: string, password: string) => {
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
      setActiveTabState(getDefaultTabForRole(assignedRole));
    }
    return res;
  };

  const selectAuthorizedRole = async (selectedRole: UserRole) => {
    const res = await ApiService.switchRole(selectedRole);
    setCurrentUser(res.user);
    sessionStorage.setItem('civicops_user', JSON.stringify(res.user));
    setRole(selectedRole);
    setIsRoleSelectionPending(false);
    setActiveTabState(getDefaultTabForRole(selectedRole));
    showToast(`Active perspective set to ${selectedRole}`, 'info');
  };

  const switchRole = async (newRole: UserRole) => {
    const res = await ApiService.switchRole(newRole);
    setCurrentUser(res.user);
    sessionStorage.setItem('civicops_user', JSON.stringify(res.user));
    setRole(newRole);
    setActiveTabState(getDefaultTabForRole(newRole));
    showToast(`Active operating role switched to ${newRole}`, 'info');
  };

  const logout = async () => {
    try {
      await ApiService.logout();
    } finally {
      clearSessionState();
      showToast('Signed out of CivicOps session.', 'info');
    }
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isAuthenticated,
        setIsAuthenticated,
        authChecking,
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
        notifications,
        unreadNotificationsCount,
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
        isLoadingData,
        dataError,
        toast,
        showToast,
        refreshData
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
