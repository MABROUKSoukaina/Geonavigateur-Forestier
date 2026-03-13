import type { BasemapType } from '../types';

export const DEFAULT_CENTER: [number, number] = [33.9, -5.5];
export const DEFAULT_ZOOM = 8;

export const TILE_URLS: Record<BasemapType, { url: string; attribution: string; maxZoom: number }> = {
  'google-sat': {
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '© Google',
    maxZoom: 20,
  },
  'esri-topo': {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, HERE, Garmin, © OpenStreetMap contributors',
    maxZoom: 19,
  },
  'esri-hybrid': {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
  'esri-streets': {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, HERE, Garmin, © OpenStreetMap contributors',
    maxZoom: 19,
  },
};
