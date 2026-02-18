import { create } from 'zustand';
import type { RoutingMode, TabType } from '../types';

interface AppState {
  routingMode: RoutingMode;
  activeTab: TabType;
  showRoadRoutes: boolean;
  showRoadPistes: boolean;
  showRoadVoies: boolean;
  showPlacettes: boolean;
  showReperes: boolean;
  showGpsMarker: boolean;
  showRoute: boolean;
  showLastMile: boolean;
  sidebarOpen: boolean;
  clusteringEnabled: boolean;
  setRoutingMode: (mode: RoutingMode) => void;
  setActiveTab: (tab: TabType) => void;
  toggleRoadRoutes: () => void;
  toggleRoadPistes: () => void;
  toggleRoadVoies: () => void;
  togglePlacettes: () => void;
  toggleReperes: () => void;
  toggleGpsMarker: () => void;
  toggleRoute: () => void;
  toggleLastMile: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (v: boolean) => void;
  toggleClustering: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  routingMode: 'offline',
  activeTab: 'navigation',
  showRoadRoutes: true,
  showRoadPistes: true,
  showRoadVoies: true,
  showPlacettes: true,
  showReperes: true,
  showGpsMarker: true,
  showRoute: true,
  showLastMile: true,
  sidebarOpen: true,
  clusteringEnabled: true,
  setRoutingMode: (mode) => set({ routingMode: mode }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleRoadRoutes: () => set((s) => ({ showRoadRoutes: !s.showRoadRoutes })),
  toggleRoadPistes: () => set((s) => ({ showRoadPistes: !s.showRoadPistes })),
  toggleRoadVoies: () => set((s) => ({ showRoadVoies: !s.showRoadVoies })),
  togglePlacettes: () => set((s) => ({ showPlacettes: !s.showPlacettes })),
  toggleReperes: () => set((s) => ({ showReperes: !s.showReperes })),
  toggleGpsMarker: () => set((s) => ({ showGpsMarker: !s.showGpsMarker })),
  toggleRoute: () => set((s) => ({ showRoute: !s.showRoute })),
  toggleLastMile: () => set((s) => ({ showLastMile: !s.showLastMile })),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  toggleClustering: () => set((s) => ({ clusteringEnabled: !s.clusteringEnabled })),
}));
