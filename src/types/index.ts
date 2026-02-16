export interface Placette {
  id: string;
  code: string;
  lat: number;
  lng: number;
  repere?: Repere;
  pente?: number;
  azimut?: number;
  distance?: number;
  altitude?: number;
  exposition?: number;
  strate?: string;
  description?: string;
}

export interface Repere {
  lat: number;
  lng: number;
  description?: string;
}

export interface NavPoint {
  type: 'gps' | 'placette' | 'repere' | 'map';
  lat: number;
  lng: number;
  label: string;
  id?: string;
}

export interface RouteResult {
  coordinates: [number, number][];
  distance: number;
  duration: number;
  instructions?: string[];
  lastMileStart?: [number, number][];  // straight line from actual start to road
  lastMileEnd?: [number, number][];    // straight line from road to actual destination
}

export interface MultiPointResult {
  orderedPlacettes: string[];
  segments: RouteResult[];
  totalDistance: number;
  totalDuration: number;
  routeCoordinates: [number, number][];
}

export type TransportMode = 'car' | 'walk' | 'bike' | 'fly';
export type RoutingMode = 'offline' | 'online';
export type BasemapType = 'google-hybrid' | 'google-sat' | 'google-sat-nolabel' | 'cartodb-dark' | 'osm' | 'topo';
export type TabType = 'navigation' | 'placettes' | 'data' | 'layers';
export type ClickMode = 'none' | 'setStart' | 'setEnd' | 'addMultiPoint';

export interface GeoJSONLayer {
  id: string;
  name: string;
  data: GeoJSON.GeoJsonObject;
  color: string;
  visible: boolean;
}

export interface ColumnMapping {
  code: string;
  x: string;
  y: string;
  xRepere?: string;
  yRepere?: string;
  pente?: string;
  azimut?: string;
  altitude?: string;
  exposition?: string;
  strate?: string;
  distance?: string;
  repereDesc?: string;
}

export const TRANSPORT_SPEEDS: Record<TransportMode, number> = {
  car: 40, walk: 4, bike: 12, fly: 0,
};

export const TRANSPORT_LABELS: Record<TransportMode, string> = {
  car: 'Voiture', walk: 'À pied', bike: 'Vélo', fly: "Vol d'oiseau",
};
