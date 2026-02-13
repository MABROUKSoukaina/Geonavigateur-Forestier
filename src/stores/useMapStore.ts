import { create } from 'zustand';
import type { BasemapType, ClickMode, GeoJSONLayer } from '../types';

interface MapState {
  center: [number, number];
  zoom: number;
  basemap: BasemapType;
  customLayers: GeoJSONLayer[];
  clickMode: ClickMode;
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setBasemap: (basemap: BasemapType) => void;
  setClickMode: (mode: ClickMode) => void;
  addCustomLayer: (layer: GeoJSONLayer) => void;
  removeCustomLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
}

export const useMapStore = create<MapState>((set) => ({
  center: [33.9, -5.5],
  zoom: 8,
  basemap: 'google-hybrid',
  customLayers: [],
  clickMode: 'none',
  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setBasemap: (basemap) => set({ basemap }),
  setClickMode: (mode) => set({ clickMode: mode }),
  addCustomLayer: (layer) => set((s) => ({ customLayers: [...s.customLayers, layer] })),
  removeCustomLayer: (id) => set((s) => ({ customLayers: s.customLayers.filter((l) => l.id !== id) })),
  toggleLayerVisibility: (id) =>
    set((s) => ({
      customLayers: s.customLayers.map((l) => l.id === id ? { ...l, visible: !l.visible } : l),
    })),
}));
