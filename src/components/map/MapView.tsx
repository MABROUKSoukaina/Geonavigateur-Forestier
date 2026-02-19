import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useMapStore } from '../../stores/useMapStore';
import { useDataStore } from '../../stores/useDataStore';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useAppStore } from '../../stores/useAppStore';
import { TILE_URLS, DEFAULT_CENTER, DEFAULT_ZOOM } from '../../utils/constants';
import { getGpsPosition } from '../../utils/geo';
import type { NavPoint, Placette, BasemapType } from '../../types';
import { TRANSPORT_SPEEDS } from '../../types';

// ===== MARKER ICONS =====
const icons = {
  placette: L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:18px;height:18px;background:linear-gradient(135deg,#58f572,#3ed957);border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
    </div>`,
    iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -9],
  }),
  repere: L.divIcon({
    className: 'custom-marker',
    html: `<svg width="20" height="28" viewBox="0 0 20 28" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">
      <!-- stake -->
      <line x1="5" y1="4" x2="5" y2="28" stroke="#1a1a1a" stroke-width="2.5" stroke-linecap="round"/>
      <!-- flag -->
      <polygon points="5,4 18,8 5,14" fill="#ffd93d" stroke="#c9a800" stroke-width="1"/>
    </svg>`,
    iconSize: [20, 28], iconAnchor: [5, 28], popupAnchor: [7, -28],
  }),
  selected: L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:22px;height:22px;background:linear-gradient(135deg,#05fff4,#00e0d8);border:2px solid white;border-radius:50%;box-shadow:0 0 10px rgba(5,255,244,0.7),0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
    </div>`,
    iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -11],
  }),
  start: L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:28px;height:28px;background:linear-gradient(135deg,#4285f4,#6fa3f7);border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;">D</div>`,
    iconSize: [28, 28], iconAnchor: [14, 14],
  }),
  end: L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:28px;height:28px;background:linear-gradient(135deg,#ff6b6b,#ff8e8e);border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;">A</div>`,
    iconSize: [28, 28], iconAnchor: [14, 14],
  }),
  gps: L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:20px;height:20px;background:#4285f4;border:3px solid white;border-radius:50%;box-shadow:0 0 0 8px rgba(66,133,244,0.3),0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20], iconAnchor: [10, 10],
  }),
};

// Numbered marker for multi-point route order
function makeNumberedIcon(num: number) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:32px;height:32px;background:linear-gradient(135deg,#f59e0b,#fbbf24);border:3px solid white;border-radius:50%;box-shadow:0 0 12px rgba(245,158,11,0.5),0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;font-family:'Space Mono',monospace;">${num}</div>`,
    iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16],
  });
}

// ===== POPUP BUILDERS =====
function buildPlacettePopup(p: Placette): string {
  return `
    <div class="popup-content">
      <div class="popup-header">
        <div class="popup-icon placette">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        <div>
          <div class="popup-title">Placette ${p.code}</div>
          <div class="popup-subtitle">${p.strate || 'Non classée'}</div>
        </div>
      </div>
      <div class="popup-grid">
        <div class="popup-item"><div class="popup-item-label">X Placette</div><div class="popup-item-value">${p.lng.toFixed(6)}</div></div>
        <div class="popup-item"><div class="popup-item-label">Y Placette</div><div class="popup-item-value">${p.lat.toFixed(6)}</div></div>
        <div class="popup-item"><div class="popup-item-label">Altitude</div><div class="popup-item-value">${p.altitude ?? '--'} m</div></div>
        <div class="popup-item"><div class="popup-item-label">Exposition</div><div class="popup-item-value">${p.exposition ?? '--'}°</div></div>
        <div class="popup-item"><div class="popup-item-label">Pente</div><div class="popup-item-value">${p.pente ?? '--'}°</div></div>
        <div class="popup-item"><div class="popup-item-label">Distance au repère</div><div class="popup-item-value">${p.distance ?? '--'} m</div></div>
      </div>
      <div class="popup-actions">
        <button class="popup-btn" onclick="window.__geonav_navigate('${p.id}')">Y aller</button>
        <button class="popup-btn" onclick="window.__geonav_navigateRepere('${p.id}')">Aller au repère</button>
        <button class="popup-btn select-btn" onclick="window.__geonav_select('${p.id}')">Sélectionner</button>
        <button class="popup-btn parcours-btn" onclick="window.__geonav_addParcours('${p.id}')">+ Parcours</button>
      </div>
    </div>`;
}

function buildReperePopup(p: Placette): string {
  return `
    <div class="popup-content">
      <div class="popup-header">
        <div class="popup-icon repere">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#333"><circle cx="12" cy="12" r="6"/></svg>
        </div>
        <div>
          <div class="popup-title">Repère - ${p.code}</div>
          <div class="popup-subtitle">${p.repere?.description || 'Point de repère'}</div>
        </div>
      </div>
      <div class="popup-grid">
        <div class="popup-item"><div class="popup-item-label">X Repère</div><div class="popup-item-value">${p.repere?.lng.toFixed(6) ?? '--'}</div></div>
        <div class="popup-item"><div class="popup-item-label">Y Repère</div><div class="popup-item-value">${p.repere?.lat.toFixed(6) ?? '--'}</div></div>
        <div class="popup-item"><div class="popup-item-label">Azimut repère</div><div class="popup-item-value">${p.azimut ?? '--'}°</div></div>
        <div class="popup-item"><div class="popup-item-label">Distance à la placette</div><div class="popup-item-value">${p.distance ?? '--'} m</div></div>
      </div>
      <div class="popup-actions" style="display:flex;flex-direction:row;flex-wrap:wrap;gap:6px;">
        <button class="popup-btn" style="flex:1;min-width:0;font-size:11px;padding:6px 4px;" onclick="window.__geonav_navigate('${p.id}')">Aller à la placette</button>
        <button class="popup-btn" style="flex:1;min-width:0;font-size:11px;padding:6px 4px;" onclick="window.__geonav_navigateRepere('${p.id}')">Y aller (repère)</button>
        <button class="popup-btn parcours-btn" style="flex:1;min-width:0;font-size:11px;padding:6px 4px;" onclick="window.__geonav_addParcours('${p.id}')">+ Parcours</button>
      </div>
    </div>`;
}

// ===== MAP EVENT HANDLERS =====
function MapClickHandler() {
  const clickMode = useMapStore((s) => s.clickMode);
  const setClickMode = useMapStore((s) => s.setClickMode);
  const setStartPoint = useNavigationStore((s) => s.setStartPoint);
  const setEndPoint = useNavigationStore((s) => s.setEndPoint);
  const addMultiPointPlacette = useNavigationStore((s) => s.addMultiPointPlacette);
  const placettes = useDataStore((s) => s.placettes);

  useMapEvents({
    click(e) {
      if ((window as any).__geonav_measuring) return;
      const point: NavPoint = {
        type: 'map', lat: e.latlng.lat, lng: e.latlng.lng,
        label: `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`,
      };
      if (clickMode === 'setStart') { setStartPoint(point); setClickMode('none'); }
      else if (clickMode === 'setEnd') { setEndPoint(point); setClickMode('none'); }
      else if (clickMode === 'addMultiPoint') {
        let minDist = Infinity, nearest = null;
        for (const p of placettes) {
          const d = Math.hypot(p.lat - e.latlng.lat, p.lng - e.latlng.lng);
          if (d < minDist) { minDist = d; nearest = p; }
        }
        if (nearest && minDist < 0.05) addMultiPointPlacette(nearest.id);
      }
    },
  });
  return null;
}

function MeasureHandler({ onPoint }: { onPoint: (pt: [number, number]) => void }) {
  useMapEvents({ click(e) { onPoint([e.latlng.lat, e.latlng.lng]); } });
  return null;
}

function CoordinatesTracker({ onMove }: { onMove: (coords: [number, number] | null) => void }) {
  useMapEvents({
    mousemove(e) { onMove([e.latlng.lat, e.latlng.lng]); },
    mouseout()  { onMove(null); },
  });
  return null;
}

function fmtDist(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`;
}
function calcTotalDist(pts: [number, number][]): number {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += L.latLng(pts[i - 1]).distanceTo(L.latLng(pts[i]));
  return d;
}

// ===== CLUSTER ICON =====
function makeClusterIcon(count: number) {
  const size = count < 10 ? 36 : count < 100 ? 44 : 52;
  const fs = count < 10 ? 14 : 12;
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;background:linear-gradient(135deg,#58f572,#3ed957);border:2.5px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.35),0 0 0 4px rgba(88,245,114,0.25);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:${fs}px;font-family:'Space Mono',monospace;">${count}</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// ===== CLUSTER LAYER (no external library) =====
interface ClusterGroup { lat: number; lng: number; ids: string[]; }

function ClusterLayer({
  placettes,
  getIconFn,
  onClusteredIds,
}: {
  placettes: Placette[];
  getIconFn: (id: string) => L.DivIcon | L.Icon;
  onClusteredIds?: (ids: Set<string>) => void;
}) {
  const map = useMap();
  const [groups, setGroups] = useState<ClusterGroup[]>([]);

  const compute = useCallback(() => {
    const RADIUS = 60; // pixels
    const pts = placettes.map((p) => ({
      id: p.id, lat: p.lat, lng: p.lng,
      px: map.latLngToLayerPoint([p.lat, p.lng]),
    }));
    const used = new Set<string>();
    const result: ClusterGroup[] = [];
    for (const p of pts) {
      if (used.has(p.id)) continue;
      const members = [p];
      used.add(p.id);
      for (const q of pts) {
        if (used.has(q.id)) continue;
        if (p.px.distanceTo(q.px) < RADIUS) { members.push(q); used.add(q.id); }
      }
      result.push({
        lat: members.reduce((s, m) => s + m.lat, 0) / members.length,
        lng: members.reduce((s, m) => s + m.lng, 0) / members.length,
        ids: members.map((m) => m.id),
      });
    }
    setGroups(result);
    // Notify parent which placette IDs are swallowed into a multi-member cluster
    if (onClusteredIds) {
      const clustered = new Set<string>();
      result.filter((g) => g.ids.length > 1).forEach((g) => g.ids.forEach((id) => clustered.add(id)));
      onClusteredIds(clustered);
    }
  }, [placettes, map, onClusteredIds]);

  useEffect(() => {
    compute();
    map.on('zoomend moveend', compute);
    return () => { map.off('zoomend moveend', compute); };
  }, [compute, map]);

  return (
    <>
      {groups.map((g, i) => {
        if (g.ids.length > 1) {
          return (
            <Marker
              key={`cl-${i}`}
              position={[g.lat, g.lng]}
              icon={makeClusterIcon(g.ids.length)}
              eventHandlers={{
                click: () => {
                  const bounds = L.latLngBounds(
                    g.ids.map((id) => { const p = placettes.find((x) => x.id === id)!; return [p.lat, p.lng] as [number, number]; })
                  );
                  map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
                },
              }}
            />
          );
        }
        const p = placettes.find((x) => x.id === g.ids[0])!;
        if (!p) return null;
        return (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={getIconFn(p.id)}>
            <Popup maxWidth={320} minWidth={260}>
              <div dangerouslySetInnerHTML={{ __html: buildPlacettePopup(p) }} />
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

// ===== GPS FOLLOW HANDLER =====
function GpsFollowHandler({ userPos }: { userPos: [number, number] | null }) {
  const map = useMap();
  const followGps = useNavigationStore((s) => s.followGps);
  useEffect(() => {
    if (followGps && userPos) {
      map.setView(userPos, Math.max(map.getZoom(), 15), { animate: true, duration: 0.5 } as any);
    }
  }, [userPos, followGps, map]);
  return null;
}

function MapSync() {
  const map = useMap();
  const center = useMapStore((s) => s.center);
  const zoom = useMapStore((s) => s.zoom);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const prev = useRef({ center, zoom });

  useEffect(() => {
    if (center !== prev.current.center || zoom !== prev.current.zoom) {
      map.setView(center, zoom);
      prev.current = { center, zoom };
    }
  }, [center, zoom, map]);

  // Invalidate Leaflet size after panel transition ends (300ms)
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize({ pan: false }), 320);
    return () => clearTimeout(t);
  }, [sidebarOpen, map]);

  return null;
}

function RouteFitBounds() {
  const map = useMap();
  const route = useNavigationStore((s) => s.route);
  const multiPointRoute = useNavigationStore((s) => s.multiPointRoute);

  useEffect(() => {
    const coords = route?.coordinates;
    if (coords && coords.length >= 2) {
      const bounds = L.latLngBounds(coords.map(([lat, lng]) => L.latLng(lat, lng)));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [route, map]);

  useEffect(() => {
    const coords = multiPointRoute?.routeCoordinates;
    if (coords && coords.length >= 2) {
      const bounds = L.latLngBounds(coords.map(([lat, lng]) => L.latLng(lat, lng)));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [multiPointRoute, map]);

  return null;
}

function FitToPlacettesHandler() {
  const map = useMap();
  useEffect(() => {
    (window as any).__geonav_fitToPlacettes = () => {
      const placettes = useDataStore.getState().placettes.filter(
        (p) => !isNaN(p.lat) && !isNaN(p.lng)
      );
      if (placettes.length > 0) {
        const bounds = L.latLngBounds(placettes.map((p) => [p.lat, p.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    };
  }, [map]);
  return null;
}

// ===== SVG Eye icons =====
const EyeOpen = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const EyeClosed = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;

// ===== MAP LEGEND OVERLAY =====
function MapLegend({ customLayers }: { customLayers: { id: string; name: string; color: string; visible: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const showPlacettes = useAppStore((s) => s.showPlacettes);
  const showReperes = useAppStore((s) => s.showReperes);
  const showGpsMarker = useAppStore((s) => s.showGpsMarker);
  const showRoute = useAppStore((s) => s.showRoute);
  const showLastMile = useAppStore((s) => s.showLastMile);
  const showRoadRoutes = useAppStore((s) => s.showRoadRoutes);
  const showRoadPistes = useAppStore((s) => s.showRoadPistes);
  const showRoadVoies = useAppStore((s) => s.showRoadVoies);
  const togglePlacettes = useAppStore((s) => s.togglePlacettes);
  const toggleReperes = useAppStore((s) => s.toggleReperes);
  const toggleGpsMarker = useAppStore((s) => s.toggleGpsMarker);
  const toggleRoute = useAppStore((s) => s.toggleRoute);
  const toggleLastMile = useAppStore((s) => s.toggleLastMile);
  const toggleRoadRoutes = useAppStore((s) => s.toggleRoadRoutes);
  const toggleRoadPistes = useAppStore((s) => s.toggleRoadPistes);
  const toggleRoadVoies = useAppStore((s) => s.toggleRoadVoies);
  const toggleLayerVisibility = useMapStore((s) => s.toggleLayerVisibility);

  return (
    <div className="map-legend-overlay">
      <button className="map-legend-toggle" onClick={() => setOpen(!open)} title="Légende">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
      </button>
      {open && (
        <div className="map-legend-content">
          <div className="map-legend-title">Légende</div>
          <div className={`map-legend-item toggleable ${showPlacettes ? '' : 'hidden-layer'}`} onClick={togglePlacettes}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'linear-gradient(135deg,#58f572,#3ed957)', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="7" height="7" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <span>Placettes</span>
            <span className="legend-eye">{showPlacettes ? <EyeOpen /> : <EyeClosed />}</span>
          </div>
          <div className={`map-legend-item toggleable ${showReperes ? '' : 'hidden-layer'}`} onClick={toggleReperes}>
            <svg width="14" height="20" viewBox="0 0 20 28" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <line x1="5" y1="4" x2="5" y2="28" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round"/>
              <polygon points="5,4 18,8 5,14" fill="#ffd93d" stroke="#c9a800" strokeWidth="1"/>
            </svg>
            <span>Repères</span>
            <span className="legend-eye">{showReperes ? <EyeOpen /> : <EyeClosed />}</span>
          </div>
          <div className={`map-legend-item toggleable ${showGpsMarker ? '' : 'hidden-layer'}`} onClick={toggleGpsMarker}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#4285f4', border: '2px solid white', boxShadow: '0 0 0 4px rgba(66,133,244,0.3), 0 1px 4px rgba(0,0,0,0.3)', flexShrink: 0 }} />
            <span>Position GPS</span>
            <span className="legend-eye">{showGpsMarker ? <EyeOpen /> : <EyeClosed />}</span>
          </div>
          <div className={`map-legend-item toggleable ${showRoute ? '' : 'hidden-layer'}`} onClick={toggleRoute}>
            <div style={{ width: 22, height: 4, background: '#00e5ff', borderRadius: 2, boxShadow: '0 0 4px rgba(0,229,255,0.4)', flexShrink: 0 }} />
            <span>Itinéraire</span>
            <span className="legend-eye">{showRoute ? <EyeOpen /> : <EyeClosed />}</span>
          </div>
          <div className={`map-legend-item toggleable ${showLastMile ? '' : 'hidden-layer'}`} onClick={toggleLastMile}>
            <div style={{ width: 22, height: 0, borderTop: '3px dashed #888', flexShrink: 0 }} />
            <span>Dernier km</span>
            <span className="legend-eye">{showLastMile ? <EyeOpen /> : <EyeClosed />}</span>
          </div>
          <div className={`map-legend-item toggleable ${showRoadRoutes ? '' : 'hidden-layer'}`} onClick={toggleRoadRoutes}>
            <div style={{ width: 22, height: 0, borderTop: '2.5px solid #ff6b6b', flexShrink: 0 }} />
            <span>Routes</span>
            <span className="legend-eye">{showRoadRoutes ? <EyeOpen /> : <EyeClosed />}</span>
          </div>
          <div className={`map-legend-item toggleable ${showRoadPistes ? '' : 'hidden-layer'}`} onClick={toggleRoadPistes}>
            <div style={{ width: 22, height: 0, borderTop: '2px solid #fbbf24', flexShrink: 0 }} />
            <span>Pistes</span>
            <span className="legend-eye">{showRoadPistes ? <EyeOpen /> : <EyeClosed />}</span>
          </div>
          <div className={`map-legend-item toggleable ${showRoadVoies ? '' : 'hidden-layer'}`} onClick={toggleRoadVoies}>
            <div style={{ width: 22, height: 0, borderTop: '2px solid #8b5cf6', flexShrink: 0 }} />
            <span>Voies</span>
            <span className="legend-eye">{showRoadVoies ? <EyeOpen /> : <EyeClosed />}</span>
          </div>
          {customLayers.length > 0 && <div className="map-legend-sep" />}
          {customLayers.map((l) => (
            <div key={l.id} className={`map-legend-item toggleable ${l.visible ? '' : 'hidden-layer'}`} onClick={() => toggleLayerVisibility(l.id)}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: l.color, flexShrink: 0 }} />
              <span>{l.name}</span>
              <span className="legend-eye">{l.visible ? <EyeOpen /> : <EyeClosed />}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== MAP BASEMAP SWITCHER OVERLAY =====
const BASEMAP_OPTIONS: { value: BasemapType; label: string }[] = [
  { value: 'google-hybrid', label: 'Google Hybrid' },
  { value: 'google-sat', label: 'Google Satellite' },
  { value: 'cartodb-dark', label: 'Dark Mode' },
  { value: 'osm', label: 'OpenStreetMap' },
  { value: 'topo', label: 'Topographie' },
];

function MapBasemapSwitcher({ basemap }: { basemap: BasemapType }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="map-basemap-switcher">
      <button className="map-legend-toggle" onClick={() => setOpen(!open)} title="Fond de carte">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16"/><path d="M16 6v16"/></svg>
      </button>
      {open && (
        <div className="map-basemap-content">
          <div className="map-legend-title">Fond de carte</div>
          {BASEMAP_OPTIONS.map((bm) => (
            <button
              key={bm.value}
              className={`map-basemap-option ${basemap === bm.value ? 'active' : ''}`}
              onClick={() => { useMapStore.getState().setBasemap(bm.value); setOpen(false); }}
            >
              {bm.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== MAIN MAP COMPONENT =====
export function MapView() {
  const basemap = useMapStore((s) => s.basemap);
  const customLayers = useMapStore((s) => s.customLayers);
  const clickMode = useMapStore((s) => s.clickMode);
  const placettes = useDataStore((s) => s.placettes);
  const selectedPlacettes = useDataStore((s) => s.selectedPlacettes);
  const multiPointPlacettes = useNavigationStore((s) => s.multiPointPlacettes);
  const showPlacettes = useAppStore((s) => s.showPlacettes);
  const showReperes = useAppStore((s) => s.showReperes);
  const showGpsMarker = useAppStore((s) => s.showGpsMarker);
  const showRoute = useAppStore((s) => s.showRoute);
  const showLastMile = useAppStore((s) => s.showLastMile);
  const clusteringEnabled = useAppStore((s) => s.clusteringEnabled);
  const { startPoint, endPoint, route, multiPointRoute, transportMode, multiPointTransport, followGps, setFollowGps } = useNavigationStore();
  const showRoadRoutes = useAppStore((s) => s.showRoadRoutes);
  const showRoadPistes = useAppStore((s) => s.showRoadPistes);
  const showRoadVoies = useAppStore((s) => s.showRoadVoies);
  const tile = TILE_URLS[basemap];
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);
  const [mouseCoords, setMouseCoords] = useState<[number, number] | null>(null);
  const [clusteredPlacetteIds, setClusteredPlacetteIds] = useState<Set<string>>(new Set());
  // When clustering is turned off, clear the set so all repères become visible again
  useEffect(() => {
    if (!clusteringEnabled) setClusteredPlacetteIds(new Set());
  }, [clusteringEnabled]);

  useEffect(() => { (window as any).__geonav_measuring = measuring; }, [measuring]);

  // Determine if we're in active navigation mode (route calculated)
  const isNavigating = !!(route && route.coordinates.length > 0);
  const isMultiNavigating = !!(multiPointRoute && multiPointRoute.routeCoordinates.length > 0);

  // IDs of placettes involved in navigation
  const navigationPlacetteIds = new Set<string>();
  if (isNavigating) {
    // For simple route: start/end placette IDs
    if (startPoint?.id) navigationPlacetteIds.add(startPoint.id);
    if (endPoint?.id) navigationPlacetteIds.add(endPoint.id);
  }
  if (isMultiNavigating) {
    // For multi-point: all multiPointPlacettes
    multiPointPlacettes.forEach((id) => navigationPlacetteIds.add(id));
  }

  // Ordered placettes for multi-point (for numbered markers)
  const orderedMultiPlacettes = isMultiNavigating
    ? multiPointRoute!.orderedPlacettes.map((id) => placettes.find((p) => p.id === id)).filter(Boolean) as Placette[]
    : [];

  // Which placettes to show on map
  const visiblePlacettes = (isNavigating || isMultiNavigating)
    ? placettes.filter((p) => navigationPlacetteIds.has(p.id))
    : placettes;

  // ===== LIVE NAVIGATION =====
  const remainingDist = useMemo(() => {
    if (!userPos) return 0;
    if (isNavigating && endPoint) return L.latLng(userPos).distanceTo([endPoint.lat, endPoint.lng]);
    if (isMultiNavigating && multiPointRoute) {
      const coords = multiPointRoute.routeCoordinates;
      if (coords.length > 0) return L.latLng(userPos).distanceTo(coords[coords.length - 1]);
    }
    return 0;
  }, [userPos, endPoint, isNavigating, isMultiNavigating, multiPointRoute]);

  const etaStr = useMemo(() => {
    const mode = isMultiNavigating ? multiPointTransport : transportMode;
    const speedKmh = TRANSPORT_SPEEDS[mode];
    if (!speedKmh) return '--';
    const minutes = Math.round((remainingDist / 1000 / speedKmh) * 60);
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`;
  }, [remainingDist, transportMode, multiPointTransport, isMultiNavigating]);

  // Stop following when route is cleared
  useEffect(() => {
    if (!isNavigating && !isMultiNavigating) setFollowGps(false);
  }, [isNavigating, isMultiNavigating, setFollowGps]);

  // Register global popup handlers
  useEffect(() => {
    const scrollWhenVisible = (id: string, block: ScrollLogicalPosition = 'center', retries = 15) => {
      const el = document.getElementById(id);
      if (el && el.offsetParent !== null) {
        el.scrollIntoView({ behavior: 'smooth', block });
      } else if (retries > 0) {
        setTimeout(() => scrollWhenVisible(id, block, retries - 1), 50);
      }
    };

    const scrollToNthChild = (listId: string, expectedCount: number, retries = 15) => {
      const list = document.getElementById(listId);
      if (list && list.children.length >= expectedCount && (list.lastElementChild as HTMLElement)?.offsetParent !== null) {
        list.lastElementChild!.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else if (retries > 0) {
        setTimeout(() => scrollToNthChild(listId, expectedCount, retries - 1), 50);
      }
    };

    (window as any).__geonav_navigate = (id: string) => {
      const p = useDataStore.getState().placettes.find((pl) => pl.id === id);
      if (p) {
        useNavigationStore.getState().setEndPoint({ type: 'placette', lat: p.lat, lng: p.lng, label: p.code, id: p.id });
        useNavigationStore.getState().setNavSubTab('simple');
        getAppStoreState().setActiveTab('navigation');
        scrollWhenVisible('nav-end-card', 'center');
      }
    };
    (window as any).__geonav_navigateRepere = (id: string) => {
      const p = useDataStore.getState().placettes.find((pl) => pl.id === id);
      if (p?.repere) {
        useNavigationStore.getState().setEndPoint({ type: 'repere', lat: p.repere.lat, lng: p.repere.lng, label: `Repère ${p.code}` });
        useNavigationStore.getState().setNavSubTab('simple');
        getAppStoreState().setActiveTab('navigation');
        scrollWhenVisible('nav-end-card', 'center');
      }
    };
    (window as any).__geonav_select = (id: string) => {
      useDataStore.getState().toggleSelectPlacette(id);
    };
    (window as any).__geonav_addParcours = (id: string) => {
      const expectedCount = useNavigationStore.getState().multiPointPlacettes.length + 1;
      useNavigationStore.getState().addMultiPointPlacette(id);
      useNavigationStore.getState().setNavSubTab('multi');
      getAppStoreState().setActiveTab('navigation');
      scrollToNthChild('multi-points-list', expectedCount);
    };
  }, []);

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => {}, { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const getIcon = (pId: string) => {
    // During multi-point navigation (route calculated), use optimized order
    if (isMultiNavigating) {
      const idx = orderedMultiPlacettes.findIndex((p) => p.id === pId);
      if (idx >= 0) return makeNumberedIcon(idx + 1);
    }
    // Multi-point selection (before route calculation), show numbered orange markers
    const multiIdx = multiPointPlacettes.indexOf(pId);
    if (multiIdx >= 0) return makeNumberedIcon(multiIdx + 1);
    if (selectedPlacettes.includes(pId)) return icons.selected;
    return icons.placette;
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', cursor: (clickMode !== 'none' || measuring) ? 'crosshair' : undefined }}>
      <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ width: '100%', height: '100%' }} zoomControl={false} tap={false} bounceAtZoomLimits={false}>
        <TileLayer url={tile.url} attribution={tile.attribution} maxZoom={tile.maxZoom} />
        <MapClickHandler />
        <MapSync />
        <RouteFitBounds />
        <FitToPlacettesHandler />
        <CoordinatesTracker onMove={setMouseCoords} />
        <GpsFollowHandler userPos={userPos} />

        {/* Measurement tool */}
        {measuring && <MeasureHandler onPoint={(pt) => setMeasurePoints((prev) => [...prev, pt])} />}
        {/* Measurement dots — show from first point */}
        {measurePoints.map((pt, i) => (
          <Marker key={`mpt-${i}`} position={pt}
            icon={L.divIcon({ className: '', html: `<div style="width:10px;height:10px;background:#00d4aa;border:2px solid white;border-radius:50%;"></div>`, iconSize: [10, 10], iconAnchor: [5, 5] })}
          />
        ))}
        {/* Measurement line + segment labels — from second point */}
        {measurePoints.length >= 2 && (
          <>
            <Polyline positions={measurePoints} pathOptions={{ color: '#00d4aa', weight: 2.5, opacity: 1, dashArray: '6,4' }} />
            {measurePoints.slice(1).map((pt, i) => {
              const prev = measurePoints[i];
              const segDist = L.latLng(prev).distanceTo(L.latLng(pt));
              const label = fmtDist(segDist);
              const w = label.length * 7 + 16;
              return (
                <Marker key={`mlbl-${i}`}
                  position={[(prev[0] + pt[0]) / 2, (prev[1] + pt[1]) / 2]}
                  icon={L.divIcon({ className: '', html: `<div style="width:${w}px;height:20px;position:relative"><div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(13,27,42,0.9);color:#00d4aa;padding:2px 7px;border-radius:4px;font-size:11px;white-space:nowrap;border:1px solid #00d4aa">${label}</div></div>`, iconSize: [w, 20], iconAnchor: [w / 2, 10] })}
                />
              );
            })}
          </>
        )}

        {/* Placettes — clustered or individual */}
        {showPlacettes && clusteringEnabled && !isNavigating && !isMultiNavigating && (
          <ClusterLayer placettes={visiblePlacettes} getIconFn={getIcon} onClusteredIds={setClusteredPlacetteIds} />
        )}
        {showPlacettes && (!clusteringEnabled || isNavigating || isMultiNavigating) && visiblePlacettes.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={getIcon(p.id)}>
            <Popup maxWidth={320} minWidth={260}>
              <div dangerouslySetInnerHTML={{ __html: buildPlacettePopup(p) }} />
            </Popup>
          </Marker>
        ))}

        {/* Repères — follow their parent placette visibility:
            - During navigation: only repères of visible (navigated) placettes
            - Normal mode: hide repères whose parent is swallowed into a cluster bubble */}
        {showReperes && (isNavigating || isMultiNavigating
          ? visiblePlacettes.filter((p) => p.repere).map((p) => (
              <Marker key={`rep-${p.id}`} position={[p.repere!.lat, p.repere!.lng]} icon={icons.repere}>
                <Popup maxWidth={320} minWidth={240}>
                  <div dangerouslySetInnerHTML={{ __html: buildReperePopup(p) }} />
                </Popup>
              </Marker>
            ))
          : placettes
              .filter((p) => p.repere && !clusteredPlacetteIds.has(p.id))
              .map((p) => (
                <Marker key={`rep-${p.id}`} position={[p.repere!.lat, p.repere!.lng]} icon={icons.repere}>
                  <Popup maxWidth={320} minWidth={240}>
                    <div dangerouslySetInnerHTML={{ __html: buildReperePopup(p) }} />
                  </Popup>
                </Marker>
              ))
        )}

        {/* Start/End markers */}
        {startPoint && <Marker position={[startPoint.lat, startPoint.lng]} icon={icons.start}><Popup>Départ: {startPoint.label}</Popup></Marker>}
        {endPoint && <Marker position={[endPoint.lat, endPoint.lng]} icon={icons.end}><Popup>Arrivée: {endPoint.label}</Popup></Marker>}

        {/* GPS */}
        {showGpsMarker && userPos && <Marker position={userPos} icon={icons.gps}><Popup>Ma position</Popup></Marker>}

        {/* Simple route — VERY VISIBLE: border + thick colored line */}
        {showRoute && route && route.coordinates.length > 0 && (
          <>
            {/* Border / shadow */}
            <Polyline positions={route.coordinates} pathOptions={{ color: '#000000', weight: 9, opacity: 0.3 }} />
            {/* Main line */}
            <Polyline positions={route.coordinates} pathOptions={{ color: '#00e5ff', weight: 6, opacity: 0.95 }} />
            {/* Last mile: grey dashed lines from road to off-road placettes */}
            {showLastMile && route.lastMileStart && (
              <Polyline positions={route.lastMileStart} pathOptions={{ color: '#888888', weight: 4, opacity: 0.8, dashArray: '8, 8' }} />
            )}
            {showLastMile && route.lastMileEnd && (
              <Polyline positions={route.lastMileEnd} pathOptions={{ color: '#888888', weight: 4, opacity: 0.8, dashArray: '8, 8' }} />
            )}
          </>
        )}

        {/* Multi-point route — VERY VISIBLE */}
        {showRoute && multiPointRoute && multiPointRoute.routeCoordinates.length > 0 && (
          <>
            {/* Border */}
            <Polyline positions={multiPointRoute.routeCoordinates} pathOptions={{ color: '#000000', weight: 9, opacity: 0.3 }} />
            {/* Main line */}
            <Polyline positions={multiPointRoute.routeCoordinates} pathOptions={{ color: '#00e5ff', weight: 6, opacity: 0.95 }} />
            {/* Last mile segments from each route segment */}
            {showLastMile && multiPointRoute.segments?.map((seg, i) => (
              <React.Fragment key={`lm-${i}`}>
                {seg.lastMileStart && (
                  <Polyline positions={seg.lastMileStart} pathOptions={{ color: '#888888', weight: 4, opacity: 0.8, dashArray: '8, 8' }} />
                )}
                {seg.lastMileEnd && (
                  <Polyline positions={seg.lastMileEnd} pathOptions={{ color: '#888888', weight: 4, opacity: 0.8, dashArray: '8, 8' }} />
                )}
              </React.Fragment>
            ))}
          </>
        )}

        {/* Road network layers — each type controlled independently */}
        {showRoadRoutes && (window as any).ROADS_GEOJSON && (
          <GeoJSON key="road-R" data={(window as any).ROADS_GEOJSON}
            filter={(f: any) => f?.properties?.t === 'R'}
            style={() => ({ color: '#ff6b6b', weight: 3, opacity: 0.8 })} />
        )}
        {showRoadPistes && (window as any).ROADS_GEOJSON && (
          <GeoJSON key="road-P" data={(window as any).ROADS_GEOJSON}
            filter={(f: any) => f?.properties?.t === 'P'}
            style={() => ({ color: '#fbbf24', weight: 2, opacity: 0.6 })} />
        )}
        {showRoadVoies && (window as any).ROADS_GEOJSON && (
          <GeoJSON key="road-V" data={(window as any).ROADS_GEOJSON}
            filter={(f: any) => f?.properties?.t === 'V'}
            style={() => ({ color: '#8b5cf6', weight: 2, opacity: 0.7 })} />
        )}

        {/* Custom layers */}
        {customLayers.filter((l) => l.visible).map((layer) => <GeoJSON key={layer.id} data={layer.data as GeoJSON.GeoJsonObject} style={{ color: layer.color, weight: 2, opacity: 0.7 }} />)}
      </MapContainer>

      {/* Click mode overlay */}
      {clickMode !== 'none' && (
        <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 20px', fontSize: '0.85rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 10 }}>
          📍 {clickMode === 'setStart' ? 'Cliquez pour le départ' : clickMode === 'setEnd' ? "Cliquez pour l'arrivée" : 'Cliquez sur les placettes'}
          <button onClick={() => useMapStore.getState().setClickMode('none')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>
      )}

      {/* Measurement banner */}
      {measuring && (
        <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: 10, padding: '10px 20px', fontSize: '0.85rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="8" width="20" height="8" rx="2"/><line x1="6" y1="8" x2="6" y2="12"/><line x1="10" y1="8" x2="10" y2="14"/><line x1="14" y1="8" x2="14" y2="12"/><line x1="18" y1="8" x2="18" y2="14"/></svg>
          {measurePoints.length === 0 ? 'Cliquez pour commencer la mesure' : `Total : ${fmtDist(calcTotalDist(measurePoints))}`}
          {measurePoints.length > 0 && (
            <button onClick={() => setMeasurePoints([])} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', padding: '0 4px' }}>Effacer</button>
          )}
          <button onClick={() => { setMeasuring(false); setMeasurePoints([]); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>
      )}

      {/* Measure button — left side */}
      <div className="map-measure-container">
        <button className={`map-btn ${measuring ? 'active' : ''}`} onClick={() => { setMeasuring(!measuring); setMeasurePoints([]); }} title="Mesurer une distance">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="8" width="20" height="8" rx="2"/><line x1="6" y1="8" x2="6" y2="12"/><line x1="10" y1="8" x2="10" y2="14"/><line x1="14" y1="8" x2="14" y2="12"/><line x1="18" y1="8" x2="18" y2="14"/></svg>
        </button>
      </div>

      {/* Live navigation banner */}
      {followGps && (isNavigating || isMultiNavigating) && userPos && (
        <div className="live-nav-banner">
          <div className="live-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
          </div>
          <div className="live-nav-stats">
            <div className="live-nav-stat">
              <span className="live-nav-label">Restant</span>
              <span className="live-nav-value">{fmtDist(remainingDist)}</span>
            </div>
            <div className="live-nav-sep" />
            <div className="live-nav-stat">
              <span className="live-nav-label">ETA</span>
              <span className="live-nav-value">{etaStr}</span>
            </div>
          </div>
          <button className="live-nav-stop" onClick={() => setFollowGps(false)} title="Arrêter le suivi">✕</button>
        </div>
      )}

      {/* Map controls */}
      <div className="map-controls">
        {/* Follow GPS — only when route is active */}
        {(isNavigating || isMultiNavigating) && (
          <button
            className={`map-btn ${followGps ? 'active' : ''}`}
            onClick={() => setFollowGps(!followGps)}
            title={followGps ? 'Arrêter le suivi GPS' : 'Suivre ma position en temps réel'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" fill={followGps ? 'currentColor' : 'none'}/>
            </svg>
          </button>
        )}
        <button className={`map-btn ${gpsLoading ? 'gps-locating' : ''}`} onClick={() => {
          if (gpsLoading) return;
          setGpsLoading(true);
          getGpsPosition().then((pos) => {
            setGpsLoading(false);
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setUserPos([lat, lng]);
            useMapStore.getState().setCenter([lat, lng]);
            useMapStore.getState().setZoom(16);
          }).catch(() => {
            setGpsLoading(false);
            alert('Erreur GPS : position indisponible. Vérifiez que la géolocalisation est autorisée dans votre navigateur.');
          });
        }} title="Ma position">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4m10-10h-4M6 12H2"/></svg>
        </button>
        <button className="map-btn" onClick={() => useMapStore.getState().setZoom(Math.min(useMapStore.getState().zoom + 1, 18))} title="Zoom +">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6M11 8v6"/></svg>
        </button>
        <button className="map-btn" onClick={() => useMapStore.getState().setZoom(Math.max(useMapStore.getState().zoom - 1, 4))} title="Zoom -">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6"/></svg>
        </button>
      </div>

      {/* Coordinates display */}
      {mouseCoords && (
        <div className="map-coords-display">
          <span>Lat: <b>{mouseCoords[0].toFixed(6)}</b></span>
          <span>Lng: <b>{mouseCoords[1].toFixed(6)}</b></span>
        </div>
      )}

      {/* ===== TOP-RIGHT WIDGETS: NORTH ARROW + LEGEND + BASEMAP ===== */}
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
        {/* North arrow — static indicator */}
        <div style={{ width: 42, height: 42, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }} title="Nord">
          <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
            <polygon points="7,0 0,18 7,13 14,18" fill="white" />
          </svg>
          <span style={{ fontSize: '9px', fontWeight: 700, color: 'white', lineHeight: 1, letterSpacing: '0.5px' }}>N</span>
        </div>
        <MapLegend customLayers={customLayers} />
        <MapBasemapSwitcher basemap={basemap} />
      </div>
    </div>
  );
}

const getAppStoreState = () => {
  return (window as any).__useAppStore?.getState?.() || { setActiveTab: () => {} };
};
