import { create } from 'zustand';
import type { NavPoint, RouteResult, MultiPointResult, TransportMode } from '../types';

interface NavigationState {
  startPoint: NavPoint | null;
  endPoint: NavPoint | null;
  transportMode: TransportMode;
  route: RouteResult | null;
  multiPointRoute: MultiPointResult | null;
  multiPointPlacettes: string[];
  multiPointStartMode: 'gps' | 'first';
  multiPointTransport: TransportMode;
  isCalculating: boolean;
  navSubTab: 'simple' | 'multi';
  followGps: boolean;
  setFollowGps: (v: boolean) => void;

  setStartPoint: (p: NavPoint | null) => void;
  setEndPoint: (p: NavPoint | null) => void;
  setTransportMode: (m: TransportMode) => void;
  setRoute: (r: RouteResult | null) => void;
  setMultiPointRoute: (r: MultiPointResult | null) => void;
  addMultiPointPlacette: (id: string) => void;
  removeMultiPointPlacette: (id: string) => void;
  clearMultiPointPlacettes: () => void;
  setMultiPointStartMode: (m: 'gps' | 'first') => void;
  setMultiPointTransport: (m: TransportMode) => void;
  setIsCalculating: (v: boolean) => void;
  setNavSubTab: (t: 'simple' | 'multi') => void;
  clearRoute: () => void;
  clearAll: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  startPoint: null,
  endPoint: null,
  transportMode: 'car',
  route: null,
  multiPointRoute: null,
  multiPointPlacettes: [],
  multiPointStartMode: 'gps',
  multiPointTransport: 'walk',
  isCalculating: false,
  navSubTab: 'simple',
  followGps: false,
  setFollowGps: (followGps) => set({ followGps }),

  setStartPoint: (startPoint) => set({ startPoint }),
  setEndPoint: (endPoint) => set({ endPoint }),
  setTransportMode: (transportMode) => set({ transportMode }),
  setRoute: (route) => set({ route }),
  setMultiPointRoute: (multiPointRoute) => set({ multiPointRoute }),
  addMultiPointPlacette: (id) =>
    set((s) => s.multiPointPlacettes.includes(id) ? s : { multiPointPlacettes: [...s.multiPointPlacettes, id] }),
  removeMultiPointPlacette: (id) =>
    set((s) => ({ multiPointPlacettes: s.multiPointPlacettes.filter((x) => x !== id) })),
  clearMultiPointPlacettes: () => set({ multiPointPlacettes: [], multiPointRoute: null }),
  setMultiPointStartMode: (multiPointStartMode) => set({ multiPointStartMode }),
  setMultiPointTransport: (multiPointTransport) => set({ multiPointTransport }),
  setIsCalculating: (isCalculating) => set({ isCalculating }),
  setNavSubTab: (navSubTab) => set({ navSubTab }),
  clearRoute: () => set({ route: null, startPoint: null, endPoint: null }),
  clearAll: () => set({ startPoint: null, endPoint: null, route: null, multiPointRoute: null, multiPointPlacettes: [] }),
}));
